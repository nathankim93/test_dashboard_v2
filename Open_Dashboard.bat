@echo off
chcp 65001 >nul
title 1088 Operations Dashboard
cd /d "%~dp0"

set PORT=5200
set URL=http://127.0.0.1:%PORT%/

echo.
echo  ========================================
echo   1088 Operations Dashboard (3 sheets)
echo   URL : %URL%
echo  ========================================
echo.
echo  ※ index.html 을 직접 더블클릭하면 하얀 화면만 보입니다.
echo     반드시 이 BAT 로 실행하세요.
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [INFO] Installing dependencies...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', %PORT%); $c.Close(); exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
  echo [INFO] Server already running on port %PORT%.
  start "" "%URL%"
  exit /b 0
)

start "1088-Ops-Dashboard" /min cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
start "" "%URL%"
echo.
echo Hub opened at %URL%
echo Keep the minimized server window running.
echo.
pause
