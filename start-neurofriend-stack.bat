@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
cd /d "%PROJECT_DIR%"

set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\Ollama;%PATH%"
set "EXIT_CODE=1"

echo.
echo === NeuroFriend Local LLM Startup ===
echo Project: %PROJECT_DIR%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  echo Install Node.js ^>= 20 from https://nodejs.org and restart this script.
  goto :end
)

for /f "delims=" %%V in ('node -v 2^>nul') do echo Node.js: %%V

if not exist "%PROJECT_DIR%\server\.env" (
  if exist "%PROJECT_DIR%\server\.env.example" (
    copy /Y "%PROJECT_DIR%\server\.env.example" "%PROJECT_DIR%\server\.env" >nul
    echo [INFO] Created server\.env from server\.env.example
  )
)

if not exist "%PROJECT_DIR%\node_modules" (
  echo [INFO] Installing dependencies ^(npm install^)...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    goto :end
  )
)

echo.
echo [1/2] Checking local LLM connection...
node "%PROJECT_DIR%\server\check.js"
echo.

echo [2/2] Starting Local LLM Bridge + Expo...
echo (Keep this window open while using the app. Press Ctrl+C to stop.)
echo.
node "%PROJECT_DIR%\server\dev.js" %*
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Startup exited with code %EXIT_CODE%.
) else (
  echo Startup stopped.
)

:end
echo.
pause
exit /b %EXIT_CODE%
