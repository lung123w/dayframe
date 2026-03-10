@echo off
title DayFrame Launcher

:: Check if server is already running on port 3001
netstat -ano | findstr ":3001" >nul 2>&1
if %errorlevel%==0 (
    echo Server already running on port 3001.
) else (
    echo Starting DayFrame server...
    cd /d "%~dp0"
    start /min cmd /c "npm start"
    echo Waiting for server to start...
    timeout /t 4 /nobreak >nul
)

echo Opening DayFrame in browser...
start "" "http://localhost:3001"
