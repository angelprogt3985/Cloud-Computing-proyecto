param(
  [Parameter(Mandatory=$true)][ValidateSet('Provision','Build','Deploy')][string]$Stage,
  [Parameter(Mandatory=$true)][switch]$TrialVerified,
  [string]$Image,
  [string]$FirebaseConfigPath,
  [ValidateSet('memory','realtime')][string]$Store = 'realtime'
)
$ErrorActionPreference = 'Stop'
if (-not $TrialVerified) { throw 'Verify Free trial account and remaining credit in Cloud Billing first.' }
$project = 'glacier-quest-1791678996'
$region = 'us-central1'
$runtime = "glacierquest-runtime@$project.iam.gserviceaccount.com"
$builder = "glacierquest-build@$project.iam.gserviceaccount.com"
$assets = "$project-demo-assets"
$staging = "$project-demo-build"
$appRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
function G {
  & gcloud @args --configuration=glacierquest-creditos --account=angelcamargopro2005@gmail.com --project=$project --quiet
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: $($args[0..1] -join ' ')" }
}
$billing = G billing projects describe $project --format=json | ConvertFrom-Json
if (-not $billing.billingEnabled -or $billing.billingAccountName -ne 'billingAccounts/019891-D38015-39EEC1') { throw 'Unexpected billing account or billing disabled' }

if ($Stage -eq 'Provision') {
  G services enable run.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com billingbudgets.googleapis.com
  $accounts = @(G iam service-accounts list --format='value(email)')
  if ($runtime -notin $accounts) { throw 'Expected runtime identity missing; inspect IAM first' }
  if ($builder -notin $accounts) { G iam service-accounts create glacierquest-build --display-name='Glacier Quest demo image builder' }
  $buckets = @(G storage buckets list --format='value(name)')
  foreach ($name in @($assets, $staging)) {
    if ($name -notin $buckets) {
      G storage buckets create "gs://$name" --location=$region --default-storage-class=STANDARD --uniform-bucket-level-access --public-access-prevention --soft-delete-duration=0
    }
  }
  G storage buckets add-iam-policy-binding "gs://$assets" --member="serviceAccount:$runtime" --role=roles/storage.objectViewer --format='value(version)'
  G storage buckets add-iam-policy-binding "gs://$staging" --member="serviceAccount:$builder" --role=roles/storage.objectViewer --format='value(version)'
  $lifecyclePath = Join-Path $PSScriptRoot 'build-lifecycle.json'
  G storage buckets update "gs://$staging" "--lifecycle-file=$lifecyclePath"
  G storage cp (Join-Path $appRoot 'assets/glacier-banner.svg') "gs://$assets/glacier-banner.svg"
  $repos = @(G artifacts repositories list --location=$region --format='value(name.basename())')
  if ('glacierquest-demo' -notin $repos) { G artifacts repositories create glacierquest-demo --location=$region --repository-format=docker --description='Private images for the academic demo' }
  G artifacts repositories add-iam-policy-binding glacierquest-demo --location=$region --member="serviceAccount:$builder" --role=roles/artifactregistry.writer --format='value(version)'
  G projects add-iam-policy-binding $project --member="serviceAccount:$builder" --role=roles/logging.logWriter --condition=None --format='value(version)'
  $secrets = @(G secrets list --format='value(name.basename())')
  foreach ($name in @('glacierquest-demo-session', 'glacierquest-demo-code')) {
    if ($name -notin $secrets) { G secrets create $name --replication-policy=user-managed --locations=$region --labels=environment=demo }
    $versions = @(G secrets versions list $name --filter='state=ENABLED' --format='value(name)')
    if ($versions.Count -eq 0) {
      # Generate without printing values or putting them in command arguments.
      $secretFile = [System.IO.Path]::GetTempFileName()
      try {
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $value = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
        if ($name -eq 'glacierquest-demo-code') { $value = $value.Substring(0,16) }
        [System.IO.File]::WriteAllText($secretFile, $value, (New-Object System.Text.UTF8Encoding($false)))
        G secrets versions add $name --data-file=$secretFile --format='value(name)'
      } finally { Remove-Item -LiteralPath $secretFile -Force; $value = $null; $bytes = $null }
    }
    G secrets add-iam-policy-binding $name --member="serviceAccount:$runtime" --role=roles/secretmanager.secretAccessor --format='value(version)'
  }
}
if ($Stage -eq 'Build') {
  if (-not $Image) { throw 'Supply a unique image tag in the demo repository' }
  if ($Image -notmatch '^us-central1-docker\.pkg\.dev/glacier-quest-1791678996/glacierquest-demo/game:[a-zA-Z0-9_.-]+$') { throw 'Unexpected image destination' }
  $buildConfig = Join-Path $appRoot 'cloudbuild.demo.yaml'
  G builds submit $appRoot "--config=$buildConfig" --region=$region --gcs-source-staging-dir="gs://$staging/source" --substitutions="_IMAGE=$Image" --async --format='value(id)'
}
if ($Stage -eq 'Deploy') {
  if ($Image -notmatch '^us-central1-docker\.pkg\.dev/glacier-quest-1791678996/glacierquest-demo/game@sha256:[a-f0-9]{64}$') { throw 'Deploy a verified immutable demo image digest' }
  $environment = "STORE=$Store,GQ_DEMO_MODE=true,ASSET_BUCKET=$assets"
  if ($Store -eq 'realtime') {
    $environment += ",FIREBASE_DATABASE_URL=https://glacier-quest-1791678996-demo.firebaseio.com,CLEANUP_AUDIENCE=https://glacierquest-demo-636305098699.us-central1.run.app,CLEANUP_SERVICE_ACCOUNT=glacierquest-cleanup@$project.iam.gserviceaccount.com"
    if (-not $FirebaseConfigPath) { throw 'Supply the Firebase web configuration for email accounts using -FirebaseConfigPath' }
    $firebaseWeb = Get-Content -LiteralPath $FirebaseConfigPath -Raw | ConvertFrom-Json
    if ($firebaseWeb.projectId -ne $project -or -not $firebaseWeb.apiKey) { throw 'Unexpected Firebase application configuration' }
    $environment += ",FIREBASE_PROJECT_ID=$project,FIREBASE_WEB_API_KEY=$($firebaseWeb.apiKey)"
  }
  G run deploy glacierquest-demo --region=$region --image=$Image --service-account=$runtime --allow-unauthenticated --invoker-iam-check --min=0 --max=1 --min-instances=0 --max-instances=1 --concurrency=40 --cpu=1 --memory=512Mi --cpu-throttling --no-cpu-boost --timeout=30 --set-env-vars=$environment --set-secrets='SESSION_SECRET=glacierquest-demo-session:1,DEMO_CODE=glacierquest-demo-code:1' --labels='environment=demo,purpose=course-project' --format='value(status.url)'
}
