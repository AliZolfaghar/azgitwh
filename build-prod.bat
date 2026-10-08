@echo off
REM Build production bundle for Node.js server (SvelteKit adapter-node).
setlocal EnableExtensions
cd /d "%~dp0"

echo ==^> git to invoice · production build
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

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo ==^> Node %NODE_VER% · npm %NPM_VER%

echo ==^> Installing dependencies
call npm install
if errorlevel 1 exit /b 1

echo ==^> Building (vite build -^> .\build)
call npm run build
if errorlevel 1 exit /b 1

if not exist "%CD%\build\index.js" (
	echo ERROR: build\index.js was not created.
	exit /b 1
)

echo.
echo Build OK.
echo   Output: %CD%\build
echo.
echo Run once with Node:
echo   set NODE_ENV=production^&^& set HOST=0.0.0.0^&^& set PORT=3000^&^& npm start
echo.
echo Or with PM2:
echo   start-pm2.bat
echo.
exit /b 0
