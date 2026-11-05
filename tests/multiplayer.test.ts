import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client, closeAll, createRoom, joinPlayer, post, setupShow, startEnv, AV, type TestEnv } from './helpers';
import { TILES } from '../content/tiles';
import { MODES } from '../server/modes';

const envs: TestEnv[] = [];
const env = async (o?: any) => { const e = await startEnv(o); envs.push(e); return e; };
after(async () => { for (const e of envs) await e.close().catch(() => {}); });

const START = 200; // Startguthaben des Standardpakets
const geoTile = TILES.find(t => t.id === 'geo-daneben')!;

async function pickAndBegin(s: Awaited<ReturnType<typeof setupShow>>, tileId: string) {
  const v = await s.host.waitFor(x => x.room.phase === 'wall', 3000, 'wall');
  const picker = s.players.find((_, i) => s.ids[i] === v.wall!.pickerId)!;
  const r = await picker.act({ k: 'pick', tileId });
  assert.ok(r.ok, r.err);
  await s.tv.waitFor(x => x.room.phase === 'round' && x.round?.tileId === tileId, 3000, 'round');
  assert.equal((await s.host.act({ k: 'h.begin' })).ok, true);
  await s.players[0].waitFor(x => x.round?.stage === 'open' || x.round?.stage === 'view');
}

test('A1–A20: Raum, Lobby, 6 echte Clients, Kategorienwand, Geo-Runde, Wertung, Rangliste, zurück zur Wand', async () => {
  const e = await env();
  const s = await setupShow(e, 6, false);
  // Lobby: TV + Host sehen alle 6 Spieler, alle verbunden
  const lobby = await s.tv.waitFor(v => v.players.length === 6 && v.players.every(p => p.connected), 3000, 'lobby');
  assert.equal(lobby.room.phase, 'lobby');
  assert.equal(lobby.room.code, s.code);
  const hv = await s.host.waitFor(v => v.players.length === 6);
  assert.ok(hv.host?.pin && /^\d{6}$/.test(hv.host.pin));
  // Spieler sehen keine Host-Daten
  assert.equal(s.players[0].view!.host, undefined);
  // Neue Beitritte nach Schließen der Lobby sind nicht möglich
  await s.host.act({ k: 'h.startShow' });
  await s.host.act({ k: 'h.introDone' });
  const late = await post(e, `/api/rooms/${s.code}/join`, { name: 'Spät', avatar: AV });
  assert.equal(late.status, 400); assert.equal(late.body.err, 'lobby_closed');

  // Kategorienwand: nur der aktuelle Picker darf wählen
  const wall = await s.tv.waitFor(v => v.room.phase === 'wall');
  assert.equal(wall.wall!.tiles.length, 9);
  assert.ok(wall.wall!.tiles.every(t => t.mode === undefined), 'Modus bleibt bis zum Öffnen verborgen');
  const pickerIdx = s.ids.indexOf(wall.wall!.pickerId!);
  const other = s.players[(pickerIdx + 1) % 6];
  assert.equal((await other.act({ k: 'pick', tileId: geoTile.id })).err, 'not_your_turn');
  await pickAndBegin(s, geoTile.id);

  // Handys und TV zeigen dieselbe Aufgabe; Lösung nicht sichtbar
  const pv = s.players[0].view!;
  assert.equal(pv.round!.mode, 'geo');
  assert.ok(!JSON.stringify(pv).includes('Mali') && !JSON.stringify(s.tv.view).includes('Mali'), 'Lösung darf nicht vorzeitig ausgeliefert werden');
  assert.ok(JSON.stringify(s.host.view).includes('Mali'), 'Host sieht die Lösung');
  assert.ok(pv.round!.deadline! > pv.now);

  // Abgaben: Punkt exakt, Punkt nah, weit weg, ... Spieler 6 gibt nichts ab
  const ans = { lat: 16.7735, lon: -3.0074 };
  const guesses = [ans, { lat: 46, lon: 80 }, { lat: 40, lon: 100 }, { lat: 0, lon: 0 }, { lat: -30, lon: -60 }];
  for (let i = 0; i < 5; i++) {
    const r = await s.players[i].act({ k: 'submit', payload: guesses[i] });
    assert.ok(r.ok, r.err);
  }
  // TV sieht: wer abgegeben hat, nicht was
  const tvv = await s.tv.waitFor(v => v.players.filter(p => p.answered).length === 5);
  assert.ok(!JSON.stringify(tvv.round!.data).includes('16.7735'));
  // Host sperrt, zeigt Auflösung
  assert.ok((await s.host.act({ k: 'h.lock' })).ok);
  await s.players[5].waitFor(v => v.round?.stage === 'locked');
  assert.equal((await s.players[5].act({ k: 'submit', payload: ans })).err, 'closed'); // nach Sperre keine Abgabe mehr
  assert.ok((await s.host.act({ k: 'h.reveal' })).ok);
  const rev = await s.tv.waitFor(v => v.round?.stage === 'reveal');
  const g = rev.round!.reveal.guesses as any[];
  assert.equal(g.length, 5);
  assert.equal(g[0].pid, s.ids[0]); assert.equal(g[0].points, 250);
  assert.equal(g[0].km, 0);
  // Punkte serverseitig gespeichert, Rangliste aktuell
  const me = await s.players[0].waitFor(v => v.me?.score === START + 250);
  assert.equal(me.me!.rank, 1);
  const p6 = s.players[5].view!.me!;
  assert.equal(p6.score, START);
  // Doppelte Auflösung erzeugt keine doppelten Punkte
  assert.ok((await s.host.act({ k: 'h.reveal' })).ok);
  assert.equal(s.host.view!.players.find(p => p.id === s.ids[0])!.score, START + 250);
  // weiter: nächste Aufgabe derselben Kachel
  assert.ok((await s.host.act({ k: 'h.next' })).ok);
  const nxt = await s.tv.waitFor(v => v.round?.taskIndex === 1);
  assert.equal(nxt.round!.stage, 'intro');
  // Kachel überspringen → zurück zur Wand, Kachel ist "gespielt"
  assert.ok((await s.host.act({ k: 'h.skipTile' })).ok);
  const w2 = await s.tv.waitFor(v => v.room.phase === 'wall');
  assert.equal(w2.wall!.tiles.find(t => t.id === geoTile.id)!.status, 'played');
  assert.notEqual(w2.wall!.pickerId, wall.wall!.pickerId, 'Auswahl wechselt');
  closeAll(s);
});

test('Doppelte Antwortübertragung: gleiche reqId und gleicher Inhalt → keine doppelten Punkte', async () => {
  const e = await env();
  const s = await setupShow(e, 3);
  await pickAndBegin(s, geoTile.id);
  const p = s.players[0];
  const r1 = await p.act({ k: 'submit', payload: { lat: 16.7735, lon: -3.0074 } }, 'REQ-1');
  const r2 = await p.act({ k: 'submit', payload: { lat: 16.7735, lon: -3.0074 } }, 'REQ-1'); // identische reqId
  const r3 = await p.act({ k: 'submit', payload: { lat: 16.7735, lon: -3.0074 } }); // neue reqId, gleicher Inhalt
  const r4 = await p.act({ k: 'submit', payload: { lat: 10, lon: 10 } }); // anderer Inhalt → abgelehnt
  assert.ok(r1.ok && !r1.dup); assert.ok(r2.ok && r2.dup); assert.ok(r3.ok && r3.dup);
  assert.equal(r4.ok, false); assert.equal(r4.err, 'already_submitted');
  await s.host.act({ k: 'h.reveal' });
  await s.host.waitFor(v => v.round?.stage === 'reveal');
  const sc = s.host.view!.players.find(x => x.id === s.ids[0])!.score;
  assert.equal(sc, START + 250);
  assert.equal(s.host.view!.host!.scoreLog.filter(x => x.pid === s.ids[0] && x.key !== 'start').length, 1);
  closeAll(s);
});

test('Verbindungsausfall VOR Abgabe: Spieler kehrt zurück und kann noch abgeben; Zustand wird vollständig geladen', async () => {
  const e = await env();
  const s = await setupShow(e, 3);
  await pickAndBegin(s, geoTile.id);
  const p = s.players[1];
  p.disconnect();
  const hv = await s.host.waitFor(v => v.players.find(x => x.id === s.ids[1])!.connected === false, 3000, 'host sees offline');
  assert.equal(hv.room.phase, 'round'); // Show läuft weiter
  // andere spielen weiter
  await s.players[0].act({ k: 'submit', payload: { lat: 1, lon: 1 } });
  // Wiederverbindung mit gespeichertem Token
  const p2 = new Client(e, 'player', s.code, s.tokens[1], 'p2b'); await p2.connect();
  const v = p2.view!;
  assert.equal(v.me!.id, s.ids[1]);
  assert.equal(v.round!.stage, 'open'); // Frage läuft noch
  assert.equal(v.round!.data.mine, null); // Antwort noch nicht gesendet
  const r = await p2.act({ k: 'submit', payload: { lat: 5, lon: 5 } });
  assert.ok(r.ok);
  const after = await s.host.waitFor(x => x.players.find(y => y.id === s.ids[1])!.connected && x.players.find(y => y.id === s.ids[1])!.answered);
  assert.equal(after.players.length, 3); // keine Duplikate durch Reconnect
  closeAll(s); p2.disconnect();
});

test('Verbindungsausfall NACH bestätigter Abgabe: Antwort bleibt gültig, Wiederverbindung zeigt sie', async () => {
  const e = await env();
  const s = await setupShow(e, 3);
  await pickAndBegin(s, geoTile.id);
  const ack = await s.players[0].act({ k: 'submit', payload: { lat: 16.7735, lon: -3.0074 } });
  assert.ok(ack.ok);
  s.players[0].disconnect();
  await s.host.act({ k: 'h.reveal' });
  const p2 = new Client(e, 'player', s.code, s.tokens[0]); await p2.connect();
  await p2.waitFor(v => v.round?.stage === 'reveal');
  assert.equal(p2.view!.me!.score, START + 250);
  closeAll(s); p2.disconnect();
});

test('Wiederverbindung NACH Fristablauf: keine nachträgliche Abgabe; Frist wird serverseitig durchgesetzt', async () => {
  const e = await env();
  const s = await setupShow(e, 3);
  await pickAndBegin(s, geoTile.id);
  s.players[2].disconnect();
  e.clock.now += 41_000; // Server-Uhr springt über die Frist (40 s)
  await s.host.waitFor(v => v.round?.stage === 'locked', 3000, 'auto lock');
  const p2 = new Client(e, 'player', s.code, s.tokens[2]); await p2.connect();
  assert.equal(p2.view!.round!.stage, 'locked');
  const r = await p2.act({ k: 'submit', payload: { lat: 1, lon: 1 } });
  assert.equal(r.ok, false); assert.equal(r.err, 'closed');
  closeAll(s); p2.disconnect();
});

test('Pause friert den Countdown ein; Zeit verlängern; Fortsetzen', async () => {
  const e = await env();
  const s = await setupShow(e, 2);
  await pickAndBegin(s, geoTile.id);
  e.clock.now += 10_000;
  await s.host.act({ k: 'h.pause', paused: true });
  const v = await s.tv.waitFor(x => x.round?.pausedLeft != null);
  assert.equal(v.round!.pausedLeft, 25_000); assert.equal(v.round!.deadline, null);
  e.clock.now += 120_000; // viel Zeit vergeht → keine Sperre
  await new Promise(r => setTimeout(r, 150));
  assert.equal(s.tv.view!.round!.stage, 'open');
  await s.host.act({ k: 'h.pause', paused: false });
  const v2 = await s.tv.waitFor(x => x.round?.deadline != null);
  assert.equal(v2.round!.deadline, e.clock.now + 25_000);
  await s.host.act({ k: 'h.addTime', seconds: 20 });
  const v3 = await s.tv.waitFor(x => x.round?.deadline === e.clock.now + 45_000);
  assert.ok(v3);
  closeAll(s);
});

test('TV-Reload: neuer Bildschirm erhält sofort den vollständigen aktuellen Zustand', async () => {
  const e = await env();
  const s = await setupShow(e, 3);
  await pickAndBegin(s, geoTile.id);
  await s.players[0].act({ k: 'submit', payload: { lat: 1, lon: 1 } });
  s.tv.disconnect();
  const tv2 = new Client(e, 'tv', s.code); await tv2.connect();
  assert.equal(tv2.view!.round!.stage, 'open');
  assert.equal(tv2.view!.players.filter(p => p.answered).length, 1);
  assert.equal(tv2.view!.room.code, s.code);
  closeAll(s); tv2.disconnect();
});

test('Host-Reload & Host-Wechsel per PIN; falscher Schlüssel wird abgewiesen; Spieler können keine Host-Aktionen', async () => {
  const e = await env();
  const s = await setupShow(e, 2);
  s.host.disconnect();
  const h2 = new Client(e, 'host', s.code, s.hostKey); await h2.connect();
  assert.equal(h2.view!.room.phase, 'wall');
  assert.ok(h2.view!.host);
  // falscher Schlüssel
  const bad = new Client(e, 'host', s.code, 'falsch');
  await assert.rejects(bad.connect(), /bad_host_key/);
  // Spieler → Host-Aktion
  const r = await s.players[0].act({ k: 'h.end' } as any);
  assert.equal(r.ok, false); assert.equal(r.err, 'forbidden');
  // TV → keine Aktionen
  const rt = await s.tv.act({ k: 'h.end' } as any);
  assert.equal(rt.ok, false);
  // PIN-Login auf neuem Gerät
  assert.equal((await post(e, `/api/rooms/${s.code}/host-login`, { pin: '000000' })).status, 403);
  const login = await post(e, `/api/rooms/${s.code}/host-login`, { pin: s.hostPin });
  assert.equal(login.status, 200);
  const h3 = new Client(e, 'host', s.code, login.body.hostKey); await h3.connect();
  await h2.waitFor(() => h2.kicked === 'host_elsewhere' || h2.closed, 2000);
  assert.equal(h3.view!.room.phase, 'wall');
  closeAll(s); h3.disconnect(); h2.disconnect();
});

test('Gerätewechsel: Wiederherstellungscode übernimmt Identität (Avatar, Punkte); altes Gerät wird abgemeldet; keine Duplikate', async () => {
  const e = await env();
  const s = await setupShow(e, 3);
  await pickAndBegin(s, geoTile.id);
  await s.players[0].act({ k: 'submit', payload: { lat: 16.7735, lon: -3.0074 } });
  await s.host.act({ k: 'h.reveal' });
  await s.players[0].waitFor(v => v.me?.score === START + 250);
  const wrong = await post(e, `/api/rooms/${s.code}/recover`, { code: 'ZZZZZZ' });
  assert.equal(wrong.status, 400);
  const rec = await post(e, `/api/rooms/${s.code}/recover`, { code: s.recov[0].toLowerCase() });
  assert.equal(rec.status, 200); assert.equal(rec.body.playerId, s.ids[0]);
  const n = new Client(e, 'player', s.code, rec.body.token); await n.connect();
  assert.equal(n.view!.me!.score, START + 250);
  assert.equal(n.view!.players.length, 3);
  await s.players[0].waitFor(() => s.players[0].kicked === 'replaced' || s.players[0].closed, 2000);
  // altes Token ist ungültig
  const old = new Client(e, 'player', s.code, s.tokens[0]);
  await assert.rejects(old.connect(), /bad_token/);
  closeAll(s); n.disconnect();
});

test('Host gibt Spielerplatz frei: neues Gerät übernimmt per Auswahl', async () => {
  const e = await env();
  const s = await setupShow(e, 3);
  const before = await post(e, `/api/rooms/${s.code}/claim`, { playerId: s.ids[1] });
  assert.equal(before.status, 400); // nicht freigegeben
  await s.host.act({ k: 'h.release', pid: s.ids[1] });
  const info = await (await fetch(`${e.url}/api/rooms/${s.code}`)).json() as any;
  assert.deepEqual(info.seats.map((x: any) => x.id), [s.ids[1]]);
  const c = await post(e, `/api/rooms/${s.code}/claim`, { playerId: s.ids[1] });
  assert.equal(c.status, 200);
  const n = new Client(e, 'player', s.code, c.body.token); await n.connect();
  assert.equal(n.view!.me!.id, s.ids[1]);
  assert.equal((await post(e, `/api/rooms/${s.code}/claim`, { playerId: s.ids[1] })).status, 400); // nur einmal
  closeAll(s); n.disconnect();
});

test('Fehlende Spielerantwort = 0 Punkte; Host-Korrektur (auch negativ, nie unter 0); Neustart der Aufgabe setzt Punkte zurück', async () => {
  const e = await env();
  const s = await setupShow(e, 3);
  await pickAndBegin(s, geoTile.id);
  await s.players[0].act({ k: 'submit', payload: { lat: 16.7735, lon: -3.0074 } });
  await s.host.act({ k: 'h.reveal' });
  await s.host.waitFor(v => v.round?.stage === 'reveal');
  const score = (i: number) => s.host.view!.players.find(p => p.id === s.ids[i])!.score;
  assert.equal(score(0), START + 250); assert.equal(score(1), START); assert.equal(score(2), START);
  await s.host.act({ k: 'h.adjust', pid: s.ids[1], delta: 100, note: 'Verbindungsproblem' });
  await s.host.waitFor(v => v.players.find(p => p.id === s.ids[1])!.score === START + 100);
  await s.host.act({ k: 'h.adjust', pid: s.ids[1], delta: -500, note: 'Test' });
  await s.host.waitFor(() => score(1) === 0);
  assert.equal(score(1), 0); // nie negativ (Abzug wird auf den vorhandenen Stand gedeckelt)
  assert.ok(s.host.view!.host!.scoreLog.some(x => x.manual && x.label.includes('Verbindungsproblem')));
  // Neustart der Aufgabe: Auswertung wird verworfen
  await s.host.act({ k: 'h.restartTask' });
  await s.host.waitFor(v => v.round?.stage === 'intro');
  assert.equal(score(0), START);
  await s.host.act({ k: 'h.begin' });
  const r = await s.players[0].act({ k: 'submit', payload: { lat: 16.7735, lon: -3.0074 } });
  assert.ok(r.ok, 'nach Neustart kann erneut abgegeben werden');
  closeAll(s);
});

test('Serverneustart: Raum, Spieler, Punkte, Phase und Timer werden aus SQLite wiederhergestellt', async () => {
  const e1 = await startEnv();
  const s = await setupShow(e1, 3);
  await pickAndBegin(s, geoTile.id);
  await s.players[0].act({ k: 'submit', payload: { lat: 16.7735, lon: -3.0074 } });
  const deadline = s.tv.view!.round!.deadline;
  const code = s.code, tokens = s.tokens, hostKey = s.hostKey, ids = s.ids;
  closeAll(s);
  await e1.close();
  // neuer Server auf derselben Datenbank
  const e2 = await startEnv({ dbFile: e1.dbFile });
  envs.push(e2);
  e2.clock.now = e1.clock.now;
  const h = new Client(e2, 'host', code, hostKey); await h.connect();
  assert.equal(h.view!.room.phase, 'round');
  assert.equal(h.view!.round!.deadline, deadline);
  const p = new Client(e2, 'player', code, tokens[0]); await p.connect();
  assert.equal(p.view!.me!.id, ids[0]);
  assert.deepEqual(p.view!.round!.data.mine, { lat: 16.7735, lon: -3.0074 }); // bestätigte Antwort bleibt erhalten
  const p2 = new Client(e2, 'player', code, tokens[1]); await p2.connect();
  assert.ok((await p2.act({ k: 'submit', payload: { lat: 3, lon: 3 } })).ok);
  await h.act({ k: 'h.reveal' });
  await h.waitFor(v => v.round?.stage === 'reveal');
  assert.equal(h.view!.players.find(x => x.id === ids[0])!.score, START + 250);
  assert.equal(e2.app.store.eventCount(code) > 0, true);
  h.disconnect(); p.disconnect(); p2.disconnect();
});

test('Host-Passwort schützt die Raumerstellung (optional)', async () => {
  const e = await startEnv();
  envs.push(e);
  e.app.opts.hostPassword = 'geheim';
  assert.equal((await post(e, '/api/rooms', {})).status, 403);
  assert.equal((await post(e, '/api/rooms', { password: 'geheim' })).status, 200);
});

test('Eingabevalidierung: Müll wird serverseitig abgelehnt', async () => {
  const e = await env();
  const s = await setupShow(e, 2);
  await pickAndBegin(s, geoTile.id);
  for (const bad of [{ lat: 'x', lon: 1 }, { lat: 100, lon: 0 }, { lat: 0, lon: 999 }, null, {}]) {
    const r = await s.players[0].act({ k: 'submit', payload: bad as any });
    assert.equal(r.ok, false);
  }
  const j = await post(e, `/api/rooms/${s.code}/join`, { name: 'x', avatar: { ...AV, hat: 99 } });
  assert.equal(j.status, 400);
  closeAll(s);
  void MODES; void joinPlayer; void createRoom;
});
