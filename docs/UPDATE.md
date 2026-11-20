# Update (Release-Paket `JANIQUIZITION-Windows.zip`)

**Neue ZIP herunterladen und in DENSELBEN Ordner entpacken (Dateien ersetzen).** Der Ordner `data` ist nicht im ZIP und bleibt deshalb unberührt (Datenbank, Backups, Karte, Admin-Passwort, Räume, eigene Fragen und Pakete).
Beim ersten Start einer neuen Version legt der Starter automatisch eine Sicherheitskopie an (`data\backups\vor-update-auf-<Version>-….db`). Neue Standardinhalte werden nur ergänzt; archivierte/entfernte Pakete werden nicht reaktiviert, eigene Änderungen nicht zurückgesetzt.

- Wer in einem **neuen Ordner** entpackt, muss den Ordner `data` aus dem alten Ordner hineinkopieren.
- Bestehende Entwickler-Installation (mit `node_modules`): ZIP in denselben Ordner entpacken und künftig wie oben starten; `data` und das Admin-Passwort bleiben gültig.
- Zurück zur alten Version: `JANIQUIZITION-WIEDERHERSTELLEN.bat` mit einer Sicherung aus `data\backups`.

---

## Ältere Anleitung (Entwickler-Installation mit npm)


1. **JANIQUIZITION beenden** (Fenster schließen).
2. Ordner `data` an einen sicheren Ort **kopieren** (enthält `outplay.db` und die Karte `maps\outplay-karte.mbtiles` – Dateinamen bleiben bewusst unverändert, damit nichts verloren geht).
3. Neues ZIP **in einen neuen Ordner** entpacken. Den Ordner `data` aus dem alten Ordner hineinkopieren (nicht überschreiben lassen: die neue ZIP enthält keinen `data`-Ordner).
4. `JANIQUIZITION-STARTEN.bat` starten (die alten `OUTPLAY-*.bat` heißen jetzt `JANIQUIZITION-*.bat`).
5. Admin → **Start** → gelber Kasten **„Update verfügbar“** → **Jetzt sicher aktualisieren**. Es entsteht automatisch eine Sicherung in `data\backups`; neue Spiele und Pakete werden nur ergänzt, bestehende Versionen und Räume bleiben unverändert.
6. Im Showmaster-Pult das Paket wählen (Hauptshow vorausgewählt). Zum Ausprobieren: **„Neue Spielmodi – Testpaket“**.

Rückweg: `JANIQUIZITION-WIEDERHERSTELLEN.bat` mit einer Sicherung aus `data\backups`.
