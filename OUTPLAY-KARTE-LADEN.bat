@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title OUTPLAY Karte laden
echo.
echo  OUTPLAY: Offline-Karte (OpenStreetMap) wird erzeugt.
echo  Einmalig mit Internet, dauert je nach Verbindung ca. 15-40 Minuten, ca. 500 MB.
echo  Abbrechen ist erlaubt - ein erneuter Start setzt fort.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  FEHLER: Node.js ist nicht installiert ^(Version 22 oder neuer, https://nodejs.org^).
  pause
  exit /b 1
)
if not exist node_modules (
  call npm install
  if errorlevel 1 ( echo  FEHLER: npm install fehlgeschlagen. & pause & exit /b 1 )
)
node scripts/build-maps.mjs --maxzoom 12
if errorlevel 1 (
  echo.
  echo  FEHLER beim Laden der Karte. Internet pruefen und erneut starten.
  pause
  exit /b 1
)
echo.
echo  Fertig. Die Karte liegt in data\maps\outplay-karte.mbtiles - OUTPLAY-STARTEN.bat nutzt sie automatisch.
pause
