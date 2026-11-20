# Sicheres Update (ZIP) auf dem Windows-Laptop

1. **JANIQUIZITION beenden** (Fenster schließen).
2. Ordner `data` an einen sicheren Ort **kopieren** (enthält `outplay.db` und die Karte `maps\outplay-karte.mbtiles` – Dateinamen bleiben bewusst unverändert, damit nichts verloren geht).
3. Neues ZIP **in einen neuen Ordner** entpacken. Den Ordner `data` aus dem alten Ordner hineinkopieren (nicht überschreiben lassen: die neue ZIP enthält keinen `data`-Ordner).
4. `JANIQUIZITION-STARTEN.bat` starten (die alten `OUTPLAY-*.bat` heißen jetzt `JANIQUIZITION-*.bat`).
5. Admin → **Start** → gelber Kasten **„Update verfügbar“** → **Jetzt sicher aktualisieren**. Es entsteht automatisch eine Sicherung in `data\backups`; neue Spiele und Pakete werden nur ergänzt, bestehende Versionen und Räume bleiben unverändert.
6. Im Showmaster-Pult das Paket wählen (Hauptshow vorausgewählt). Zum Ausprobieren: **„Neue Spielmodi – Testpaket“**.

Rückweg: `JANIQUIZITION-WIEDERHERSTELLEN.bat` mit einer Sicherung aus `data\backups`.
