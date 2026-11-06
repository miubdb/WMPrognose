// Browser-E2E des Übertragungswegs: Server A (= "Online-Admin") -> UI-Export -> Server B (= "Laptop") -> UI-Import -> Raum -> Glitch-Runde auf Handy.
// Startet beide Server selbst (zwei getrennte Datenbanken). Aufruf: node tests/e2e/transfer.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { WebSocket } = require('/home/user/WMPrognose/node_modules/ws');
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SHOTS = process.env.SHOTS ?? '/tmp/claude-0/shots/transfer'; mkdirSync(SHOTS, { recursive: true });
const PW = 'transfer-e2e-pw-1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const servers = [];
const start = async (port) => {
  const dir = mkdtempSync(join(tmpdir(), 'outplay-xfer-'));
  const p = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_PASSWORD: PW }, stdio: 'ignore' });
  servers.push(p);
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://localhost:${port}/api/health`)).ok) return `http://localhost:${port}`; } catch { /* */ } await sleep(250); }
  throw new Error('Server startet nicht');
};
const A = await start(8093), B = await start(8094);
const api = (base) => { let cookie = ''; return async (method, path, body) => {
  if (!cookie) { const r = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: PW }) }); cookie = r.headers.get('set-cookie').split(';')[0]; }
  const r = await fetch(base + '/api/admin' + path, { method, headers: { 'content-type': 'application/json', 'x-outplay-admin': '1', cookie }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => ({})) }; }; };
const a = api(A);

// ---- Inhalte auf A vorbereiten (API; die Erstellung per Oberfläche deckt tests/e2e/admin.mjs ab)
const scene = (await a('POST', '/scenes', { template: { kind: 'list', title: 'Meine Speisekarte', style: 'menu', rows: [{ label: 'Suppe', value: '5,50' }, { label: 'Schnitzel', value: '14,90' }, { label: 'Kuchen', value: '4,20' }], changeRow: 1, newValue: '19,40' } })).data;
const gq = (await a('POST', '/questions', { task: { mode: 'glitch', prompt: 'Welcher Preis wurde verändert?', viewPrompt: 'Merk dir die Preise!', scene: scene.id, viewSeconds: 4, seconds: 30, points: 1000, explain: 'Das Schnitzel kostete 14,90 €.' }, topic: 'Transfer' })).data;
const cats = [(await a('POST', '/categories', { title: 'Meine Glitch-Kategorie', topic: 'Eigene', icon: '🧪', color: '#14d9c0', kind: 'tile', football: false, blurb: 'Tippe auf die Stelle.', taskIds: [gq.id] })).data.id];
for (let i = 1; i < 6; i++) { const q = (await a('POST', '/questions', { task: { mode: 'geo', prompt: `Geo ${i}: Wo liegt Berlin?`, map: 'germany', answer: { lat: 52.52, lon: 13.4, label: 'Berlin' }, seconds: 30, points: 1000, explain: 'Berlin.' }, topic: 'Transfer' })).data; cats.push((await a('POST', '/categories', { title: `Geo ${i}`, topic: 'Eigene', icon: '🧭', color: '#8b5cf6', kind: 'tile', football: false, blurb: 'Pin.', taskIds: [q.id] })).data.id); }
const u = [0, 1].map(async i => (await a('POST', '/questions', { task: { mode: 'unique', prompt: ['Nenne eine Ampelfarbe', 'Nenne ein Haustier'][i], placeholder: '…', seconds: 30, pointsUnique: 500, pointsShared: 100, explain: 'x.', valid: [{ name: ['Rot', 'Hund'][i], variants: [] }, { name: ['Gelb', 'Katze'][i], variants: [] }, { name: ['Grün', 'Hamster'][i], variants: [] }] } })).data.id);
const uq = await Promise.all(u);
const sur = (await a('POST', '/categories', { title: 'Überraschung', topic: 'x', icon: '✨', color: '#ec4899', kind: 'surprise', football: false, blurb: 'Einzigartig!', taskIds: uq })).data.id;
const fq = [0, 1].map(async i => (await a('POST', '/questions', { task: { mode: 'geo', prompt: `Finale ${i}: Wo liegt Berlin?`, map: 'germany', answer: { lat: 52.52, lon: 13.4, label: 'Berlin' }, seconds: 30, points: 1000, explain: 'Berlin.' } })).data.id);
const fin = (await a('POST', '/categories', { title: 'Finale', topic: 'x', icon: '🔒', color: '#f5b82e', kind: 'final', football: false, blurb: 'Final.', taskIds: await Promise.all(fq) })).data.id;
const pack = (await a('POST', '/packs', { name: 'Samstag-Abend', description: 'Online vorbereitet', categoryIds: cats, surprise: sur, final: fin, rules: { startCredit: 200, maxFootball: 2, maxPerMode: 6 } })).data;
check((await a('POST', `/packs/${pack.id}/publish`, { note: 'v1' })).status === 200, 'Paket auf Server A veröffentlicht');

const browser = await chromium.launch();
// ---- UI-Export auf A
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const pa = await ctxA.newPage(); pa.on('pageerror', e => { failures++; console.log('pageerror A', e.message); });
await pa.goto(A + '/admin'); await pa.getByLabel('Admin-Passwort').fill(PW); await pa.getByRole('button', { name: 'Anmelden' }).click(); await pa.waitForSelector('.admtop');
await pa.getByRole('button', { name: '⇅ Daten' }).click(); await pa.waitForSelector('.bigcard');
await pa.locator('.bigcard select').first().selectOption({ label: 'Samstag-Abend (v1)' });
await pa.screenshot({ path: `${SHOTS}/1-export.png` });
const [dl] = await Promise.all([pa.waitForEvent('download'), pa.getByRole('button', { name: '📤 Spieleabend exportieren' }).click()]);
const file = join(mkdtempSync(join(tmpdir(), 'dl-')), await dl.suggestedFilename()); await dl.saveAs(file);
const exported = JSON.parse(readFileSync(file, 'utf8')); check(exported.counts.questions === 10 && exported.counts.scenes === 1 && exported.packs[0].bookHash, `Exportdatei vollständig (${JSON.stringify(exported.counts)})`);

// ---- UI-Import auf B
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 1000 } }); const pb = await ctxB.newPage(); pb.on('pageerror', e => { failures++; console.log('pageerror B', e.message); });
await pb.goto(B + '/admin'); await pb.getByLabel('Admin-Passwort').fill(PW); await pb.getByRole('button', { name: 'Anmelden' }).click(); await pb.waitForSelector('.admtop');
await pb.getByRole('button', { name: '⇅ Daten' }).click(); await pb.waitForSelector('.bigcard');
await pb.locator('input[type=file]').setInputFiles(file); await pb.waitForSelector('.card h4:has-text("Prüfung")'); await sleep(400);
await pb.screenshot({ path: `${SHOTS}/2-import-pruefung.png`, fullPage: true });
check(await pb.getByText('nichts wurde gespeichert').count() > 0, 'Trockenlauf zeigt den Bericht, ohne zu speichern');
await pb.getByRole('button', { name: '✅ Importieren & veröffentlichen' }).click(); await pb.waitForSelector('.card h4:has-text("Import abgeschlossen")'); await sleep(400);
await pb.screenshot({ path: `${SHOTS}/3-import-fertig.png`, fullPage: true });
check(await pb.getByText('Inhalt stimmt mit dem Export überein').count() > 0, 'Bestätigung: veröffentlicht und Inhalt stimmt mit dem Export überein');
await pb.reload(); await pb.waitForSelector('.admtop');
check((await pb.evaluate(async () => (await (await fetch('/api/admin/questions?topic=Transfer', { headers: { 'x-outplay-admin': '1' } })).json()).length)) === 6, 'Importierte Fragen bleiben nach dem Neuladen erhalten');
await pb.getByRole('button', { name: '🖼️ Szenen' }).click(); await sleep(600); await pb.screenshot({ path: `${SHOTS}/4-szenen-importiert.png` });
check(await pb.getByText('Meine Speisekarte').count() > 0, 'Eigene Glitch-Szene ist auf Server B vorhanden');

// ---- Raum auf B mit dem Paket, TV über localhost (QR darf nicht localhost enthalten)
const hostPage = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); hostPage.on('pageerror', e => { failures++; console.log('pageerror HOST', e.message); });
await hostPage.goto(B + '/host'); await hostPage.waitForSelector('select'); await hostPage.getByRole('button', { name: /Klassisch/ }).click(); await hostPage.locator('select').selectOption({ label: 'Samstag-Abend (v1)' }); await hostPage.getByText('Spielraum erstellen').click(); await hostPage.waitForSelector('.roomtag b');
const code = (await hostPage.locator('.roomtag b').first().innerText()).trim();
const key = await hostPage.evaluate(() => JSON.parse(localStorage.getItem('outplay.host')).key);
const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); await tv.goto(`${B}/tv/${code}`); await tv.getByText('Bildschirm starten').click(); await tv.waitForSelector('.roomcode'); await sleep(800);
const qrUrl = await tv.locator('.qr').getAttribute('data-url').catch(() => null);
check(!!qrUrl && !/localhost|127\.0\.0\.1/.test(qrUrl), `QR-Code zeigt LAN-Adresse statt localhost: ${qrUrl}`);
await tv.screenshot({ path: `${SHOTS}/5-tv-lobby.png` });
const joinPage = await hostPage.locator('.lobbyhost, .hostside').first().innerText().catch(() => ''); void joinPage;
await hostPage.screenshot({ path: `${SHOTS}/6-host-lobby.png` });

// ---- Spieler (echte Browser), Host über WebSocket
const phones = []; const ids = [], toks = [];
for (let i = 0; i < 3; i++) { const j = await (await fetch(`${B}/api/rooms/${code}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: ['Anna', 'Ben', 'Cem'][i], avatar: { face: i, skin: i, hair: i, hairColor: i, hat: 0, shirt: i, shirtColor: i, acc: 0, bg: i } }) })).json(); ids.push(j.playerId); toks.push(j.token);
  const ctx = await browser.newContext(devices['Pixel 7']); await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`outplay.player.${code}`, JSON.stringify({ playerId: j.playerId, token: j.token, recovery: 'X' })]); const p = await ctx.newPage(); await p.goto(`${B}/play/${code}`); await p.waitForSelector('.topbar'); phones.push(p); }
let hv = null; const acks = new Map(); let n = 0;
const ws = new WebSocket(B.replace('http', 'ws') + '/ws'); await new Promise(res => { ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', role: 'host', room: code, key }))); ws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hv = m.view; res(); } if (m.t === 'ack') acks.set(m.reqId, m); if (m.t === 'ping') ws.send('{"t":"pong"}'); }); });
const H = async act => { const id = 'x' + ++n; ws.send(JSON.stringify({ t: 'act', reqId: id, a: act })); while (!acks.has(id)) await sleep(30); await sleep(80); return acks.get(id); };
const wait = async (f, ms = 8000) => { const t0 = Date.now(); while (!f(hv)) { if (Date.now() - t0 > ms) throw new Error('timeout'); await sleep(50); } };
await H({ k: 'h.startShow' }); await H({ k: 'h.introDone' }); await wait(v => v.room.phase === 'wall');
await H({ k: 'h.pick', tileId: hv.wall.tiles.find(t => t.title === 'Meine Glitch-Kategorie').id }); await H({ k: 'h.begin' }); await sleep(1200);
await tv.screenshot({ path: `${SHOTS}/7-tv-glitch-view.png` });
await H({ k: 'h.lock' }); await phones[0].waitForSelector('.phonescene'); await sleep(500);
const zone = hv.round.data.zones[0];
const box = await phones[0].locator('.phonescene').boundingBox(); await phones[0].mouse.click(box.x + box.width * (zone.x / 1000), box.y + box.height * (zone.y / 600));
await phones[0].getByRole('button', { name: 'Markierung abgeben' }).click(); await phones[0].waitForSelector('.status.ok');
await phones[0].screenshot({ path: `${SHOTS}/8-phone-glitch.png` });
await H({ k: 'h.reveal' }); await sleep(3000); await tv.screenshot({ path: `${SHOTS}/9-tv-reveal.png` });
const s0 = hv.players.find(p => p.id === ids[0]).score; check(s0 >= 200 + 700, `Importierte Glitch-Frage mit eigener Szene gespielt und ausgewertet (Punkte: ${s0})`);
ws.close(); await browser.close(); servers.forEach(s => s.kill());
console.log(failures ? `\n${failures} FEHLER` : '\nE2E-Transfer OK'); process.exit(failures ? 1 : 0);
