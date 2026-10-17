@echo off
setlocal
cd /d "%~dp0"
call local-env.cmd
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
echo Abre http://localhost:8080 en el navegador.
echo Modo local: los datos se borran al cerrar el servidor.
call npm start --prefix api
