# AGROSCOPE AI — Windows Start Script
# Run this from the agroscope-ai directory

Write-Host "Starting AGROSCOPE AI..." -ForegroundColor Green
Write-Host ""

# Backend
Write-Host "1. Starting FastAPI backend on port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; uvicorn app.main:app --reload --port 8000" -WindowStyle Normal

Start-Sleep 2

# Frontend
Write-Host "2. Starting Next.js frontend on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal

Start-Sleep 3

Write-Host ""
Write-Host "AGROSCOPE AI is starting!" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor Yellow
Write-Host "  API docs:  http://localhost:8000/api/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Demo: Go to http://localhost:3000/analyze" -ForegroundColor White
Write-Host "      Select Kansas Wheat Belt (38.34, -98.12)" -ForegroundColor White
Write-Host "      Click 'Run Analysis'" -ForegroundColor White
