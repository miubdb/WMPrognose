# Integrationen – Machbarkeitsprüfung

Stand der Prüfung: 02.11.2026. Grundsatz: Es wird nur eingebaut, was **nachweislich funktioniert** und über eine **offizielle bzw. zuverlässig dokumentierte Schnittstelle** läuft. Wo das nicht möglich ist, gibt es einen **Dateiimport** (in der App unter *Import*).

| Quelle | Direkte Anbindung | Entscheidung | Ersatz in der App |
|---|---|---|---|
| **Open Food Facts** (Barcode → Nährwerte) | Offizielle, offene REST-API v2, ohne Schlüssel | **Umgesetzt und live geprüft** (Abruf eines echten Produkts am 02.11.2026, siehe Testprotokoll) | – |
| **Garmin Connect** (Aktivitäten) | Garmin Connect Developer Program: laut Garmin nur für *Business-Nutzung*, Freischaltung nötig, neue Anträge laut Forenberichten zeitweise pausiert ([Garmin FAQ](https://developer.garmin.com/gc-developer-program/program-faq), [Health API](https://developer.garmin.com/gc-developer-program/health-api/)). Ein „persönlicher API-Schlüssel“ wird nur von einer einzelnen Sekundärquelle berichtet ([5krunner](https://the5krunner.com/2026/10/22/garmin-personal-api/)) – nicht verifiziert. | **Nicht umgesetzt** | **FIT-Import** (Garmin-Geräte/Connect-Export, offizielles Garmin FIT SDK) |
| **Strava** | Offizielle OAuth-API existiert. **Aber:** Die API-Bedingungen (ab 11.11.2024) verbieten die Nutzung von API-Daten in KI-/ML-Systemen ([DC Rainmaker](https://dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html), [Marathon Handbook](https://marathonhandbook.com/strava-api-changes/)). Diese App nutzt Trainingsdaten im KI-Coach → Verstoßrisiko. | **Nicht umgesetzt** (bewusst) | Strava-Export (Original-`.fit.gz`/`.gpx`/`.tcx` aus dem Bulk-Export) per **FIT/GPX/TCX-Import**; `.gz` wird im Browser entpackt. Eigene Daten aus dem Datenexport sind nicht an die API-Bedingungen gebunden. |
| **Apple Health / HealthKit** | Es gibt **keine Web-/Server-API**; HealthKit ist nur auf dem Gerät in nativen Apps lesbar. Es existiert ein manueller Export (`export.xml` im ZIP). | **Direkte Anbindung technisch nicht möglich** | **Apple-Health-Import** (`export.xml`, entpackt): Gewicht, Körperfett, Ruhepuls, Workouts. Streaming-Parser, geprüft mit Datei-Chunks. Einschränkung: manuell, nicht automatisch; ZIP muss vorher entpackt werden. |
| **Zwift / Wahoo / TrainerRoad / Intervals.icu** | Zwift: keine öffentliche API. Übrige: eigene APIs/Verträge, hier nicht verifizierbar (kein Zugang). | **Nicht umgesetzt** | Alle liefern **FIT**-Dateien → FIT-Import. |
| **Waagen (Withings, Garmin Index, …)** | Hersteller-APIs erfordern Entwicklerregistrierung, hier nicht verifizierbar. | **Nicht umgesetzt** | **CSV-Import** mit Spaltenzuordnung (Datum, Gewicht, optional Körperfett; Dezimalkomma, `TT.MM.JJJJ` und ISO-Datum). |
| **Anthropic API** (KI-Coach, Foto-Erkennung) | Offizielle API/SDK `@anthropic-ai/sdk` | **Implementiert, in dieser Umgebung nicht live geprüft** (kein API-Schlüssel verfügbar). Logik ist mit Ersatzclient getestet; siehe Feature-Matrix. | – |

## Einschränkungen der Importe
- **FIT**: Dekodierung mit dem offiziellen Garmin-SDK (Prüfsumme wird geprüft). Normalized Power wird aus den 1-Hz-Leistungswerten selbst berechnet (30-s-Mittel, 4. Potenz); fehlen Leistungsdaten, entsteht kein TSS, sondern der Nutzer kann ein RPE ergänzen.
- **TCX/GPX**: tolerant geparst (Regex statt vollständigem XML-Parser). Leistung wird aus `Watts` (TCX) bzw. `power`/`PowerInWatts` (GPX) gelesen, sofern vorhanden.
- **Apple Health**: Die Datei kann sehr groß sein; sie wird im Browser in Blöcken gelesen und nur extrahierte Werte werden übertragen. Workouts aus Apple Health enthalten keine Leistungsdaten.
- **Duplikate**: Aktivitäten werden über `Quelle + Startzeit + Dauer` dedupliziert (pro Nutzer eindeutig).
- **Zeitzone**: Das lokale Datum einer Aktivität wird in `Europe/Berlin` bestimmt.
