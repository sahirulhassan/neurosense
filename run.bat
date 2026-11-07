@echo off
title NeuroSense EEG Studio
cd /d "%~dp0"

echo [uv] Synchronizing environment and dependencies...
call uv sync
if %ERRORLEVEL% NEQ 0 (
    echo [uv] Error synchronizing dependencies. Please ensure uv is installed.
    pause
    exit /b %ERRORLEVEL%
)

echo [uv] Launching NeuroSense EEG Workstation on http://localhost:8000 ...
start http://localhost:8000
uv run python app.py
pause
