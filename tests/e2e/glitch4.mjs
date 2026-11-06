// Browser-Test der vier neuen GLITCH-Szenen (Best of 42) auf mehreren Handy-Formaten: echte Position des veränderten Elements (SVG-Geometrie)
// = Trefferzone, Tipp auf das Element trifft, Tipp daneben nicht, TV zeigt das Suchbild nicht.
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url); const { chromium, devices } = require('playwright'); const { WebSocket } = require('ws');
const PORT = 8094, BASE = `http://localhost:${PORT}`, DATA = '/tmp/outplay-g4-e2e'; mkdirSync('/tmp/claude-0/shots-g4', { recursive: true }); rmSync(DATA, { recursive: true, force: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const srv = spawn('node', ['--import', 'tsx', 'server/index.ts'], { cwd: '/home/user/WMPrognose', env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(500); }
const post = async (p, b) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) })).json();
const AV = i => ({ face: i % 8, skin: i % 6, hair: (i * 2) % 9, hairColor: i % 8, hat: i % 6, shirt: i % 5, shirtColor: (i * 3) % 10, acc: i % 7, bg: i % 8 });
const room = await post('/api/rooms', { pack: 'show-4', flow: 'show' }); const code = room.code; const pls = [];
for (let i = 0; i < 5; i++) pls.push(await post(`/api/rooms/${code}/join`, { name: 'S' + (i + 1), avatar: AV(i + 1) }));
let hv = null; const acks = new Map(); let n = 0; const hws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
await new Promise(res => { hws.on('open', () => hws.send(JSON.stringify({ t: 'hello', role: 'host', room: code, key: room.hostKey }))); hws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hv = m.view; res(); } if (m.t === 'ack') acks.set(m.reqId, m); if (m.t === 'ping') hws.send('{"t":"pong"}'); }); });
const H = async a => { const id = 'e' + ++n; hws.send(JSON.stringify({ t: 'act', reqId: id, a })); while (!acks.has(id)) await sleep(30); await sleep(80); return acks.get(id); };
const waitH = async (pred, ms = 40000) => { const t0 = Date.now(); while (!pred(hv)) { if (Date.now() - t0 > ms) throw new Error('timeout ' + hv.room.phase + ' ' + hv.round?.stage); await sleep(50); } };
const browser = await chromium.launch(); const tvB = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const tv = await (await tvB.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); await tv.goto(`${BASE}/tv/${code}`); await tv.getByText('Bildschirm starten').click();
const devs = [devices['iPhone SE'], devices['Pixel 7'], devices['iPad Mini'], { viewport: { width: 320, height: 568 }, userAgent: devices['iPhone SE'].userAgent, hasTouch: true, isMobile: true }, devices['Galaxy S8']];
const pages = [];
for (let i = 0; i < 5; i++) { const ctx = await browser.newContext(devs[i]); await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`outplay.player.${code}`, JSON.stringify({ playerId: pls[i].playerId, token: pls[i].token, recovery: 'X' })]); const p = await ctx.newPage(); await p.goto(`${BASE}/play/${code}`); await p.waitForSelector('.topbar'); pages.push(p); }
await H({ k: 'h.startShow' }); await H({ k: 'h.introDone' });
for (let i = 0; i < 30 && !(hv.round?.tileId === 'b42-r4' && hv.room.phase === 'round'); i++) await H({ k: hv.room.phase === 'scoreboard' ? 'h.continue' : 'h.skipTile' });
const SCENES = [['transfer1', '65,0 Mio. €', 1], ['kiosk1', 'Bier 0,4 l', 2], ['table2', '−14', 3], ['receipt2', '525,00 €', 6]];   // [Szene, verändertes Element, taskIndex in Runde]
let idx = 0;
for (const [scene, text, ti] of SCENES) {
  while (hv.round.taskIndex < ti) { await H({ k: 'h.skipTask' }); }
  check(hv.round.taskIndex === ti, `Szene ${scene}: Aufgabe erreicht`);
  await H({ k: 'h.begin' }); await waitH(v => v.round.stage === 'view' || v.round.stage === 'open'); idx++;
  check((await tv.locator('svg.scene').count()) >= 1 || hv.round.stage === 'open', `${scene}: TV zeigt in der Betrachtung die Ursprungsszene`);
  await waitH(v => v.round.stage === 'open', 40000); await sleep(600);
  check(await tv.locator('svg.scene').count() === 0, `${scene}: TV zeigt in der Suchphase KEINE Szene`);
  const zone = hv.round.data.zones[0]; const sc = hv.round.data.sceneData;
  check(sc.items.length > 0 && zone.hw > 0, `${scene}: Zone ${2 * zone.hw}×${2 * zone.hh} Einheiten`);
  for (let i = 0; i < 5; i++) {
    const p = pages[i]; await p.waitForSelector('svg.phonescene', { timeout: 20000 });
    const info = await p.evaluate(t => { const svg = document.querySelector('svg.phonescene'); const el = [...svg.querySelectorAll('text')].find(x => x.textContent.trim() === t); const r = svg.getBoundingClientRect(); const s = Math.min(r.width / 1000, r.height / 600); const bb = el?.getBBox(); return { r: { l: r.left, t: r.top, w: r.width, h: r.height }, s, ox: (r.width - 1000 * s) / 2, oy: (r.height - 600 * s) / 2, bb: bb ? { x: bb.x, y: bb.y, w: bb.width, h: bb.height } : null }; }, text);
    check(!!info.bb, `${scene} @${devs[i].viewport.width}×${devs[i].viewport.height}: verändertes Element gefunden`);
    if (!info.bb) continue;
    const cx = info.bb.x + info.bb.w / 2, cy = info.bb.y + info.bb.h / 2;
    check(Math.abs(cx - zone.x) <= zone.hw + 35 && Math.abs(cy - zone.y) <= zone.hh + 35 && cx >= zone.x - zone.hw - 35 && cx <= zone.x + zone.hw + 35, `${scene} @${devs[i].viewport.width}: echtes Element (${Math.round(cx)},${Math.round(cy)}) liegt in der Trefferzone (${zone.x},${zone.y} ±${zone.hw}/${zone.hh})`);
    const miss = i === 4; const tx = miss ? 60 : cx, ty = miss ? 560 : cy;
    await p.mouse.click(info.r.l + info.ox + tx * info.s, info.r.t + info.oy + ty * info.s);
    await p.getByRole('button', { name: 'Markierung abgeben' }).click(); await p.waitForFunction(() => /Abgegeben|✓/.test(document.body.innerText), null, { timeout: 10000 });
    if (i === 0) await p.screenshot({ path: `/tmp/claude-0/shots-g4/${scene}-phone.png` });
  }
  await H({ k: 'h.lock' }); await H({ k: 'h.reveal' }); await waitH(v => v.round.stage === 'reveal');
  const rows = hv.round.reveal.rows; const full = rows.find(r => r.hit)?.points;
  check(rows.filter(r => r.hit).length === 4 && rows.filter(r => r.points === full && r.points > 0).length === 4, `${scene}: 4 Treffer auf 4 Formaten = volle Punkte (${full})`);
  check(rows.filter(r => !r.hit).every(r => r.points === 0) && rows.filter(r => !r.hit).length === 1, `${scene}: Tipp daneben = 0 Punkte (kein Fehlalarm, keine Trostpunkte)`);
  await tv.waitForSelector('svg.scene', { timeout: 15000 }); await sleep(1500); await tv.screenshot({ path: `/tmp/claude-0/shots-g4/${scene}-tv-reveal.png` });
  check(await tv.locator('svg.scene .zone').count() >= 1, `${scene}: Auflösung zeigt veränderte Szene mit Trefferzone`);
  if (ti !== 6) await H({ k: 'h.next' });
}
await browser.close(); await tvB.close(); srv.kill('SIGKILL'); console.log(failures ? `\n${failures} FEHLER` : '\nALLES OK'); process.exit(failures ? 1 : 0);
