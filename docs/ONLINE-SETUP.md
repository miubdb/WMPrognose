# Online-Admin auf Vercel einrichten (kostenlos)

**Was online läuft:** nur der Admin-Bereich (`/admin`) als Vercel-Function. **Nicht online:** Showmaster/TV/Spieler (WebSockets) – die Show läuft am Samstag lokal.

**Wo werden die Daten gespeichert?** Serverseitig in einem **privaten Vercel-Blob-Speicher** (eine SQLite-Datei, `outplay/content.db`). Nach dem Neuladen, nach neuen Deployments und auf jedem Gerät sind sie da. Es gibt keinen flüchtigen Schein-Speicher: Ist der Speicher nicht verbunden, meldet der Admin „Einrichtung nötig“ und speichert nichts.

## Einmalige Einrichtung im Vercel-Dashboard (ca. 3 Minuten, Handy genügt)
Projekt **wm-prognose-echt** (Team „Michael's projects“):
1. **Storage** → *Create* → **Blob** → Name z. B. `outplay-content` → Zugriff **Private** (wichtig!) → *Connect to Project* `wm-prognose-echt`, alle Umgebungen. Das setzt `BLOB_READ_WRITE_TOKEN` automatisch.
2. **Settings → Environment Variables** → `ADMIN_PASSWORD` = ein langes, eigenes Passwort (≥ 12 Zeichen), Typ *Sensitive*, für **Preview** und **Production**.
3. **Deployments** → neuestes Deployment der Branch `claude/upbeat-galileo-4el50u` → *Redeploy* (Umgebungsvariablen gelten erst für neue Deployments).
4. Adresse öffnen: `https://wm-prognose-echt-git-claude-u-a85511-michaels-projects-788f49ad.vercel.app/admin` (Branch-URL). Das Projekt hat *Vercel Authentication* aktiv: einmal mit deinem Vercel-Konto anmelden – das ist eine zusätzliche Schutzschicht vor dem OUTPLAY-Login.

Die alte Standard-Branch (`claude/fifa-wc-prediction-model-IJzy3`, WM-Prognose) wird **nicht** verändert; die Production-Domain `wm-prognose-echt.vercel.app` zeigt weiterhin sie. OUTPLAY läuft nur als Preview-Deployment der OUTPLAY-Branch.

## Kosten und Limits (bitte im Dashboard gegenprüfen)
- Vercel **Hobby**: kostenlos, kein automatischer Wechsel in einen bezahlten Tarif. Functions/Bandbreite haben feste Kontingente; bei Überschreitung wird gedrosselt/pausiert, nicht abgerechnet.
- Vercel **Blob** im Hobby-Tarif: enthält ein kostenloses Monatskontingent für Speicher und Operationen (Größenordnung 1 GB Speicher, einige tausend Operationen/Monat – genaue, aktuelle Werte unter *Settings → Usage / Pricing* nachlesen). Die OUTPLAY-Datenbank ist < 1 MB. Jede Admin-Anfrage verursacht höchstens eine Prüf-Operation (Ergebnis wird 2,5 s zwischengespeichert), jedes Speichern eine Schreib-Operation; für zwei Abende Vorbereitung ist das weit unter dem Kontingent. Falls dein Konto kein Blob-Kontingent im Gratis-Tarif hat, zeigt das Dashboard dies beim Erstellen an – dann **nicht** bestätigen.
- Es wird keine Kreditkarte benötigt, solange du keinen bezahlten Tarif aktivierst.

## Gleichzeitige Bearbeitung
Gespeichert wird mit optimistischer Sperre (ETag). Bearbeitest du gleichzeitig auf zwei Geräten, erscheint „Konflikt – Seite neu laden“; nichts wird stillschweigend überschrieben.

## Sichern
Admin → Import/Export → **📤 Spieleabend exportieren**, „Alles (Inhalte)“ und „Voll-Backup“ (vertraulich). Mach vor dem Samstag mindestens einen Export und lege ihn zusätzlich außerhalb von Vercel ab.

## Technik (für Entwickler)
`vercel.json` (Framework `null`, Build `npm run build` → `dist`, SPA-Rewrites) · Function `api/index.js` (gebündelt aus `api-src/handler.ts` via `npm run bundle:api`, **eingecheckt**; ein Test prüft, dass sie aktuell ist) · Adapter `server/vercel.ts` · gleicher Admin-Code wie lokal.
