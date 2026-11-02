# Annahmen und Lücken zur Spezifikation

Der Auftrag ergänzt „die bisherige Projektspezifikation“ um verbindliche Anforderungen. **Die bisherige Spezifikation lag dieser Umsetzung nicht vor** (weder im Repository noch im Auftrag). Der Funktionsumfang wurde deshalb aus den verbindlichen Anforderungen, den Zielen und den dort genannten Funktionen abgeleitet:

| Aus dem Auftrag | Umsetzung |
|---|---|
| Trainingsplanung, Freundschaftsspiel, Schwerpunktverschiebung | Phasenmodell + regelbasierter Planer |
| FTP, Ausgangs-FTP 236 W | FTP-Verwaltung, Zonen, wattbasierte Einheiten, TSS/CTL/ATL/TSB |
| Gewicht 91,45 → 86 kg | Gewichtslog, Trend, Zielfortschritt, Kaloriendefizit |
| KI-Ernährungserkennung, Nährwerte als Schätzung, manuelle Korrektur | Foto-Analyse mit Schätzungs-Kennzeichnung und Bearbeitung |
| KI-Coach (Trainingsdaten, Verfügbarkeit, Ziele, Regeneration) | Coach mit Datenkontext, Tool-Use, Bestätigungspflicht |
| Eigene Torwarttrainings, Übungen, Spielanalysen | Modul „Torwart“ |
| Integrationen / Dateiimport | FIT/TCX/GPX/Apple-Health/CSV-Import, Open Food Facts |
| Ausgenommen: Körperfortschrittsfotos, vorgefertigte Übungsbibliothek | nicht umgesetzt (bewusst) |

**Eigene Festlegungen (bitte gegen die Original-Spezifikation prüfen):**

- Technologie: Next.js + PostgreSQL mit eigener Authentifizierung (statt Supabase-Auth), weil eine lokal und in CI nachweisbar funktionierende Lösung gefordert war. Ein Supabase-Postgres als Datenbank funktioniert über den Connection-String.
- Sprache der Oberfläche: Deutsch; Zeitzone fest `Europe/Berlin`.
- Phasenlängen: Grundlagen bis 8 Wochen vor der Spielwoche, Aufbau 4 Wochen, Fußballspezifisch 4 Wochen, Spielwoche, Hauptphase, Finalwoche; jede vierte Woche Entlastung. Das sind Trainingsprinzipien, keine individuell abgeleitete Prognose.
- Kalorienziel nach Mifflin-St-Jeor + Alltagsfaktor + Trainingskalorien − Defizit (max. 750 kcal bzw. 25 % des Verbrauchs, nie unter Grundumsatz); Eiweiß 2,0 g/kg im Defizit. Richtwerte, keine medizinische Beratung.
- Tagesform-Score: gewichtete Heuristik (siehe `src/domain/readiness.ts`), keine validierte Skala.
- Funktionen, die in der Original-Spezifikation stehen könnten und hier **nicht** vorkommen: Push-Benachrichtigungen/Erinnerungen, Offline-Betrieb, Teamfunktionen, Videoanalyse, Wetter, Schlaf-Tracker-Anbindungen. Falls sie vereinbart waren, sind sie *nicht umgesetzt*.
