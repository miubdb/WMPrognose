# Feature-Matrix – Road to Matchday v1.0

**Legende:** ✅ umgesetzt und im beschriebenen Umfang getestet · ⚠️ umgesetzt, aber nicht vollständig verifiziert (siehe Einschränkung) · ❌ nicht umgesetzt

Testverweise: **U** = Unit (`tests/unit`), **I** = Integration (`tests/integration`), **E** = E2E (`e2e/journey.spec.ts`). Gesamtergebnis am Ende des Dokuments.

> Die ursprüngliche Projektspezifikation lag nicht vor; der Umfang wurde aus den verbindlichen Anforderungen abgeleitet (`docs/ANNAHMEN.md`). Funktionen, die dort ggf. vereinbart waren und hier fehlen, sind unter „Nicht umgesetzt“ aufgeführt.

## Umgesetzte Funktionen

| ID | Funktion | Status | Abnahmekriterien | Test | Bekannte Einschränkungen |
|---|---|---|---|---|---|
| F01 | Konto, Anmeldung, Abmeldung, Passwort ändern | ✅ | Registrierung (Passwort ≥ 10 Zeichen), Login, Logout, Passwortwechsel beendet andere Sitzungen; Passwort nur als scrypt-Hash, Sitzungs-Token nur als HMAC in der DB; Brute-Force-Begrenzung; Registrierung nach dem ersten Konto geschlossen (außer `ALLOW_REGISTRATION=true`); geschützte Routen liefern 401, Seiten leiten auf Login | I `auth.test.ts` (9), E (Login/Redirect/Logout) | Kein „Passwort vergessen“ (kein E-Mail-Versand eingerichtet); Konto kann per Brute-Force 15 min gesperrt werden |
| F02 | Onboarding mit vereinbarten Zielen | ✅ | Felder vorbelegt mit 02.11.2026 / 06.02.2027 / 07.03.2027 / 91,45 kg → 86 kg / FTP 236 W; erst „Weiter“ speichert; legt Start-Gewicht und Start-FTP als Messwerte an; Validierung der Meilenstein-Reihenfolge | I `flows.test.ts`, E (prüft Vorbelegung) | – |
| F03 | Profil bearbeiten (Ziele, Körperdaten) | ✅ | Änderungen persistent; bestehende Messwerte bleiben | I, E | Plan muss nach Änderung der Termine manuell neu erzeugt werden |
| F04 | Verfügbarkeit, Ausnahmen (Urlaub), Mannschaftstraining | ✅ | 7 Wochentage speichern; Ausnahmen je Datum (CRUD); Plan nutzt sie; Mannschaftstraining als fester Zusatztermin | I, U (Planer), E | – |
| F05 | Termine (weitere Spiele/Tests) | ✅ | CRUD; Spiele beeinflussen Planung | I (CRUD) | Termine werden im Plan nur als Spieltag berücksichtigt, wenn Art = Spiel/Freundschaftsspiel/Hauptziel |
| F06 | Phasenmodell, Countdown, Schwerpunkt | ✅ | Phasen wochenweise (Grundlagen → Aufbau → Fußballspezifisch → Spielwoche → Hauptphase → Finalwoche); Anteil fußballspezifischer Inhalte steigt monoton bis zum Spiel; Countdown 96/125 Tage zum 02.11.2026 | U `dates-phases`, `planner`; E (Dashboard, Schwerpunkt-Vergleich Woche 2 vs. 11) | Phasenlängen sind Trainingsprinzipien, nicht individuell berechnet |
| F07 | Plan-Generator (regelbasiert) | ✅ | Berücksichtigt Verfügbarkeit, Ausnahmen, Mannschaftstraining, Spieltage (kein Hartes am Vortag/Nachtag, ≤ Intensität 2 zwei Tage vorher, nie zwei harte Tage in Folge), Entlastungswoche (jede 4.), FTP-Tests (Woche 6 und 11), FTP-basierte Wattbereiche, Spielwoche mit reduziertem Umfang; deterministisch; nicht platzierbare Einheiten werden gemeldet statt verschwiegen; erneutes Erzeugen ersetzt nur geplante Planer-Einheiten | U `planner` (17), I `flows` | Vorlagen sind generisch (keine individuelle Optimierung); bei knapper Verfügbarkeit bleiben Einheiten unverplant (Meldung) |
| F08 | Plan bearbeiten (CRUD, erledigt/übersprungen) | ✅ | Eigene Einheiten anlegen/ändern/löschen; Status ändern; Detailansicht mit Wattblöcken/Übungen | I, E | – |
| F09 | Trainingslog (CRUD) | ✅ | Anlegen/Ändern/Löschen; Verknüpfung mit Planeinheit setzt diese auf „erledigt“ (Löschen setzt zurück); Fremd-Einheiten nicht verknüpfbar | I (50 CRUD-Tests + Logik), E | – |
| F10 | Belastung (TSS, CTL/ATL/TSB) | ✅ | TSS serverseitig: Leistung+FTP des Datums (exakt) → sonst RPE (Schätzung, so gekennzeichnet) → sonst *kein* Wert (nichts erfunden); PMC-Diagramm | U `cycling-load`, I | CTL/ATL starten bei 0 (Vorgeschichte unbekannt); ohne NP wird Ø-Leistung genutzt (unterschätzt variable Einheiten) |
| F11 | FTP-Verwaltung, Zonen, Testrechner | ✅ | Historie (CRUD), Zonen nach Coggan, 20-min (×0,95)/Ramp (×0,75), FTP wirkt auf spätere Trainings | U, I, E | – |
| F12 | Gewicht (CRUD, Trend, Zielfortschritt) | ✅ | Ein Eintrag je Tag; EMA-Trend; Wochenrate nur bei ≥ 3 Punkten über ≥ 14 Tage; Fortschritt/Prognose als „flexible Orientierung“ | U, I, E | Prognose ist lineare Extrapolation |
| F13 | Ernährung: Tageslog, eigene Lebensmittel, Zielbilanz | ✅ | Einträge CRUD nach Mahlzeit; Lebensmittel (je 100 g) CRUD und Mengenrechner; Kalorien-/Makroziel aus Profil (Mifflin-St-Jeor, Defizit zum Zielgewicht, Warnungen); fehlende Profildaten → ehrlicher Hinweis statt Wert | U `body-nutrition`, I, E | Richtwerte, keine medizinische Beratung |
| F14 | Barcode → Nährwerte (Open Food Facts) | ✅ | Eingabe der Nummer, Abruf der offiziellen API, Übernahme in Tag/Lebensmittel; Fehler (nicht gefunden/keine Nährwerte/offline) verständlich | U (simulierte Antworten), **Live-Abruf am 02.11.2026 erfolgreich**, E (UI mit Stub) | Kein Kamera-Scan (Safari/iOS bietet keine BarcodeDetector-API); Community-Daten ohne Gewähr |
| F15 | KI-Ernährungserkennung (Foto) | ⚠️ | Schätzungen als „Schätzung“ + Sicherheit gekennzeichnet; unplausible Makros markiert; absurde Werte verworfen; vollständig editierbar/entfernbar; Speichern als `ai_estimate` (bleibt Schätzung; Markierung nur durch ausdrückliche Bestätigung entfernbar); Foto wird nicht gespeichert; ohne API-Schlüssel ehrliche Meldung | I `ai.test.ts` (Ersatzclient), I `ai-http.test.ts` (echter SDK-Pfad gegen lokalen HTTP-Server: Bild-/Schema-Parameter), E (UI mit festem API-Stub, „nicht eingerichtet“-Fall) | **Nicht live gegen die Anthropic-API getestet** (kein Schlüssel); Qualität der Schätzung und Akzeptanz des Schemas durch den echten Server ungeprüft |
| F16 | Erholung: täglicher Check-in, Score | ✅ | CRUD je Tag; Score 0–100 aus Schlaf/Muskelkater/Energie/Stimmung/Stress + Ruhepuls/HRV vs. 14-Tage-Basis; < 3 Faktoren → kein Score | U, I, E | Heuristik, keine validierte Skala |
| F17 | Torwart: Übungen, Trainings, Spielanalysen, Statistik | ✅ | Eigene Übungen CRUD; Trainings mit Übungsliste (persistiert); Spielanalyse (Quoten, Gegentor-Analyse, Konsistenzprüfung Paraden ≤ Schüsse); Gesamtstatistik (Fangquote, Gegentore/90, Flanken, Pässe, zu null) | U `gk`, I, E | Keine vorgefertigte Übungsbibliothek (ausgenommen) |
| F18 | Regelbasierte Entlastungsvorschläge | ✅ | Bei 2 Check-ins < 45 oder TSB < −30 und harter Einheit in 3 Tagen → Vorschlag (pending); Übernahme erst nach Bestätigung; Ablehnen ändert nichts | U `proposals-rules`, I, E | Einfache Regeln, bewusst konservativ |
| F19 | KI-Coach | ⚠️ | Kontext nur aus echten Daten (Ziele, Phase, Verfügbarkeit, Training, Belastung, Gewicht, FTP, Tagesform, Ernährung, Plan mit IDs, Datenqualität); System-Prompt verbietet Erfinden; Verlauf gespeichert; Tageslimit; Refusal/Fehler ehrlich; ohne Schlüssel deaktiviert mit Erklärung | I `ai.test.ts` (Ersatzclient: Anfrageinhalt, Mandantentrennung, Fehlerfälle), I `ai-http.test.ts` (echter SDK-Pfad: Endpunkt, Bearer-Header, API-Version 2026-10-21, Tool-Schema `strict`, keine verbotenen Parameter, Fehlerabbildung 401/429/400/500), E (nicht eingerichtet) | **Nicht live getestet**; Chat-UI nur im „nicht eingerichtet“-Zustand per E2E geprüft; Prompt-Injection über Freitexte der Nutzerdaten durch Bestätigungspflicht + Validierung begrenzt, nicht ausgeschlossen |
| F20 | Bestätigungspflicht für KI-Planänderungen | ✅ | KI-Aufrufe speichern nur `pending`-Vorschläge; Vorschläge werden gegen den echten Plan validiert (existierende IDs, nur Zukunft/bis Hauptziel, keine erledigten/Spieltage); Übernahme nur durch Nutzeraktion; veraltete Vorschläge werden abgelehnt; fremde Vorschläge unerreichbar | I `flows`, `ai` (u. a. „gespeichert, nicht angewendet“), E (Regelvorschlag, gleicher Mechanismus) | – |
| F21 | Import FIT / TCX / GPX (auch `.gz`) | ✅ | Garmin-SDK-Dekodierung inkl. Prüfsumme; NP aus 1-Hz-Daten; Vorschau mit Typ/Titel/RPE; Duplikaterkennung; kaputte Dateien → verständlicher Fehler | U (FIT mit offiziellem Encoder, TCX, GPX), I, E (FIT, FIT.gz, Duplikat, kaputt) | Echte Geräte-Exporte nicht getestet; TCX/GPX per Regex geparst |
| F22 | Import Apple Health (`export.xml`) | ✅ | Gewicht (lb→kg, letzter Wert/Tag), Körperfett, Ruhepuls, Workouts; Streaming in Blöcken | U (inkl. Chunk-Grenzen), E | Manuell, kein Auto-Sync; ZIP muss entpackt werden; keine Leistungsdaten in Apple-Workouts |
| F23 | Import Gewichts-CSV | ✅ | Trennzeichen-Erkennung, Spaltenzuordnung, Dezimalkomma, `TT.MM.JJJJ`/ISO; ungültige Zeilen werden gezählt und übersprungen | U, E | Mehrdeutige US-Datumsformate werden bewusst abgelehnt |
| F24 | Datenschutz: Export, Konto löschen | ✅ | JSON-Export aller eigenen Daten (ohne Hashes/fremde Daten); Löschen verlangt Passwort und entfernt alles (CASCADE) | I, E | – |
| F25 | iPhone-Optimierung | ⚠️ | Viewport inkl. Safe-Area, 44-px-Ziele, 16-px-Eingaben, Bottom-Navigation, Bottom-Sheets, kein horizontales Scrollen, Manifest + Icons (zum Home-Bildschirm) | E (iPhone-13-Emulation in Chromium) | **Kein echter Safari-/iPhone-Test**; kein Service Worker → kein Offline-Betrieb |
| F26 | Sicherheit & sichere DB-Zugriffe | ✅ | Parametrisierte Queries; `user_id`-Scoping aller Ressourcen; strikte Zod-Schemas (keine Mass-Assignment); CSRF (Origin/Fetch-Metadata); CSP und Security-Header; RLS auf allen Tabellen; HttpOnly/SameSite/Secure-Cookies; `npm audit` ohne Funde | I (Isolation, Injection-Versuch, CSRF, RLS), `npm audit --omit=dev` = 0 | CSP nutzt `'unsafe-inline'` (Next.js ohne Nonce); App-Rolle umgeht RLS (Schutz in der Anwendungsschicht) |
| F27 | Fehlerbehandlung | ✅ | Einheitliche JSON-Fehler mit deutschen Meldungen und Feldbezug; DB-Fehler gemappt; keine internen Details im 500; Netzwerkfehler im UI verständlich | I, E | – |

## Nicht umgesetzt

| ID | Funktion | Status | Begründung |
|---|---|---|---|
| N01 | Strava-API-Anbindung | ❌ (bewusst) | API-Bedingungen verbieten Nutzung der Daten in KI-Systemen; Ersatz: Datei-Import (`docs/INTEGRATIONEN.md`) |
| N02 | Garmin-Connect-Direktanbindung | ❌ | API nur für Geschäftspartner, Freischaltung nicht verifizierbar; Ersatz: FIT-Import |
| N03 | Apple-Health-Direktanbindung | ❌ | Keine Web-API; Ersatz: `export.xml`-Import |
| N04 | Zwift/Wahoo/TrainerRoad/Intervals.icu/Waagen-APIs | ❌ | Nicht verifizierbar; Ersatz: FIT-/CSV-Import |
| N05 | Körperfortschrittsfotos | ❌ (ausgenommen) | Laut Auftrag nicht Teil von v1.0 |
| N06 | Vorgefertigte Torwart-Übungsbibliothek | ❌ (ausgenommen) | Laut Auftrag nicht Teil von v1.0 |
| N07 | Push-Benachrichtigungen / Erinnerungen | ❌ | Nicht im Auftrag erkennbar; kein Service Worker |
| N08 | Offline-Betrieb | ❌ | Kein Service Worker |
| N09 | „Passwort vergessen“ (E-Mail) | ❌ | Kein E-Mail-Versand eingerichtet; Passwort-Reset nur über Datenbankzugriff |
| N10 | Weitere Sprachen | ❌ | Oberfläche nur Deutsch |

## Gesamtstatus Version 1.0

Alle im Auftrag genannten, realisierbaren Funktionen sind implementiert. **Als vollständig abgenommen gelten sie nicht:** F15 und F19 (KI) sind ohne API-Schlüssel nicht live verifiziert, F25 ist nicht auf echter Hardware geprüft, und die Importe wurden nicht mit echten Geräte-Exporten geprüft (siehe `docs/TESTS.md`, Abschnitt „Nicht verifiziert“). Diese Prüfungen sind vor der produktiven Nutzung nachzuholen.

## Testergebnis

Letzter vollständiger Lauf (02.11.2026, Node 22, PostgreSQL 16, Chromium/Playwright 1.63):

| Prüfung | Ergebnis |
|---|---|
| `npm run typecheck` | fehlerfrei |
| `next build` | erfolgreich |
| `npm audit --omit=dev` | 0 Schwachstellen |
| Unit + Integration (`npm test`) | **186/186 bestanden** in 12 Dateien (barcode 3, body-nutrition 19, cycling-load 15, dates-phases 11, imports 13, planner 17, proposals-rules 9, ai 11, ai-http 4, auth 9, crud 50, flows 25) |
| E2E (`npm run test:e2e`) | **20/20 bestanden** (iPhone-13-Emulation, Chromium) |
| Live-Abruf Open Food Facts | erfolgreich (siehe `docs/TESTS.md`) |

Beim Entwickeln wurden durch die Tests u. a. folgende echte Fehler gefunden und behoben: Phasengrenzen mitten in der Woche (Spielwoche wurde als Hauptphase geplant), harte Einheiten über die Wochengrenze (So→Mo), ein HTML5-Validierungsfehler im Verfügbarkeitsformular (Mannschaftstraining-Dauer 90 min war wegen `min=1/step=5` ungültig und blockierte das Speichern), und ein zu aggressiver Gewichtstrend bei kurzen Zeiträumen.
