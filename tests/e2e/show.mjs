// E2E Showmodus mit echten Browsern: Host-Oberfläche (Klicks), TV, 7 Handys (Beitritt über die echte Oberfläche inkl. Avatar/QR),
// komplette feste Show „Reus 65 Mio“ (31 gewertete Aufgaben + 7 Proberunden) in Reihenfolge, Serverneustart mitten in einer Runde, Handy-Reload, Siegerehrung.
// Antworten der Handys: erste Geo-Aufgabe per echtem Karten-Tipp im Browser; alle übrigen Aufgaben über das Handy-Protokoll
// (WebSocket mit dem Spieler-Schlüssel – exakt die Nachrichten, die die Handy-Oberfläche sendet).
// Start: node --import tsx tests/e2e/show.mjs   (startet den Server selbst, frische Datenbank, Port 8092)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { WebSocket } = require('ws');
const { TILES, SEED_SHOW, SEED_SHOW2, SEED_SHOW3, SEED_SHOW_B42 } = await import('../../content/index.ts');
const BEST = process.env.PACK === 'best42';

const PORT = 8092, BASE = `http://localhost:${PORT}`, DATA = '/tmp/outplay-show-e2e';
const SHOTS = process.env.SHOTS ?? '/tmp/claude-0/shots-show';
mkdirSync(SHOTS, { recursive: true }); rmSync(DATA, { recursive: true, force: true });
const shot = async (pg, path) => { try { await pg.screenshot({ path, timeout: 20000 }); } catch { console.log('  (Screenshot ausgelassen: ' + path + ')'); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };

// ---------- Aufgaben-Lookup (für sinnvolle Bot-Antworten) ----------
const Q = new Map();
for (const t of TILES) t.tasks.forEach((task, i) => Q.set(`${t.id}-${i + 1}`, task));
for (const q of [...SEED_SHOW.pool, ...SEED_SHOW2.pool, ...SEED_SHOW3.pool, ...SEED_SHOW_B42.pool]) Q.set(q.id, q.task);
const ROUND = new Map([...SEED_SHOW.rounds, ...SEED_SHOW3.rounds, ...SEED_SHOW_B42.rounds].map(r => [r.id, r]));
const taskOf = (tileId, idx) => Q.get(ROUND.get(tileId).taskIds[idx]);

// ---------- Server ----------
let srv = null;
const startServer = async () => {
  srv = spawn('node', ['--import', 'tsx', 'server/index.ts'], { cwd: '/home/user/WMPrognose', env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { const r = await fetch(BASE + '/api/health'); if (r.ok) return; } catch { /* warten */ } await sleep(500); }
  throw new Error('Server startet nicht');
};
const stopServer = async () => { srv.kill('SIGKILL'); await sleep(800); };
await startServer();

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const phoneBrowser = await chromium.launch(); // Handys ohne WebGL → SVG-Kartenfallback (spart CPU); TV zeigt die echte Vektorkarte
const hostPage = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
hostPage.on('pageerror', e => console.log('HOST pageerror', e.message)); tv.on('pageerror', e => console.log('TV pageerror', e.message));

// 1. Raum im Showmodus (Standard)
await hostPage.goto(BASE + '/host');
check(await hostPage.getByRole('button', { name: /Showmodus/ }).count() === 1 && await hostPage.getByRole('button', { name: /Klassisch/ }).count() === 1, 'Host-Anmeldung bietet Showmodus und Klassischen Modus an');
await hostPage.getByText('Spielraum erstellen').click(); await hostPage.waitForSelector('.roomtag b');
const code = (await hostPage.locator('.roomtag b').first().innerText()).trim();
check(/^[A-Z0-9]{4,5}$/.test(code), 'Raum erstellt: ' + code);
const hostSess = JSON.parse(await hostPage.evaluate(() => localStorage.getItem('outplay.host') ?? Object.entries(localStorage).find(([k]) => k.includes('outplay.host'))?.[1]));
const hostKey = hostSess.key ?? hostSess.v?.key;
check(!!hostKey, 'Host-Schlüssel vorhanden');
await tv.goto(`${BASE}/tv/${code}`); await tv.getByText('Bildschirm starten').click(); await tv.waitForSelector('.roomcode');
check(await tv.locator('.qr svg').count() > 0, 'TV zeigt QR-Code');

// 2. 7 Handys treten über die echte Oberfläche bei (mit Avatar-Editor)
const names = ['Anna', 'Ben', 'Cem', 'Dana', 'Eli', 'Fiete', 'Gabi'];
const phones = [];
for (let i = 0; i < 7; i++) {
  const ctx = await phoneBrowser.newContext(devices[i % 2 ? 'Pixel 7' : 'iPhone 13']);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log(`P${i} pageerror`, e.message));
  await p.goto(`${BASE}/play/${code}`);
  await p.getByPlaceholder('z. B. Alex').fill(names[i]);
  if (i === 0) { await p.getByRole('button', { name: 'Frisur' }).click(); await sleep(200); }
  await p.getByRole('button', { name: 'Beitreten', exact: true }).click(); await p.waitForSelector('.topbar');
  const stored = JSON.parse(await p.evaluate(c => Object.entries(localStorage).find(([k]) => k.includes('outplay.player.' + c))?.[1], code));
  phones.push({ p, ctx, name: names[i], token: stored.token ?? stored.v?.token, pid: stored.playerId ?? stored.v?.playerId, ws: null });
}
await tv.waitForFunction(n => document.querySelectorAll('.cand').length === n, 7);
check(true, '7 Avatare in der TV-Lobby');
await shot(tv, `${SHOTS}/tv-lobby.png`);

// 3. WebSocket-Verbindungen (Host-Beobachter + Handy-Protokoll)
let hostView = null; const acks = new Map(); let hws;
const connectHost = () => new Promise(res => { hws = new WebSocket(BASE.replace('http', 'ws') + '/ws'); hws.on('open', () => hws.send(JSON.stringify({ t: 'hello', role: 'host', room: code, key: hostKey }))); hws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hostView = m.view; res(); } if (m.t === 'ping') hws.send('{"t":"pong"}'); }); hws.on('error', () => {}); });
const connectPhone = ph => new Promise(res => { ph.view = null; ph.ws = new WebSocket(BASE.replace('http', 'ws') + '/ws'); ph.ws.on('open', () => ph.ws.send(JSON.stringify({ t: 'hello', role: 'player', room: code, key: ph.token }))); ph.ws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { ph.view = m.view; res(); } if (m.t === 'ack') acks.set(m.reqId, m); if (m.t === 'ping') ph.ws.send('{"t":"pong"}'); }); ph.ws.on('error', () => {}); });
await connectHost(); for (const ph of phones) await connectPhone(ph);
let rq = 0;
const send = async (ph, payload) => { const id = 'r' + ++rq; ph.ws.send(JSON.stringify({ t: 'act', reqId: id, a: { k: 'submit', payload } })); for (let i = 0; i < 60 && !acks.has(id); i++) await sleep(50); return acks.get(id); };

// 4. Host-Bedienung ausschließlich über die Oberfläche
const click = async (re, ms = 6000) => { const b = hostPage.getByRole('button', { name: re }).first(); await b.waitFor({ timeout: ms }); await b.click(); };
await hostPage.waitForFunction(n => document.querySelectorAll('.plist li').length === n, 7);
await click(/Lobby schließen/);
await tv.waitForSelector('.introgrid'); check(true, 'TV zeigt Eröffnung (Kandidatenvorstellung)');
await sleep(1500); check(await tv.locator('.agenda').count() === 0 && (await tv.locator('.showtitle').textContent()).includes('Reus 65 Mio'), 'Eröffnung: ruhig, ohne Modus-Liste, mit Showtitel „Reus 65 Mio“');
await sleep(5200);
await click(/Weiter zur ersten Runde/);
await sleep(800);
check(await tv.locator('.wall').count() === 0, 'keine Kategorienwand im Showmodus');

// 5. Bot-Antworten je Modus (Handy-Protokoll)
async function answer(mode, task, stage) {
  const ps = phones;
  if (mode === 'geo') { for (let i = 0; i < 7; i++) { if (i === 6) continue; await send(ps[i], { lat: task.answer.lat + (i - 3) * 1.5, lon: task.answer.lon + (i - 2) * 2 }); } }
  else if (mode === 'estimate') {
    if (stage === 'open') for (let i = 0; i < 7; i++) await send(ps[i], { value: Math.round(task.answer * (0.5 + i * 0.15)) });
    else { const gs = ps.map(p => p.pid); const bets = hostView.round.data.bets; for (let i = 0; i < 7; i++) await send(ps[i], { amount: bets[i % bets.length], target: gs[(i + 1) % 7] }); }
  }
  else if (mode === 'rank' && hostView.round.data.variant === 'sort') { const perfect = [0, 1, 2, 3, 4]; for (let i = 0; i < 7; i++) await send(ps[i], { order: i % 3 === 0 ? perfect : i % 3 === 1 ? [1, 0, 2, 3, 4] : [4, 3, 2, 1, 0] }); }
  else if (mode === 'rank') { for (let step = 0; step < task.order.length; step++) { await waitHost(v => v.round?.stage === 'open' && v.round.data.step === step || v.round?.stage !== 'open', 15000); if (hostView.round.stage !== 'open') break; for (let i = 0; i < 7; i++) await send(ps[i], { step, slot: i % 2 ? task.order[step] : (task.order[step] + i) % task.items.length }); await sleep(250); } }
  else if (mode === 'glitch') { const z = task.zone ?? task.zones?.[0]; const pt = hostView.round.data.zones?.[0]; for (let i = 0; i < 7; i++) await send(ps[i], i % 3 === 0 && pt ? { x: pt.x, y: pt.y } : { x: 100 + i * 80, y: 120 + i * 40 }); }
  else if (mode === 'unique') { const names = task.valid.map(v => v.name); for (let i = 0; i < 7; i++) await send(ps[i], { answer: i < 2 ? names[0] : i === 2 ? 'Atlantis' : names[i % names.length] }); }
  else if (mode === 'match') { const perfect = [0, 1, 2, 3, 4, 5].map(k => task.order.indexOf(k)); for (let i = 0; i < 6; i++) await send(ps[i], { pairs: i === 0 ? perfect : perfect.map((_, k) => perfect[(k + i) % 6]), final: true }); }
  else if (mode === 'link') { for (let i = 0; i < 6; i++) await send(ps[i], { answer: i % 2 === 0 ? task.answer : 'Phantasie' + i }); }
}
const waitHost = async (pred, ms = 8000) => { const t0 = Date.now(); while (!pred(hostView)) { if (Date.now() - t0 > ms) throw new Error('timeout host wait ' + hostView.room.phase + ' ' + hostView.round?.stage); await sleep(40); } };

// 6. Fahrplan
const played = [], modesSeen = new Set(), tilesOrder = [], boards = [], shotModes = new Set();
let liveSeen = 0, liveInFinal = 0, brandOk = false; let restarted = false, firstGeoUi = false, leaks = 0, safety = 0;
const P = BEST ? 'b42' : 's5'; const TILEIDS = [`${P}-r1`, `${P}-r2`, `${P}-r3`, `${P}-sur`, `${P}-r4`, `${P}-r5`, `${P}-r6`, 's3-final'];
const practiceSeen = [];
while (hostView.room.phase !== 'ceremony' && safety++ < 900) {
  const v = hostView, ph = v.room.phase;
  if (ph === 'scoreboard') { boards.push(v.scoreboard.title + ' | nächster Schritt: ' + v.host?.planNext); await shot(tv, `${SHOTS}/tv-board-${boards.length}.png`); await sleep(1500); await click(/Weiter \(/); await sleep(300); continue; }
  if (ph !== 'round') { await sleep(250); continue; }
  const r = v.round; const key = `${r.tileId}#${r.taskIndex}`;
  if (!tilesOrder.includes(r.tileId)) { tilesOrder.push(r.tileId); await sleep(2200); await shot(tv, `${SHOTS}/tv-round-${r.tileId}.png`); }
  const task = taskOf(r.tileId, r.taskIndex);
  if (r.stage === 'intro') {
    // Die Aufgabe startet NIE von selbst: nach 1,5 s muss sie noch im Intro stehen
    await sleep(1500); check(hostView.round.stage === 'intro' && hostView.round.deadline == null, `${key}: wartet auf Freigabe durch den Showmaster`);
    await click(/Aufgabe \d+ starten|Proberunde starten/); await waitHost(x => x.round.stage !== 'intro'); continue;
  }
  if (r.stage === 'view') { await sleep(600); await click(/Betrachtung beenden/); await waitHost(x => x.round.stage !== 'view'); continue; }
  if (r.stage === 'open' || r.stage === 'bet') {
    const mode = task.mode; modesSeen.add(mode);
    { const n = await tv.locator('.liverank').count(); if (r.kind === 'final') liveInFinal += n; else liveSeen += n; }
    if (!shotModes.has(mode)) { shotModes.add(mode); await sleep(900); await shot(tv, `${SHOTS}/tv-open-${mode}.png`); await shot(phones[0].p, `${SHOTS}/phone-open-${mode}.png`); }
    // keine Lösung vorzeitig sichtbar (TV + Handy)
    const bodyTv = await tv.locator('body').innerText(), bodyPh = await phones[1].p.locator('body').innerText();
    const secret = task.explain.slice(0, 28); if (bodyTv.includes(secret) || bodyPh.includes(secret)) { leaks++; console.log('  LEAK', key); }
    if (mode === 'geo' && !firstGeoUi) { // echter Karten-Tipp auf einem Handy
      firstGeoUi = true; const p = phones[0].p; await p.waitForSelector('.mapsvg, canvas.maplibregl-canvas'); await sleep(1200);
      const box = await p.locator('.mapsvg, canvas.maplibregl-canvas').first().boundingBox(); await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.4);
      await p.getByRole('button', { name: 'Tipp abgeben' }).click({ force: true }); await p.waitForSelector('.status.ok'); check(true, 'Geo: echter Karten-Tipp im Handy-Browser angenommen');
      for (let i = 1; i < 6; i++) await send(phones[i], { lat: task.answer.lat + i, lon: task.answer.lon - i });
    } else await answer(mode, task, r.stage);
    // Serverneustart mitten in der Runde (einmalig, in Runde 2 / Aufgabe 2 nach abgegebenen Antworten)
    if (!restarted && r.tileId === `${P}-r2` && r.taskIndex === 2) {
      restarted = true; const before = JSON.stringify({ t: hostView.round.tileId, i: hostView.round.taskIndex, sc: hostView.players.map(p => p.score) });
      hws.terminate(); phones.forEach(ph => ph.ws.terminate()); await stopServer(); await startServer(); await connectHost(); for (const ph of phones) await connectPhone(ph);
      const after = JSON.stringify({ t: hostView.round.tileId, i: hostView.round.taskIndex, sc: hostView.players.map(p => p.score) });
      check(before === after, 'Serverneustart mitten in Runde 2: Runde, Aufgabe und Punkte unverändert');
      await hostPage.reload(); await tv.reload(); await sleep(1500); if (await tv.getByText('Bildschirm starten').count()) await tv.getByText('Bildschirm starten').click();
      await phones[3].p.reload(); await phones[3].p.waitForSelector('.topbar'); check(true, 'Handy und Host-Oberfläche nach Neustart/Reload wieder verbunden');
      check(hostView.round.stage === r.stage, 'Stufe nach Neustart erhalten: ' + hostView.round.stage);
    }
    await sleep(500); if (['open', 'bet'].includes(hostView.round.stage)) { await click(/sperren/); await waitHost(x => x.round.stage !== r.stage || x.room.phase !== 'round'); } continue;
  }
  if (r.stage === 'locked' || r.stage === 'review') {
    if (r.stage === 'review') { for (let g = 0; g < 8; g++) { const b = hostPage.getByRole('button', { name: /✓ gültig/ }).first(); if (!(await b.count())) break; await b.click(); await sleep(150); } }
    await click(/Auflösung auf dem TV zeigen/); await waitHost(x => x.round.stage === 'reveal'); continue;
  }
  if (r.stage === 'reveal') {
    if (!played.includes(key)) { played.push(key); if (v.round.practice) practiceSeen.push(key); if (!v.round.practice && v.room.liveRank && v.room.hideScores === false) { /* Live-Ranking sichtbar */ } await sleep(1800); if (played.length % 6 === 1) await shot(tv, `${SHOTS}/tv-reveal-${played.length}.png`); }
    const last = v.round.taskIndex + 1 >= v.round.taskCount;
    await click(last ? /Runde abschließen/ : /^▶ Weiter zu Aufgabe/); await sleep(500); continue;
  }
  await sleep(250);
}
check(hostView.room.phase === 'ceremony', 'Siegerehrung erreicht');
const EXP = BEST ? 53 : 38; check(played.length === EXP && practiceSeen.length === 7, `${EXP - 7} gewertete Aufgaben (inkl. 4 Finale) + 7 Proberunden gespielt (${played.length}, davon Proben ${practiceSeen.length})`);
check(JSON.stringify(tilesOrder) === JSON.stringify(TILEIDS), 'Rundenreihenfolge fest: ' + tilesOrder.join(' → '));
check(modesSeen.size === 7, 'alle sieben Spielmodi gespielt: ' + [...modesSeen].join(', '));
check(boards.length === 3, `genau 3 Zwischenstände vor dem Finale (${boards.length}): ` + boards.join(' // '));
check(liveSeen > 0 && liveInFinal === 0, `Live-Ranking in normalen Runden sichtbar (${liveSeen}×), im FINAL LOCK nie (${liveInFinal}×)`);
check(leaks === 0, 'keine Lösung vorzeitig auf TV/Handy sichtbar');
check(hostView.players.every(p => p.score >= 0), 'keine negativen Punktestände');
console.log('  Endstand:', hostView.players.map(p => `${p.name} ${p.score}`).join(', '));

// 7. Siegerehrung bis zum Ende
for (let i = 0; i < 12 && (hostView.ceremony?.step ?? 0) < hostView.ceremony.steps - 1; i++) { await click(/Nächster Schritt/); await sleep(700); if (i === 0) await shot(tv, `${SHOTS}/tv-ceremony-1.png`); }
await sleep(800); await shot(tv, `${SHOTS}/tv-ceremony-end.png`);
check(hostView.ceremony.step === hostView.ceremony.steps - 1, 'Siegerehrung bis zum Schluss durchgeklickt');
brandOk = (await tv.locator('.winnerbanner').textContent().catch(() => '')).includes('Reus65Mio-Champion');
check(brandOk, 'Siegerehrung zeigt „Reus65Mio-Champion“');
await browser.close(); await phoneBrowser.close(); srv.kill('SIGKILL');
console.log(failures ? `\n${failures} FEHLER` : '\nALLES OK'); process.exit(failures ? 1 : 0);
