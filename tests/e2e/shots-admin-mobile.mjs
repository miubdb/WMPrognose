// Screenshots des Admin-Bereichs auf Handy-Viewport (Pixel 7 / iPhone 13) für alle sechs Modi + Szenen + Vorschau; prüft horizontales Überlaufen.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const SHOTS = process.env.SHOTS ?? '/tmp/claude-0/shots/mobile'; mkdirSync(SHOTS, { recursive: true });
const PW = 'mobile-shots-pw-1'; const PORT = 8095; const BASE = `http://localhost:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ PROBLEM:', m); } };
const srv = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: mkdtempSync(join(tmpdir(), 'outplay-m-')), ADMIN_PASSWORD: PW }, stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(250); }
const browser = await chromium.launch();
for (const [label, dev] of [['pixel7', devices['Pixel 7']], ['iphone13', devices['iPhone 13']]]) {
  const ctx = await browser.newContext(dev); const p = await ctx.newPage(); p.on('pageerror', e => { failures++; console.log('pageerror', e.message); });
  await p.goto(BASE + '/admin'); await p.getByLabel('Admin-Passwort').fill(PW); await p.getByRole('button', { name: 'Anmelden' }).click(); await p.waitForSelector('.admtop');
  const overflow = async (name) => { const o = await p.evaluate(() => { const w = window.innerWidth; const bad = [...document.querySelectorAll('.modalbox *, .adm *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('.tablescroll, .tvframe, svg, .frametabs, .chipsrow, .admtop nav'); }).slice(0, 3).map(e => e.tagName + '.' + e.className); return { sw: document.documentElement.scrollWidth > w + 2, bad }; }); check(!o.sw && !o.bad.length, `${label} ${name}: kein Überlauf ${o.bad.join(' ')}`); };
  await p.screenshot({ path: `${SHOTS}/${label}-1-packs.png` }); await overflow('Pakete');
  await p.getByRole('button', { name: '❓ Fragen' }).click(); await p.waitForSelector('.qcard'); await p.screenshot({ path: `${SHOTS}/${label}-2-library.png` }); await overflow('Bibliothek');
  for (const mode of ['geo', 'rank', 'estimate', 'glitch', 'match', 'link', 'unique']) {
    await p.locator('.newmenu summary').click(); await p.locator('.newmenu button').filter({ hasText: { geo: 'WO ZUR', rank: 'BLIND', estimate: 'SETZ AUF', glitch: 'GLITCH', match: 'MATCHMAKER', link: 'VERBINDUNG', unique: 'EINZIGARTIG' }[mode] }).click(); await p.waitForSelector('.modalbox');
    await sleep(500); await p.screenshot({ path: `${SHOTS}/${label}-3-editor-${mode}.png` }); await overflow('Editor ' + mode);
    await p.locator('.modalbox').evaluate(e => e.scrollTo?.(0, 99999)); await p.evaluate(() => window.scrollTo(0, 99999)); await sleep(200); await p.screenshot({ path: `${SHOTS}/${label}-3-editor-${mode}-unten.png` });
    await p.locator('.modalbox').first().getByRole('button', { name: 'Schließen ✕' }).first().click(); await sleep(200);
  }
  // Vorschau einer vorhandenen Frage (Glitch) auf dem Handy
  await p.locator('.chipsrow .chip').nth(4).click(); await sleep(600); await p.locator('.qcard').first().getByRole('button', { name: 'Vorschau' }).click();
  await p.waitForSelector('.frametabs'); await sleep(1800); await p.screenshot({ path: `${SHOTS}/${label}-4-vorschau.png` }); await p.locator('.frametabs button').last().click(); await sleep(2500); await p.screenshot({ path: `${SHOTS}/${label}-5-vorschau-aufloesung.png`, fullPage: false }); await overflow('Vorschau');
  await p.locator('.modal').last().getByRole('button', { name: 'Schließen ✕' }).first().click();
  // Szenen-Builder
  await p.getByRole('button', { name: '🖼️ Szenen' }).click(); await sleep(700); await p.getByRole('button', { name: '＋ Neue Szene' }).click(); await p.waitForSelector('.scenepair'); await sleep(400); await p.screenshot({ path: `${SHOTS}/${label}-6-szene.png` }); await overflow('Szene');
  await p.locator('.modalbox').getByRole('button', { name: 'Schließen ✕' }).first().click();
  await p.getByRole('button', { name: '⇅ Daten' }).click(); await sleep(600); await p.screenshot({ path: `${SHOTS}/${label}-7-io.png` }); await overflow('Import/Export');
  await ctx.close();
}
await browser.close(); srv.kill(); console.log(failures ? `\n${failures} PROBLEME` : '\nMobile-Screenshots OK'); process.exit(failures ? 1 : 0);
