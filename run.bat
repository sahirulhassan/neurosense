@echo off
title NeuroSense EEG Studio
echo ========================================================
echo        NeuroSense - Clinical EEG Diagnostic Studio
echo ========================================================
echo.
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment with uv...
    uv venv .venv
    echo Installing dependencies...
    uv pip install -r requirements.txt
)

echo Starting EEG Studio Web Server on http://localhost:8000 ...
start http://localhost:8000
.venv\Scripts\python.exe app.py
pause
