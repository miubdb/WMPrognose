import { expect, test, type Page } from '@playwright/test';
import { gzipSync } from 'node:zlib';
import { buildFit } from '../tests/helpers/fitFixture';

// Ende-zu-Ende-Test der wichtigsten Nutzerprozesse auf iPhone-Viewport (Chromium-Emulation, siehe docs/TESTS.md).
// Die Tests laufen nacheinander mit demselben Konto und echter Datenbank; "heute" ist per APP_TODAY auf 02.11.2026 fixiert.

test.describe.configure({ mode: 'serial' });

let page: Page;
const EMAIL = 'e2e@example.com';
const PASSWORD = 'e2e-sehr-sicher-123';

test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext({ ...test.info().project.use });
  page = await ctx.newPage();
  page.on('pageerror', (e) => { throw new Error(`Seitenfehler: ${e.message}`); });
});
test.afterAll(async () => { await page.context().close(); });

// Next.js hat selbst ein unsichtbares role=alert (Route-Announcer); wir meinen nur die Fehlermeldungen der App
const alertBox = () => page.locator('div[role="alert"]:not(#__next-route-announcer__)');
const nav = (name: string) => page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name });
const confirmDelete = async () => { await page.getByRole('button', { name: 'Löschen', exact: true }).click(); await page.getByRole('button', { name: 'Wirklich löschen' }).click(); };
async function noHorizontalScroll() {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, 'horizontales Scrollen auf dem iPhone').toBeLessThanOrEqual(1);
}
async function openMore(label: string) { await nav('Mehr').click(); await page.getByRole('link', { name: new RegExp(label) }).click(); }

test('nicht angemeldet → Weiterleitung auf Login', async () => {
  await page.goto('/plan');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Road to Matchday' })).toBeVisible();
});

test('Registrierung, Onboarding mit vereinbarten Zielen, Verfügbarkeit und Planerzeugung', async () => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Noch kein Konto/ }).click();
  await page.getByLabel('E-Mail').fill(EMAIL);
  await page.getByLabel('Passwort').fill('kurz');
  await page.getByTestId('submit-auth').click();
  await expect(alertBox()).toContainText(/mindestens 10 Zeichen/i);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByTestId('submit-auth').click();
  await expect(page).toHaveURL(/\/onboarding/);

  // Vorbelegung = vereinbarte Ziele
  await expect(page.getByLabel(/Beginn der Vorbereitung/)).toHaveValue('2026-11-02');
  await expect(page.getByLabel(/Erstes Freundschaftsspiel/)).toHaveValue('2027-02-06');
  await expect(page.getByLabel(/Hauptziel der Vorbereitung/)).toHaveValue('2027-03-07');
  await expect(page.getByLabel(/Ausgangsgewicht/)).toHaveValue('91.45');
  await expect(page.getByLabel(/Zielgewicht/)).toHaveValue('86');
  await expect(page.getByLabel(/Ausgangs-FTP/)).toHaveValue('236');
  await noHorizontalScroll();

  await page.getByLabel(/Geschlecht/).selectOption('m');
  await page.getByLabel('Geburtsjahr').fill('1990');
  await page.getByLabel(/Körpergröße/).fill('185');
  await page.getByTestId('profile-next').click();

  await expect(page.getByText('Schritt 2 von 3')).toBeVisible();
  const mins = { Montag: 60, Dienstag: 75, Mittwoch: 0, Donnerstag: 90, Freitag: 45, Samstag: 120, Sonntag: 90 };
  for (const [d, m] of Object.entries(mins)) await page.getByLabel(`Minuten ${d}`, { exact: true }).fill(String(m));
  await page.getByLabel('Mannschaftstraining').nth(2).check();
  await page.getByTestId('save-availability').click();
  await expect(page.getByText('Verfügbarkeit gespeichert.')).toBeVisible();
  await page.getByTestId('generate-plan').click();
  await expect(page.getByRole('heading', { name: 'Plan erstellt' })).toBeVisible();
  await expect(page.getByText(/\d+ Einheiten wurden geplant/)).toBeVisible();
  await page.getByTestId('finish-onboarding').click();
  await expect(page).toHaveURL('/');
});

test('Dashboard: Countdown, Phase, Tagesplan – echte Daten', async () => {
  await expect(page.getByRole('heading', { name: /Heute, Mo, 02\.11\.2026/ })).toBeVisible();
  await expect(page.getByText('96 Tage')).toBeVisible();
  await expect(page.getByText('125 Tage')).toBeVisible();
  await expect(page.getByText('Grundlagen').first()).toBeVisible();
  await expect(page.getByTestId('today-session')).toContainText('Kraft Ganzkörper');
  await expect(page.getByText('91,45 kg').first()).toBeVisible();
  await expect(page.getByText('236 W').first()).toBeVisible();
  await expect(page.getByText(/Ziel \d{4} kcal/)).toBeVisible(); // Kalorienziel aus Profildaten
  await noHorizontalScroll();
});

test('Tagesplan-Einheit als erledigt erfassen (RPE → geschätzte Belastung)', async () => {
  await page.getByTestId('log-session').click();
  await expect(page.getByLabel(/Titel/)).toHaveValue(/Kraft Ganzkörper/);
  await page.getByLabel(/Anstrengung/).fill('6');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('today-session').getByText('erledigt')).toBeVisible();
  await nav('Training').click();
  const row = page.getByTestId('row-workouts').first();
  await expect(row).toContainText('Kraft Ganzkörper');
  await expect(row).toContainText('aus RPE geschätzt');
});

test('Training manuell: anlegen (TSS aus NP/FTP), bearbeiten, löschen', async () => {
  await page.getByTestId('add-workouts').click();
  await page.getByLabel('Art').selectOption('rad');
  await page.getByLabel(/Titel/).fill('Sweetspot Rolle');
  await page.getByLabel(/Dauer/).fill('60');
  await page.getByLabel(/Normalized Power/).fill('236');
  await page.getByTestId('save').click();
  const row = page.getByTestId('row-workouts').filter({ hasText: 'Sweetspot Rolle' });
  await expect(row).toContainText('TSS 100');
  await row.click();
  await page.getByLabel(/Titel/).fill('Sweetspot Rolle lang');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('row-workouts').filter({ hasText: 'Sweetspot Rolle lang' })).toBeVisible();
  await page.getByTestId('row-workouts').filter({ hasText: 'Sweetspot Rolle lang' }).click();
  await confirmDelete();
  await expect(page.getByText('Sweetspot Rolle lang')).toHaveCount(0);
});

test('FIT-Import (offizielles Garmin-Format) inkl. Duplikaterkennung', async () => {
  await page.goto('/import');
  const fit = buildFit({ start: new Date('2026-11-01T09:00:00Z'), seconds: 1800, watts: (i) => (Math.floor(i / 60) % 2 === 0 ? 150 : 250) });
  await page.getByTestId('activity-files').setInputFiles({ name: 'ride.fit', mimeType: 'application/octet-stream', buffer: Buffer.from(fit) });
  const row = page.getByTestId('import-row');
  await expect(row).toContainText('30 min');
  await expect(row).toContainText('NP');
  await page.getByTestId('run-import').click();
  await expect(page.getByText('1 importiert, 0 bereits vorhanden')).toBeVisible();
  await page.getByTestId('activity-files').setInputFiles({ name: 'ride.fit', mimeType: 'application/octet-stream', buffer: Buffer.from(fit) });
  await page.getByTestId('run-import').click();
  await expect(page.getByText('0 importiert, 1 bereits vorhanden')).toBeVisible();
  // kaputte Datei → verständliche Fehlermeldung
  await page.getByTestId('activity-files').setInputFiles({ name: 'kaputt.fit', mimeType: 'application/octet-stream', buffer: Buffer.from('keine fit datei') });
  await expect(alertBox()).toContainText('keine gültige FIT-Datei');
  await page.goto('/training');
  await expect(page.getByTestId('row-workouts').filter({ hasText: 'FIT-Import' })).toContainText('Import FIT');
});

test('Import: gezippte FIT-Datei (Strava-Export) und Apple-Health-export.xml', async () => {
  await page.goto('/import');
  const fit = buildFit({ start: new Date('2026-10-30T18:00:00Z'), seconds: 900, watts: () => 180 });
  await page.getByTestId('activity-files').setInputFiles({ name: '123456.fit.gz', mimeType: 'application/gzip', buffer: gzipSync(Buffer.from(fit)) });
  await expect(page.getByTestId('import-row')).toContainText('15 min');
  await page.getByTestId('run-import').click();
  await expect(page.getByText('1 importiert, 0 bereits vorhanden')).toBeVisible();

  await page.getByRole('tab', { name: 'Apple Health' }).click();
  const xml = `<?xml version="1.0"?><HealthData>
<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" startDate="2026-11-05 07:00:00 +0100" value="90.2"/>
<Record type="HKQuantityTypeIdentifierRestingHeartRate" unit="count/min" startDate="2026-11-05 07:30:00 +0100" value="54"/>
<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" durationUnit="min" totalDistance="5" totalDistanceUnit="km" startDate="2026-11-04 06:30:00 +0100"/>
</HealthData>`;
  await page.getByTestId('health-file').setInputFiles({ name: 'export.xml', mimeType: 'text/xml', buffer: Buffer.from(xml) });
  await expect(page.getByText(/1 Tage mit Gewicht, 1 Tage mit Ruhepuls, 1 Workouts/)).toBeVisible();
  await page.getByTestId('run-apple').click();
  await expect(page.getByText(/Gewicht: 1 importiert.*Ruhepuls: 1 Tage.*Workouts: 1 importiert/)).toBeVisible();
  await page.getByTestId('health-file').setInputFiles({ name: 'leer.xml', mimeType: 'text/xml', buffer: Buffer.from('<HealthData></HealthData>') });
  await expect(alertBox()).toContainText('keine Gewichts-, Ruhepuls- oder Workout-Daten');
  await page.goto('/training');
  await expect(page.getByTestId('row-workouts').filter({ hasText: 'Running (Apple Health)' })).toBeVisible();
  await page.getByRole('tab', { name: 'Belastung' }).click();
  await expect(page.getByRole('img', { name: 'CTL, ATL, TSB' })).toBeVisible();
});

test('Plan: Wochenansicht, Detail, Eigene Einheit anlegen/ändern/löschen, Erledigt-Erfassung', async () => {
  await nav('Plan').click();
  await expect(page.getByTestId('plan-day')).toHaveCount(7);
  await page.getByTestId('plan-session').nth(1).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Schließen' }).click();

  await page.getByLabel('Einheit am 04.11.2026 hinzufügen').click();
  await page.getByLabel(/Titel/).fill('Eigene Mobilität');
  await page.getByLabel('Art').selectOption('mobilitaet');
  await page.getByLabel(/Dauer/).fill('20');
  await page.getByTestId('save').click();
  const mine = page.getByTestId('plan-session').filter({ hasText: 'Eigene Mobilität' });
  await expect(mine).toBeVisible();
  await mine.click();
  await page.getByRole('button', { name: 'Bearbeiten' }).click();
  await page.getByLabel(/Titel/).fill('Eigene Mobilität 2');
  await page.getByTestId('save').click();
  const mine2 = page.getByTestId('plan-session').filter({ hasText: 'Eigene Mobilität 2' });
  await expect(mine2).toBeVisible();
  await mine2.click();
  await page.getByTestId('detail-log').click();
  await page.getByTestId('save').click();
  await expect(page.getByTestId('plan-session').filter({ hasText: 'Eigene Mobilität 2' }).getByText('✓')).toBeVisible();
  await page.getByTestId('plan-session').filter({ hasText: 'Eigene Mobilität 2' }).click();
  await confirmDelete();
  await expect(page.getByText('Eigene Mobilität 2')).toHaveCount(0);

  // zur Spielwoche blättern (Woche des 06.02.2027 = 13 Wochen nach der Startwoche)
  for (let i = 0; i < 13; i++) await page.getByRole('button', { name: 'Nächste Woche' }).click();
  await expect(page.getByText('🏟️ Erstes Freundschaftsspiel').first()).toBeVisible();
  await expect(page.getByText('Spielwoche Freundschaftsspiel').first()).toBeVisible();
  await page.getByRole('button', { name: 'Zur aktuellen Woche' }).click();
});

test('Fußballspezifischer Schwerpunkt verschiebt sich vor dem Freundschaftsspiel', async () => {
  const share = async (weeksAhead: number) => {
    const back = page.getByRole('button', { name: 'Zur aktuellen Woche' });
    if (await back.count()) await back.click();
    for (let i = 0; i < weeksAhead; i++) await page.getByRole('button', { name: 'Nächste Woche' }).click();
    // warten, bis die Daten der Woche geladen und stabil sind
    let prev: string[] = [];
    await expect.poll(async () => {
      const cur = await page.getByTestId('plan-session').allInnerTexts();
      const stable = cur.length > 0 && JSON.stringify(cur) === JSON.stringify(prev);
      prev = cur;
      return stable;
    }, { timeout: 10000, intervals: [300] }).toBe(true);
    return prev.filter((t) => /⚽|🧤|👥|🏟️/.test(t)).length / Math.max(1, prev.length);
  };
  const early = await share(1); // Woche 2 (Grundlagen)
  const late = await share(10); // Woche 11 (Fußballspezifisch)
  expect(late).toBeGreaterThan(early);
});

test('Erholung: Check-in speichert und liefert Score', async () => {
  await openMore('Erholung');
  await page.getByTestId('open-checkin').click();
  await page.getByLabel(/Schlafdauer/).fill('5');
  await page.getByLabel(/Schlafqualität/).selectOption('1');
  await page.getByLabel(/Muskelkater/).selectOption('5');
  await page.getByLabel(/^Energie/).selectOption('1');
  await page.getByLabel(/^Stimmung/).selectOption('2');
  await page.getByLabel(/^Stress/).selectOption('5');
  await page.getByTestId('save').click();
  await expect(page.getByText('Gespeichert.')).toBeVisible();
  await expect(page.getByText('niedrig').first()).toBeVisible();
  await page.getByRole('button', { name: /Anderer Tag/ }).click();
  await page.getByLabel('Datum').fill('2026-11-01');
  await page.getByLabel(/Schlafdauer/).fill('5');
  await page.getByLabel(/Schlafqualität/).selectOption('1');
  await page.getByLabel(/Muskelkater/).selectOption('5');
  await page.getByLabel(/^Energie/).selectOption('1');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('checkin-row')).toHaveCount(2);
});

test('Bestätigungsworkflow: Regelvorschlag wird erst nach Bestätigung übernommen', async () => {
  await nav('Plan').click();
  await page.getByLabel('Einheit am 03.11.2026 hinzufügen').click();
  await page.getByLabel(/Titel/).fill('Harte Intervalle');
  await page.getByLabel('Art').selectOption('rad');
  await page.getByLabel(/Dauer/).fill('60');
  await page.getByLabel(/Intensität/).selectOption('3');
  await page.getByTestId('save').click();
  await page.getByRole('button', { name: 'Belastung prüfen' }).click();
  const proposal = page.getByTestId('proposal');
  await expect(proposal).toContainText('Regel-Vorschlag');
  await expect(proposal).toContainText('Noch nicht übernommen');
  await expect(page.getByTestId('plan-session').filter({ hasText: 'Harte Intervalle' })).toBeVisible();
  await expect(page.getByTestId('plan-session').filter({ hasText: '(reduziert)' })).toHaveCount(0); // unverändert
  await page.getByTestId('reject-proposal').click();
  await expect(page.getByText(/nichts geändert/)).toBeVisible();
  await expect(page.getByTestId('plan-session').filter({ hasText: '(reduziert)' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Belastung prüfen' }).click();
  await page.getByTestId('accept-proposal').click();
  await expect(page.getByText('Vorschlag übernommen.')).toBeVisible();
  await expect(page.getByTestId('plan-session').filter({ hasText: 'Harte Intervalle (reduziert)' })).toBeVisible();
});

test('Gewicht: eintragen, CSV-Import, Verlauf', async () => {
  await openMore('Körper');
  await page.getByTestId('add-weights').click();
  await page.getByLabel('Datum').fill('2026-11-02');
  await page.getByRole('spinbutton', { name: /^Gewicht/ }).fill('90');
  await page.getByTestId('save').click();
  await expect(alertBox()).toContainText('bereits');
  await page.getByLabel('Datum').fill('2026-11-09');
  await page.getByRole('spinbutton', { name: /^Gewicht/ }).fill('90.8');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('row-weights').filter({ hasText: '90,8 kg' })).toBeVisible();
  await page.goto('/import');
  await page.getByRole('tab', { name: 'Gewicht (CSV)' }).click();
  await page.getByTestId('csv-file').setInputFiles({ name: 'gewicht.csv', mimeType: 'text/csv', buffer: Buffer.from('Datum;Gewicht (kg);Fett %\n10.11.2026;90,5;24,0\n11.11.2026;90,3;\nxx;yy;\n') });
  await expect(page.getByText(/2 gültige Tage/)).toBeVisible();
  await page.getByTestId('run-csv').click();
  await expect(page.getByText('2 importiert, 0 bereits vorhanden.')).toBeVisible();
  await page.goto('/koerper');
  await expect(page.getByTestId('row-weights').filter({ hasText: '90,3 kg' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Gewichtsverlauf' })).toBeVisible();
});

test('FTP: Test berechnen und eintragen → Zonen', async () => {
  await page.goto('/koerper');
  await page.getByRole('tab', { name: 'FTP' }).click();
  await page.getByLabel(/^Testwert/).first().fill('260');
  await expect(page.getByText(/FTP ≈ 247 W/)).toBeVisible();
  await page.getByTestId('add-ftp-tests').click();
  await page.getByRole('dialog').getByLabel(/Testwert/).fill('260');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('row-ftp-tests').filter({ hasText: '247 W' })).toBeVisible();
  await expect(page.getByText('Z2 Grundlagenausdauer')).toBeVisible();
});

test('Ernährung: Eintrag anlegen/ändern/löschen, eigene Lebensmittel, Zielbilanz', async () => {
  await nav('Essen').click();
  await expect(page.getByText(/Ziel \d{4} kcal/)).toBeVisible();
  await page.getByTestId('add-fruehstueck').click();
  await page.getByRole('dialog').getByLabel('Bezeichnung').fill('Haferflocken mit Milch');
  await page.getByRole('dialog').getByLabel(/^Menge/).fill('80');
  await page.getByRole('dialog').getByLabel(/^Kalorien/).fill('400');
  await page.getByRole('dialog').getByLabel(/^Eiweiß/).fill('15');
  await page.getByTestId('save-entry').click();
  await expect(page.getByTestId('kcal-total')).toHaveText(/400 kcal/);
  await page.getByTestId('food-entry').first().click();
  await page.getByRole('dialog').getByLabel(/^Kalorien/).fill('450');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('kcal-total')).toHaveText(/450 kcal/);

  await page.getByRole('tab', { name: 'Lebensmittel' }).click();
  await page.getByTestId('add-foods').click();
  await page.getByRole('dialog').getByLabel('Name').fill('Magerquark');
  await page.getByRole('dialog').getByLabel(/Kalorien pro 100 g/).fill('67');
  await page.getByRole('dialog').getByLabel(/Eiweiß pro 100 g/).fill('12');
  await page.getByTestId('save').click();
  await page.getByRole('tab', { name: 'Tag' }).click();
  await page.getByTestId('add-snack').click();
  await page.getByRole('tab', { name: 'Meine Lebensmittel' }).click();
  await page.getByRole('button', { name: /Magerquark/ }).click();
  await page.getByRole('dialog').getByLabel(/^Menge/).fill('250');
  await expect(page.getByText(/167[.,]5 kcal/)).toBeVisible();
  await page.getByTestId('save-food-entry').click();
  await expect(page.getByTestId('kcal-total')).toHaveText(/618 kcal/);
  await page.getByTestId('food-entry').filter({ hasText: 'Magerquark' }).click();
  await confirmDelete();
  await expect(page.getByTestId('kcal-total')).toHaveText(/450 kcal/);
});

test('Barcode-Suche (UI): Produkt übernehmen und als eigenes Lebensmittel speichern', async () => {
  // Open Food Facts selbst ist live in docs/TESTS.md verifiziert; hier wird nur das UI-Verhalten mit fester Antwort geprüft.
  await page.route('**/api/nutrition/barcode?**', (r) => r.fulfill({ json: { product: { barcode: '3017620422003', name: 'Haselnuss-Aufstrich', brand: 'Test', kcal_100g: 539, protein_100g: 6.3, carbs_100g: 57.5, fat_100g: 30.9, serving_g: 15, source: 'openfoodfacts' } } }));
  await page.goto('/ernaehrung');
  await page.getByTestId('add-snack').click();
  await page.getByRole('tab', { name: 'Barcode' }).click();
  await page.getByLabel('Barcode').fill('3017620422003');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await expect(page.getByText('Haselnuss-Aufstrich – Test')).toBeVisible();
  await page.getByRole('dialog').getByLabel(/^Menge/).fill('20');
  await page.getByRole('button', { name: 'In meine Lebensmittel' }).click();
  await expect(page.getByText(/In „Meine Lebensmittel“ gespeichert/)).toBeVisible();
  await page.getByRole('button', { name: 'Zum Tag hinzufügen' }).click();
  await expect(page.getByTestId('food-entry').filter({ hasText: 'Haselnuss-Aufstrich' })).toContainText('108 kcal');
  await page.getByTestId('food-entry').filter({ hasText: 'Haselnuss-Aufstrich' }).click();
  await confirmDelete();
  await page.unroute('**/api/nutrition/barcode?**');
});

test('KI-Funktionen ohne Schlüssel: ehrliche Meldung statt Fake-Antworten', async () => {
  await page.getByTestId('add-mittag').click();
  await page.getByRole('tab', { name: 'Foto (KI)' }).click();
  await expect(page.getByText(/nicht eingerichtet/)).toBeVisible();
  await page.getByRole('button', { name: 'Schließen' }).click();
  await openMore('KI-Coach');
  await expect(page.getByText(/nicht eingerichtet/).first()).toBeVisible();
  await expect(page.getByLabel('Nachricht an den Coach')).toBeDisabled();
  await expect(page.getByTestId('send-coach')).toBeDisabled();
});

test('KI-Foto-Erkennung (UI): Schätzung prüfen, korrigieren, als Schätzung speichern', async () => {
  // Der KI-Endpunkt ist in dieser Umgebung nicht erreichbar (kein API-Schlüssel); hier wird nur das UI-Verhalten mit
  // einer festen API-Antwort geprüft. Die Serverlogik ist in tests/integration/ai.test.ts abgedeckt.
  await page.route('**/api/ai/status', (r) => r.fulfill({ json: { configured: true, model: 'stub' } }));
  await page.route('**/api/ai/food', (r) => r.fulfill({ json: { items: [
    { name: 'Reis', grams: 180, kcal: 235, protein_g: 4.5, carbs_g: 51, fat_g: 0.5, confidence: 'medium', is_estimate: true, plausible: true },
    { name: 'Soße', grams: 60, kcal: 100, protein_g: 40, carbs_g: 40, fat_g: 40, confidence: 'low', is_estimate: true, plausible: false },
  ], dropped: 0, notes: 'Soße nicht genau erkennbar', disclaimer: 'KI-Schätzung' } }));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.goto('/ernaehrung');
  await page.getByTestId('add-mittag').click();
  await page.getByRole('tab', { name: 'Foto (KI)' }).click();
  await page.getByTestId('photo-input').setInputFiles({ name: 'essen.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Schätzung', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Werte passen nicht zusammen')).toBeVisible();
  await expect(page.getByText(/Hinweis der KI: Soße nicht genau erkennbar/)).toBeVisible();
  await page.getByLabel('Reis kcal').fill('250'); // manuelle Korrektur
  await page.getByRole('button', { name: 'Entfernen' }).nth(1).click();
  await page.getByTestId('save-ai').click();
  const entry = page.getByTestId('food-entry').filter({ hasText: 'Reis' });
  await expect(entry).toContainText('≈ Schätzung');
  await expect(entry).toContainText('≈ 250 kcal');
  await page.getByTestId('kcal-total').waitFor();
  // Prüfen und Markierung entfernen
  await entry.click();
  await page.getByRole('dialog').getByLabel('Schätzung').uncheck();
  await page.getByTestId('save').click();
  await expect(page.getByTestId('food-entry').filter({ hasText: 'Reis' })).not.toContainText('Schätzung');
  await page.getByTestId('food-entry').filter({ hasText: 'Reis' }).click();
  await confirmDelete();
  await page.unroute('**/api/ai/status');
  await page.unroute('**/api/ai/food');
});

test('Torwart: Übung, Training mit Übungen, Spielanalyse mit Gegentor-Analyse und Statistik', async () => {
  await openMore('Torwart');
  await page.getByRole('tab', { name: 'Übungen' }).click();
  await page.getByTestId('add-gk-exercises').click();
  await page.getByLabel('Name der Übung').fill('Reaktionsball Wand');
  await page.getByLabel('Kategorie').selectOption('reaktion');
  await page.getByLabel('Standard-Sätze').fill('4');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('row-gk-exercises')).toContainText('Reaktionsball Wand');

  await page.getByRole('tab', { name: 'Trainings' }).click();
  await page.getByTestId('add-gk-session').click();
  await page.getByLabel('Titel').fill('Reaktion & Fußarbeit');
  await page.getByLabel('Übung aus Bibliothek hinzufügen').selectOption({ label: 'Reaktionsball Wand' });
  await expect(page.getByLabel('Übung 1')).toHaveValue('Reaktionsball Wand');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('row-gk-sessions')).toContainText('1 Übungen');
  await page.getByTestId('row-gk-sessions').click();
  await expect(page.getByLabel('Übung 1')).toHaveValue('Reaktionsball Wand');
  await page.getByRole('button', { name: 'Abbrechen' }).click();

  await page.getByRole('tab', { name: 'Spiele' }).click();
  await page.getByTestId('add-match').click();
  await page.getByLabel('Gegner').fill('FC Test');
  await page.getByLabel('Gegentore').fill('2');
  await page.getByLabel('Schüsse aufs Tor').fill('3');
  await page.getByLabel('Paraden').fill('4');
  await page.getByTestId('save').click();
  await expect(alertBox()).toContainText('Paraden');
  await page.getByLabel('Paraden').fill('1');
  await page.getByRole('button', { name: /Gegentor$/ }).click();
  await page.getByLabel('Beschreibung des Gegentors').fill('Flanke zu spät abgefangen');
  await page.getByLabel('vermeidbar').check();
  await page.getByTestId('save').click();
  const m = page.getByTestId('row-match');
  await expect(m).toContainText('FC Test 0:2');
  await expect(page.getByText('Fangquote')).toBeVisible();
  await expect(page.getByText('33,3 %')).toBeVisible();
  await m.click();
  await expect(page.getByLabel('Beschreibung des Gegentors')).toHaveValue('Flanke zu spät abgefangen');
  await confirmDelete();
  await expect(page.getByTestId('row-match')).toHaveCount(0);
});

test('Einstellungen: Profil ändern wirkt im Dashboard; Datenexport; Abmelden/Anmelden', async () => {
  await openMore('Einstellungen');
  await page.getByLabel(/Zielgewicht/).fill('87');
  await page.getByTestId('save-profile').click();
  await expect(page.getByText(/Profil gespeichert/)).toBeVisible();
  await nav('Heute').click();
  await expect(page.getByText('87 kg').first()).toBeVisible();

  await openMore('Einstellungen');
  await page.getByRole('tab', { name: 'Konto' }).click();
  const res = await page.request.get('/api/account/export');
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.user.email).toBe(EMAIL);
  expect(data.workouts.length).toBeGreaterThan(0);
  expect(data.weight_entries.length).toBeGreaterThan(2);

  await page.getByTestId('logout').click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('E-Mail').fill(EMAIL);
  await page.getByLabel('Passwort').fill('falsches-passwort-123');
  await page.getByTestId('submit-auth').click();
  await expect(alertBox()).toContainText('E-Mail oder Passwort ist falsch');
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByTestId('submit-auth').click();
  await expect(page).toHaveURL('/');
});

test('Konto löschen entfernt alle Daten', async () => {
  await openMore('Einstellungen');
  await page.getByRole('tab', { name: 'Konto' }).click();
  await page.getByLabel('Passwort zur Bestätigung').fill('falsch-falsch-falsch');
  await page.getByRole('button', { name: 'Konto endgültig löschen' }).click();
  await page.getByRole('button', { name: 'Ja, alles löschen' }).click();
  await expect(alertBox()).toContainText('Passwort ist falsch');
  await page.getByLabel('Passwort zur Bestätigung').fill(PASSWORD);
  await page.getByRole('button', { name: 'Konto endgültig löschen' }).click();
  await page.getByRole('button', { name: 'Ja, alles löschen' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('E-Mail').fill(EMAIL);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByTestId('submit-auth').click();
  await expect(alertBox()).toContainText('E-Mail oder Passwort ist falsch');
});
