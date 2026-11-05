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
`PORT` (8080) · `DATA_DIR` (./data, SQLite-Datei `outplay.db`) · `ADMIN_PASSWORD` (optional; schützt das Erstellen von Räumen).

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
- Setz auf mich: bester Tipp 300 (Platzierung nach |ln(Tipp/Lösung)|, daher fair für große Zahlen), Einsatz 0/100/200 gewinnt +Einsatz, verliert −Einsatz (gedeckelt). Finale: 500 + Einsatz 0/250/500.
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
