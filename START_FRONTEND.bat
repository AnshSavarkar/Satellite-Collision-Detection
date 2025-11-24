@echo off
echo ============================================================
echo Starting Frontend Dev Server (Vite)
echo ============================================================
echo Frontend will run on: http://localhost:8080 or http://localhost:8081
echo Press CTRL+C to stop the server
echo ============================================================
echo.

cd /d "%~dp0"
npm run dev

pause
