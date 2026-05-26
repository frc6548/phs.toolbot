Set WshShell = CreateObject("WScript.Shell")

cmd = "cmd /c cd /d C:\Users\Robotics\phstoolbot\phstoolbot && npm start"

WshShell.Run cmd, 0, False
