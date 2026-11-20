// Browser-Test der sieben neuen Spiele (Paket „Neue Spielmodi“) mit 2 und mit 7 Spielern: Handys + TV, Medien nur auf dem TV, Auflösung.
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url); const { chromium, devices } = require('playwright'); const { WebSocket } = require('ws');
const SHOTS = '/tmp/claude-0/shots-sm'; mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const AV = i => ({ face: i % 8, skin: i % 6, hair: (i * 2) % 9, hairColor: i % 8, hat: i % 6, shirt: i % 5, shirtColor: (i * 3) % 10, acc: i % 7, bg: i % 8 });

async function run(N, PORT) {
  console.log(`\n===== ${N} Spieler =====`); const BASE = `http://localhost:${PORT}`, DATA = `/tmp/outplay-sm-e2e-${N}`; rmSync(DATA, { recursive: true, force: true });
  const srv = spawn('node', ['--import', 'tsx', 'server/index.ts'], { cwd: '/home/user/WMPrognose', env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(500); }
  const post = async (p, b) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) })).json();
  const room = await post('/api/rooms', { pack: 'show-modes', flow: 'show' }); const code = room.code;
  const pls = []; for (let i = 0; i < N; i++) pls.push(await post(`/api/rooms/${code}/join`, { name: 'S' + (i + 1), avatar: AV(i + 1) }));
  let hv = null; const acks = new Map(); let n = 0; const hws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
  await new Promise(res => { hws.on('open', () => hws.send(JSON.stringify({ t: 'hello', role: 'host', room: code, key: room.hostKey }))); hws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hv = m.view; res(); } if (m.t === 'ack') acks.set(m.reqId, m); if (m.t === 'ping') hws.send('{"t":"pong"}'); }); });
  const H = async a => { const id = 'e' + ++n; hws.send(JSON.stringify({ t: 'act', reqId: id, a })); while (!acks.has(id)) await sleep(30); await sleep(100); return acks.get(id); };
  const waitH = async (pred, ms = 60000) => { const t0 = Date.now(); while (!pred(hv)) { if (Date.now() - t0 > ms) throw new Error('timeout ' + hv.room.phase + ' ' + hv.round?.stage + ' ' + hv.round?.mode); await sleep(60); } };
  const browser = await chromium.launch(); const tvB = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const tv = await (await tvB.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); await tv.goto(`${BASE}/tv/${code}`); await tv.getByText('Bildschirm starten').click(); await tv.waitForSelector('.roomcode');
  const P = []; for (let i = 0; i < N; i++) { const ctx = await browser.newContext(devices['iPhone SE']); await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`outplay.player.${code}`, JSON.stringify({ playerId: pls[i].playerId, token: pls[i].token, recovery: 'X' })]); const p = await ctx.newPage(); await p.goto(`${BASE}/play/${code}`); await p.waitForSelector('.topbar'); P.push(p); }
  const idx = id => pls.findIndex(p => p.playerId === id); const all = fn => Promise.all(P.map((p, i) => fn(p, i)));
  await H({ k: 'h.startShow' }); await H({ k: 'h.introDone' });
  const goto = async tile => { for (let i = 0; i < 60 && !(hv.round?.tileId === tile && hv.room.phase === 'round'); i++) await H({ k: hv.room.phase === 'scoreboard' ? 'h.continue' : 'h.skipTile' }); };
  const begin = async () => { await H({ k: 'h.begin' }); await sleep(400); };
  const finish = async name => { await H({ k: 'h.lock' }).catch(() => {}); await H({ k: 'h.reveal' }); await waitH(v => v.round.stage === 'reveal'); await sleep(2500); await tv.screenshot({ path: `${SHOTS}/${name}-${N}.png` }); await P[0].screenshot({ path: `${SHOTS}/${name}-phone-${N}.png` }); };
  const txt = async () => tv.locator('body').innerText();

  // ---- PIXELPANIK
  await goto('nm-r1'); await begin(); await tv.waitForSelector('.pixelframe img'); await sleep(800);
  check(await tv.locator('.pixelframe img').evaluate(i => i.complete && i.naturalWidth > 0), 'PIXELPANIK: TV lädt das Bild über den Medienschlüssel');
  check((await P[0].locator('img').count()) === 0, 'PIXELPANIK: Handy enthält kein Bild');
  await all(async (p, i) => { await p.waitForSelector('.twist input'); await p.locator('.twist input').fill(i % 2 ? 'Auto' : 'Pokal'); await p.getByRole('button', { name: 'Antwort abgeben' }).click(); });
  await waitH(v => v.round.stage !== 'open'); await finish('pixel'); check(/Pokal/.test(await txt()), 'PIXELPANIK: Auflösung nennt die Lösung');

  // ---- DUELL DER DEPPEN
  await goto('nm-r2'); await sleep(400); check(!!hv.round.assign && hv.round.assign.pids.length === 2, 'DUELL: Showmaster bekommt einen Duell-Vorschlag'); await begin();
  const duelists = hv.round.data.duelists.map(idx);
  if (N > 2) { await all(async (p, i) => { if (duelists.includes(i)) return; await p.waitForSelector('.duel .votecard'); await p.locator('.duel .votecard').first().click(); await p.getByRole('button', { name: 'Tipp abgeben' }).click(); }); await waitH(v => v.round.stage === 'bet'); }
  for (let q = 0; q < 3; q++) { await waitH(v => v.round.stage === 'bet' && v.round.data.q === q); for (const i of duelists) { await P[i].waitForSelector('.duel .optcard:not([disabled])'); await P[i].locator('.duel .optcard').nth(q % 4).click(); await P[i].getByRole('button', { name: 'Antwort abgeben' }).click(); } await sleep(300); }
  await waitH(v => v.round.stage === 'locked'); await finish('duel'); t = await txt(); check(/VS/.test(t) && /(gewinnt|Unentschieden)/.test(t), 'DUELL: Auflösung zeigt Sieger oder Unentschieden');

  // ---- DIE ARENA
  await goto('nm-r3'); await begin();
  for (let q = 0; q < 3; q++) { await waitH(v => v.round.stage === 'open' && v.round.data.q === q || v.round.stage === 'locked'); if (hv.round.stage === 'locked') break; const alive = hv.round.data.alive.map(idx); await Promise.all(alive.map(async i => { await P[i].waitForSelector('.duel .optcard:not([disabled])'); await P[i].locator('.duel .optcard').nth(i % 2 ? 1 : 2).click(); await P[i].getByRole('button', { name: 'Antwort abgeben' }).click(); })); await waitH(v => v.round.stage === 'bet' || v.round.stage === 'locked'); if (q === 0) { await sleep(600); await tv.screenshot({ path: `${SHOTS}/arena-show-${N}.png` }); } if (hv.round.stage === 'bet') await H({ k: 'h.lock' }); }
  await waitH(v => v.round.stage === 'locked'); await finish('arena'); check(/überlebt/.test(await txt()), 'ARENA: Auflösung zeigt Überlebende');

  // ---- TONSPUR
  await goto('nm-r4'); await begin(); const tok = hv.round.data.media; const r1 = await tv.evaluate(async u => { const r = await fetch(u); return [r.status, r.headers.get('content-type'), (await r.arrayBuffer()).byteLength]; }, `/api/media/${code}/${tok}/a1`);
  check(r1[0] === 200 && /audio/.test(r1[1]) && r1[2] > 10000, 'TONSPUR: Audio wird nur mit TV-Schlüssel ausgeliefert'); const bad = await fetch(`${BASE}/api/media/${code}/falsch/a1`); check(bad.status === 404, 'TONSPUR: falscher Schlüssel → 404'); check((await P[0].locator('audio').count()) === 0, 'TONSPUR: Handy ohne Audio');
  await all(async (p, i) => { await p.waitForSelector('.twist input'); await p.locator('.twist input').fill(i % 2 ? 'Hubschrauber' : 'Pfiff'); await p.getByRole('button', { name: 'Antwort abgeben' }).click(); }); await finish('sound');

  // ---- ZEITSPRUNG
  await goto('nm-r5'); await begin(); await tv.waitForSelector('.tlaxis'); await all(async (p, i) => { await p.waitForSelector('.tslot'); await p.locator('.tslot').nth(i % 5).click(); await p.getByRole('button', { name: 'Position abgeben' }).click(); });
  await finish('timeline'); check((await tv.locator('.tlgap.hit').count()) === 1, 'ZEITSPRUNG: richtiges Zeitfeld hervorgehoben');

  // ---- PANIK
  await goto('nm-r6'); await sleep(300); await begin(); const di = idx(hv.round.data.defuser); await P[di].waitForSelector('.panic input'); const code3 = hv.round.data.solution;
  const helperClues = await Promise.all(P.map(async (p, i) => i === di ? 0 : p.locator('.clue').count())); check(helperClues.reduce((a, b) => a + b, 0) === 4 || N === 2 && helperClues.reduce((a, b) => a + b, 0) === 4, 'PANIK: alle Hinweise auf die Helfer verteilt'); check(!(await txt()).includes('Ziffer 1'), 'PANIK: TV zeigt keine Hinweise');
  await P[di].locator('.panic input').fill(code3 === '000' ? '111' : '000'); await P[di].getByRole('button', { name: 'Code eingeben' }).click(); await P[di].waitForSelector('.status.bad'); check(/Falsch/.test(await P[di].locator('.status.bad').innerText()), 'PANIK: falscher Code wird gemeldet');
  await P[di].locator('.panic input').fill(code3); await P[di].getByRole('button', { name: 'Code eingeben' }).click(); await waitH(v => v.round.stage === 'locked'); await finish('panic'); check(/ENTSCHÄRFT/.test(await txt()), 'PANIK: Entschärft');

  // ---- HOCHSTAPLER
  await goto('nm-r7'); await begin(); const imp = idx(hv.round.data.impostor); await all(async (p, i) => { await p.waitForSelector('.panic input'); const body = await p.locator('body').innerText(); if (i === imp) check(/HOCHSTAPLER/.test(body) && !/Geheimes Wort/.test(body), 'HOCHSTAPLER: Hochstapler sieht das Wort nicht'); await p.locator('.panic input').fill('Hinweis' + i); await p.getByRole('button', { name: 'Hinweis abgeben' }).click(); });
  await waitH(v => v.round.stage === 'bet'); await all(async (p, i) => { await p.waitForSelector('.votecard'); const others = await p.locator('.votecard').count(); await p.locator('.votecard').nth(i === imp ? 0 : Math.max(0, Math.min(others - 1, imp < i ? imp : imp - 1))).click(); await p.getByRole('button', { name: 'Verdacht abgeben' }).click(); });
  await finish('impostor'); check(/Hochstapler/.test(await txt()), 'HOCHSTAPLER: Auflösung nennt den Hochstapler');
  const sc = hv.players.map(p => p.score); console.log('  Punkte:', sc.join(', ')); check(sc.every(x => x >= 0), 'keine negativen Punkte');
  await browser.close(); await tvB.close(); hws.close(); srv.kill();
}
let t = '';
await run(2, 8101); await run(7, 8102);
console.log(failures ? `\n${failures} Fehler` : '\nAlle Browser-Prüfungen bestanden'); process.exit(failures ? 1 : 0);
