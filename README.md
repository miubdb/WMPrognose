# OUTPLAY – die interaktive Multiplayer-Gameshow

Showmaster + TV + 6–8 Handys. Die Show läuft **lokal** (Node-Server + SQLite) – ohne Internet. Fragen und Pakete bereitet man bequem im **Admin** vor (auch online).

## Die fünf Begriffe – bitte nicht verwechseln
| | Was ist das? | Wo läuft es? | Wo liegen die Daten? |
|---|---|---|---|
| **Online-Admin** | Nur der Admin-Bereich `/admin` (Fragen, Kategorien, Pakete, Szenen, Vorschau, Export/Import) | Vercel (kostenlos), per Handy erreichbar | Serverseitig, dauerhaft: **privater Vercel-Blob-Speicher** (eine SQLite-Datei) |
| **Online-Testversion** | Gibt es **nicht**: Host/TV/Spieler brauchen WebSockets und laufen online bewusst nicht | – | – |
| **Lokal spielbare Windows-Version** | Die komplette Show (`OUTPLAY-STARTEN.bat`) inkl. lokalem Admin | Laptop, WLAN, ohne Internet | `data/outplay.db` (SQLite) |
| **Inhalts-Export** (JSON) | Fragen, Kategorien, Pakete, Szenen – zum Übertragen/Sichern. **Keine** Räume, Spieler oder Passwörter | Admin → Import/Export | Datei, die du speicherst |
| **Vollständiges Server-Backup** (.db) | Konsistente Kopie der ganzen Datenbank inkl. Räume, Spieler, Punkte, Spielstände. **Vertraulich** (enthält Passwort-Hashes, Host-PINs, Wiederherstellungscodes) | Admin → Import/Export, automatisch lokal alle 10 min | `.db`-Datei / `data/backups` |

## Ablauf Donnerstag/Freitag → Samstag
1. **Online** (`/admin` auf dem Handy): Fragen prüfen/ergänzen, Kategorien ändern, Glitch-Szenen bauen, Paket zusammenstellen → **Prüfen & veröffentlichen**.
2. **📤 Spieleabend exportieren** (Import/Export oder Paketkarte) → JSON-Datei auf dem Handy; per Mail/Cloud/USB zum Laptop.
3. **Samstag am Laptop**: `OUTPLAY-STARTEN.bat` starten → `/admin` → Import/Export → Datei wählen → Prüfbericht ansehen → **✅ Importieren & veröffentlichen** (Bestätigung: „Inhalt stimmt mit dem Export überein“).
4. `/host` → Spielepaket wählen → Spielraum erstellen. Details: **docs/WINDOWS.md**.

## Starten (Entwicklung / andere Systeme)
```bash
npm install
npm run build                       # Frontend nach dist/
PORT=8080 DATA_DIR=./data npm start # http://localhost:8080
```
Windows: `OUTPLAY-STARTEN.bat` (prüft Node, installiert/baut bei Bedarf, wählt die WLAN-Adresse, zeigt alle Links).

## Umgebungsvariablen
`PORT` (8080) · `DATA_DIR` (./data) · `ADMIN_PASSWORD` (Admin; ohne Angabe wird lokal beim ersten Start ein Zufallspasswort erzeugt → Konsole + `data/admin-passwort.txt`) · `HOST_PASSWORD` (optional, schützt das Erstellen von Räumen) · `OUTPLAY_HOST` / `PUBLIC_URL` (feste Adresse für QR-Codes, z. B. `http://192.168.0.23:8080`). Online zusätzlich: `BLOB_READ_WRITE_TOKEN` (setzt Vercel automatisch beim Verbinden des Blob-Speichers) und `ADMIN_PASSWORD` (Pflicht).

## Spielregeln & Punkte
- **Startguthaben:** Jeder Spieler startet mit **200 Punkten** (pro Paket einstellbar). Das gilt für alle gleich.
- **Kachel-Maxima:** Kachel 1.000, Überraschung 1.000, Finale 2.000 Punkte (ohne Startguthaben). Theoretisches Gesamtmaximum = Startguthaben + 6 × 1.000 + 1.000 + 2.000.
- **Setz auf mich:** bester Tipp bis 300 Punkte (Rangfolge nach |ln(Tipp/Lösung)|, fair auch bei großen Zahlen), danach Einsatz 0/100/200 (Finale 500 + 0/250/500).
- **Einsätze (SETZ AUF MICH):** nur bis zum **tatsächlichen Punktestand**. Wer 0 Punkte hat, schätzt weiter mit, kann aber nichts setzen. Gewonnen: +Einsatz, verloren: −Einsatz. Der Stand wird nie negativ. (Einen früheren „Mindesteinsatz von 100“ gibt es nicht mehr.) Finale: Einsatz ≤ vorhandene Punkte (max. 500).
- **Wo zur Hölle:** Platzierung nach Entfernung (100/80/65/50/35/20/10 % bei 7 Spielern, sonst interpoliert; Gleichstand = gleicher Platz).
- **Blind Rank:** Budget × richtige Paare ÷ 10. **Glitch:** Treffer 70–100 %, knapp daneben bis 15 %. **Codebreak:** 100/75/50/25 % je nach Hinweisen, 3 Versuche. **Einzigartig:** 500 einmalig / 150 mehrfach / 0 ungültig (Host entscheidet bei Unklarem).
- Gleichstand am Ende: mehr Finalpunkte, dann frühere Anmeldung.
- Verteilung bei freier Wahl: pro Paket max. Fußball-Kacheln (Standard 2) und max. Kacheln je Modus (Standard 2).

## Spielerplatz wiederherstellen
Gleicher Browser: automatisch. Anderes Gerät: `/play/CODE` → „Platz wiederherstellen“ → 6-stelliger Code (unten im Controller; der Host sieht alle) – oder der Host gibt den Platz frei (📱).

## Admin (`/admin`)
Fragenbibliothek (6 Modus-Editoren, Suche, Filter, Duplizieren, Archiv), Kategorien, Spielepakete (Prüfung, Analyse Spielzeit erwartet/maximal, Fußballanteil, Veröffentlichen als unveränderliche Version, Rollback), Szenen-Vorlagen für Glitch, **👀 Vorschau** (echte Engine, TV + Handy + Auflösung + Punkteberechnung), Import/Export, Backup. Ein laufender Raum behält seinen Paketstand (`bookId`), egal was im Admin geändert wird.

### Sicherheit
Serverseitig geprüfte Anmeldung (Passwort nur als Hash bzw. Konstantzeit-Vergleich), zufällige Sitzungstoken in **HttpOnly + SameSite=Strict (+ Secure bei HTTPS)** Cookies, CSRF-Header + Herkunftsprüfung für alle Schreib-APIs, Fehlversuch-Sperre (8 / 10 min, in der Datenbank), Pakete sind erst nach Veröffentlichung für Räume sichtbar; die öffentliche Paketliste enthält keine Lösungen. Keine Zugangsdaten im Repository; `data/`, `.env` und Backups sind gitignoriert und werden nie ausgeliefert (Tests).

## Backups
- **A) Inhalts-Backup (JSON):** Admin → Import/Export → „Alles (Inhalte)“ / Paket / Fragen. Prüfsumme in der Datei.
- **B) Voll-Backup (.db):** Admin → „Voll-Backup herunterladen“ (SQLite `VACUUM INTO`, auch im WAL-Betrieb konsistent). Lokal zusätzlich automatisch alle 10 Minuten nach `data/backups` (letzte 30). **Eine laufende `outplay.db` einfach zu kopieren ist NICHT zuverlässig** (ungesicherte Daten in der `-wal`-Datei können fehlen).
- **Wiederherstellen:** Server beenden → Backup-Datei auf `OUTPLAY-WIEDERHERSTELLEN.bat` ziehen (oder `npm run restore -- backup.db`). Das Skript prüft die Datei, verweigert bei laufendem Server und sichert die alte Datenbank als `outplay.db.vor-restore-…`.

## Kosten & Hosting
Lokal: keine. Online-Admin: Vercel Hobby (kostenlos) + Vercel Blob (im Hobby-Tarif enthaltenes Kontingent). Details und Einrichtung: **docs/ONLINE-SETUP.md**. Es gibt keine kostenpflichtige Konfiguration im Repository (die frühere `render.yaml` mit bezahltem Tarif wurde entfernt; das `Dockerfile` ist optional und kostenlos nutzbar). Cloudflare-Alternative: `docs/cloudflare.md`.

## Tests
`npm test` (Wertungen, Multiplayer über echte WebSockets, komplette Show mit Bots, Admin-API, Online-Adapter, Transfer, Backup, Netzwerk). Browser-E2E (Playwright; Server vorher starten bzw. Skript startet selbst): `tests/e2e/play.mjs`, `modes.mjs`, `admin.mjs`, `transfer.mjs`. Ehrlicher Stand: siehe `docs/TESTBERICHT.md`.
