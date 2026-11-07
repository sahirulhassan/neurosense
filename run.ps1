Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       NeuroSense - Clinical EEG Diagnostic Studio" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "[uv] Synchronizing dependencies..." -ForegroundColor Cyan
uv sync
if ($LASTEXITCODE -ne 0) {
    Write-Host "[uv] Sync failed. Please verify uv is installed and in your PATH." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[uv] Launching browser at http://localhost:8000..." -ForegroundColor Green
Start-Process "http://localhost:8000"

Write-Host "[uv] Running NeuroSense EEG Workstation on port 8000..." -ForegroundColor Green
uv run python app.py
