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

---

# Praxistest 2 – Änderungen (Spielbalance, Bedienung, Reus-Feinschliff)

## Neues Paket (nicht-destruktiv): „Reus 65 Mio“ Version 2 (`show-3`) + optional `show-2k`
Das bereits installierte Paket `show-2` bleibt **unverändert**. Neu ergänzt (Admin → Daten → Installieren, mit automatischer Vor-Sicherung):
- **`show-3` „Reus 65 Mio“** – wählt `/host` automatisch vor. Enthält: BLIND RANK standardmäßig **alle Begriffe sehen & sortieren** (je 50 Punkte pro exakt richtiger Position, max. 250), SETZ AUF MICH mit **Einsätzen 0/50/100 + 150 Punkte Bonus** für die beste Schätzung, Proberunden ohne „So funktioniert’s“-Nachtext, Flagge-Probe mit **vollständiger Antwortliste**, Kickbase-Note („Dein persönlicher Kickbase-Abend“, Zwischenstände heißen „Marktwert-Update“, Siegerzeile „Marktwert: unbezahlbar – die 65 Mio. sind verdient“, Sieger „Reus65Mio-Champion“).
- **`show-2k` „Reus 65 Mio · Finale KICKBASE-KONSENS“** – identisch, aber mit dem Gruppenspiel **KICKBASE-KONSENS** statt FINAL LOCK (siehe unten). **Nicht** vorausgewählt; FINAL LOCK (`show-3`) bleibt der bewährte Standard/Fallback. Im Host-Login wählst du es bewusst im Paket-Dropdown.
- Du kannst `show-2` im Admin archivieren (Pakete → ⋯), damit „Reus 65 Mio“ nicht doppelt erscheint.
Alle Einstellungen (Einsatzstufen, Bonus, BLIND-RANK-Bedienung, Länge, Titelzeilen) sind im Admin unter Pakete → Spielregeln änderbar und gelten nach „Prüfen & Veröffentlichen“ (neue Paketversion).

## Regeln, die **sofort für alle Pakete/Räume** gelten (Serverlogik)
- **GLITCH:** nur Treffer = volle Aufgabenpunkte, sonst/keine Abgabe = 0; keine Trostpunkte. Chat-Trefferzone: nur das geänderte Wort, Zone 144×36 Einheiten + 35 Einheiten Fingertoleranz (im Browser auf 7 Formaten mit der echten SVG-Textposition geprüft).
- **EINZIGARTIG:** mehrfach genannte gültige Antworten = **0 Punkte**; der Showmaster sieht jede eingehende Antwort sofort (nur Host-Ansicht); bei Fragen mit gesetztem Häkchen „Antwortliste vollständig“ wird Unbekanntes **automatisch ungültig** (korrigierbar), sonst weiter manuelle Prüfung.
- **MATCHMAKER / alle Modi:** In jeder Auflösung stehen alle Spieler – wer nichts abgegeben hat, erscheint als „Nicht abgegeben · 0 Punkte“.
- **DIE VERBINDUNG:** ein Abgabebutton ohne Zweitbestätigung; TV zeigt „x von y Antworten abgegeben“.
Fragen aus bereits installierten Paketen behalten ihre gespeicherten Daten. Das Häkchen „Antwortliste vollständig“ ist nur bei den **neuen** Proben von `show-3` gesetzt; bei eigenen Fragen im Admin setzen (Frage bearbeiten → Weitere Einstellungen).

## SETZ AUF MICH – Balance (Simulation)
Simuliert (4 000 Runden je Fall, Schätzer mit steigender Streuung, Wetten auf den Median-Tipp):
| Spieler | Ø Punkte pro Aufgabe, bester → schwächster Schätzer | alte Regel (Einsätze 0/100/200, kein Bonus) |
|---|---|---|
| 4 | 291 / 163 / 123 / 79 | 200 / 104 / 89 / 39 |
| 7 | 284 / 173 / 147 / 102 / 98 / 67 / 72 | 201 / 108 / 112 / 51 / 69 / 20 / 45 |
Der Bonus (150) ist größer als der höchste Einsatz (100): Wer am besten schätzt, gewinnt die Aufgabe – auch gegen eine erfolgreiche Wette. Der Wettgewinn bleibt reine Umverteilung (nie unter 0). Runde R5 (4 Aufgaben): max. ≈ 4 × (300 + 150) = 1 800 Punkte aus Schätzungen. Im Admin zeigt die Paketregel-Karte „Punktebalance SETZ AUF MICH“ die gewählten Werte.

## KICKBASE-KONSENS (Finale-Prototyp, `show-2k`)
Drei Gruppenfragen (im Admin als Frage-Modus „KICKBASE-KONSENS (nur Finale)“ bearbeitbar, Standard 600 Punkte je richtiger Wahl, 45 s): „Wer von uns würde 65 Millionen für Marco Reus ausgeben?“ – „… im Kickbase-Spiel zuerst sein ganzes Budget auf einen einzigen Spieler setzen?“ – „… einen Spieler nur kaufen, weil ihm der Name gefällt?“ Jeder wählt **geheim** einen Mitspieler (nicht sich selbst, ab 3 Spielern), nach Ablauf enthüllt der TV die Stimmen als Balken mit Wählern; Punkte für alle, die die **meisten Stimmen** getroffen haben – bei Gleichstand der häufigsten Wahlen werden alle anerkannt. Die Rangliste bleibt im Finale verborgen, die Siegerehrung läuft wie gewohnt. Es zählt nicht zu den sieben Modi und braucht kein Kickbase-Wissen.

## Musik (geprüft, nicht neu entwickelt)
Die vorhandene Hintergrundmusik ist im Browser getestet: startet nicht von selbst, läuft nach dem Einschalten im Showmaster-Pult („🎵 Musik an“) auf dem TV, sobald die TV-Seite **einmal angeklickt** wurde (Browser-Audiofreigabe), nur eine Instanz, Lautstärkeregler, stumm bei „Ton aus“. **Wichtig:** „🎵 Musik an“ im Pult einschalten und die TV-Seite einmal anklicken.

## Zurückgestellt
- **Eigenes Foto statt Avatar:** nicht umgesetzt (Foto-Daten würden in jedem Live-Zustand an alle Geräte gehen – Risiko für den Spieleabend). Umgesetzt ist nur die neue Reihenfolge im Avatar-Editor: zuerst **① Farben**, dann **② Gesicht**, dann Frisur/Kopf/Trikot/Extras.
- Keine Kartenänderung, keine Neu-Downloads.


---

# Best of 42 installieren (ohne Datenverlust)
1. Server beenden, Ordner `data` kopieren (Sicherung). `git pull origin claude/upbeat-galileo-4el50u`, `OUTPLAY-STARTEN.bat` – nichts wird dabei verändert oder automatisch installiert (per Test auf einer bestehenden DB nachgewiesen).
2. `/admin` → **Daten** → Karte „Neues Showpaket & Fragenpool verfügbar“ → **Installieren**. Der Server legt zuerst `data\backups\outplay-vor-installation-….db` an und ergänzt dann nur Fehlendes: 30 neue Fragen, 4 neue GLITCH-Szenen, 8 Kategorien und die Pakete **`show-4` „Reus 65 Mio – Best of 42“** und **`show-3z`** (Finale KICKBASE-KONSENS). Bestehende Fragen, Szenen, Kategorien und alle Paketversionen (`show-1`, `show-2`, `show-3`, `show-2k`, `standard-2`) bleiben byte-identisch.
3. Admin → Pakete → „Best of 42“ → **Prüfen**: Die Warnungen zeigen die offenen Redaktionspunkte (siehe `docs/BESTOF42-REDAKTION.md`). Nicht freigegebene Aufgaben (v. a. C09 BVB-Ablösen, T05 Debütalter) bitte klären oder ersetzen.
4. `/host` wählt automatisch das neueste Paket (Best of 42). **Sicherer Fallback:** `show-3` „Reus 65 Mio“ (31 Aufgaben, FINAL LOCK) bzw. `show-2k` – jederzeit im Paket-Dropdown wählbar.
5. Die Datei `data\maps\outplay-karte.mbtiles` wird nie angefasst.
