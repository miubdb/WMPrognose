@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title JANIQUIZITION
echo.
echo  JANIQUIZITION wird gestartet ...
echo.
if not exist "runtime\node.exe" goto :unvollstaendig
if not exist "app\server.mjs" goto :unvollstaendig
if not exist "app\launcher.mjs" goto :unvollstaendig
if not exist "dist\index.html" goto :unvollstaendig
"runtime\node.exe" "app\launcher.mjs"
set CODE=%errorlevel%
echo.
if "%CODE%"=="0" (
  echo  JANIQUIZITION wurde beendet. Zum Weiterspielen diese Datei erneut starten.
) else (
  echo  JANIQUIZITION wurde mit einem Fehler beendet ^(Code %CODE%^).
  echo  Die Meldung steht weiter oben. Wenn du nicht weiterkommst: Foto davon machen und weitergeben.
  echo  Haeufige Ursachen: Virenscanner hat "runtime\node.exe" blockiert, oder der Ordner liegt noch im ZIP.
)
pause
exit /b %CODE%

:unvollstaendig
echo  FEHLER: Es fehlen Programmdateien.
echo.
echo  Meistens wurde das ZIP nicht entpackt, sondern direkt aus dem ZIP gestartet.
echo  So geht es richtig:
echo    1. ZIP-Datei mit der rechten Maustaste anklicken
echo    2. "Alle extrahieren ..." waehlen und das Entpacken abschliessen
echo    3. Im NEUEN Ordner diese Datei erneut doppelklicken
echo.
echo  Wenn es danach noch nicht geht: ZIP erneut herunterladen ^(vielleicht war der Download unvollstaendig^).
echo.
pause
exit /b 1
