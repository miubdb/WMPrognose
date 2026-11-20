// Browser-Test Paket-Kuratierung: Vorschau, Bestätigung, Archivieren, Wiederherstellen, nichts gelöscht.
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { rmSync } from 'node:fs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const PORT = 8107, BASE = `http://localhost:${PORT}`, PW = 'pw-e2e-12345', DATA = '/tmp/outplay-curation-e2e'; rmSync(DATA, { recursive: true, force: true });
const srv = spawn('node', ['--import', 'tsx', 'server/index.ts'], { cwd: '/home/user/WMPrognose', env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, ADMIN_PASSWORD: PW }, stdio: 'ignore' });
for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(500); }
const browser = await chromium.launch(); const p = await (await browser.newContext({ viewport: { width: 1280, height: 1100 } })).newPage(); p.on('pageerror', e => { failures++; console.log('pageerror', e.message); });
await p.goto(BASE + '/admin'); await p.getByLabel('Admin-Passwort').fill(PW); await p.getByRole('button', { name: 'Anmelden' }).click(); await p.waitForSelector('.dash');
const api = path => p.evaluate(async path => (await fetch('/api/admin' + path)).json(), path);
const before = await api('/packs'); const active = before.filter(x => x.status !== 'archived'); const verBefore = Object.fromEntries(before.map(x => [x.id, x.currentVersion]));
await p.locator('nav').getByRole('button', { name: '📦 Pakete' }).click(); await p.waitForSelector('.pcard, .bigpack');
check(active.length > 2, `Ausgangslage: ${active.length} aktive Pakete`);
await p.getByRole('button', { name: /Übersicht aufräumen/ }).first().click(); await p.waitForSelector('.dlg, .modalbox'); await sleep(800);
const txt = await p.locator('.dlg, .modalbox').last().innerText();
check(/Hauptversion/.test(txt) && /Kickbase-Abend bei MJ – Hauptversion/.test(txt), 'Vorschau nennt Hauptversion „Kickbase-Abend bei MJ – Hauptversion“'); check(/Zweite Version/.test(txt), 'Vorschau nennt Zweite Version'); check(/Wird archiviert/.test(txt) && /Sicherung/.test(txt), 'Vorschau zeigt Archiv-Liste und Sicherung');
check(/nicht gelöscht|nicht gelöscht/.test(txt), 'Hinweis: nichts wird gelöscht'); check(/Online|online/.test(txt), 'Hinweis zur Trennung lokal/online');
check((await api('/packs')).filter(x => x.status !== 'archived').length === active.length, 'Vorschau verändert noch nichts');
const dlg = p.locator('.dlg, .modalbox').last(); const radios = dlg.locator('input[type=radio]'); if (!(await radios.first().isChecked().catch(() => false)) && !(await radios.nth(0).evaluate(e => [...document.querySelectorAll('input[name=second]')].some(r => r.checked)))) await dlg.locator('label.pickrow2', { hasText: 'show-5' }).first().click(); await sleep(500);
await dlg.getByRole('button', { name: /Archivieren/ }).click(); await p.waitForSelector('text=Die Paketübersicht ist aufgeräumt'); await p.locator('.dlg, .modalbox').last().getByRole('button', { name: 'Schließen', exact: true }).last().click(); await sleep(800);
const after = await api('/packs'); const act2 = after.filter(x => x.status !== 'archived');
check(act2.length === 2, 'Danach genau zwei aktive Pakete: ' + act2.map(x => x.name).join(' | ')); check(act2.some(x => x.name === 'Kickbase-Abend bei MJ – Hauptversion' && x.id === 'show-4z') && act2.some(x => x.name === 'Kickbase-Abend bei MJ – Zweite Version'), 'Hauptversion = show-4z, Zweite Version umbenannt');
check(after.length === before.length, 'Kein Paket gelöscht'); check(after.every(x => x.currentVersion === verBefore[x.id]), 'Veröffentlichte Versionen unverändert');
await p.waitForSelector('.bigpack'); check((await p.locator('.bigpack').count()) >= 2, '„Deine Spieleabende“ zeigt zwei große Karten');
await p.locator('details.packgroup summary', { hasText: 'Alte Pakete verwalten' }).click(); const arch = p.locator('details.packgroup', { hasText: 'Alte Pakete verwalten' }).locator('.pcard').first(); check(await arch.count() === 1, 'Archiv unter „Alte Pakete verwalten“ sichtbar');
await arch.locator('.rowmenu summary').click(); await arch.getByRole('button', { name: /Wieder aktivieren/ }).click(); await sleep(1000); const after2 = await api('/packs'); check(after2.filter(x => x.status !== 'archived').length === 3, 'Archiviertes Paket wieder aktiviert');
await browser.close(); srv.kill(); console.log(failures ? `\n${failures} Fehler` : '\nAlle Browser-Prüfungen bestanden'); process.exit(failures ? 1 : 0);
