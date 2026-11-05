// Screenshots der Karten (Deutschland/Europa/Welt, mehrere Zoomstufen) im Admin-Editor, auf Handy und Desktop; prüft Pin-Setzen & -Verschieben.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const SHOTS = process.env.SHOTS ?? '/tmp/claude-0/shots/maps'; mkdirSync(SHOTS, { recursive: true });
const PW = 'map-shots-pw-1'; const PORT = 8096; const BASE = `http://localhost:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ PROBLEM:', m); } };
const srv = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: mkdtempSync(join(tmpdir(), 'outplay-map-')), MAP_FILE: process.env.MAP_FILE ?? 'data/maps/outplay-karte.mbtiles', ADMIN_PASSWORD: PW }, stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(250); }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [label, opts] of [['phone', devices['Pixel 7']], ['desktop', { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }]]) {
  const ctx = await browser.newContext(opts); const p = await ctx.newPage(); p.on('pageerror', e => { failures++; console.log('pageerror', e.message); });
  await p.goto(BASE + '/admin'); await p.getByLabel('Admin-Passwort').fill(PW); await p.getByRole('button', { name: 'Anmelden' }).click(); await p.waitForSelector('.admtop');
  await p.getByRole('button', { name: /Fragen/ }).click(); await p.waitForSelector('.qcard');
  await p.locator('.newmenu summary').click(); await p.locator('.newmenu button').filter({ hasText: 'WO ZUR' }).click(); await p.waitForSelector('.adminmap canvas.maplibregl-canvas'); check(true, label + ': Vektorkarte (MapLibre) aktiv');
  for (const kind of ['germany', 'europe', 'world']) {
    await p.locator('.modalbox .seg button').nth(['germany', 'europe', 'world'].indexOf(kind)).click(); await sleep(2500);
    const map = p.locator('.adminmap');
    await map.scrollIntoViewIfNeeded(); await map.screenshot({ path: `${SHOTS}/${label}-${kind}-1.png` });
    const plus = p.getByLabel('Vergrößern');
    for (let z = 2; z <= 4; z++) { await plus.click(); await plus.click(); await sleep(1800); await map.screenshot({ path: `${SHOTS}/${label}-${kind}-${z}.png` }); }
    await p.getByLabel('Ganze Karte').click(); await sleep(200);
  }
  // Pin setzen (Deutschland) und verschieben
  await p.locator('.modalbox .seg button').first().click(); await sleep(700);
  const box = await p.locator('.adminmap canvas').boundingBox();
  await p.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.6); await sleep(300);
  await p.locator('.modalbox details.more').evaluateAll(els => els.forEach(e => { e.open = true; })); const lat1 = await p.getByLabel('Breite (lat)').inputValue(); const lon1 = await p.getByLabel('Länge (lon)').inputValue();
  check(lat1 && lon1 && +lat1 > 47 && +lat1 < 55.5 && +lon1 > 5 && +lon1 < 16, `${label}: Pin setzt Koordinaten (${lat1}, ${lon1})`);
  await p.locator('.adminmap').screenshot({ path: `${SHOTS}/${label}-pin.png` });
  // Pin per Ziehen verschieben (am Pinkopf greifen)
  const hb = await p.locator('.glpin').boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + 12); await p.mouse.down(); await p.mouse.move(hb.x + hb.width / 2 + 60, hb.y + 12 + 40, { steps: 8 }); await p.mouse.up(); await sleep(400);
  const lat2 = await p.getByLabel('Breite (lat)').inputValue(), lon2 = await p.getByLabel('Länge (lon)').inputValue();
  check(Math.abs(+lat2 - +lat1) > 0.05 && Math.abs(+lon2 - +lon1) > 0.05, `${label}: Pin lässt sich verschieben (${lat2}, ${lon2})`);
  await ctx.close();
}
await browser.close(); srv.kill(); console.log(failures ? `\n${failures} PROBLEME` : '\nKarten-Screenshots OK'); process.exit(failures ? 1 : 0);
