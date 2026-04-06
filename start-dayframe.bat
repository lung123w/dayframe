@echo off
title DayFrame

:: Run from project directory
cd /d "%~dp0"

:: Check if Vite dev server already running on 5173
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel%==0 (
    echo DayFrame already running, opening browser...
    start "" "http://localhost:5173"
    exit /b
)

:: Check if production server already running on 3001 (no Vite)
netstat -ano | findstr ":3001" >nul 2>&1
if %errorlevel%==0 (
    :: Production already up, just open it
    echo Production server detected, opening browser...
    start "" "http://localhost:3001"
    exit /b
)

:: Start dev server (runs both Vite + API via concurrently)
echo Starting DayFrame...
start /min cmd /k "npm run dev"

:: Wait for Vite to be ready (polls port 5173)
echo Waiting for server...
:wait_loop
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel%==1 goto wait_loop

:: Open browser
start "" "http://localhost:5173"
echo DayFrame is running at http://localhost:5173
