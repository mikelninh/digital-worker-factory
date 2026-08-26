@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte Admin/Engineering informieren.
  pause
  exit /b 1
)
node packs\hauspilot\operator\admin-ready.mjs
if errorlevel 1 (
  pause
  exit /b 2
)
start "" "http://127.0.0.1:4317"
node packs\hauspilot\operator\ops-console.mjs
if errorlevel 1 (
  echo.
  echo Operations Console konnte nicht gestartet werden. Bitte Admin/Engineering informieren.
  pause
)
