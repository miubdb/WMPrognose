@echo off
chcp 65001 >nul
cd /d "%~dp0"
title OUTPLAY Backup einspielen
if "%~1"=="" (
  echo  Ziehe eine Backup-Datei ^(OUTPLAY-VOLLBACKUP-....db oder data\backups\outplay-....db^) auf diese Datei,
  echo  oder rufe sie so auf:  OUTPLAY-WIEDERHERSTELLEN.bat "C:\Pfad\backup.db"
  echo  WICHTIG: Der OUTPLAY-Server muss vorher beendet sein.
  pause
  exit /b 1
)
node scripts\restore-backup.mjs "%~1"
pause
