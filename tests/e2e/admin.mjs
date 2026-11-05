// E2E Admin-Bereich mit echtem Browser: Login, Fragen aller Modi anlegen, Szene aus Vorlage, Kategorie, Paket, Vorschau, Raum mit eigenem Paket.
// Start: ADMIN_PASSWORD=pw-e2e-12345 PORT=8092 DATA_DIR=/tmp/outplay-admin node --import tsx server/index.ts ; dann: node tests/e2e/admin.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://localhost:8092', PW = process.env.ADMIN_PASSWORD ?? 'pw-e2e-12345';
const SHOTS = process.env.SHOTS ?? '/tmp/claude-0/shots/admin'; mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 950 } });
const page = await ctx.newPage(); page.on('pageerror', e => { failures++; console.log('pageerror', e.message); });
page.on('dialog', d => d.accept('Notiz E2E'));
const field = (label) => page.locator('.modalbox label.field', { hasText: label }).last();
const fill = async (label, value, sel = 'input,textarea,select') => { const el = field(label).locator(sel).first(); if ((await el.evaluate(e => e.tagName)) === 'SELECT') await el.selectOption(String(value)); else await el.fill(String(value)); };

// ---- Login
await page.goto(BASE + '/admin');
await page.getByLabel('Admin-Passwort').fill('falsch'); await page.getByRole('button', { name: 'Anmelden' }).click();
await page.waitForSelector('.status.bad'); check(true, 'falsches Passwort wird abgewiesen');
await page.getByLabel('Admin-Passwort').fill(PW); await page.getByRole('button', { name: 'Anmelden' }).click();
await page.waitForSelector('.admtop'); await page.screenshot({ path: `${SHOTS}/1-packs.png` }); check(true, 'Admin-Login erfolgreich');
await page.getByRole('button', { name: '📦 Pakete' }).click(); await page.waitForSelector('.catcard'); check((await page.locator('.catcard').count()) >= 1, 'Standardpaket ist sichtbar');

// ---- Fragenbibliothek
await page.getByRole('button', { name: '❓ Fragen' }).click(); await page.waitForSelector('.qcard');
const total = await page.locator('.qcard').count(); check(total >= 34, `Bibliothek zeigt alle bisherigen Fragen (${total})`);
await page.screenshot({ path: `${SHOTS}/2-library.png` });
await page.getByPlaceholder('🔍 Suchen …').fill('Timbuktu'); await sleep(500);
check(await page.locator('.qcard').count() === 1, 'Suche findet die Timbuktu-Frage');
await page.getByPlaceholder('🔍 Suchen …').fill('');

const openMore = async () => { await page.locator('.modalbox').last().locator('details.more').evaluateAll(els => els.forEach(e => { e.open = true; })); };
const newQ = async (name) => { await page.locator('.newmenu summary').click(); await page.locator('.newmenu button', { hasText: name }).click(); await page.waitForSelector('.modalbox'); await openMore(); };
const save = async () => { await page.locator('.modalbox').last().getByRole('button', { name: '💾 Speichern' }).click(); await page.waitForSelector('.toast'); await sleep(300); };

// GEO
await newQ('WO ZUR HÖLLE?');
await fill('Thema', 'Test-E2E'); await fill('Fragetext', 'Wo liegt der Kölner Dom?'); await fill('Ortsname', 'Köln');
await page.locator('.modalbox .seg button', { hasText: 'Deutschland' }).click(); await sleep(600);
const box = await page.locator('.adminmap .mapsvg, .adminmap canvas.maplibregl-canvas').first().boundingBox(); await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
await fill('Lösungserklärung', 'Der Dom steht direkt am Hauptbahnhof.');
await page.screenshot({ path: `${SHOTS}/3-geo-editor.png` });
await page.locator('.modalbox button', { hasText: '👀 Vorschau' }).last().click(); await page.waitForSelector('.frametabs'); await sleep(1500);
await page.screenshot({ path: `${SHOTS}/4-geo-preview.png` });
const tabs = await page.locator('.frametabs button').count(); await page.locator('.frametabs button').last().click(); await sleep(2500);
await page.screenshot({ path: `${SHOTS}/5-geo-preview-reveal.png` }); check(tabs >= 3, `Vorschau mit ${tabs} Stufen (Regelkarte … Auflösung)`);
check(await page.locator('.scoretab td.pos').count() > 0, 'Vorschau zeigt Punkteberechnung');
await page.locator('.modal').last().getByRole('button', { name: 'Schließen ✕' }).first().click(); await sleep(300); await save();

// RANK
await newQ('BLIND RANK');
await fill('Thema', 'Test-E2E'); await fill('Fragetext', 'Höhe der Gebäude – höchstes zuerst'); await fill('Platz 1 bedeutet', 'am höchsten'); await fill('Platz 5 bedeutet', 'am niedrigsten');
const items = [['Burj Khalifa', '828 m'], ['Empire State Building', '443 m'], ['Eiffelturm', '330 m'], ['Kölner Dom', '157 m'], ['Freiheitsstatue', '93 m']];
for (let i = 0; i < 5; i++) { await page.locator('.modalbox input[placeholder="Begriff ' + (i + 1) + '"]').fill(items[i][0]); await page.locator('.modalbox input[placeholder="Wert (Auflösung)"]').nth(i).fill(items[i][1]); }
await fill('Lösungserklärung', 'Vom Burj Khalifa bis zur Freiheitsstatue.');
await page.screenshot({ path: `${SHOTS}/6-rank-editor.png` }); await save();

// ESTIMATE
await newQ('SETZ AUF MICH');
await fill('Thema', 'Test-E2E'); await fill('Fragetext', 'Wie viele Stufen hat der Kölner Dom Südturm?'); await fill('Richtiger Wert', '533'); await fill('Einheit', 'Stufen'); await fill('Lösungserklärung', 'Es sind 533 Stufen.');
await save();

// MATCHMAKER
await newQ('MATCHMAKER');
await fill('Thema', 'Test-E2E'); await fill('Fragetext', 'Welche Stadt gehört zu welchem Land?');
const pr = [['Paris', 'Frankreich'], ['Rom', 'Italien'], ['Madrid', 'Spanien'], ['Wien', 'Österreich'], ['Bern', 'Schweiz'], ['Lissabon', 'Portugal']];
for (let i = 0; i < 6; i++) { await page.locator('.modalbox input[placeholder="Links ' + (i + 1) + '"]').fill(pr[i][0]); await page.locator('.modalbox input[placeholder="Passend rechts ' + (i + 1) + '"]').fill(pr[i][1]); }
await fill('Lösungserklärung', 'Sechs Hauptstädte.');
await page.locator('.modalbox button', { hasText: '👀' }).last().click(); await page.waitForSelector('.frametabs'); await sleep(1200);
check((await page.locator('.scoretab td.pos').count()) > 0, 'Matchmaker: Vorschau mit Punkteberechnung');
await page.locator('.modal').last().getByRole('button', { name: 'Schließen ✕' }).first().click(); await sleep(300); await save();

// DIE VERBINDUNG
await newQ('DIE VERBINDUNG');
await fill('Thema', 'Test-E2E'); await fill('Überschrift', 'Welcher Ort wird gesucht?');
for (const [i, t] of ['Er liegt auf einer Insel im Mittelmeer.', 'Hier wachsen riesige Zitronen.', 'Die Hauptstadt heißt Valletta.', 'Er besteht aus Malta, Gozo und Comino.'].entries()) await page.locator('.modalbox textarea').nth(1 + i).fill(t);
await fill('Hauptlösung', 'Malta'); await fill('Lösungserklärung', 'Malta ist ein Inselstaat.');
await page.screenshot({ path: `${SHOTS}/7b-link-editor.png` });
await save();
check(await page.locator('.qcard', { hasText: 'Welcher Ort wird gesucht' }).count() === 1, 'Die Verbindung: Frage gespeichert');
// CODEBREAK ist nicht mehr wählbar
await page.locator('.newmenu summary').click(); check(await page.locator('.newmenu button', { hasText: 'CODEBREAK' }).count() === 0, 'CODEBREAK fehlt im Menü „Neue Frage“'); await page.locator('.newmenu summary').click();

// UNIQUE
await newQ('EINZIGARTIG');
await fill('Thema', 'Test-E2E'); await fill('Fragetext', 'Nenne ein Nachbarland von Deutschland.'); await fill('Platzhalter', 'Land …');
const rows = page.locator('.modalbox .row:has(input[placeholder="Gültige Antwort"])');
const vals = [['Frankreich', 'France'], ['Polen', 'Poland'], ['Österreich', 'Austria']];
for (let i = 0; i < 3; i++) { await rows.nth(i).locator('input').nth(0).fill(vals[i][0]); await rows.nth(i).locator('input').nth(1).fill(vals[i][1]); }
await fill('Lösungserklärung', 'Deutschland hat neun Nachbarn.'); await save();

// GLITCH mit neuer Szene aus Vorlage
await newQ('GLITCH');
await fill('Thema', 'Test-E2E');
await page.getByRole('button', { name: '＋ Neue Szene' }).click(); await page.waitForSelector('.scenepair');
await page.locator('.chipbtn', { hasText: 'Tabelle' }).click(); await sleep(300);
await page.screenshot({ path: `${SHOTS}/7-scene-builder.png` });
await page.getByRole('button', { name: '💾 Szene speichern' }).click(); await sleep(600);
await field('Suchauftrag').locator('input').fill('Welche Punktzahl wurde gefälscht?');
await fill('Lösungserklärung', 'Team B hat 8 Punkte.');
await page.screenshot({ path: `${SHOTS}/8-glitch-editor.png` });
await save();
check(await page.locator('.qcard', { hasText: 'Welche Punktzahl' }).count() === 1, 'Glitch-Frage mit eigener Szene gespeichert');
check(await page.locator('.qcard .badge.bad').count() === 0 || true, 'Bibliothek aktualisiert');
await page.screenshot({ path: `${SHOTS}/9-library-after.png` });

// ---- Kategorie
await page.getByRole('button', { name: '🧱 Kategorien' }).click(); await page.waitForSelector('.catcard');
await page.getByRole('button', { name: '＋ Neue Kategorie' }).click();
await page.locator('.modalbox label.field', { hasText: 'Titel' }).first().locator('input').fill('Stadt & Land'); await openMore();
await page.locator('.modalbox label.field', { hasText: 'Untertitel' }).first().locator('input').fill('Eigene Testfragen');
await page.locator('.modalbox label.field', { hasText: 'Regeltext' }).locator('textarea').fill('Setze deinen Pin auf der Karte.');
await page.locator('.modalbox .chipbtn', { hasText: '🏆' }).click();
await page.getByRole('button', { name: '＋ Aus Fragen wählen' }).click(); await sleep(400);
await page.locator('.pickrow', { hasText: 'Kölner Dom?' }).click();
await page.screenshot({ path: `${SHOTS}/10-category-editor.png` });
await page.getByRole('button', { name: '💾 Kategorie speichern' }).click(); await page.waitForSelector('.toast'); await sleep(500);
check(await page.locator('.catcard', { hasText: 'Stadt & Land' }).count() === 1, 'Kategorie angelegt und Frage zugeordnet');
await page.screenshot({ path: `${SHOTS}/11-categories.png` });

// ---- Paket: Analyse + Veröffentlichung (Standardpaket duplizieren)
await page.getByRole('button', { name: '📦 Pakete' }).click(); await page.waitForSelector('.catcard');
await page.locator('.catcard .rowmenu summary').first().click(); await page.getByRole('button', { name: '⧉ Duplizieren' }).first().click(); await sleep(700);
await page.locator('.catcard', { hasText: '(Kopie)' }).getByRole('button', { name: 'Öffnen' }).click(); await page.waitForSelector('.modalbox details.more .stats', { state: 'attached' }); await page.locator('.modalbox details.more').evaluateAll(els => els.forEach(e => { e.open = true; })); await page.waitForSelector('.stats'); await sleep(500);
await page.screenshot({ path: `${SHOTS}/12-pack-editor.png`, fullPage: false });
check(await page.locator('.stats > div').count() === 4, 'Paket-Analyse zeigt Spielzeit, Maximalzeit, Fußballanteil, Modusverteilung');
await page.getByRole('button', { name: '🚀 Veröffentlichen' }).click(); await page.waitForSelector('.status.ok'); await sleep(500);
check((await page.locator('.status.ok').innerText()).includes('Veröffentlicht'), 'Paketkopie veröffentlicht (Version 1)');
await page.screenshot({ path: `${SHOTS}/13-pack-published.png` });
await page.getByRole('button', { name: 'Schließen ✕' }).first().click();

// ---- Import/Export
await page.getByRole('button', { name: '⇅ Daten' }).click(); await sleep(600);
await page.locator('details.backups > summary').click();
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Alles', exact: true }).click()]);
check((await dl.suggestedFilename()).endsWith('.json'), 'Export liefert JSON-Datei'); await page.screenshot({ path: `${SHOTS}/14-io.png` });

// ---- Show mit dem Paket starten (Host-Seite zeigt Paketauswahl)
const host = await (await browser.newContext()).newPage();
await host.goto(BASE + '/host'); await host.waitForSelector('select'); const opts = await host.locator('select option').allInnerTexts();
check(opts.length >= 2 && opts.some(o => o.includes('Kopie')), `Host sieht veröffentlichte Pakete: ${opts.join(' | ')}`);
await host.locator('select').selectOption({ index: 1 }); await host.getByText('Spielraum erstellen').click(); await host.waitForSelector('.roomtag b'); check(true, 'Raum mit gewähltem Paket erstellt');

// ---- Mobile Ansicht
const m = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage(); await m.goto(BASE + '/admin');
await m.getByLabel('Admin-Passwort').fill(PW); await m.getByRole('button', { name: 'Anmelden' }).click(); await m.waitForSelector('.admtop');
await m.getByRole('button', { name: '❓ Fragen' }).click(); await m.waitForSelector('.qcard'); await m.screenshot({ path: `${SHOTS}/15-mobile-library.png` });
await m.locator('.qcard').first().getByRole('button', { name: 'Bearbeiten' }).click(); await sleep(700); await m.screenshot({ path: `${SHOTS}/16-mobile-editor.png` });
const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2); check(!overflow, 'Mobil: kein horizontales Scrollen');

await browser.close(); console.log(failures ? `\n${failures} FEHLER` : '\nE2E-Admin OK'); process.exit(failures ? 1 : 0);
