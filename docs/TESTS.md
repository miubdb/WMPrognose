# Tests und Verifikation

## Ausführen

```bash
npm test            # Unit + Integration (Vitest) gegen echte PostgreSQL-DB rtm_test
npm run test:e2e    # Playwright, baut die App, startet sie gegen rtm_e2e, iPhone-13-Viewport
```

Voraussetzung: PostgreSQL auf `localhost:5432` mit Rolle `rtm` (Passwort `rtm`, `CREATEDB`) und den Datenbanken `rtm_test`, `rtm_e2e` – oder `TEST_DATABASE_URL` / `E2E_DATABASE_URL` setzen. Die Testdatenbanken werden bei jedem Lauf zurückgesetzt (`DROP SCHEMA public CASCADE`) – **niemals auf eine Produktionsdatenbank zeigen lassen.**

## Ergebnis (Stand: Abschluss dieser Umsetzung)

| Ebene | Umfang | Ergebnis |
|---|---|---|
| Unit | Datum/Phasen, Radsport (Zonen, NP, TSS, FTP), Belastung (PMC, RPE), Gewicht/Trend, Ernährung, Tagesform, Torwart-Statistik, Planer, Vorschläge/Regeln, Importparser (FIT/TCX/GPX/Apple Health/CSV), Barcode-Parser | siehe `Tests` unten |
| Integration | Auth (Hash, Sitzung, Rate-Limit, CSRF, Registrierung), CRUD für alle 12 Ressourcen inkl. Mandantentrennung/Mass-Assignment, Plan-Erzeugung, Bestätigungsworkflow, Importe, Dashboard/Statistik, Export/Löschung, KI-Logik mit Ersatzclient | siehe unten |
| E2E | 20 Szenarien auf iPhone-Viewport (Chromium-Emulation): Registrierung → Onboarding → Plan → Training → Import → Erholung → Bestätigungsworkflow → Gewicht → FTP → Ernährung → Barcode/Foto-UI → Torwart → Einstellungen → Konto löschen | siehe unten |

Aktuelle Zahlen: Unit + Integration **186/186**, E2E **20/20** (Details und Aufschlüsselung in `docs/FEATURE-MATRIX.md`, Abschnitt „Testergebnis“).

## Live-Verifikationen außerhalb der Testsuite

- **Open Food Facts** (`src/server/barcode.ts`): am 02.11.2026 mit echtem Netzwerkzugriff aufgerufen – Barcode `3017620422003` lieferte `Nutella, 539 kcal, E 6,3 g, KH 57,5 g, F 30,9 g` (offizielle API v2). Die Testsuite selbst läuft ohne Netzwerk (simulierte HTTP-Antworten für Fehlerfälle).

## Nicht verifiziert (ehrlich)

- **Anthropic-API live**: In der Entwicklungsumgebung war kein `ANTHROPIC_API_KEY` verfügbar. Coach und Foto-Erkennung sind gegen die dokumentierte SDK-Schnittstelle implementiert; Anwendungslogik (Kontext aus echten Daten, Tool-Schema, Bestätigungspflicht, Fehlerfälle, Refusal, Tageslimit) ist mit einem Ersatzclient getestet; der echte SDK-Pfad (Endpunkt `/v1/messages`, Bearer-Header, API-Version 2026-10-21, `output_config`, strikte Tool-Schemas, Bildblock, Fehlerabbildung) wurde zusätzlich gegen einen lokalen HTTP-Server geprüft (`tests/integration/ai-http.test.ts`). Ob das Modell die Tool-Aufrufe in der Praxis sinnvoll nutzt und die Strukturvorgabe live akzeptiert wird, ist **nicht** nachgewiesen. Erster Schritt nach dem Deployment: im Coach eine Frage stellen und ein Foto analysieren.
- **Echtes iPhone/Safari**: Es wurde nur die Chromium-Emulation mit iPhone-13-Viewport/Touch geprüft (kein horizontales Scrollen, 44-px-Bedienelemente, Safe-Area-CSS, 16-px-Eingaben). Rendering in WebKit/Safari und das Kamera-Verhalten von `capture="environment"` wurden nicht getestet.
- **Importdateien**: FIT-Dateien werden mit dem *offiziellen Garmin-Encoder* erzeugt und mit dem offiziellen Decoder gelesen; TCX/GPX/Apple-Health/CSV mit synthetischen Dateien nach dokumentiertem Format. Echte Exporte von Geräten wurden nicht getestet.
- **Deployment** auf Vercel/Supabase wurde nicht durchgeführt (kein Zugriff). Der Build (`next build`) und der Start im Produktionsmodus gegen PostgreSQL sind getestet.
