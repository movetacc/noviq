@echo off
setlocal
cd /d "%~dp0"
if not exist .env (
  echo Missing .env - copy .env.example to .env and configure it first.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
echo Starting NOVIQ Living Enterprise City v8...
call npm start