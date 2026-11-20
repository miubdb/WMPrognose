@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title JANIQUIZITION
echo.
echo  JANIQUIZITION wird gestartet ...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  FEHLER: Node.js ist nicht installiert.
  echo  Bitte die LTS-Version von https://nodejs.org installieren ^(Version 22 oder neuer^)
  echo  und diese Datei danach erneut starten.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo  Erster Start: Abhaengigkeiten werden installiert ^(Internet noetig, einmalig^) ...
  call npm install
  if errorlevel 1 (
    echo.
    echo  FEHLER: "npm install" ist fehlgeschlagen. Internetverbindung pruefen und erneut starten.
    pause
    exit /b 1
  )
)

node --import tsx scripts\start-local.ts
echo.
echo  JANIQUIZITION wurde beendet. Zum Weiterspielen diese Datei erneut starten.
pause
