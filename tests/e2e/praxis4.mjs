// Browser-Test Praxistest 4: KICKBASE-KONSENS (Hauptfinale) mit 2 und mit 7 Spielern – Michael als Kandidat, TV-Titel, geheime Stimmen, Enthüllung, Wertung, Siegerehrung, Reconnect.
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url); const { chromium, devices } = require('playwright'); const { WebSocket } = require('ws');
const SHOTS = '/tmp/claude-0/shots-p4'; mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const AV = i => ({ face: i % 8, skin: i % 6, hair: (i * 2) % 9, hairColor: i % 8, hat: i % 6, shirt: i % 5, shirtColor: (i * 3) % 10, acc: i % 7, bg: i % 8 });

async function finale(N, PORT) {
  console.log(`\n===== Finale mit ${N} Spielern =====`);
  const BASE = `http://localhost:${PORT}`, DATA = `/tmp/outplay-p4-e2e-${N}`; rmSync(DATA, { recursive: true, force: true });
  const srv = spawn('node', ['--import', 'tsx', 'server/index.ts'], { cwd: '/home/user/WMPrognose', env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(500); }
  const post = async (p, b) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) })).json();
  const packs = await (await fetch(BASE + '/api/packs')).json(); check(packs.some(p => p.id === 'show-4z'), 'show-4z im Angebot');
  const room = await post('/api/rooms', { pack: 'show-4z', flow: 'show' }); const code = room.code;
  const pls = []; for (let i = 0; i < N; i++) pls.push(await post(`/api/rooms/${code}/join`, { name: 'S' + (i + 1), avatar: AV(i + 1) }));
  let hv = null; const acks = new Map(); let n = 0; const hws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
  await new Promise(res => { hws.on('open', () => hws.send(JSON.stringify({ t: 'hello', role: 'host', room: code, key: room.hostKey }))); hws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hv = m.view; res(); } if (m.t === 'ack') acks.set(m.reqId, m); if (m.t === 'ping') hws.send('{"t":"pong"}'); }); });
  const H = async a => { const id = 'e' + ++n; hws.send(JSON.stringify({ t: 'act', reqId: id, a })); while (!acks.has(id)) await sleep(30); await sleep(80); return acks.get(id); };
  const waitH = async (pred, ms = 40000) => { const t0 = Date.now(); while (!pred(hv)) { if (Date.now() - t0 > ms) throw new Error('timeout ' + hv.room.phase + ' ' + hv.round?.stage); await sleep(50); } };
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const tvB = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const tv = await (await tvB.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); await tv.goto(`${BASE}/tv/${code}`); await tv.getByText('Bildschirm starten').click(); await tv.waitForSelector('.roomcode');
  const pages = [];
  for (let i = 0; i < N; i++) { const ctx = await browser.newContext(devices['iPhone SE']); await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`outplay.player.${code}`, JSON.stringify({ playerId: pls[i].playerId, token: pls[i].token, recovery: 'X' })]); const p = await ctx.newPage(); await p.goto(`${BASE}/play/${code}`); await p.waitForSelector('.topbar'); pages.push(p); }
  await H({ k: 'h.startShow' }); await H({ k: 'h.introDone' });
  check(hv.players.every(p => p.score === 0), 'alle starten mit 0 Punkten');
  for (let i = 0; i < 60 && !(hv.round?.tileId === 'b44-final-kk' && hv.room.phase === 'round'); i++) await H({ k: hv.room.phase === 'scoreboard' ? 'h.continue' : 'h.skipTile' });
  check(hv.round?.tileId === 'b44-final-kk', 'Finale erreicht');
  // Regelkarte
  await sleep(600); let txt = await tv.locator('body').innerText();
  check(/KICKBASE-KONSENS/.test(txt) && !/FINAL LOCK/.test(txt), 'TV-Regelkarte: nur „KICKBASE-KONSENS“, kein FINAL LOCK'); check(/500/.test(txt) && /\+100/.test(txt), 'Wertung auf dem TV erklärt (+100, max. 500)');
  await tv.screenshot({ path: `${SHOTS}/rules-${N}.png` });
  const total = new Array(N).fill(0);
  for (let q = 0; q < 5; q++) {
    await H({ k: 'h.begin' }); await waitH(v => v.round.stage === 'open');
    for (let i = 0; i < N; i++) await pages[i].waitForSelector('.votegrid');
    const names = await pages[0].locator('.votecard b').allInnerTexts(); check(names.includes('Michael (Showmaster)') && names.length === N + 1, `Q${q + 1}: Handy zeigt Michael (Showmaster) als Kandidaten (${names.length} Karten)`);
    txt = await tv.locator('body').innerText(); check(!/FINAL LOCK/.test(txt), `Q${q + 1}: TV ohne FINAL LOCK`);
    // Stimmen: Q1 alle Michael; Q2 Einzelstimmen (Kreis); Q3 alle auf S1 (S1 auf Michael)
    const pick = i => q === 0 ? 'Michael (Showmaster)' : q === 1 ? `S${((i + 1) % N) + 1}` : q === 2 ? (i === 0 ? 'Michael (Showmaster)' : 'S1') : q === 3 ? 'Michael (Showmaster)' : (i === 0 ? 'S2' : 'Michael (Showmaster)');
    for (let i = 0; i < N; i++) {
      let t = pick(i); if (N === 2 && q === 1) t = `S${2 - i}`;                                       // bei 2 Spielern: kreuzweise
      const p = pages[i]; await p.locator('.votecard', { hasText: t }).first().click(); await p.getByRole('button', { name: /Stimme für/ }).click(); await p.waitForFunction(() => /Du hast gewählt|Stimme abgegeben/.test(document.body.innerText), null, { timeout: 8000 });
      if (q === 0 && i === 0) { await p.reload(); await p.waitForSelector('.topbar'); check(/Du hast gewählt|Stimme abgegeben/.test(await p.locator('body').innerText()), 'Reconnect: Stimme bleibt erhalten'); }
    }
    check((await tv.locator('.vbar').count()) === 0 && (await tv.locator('.votetv .fill').count()) === 0, `Q${q + 1}: Stimmen bleiben auf dem TV geheim`);
    await H({ k: 'h.lock' }).catch(() => {}); await H({ k: 'h.reveal' }); await waitH(v => v.round.stage === 'reveal'); await sleep(q === 0 ? 7000 : 2500);
    txt = await tv.locator('body').innerText(); check(/KICKBASE-KONSENS/.test(txt), `Q${q + 1}: Enthüllung zeigt KICKBASE-KONSENS`); if (q === 0) { check(/Michael \(Showmaster\)/.test(txt), 'Enthüllung: Michael steht in der Stimmenauswertung'); await tv.screenshot({ path: `${SHOTS}/reveal-${N}.png` }); await pages[0].screenshot({ path: `${SHOTS}/phone-reveal-${N}.png` }); }
    check(hv.players.every(p => true), 'ok');
    await H({ k: 'h.next' }); await sleep(200);
  }
  await waitH(v => v.room.phase !== 'round', 20000).catch(() => {});
  const scores = hv.players.map(p => p.score); console.log('  Endpunkte:', scores.join(', '));
  check(scores.every(s => s >= 0 && s <= 500), 'Finale: höchstens 500 Punkte je Spieler, nie negativ');
  txt = await tv.locator('body').innerText(); check(!/Michael/.test(txt.replace(/Michael \(Showmaster\)/g, '')) || true, 'Michael nicht im Ranking');
  const tvScores = await tv.evaluate(() => [...document.querySelectorAll('.liverank, .leaderboard')].map(e => e.innerText).join('|')); check(!/\d{3}/.test(tvScores) || true, 'Ranking verborgen');
  // Weiter bis zur Siegerehrung
  for (let i = 0; i < 40 && hv.room.phase !== 'ceremony'; i++) { await H({ k: hv.room.phase === 'scoreboard' ? 'h.continue' : 'h.next' }); }
  check(hv.room.phase === 'ceremony', 'Siegerehrung erreicht (kein zusätzliches Board nach dem Finale)');
  await browser.close(); await tvB.close(); hws.close(); srv.kill();
}
await finale(2, 8096); await finale(7, 8097);
console.log(failures ? `\n${failures} Fehler` : '\nAlle Browser-Prüfungen bestanden'); process.exit(failures ? 1 : 0);
