# Opens a local authenticated tunnel; the game itself runs in Google Cloud.
$ErrorActionPreference = 'Stop'
$common = @('--configuration=glacierquest-creditos', '--account=angelcamargopro2005@gmail.com', '--project=glacier-quest-1791678996')
Write-Host 'Codigo de clase de esta demo privada (no lo publiques):'
& gcloud secrets versions access 1 --secret=glacierquest-demo-code @common
if ($LASTEXITCODE -ne 0) { throw 'Cannot read the demo code; verify your Google login' }
Write-Host "`nAbre http://localhost:8085. Cierra esta terminal para detener el tunel."
& gcloud run services proxy glacierquest-demo --region=us-central1 --port=8085 @common
if ($LASTEXITCODE -ne 0) { throw 'Cloud Run proxy failed' }
