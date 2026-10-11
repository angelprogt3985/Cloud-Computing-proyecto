param(
  [Parameter(Mandatory=$true)][ValidateSet('Database','RuntimeIam','Scheduler')][string]$Stage,
  [Parameter(Mandatory=$true)][switch]$TrialVerified
)
$ErrorActionPreference = 'Stop'
if (-not $TrialVerified) { throw 'Verify the Cloud Billing Free trial status and remaining credits first.' }
$project = 'glacier-quest-1791678996'
$number = '636305098699'
$region = 'us-central1'
$database = "$project-demo"
$runtime = "glacierquest-runtime@$project.iam.gserviceaccount.com"
$cleanup = "glacierquest-cleanup@$project.iam.gserviceaccount.com"
$base = 'https://glacierquest-demo-636305098699.us-central1.run.app'
function G {
  & gcloud @args --configuration=glacierquest-creditos --account=angelcamargopro2005@gmail.com --project=$project --quiet
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: $($args[0..1] -join ' ')" }
}
$billing = G billing projects describe $project --format=json | ConvertFrom-Json
if (-not $billing.billingEnabled -or $billing.billingAccountName -ne 'billingAccounts/019891-D38015-39EEC1') { throw 'Unexpected billing account' }
if ($Stage -eq 'Database') {
  G services enable firebase.googleapis.com firebasedatabase.googleapis.com cloudscheduler.googleapis.com
  $access = G auth print-access-token
  $headers = @{ Authorization = "Bearer $access"; 'x-goog-user-project' = $project }
  try {
    # Terms and initial Firebase activation must already be completed by the owner.
    $firebase = Invoke-RestMethod -Uri "https://firebase.googleapis.com/v1beta1/projects/$project" -Headers $headers
    if ($firebase.state -ne 'ACTIVE') { throw 'Activate Firebase in its console first' }
    $collection = "https://firebasedatabase.googleapis.com/v1beta/projects/$number/locations/$region/instances"
    $instances = Invoke-RestMethod -Uri $collection -Headers $headers
    $instance = @($instances.instances) | Where-Object { $_.name -eq "projects/$number/locations/$region/instances/$database" }
    if (-not $instance) {
      $instance = Invoke-RestMethod -Uri "${collection}?databaseId=$database" -Method Post -Headers $headers -Body '{"type":"USER_DATABASE"}' -ContentType 'application/json'
    }
    if ($instance.state -ne 'ACTIVE' -or $instance.databaseUrl -ne "https://$database.firebaseio.com") { throw 'Unexpected database state or URL' }
    $rules = Get-Content -Raw (Join-Path $PSScriptRoot 'database.rules.json')
    Invoke-RestMethod -Uri "$($instance.databaseUrl)/.settings/rules.json" -Method Put -Headers $headers -Body $rules -ContentType 'application/json'
  } finally { $access = $null; $headers = $null }
}
if ($Stage -eq 'RuntimeIam') {
  # Owner explicitly approved get/update, including update's rules/enablement powers.
  $role = "projects/$project/roles/glacierquestDatabaseData"
  $roles = @(G iam roles list --format='value(name)')
  $verb = if ($role -in $roles) { 'update' } else { 'create' }
  $roleFile = Join-Path $PSScriptRoot 'firebase-data-role.yaml'
  G iam roles $verb glacierquestDatabaseData --file=$roleFile --format='value(name)'
  G projects add-iam-policy-binding $project --member="serviceAccount:$runtime" --role=$role --condition=None --format='value(version)'
  $accounts = @(G iam service-accounts list --format='value(email)')
  if ($cleanup -notin $accounts) { G iam service-accounts create glacierquest-cleanup --display-name='Glacier Quest scheduled cleanup' --format='value(email)' }
}
if ($Stage -eq 'Scheduler') {
  # Deploy the realtime image first. This checks the actual backend before scheduling.
  $health = Invoke-RestMethod -Uri "$base/health"
  if ($health.status -ne 'ok' -or $health.database -ne 'realtime') { throw 'Deploy and verify the realtime backend first' }
  $jobs = @(G scheduler jobs list --location=$region --format='value(name.basename())')
  $verb = if ('glacierquest-cleanup' -in $jobs) { 'update' } else { 'create' }
  G scheduler jobs $verb http glacierquest-cleanup --location=$region --schedule='17 * * * *' --time-zone=Etc/UTC --uri="$base/internal/cleanup" --http-method=POST --oidc-service-account-email=$cleanup --oidc-token-audience=$base --attempt-deadline=30s --max-retry-attempts=1 --min-backoff=60s --max-backoff=60s --description='Hourly bounded cleanup of stale demo presence and chat older than 7 days; never player progress' --format='value(name)'
}
