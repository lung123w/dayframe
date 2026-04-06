@echo off
title DayFrame - Install Shortcuts
cd /d "%~dp0"

echo Installing DayFrame shortcuts...
echo.

:: Run the VBScript, passing the full path to the launcher
cscript //nologo "%~dp0create-shortcuts.vbs" "%~dp0start-dayframe.bat"

echo.
echo DayFrame will now:
echo   - Open from your Desktop shortcut
echo   - Start automatically when Windows boots
echo.
pause
