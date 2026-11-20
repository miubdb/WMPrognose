@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title JANIQUIZITION Admin-Passwort zuruecksetzen
echo.
echo  Admin-Passwort vergessen? Hier wird es zurueckgesetzt.
echo  Deine Fragen, Pakete und Spielstaende bleiben erhalten.
echo.
echo  WICHTIG: Bitte zuerst das JANIQUIZITION-Fenster schliessen ^(Programm beenden^).
echo.
if not exist "runtime\node.exe" ( echo  FEHLER: Programmdateien fehlen. Bitte erst das ZIP entpacken. & pause & exit /b 1 )
choice /C JN /M "Passwort jetzt zuruecksetzen"
if errorlevel 2 exit /b 0
"runtime\node.exe" "app\reset-admin.mjs"
echo.
echo  Danach JANIQUIZITION-STARTEN.bat ausfuehren und im Browser /admin oeffnen - dort wird ein neues Passwort festgelegt.
echo.
pause
