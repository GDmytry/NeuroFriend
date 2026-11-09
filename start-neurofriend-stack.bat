@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

set "PATH=C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\Ollama;%PATH%"

set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
if not exist "%OLLAMA_EXE%" (
  for /f "delims=" %%P in ('where ollama.exe 2^>nul') do (
    if not defined OLLAMA_FOUND (
      set "OLLAMA_EXE=%%P"
      set "OLLAMA_FOUND=1"
    )
  )
)
if not exist "%OLLAMA_EXE%" (
  if exist "E:\OllamaDir\ollama.exe" set "OLLAMA_EXE=E:\OllamaDir\ollama.exe"
)

set "TAILSCALE_EXE=C:\Program Files\Tailscale\tailscale.exe"
set "TAILSCALE_GUI=C:\Program Files\Tailscale\tailscale-ipn.exe"
set "BRIDGE_PORT=3001"
set "EXPO_PORT=8081"
set "OLLAMA_HEALTH_URL=http://127.0.0.1:11434/api/tags"
set "BRIDGE_HEALTH_URL=http://127.0.0.1:%BRIDGE_PORT%/health"
set "WAIT_OLLAMA_SECONDS=60"
set "WAIT_BRIDGE_SECONDS=45"
set "DRY_RUN="
set "OLLAMA_MODEL=qwen3.5:4b"
set "API_KEY=b187155b9584417abcdc34919d66cfd5"
set "OLLAMA_MODELS_FALLBACK=E:\.ollama\models"

if /I "%~1"=="--dry-run" set "DRY_RUN=1"

echo.
echo === NeuroFriend startup ===
echo Project: %PROJECT_DIR%
echo.

if not exist "%PROJECT_DIR%\package.json" (
  echo [ERROR] package.json not found in:
  echo         %PROJECT_DIR%
  goto :fail
)

if exist "%PROJECT_DIR%\server\.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%PROJECT_DIR%\server\.env") do (
    if /I "%%~A"=="OLLAMA_MODEL" set "OLLAMA_MODEL=%%~B"
    if /I "%%~A"=="CHAT_SERVER_API_KEY" set "API_KEY=%%~B"
  )
)

if not defined OLLAMA_MODELS (
  if exist "%OLLAMA_MODELS_FALLBACK%" (
    set "OLLAMA_MODELS=%OLLAMA_MODELS_FALLBACK%"
  )
)

if defined OLLAMA_MODELS (
  echo Ollama models: %OLLAMA_MODELS%
  echo.
)

if not exist "%OLLAMA_EXE%" (
  echo [ERROR] Ollama executable not found:
  echo         %OLLAMA_EXE%
  goto :fail
)

echo [1/4] Checking Ollama...
call :check_url "%OLLAMA_HEALTH_URL%"
if errorlevel 1 (
  echo Ollama is not responding. Starting "ollama serve"...
  call :start_window "NeuroFriend Ollama" "\"%OLLAMA_EXE%\" serve"
  if defined DRY_RUN (
    echo [DRY RUN] Skipping Ollama readiness wait.
    goto :ollama_ready
  )
  call :wait_for_url "%OLLAMA_HEALTH_URL%" %WAIT_OLLAMA_SECONDS%
  if errorlevel 1 (
    echo [ERROR] Ollama did not become ready in %WAIT_OLLAMA_SECONDS% seconds.
    goto :fail
  )
)
:ollama_ready
echo Ollama is ready.
call :check_ollama_model "%OLLAMA_HEALTH_URL%" "%OLLAMA_MODEL%"
if errorlevel 1 (
  echo [ERROR] Ollama is running, but model "%OLLAMA_MODEL%" is not available.
  echo Run this command to check visible models:
  echo        "%OLLAMA_EXE%" list
  echo If the model is missing, install it with:
  echo        "%OLLAMA_EXE%" pull %OLLAMA_MODEL%
  goto :fail
)
echo Model "%OLLAMA_MODEL%" is available.
echo.

echo [2/4] Checking local Node bridge...
call :check_url "%BRIDGE_HEALTH_URL%"
if errorlevel 1 (
  echo Node bridge is not responding. Starting server:start...
  call :start_window_in_dir "NeuroFriend Node Bridge" "%PROJECT_DIR%" "npm.cmd run server:start"
  if defined DRY_RUN (
    echo [DRY RUN] Skipping Node bridge readiness wait.
    goto :bridge_ready
  )
  call :wait_for_url "%BRIDGE_HEALTH_URL%" %WAIT_BRIDGE_SECONDS%
  if errorlevel 1 (
    echo [ERROR] Node bridge did not become ready in %WAIT_BRIDGE_SECONDS% seconds.
    goto :fail
  )
)
:bridge_ready
echo Node bridge is ready.
echo.

echo [3/4] Starting Expo (PC Web + Phone Dev Server)...
call :check_url "http://127.0.0.1:%EXPO_PORT%"
if errorlevel 1 (
  call :start_window_in_dir "NeuroFriend Expo App" "%PROJECT_DIR%" "npx.cmd expo start --web"
) else (
  echo Expo dev server is already running on port %EXPO_PORT%.
)
echo.

echo [4/4] Checking network and HTTPS tunnel...
>nul timeout /t 6 /nobreak
set "LAN_IP="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1 -ExpandProperty IPAddress; if ($ip) { $ip }" 2^>nul`) do (
  set "LAN_IP=%%I"
)

set "PUBLIC_TUNNEL_URL="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $h = Invoke-RestMethod -Uri '%BRIDGE_HEALTH_URL%' -TimeoutSec 4; if ($h.publicChatUrl) { $h.publicChatUrl } } catch {}" 2^>nul`) do (
  set "PUBLIC_TUNNEL_URL=%%I"
)

set "FUNNEL_URL="
if exist "%TAILSCALE_EXE%" (
  call :run "%TAILSCALE_EXE%" status >nul 2>&1
  if not errorlevel 1 (
    call :run "%TAILSCALE_EXE%" funnel --bg %BRIDGE_PORT% >nul 2>&1
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$line = & '%TAILSCALE_EXE%' funnel status | Select-String '^https://' | Select-Object -First 1; if ($line) { $line.Line }" 2^>nul`) do (
      set "FUNNEL_URL=%%I"
    )
  )
)

echo.
echo =========================================================
echo PC Web App:
echo        http://localhost:%EXPO_PORT%
echo Local health URL:
echo        http://localhost:%BRIDGE_PORT%/health
if defined PUBLIC_TUNNEL_URL (
  echo Public HTTPS AI URL for Phone ^(works everywhere^):
  echo        !PUBLIC_TUNNEL_URL!
)
if defined LAN_IP (
  echo Phone AI URL ^(same Wi-Fi^):
  echo        http://!LAN_IP!:%BRIDGE_PORT%/chat
)
if defined FUNNEL_URL (
  if "!FUNNEL_URL:~-1!"=="/" set "FUNNEL_URL=!FUNNEL_URL:~0,-1!"
  echo Tailscale Funnel AI URL:
  echo        !FUNNEL_URL!/chat
)
echo Bearer token for app settings:
echo        %API_KEY%
echo =========================================================
echo.
echo Startup finished successfully.
goto :success

:check_url
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%~1' -TimeoutSec 3; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
exit /b %ERRORLEVEL%

:check_ollama_model
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { $payload = Invoke-RestMethod -Uri '%~1' -TimeoutSec 5; $names = @(); if ($payload.models) { $names = @($payload.models | ForEach-Object { $_.name }) }; if ($names -contains '%~2') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
exit /b %ERRORLEVEL%

:wait_for_url
set "TARGET_URL=%~1"
set "TARGET_WAIT=%~2"
for /L %%S in (1,1,%TARGET_WAIT%) do (
  call :check_url "%TARGET_URL%"
  if not errorlevel 1 exit /b 0
  >nul timeout /t 1 /nobreak
)
exit /b 1

:start_window
if defined DRY_RUN (
  echo [DRY RUN] start "%~1" "%ComSpec%" /k %~2
  exit /b 0
)
start "%~1" "%ComSpec%" /k %~2
exit /b 0

:start_window_in_dir
if defined DRY_RUN (
  echo [DRY RUN] start "%~1" /D "%~2" "%ComSpec%" /k %~3
  exit /b 0
)
start "%~1" /D "%~2" "%ComSpec%" /k %~3
exit /b 0

:run
if defined DRY_RUN (
  echo [DRY RUN] %*
  exit /b 0
)
%*
exit /b %ERRORLEVEL%

:fail
echo.
echo Startup failed.
echo Press any key to close this window.
pause >nul
exit /b 1

:success
echo.
echo Press any key to close this window.
pause >nul
exit /b 0
