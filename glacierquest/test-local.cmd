@echo off
setlocal
cd /d "%~dp0"
call local-env.cmd
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 22 o superior antes de ejecutar las pruebas.
  exit /b 1
)
if not exist api\node_modules\express (
  call npm ci --ignore-scripts --prefix api
  if errorlevel 1 exit /b 1
)
rem Unit tests, mocked integrations and loopback HTTP; no live cloud tests.
call npm test --prefix api
exit /b %errorlevel%
