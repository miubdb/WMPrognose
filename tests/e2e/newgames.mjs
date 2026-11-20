// Browser-Test neue Spiele: LÜGEN HABEN KURZE BEINE, SCHÄTZKORRIDOR, VERDREHTE WELT (3 Handys + TV).
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url); const { chromium, devices } = require('playwright'); const { WebSocket } = require('ws');
const SHOTS = '/tmp/claude-0/shots-ng'; mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const AV = i => ({ face: i % 8, skin: i % 6, hair: (i * 2) % 9, hairColor: i % 8, hat: i % 6, shirt: i % 5, shirtColor: (i * 3) % 10, acc: i % 7, bg: i % 8 });
const PORT = 8098, BASE = `http://localhost:${PORT}`, DATA = '/tmp/outplay-ng-e2e'; rmSync(DATA, { recursive: true, force: true });
const srv = spawn('node', ['--import', 'tsx', 'server/index.ts'], { cwd: '/home/user/WMPrognose', env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(500); }
const post = async (p, b) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) })).json();
const room = await post('/api/rooms', { pack: 'show-new', flow: 'show' }); const code = room.code; check(!!code, 'Raum mit „Neue Spiele – Testlabor“');
const N = 3; const pls = []; for (let i = 0; i < N; i++) pls.push(await post(`/api/rooms/${code}/join`, { name: 'S' + (i + 1), avatar: AV(i + 1) }));
let hv = null; const acks = new Map(); let n = 0; const hws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
await new Promise(res => { hws.on('open', () => hws.send(JSON.stringify({ t: 'hello', role: 'host', room: code, key: room.hostKey }))); hws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hv = m.view; res(); } if (m.t === 'ack') acks.set(m.reqId, m); if (m.t === 'ping') hws.send('{"t":"pong"}'); }); });
const H = async a => { const id = 'e' + ++n; hws.send(JSON.stringify({ t: 'act', reqId: id, a })); while (!acks.has(id)) await sleep(30); await sleep(80); return acks.get(id); };
const waitH = async (pred, ms = 40000) => { const t0 = Date.now(); while (!pred(hv)) { if (Date.now() - t0 > ms) throw new Error('timeout ' + hv.room.phase + ' ' + hv.round?.stage); await sleep(50); } };
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const tvB = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const tv = await (await tvB.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); await tv.goto(`${BASE}/tv/${code}`); await tv.getByText('Bildschirm starten').click(); await tv.waitForSelector('.roomcode');
const pages = []; for (let i = 0; i < N; i++) { const ctx = await browser.newContext(devices['iPhone SE']); await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`outplay.player.${code}`, JSON.stringify({ playerId: pls[i].playerId, token: pls[i].token, recovery: 'X' })]); const p = await ctx.newPage(); await p.goto(`${BASE}/play/${code}`); await p.waitForSelector('.topbar'); pages.push(p); }
await H({ k: 'h.startShow' }); await H({ k: 'h.introDone' });
const goto = async tile => { for (let i = 0; i < 40 && !(hv.round?.tileId === tile && hv.room.phase === 'round'); i++) await H({ k: hv.room.phase === 'scoreboard' ? 'h.continue' : 'h.skipTile' }); };

// ---- LÜGEN HABEN KURZE BEINE
await goto('ng-r1'); await sleep(2500); let t = await tv.locator('body').innerText(); check(/LÜGEN HABEN KURZE BEINE/.test(t), 'TV zeigt den Spielnamen'); await tv.screenshot({ path: `${SHOTS}/bluff-rules.png` });
await H({ k: 'h.begin' }); await waitH(v => v.round.stage === 'open');
const lies = ['Käfer', 'Maus', 'Muschel'];
for (let i = 0; i < N; i++) { const p = pages[i]; await p.waitForSelector('.bluff input'); await p.locator('.bluff input').fill(i === 0 ? 'Schnecke' : lies[i]); await p.getByRole('button', { name: 'Lüge abgeben' }).click(); if (i === 0) { await p.waitForSelector('.status.bad', { timeout: 5000 }); const bt = await p.locator('.status.bad').innerText(); console.log('  Hinweistext:', bt); check(/zu nah an der Wahrheit/.test(bt), 'Wahrheit als Lüge wird mit Hinweis abgelehnt'); await p.locator('.bluff input').fill('Käfer'); await p.getByRole('button', { name: 'Lüge abgeben' }).click(); } }
await waitH(v => v.round.stage === 'bet'); await sleep(800); await tv.screenshot({ path: `${SHOTS}/bluff-pick.png` }); t = await tv.locator('body').innerText(); check(/Käfer/.test(t) && /Schnecke/.test(t) && !/DIE WAHRHEIT/.test(t), 'TV zeigt alle Antworten ohne die Wahrheit zu verraten');
for (let i = 0; i < N; i++) { const p = pages[i]; await p.waitForSelector('.optcard'); check((await p.locator('.optcard:disabled').count()) === 1, `Handy ${i + 1}: eigene Lüge ist gesperrt`); const truth = p.locator('.optcard:not([disabled])', { hasText: 'Schnecke' }); await (i === 1 ? p.locator('.optcard:not([disabled])', { hasText: 'Käfer' }) : truth).first().click(); await p.getByRole('button', { name: 'Diese Antwort wählen' }).click(); }
await waitH(v => v.round.stage === 'locked'); await H({ k: 'h.reveal' }); await waitH(v => v.round.stage === 'reveal'); await sleep(3500); await tv.screenshot({ path: `${SHOTS}/bluff-reveal.png` }); await pages[0].screenshot({ path: `${SHOTS}/bluff-phone-reveal.png` });
t = await tv.locator('body').innerText(); check(/DIE WAHRHEIT/.test(t) && /erfunden von/.test(t), 'Auflösung: Wahrheit und Erfinder sichtbar');

// ---- SCHÄTZKORRIDOR
await goto('ng-r2'); await H({ k: 'h.begin' }); await waitH(v => v.round.stage === 'open');
const rng = [[8000, 9500], [1000, 20000], [9000, 10000]];
for (let i = 0; i < N; i++) { const p = pages[i]; await p.waitForSelector('.corr input'); await p.locator('.corr input').nth(0).fill(String(rng[i][0])); await p.locator('.corr input').nth(1).fill(String(rng[i][1])); await p.getByRole('button', { name: 'Korridor abgeben' }).click(); }
await waitH(v => v.round.stage === 'locked'); await H({ k: 'h.reveal' }); await waitH(v => v.round.stage === 'reveal'); await sleep(3000); await tv.screenshot({ path: `${SHOTS}/corridor-reveal.png` }); await pages[0].screenshot({ path: `${SHOTS}/corridor-phone.png` });
t = await tv.locator('body').innerText(); check(/8\.849/.test(t) || /8849/.test(t), 'Auflösung nennt die Lösung'); check((await tv.locator('.corrbar.hit').count()) === 2 && (await tv.locator('.corrbar.miss').count()) === 1, 'Zwei Treffer, ein Fehlschuss im Korridor-Diagramm');

// ---- VERDREHTE WELT
await goto('ng-r3'); await H({ k: 'h.begin' }); await waitH(v => v.round.stage === 'open'); await sleep(500); await tv.screenshot({ path: `${SHOTS}/twist-tv.png` });
const an = ['fast and furious', 'Fast & Furious', 'Taxi Driver'];
for (let i = 0; i < N; i++) { const p = pages[i]; await p.waitForSelector('.twist input'); if (i === 0) await p.screenshot({ path: `${SHOTS}/twist-phone.png` }); await p.locator('.twist input').fill(an[i]); await p.getByRole('button', { name: 'Antwort abgeben' }).click(); }
await waitH(v => v.round.stage === 'locked'); await H({ k: 'h.reveal' }); await waitH(v => v.round.stage === 'reveal'); await sleep(1500); await tv.screenshot({ path: `${SHOTS}/twist-reveal.png` });
t = await tv.locator('body').innerText(); check(/Fast & Furious/.test(t), 'Auflösung nennt das Original');
const sc = hv.players.map(p => p.score); console.log('  Punkte:', sc.join(', ')); check(sc.every(x => x >= 0), 'keine negativen Punkte');
await browser.close(); await tvB.close(); hws.close(); srv.kill();
console.log(failures ? `\n${failures} Fehler` : '\nAlle Browser-Prüfungen bestanden'); process.exit(failures ? 1 : 0);
