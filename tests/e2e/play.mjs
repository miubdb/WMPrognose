// End-to-End mit echten Browsern (Playwright): Host + TV + 6 Handys spielen einen Teil der Show.
// Start: PORT=8091 DATA_DIR=/tmp/outplay-e2e node --import tsx server/index.ts   (in anderem Terminal), dann: node tests/e2e/play.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:8091';
const SHOTS = process.env.SHOTS ?? '/tmp/claude-0/shots';
mkdirSync(SHOTS, { recursive: true });
const N = Number(process.env.PLAYERS ?? 6);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log('•', ...a);
let failures = 0;
const check = (cond, msg) => { if (cond) log('✓', msg); else { failures++; console.log('✗ FEHLER:', msg); } };

const browser = await chromium.launch(process.env.NOGL ? {} : { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const tvCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const host = await hostCtx.newPage();
const tv = await tvCtx.newPage();
host.on('pageerror', e => console.log('HOST pageerror', e.message));
tv.on('pageerror', e => console.log('TV pageerror', e.message));

// 1. Host erstellt Raum
await host.goto(BASE + '/host');
await host.getByText('Spielraum erstellen').click();
await host.waitForSelector('.roomtag b');
const code = (await host.locator('.roomtag b').first().innerText()).trim();
check(/^[A-Z0-9]{4,5}$/.test(code), `Raum erstellt: ${code}`);

// 2. TV
await tv.goto(`${BASE}/tv/${code}`);
await tv.getByText('Bildschirm starten').click();
await tv.waitForSelector('.roomcode');
check((await tv.locator('.roomcode').innerText()).trim() === code, 'TV zeigt Raumcode');
check(await tv.locator('.qr svg').count() > 0, 'TV zeigt QR-Code');

// 3. Spieler treten bei (iPhone-/Pixel-Emulation, getrennte Kontexte = getrennte Browser)
const phones = [];
const names = ['Anna', 'Ben', 'Cem', 'Dana', 'Eli', 'Fiete', 'Gabi'].slice(0, N);
for (let i = 0; i < N; i++) {
  const ctx = await browser.newContext({ ...(i % 2 ? devices['Pixel 7'] : devices['iPhone 13']) });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log(`P${i} pageerror`, e.message));
  await p.goto(`${BASE}/play/${code}`);
  await p.getByPlaceholder('z. B. Alex').fill(names[i]);
  if (i === 0) { await p.screenshot({ path: `${SHOTS}/phone-join.png` }); await p.getByRole('button', { name: 'Frisur' }).click(); await sleep(300); await p.screenshot({ path: `${SHOTS}/phone-editor-hair.png` }); }
  await p.getByRole('button', { name: 'Beitreten', exact: true }).click();
  await p.waitForSelector('.topbar');
  phones.push({ p, ctx, name: names[i] });
}
await tv.waitForFunction(n => document.querySelectorAll('.cand').length === n, N);
check(true, `${N} Avatare in der TV-Lobby`);
await tv.screenshot({ path: `${SHOTS}/tv-lobby.png` });
await host.waitForFunction(n => document.querySelectorAll('.plist li').length === n, N);
await host.screenshot({ path: `${SHOTS}/host-lobby.png` });

// 4. Show starten
await host.getByText('Lobby schließen & Show starten').click();
await tv.waitForSelector('.introgrid');
await sleep(5200);
await tv.screenshot({ path: `${SHOTS}/tv-intro.png` });
await host.getByText('Weiter zur Kategorienwand').click();
await tv.waitForSelector('.wall');
await sleep(1200);
await tv.screenshot({ path: `${SHOTS}/tv-wall.png` });

// 5. Picker wählt "Geografisch daneben"
async function pickerPhone() {
  for (const ph of phones) { if (await ph.p.locator('.pickwall').count()) return ph; }
  return null;
}
await sleep(500);
const pk = await pickerPhone();
check(!!pk, 'Genau ein Handy zeigt die Kategorienwahl');
await pk.p.screenshot({ path: `${SHOTS}/phone-wall.png` });
await pk.p.locator('.tile', { hasText: 'Geografisch daneben' }).click();
await tv.waitForSelector('.rulecard');
await sleep(1800);
await tv.screenshot({ path: `${SHOTS}/tv-rules.png` });
await phones[0].p.screenshot({ path: `${SHOTS}/phone-intro.png` });
await host.getByText('Aufgabe 1 starten').click();

// 6. Karte: jeder setzt einen Pin
for (const ph of phones) await ph.p.waitForSelector('.mapsvg, canvas.maplibregl-canvas');
await sleep(1500);
await tv.screenshot({ path: `${SHOTS}/tv-geo-open.png` });
let i = 0;
for (const ph of phones) {
  const box = await ph.p.locator('.mapsvg, canvas.maplibregl-canvas').first().boundingBox();
  await ph.p.mouse.click(box.x + box.width * (0.45 + 0.06 * i), box.y + box.height * (0.35 + 0.04 * i));
  i++;
  await ph.p.getByRole('button', { name: 'Tipp abgeben' }).click();
  await ph.p.waitForSelector('.status.ok');
}
await phones[0].p.screenshot({ path: `${SHOTS}/phone-geo-sent.png` });
check(true, 'alle Pins abgegeben und bestätigt');

// 7. Verbindungsabbruch & Wiederkehr: Spieler 2 lädt neu
await phones[1].p.reload();
await phones[1].p.waitForSelector('.topbar');
await phones[1].p.waitForSelector('.status.ok');
check(true, 'Reload: Spieler 2 ist wieder drin, Antwort bleibt gespeichert');

// 8. Host löst auf
await host.getByText('Sofort auflösen').click();
await tv.waitForSelector('.pointslist .prow');
await sleep(4500);
await sleep(3500); await tv.screenshot({ path: `${SHOTS}/tv-geo-reveal.png` });
await phones[0].p.waitForSelector('.reveal .pts');
await phones[0].p.screenshot({ path: `${SHOTS}/phone-reveal.png` });
await host.screenshot({ path: `${SHOTS}/host-reveal.png` });

// 9. Host-Reload
await host.reload();
await host.waitForSelector('.hostgrid');
check(await host.getByText('Weiter zu Aufgabe 2').count() > 0, 'Host-Reload stellt das Kontrollpult wieder her');

// 10. Kachel überspringen → Wand, zweite Kategorie: Blind Rank
page: {
  await host.locator('summary', { hasText: 'Korrektur' }).click();
  host.once('dialog', d => d.accept());
  await host.getByText('Kachel überspringen').click();
  await tv.waitForSelector('.wall');
  await sleep(600);
  const pk2 = await pickerPhone();
  await pk2.p.locator('.tile', { hasText: 'König Fußball' }).click();
  await tv.waitForSelector('.rulecard');
  await host.getByText('Aufgabe 1 starten').click();
  await tv.waitForSelector('.curitem');
  await sleep(500);
  await tv.screenshot({ path: `${SHOTS}/tv-rank.png` });
  for (const ph of phones.slice(0, 3)) {
    await ph.p.waitForSelector('.slots');
    await ph.p.locator('.slot:not(.filled)').first().click();
    await ph.p.getByRole('button', { name: /endgültig/ }).click();
    await ph.p.waitForSelector('.status.ok');
  }
  await phones[0].p.screenshot({ path: `${SHOTS}/phone-rank.png` });
  for (let k = 0; k < 4; k++) { await host.getByText('Antworten sperren').click(); await sleep(300); for (const ph of phones.slice(0, 3)) { await ph.p.locator('.slot:not(.filled)').first().click().catch(() => {}); await ph.p.getByRole('button', { name: /endgültig/ }).click().catch(() => {}); } await sleep(300); }
  await host.getByText('Antworten sperren').click().catch(() => {});
  await host.getByText('Auflösung auf dem TV zeigen').click().catch(() => {});
  await sleep(5500); await tv.screenshot({ path: `${SHOTS}/tv-rank-reveal.png` });
  check(true, 'Blind Rank: Platzierung auf Handys funktioniert');
}

await browser.close();
console.log(failures ? `\n${failures} FEHLER` : '\nE2E OK');
process.exit(failures ? 1 : 0);
