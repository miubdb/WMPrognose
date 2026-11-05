# Machbarkeit: OUTPLAY auf Cloudflare Workers + Durable Objects (kostenlos)

**Kurzfassung:** Machbar, mit überschaubarem Umbau. Nicht jetzt durchgeführt; für Samstag läuft OUTPLAY weiter lokal (Node + SQLite).

## Warum es gut passt
- Ein Raum = ein **Durable Object** (DO): eine einzige, serialisierte Instanz hält den Spielzustand → exakt das „zentrale autoritative State-Machine“-Modell der Engine. Gleichzeitige Eingaben werden automatisch nacheinander verarbeitet.
- **WebSockets** werden im DO unterstützt (Hibernation API: Verbindungen bleiben offen, der DO schläft dazwischen).
- **Alarm-API** ersetzt den 250-ms-Ticker: ein Alarm pro Raum zum nächsten Fristende (`room.round.deadline`).
- Statische Dateien (`dist/`) liefern Workers Static Assets kostenlos aus.
- Inhalte (Fragen, Kategorien, Pakete, Versionen, Szenen) liegen heute in SQLite-Tabellen → 1:1 nach **D1** (SQLite-kompatibel) migrierbar. Der Admin-Bereich spricht nur die REST-API an und bleibt unverändert.

## Notwendige Änderungen
| Bereich | Heute | Cloudflare |
|---|---|---|
| Spielzustand je Raum | `rooms.json` in SQLite | `state.storage.put('room', …)` im DO (SQLite-backed DO) |
| Raum-Registry | `Map` im Prozess | DO-Name = Raumcode (`idFromName`); „existiert Raum?“ per D1-Tabelle oder DO-Abfrage |
| WebSocket-Hub (`server/app.ts`) | `ws` | `WebSocketPair` + `ctx.acceptWebSocket()` im DO; Heartbeat per Hibernation-Ping |
| Timer (`tick`) | `setInterval` | `ctx.storage.setAlarm(deadline)` + `alarm()` ruft `engine.tick` |
| Inhalte/Admin | `node:sqlite` | D1 (`env.DB.prepare…`) – `ContentService` auf asynchrone Aufrufe umstellen (aktuell synchron) |
| Paketstand je Raum | `bookId` → Snapshot aus `pack_versions` | unverändert; beim Anlegen des DO den Snapshot **in den DO-Speicher kopieren** (kein D1-Zugriff im Spiel nötig) |
| Admin-Login | scrypt + Cookie-Sessions in SQLite | Passwort als Secret (`wrangler secret put ADMIN_PASSWORD`), Sessions in D1/KV; scrypt → PBKDF2 (WebCrypto) |
| Statisches Frontend | Node-Static | Workers Assets |
| Engine, Modi, Wertung, Shared, Frontend | – | **unverändert** (reines TypeScript, keine Node-APIs außer `node:crypto` → `crypto.subtle`/`crypto.getRandomValues`) |

Der Umbau konzentriert sich auf eine neue Datei (`worker/index.ts` + `RoomDO`), `server/store.ts` (D1-Variante) und das Ersetzen von `node:crypto`. Geschätzt 1–2 Tage inkl. Tests.

## Grenzen des kostenlosen Tarifs (zu prüfen, Stand Ende 2025; Preise/Limits können sich ändern)
- Free-Plan: Durable Objects nur mit **SQLite-Speicher**, tägliche Request-/Duration-Kontingente (Größenordnung 100k Requests/Tag, 13.000 GB-s/Tag). Ein Spieleabend (7 Clients, ~75 min) liegt weit darunter, solange Hibernation genutzt wird (ohne Hibernation zählt die Zeit offener WebSockets als Dauer).
- Eingehende WebSocket-Nachrichten zählen als Requests (Verhältnis 20:1); Heartbeats sparsam halten (alle 15–20 s).
- D1 Free: 5 Mio. Lesezeilen/Tag, 100k Schreibzeilen/Tag – für Inhalte völlig ausreichend.
- Keine Kreditkarte nötig; bei Überschreitung werden Anfragen abgelehnt statt abgerechnet.

## Empfehlung
1. Samstag: lokal (Windows-Laptop, `npm start`, Handys im gleichen WLAN; für Zugriff von außen optional `cloudflared tunnel` – ebenfalls kostenlos).
2. Danach: Worker-Variante als Branch umsetzen, die Test-Suite (`tests/*.test.ts`, gegen die Engine) bleibt gültig; die WebSocket-Integrationstests laufen gegen `wrangler dev`.
