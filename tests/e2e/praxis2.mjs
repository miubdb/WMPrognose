// E2E Praxistest 2 (echte Browser): Glitch-Trefferzonen auf mehreren Handygrößen (inkl. echter Textposition), Musik/Audio-Freigabe, Matchmaker-Auflösung auf 16:9.
// Start: node --import tsx tests/e2e/praxis2.mjs   (startet den Server selbst, Port 8093, frische Datenbank)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright'); const { WebSocket } = require('ws');
const PORT = 8093, BASE = `http://localhost:${PORT}`, DATA = '/tmp/outplay-p2-e2e', SHOTS = process.env.SHOTS ?? '/tmp/claude-0/shots-p2';
mkdirSync(SHOTS, { recursive: true }); rmSync(DATA, { recursive: true, force: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failures = 0;
const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const srv = spawn('node', ['--import', 'tsx', 'server/index.ts'], { cwd: '/home/user/WMPrognose', env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(500); }
const post = async (path, body) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) })).json();
const AV = i => ({ face: i % 8, skin: i % 6, hair: (i * 2) % 9, hairColor: i % 8, hat: i % 6, shirt: i % 5, shirtColor: (i * 3) % 10, acc: i % 7, bg: i % 8 });
const room = await post('/api/rooms', { pack: 'show-3', flow: 'show' }); const code = room.code;
check(room.flow === 'show', 'Raum im Showmodus mit Paket show-3 (Reus 65 Mio)');
const names = ['Anna', 'Ben', 'Cem', 'Dana', 'Eli', 'Fiete', 'Gabi']; const pls = [];
for (let i = 0; i < 7; i++) pls.push(await post(`/api/rooms/${code}/join`, { name: names[i], avatar: AV(i + 1) }));
let hostView = null; const acks = new Map(); let n = 0;
const hws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
await new Promise(res => { hws.on('open', () => hws.send(JSON.stringify({ t: 'hello', role: 'host', room: code, key: room.hostKey }))); hws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hostView = m.view; res(); } if (m.t === 'ack') acks.set(m.reqId, m); if (m.t === 'ping') hws.send('{"t":"pong"}'); }); });
const H = async a => { const id = 'e' + ++n; hws.send(JSON.stringify({ t: 'act', reqId: id, a })); while (!acks.has(id)) await sleep(30); await sleep(80); return acks.get(id); };
const waitHost = async (pred, ms = 30000) => { const t0 = Date.now(); while (!pred(hostView)) { if (Date.now() - t0 > ms) throw new Error('timeout ' + hostView.room.phase + ' ' + hostView.round?.stage); await sleep(50); } };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const pbrowser = await chromium.launch();
const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await tv.goto(`${BASE}/tv/${code}`); await tv.getByText('Bildschirm starten').click(); await tv.waitForSelector('.roomcode');

// ---------- Musik: Freigabe nach Klick, einzelne Instanz, an/aus, kein Start ohne Showmaster-Schalter
check(await tv.evaluate(() => window.__outplayMusic()) === false, 'Musik startet nicht von allein (Standard: aus)');
await H({ k: 'h.music', on: true, vol: 30 }); await sleep(800);
check(await tv.evaluate(() => window.__outplayMusic()) === true, 'Musik läuft nach Einschalten im Showmaster-Pult (AudioContext nach Klick freigegeben)');
await H({ k: 'h.music', vol: 60 }); await H({ k: 'h.music', on: true }); await sleep(400);
check(await tv.evaluate(() => window.__outplayMusic()) === true, 'mehrfaches Einschalten/Lautstärke ändern erzeugt keine zweite Instanz (weiterhin eine)');
await H({ k: 'h.music', on: false }); await sleep(800);
check(await tv.evaluate(() => window.__outplayMusic()) === false, 'Musik lässt sich im Pult stummschalten');
await H({ k: 'h.sound', on: false }); await H({ k: 'h.music', on: true }); await sleep(600);
check(await tv.evaluate(() => window.__outplayMusic()) === false, 'bei „Ton aus“ bleibt auch die Musik aus'); await H({ k: 'h.sound', on: true }); await H({ k: 'h.music', on: false });

// ---------- Show bis zur ersten Glitch-Aufgabe (Chat-Szene) führen
await H({ k: 'h.startShow' }); await H({ k: 'h.introDone' });
for (let i = 0; i < 30 && !(hostView.round?.tileId === 's5-r4' && hostView.room.phase === 'round'); i++) await H({ k: hostView.room.phase === 'scoreboard' ? 'h.continue' : 'h.skipTile' });
await H({ k: 'h.skipTask' }); await H({ k: 'h.skipTask' });          // Probe + Aufgabe 1 überspringen → Chat-Szene (Aufgabe 2)
check(hostView.round.taskIndex === 2, 'Glitch-Aufgabe mit Chat-Nachricht erreicht');
await H({ k: 'h.begin' }); await waitHost(v => v.round.stage === 'open', 40000);
const zone = hostView.round.data.zones[0]; const scene = hostView.round.data.sceneData;
check(!!zone && zone.hw > 0, `Trefferzone ist eine enge Box (${2 * zone.hw}×${2 * zone.hh} Einheiten bei 1000×600)`);
const tvOpen = await tv.locator('body').innerText();
check(await tv.locator('svg.scene').count() === 0 && /Handys/.test(tvOpen), 'TV zeigt während der Suche keine Szene, nur Hinweis/Status');

// ---------- Handys in verschiedenen Formaten: 7 Kontexte, jeder tippt (einige Treffer, einige bewusst daneben)
const devs = [devices['iPhone SE'], devices['iPhone 13'], devices['Pixel 7'], devices['Galaxy S8'], devices['iPad Mini'], { viewport: { width: 320, height: 568 }, userAgent: devices['iPhone SE'].userAgent, hasTouch: true, isMobile: true }, devices['Pixel 5']];
const expectHit = [true, true, true, true, true, true, false];
const real = [];
for (let i = 0; i < 7; i++) {
  const ctx = await pbrowser.newContext(devs[i]);
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`outplay.player.${code}`, JSON.stringify({ playerId: pls[i].playerId, token: pls[i].token, recovery: 'X' })]);
  const p = await ctx.newPage(); await p.goto(`${BASE}/play/${code}`); await p.waitForSelector('svg.phonescene', { timeout: 20000 });
  // echte Position des geänderten Worts im Browser (SVG-Textgeometrie), umgerechnet in Szenenkoordinaten (1000×600)
  const info = await p.evaluate(() => {
    const svg = document.querySelector('svg.phonescene'); const t = [...svg.querySelectorAll('text')].find(x => /Südeingang/.test(x.textContent));
    const r = svg.getBoundingClientRect(); const scale = Math.min(r.width / 1000, r.height / 600); const ox = (r.width - 1000 * scale) / 2, oy = (r.height - 600 * scale) / 2;
    let word = null;
    if (t) { const i = t.textContent.indexOf('Südeingang'); const a = t.getExtentOfChar(i), b = t.getExtentOfChar(i + 9); word = { x0: a.x, x1: b.x + b.width, y0: a.y, y1: a.y + a.height }; }
    return { r: { l: r.left, t: r.top, w: r.width, h: r.height }, scale, ox, oy, word };
  });
  real.push(info.word);
  const px = (x, y) => ({ x: info.r.l + info.ox + x * info.scale, y: info.r.t + info.oy + y * info.scale });
  const target = expectHit[i] ? { x: zone.x, y: zone.y } : { x: 60, y: 60 };
  const c = px(target.x, target.y); await p.mouse.click(c.x, c.y);
  await p.getByRole('button', { name: 'Markierung abgeben' }).click();
  try { await p.waitForFunction(() => /Abgegeben|✓/.test(document.body.innerText), null, { timeout: 10000 }); } catch (e) { await p.screenshot({ path: `${SHOTS}/fail-${i}.png` }); console.log('  Zustand:', (await p.locator('body').innerText()).slice(0, 200).replace(/\n/g, ' | ')); throw e; }
  if (i === 0) await p.screenshot({ path: `${SHOTS}/phone-glitch-chat.png` });
  const w = info.word;
  if (w) { const ok = zone.x >= w.x0 - 25 && zone.x <= w.x1 + 25 && zone.y >= w.y0 - 25 && zone.y <= w.y1 + 25; check(ok, `${devs[i].viewport.width}×${devs[i].viewport.height}: Mitte der Trefferzone liegt auf dem tatsächlichen Wort „Südeingang“ (Wort ${Math.round(w.x0)}–${Math.round(w.x1)}, Zone ${zone.x}±${zone.hw})`); }
}
await waitHost(v => v.players.every(p => p.answered) || v.round.stage !== 'open', 15000);
await H({ k: 'h.lock' }); await H({ k: 'h.reveal' }); await waitHost(v => v.round.stage === 'reveal');
const rows = hostView.round.reveal.rows; const pts = hostView.round.data ? rows.map(r => r.points) : [];
const taskPts = rows.find(r => r.hit)?.points;
check(rows.filter(r => r.hit).length === 6 && rows.filter(r => r.points === taskPts).length === 6, `6 Treffer auf 6 verschiedenen Formaten = volle Punkte (${taskPts})`);
check(rows.filter(r => !r.hit).every(r => r.points === 0), 'Fehltipp = 0 Punkte (keine Trostpunkte)');
await tv.waitForSelector('svg.scene', { timeout: 15000 }); await sleep(1500); await tv.screenshot({ path: `${SHOTS}/tv-glitch-reveal.png` });
check(await tv.locator('svg.scene .zone').count() >= 1, 'Auflösung zeigt die veränderte Szene mit Trefferzone');

// ---------- Matchmaker-Auflösung (7 Spieler, 16:9): eigener Raum, da der Ablauf nur vorwärts läuft
const roomB = await post('/api/rooms', { pack: 'show-3', flow: 'show' }); const codeB = roomB.code; const plsB = [];
for (let i = 0; i < 7; i++) plsB.push(await post(`/api/rooms/${codeB}/join`, { name: names[i], avatar: AV(i + 1) }));
hws.close(); let hv2 = null; const ack2 = new Map(); let n2 = 0;
const hws2 = new WebSocket(BASE.replace('http', 'ws') + '/ws');
await new Promise(res => { hws2.on('open', () => hws2.send(JSON.stringify({ t: 'hello', role: 'host', room: codeB, key: roomB.hostKey }))); hws2.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hv2 = m.view; res(); } if (m.t === 'ack') ack2.set(m.reqId, m); if (m.t === 'ping') hws2.send('{"t":"pong"}'); }); });
const H2 = async a => { const id = 'f' + ++n2; hws2.send(JSON.stringify({ t: 'act', reqId: id, a })); while (!ack2.has(id)) await sleep(30); await sleep(80); return ack2.get(id); };
const wait2 = async (pred, ms = 30000) => { const t0 = Date.now(); while (!pred(hv2)) { if (Date.now() - t0 > ms) throw new Error('timeout2'); await sleep(50); } };
const tv2 = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await tv2.goto(`${BASE}/tv/${codeB}`); await tv2.getByText('Bildschirm starten').click(); await tv2.waitForSelector('.roomcode');
await H2({ k: 'h.startShow' }); await H2({ k: 'h.introDone' });
for (let i = 0; i < 30 && !(hv2.round?.tileId === 's5-r2' && hv2.room.phase === 'round'); i++) await H2({ k: hv2.room.phase === 'scoreboard' ? 'h.continue' : 'h.skipTile' });
await H2({ k: 'h.skipTask' }); await H2({ k: 'h.begin' }); await wait2(v => v.round.stage === 'open');
const wsP = plsB.map(p => { const w = new WebSocket(BASE.replace('http', 'ws') + '/ws'); w.on('open', () => w.send(JSON.stringify({ t: 'hello', role: 'player', room: codeB, key: p.token }))); w.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'ping') w.send('{"t":"pong"}'); }); return w; });
await sleep(800);
wsP[0].send(JSON.stringify({ t: 'act', reqId: 'm1', a: { k: 'submit', payload: { pairs: [0, 1, 2, 3, 4, 5], final: true } } })); wsP[1].send(JSON.stringify({ t: 'act', reqId: 'm2', a: { k: 'submit', payload: { pairs: [1, 0, 2, 3, 4, 5], final: true } } }));
await sleep(600); await H2({ k: 'h.lock' }); await H2({ k: 'h.reveal' }); await wait2(v => v.round.stage === 'reveal'); await sleep(2500);
const txt = await tv2.locator('.mtplayers').innerText(); const rowsN = await tv2.locator('.mtplayers .mtp').count();
check(rowsN === 7, `Matchmaker-Auflösung zeigt alle 7 Spielerzeilen (${rowsN})`);
check((txt.match(/Nicht abgegeben/g) ?? []).length === 5, 'Spieler ohne Abgabe stehen als „Nicht abgegeben“ + „0 Punkte“ in der Auflösung');
check(!(await tv2.locator('body').innerText()).includes('So funktioniert'), 'keine erneute Regelerklärung („So funktioniert’s“) nach der Auflösung');
const fits = await tv2.evaluate(() => { const el = document.querySelector('.mtplayers'); const r = el.getBoundingClientRect(); return { bottom: r.bottom, h: window.innerHeight, scroll: document.documentElement.scrollHeight }; });
check(fits.bottom <= fits.h && fits.scroll <= fits.h + 4, `7 Spieler passen auf den 16:9-TV ohne Scrollen/Überlauf (Unterkante ${Math.round(fits.bottom)} von ${fits.h})`);
await tv2.screenshot({ path: `${SHOTS}/tv-match-reveal.png` });
await browser.close(); await pbrowser.close(); srv.kill('SIGKILL');
console.log(failures ? `\n${failures} FEHLER` : '\nALLES OK'); process.exit(failures ? 1 : 0);
