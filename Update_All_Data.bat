@echo off
chcp 65001 >nul
title Update All 1088 Ops Data
cd /d "%~dp0"

echo.
echo  ========================================
echo   Update All Dashboard Data
echo   Inventory + Receiving + Healthiness
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  if /i not "%~1"=="/nopause" pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [INFO] Installing dependencies...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    if /i not "%~1"=="/nopause" pause
    exit /b 1
  )
)

node scripts\update-all.js
if errorlevel 1 (
  echo.
  echo [ERROR] One or more updates failed.
  if /i not "%~1"=="/nopause" pause
  exit /b 1
)

echo.
echo [OK] public\data refreshed.
echo      Open http://127.0.0.1:5200/ and refresh the browser.
echo.
if /i not "%~1"=="/nopause" pause
exit /b 0
