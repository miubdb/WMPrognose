# Update nach dem ersten Praxistest (Reus 65 Mio)

## Was ist neu (Kurzfassung)
Spielregeln: WO ZUR HÖLLE? wertet die **echte Entfernung** (60 s), GLITCH hat **enge Trefferflächen** und der TV zeigt das Suchbild nicht mehr, SETZ AUF MICH zeigt Zähler/Wettübersicht, EINZIGARTIG **sperrt die Auflösung bis zur Prüfung**, DIE VERBINDUNG hat **20 s je Hinweis**, BLIND RANK zeigt die Paarvergleiche und hat eine Sortier-Variante.
Show: **Proberunden** (ungewertet), **Zwischenstände nach Runde 1, nach Runde 3 und vor dem Finale**, ruhige Eröffnung, einheitliche Rundenkarte, **Live-Ranking** (abschaltbar), optionale **Hintergrundmusik** (selbst erzeugt, Standard aus), Paket **„Reus 65 Mio“** mit Sieger **„Reus65Mio-Champion“**, 4 oder 5 gewertete Aufgaben je Spielmodus.

## So aktualisierst du den Windows-Laptop, ohne die Datenbank zu verlieren
Die Datenbank liegt in `data\outplay.db` (außerhalb des Programmcodes, in `.gitignore`). Ein Update ersetzt nur Programmdateien.
1. **Server beenden** (Fenster von `OUTPLAY-STARTEN.bat` schließen).
2. **Sicherung von Hand:** den ganzen Ordner `data` kopieren (z. B. nach `data-sicherung-vor-update`). Zusätzlich liegen automatische Sicherungen in `data\backups`.
3. **Neuen Stand holen** (mit Internet): im Projektordner `git pull origin claude/upbeat-galileo-4el50u` (oder ZIP der Branch entpacken – dann **den Ordner `data` nicht überschreiben/löschen** und die Karte `data\maps\outplay-karte.mbtiles` behalten).
4. **`OUTPLAY-STARTEN.bat`** starten: installiert Abhängigkeiten, baut die Oberfläche neu, startet den Server. Bestehende Räume, Spieler, Punkte und Pakete bleiben erhalten (keine automatische Migration, nichts wird überschrieben). Laufende Räume spielen mit ihrer alten Paketversion weiter; **neue Spielregeln** (Entfernungswertung, Glitch-Ablauf, 20 s …) gelten sofort für alle Räume, weil sie im Server stecken – Fragen und Pakete ändern sich dadurch nicht.
5. **Neues Showpaket bewusst aktivieren:** `/admin` → **Daten** → Karte „Neues Showpaket & Fragenpool verfügbar“ → **Installieren**. Der Server legt davor automatisch eine Voll-Sicherung `data\backups\outplay-vor-installation-….db` an (wird nie rotiert) und ergänzt nur Fehlendes (neue Fragen, Kategorien, Paket **„Reus 65 Mio“**). Vorhandene Fragen, Szenen, Kategorien und die Pakete `standard-2` / `show-1` werden **nicht** verändert.
6. **Branding / Länge einstellen:** `/admin` → Pakete → „Reus 65 Mio“ → Spielregeln: Länge der Show (4 oder 5 Aufgaben), BLIND-RANK-Bedienung, Showtitel, Gewinnerbezeichnung → **Prüfen & Veröffentlichen** (erzeugt eine neue Paketversion; laufende Räume bleiben unverändert).
7. Showmaster: `/host` wählt automatisch das neueste Showpaket („Reus 65 Mio“); der Klassische Modus bleibt als Fallback wählbar.

**Zurück zum alten Stand:** Server beenden, Ordner `data` aus der Sicherung zurückkopieren (oder `OUTPLAY-WIEDERHERSTELLEN.bat` mit einer Sicherung aus `data\backups`).

## Karte Europa/Welt: Machbarkeit (nicht ausgeführt)
Bisher: Welt Zoom 0–5, Europa 6–7, Deutschland 8–12 (≈ 312 MB). Das Skript `scripts/build-maps.mjs` kennt jetzt zwei **ergänzende** Optionen:
- `--europe-maxzoom 8` – ganz Europa bis Zoom 8: ≈ 2.650 zusätzliche Kacheln, geschätzt **+50–60 MB** (Schätzung aus Kachelzahl × typische Kachelgröße, nicht gemessen).
- `--world-maxzoom 6` – ganze Welt bis Zoom 6: 4.096 Kacheln, überwiegend Ozean, geschätzt **+30–40 MB** (nicht gemessen).
Aufruf z. B. `node scripts/build-maps.mjs --europe-maxzoom 8` (mit Internet). Die vorhandene Datei wird **ergänzt**, bereits geladene Kacheln werden übersprungen, die alte Datei bleibt jederzeit nutzbar. Zoom 9 für Europa (≈ 10.600 Kacheln, geschätzt > 200 MB) wird **nicht** empfohlen (Dateigröße, Smartphone-Speicher und -Rechenleistung). **Ich habe die Karte nicht neu geladen und nichts davon auf Smartphones gemessen** – bitte vor dem Spieleabend nicht mehr umbauen; die Option ist für danach gedacht.

## Finalmoment – zwei Vorschläge (nicht implementiert)
1. **„Schwarmwette“ (Blind-Konsens):** Eine Frage mit fünf Antwortoptionen; jeder wählt geheim eine – und setzt seine Punkte darauf, dass **die meisten anderen dieselbe** Option wählen. Gewertet wird, wie groß die Gruppe hinter der eigenen Wahl ist; wer allein steht, verliert. Technisch einfach (eine Auswahl + Einsatz je Spieler, Auswertung durch Zählen), bewusst kein Wissens-, sondern ein Menschenkenntnis-Spiel.
2. **„Der Maulwurf“:** Alle bekommen dieselbe Kategorie („Nenne einen …“) – **ein** (vom Server zufällig bestimmter, geheimer) Spieler bekommt eine leicht abweichende Kategorie. Alle tippen eine Antwort, dann stimmen alle ab, wer der Maulwurf war. Punkte für richtig Enttarnte und für den unentdeckten Maulwurf. Technisch machbar (zwei Aufgabenvarianten, eine Abstimmung), ohne Geschicklichkeitsanteil.
