import { createRequire } from 'node:module'; const require = createRequire('/home/user/WMPrognose/'); const { chromium } = require('playwright');
import { mkdirSync } from 'node:fs'; mkdirSync('/tmp/claude-0/resp', { recursive: true });
const b = await chromium.launch(); const sleep = ms => new Promise(r => setTimeout(r, ms)); let bad = 0;
for (const w of [375, 768, 1280, 1920]) {
  const p = await (await b.newContext({ viewport: { width: w, height: w < 500 ? 800 : 1000 } })).newPage(); p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('http://localhost:8092/admin'); await p.getByLabel('Admin-Passwort').fill('pw-e2e-12345'); await p.getByRole('button', { name: 'Anmelden' }).click(); await p.waitForSelector('.admtop');
  for (const [name, label, sel] of [['start', '🏠 Start', '.dash'], ['fragen', '❓ Fragen', '.qcard2'], ['pakete', '📦 Pakete', '.pcard'], ['sicherung', '💾 Sicherung & Update', '#update'], ['weitere', '🧱 Weitere Inhalte', '.ccard']]) {
    await p.locator('nav').getByRole('button', { name: label }).click(); await p.waitForSelector(sel); await sleep(500);
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })); if (o.sw > o.iw + 1) { bad++; console.log('HORIZONTAL OVERFLOW', w, name, o); }
    await p.screenshot({ path: `/tmp/claude-0/resp/${name}-${w}.png`, fullPage: w === 375 });
  }
  await p.locator('nav').getByRole('button', { name: '🧱 Weitere Inhalte' }).click(); await p.getByRole('tab', { name: /Szenen/ }).click(); await p.waitForSelector('.scard'); await sleep(400);
  const o2 = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })); if (o2.sw > o2.iw + 1) { bad++; console.log('OVERFLOW szenen', w, o2); } await p.screenshot({ path: `/tmp/claude-0/resp/szenen-${w}.png` });
  await p.locator('nav').getByRole('button', { name: '❓ Fragen' }).click(); await p.waitForSelector('.qcard2'); await p.getByRole('button', { name: '＋ Neue Frage' }).click(); await p.waitForSelector('.gamepick'); await p.screenshot({ path: `/tmp/claude-0/resp/picker-${w}.png` });
  await p.close();
}
console.log(bad ? bad + ' Overflows' : 'kein horizontaler Überlauf'); await b.close();
