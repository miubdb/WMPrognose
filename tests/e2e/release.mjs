// Abnahme des Windows-Pakets wie bei einem Freund: ZIP entpacken (ohne Quellcode/node_modules), starten, Passwort einrichten,
// zwei Standardpakete prüfen, eigenes Paket anlegen, Passwort zurücksetzen, Update über bestehende Daten.
import { createRequire } from 'node:module'; import { spawn, spawnSync } from 'node:child_process'; import { mkdirSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
const require = createRequire('/home/user/WMPrognose/'); const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const SHOTS = '/tmp/claude-0/shots-release'; mkdirSync(SHOTS, { recursive: true });
const ROOT = '/tmp/friend-pc'; rmSync(ROOT, { recursive: true, force: true }); mkdirSync(ROOT);
spawnSync('unzip', ['-q', '/home/user/WMPrognose/release-out/JANIQUIZITION-Windows.zip', '-d', ROOT]); const DIR = ROOT + '/JANIQUIZITION';
const PORT = 8130, BASE = `http://localhost:${PORT}`, PW = 'Mein sicheres Admin-Passwort 1';
// „Windows“-Umgebung ohne Entwicklerwerkzeuge: leeres Arbeitsverzeichnis, kein node_modules, keine Projektdateien
const start = () => { const out = []; const p = spawn(process.execPath, ['app/launcher.mjs'], { cwd: DIR, env: { PATH: process.env.PATH, HOME: ROOT, PORT: String(PORT), JANIQ_NO_BROWSER: '1' }, stdio: ['ignore', 'pipe', 'pipe'] }); p.stdout.on('data', d => out.push(String(d))); p.stderr.on('data', d => out.push(String(d))); return { p, out }; };
const waitUp = async () => { for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE + '/api/health')).ok) return true; } catch { /* */ } await sleep(500); } return false; };
const stop = async s => { s.p.kill('SIGTERM'); await sleep(1500); };
check(!existsSync(DIR + '/node_modules') && !existsSync(DIR + '/package.json') && !existsSync(DIR + '/server'), 'Paket enthält keinen Quellcode und kein node_modules');
check(!readdirSync(DIR, { recursive: true }).some(f => /\.(db|env)$|admin-passwort|backups/.test(String(f))), 'Paket enthält keine Datenbank, Passwörter oder Backups');
check(readFileSync(DIR + '/JANIQUIZITION-STARTEN.bat', 'utf8').includes('\r\n'), 'Bat-Dateien haben Windows-Zeilenenden');
let s = start(); check(await waitUp(), 'Erststart: Server läuft ohne Installation'); const txt = s.out.join('');
check(/ERSTER START/.test(txt) && /localhost:8130\/admin/.test(txt) && /\/host/.test(txt), 'Startfenster zeigt Links und Hinweis zum ersten Start'); check(!/admin-passwort\.txt/i.test(txt), 'Kein Passwort in Datei/Konsole');
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } }); const p = await ctx.newPage(); p.on('pageerror', e => { failures++; console.log('pageerror', e.message); });
await p.goto(BASE + '/admin'); await p.waitForSelector('text=Willkommen bei JANIQUIZITION'); check(await p.getByText('damit nur du Fragen und Spieleabende verändern kannst').count() === 1, 'Einrichtungsdialog erscheint'); await p.screenshot({ path: SHOTS + '/1-setup.png' });
const btn = p.getByRole('button', { name: /Passwort speichern/ }); await p.getByLabel('Admin-Passwort wählen').fill('kurz'); await p.getByLabel('Passwort wiederholen').fill('kurz'); check(await btn.isDisabled(), 'Zu kurzes Passwort wird abgelehnt');
await p.getByLabel('Admin-Passwort wählen').fill(PW); await p.getByLabel('Passwort wiederholen').fill(PW + 'x'); check(await btn.isDisabled(), 'Ungleiche Wiederholung wird abgelehnt');
await p.getByLabel('Passwort wiederholen').fill(PW); await btn.click(); await p.waitForSelector('.admtop'); check(await p.getByRole('dialog').getByText('Erste Schritte').count() + await p.locator('text=Erste Schritte').count() > 0, 'Nach der Einrichtung: „Erste Schritte“ wird einmal angeboten'); await p.screenshot({ path: SHOTS + '/2-erste-schritte.png' });
await p.getByRole('button', { name: 'Verstanden' }).click(); await sleep(300); check(await p.locator('text=Erste Schritte').count() === 0, 'Hilfe schließt sich'); await p.screenshot({ path: SHOTS + '/3-start.png' });
await p.getByRole('button', { name: '❔ Hilfe' }).click(); check(await p.locator('text=Erste Schritte').count() > 0, 'Hilfe jederzeit wieder aufrufbar'); await p.getByRole('button', { name: 'Verstanden' }).click();
await p.locator('nav').getByRole('button', { name: '📦 Pakete' }).click(); await p.waitForSelector('.bigpack'); await p.screenshot({ path: SHOTS + '/4-pakete.png' });
const names = await p.locator('.bigpack b').allInnerTexts(); check(names.length === 2 && names.includes('Kickbase-Abend bei MJ – Hauptversion') && names.includes('Kickbase-Abend bei MJ – Zweite Version'), 'Genau zwei Standardpakete: ' + names.join(' | '));
const page = await p.locator('.adm').innerText(); check(!/Alte Pakete|archiviert|Archiv|Übersicht aufgeräumt|Was bedeuten|Reus 65|Testlabor|Testpaket/i.test(page), 'Keine Alt-Pakete, Archiv- oder Legacy-Hinweise in der Paketübersicht'); check(await p.locator('.pcard').count() === 0, 'Keine weiteren Pakete');
// eigenes Paket
await p.getByRole('button', { name: /Neues Paket erstellen/ }).first().click(); await p.waitForSelector('.dlg, .modalbox'); await p.locator('.dlg input, .modalbox input').first().fill('Mein erster Abend'); await p.locator('.dlg, .modalbox').last().getByRole('button', { name: /erstellen|Anlegen|Weiter/i }).last().click(); await p.waitForSelector('.builder'); await sleep(1200);
check((await p.getByLabel('Paketname').inputValue()) === 'Mein erster Abend', 'Eigenes Paket lässt sich neu erstellen'); await p.getByRole('button', { name: /Alle Pakete/ }).first().click(); await p.waitForSelector('.pcard'); check(await p.locator('.pcard').count() === 1 && await p.locator('.bigpack').count() === 2, 'Eigenes Paket erscheint zusätzlich zu den zwei Standardpaketen');
// Spielmodi & Fragen
await p.locator('nav').getByRole('button', { name: '❓ Fragen' }).click(); await p.waitForSelector('.qcard2'); const n = await p.locator('.qcard2').count(); check(n > 20, 'Fragenbibliothek gefüllt (' + n + ' sichtbar)');
// Host sieht beide Pakete, Raum anlegen
const host = await (await browser.newContext()).newPage(); await host.goto(BASE + '/host'); await host.waitForSelector('select'); const opts = await host.locator('select option').allInnerTexts(); check(opts.some(o => /Hauptversion/.test(o)) && opts.some(o => /Zweite Version/.test(o)), 'Showmaster-Pult bietet beide Standardpakete: ' + opts.join(' | '));
await host.getByText('Spielraum erstellen').click(); await host.waitForSelector('.roomtag b'); check(true, 'Spielraum erstellt');
// Abmelden / Anmelden / falsches Passwort
await p.getByRole('button', { name: 'Abmelden' }).click(); await p.waitForSelector('text=Admin-Bereich'); await p.getByLabel('Admin-Passwort').fill('falsch-falsch-falsch'); await p.getByRole('button', { name: 'Anmelden' }).click(); await p.waitForSelector('.status.bad'); check(true, 'Falsches Passwort wird abgelehnt');
await p.getByLabel('Admin-Passwort').fill(PW); await p.getByRole('button', { name: 'Anmelden' }).click(); await p.waitForSelector('.admtop'); check(true, 'Anmeldung mit eigenem Passwort');
// Neustart: Daten und Passwort bleiben; Update-Schutz (neue Version → Sicherheitskopie)
await stop(s); writeFileSync(DIR + '/VERSION', '1.0.1\r\n'); s = start(); check(await waitUp(), 'Neustart nach „Update“ (neue VERSION über bestehende Daten)');
check(readdirSync(DIR + '/data/backups').some(f => /vor-update-auf-1\.0\.1/.test(f)), 'Vor dem Update wurde eine Sicherheitskopie angelegt'); check(/Sicherheitskopie/.test(s.out.join('')), 'Update-Hinweis im Startfenster');
const p2 = await (await browser.newContext()).newPage(); await p2.goto(BASE + '/admin'); await p2.waitForSelector('text=Admin-Bereich'); await p2.getByLabel('Admin-Passwort').fill(PW); await p2.getByRole('button', { name: 'Anmelden' }).click(); await p2.waitForSelector('.admtop'); check(true, 'Admin-Zugang bleibt nach Update gültig');
await p2.locator('nav').getByRole('button', { name: '📦 Pakete' }).click(); await p2.waitForSelector('.bigpack'); check(await p2.locator('.pcard').count() === 1 && await p2.locator('.bigpack').count() === 2, 'Eigenes Paket und Standardpakete nach Update unverändert');
await p2.locator('nav').getByRole('button', { name: /Sicherung/ }).click(); await sleep(800); check(/Keine Aktualisierung notwendig|Aktuell/.test(await p2.locator('.adm').innerText()), 'Update-Status: Aktuell (nichts wird zurückgesetzt)');
// Passwort vergessen
await stop(s); const rs = spawnSync(process.execPath, ['app/reset-admin.mjs'], { cwd: DIR, env: { PATH: process.env.PATH }, encoding: 'utf8' }); check(/zurückgesetzt/.test(rs.stdout), 'Passwort-Reset-Skript läuft: ' + rs.stdout.trim().split('\n')[0]);
s = start(); await waitUp(); const p3 = await (await browser.newContext()).newPage(); await p3.goto(BASE + '/admin'); await p3.waitForSelector('text=Willkommen bei JANIQUIZITION'); check(true, 'Nach Reset: neues Passwort wird eingerichtet (alter Zugang ungültig)');
await p3.getByLabel('Admin-Passwort wählen').fill('Ganz neues Passwort 2026'); await p3.getByLabel('Passwort wiederholen').fill('Ganz neues Passwort 2026'); await p3.getByRole('button', { name: /Passwort speichern/ }).click(); await p3.waitForSelector('.admtop'); await p3.getByRole('button', { name: 'Verstanden' }).click(); await p3.locator('nav').getByRole('button', { name: '📦 Pakete' }).click(); await p3.waitForSelector('.bigpack'); check(await p3.locator('.pcard').count() === 1, 'Nach Reset: alle Inhalte (inkl. eigenes Paket) noch da');
// Einrichtung aus dem Netzwerk wird verweigert (anderer Host-Header)
await stop(s); rmSync(DIR + '/data', { recursive: true, force: true }); s = start(); await waitUp();
const { request } = await import('node:http'); const r = await new Promise(res => { const q = request({ host: '127.0.0.1', port: PORT, path: '/api/admin/setup', method: 'POST', headers: { 'content-type': 'application/json', host: '192.168.1.20:8130' } }, x => { x.resume(); res({ status: x.statusCode }); }); q.on('error', () => res(null)); q.end(JSON.stringify({ password: PW, confirm: PW })); }); check(!r || r.status === 403, 'Einrichtung über fremde Adresse (WLAN) abgelehnt');
await browser.close(); await stop(s); console.log(failures ? `\n${failures} Fehler` : '\nAlle Release-Prüfungen bestanden'); process.exit(failures ? 1 : 0);
