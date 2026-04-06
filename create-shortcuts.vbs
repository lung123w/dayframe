Set oWS = WScript.CreateObject("WScript.Shell")

' --- Paths ---
Dim batPath, iconPath, desktopPath, startupPath
batPath     = WScript.Arguments(0)   ' full path to start-dayframe.bat passed by install.bat
desktopPath = oWS.SpecialFolders("Desktop")
startupPath = oWS.SpecialFolders("Startup")

' --- Create Desktop shortcut ---
Dim oDesktop
Set oDesktop = oWS.CreateShortcut(desktopPath & "\DayFrame.lnk")
oDesktop.TargetPath       = batPath
oDesktop.WorkingDirectory = Left(batPath, InStrRev(batPath, "\") - 1)
oDesktop.WindowStyle      = 7   ' minimized
oDesktop.Description      = "Open DayFrame planner"
oDesktop.Save

' --- Create Startup shortcut ---
Dim oStartup
Set oStartup = oWS.CreateShortcut(startupPath & "\DayFrame.lnk")
oStartup.TargetPath       = batPath
oStartup.WorkingDirectory = Left(batPath, InStrRev(batPath, "\") - 1)
oStartup.WindowStyle      = 7   ' minimized
oStartup.Description      = "Open DayFrame planner"
oStartup.Save

WScript.Echo "Done! DayFrame shortcut added to Desktop and Startup."
