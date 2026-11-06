// Browser-Test Praxistest 3: SORTIER'S! (Karten, Drag&Drop + Tippen, mehrere Handygrößen), Show-Pause inkl. TV-Reload, Musik (an/aus/Pause/Lautstärke + Offline-Rendering-Pegel).
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url); const { chromium, devices } = require('playwright'); const { WebSocket } = require('ws');
const PORT = 8095, BASE = `http://localhost:${PORT}`, DATA = '/tmp/outplay-p3-e2e', SHOTS = '/tmp/claude-0/shots-p3'; mkdirSync(SHOTS, { recursive: true }); rmSync(DATA, { recursive: true, force: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const srv = spawn('node', ['--import', 'tsx', 'server/index.ts'], { cwd: '/home/user/WMPrognose', env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(500); }
const post = async (p, b) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) })).json();
const AV = i => ({ face: i % 8, skin: i % 6, hair: (i * 2) % 9, hairColor: i % 8, hat: i % 6, shirt: i % 5, shirtColor: (i * 3) % 10, acc: i % 7, bg: i % 8 });
const room = await post('/api/rooms', { pack: 'show-5', flow: 'show' }); const code = room.code; check(room.flow === 'show', 'Raum mit Paket show-5 (Best of 42 v2)');
const pls = []; for (let i = 0; i < 5; i++) pls.push(await post(`/api/rooms/${code}/join`, { name: 'S' + (i + 1), avatar: AV(i + 1) }));
let hv = null; const acks = new Map(); let n = 0; const hws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
await new Promise(res => { hws.on('open', () => hws.send(JSON.stringify({ t: 'hello', role: 'host', room: code, key: room.hostKey }))); hws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hv = m.view; res(); } if (m.t === 'ack') acks.set(m.reqId, m); if (m.t === 'ping') hws.send('{"t":"pong"}'); }); });
const H = async a => { const id = 'e' + ++n; hws.send(JSON.stringify({ t: 'act', reqId: id, a })); while (!acks.has(id)) await sleep(30); await sleep(80); return acks.get(id); };
const waitH = async (pred, ms = 40000) => { const t0 = Date.now(); while (!pred(hv)) { if (Date.now() - t0 > ms) throw new Error('timeout ' + hv.room.phase + ' ' + hv.round?.stage); await sleep(50); } };
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const tvB = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const tv = await (await tvB.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); await tv.goto(`${BASE}/tv/${code}`); await tv.getByText('Bildschirm starten').click(); await tv.waitForSelector('.roomcode');
const devs = [devices['iPhone SE'], { viewport: { width: 320, height: 568 }, userAgent: devices['iPhone SE'].userAgent, hasTouch: true, isMobile: true }, devices['Pixel 7'], devices['iPad Mini'], devices['Galaxy S8']];
const pages = [];
for (let i = 0; i < 5; i++) { const ctx = await browser.newContext(devs[i]); await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`outplay.player.${code}`, JSON.stringify({ playerId: pls[i].playerId, token: pls[i].token, recovery: 'X' })]); const p = await ctx.newPage(); await p.goto(`${BASE}/play/${code}`); await p.waitForSelector('.topbar'); pages.push(p); }
await H({ k: 'h.startShow' }); await H({ k: 'h.introDone' });

// ---------- 1) Show-Pause: Geo-Aufgabe, Pause, TV-Reload, Phone-Reload, Fortsetzen
await H({ k: 'h.skipTask' }).catch(() => {});                                   // Probe überspringen
await H({ k: 'h.begin' }); await waitH(v => v.round.stage === 'open'); await sleep(5000);
await H({ k: 'h.showPause', paused: true }); const left = hv.round.pausedLeft; check(left > 40000 && hv.round.deadline === null, `Pause: Timer eingefroren (Rest ${Math.round(left / 1000)} s)`);
await tv.waitForSelector('.pauseveil', { timeout: 8000 }); check(true, 'TV zeigt „SHOW PAUSIERT“');
await sleep(6000); check(hv.round.pausedLeft === left, 'nach 6 s Pause unverändert eingefroren');
await tv.goto('about:blank'); await sleep(1500); await tv.goto(`${BASE}/tv/${code}`); await tv.getByText('Bildschirm starten').click(); await tv.waitForSelector('.pauseveil', { timeout: 15000 });
check(true, 'TV-Seite verlassen und wieder geöffnet: Pause weiter sichtbar'); await pages[0].reload(); await pages[0].waitForSelector('.topbar'); check(hv.round.pausedLeft === left && hv.round.stage === 'open', 'Handy-Reload während der Pause: Stand unverändert');
await pages[1].context().setOffline(true); await sleep(2000); await pages[1].context().setOffline(false); await pages[1].waitForSelector('.topbar', { timeout: 15000 }); check(true, 'kurze WLAN-Unterbrechung: Handy kehrt zurück');
await H({ k: 'h.showPause', paused: false }); const t1 = Date.now(); check(Math.abs(hv.round.deadline - Date.now() - left) < 1500 && hv.round.pausedLeft === null, 'Fortsetzen: Restzeit exakt wie vor der Pause');
await H({ k: 'h.lock' }); await H({ k: 'h.reveal' }); await waitH(v => v.round.stage === 'reveal'); void t1;

// ---------- 2) Musik: Standard aus, an, Lautstärke, Pause stoppt, Fortsetzen startet, aus; Offline-Rendering-Pegel
const mus = () => tv.evaluate(() => window.__outplayMusic());
check(await mus() === false, 'Musik standardmäßig aus'); await H({ k: 'h.music', on: true, vol: 30 }); await sleep(1000); check(await mus() === true, 'Musik an');
await H({ k: 'h.music', vol: 80 }); await H({ k: 'h.music', on: true }); await sleep(300); check(await mus() === true, 'Lautstärke ändern/erneut einschalten: eine Instanz');
await H({ k: 'h.showPause', paused: true }); await sleep(800); check(await mus() === false, 'Show-Pause stoppt die Musik'); await H({ k: 'h.showPause', paused: false }); await sleep(800); check(await mus() === true, 'nach „Show fortsetzen“ läuft die Musik wieder');
await H({ k: 'h.music', on: false }); await sleep(800); check(await mus() === false, 'Musik aus');
const rd = await tv.evaluate(() => window.__outplayMusicRender(24));
check(rd.bad === 0 && rd.peak > 0.01 && rd.peak < 0.9 && rd.rms > 0.003 && rd.rms < 0.25 && Math.abs(rd.dc) < 0.01 && rd.audibleShare > 0.35, `Offline-Rendering (24 s @ ${rd.bpm} BPM): Spitze ${rd.peak.toFixed(3)}, Effektivwert ${rd.rms.toFixed(4)}, Gleichanteil ${rd.dc.toExponential(1)}, hörbar ${(rd.audibleShare * 100).toFixed(0)} %, keine NaN`);

// ---------- 3) SORTIER'S!: zur Sortier-Aufgabe, Kartenbedienung auf 5 Formaten
for (let i = 0; i < 30 && !(hv.round?.tileId === 'b43-r3' && hv.room.phase === 'round'); i++) await H({ k: hv.room.phase === 'scoreboard' ? 'h.continue' : 'h.skipTile' });
await H({ k: 'h.skipTask' }); await H({ k: 'h.begin' }); await waitH(v => v.round.stage === 'open'); const sol = hv.round.data.solution;
check(hv.round.data.variant === 'sort', 'Sortier-Variante aktiv'); const tvTxt = await tv.locator('body').innerText(); check(/SORTIER/i.test(tvTxt), 'TV zeigt den Namen SORTIER’S!');
const order = [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0], [0, 1, 2, 3, 4], [2, 0, 1, 4, 3], [0, 1, 2, 3, 4]];   // Zielreihenfolge je Gerät (Indizes in sol)
const moves = ['tap', 'drag', 'tap', 'mixed', 'drag'];
for (let i = 0; i < 5; i++) {
  const p = pages[i]; await p.waitForSelector('.sorter .cardpool .scard', { timeout: 20000 }); const vw = devs[i].viewport.width;
  const texts = await p.locator('.cardpool .scard').allInnerTexts(); check(texts.length === 5 && texts.join('|') !== sol.join('|'), `${vw}px: fünf Karten anfangs gemischt (nicht in richtiger Reihenfolge)`);
  check(await p.locator('.sslot .no').allInnerTexts().then(a => a.join() === '1,2,3,4,5'), `${vw}px: Plätze 1–5 sichtbar`);
  const geo = await p.evaluate(() => { const r = q => document.querySelector(q)?.getBoundingClientRect(); const a = r('.slotsboard'), b = r('.cardpool'), c = r('.topbar'); return { top: Math.round(a.top), slotsBottom: Math.round(a.bottom), poolBottom: Math.round(b.bottom), topbar: Math.round(c?.bottom ?? 0), vh: innerHeight }; });
  console.log(`  Layout ${vw}px: Plätze ${geo.top}–${geo.slotsBottom}, Kartenablage bis ${geo.poolBottom} von ${geo.vh} px Höhe`);
  const btn = p.getByRole('button', { name: /platzieren|prüfen/ }); check(await btn.isDisabled(), `${vw}px: Abgabe gesperrt, solange nicht alle Karten liegen`);
  const place = async (text, pos, how) => {
    const card = p.locator('.scard', { hasText: text }).first(); await card.scrollIntoViewIfNeeded();
    if (how === 'tap') { await card.click(); await p.locator(`[data-slot="${pos}"]`).click(); }
    else {
      await p.locator('.slotsboard').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollTo(0, 0)); await sleep(60);
      const b2 = await card.boundingBox(); const s2 = await p.locator(`[data-slot="${pos}"]`).boundingBox(); const vh = devs[i].viewport.height;
      if (b2.y + b2.height > vh || s2.y + s2.height > vh) { console.log(`  (Hinweis ${vw}px: Karte und Platz nicht gleichzeitig sichtbar – Fallback Tippen)`); await card.click(); await p.locator(`[data-slot="${pos}"]`).click(); }
      else { await p.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2); await p.mouse.down(); await p.mouse.move(b2.x + b2.width / 2 + 12, b2.y + b2.height / 2 + 12, { steps: 3 }); await p.mouse.move(s2.x + s2.width / 2, s2.y + s2.height / 2, { steps: 8 }); await p.mouse.up(); }
    }
    await sleep(120);
  };
  const target = order[i]; // Karte target[k] (Index in sol) kommt auf Platz k
  // Variante „mixed“: erst falsch legen, dann durch Tauschen korrigieren
  if (moves[i] === 'mixed') { for (let k = 0; k < 5; k++) await place(sol[(k + 1) % 5], k, 'tap'); await place(sol[0], 4, 'tap'); }
  for (let k = 0; k < 5; k++) await place(sol[target.indexOf(k) < 0 ? k : target[k]], k, moves[i] === 'mixed' ? 'tap' : moves[i]);
  const shown = await p.locator('.sslot .scard').allInnerTexts(); const wantShown = target.map(x => sol[x]);
  check(shown.join('|') === wantShown.join('|'), `${vw}px (${moves[i]}): Karten liegen wie gewünscht auf den Plätzen`);
  if (i === 0) await p.screenshot({ path: `${SHOTS}/sorter-${vw}.png` });
  await p.getByRole('button', { name: /prüfen & abgeben/ }).click(); check(await p.getByText('Endgültig abgeben?').isVisible(), `${vw}px: bewusste Bestätigung vor der Abgabe`);
  if (i === 1) { await p.getByRole('button', { name: 'Zurück' }).click(); check(await p.getByRole('button', { name: /prüfen & abgeben/ }).isVisible(), 'Zurück bricht die Abgabe ab (noch nichts gesendet)'); await p.getByRole('button', { name: /prüfen & abgeben/ }).click(); }
  await p.getByRole('button', { name: 'Ja, endgültig abgeben' }).click(); await p.waitForFunction(() => /Abgegeben/.test(document.body.innerText), null, { timeout: 10000 });
}
await H({ k: 'h.lock' }); await H({ k: 'h.reveal' }); await waitH(v => v.round.stage === 'reveal'); const rows = hv.round.reveal.rows;
const exp = order.map(o => o.filter((x, k) => x === k).length * 50); const got = pls.map(p => rows.find(r => r.pid === p.playerId)?.points);
check(JSON.stringify(exp) === JSON.stringify(got), `Wertung 50 Punkte je richtiger Position: erwartet ${exp.join('/')} = erhalten ${got.join('/')}`);
await tv.waitForSelector('.ranktv.reveal', { timeout: 15000 }); await sleep(1500); await tv.screenshot({ path: `${SHOTS}/tv-sortiers-reveal.png` });
await browser.close(); await tvB.close(); srv.kill('SIGKILL'); console.log(failures ? `\n${failures} FEHLER` : '\nALLES OK'); process.exit(failures ? 1 : 0);
