@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher not found. Install Python 3.11+ and restart.
  pause
  exit /b 1
)
if not exist .venv\Scripts\python.exe py -3 -m venv .venv
if errorlevel 1 (echo Could not create a virtual environment.& pause& exit /b 1)
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (echo Dependency install failed.& pause& exit /b 1)
echo.
echo RETURN LOOP is running at http://127.0.0.1:8000
start "" http://127.0.0.1:8000
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
