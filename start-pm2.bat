@echo off
REM Start (or reload) production app with PM2.
setlocal EnableExtensions
cd /d "%~dp0"

set "APP_NAME=git-to-invoice"
if not defined PORT set "PORT=3000"
if not defined HOST set "HOST=0.0.0.0"

echo ==^> git to invoice · PM2 start
echo     cwd: %CD%

where node >nul 2>&1
if errorlevel 1 (
	echo ERROR: node is not installed or not in PATH.
	exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
	echo ERROR: npm is not installed or not in PATH.
	exit /b 1
)

where pm2 >nul 2>&1
if errorlevel 1 (
	echo ==^> pm2 not found — installing globally
	call npm install -g pm2
	if errorlevel 1 exit /b 1
)

if not exist "%CD%\build\index.js" (
	echo ==^> Production build missing — running build-prod.bat
	call "%~dp0build-prod.bat"
	if errorlevel 1 exit /b 1
)

set "NODE_ENV=production"

pm2 describe %APP_NAME% >nul 2>&1
if errorlevel 1 (
	echo ==^> Starting PM2 process: %APP_NAME%
	call pm2 start ecosystem.config.cjs
) else (
	echo ==^> Reloading existing PM2 process: %APP_NAME%
	call pm2 reload ecosystem.config.cjs --update-env
)
if errorlevel 1 exit /b 1

call pm2 save
call pm2 status

echo.
echo App should listen on http://%HOST%:%PORT%
echo Useful commands:
echo   pm2 logs %APP_NAME%
echo   pm2 restart %APP_NAME%
echo   pm2 stop %APP_NAME%
echo.
exit /b 0
