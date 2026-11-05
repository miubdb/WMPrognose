# Karte „WO ZUR HÖLLE?“ (OpenStreetMap, offline)

**Technik:** MapLibre GL (Vektorkarte) mit OpenStreetMap-Daten. Gleiche Karte im Admin, auf den Handys und auf dem Fernseher. Pin-Koordinaten und Entfernungen sind unverändert (Breite/Länge, Haversine auf dem Server).

## Einmalig vorbereiten (mit Internet, am besten vor Samstag zu Hause)
`OUTPLAY-KARTE-LADEN.bat` doppelklicken (oder `node scripts/build-maps.mjs`). Es entsteht `data/maps/outplay-karte.mbtiles`.
- Dauer ca. 5–40 Minuten (je nach Leitung), Abbruch erlaubt, erneuter Start setzt fort.
- Danach läuft alles **ohne Internet**: der OUTPLAY-Server liefert die Kacheln aus dieser Datei über das lokale WLAN.
- Datei fehlt oder WebGL fehlt am Gerät → automatisch die einfache SVG-Karte (Notbetrieb, Spiel läuft weiter).

## Inhalt und Größe (gemessen)
| Bereich | Zoom | Detail |
|---|---|---|
| Welt | 0–5 | Länder, Meere, Großstädte |
| Europa | 6–7 | Autobahnen, Hauptstraßen, Städte |
| Deutschland | 8–12 | Straßen inkl. Nebenstraßen, Bahn, Wälder/Parks, Siedlungsflächen, Flüsse/Seen, Landes- und Kreisgrenzen, Städte/Dörfer/Ortsteile |

Darüber hinaus (bis Zoom ~17) werden die Zoom-12-Daten weiter vergrößert (Linien bleiben scharf, keine Gebäude/Fußwege).
Gesamt: **15.762 Kacheln, ca. 312 MB** (Datei ca. 350 MB), Ø 15 KB je Kachel auf Zoom 12, maximal ca. 265 KB.

## Online-Admin (Vercel)
Der Online-Admin liefert Kacheln über `/api/maptiles/…` serverseitig aus dem öffentlichen Protomaps-Tagesstand (kein CORS-Problem, keine Datei im Deployment). Quelle änderbar über die Umgebungsvariable `MAP_PMTILES_URL`. Nur für den Admin gedacht; die Show nutzt die lokale Datei.

## Lizenzen
Kartendaten © OpenStreetMap-Mitwirkende (ODbL), aufbereitet von Protomaps; Schriften „Noto Sans“ (SIL OFL). Der Hinweis steht auf der Karte.
