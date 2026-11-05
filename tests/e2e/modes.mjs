// E2E 2: Überraschungsrunde, Setz auf mich, Glitch, Codebreak, Finale & Siegerehrung mit echten Browsern.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { WebSocket } = require('/home/user/WMPrognose/node_modules/ws');
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:8091';
const SHOTS = process.env.SHOTS ?? '/tmp/claude-0/shots';
mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const AV = i => ({ face: i % 8, skin: i % 6, hair: (i * 2) % 9, hairColor: i % 8, hat: i % 6, shirt: i % 5, shirtColor: (i * 3) % 10, acc: i % 7, bg: i % 8 });
const post = async (path, body) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) })).json();

const room = await post('/api/rooms');
const code = room.code;
const names = ['Anna', 'Ben', 'Cem', 'Dana', 'Eli', 'Fiete'];
const ids = [], tokens = [];
for (let i = 0; i < 6; i++) { const j = await post(`/api/rooms/${code}/join`, { name: names[i], avatar: AV(i + 1) }); ids.push(j.playerId); tokens.push(j.token); }

// Host-Steuerung (Node-WS) – schnelle Navigation
let hostView = null; const acks = new Map(); let n = 0;
const hws = new WebSocket(BASE.replace('http', 'ws') + '/ws');
await new Promise(res => { hws.on('open', () => hws.send(JSON.stringify({ t: 'hello', role: 'host', room: code, key: room.hostKey }))); hws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.t === 'state') { hostView = m.view; res(); } if (m.t === 'ack') acks.set(m.reqId, m); if (m.t === 'ping') hws.send('{"t":"pong"}'); }); });
const H = async a => { const id = 'e' + ++n; hws.send(JSON.stringify({ t: 'act', reqId: id, a })); while (!acks.has(id)) await sleep(30); const r = acks.get(id); if (!r.ok) console.log('  host act failed', a.k, r.err); await sleep(60); return r; };
const waitHost = async (pred, ms = 8000) => { const t0 = Date.now(); while (!pred(hostView)) { if (Date.now() - t0 > ms) throw new Error('timeout host wait ' + hostView.room.phase + ' ' + hostView.round?.stage); await sleep(50); } };

const browser = await chromium.launch();
const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
tv.on('pageerror', e => console.log('TV pageerror', e.message));
await tv.goto(`${BASE}/tv/${code}`); await tv.getByText('Bildschirm starten').click();
const phones = [];
for (let i = 0; i < 6; i++) {
  const ctx = await browser.newContext(devices[i % 2 ? 'Pixel 7' : 'iPhone 13']);
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`outplay.player.${code}`, JSON.stringify({ playerId: ids[i], token: tokens[i], recovery: 'X' })]);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log(`P${i} pageerror`, e.message));
  await p.goto(`${BASE}/play/${code}`); await p.waitForSelector('.topbar'); phones.push(p);
}
await H({ k: 'h.startShow' }); await H({ k: 'h.introDone' });
await waitHost(v => v.room.phase === 'wall');

const pickTile = async id => { await waitHost(v => v.room.phase === 'wall'); await H({ k: 'h.pick', tileId: id }); await waitHost(v => v.round?.tileId === id); };
const begin = async () => { await H({ k: 'h.begin' }); await sleep(900); };
const shot = async (name, ph = 0) => { await tv.screenshot({ path: `${SHOTS}/tv-${name}.png` }); await phones[ph].screenshot({ path: `${SHOTS}/phone-${name}.png` }); };

// ---------- SETZ AUF MICH ----------
await H({ k: 'h.adjust', pid: ids[1], delta: 400, note: 'Teststartguthaben' });
await pickTile('schaetz-mal'); await sleep(1200); await tv.screenshot({ path: `${SHOTS}/tv-est-rules.png` });
await begin();
const guesses = ['116', '100', '150', '90', '200', '60'];
for (let i = 0; i < 5; i++) { await phones[i].locator('.inputrow input').fill(guesses[i]); await phones[i].getByRole('button', { name: 'Schätzung abgeben' }).click(); await phones[i].waitForSelector('.status.ok'); }
await shot('est-open');
await H({ k: 'h.lock' }); await waitHost(v => v.round.stage === 'bet'); await sleep(1500);
check(await phones[0].locator('.guess').count() === 5, 'Setz auf mich: Handys zeigen 5 Tipps zum Setzen');
await phones[1].locator('.guess').first().click();
await phones[1].locator('.chipbtn', { hasText: '100' }).click();
await phones[1].getByRole('button', { name: /Punkte setzen/ }).click().catch(() => {});
await phones[0].locator('.chipbtn', { hasText: 'Kein Einsatz' }).click();
await phones[0].getByRole('button', { name: /Ohne Einsatz/ }).click();
await shot('est-bet', 1);
await H({ k: 'h.lock' }); await H({ k: 'h.reveal' }); await sleep(3800);
await shot('est-reveal');
await H({ k: 'h.next' });
await begin(); await H({ k: 'h.reveal' }); await H({ k: 'h.next' }); // zweite Aufgabe ohne Abgabe: 0 Punkte
await waitHost(v => v.room.phase === 'wall');

// ---------- GLITCH ----------
await pickTile('alles-im-blick'); await begin();
await sleep(700); await shot('glitch-view');
check(await phones[0].getByText('Schau auf den Fernseher').count() > 0, 'Glitch: Handys zeigen während der Betrachtung nur den Hinweis');
await H({ k: 'h.lock' }); await phones[0].waitForSelector('.phonescene');
const box = await phones[0].locator('.phonescene').boundingBox();
await phones[0].mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.5); // Preis rechts (Zone ~ Butter?) – Abgabe beliebig
await phones[0].getByRole('button', { name: 'Markierung abgeben' }).click(); await phones[0].waitForSelector('.status.ok');
await shot('glitch-open');
await H({ k: 'h.reveal' }); await sleep(2500); await shot('glitch-reveal');
await H({ k: 'h.next' });
// ---------- CODEBREAK ----------
await H({ k: 'h.skipTile' }); await waitHost(v => v.room.phase === 'wall');
await pickTile('kopfsalat'); await begin();
await phones[0].locator('.inputrow input').fill('64'); await phones[0].getByRole('button', { name: 'Lösung prüfen' }).click(); await sleep(500);
check(await phones[0].getByText(/Leider falsch/).count() > 0, 'Codebreak: falsche Antwort wird sofort zurückgemeldet');
await phones[0].getByText(/Hinweis freischalten/).click(); await sleep(400);
check(await phones[0].locator('.hint').count() === 1, 'Codebreak: Hinweis wird angezeigt');
await phones[0].locator('.inputrow input').fill('65'); await phones[0].getByRole('button', { name: 'Lösung prüfen' }).click(); await sleep(400);
check(await phones[0].getByText(/Gelöst/).count() > 0, 'Codebreak: richtige Antwort erkannt');
await shot('code-open');
await H({ k: 'h.reveal' }); await sleep(2500); await shot('code-reveal');
check(hostView.players.find(p => p.id === ids[0]).score > 0, 'Codebreak: Punkte (mit Hinweis reduziert) gutgeschrieben');
await H({ k: 'h.skipTile' });

// ---------- Zwischenstand nach Akt 1, dann Überraschung ----------
await waitHost(v => v.room.phase === 'scoreboard');
await sleep(2500); await tv.screenshot({ path: `${SHOTS}/tv-board.png` });
await H({ k: 'h.continue' }); await waitHost(v => v.round?.tileId === 'einzigartig');
await sleep(1500); await tv.screenshot({ path: `${SHOTS}/tv-unique-rules.png` });
await begin();
const ans = ['Schweden', 'Sweden', 'Serbien', 'Slowenien', 'Peru', 'Spanien'];
for (let i = 0; i < 6; i++) { await phones[i].locator('.inputrow input').fill(ans[i]); await phones[i].getByRole('button', { name: 'Antwort abgeben' }).click(); if (i < 5) await phones[i].waitForSelector('.status.ok'); }
await waitHost(v => v.round.stage === 'review'); await sleep(1200);
await shot('unique-review');
const grp = hostView.round.data.groups.find(g => g.state === 'unknown');
check(!!grp, 'Einzigartig: unklare Antwort („Peru“) landet beim Host zur Prüfung');
await H({ k: 'h.review', groupKey: grp.key, decision: 'invalid' });
await H({ k: 'h.reveal' }); await sleep(3000); await shot('unique-reveal');
const s = id => hostView.players.find(p => p.id === id).score;
check(s(ids[2]) >= 500 && s(ids[0]) >= 150, 'Einzigartig: einzigartig 500, doppelt 150');
await H({ k: 'h.next' }); await H({ k: 'h.skipTask' });

// ---------- Finale ----------
await waitHost(v => v.room.phase === 'scoreboard'); await H({ k: 'h.continue' });
for (const id of ['halbwissen', 'damals-wars', 'auswaertsspiel']) { await waitHost(v => v.room.phase === 'wall'); await H({ k: 'h.pick', tileId: id }); await H({ k: 'h.skipTile' }); }
await waitHost(v => v.room.phase === 'scoreboard'); await H({ k: 'h.continue' });
await waitHost(v => v.round?.kind === 'final'); await sleep(1800);
await tv.screenshot({ path: `${SHOTS}/tv-final-rules.png` });
check((await phones[0].locator('.topbar small').innerText()).includes('verborgen'), 'Finale: Punktestand auf dem Handy verborgen');
for (let t = 0; t < 3; t++) {
  await begin();
  if (t === 0) { await H({ k: 'h.lock' }); await sleep(400); }
  await H({ k: 'h.reveal' }); await sleep(600); await H({ k: 'h.next' });
}
await waitHost(v => v.room.phase === 'ceremony');
for (let st = 0; st < 8; st++) { await sleep(1700); if ([0, 4, 7].includes(st)) await tv.screenshot({ path: `${SHOTS}/tv-ceremony-${st}.png` }); if (st < 7) await H({ k: 'h.ceremonyNext' }); }
await phones[0].screenshot({ path: `${SHOTS}/phone-end.png` });
check(hostView.room.phase === 'ceremony' && hostView.ceremony.step === 7, 'Siegerehrung bis zum Sieger durchgespielt');

hws.close(); await browser.close();
console.log(failures ? `\n${failures} FEHLER` : '\nE2E-2 OK'); process.exit(failures ? 1 : 0);
