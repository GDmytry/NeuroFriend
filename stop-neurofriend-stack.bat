@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "TAILSCALE_EXE=C:\Program Files\Tailscale\tailscale.exe"
set "BRIDGE_PORT=3001"
set "DRY_RUN="

if /I "%~1"=="--dry-run" set "DRY_RUN=1"

echo.
echo === NeuroFriend shutdown ===
echo Project: %PROJECT_DIR%
echo.

if exist "%TAILSCALE_EXE%" (
  echo [1/3] Disabling Tailscale Funnel on port %BRIDGE_PORT%...
  call :run "%TAILSCALE_EXE%" funnel --https=443 off
  if errorlevel 1 (
    echo Funnel disable command returned a non-zero code. Continuing anyway...
  )
) else (
  echo [1/3] Tailscale not installed, skipping Funnel disable.
)
echo.

echo [2/3] Stopping Node bridge, Expo, and SSH tunnel processes...
call :stop_node_processes
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name = 'ssh.exe'\" | Where-Object { $_.CommandLine -match 'localhost\.run' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
echo.

echo [3/3] Finished.
echo.
echo Ollama is left running on purpose.
echo Press any key to close this window.
pause >nul
exit /b 0

:stop_node_processes
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -match 'server[\\/]+index\.js' -or $_.CommandLine -match 'expo' } | Select-Object -ExpandProperty ProcessId" 2^>nul`) do (
  if not "%%P"=="" (
    echo Found Node process PID %%P
    if defined DRY_RUN (
      echo [DRY RUN] taskkill /PID %%P /F
    ) else (
      taskkill /PID %%P /F >nul 2>&1
      if errorlevel 1 (
        echo Failed to stop PID %%P
      ) else (
        echo Stopped PID %%P
      )
    )
  )
)
exit /b 0

:run
if defined DRY_RUN (
  echo [DRY RUN] %*
  exit /b 0
)
%*
exit /b %ERRORLEVEL%
