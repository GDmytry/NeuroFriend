@echo off
setlocal EnableExtensions

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
cd /d "%PROJECT_DIR%"

echo.
echo === NeuroFriend Local LLM Startup ===
echo Project: %PROJECT_DIR%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH. Install Node.js ^>= 20 from https://nodejs.org
  pause
  exit /b 1
)

if not exist "%PROJECT_DIR%\server\.env" (
  if exist "%PROJECT_DIR%\server\.env.example" (
    copy /Y "%PROJECT_DIR%\server\.env.example" "%PROJECT_DIR%\server\.env" >nul
    echo [INFO] Created server\.env from server\.env.example
  )
)

if not exist "%PROJECT_DIR%\node_modules" (
  echo [INFO] Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo [1/2] Checking local LLM connection...
node "%PROJECT_DIR%\server\check.js"
echo.

echo [2/2] Starting Local LLM Bridge + Expo...
node "%PROJECT_DIR%\server\dev.js" %*
if errorlevel 1 (
  echo.
  echo Startup exited with an error.
  pause
  exit /b 1
)
