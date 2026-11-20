@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title JANIQUIZITION Sicherung einspielen
if "%~1"=="" (
  echo.
  echo  So spielst du eine Sicherung zurueck:
  echo    Ziehe die Sicherungsdatei ^(.db^) mit der Maus auf diese Datei.
  echo    Sicherungen findest du im Ordner data\backups ^(automatisch erstellt^)
  echo    oder als heruntergeladene Datei JANIQUIZITION-VOLLBACKUP-....db aus dem Admin.
  echo.
  echo  WICHTIG: JANIQUIZITION muss vorher beendet sein.
  echo.
  pause
  exit /b 1
)
if not exist "runtime\node.exe" ( echo  FEHLER: Programmdateien fehlen. Bitte erst das ZIP entpacken. & pause & exit /b 1 )
"runtime\node.exe" "app\restore-backup.mjs" "%~1"
echo.
pause
