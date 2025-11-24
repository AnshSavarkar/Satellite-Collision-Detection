@echo off
echo ============================================================
echo Starting Full Stack Application
echo ============================================================
echo.
echo Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "cd backend && python start_server.py"
timeout /t 3 /nobreak >nul

echo Starting Frontend Dev Server (Port 8080+)...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ============================================================
echo Both servers starting in separate windows!
echo Backend: http://127.0.0.1:5000
echo Frontend: Check the Frontend Server window for the port
echo ============================================================
echo.
echo Press any key to close this window (servers will keep running)
pause >nul
