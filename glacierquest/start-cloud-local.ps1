[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')][string]$ProjectId,
  [ValidateSet('memory', 'firestore')][string]$Store = 'memory',
  [ValidatePattern('^[1-9][0-9]*$')][string]$SessionVersion = '1',
  [ValidatePattern('^[1-9][0-9]*$')][string]$DemoVersion = '1'
)
$ErrorActionPreference = 'Stop'
Get-Command gcloud -ErrorAction Stop | Out-Null
Get-Command node -ErrorAction Stop | Out-Null
if ($env:GOOGLE_APPLICATION_CREDENTIALS) { throw 'Hay GOOGLE_APPLICATION_CREDENTIALS configurado. Usa una terminal sin esa variable y configura ADC por suplantacion como indica la guia.' }
if ($Store -eq 'firestore' -and $env:FIRESTORE_EMULATOR_HOST) { throw 'Esta terminal apunta a un emulador. Abre una terminal limpia para la prueba cloud.' }
if (!(Test-Path -LiteralPath "$PSScriptRoot/api/node_modules/@google-cloud/storage")) { throw 'Ejecuta npm ci --ignore-scripts --prefix api antes de iniciar.' }
$runtimeAccount = "glacierquest-runtime@$ProjectId.iam.gserviceaccount.com"
$names = @('STORE','NODE_ENV','GOOGLE_CLOUD_PROJECT','ASSET_BUCKET','SESSION_SECRET','DEMO_CODE','GQ_SECRET_SOURCE')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  $sessionValue = & gcloud secrets versions access $SessionVersion --secret=glacierquest-session --project=$ProjectId --impersonate-service-account=$runtimeAccount
  if ($LASTEXITCODE -ne 0 -or !$sessionValue) { throw 'No se pudo leer el secreto de sesion; revisar IAM y version.' }
  $codeValue = & gcloud secrets versions access $DemoVersion --secret=glacierquest-demo-code --project=$ProjectId --impersonate-service-account=$runtimeAccount
  if ($LASTEXITCODE -ne 0 -or !$codeValue) { throw 'No se pudo leer el codigo; revisar IAM y version.' }
  $env:SESSION_SECRET = ($sessionValue -join "`n").TrimEnd("`r", "`n")
  $env:DEMO_CODE = ($codeValue -join "`n").TrimEnd("`r", "`n")
  if ($env:SESSION_SECRET.Length -lt 32) { throw 'El secreto de sesion necesita al menos 32 caracteres.' }
  $env:STORE = $Store
  $env:NODE_ENV = 'development'
  $env:GOOGLE_CLOUD_PROJECT = $ProjectId
  $env:ASSET_BUCKET = "$ProjectId-glacierquest-assets"
  $env:GQ_SECRET_SOURCE = 'gcloud-secret-manager'
  Write-Host 'Secretos cargados sin imprimir valores. Recursos cloud activos; servidor local.'
  Write-Host 'Abre http://localhost:8080 e introduce el codigo de clase que creaste.'
  if ($Store -eq 'memory') { Write-Host 'Base en memoria: perderas el progreso al cerrar.' }
  & node "$PSScriptRoot/api/src/server.js"
  if ($LASTEXITCODE -ne 0) { throw 'El servidor termino con un error.' }
} finally {
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
  $sessionValue = $null
  $codeValue = $null
}
