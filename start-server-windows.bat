@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
cd /d "%PROJECT_DIR%"

set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\Ollama;%PATH%"
set "EXIT_CODE=1"

echo.
echo === NeuroFriend Local LLM Server (Windows) ===
echo Project: %PROJECT_DIR%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  echo Install Node.js ^>= 20 from https://nodejs.org
  goto :end
)

for /f "delims=" %%V in ('node -v 2^>nul') do echo Node.js: %%V

if not exist "%PROJECT_DIR%\server\.env" (
  if exist "%PROJECT_DIR%\server\.env.example" (
    copy /Y "%PROJECT_DIR%\server\.env.example" "%PROJECT_DIR%\server\.env" >nul
    echo [INFO] Created server\.env from server\.env.example
  )
)

echo.
echo Starting Local LLM Bridge on port 3001...
echo (To expose via HTTPS tunnel for iPhone outside Wi-Fi, run: start-server-windows.bat --tunnel)
echo.

node "%PROJECT_DIR%\server\index.js" %*
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Server exited with code %EXIT_CODE%.
) else (
  echo Server stopped.
)

:end
echo.
pause
exit /b %EXIT_CODE%
