Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       NeuroSense - Clinical EEG Diagnostic Studio" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Creating virtual environment with uv..." -ForegroundColor Yellow
    uv venv .venv
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    uv pip install -r requirements.txt
}

Write-Host "Launching web browser at http://localhost:8000..." -ForegroundColor Green
Start-Process "http://localhost:8000"

Write-Host "Starting EEG Studio Server on port 8000..." -ForegroundColor Green
& ".venv\Scripts\python.exe" app.py
