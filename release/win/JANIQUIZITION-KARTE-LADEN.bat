@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title JANIQUIZITION Offline-Karte laden
echo.
echo  OPTIONAL: Die Offline-Karte macht das Spiel "Wo zur Hoelle?" detailreicher.
echo  Ohne Karte funktioniert alles weiter - mit einer einfachen Laenderkarte.
echo.
echo  Dauer: je nach Internet 15 bis 40 Minuten, ca. 350 MB. Abbrechen ist erlaubt,
echo  ein erneuter Start setzt fort. Internetverbindung wird nur dafuer gebraucht.
echo.
if not exist "runtime\node.exe" ( echo  FEHLER: Programmdateien fehlen. Bitte erst das ZIP entpacken. & pause & exit /b 1 )
choice /C JN /M "Karte jetzt laden"
if errorlevel 2 exit /b 0
"runtime\node.exe" "app\karte-laden.mjs" --maxzoom 12
if errorlevel 1 (
  echo.
  echo  Das Laden der Karte hat nicht geklappt. Internet pruefen und erneut versuchen.
  pause
  exit /b 1
)
echo.
echo  Fertig. Beim naechsten Start von JANIQUIZITION wird die Karte automatisch genutzt.
pause
