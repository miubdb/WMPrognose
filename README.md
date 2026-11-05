# OUTPLAY – die interaktive Multiplayer-Gameshow

Showmaster + TV + 6–8 Handys. Ein Node-Server (HTTP + WebSocket) hält den autoritativen Spielzustand in SQLite.

## Starten
```bash
npm install
npm run build                      # Frontend nach dist/
PORT=8080 DATA_DIR=./data npm start   # http://localhost:8080
```
Entwicklung: `npm run dev` (Vite :5173 + Server :8080). Tests: `npm test` (Wertungen, echte WebSocket-Multiplayer-Tests, komplette Show mit Bots).
Browser-E2E (Playwright, Server auf :8091 starten): `node tests/e2e/play.mjs`, `node tests/e2e/modes.mjs`.

## Umgebungsvariablen
`PORT` (8080) · `DATA_DIR` (./data, SQLite-Datei `outplay.db`) · `ADMIN_PASSWORD` (Admin-Bereich; ohne Angabe wird beim ersten Start ein zufälliges Passwort erzeugt, in der Konsole angezeigt und in `data/admin-passwort.txt` abgelegt) · `HOST_PASSWORD` (optional; schützt das Erstellen von Räumen).

## Show-Ablauf
1. `/host` → „Spielraum erstellen“. Host-Schlüssel liegt im Browser, zusätzlich gibt es eine 6-stellige Host-PIN (Gerätewechsel).
2. Fernseher: `/tv/CODE` öffnen, einmal klicken (Ton + Vollbild). QR-Code + Raumcode erscheinen.
3. Spieler: QR scannen oder `/play/CODE` → Name + Avatar → Beitreten.
4. Host: „Lobby schließen & Show starten“ → Eröffnung → Kategorienwand. Ablauf: 3 Kacheln · Zwischenstand · Überraschung (EINZIGARTIG) · Zwischenstand · 3 Kacheln · letzter Stand · FINAL LOCK (Rangliste verborgen) · Siegerehrung.
5. Pro Aufgabe: „Starten“ → (Sperren) → „Auflösung zeigen“ → „Weiter“. „Korrektur & Notfall“: Aufgabe neu starten, überspringen, Zurück zur Wand. Punkte ± pro Spieler in der Spielerliste.

## Spielerplatz wiederherstellen
- Gleicher Browser: automatisch (Token in localStorage).
- Anderes Gerät/Browser: `/play/CODE` → „Platz wiederherstellen“ → 6-stelliger Code (im Controller unten „Wiederherstellungscode“, der Host sieht alle Codes).
- Oder Host klickt 📱 (Platz freigeben); das neue Gerät wählt „Ich bin …“. Das alte Gerät wird abgemeldet.

## Punkte
- Kachel max. 1.000, Überraschung 1.000, Finale 2.000. Kein negativer Stand; Einsätze ≤ aktuellem Punktestand.
- Wo zur Hölle: Platzierung nach km (100/80/65/50/35/20/10 % bei 7 Spielern, sonst interpoliert; Gleichstand = gleicher Platz). Spieler ohne Abgabe: 0.
- Blind Rank: Budget × richtige Paare / 10. Nicht platzierte Begriffe zählen nicht.
- Setz auf mich (Mindesteinsatz: jeder darf 100 setzen, größere Einsätze nur mit entsprechenden Punkten; ein Verlust ist durch vorhandene Punkte gedeckelt): bester Tipp 300 (Platzierung nach |ln(Tipp/Lösung)|, daher fair für große Zahlen), Einsatz 0/100/200 gewinnt +Einsatz, verliert −Einsatz (gedeckelt). Finale: 500 + Einsatz 0/250/500.
- Glitch: Treffer 70–100 %, knapp daneben bis 15 %. Zonen werden exakt aus dem Szenenunterschied berechnet.
- Codebreak: 100/75/50/25 % je nach Hinweisen, 3 Versuche, kein Tempobonus.
- Einzigartig: 500 einmalig / 150 mehrfach / 0 ungültig; Host kann unklare Antworten freigeben, zuordnen oder verwerfen.
- Gleichstand in der Endwertung: mehr Finalpunkte, dann frühere Anmeldung.

## Robustheit
Zustand + Fristen liegen serverseitig (SQLite, Speichern vor Bestätigung). Antworten sind idempotent (reqId + Inhaltsprüfung). Clients verbinden automatisch neu (Heartbeat, Page Visibility, Wake Lock) und laden den vollständigen Zustand. Nach Serverneustart laufen Raum, Punkte, Phase und Timer weiter.

## Deployment / Kosten
Benötigt einen dauerhaft laufenden Node-Prozess mit beschreibbarem Datenträger (Dockerfile + render.yaml liegen bei; Fly.io/Railway/eigener Rechner gehen ebenso). Vercel-Functions eignen sich nicht für den dauerhaften SQLite-Zustand. Kostenlos: Server auf dem eigenen Laptop im WLAN starten (oder per Tunnel, z. B. `cloudflared tunnel --url http://localhost:8080`) – Handys müssen die Adresse erreichen. Gehostet fallen je nach Anbieter wenige € pro Monat an (Render „starter“ + Disk).

## Einschränkungen V1
Nur 6 Spielmodi; HOCHSTAPLER u. a. nicht umgesetzt. Neue Modi: Eintrag in `server/modes.ts` + UI in `web/src/pages/`. Inhalte: `content/tiles.ts` (9 Kacheln, Überraschung, Finale). Faktenprüfung erfolgte aus gesichertem Wissen, nicht live gegen Webquellen – Aufgaben vor dem Abend gegenlesen. Auf Echt-Geräten (iOS/Android) wurde nur per Playwright-Emulation getestet.

## Spielzeit (aus den hinterlegten Timern berechnet, `shared/timing.ts`)
Kacheln 5–7,5 min, Überraschung ca. 6,5 min, Finale ca. 10 min, plus Lobby 8 min, Eröffnung, 3 Zwischenstände, Siegerehrung. Jede der 84 möglichen Auswahlen von 6 Kacheln ergibt 60–75 min (Test `tests/timing.test.ts`).

## Admin-Bereich (`/admin`)
Verwaltet alle Inhalte im Browser; gespeichert wird in SQLite (`data/outplay.db`, Tabellen `questions`, `categories`, `packs`, `pack_versions`, `scenes`).
- **Fragenbibliothek**: suchen, nach Modus/Thema filtern, anlegen (alle 6 Modi mit eigener Eingabemaske), bearbeiten, duplizieren, archivieren, löschen (nur wenn in keiner Kategorie verwendet), 👀 Vorschau.
- **Kategorien**: Titel, Beschreibung, Icon, Farbe, Regeltext, Typ (Kachel / Überraschung / Finale), Fußball-Kennzeichen, Aufgabenliste (Reihenfolge, Budgetanzeige 1.000/2.000), duplizieren, deaktivieren, löschen.
- **Spielepakete**: Kategorien + Überraschung + Finale + Regeln (Startguthaben, Fußball-/Modus-Limit). Prüfung/Analyse (Spielzeit erwartet & maximal, Fußballanteil, Modusverteilung über alle möglichen Kategorien-Auswahlen), **Veröffentlichen** erzeugt eine unveränderliche Version; **Archivieren**; **Wiederherstellen** früherer Versionen.
- **Szenen** (GLITCH): Vorlagen Raster, Liste/Speisekarte/Kassenzettel, Tabelle, Spielfeld – Unterschied und Trefferzone werden automatisch erzeugt und grafisch gezeigt.
- **Import/Export** (JSON): alles (Backup), nur Fragen, einzelne Pakete. Import als Kopie (Standard), überspringen oder überschreiben.
- Die ursprünglichen Inhalte aus `content/tiles.ts` werden beim ersten Start als bearbeitbare Vorlagen importiert (Paket „Standardpaket – Abend 1“, Version 1).

### Neue Kategorie und Frage anlegen
1. `/admin` → Anmelden → **Kategorien** → „＋ Neue Kategorie“ (Titel, Beschreibung, Regeltext, Icon, Farbe).
2. Im selben Dialog „＋ Neu: <Modus>“ wählen, Maske ausfüllen (Pflichtfelder werden unten als „Noch offen“ gemeldet), **Speichern** – die Frage landet in der Bibliothek und in der Kategorie. Mit **👀 Vorschau** TV, Handy, Auflösung und Punkte ansehen.
3. Kategorie speichern (Budget 1.000 Punkte anpeilen). **Spielepakete** → Paket öffnen/duplizieren → Kategorie hinzufügen → **Prüfen & veröffentlichen**.
4. Auf der Host-Seite (`/host`) das Paket beim Erstellen des Raums auswählen.

### Garantien
- Ein Raum speichert die Paketversion (`bookId`, z. B. `standard-1@1`). Änderungen im Admin, neue Versionen oder Rollbacks verändern laufende Räume nie (Test vorhanden).
- Alle Schreib-APIs verlangen eine serverseitig geprüfte Sitzung (HttpOnly-Cookie, SameSite=Strict), den Header `x-outplay-admin` (CSRF) und passende Herkunft; Login mit scrypt-Hash bzw. Konstantzeit-Vergleich, Rate-Limit (8 Fehlversuche / 10 min).
- Backup: `data/outplay.db` kopieren oder im Admin „Alles (Backup)“ exportieren.

## Einsätze und Startguthaben
Alle Spieler starten mit dem Startguthaben des Pakets (Standard 200). Einsätze (SETZ AUF MICH) sind nur bis zum tatsächlichen Punktestand möglich; wer 0 Punkte hat, schätzt weiter mit, kann aber nichts setzen. Ein verlorener Einsatz kostet genau den Einsatz. Die Kachelmaxima (1.000 / 1.000 / 2.000) ändern sich nicht; theoretisches Gesamtmaximum = Startguthaben + 6 × 1.000 + 1.000 + 2.000. Im Finale gilt weiter: Einsatz ≤ vorhandene Punkte (500).

## Verteilung bei freier Kategorienwahl
Pro Paket einstellbar: max. Fußball-Kacheln (Standard 2) und max. Kacheln je Modus (Standard 2). Gesperrte Kacheln erscheinen mit 🔒; sind alle übrigen gesperrt, wird das Limit automatisch aufgehoben, damit nie jemand blockiert ist.

## Spielzeit
`shared/timing.ts`: *erwartet* (Runden enden im Schnitt bei 85 % des Limits) und *maximal* (alle Limits voll ausgeschöpft, Moderation 30 % langsamer). Das Maximum ist nur eine Planungsgröße – die Show bricht nie automatisch ab; der Host kann überspringen und pausieren.

## Hosting später kostenlos online
Siehe `docs/cloudflare.md` (Workers + Durable Objects + D1).
