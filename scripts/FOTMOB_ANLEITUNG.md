# FotMob → Datenbank Import — Schritt-für-Schritt-Anleitung

## Was macht das Skript?

Es geht für alle 48 WM-Teams auf FotMob, liest für jeden Spieler die
**xG per 90 Minuten** und **xGA per 90 Minuten** aus dem Spielerprofil aus
und schreibt die Werte in deine Supabase-Datenbank.

---

## Schritt 1: Cookie aus dem Browser holen

> Das brauchst du nur einmal (Cookie ist mehrere Tage gültig).

1. Öffne **https://www.fotmob.com/de** in Chrome oder Firefox
2. Melde dich an (oder bleib eingeloggt) — du brauchst keinen Premium-Account
3. Drücke **F12** um die DevTools zu öffnen
4. Klicke oben auf den Reiter **"Network"** (Netzwerk)
5. Klicke auf irgendein Land, z.B. auf Deutschland
6. Im Network-Tab erscheinen neue Requests — klicke auf einen der mit
   **`www.fotmob.com/api/`** beginnt (z.B. `teams?id=...`)
7. Auf der rechten Seite erscheinen die Request-Header
8. Suche nach dem Header **`cookie`** — kopiere den kompletten Wert
   (er ist sehr lang, beginnt oft mit `_ga=...` oder ähnlich)
9. Suche nach dem Header **`x-mas`** — kopiere diesen Wert auch

---

## Schritt 2: Werte in das Skript eintragen

Öffne die Datei `scripts/fotmob-import.mjs` in einem Texteditor.

Ersetze ganz oben:
```
const FOTMOB_COOKIE = 'HIER_COOKIE_EINFÜGEN'
const FOTMOB_XMAS   = 'HIER_X_MAS_EINFÜGEN'
```

mit deinen kopierten Werten, z.B.:
```
const FOTMOB_COOKIE = '_ga=GA1.1.xxx; _gid=GA1.1.yyy; ...'
const FOTMOB_XMAS   = 'abc123def456...'
```

---

## Schritt 3: Testlauf (kein Schreiben)

Öffne ein Terminal im WMPrognose-Ordner und führe aus:

```bash
node scripts/fotmob-import.mjs
```

Das Skript zeigt dir was es gefunden hat und was es schreiben *würde*,
ohne die DB zu verändern. Prüfe ob die Spielernamen korrekt gematcht werden.

**Nur ein Team testen:**
```bash
node scripts/fotmob-import.mjs --team germany
node scripts/fotmob-import.mjs --team france
```

---

## Schritt 4: Daten in die DB schreiben

Wenn der Testlauf gut aussieht:

```bash
node scripts/fotmob-import.mjs --write
```

Oder nur ein Team:
```bash
node scripts/fotmob-import.mjs --team germany --write
```

---

## Was passiert genau?

1. Skript lädt die WM 2026 Teams von `fotmob.com/api/leagues?id=77`
2. Für jedes Team lädt es den Kader von `fotmob.com/api/teams?id=TEAMID`
3. Für jeden Spieler lädt es die Stats von `fotmob.com/api/playerData?id=PLAYERID`
4. Es matcht FotMob-Spielernamen mit unseren DB-Spielernamen (Fuzzy Matching)
5. Es schreibt `xg_per90` und `xga_per90` in die `players`-Tabelle

---

## Fehlerbehebung

### "FotMob 403"
→ Cookie ist abgelaufen oder falsch. Schritt 1 wiederholen.

### "kein Mapping" für ein Team
→ Das Land ist in der Fallback-Liste nicht enthalten. Melde mir den FotMob-Teamnamen,
dann trage ich ihn nach.

### Spieler ohne Match
→ Name unterscheidet sich stark (Akzente, Schreibweise). Du kannst den Spielernamen
in der DB anpassen oder ich füge eine Ausnahme ins Skript hinzu.

### FotMob-IDs stimmen nicht (Fallback-Teams)
→ Die Fallback-IDs sind Schätzwerte. Wenn ein Team 0 Spieler zurückgibt,
schaue auf fotmob.com auf die Team-URL — dort steht die echte ID:
`fotmob.com/de/teams/231833/kader/deutschland` → ID = **231833**
Dann trage die korrekte ID in `getFallbackTeams()` im Skript ein.
