@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 22 o superior antes de iniciar.
  pause
  exit /b 1
)
if not exist api\node_modules\express (
  call npm ci --ignore-scripts --prefix api
  if errorlevel 1 exit /b 1
)
set STORE=memory
set NODE_ENV=development
set ASSET_BUCKET=
set DEMO_CODE=
echo Abre http://localhost:8080 en el navegador.
echo Modo local: los datos se borran al cerrar el servidor.
call npm start --prefix api
