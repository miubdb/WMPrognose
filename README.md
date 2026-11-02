# Road to Matchday

Vorbereitungs-App für die Saison: Trainingsplan (Rad/FTP, Kraft, Lauf, fußballspezifisch, Torwart), Ernährung, Erholung, Gewicht, Spielanalysen und ein KI-Coach – optimiert für das iPhone.

**Zeitliche Ziele (Vorbelegung im Onboarding):** Start 02.11.2026 · erstes Freundschaftsspiel 06.02.2027 · Hauptziel 07.03.2027 · Gewicht 91,45 → 86 kg (flexible Orientierung) · FTP 236 W. Der Plan verschiebt den Schwerpunkt rechtzeitig vor dem ersten Freundschaftsspiel von allgemeiner Fitness auf fußballspezifische Leistungsfähigkeit (Grundlagen → Aufbau → Fußballspezifisch → Spielwoche).

> **Status:** Funktionsumfang, Abnahmekriterien, Testergebnisse und bekannte Einschränkungen stehen in [`docs/FEATURE-MATRIX.md`](docs/FEATURE-MATRIX.md). Was *nicht* umgesetzt oder nicht live verifiziert ist, ist dort ausdrücklich gekennzeichnet. Annahmen zur Spezifikation: [`docs/ANNAHMEN.md`](docs/ANNAHMEN.md). Integrationen: [`docs/INTEGRATIONEN.md`](docs/INTEGRATIONEN.md). Tests: [`docs/TESTS.md`](docs/TESTS.md).

## Technik

- Next.js 16 (App Router, React 19), TypeScript, Tailwind – eine Anwendung für UI und API
- PostgreSQL (`pg`), versionierte SQL-Migrationen in `db/migrations` (laufen beim Start automatisch bzw. mit `npm run db:migrate`)
- Eigene Authentifizierung: E-Mail + Passwort (scrypt), serverseitige Sitzungen (HMAC-gehashte Token, `HttpOnly`/`SameSite=Lax`/`Secure`-Cookie), CSRF-Prüfung per Origin, Login-Begrenzung
- Alle Datenzugriffe laufen serverseitig, parametrisiert und strikt auf `user_id` begrenzt; RLS ist zusätzlich auf allen Tabellen aktiviert (verhindert Zugriff über eine eventuelle Supabase-REST-API)
- KI: `@anthropic-ai/sdk` (Coach mit Tool-Use, Foto-Erkennung mit strukturierter Ausgabe); Planänderungen nur als Vorschlag mit Bestätigung
- Import: Garmin FIT SDK (`@garmin/fitsdk`), TCX/GPX/Apple-Health/CSV-Parser (laufen im Browser)

## Lokal starten

```bash
npm install
cp .env.example .env.local      # DATABASE_URL und SESSION_SECRET setzen
npm run dev                     # http://localhost:3000
```

Eine lokale PostgreSQL-Datenbank genügt (`createdb matchday`, `DATABASE_URL=postgres://user:pw@localhost:5432/matchday`, `DATABASE_SSL=disable`). Das erste registrierte Konto ist offen; danach ist die Registrierung geschlossen, bis `ALLOW_REGISTRATION=true` gesetzt wird.

> **Betriebshinweis:** Auf einer neu veröffentlichten Instanz kann *jede Person* das erste Konto anlegen. Daher direkt nach dem Deployment selbst registrieren.

## Deployment (z. B. Vercel + Supabase-Postgres)

1. Postgres bereitstellen (Supabase: *Project Settings → Database → Connection string*, Pooler/Transaction-Modus verwenden).
2. Umgebungsvariablen setzen: `DATABASE_URL`, `SESSION_SECRET`, optional `ANTHROPIC_API_KEY`, `OFF_USER_AGENT`.
3. Deployen. Die Migrationen werden beim ersten Request ausgeführt (mit Advisory-Lock); alternativ vorab `npm run db:migrate`.
4. Auf dem iPhone in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

Die Datenbankschemata aktivieren Row Level Security ohne Policies. Die App verbindet sich mit der Rolle des Connection-Strings (Besitzer der Tabellen), die RLS umgeht – der Schutz der Mandantentrennung liegt in der Anwendungsschicht (getestet, siehe `tests/integration/crud.test.ts`), RLS schützt gegen Zugriff über die Supabase-Data-API.

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` / `build` / `start` | Entwicklung / Build / Produktion |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm test` | Unit- und Integrationstests (Vitest, echte PostgreSQL-Testdatenbank) |
| `npm run test:e2e` | Ende-zu-Ende-Tests (Playwright, iPhone-Viewport) |
| `npm run db:migrate` | Migrationen anwenden |

Für die Tests werden die Datenbanken `rtm_test` und `rtm_e2e` auf `localhost:5432` (Benutzer/Passwort `rtm`) erwartet; per `TEST_DATABASE_URL` / `E2E_DATABASE_URL` überschreibbar. Details in `docs/TESTS.md`.

## Umbenennung des Repositories

Das Projekt hat den Paketnamen `road-to-matchday`. Das GitHub-Repository selbst (aktuell `miubdb/WMPrognose`) kann nur in den GitHub-Einstellungen umbenannt werden (*Settings → Repository name*); der Code enthält keine Verweise auf den alten Namen.

## Datenschutz

Alle Daten liegen in der konfigurierten Datenbank, getrennt pro Konto; in der App gibt es Datenexport (JSON) und Konto-Löschung. Nur bei Nutzung der KI-Funktionen werden die dafür nötigen Daten an die Anthropic-API übermittelt, bei der Barcode-Suche die Barcode-Nummer an Open Food Facts. Kein Tracking.
