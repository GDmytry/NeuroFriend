@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "PROJECT_DIR=D:\Git\Reposi1\Playground"
set "TAILSCALE_EXE=C:\Program Files\Tailscale\tailscale.exe"
set "BRIDGE_PORT=3001"
set "DRY_RUN="

if /I "%~1"=="--dry-run" set "DRY_RUN=1"

echo.
echo === NeuroFriend shutdown ===
echo Project: %PROJECT_DIR%
echo.

echo [1/3] Disabling Tailscale Funnel on port %BRIDGE_PORT%...
call :run "%TAILSCALE_EXE%" funnel --https=443 off
if errorlevel 1 (
  echo Funnel disable command returned a non-zero code. Continuing anyway...
)
echo.

echo [2/3] Stopping Node bridge processes...
call :stop_node_bridge
echo.

echo [3/3] Finished.
echo.
echo Ollama is left running on purpose.
echo Press any key to close this window.
pause >nul
exit /b 0

:stop_node_bridge
for /f "skip=1 tokens=2 delims==; " %%P in ('wmic process where "name='node.exe' and commandline like '%%server\\index.js%%'" get processid /format:value 2^>nul') do (
  if not "%%P"=="" (
    echo Found Node bridge PID %%P
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
