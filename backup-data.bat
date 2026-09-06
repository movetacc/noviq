@echo off
setlocal
cd /d "%~dp0"
if not exist data mkdir data
if not exist backups mkdir backups
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set D=%%c-%%a-%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set T=%%a%%b
copy /Y data\noviq.sqlite backups\noviq-%D%-%T%.sqlite >nul
if exist data\.master-key copy /Y data\.master-key backups\.master-key.backup >nul
echo Backup created in backups\
