# Testbericht (Stand Runde 4)

**Echt ausgeführt (diese Sandbox, Node 22, Chromium via Playwright):**
- `npm test`: **64 von 64** bestanden – Wertungen/Inhalte/Spielzeit, Multiplayer über echte WebSockets (Reconnect, Fristen, Serverneustart, Host-/TV-Reload), komplette Show mit 7 Bots, Admin-API (Rechte, CRUD, Pakete/Versionen, Import/Export, Vorschau), **Online-Adapter**, **Transfer Online→Lokal**, **Backup/Restore**, Netzwerk-Adressauswahl, Dateien nie öffentlich.
- Browser-E2E (echte Browser, Handy-Emulation): `play.mjs`, `modes.mjs`, `admin.mjs`, `transfer.mjs`, `shots-admin-mobile.mjs` (Pixel 7 + iPhone 13, kein horizontaler Überlauf in 22 Ansichten) – alle grün.
- `tsc --noEmit`, `vite build` ohne Fehler.
- Live-Prüfung des Vercel-Deployments (nur lesende Abfragen über die Vercel-Anbindung): `/api/health`, `/admin`, `/api/admin/me` (503 „Speicher nicht eingerichtet“ wie vorgesehen), `/api/rooms` (501) antworten korrekt.

**Nur simuliert bzw. nicht getestet:**
- Der **echte Vercel-Blob-Speicher** ist nicht angebunden (fehlende Berechtigung meiner Vercel-Anbindung; Einrichtung durch dich nötig). Der Blob-Adapter wurde mit einem dateibasierten Ersatz getestet (gleiche Logik, inkl. ETag-Konflikt und Speicherfehler); der Aufruf der echten `@vercel/blob`-SDK ist **ungetestet**.
- Anmelden/Schreiben auf der Online-URL konnte ich nicht ausführen (kein POST-Zugriff, kein Passwort).
- Windows: `OUTPLAY-STARTEN.bat`/`start-local.ts` wurden hier unter Linux nicht ausgeführt (nur die Netzwerk-Auswahl und das Wiederherstellungsskript sind getestet); die `.bat`-Dateien selbst sind ungetestet.
- Keine echten Smartphones/Fernseher, kein echtes WLAN, keine Firewall-Prüfung.
