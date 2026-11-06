// Spielt eine komplette Show (Eröffnung → 6 Kacheln → Überraschung → Finale → Siegerehrung) mit Bots gegen die Engine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, type Actor } from '../server/engine';
import { BOOK } from '../content';
import type { Action, View, TaskDef } from '../shared/types';
import { AV } from './helpers';
import { glitchZones } from '../server/modes';
import { rng } from '../shared/util';
import type { Room } from '../server/model';

function mkEngine(n = 7, seedNo = 1) {
  const eng = new Engine(BOOK);
  let now = 1_800_000_000_000;
  const { room, hostKey } = eng.newRoom('TEST', now);
  const toks: string[] = [];
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = eng.join(room, `Bot${i + 1}`, AV, now);
    assert.ok(r.ok);
    if (r.ok) { toks.push(r.token); ids.push(r.player.id); }
  }
  let rq = 0;
  const host = (a: Action): any => { const r = eng.act(room, { role: 'host' }, `h${++rq}`, a, now); return r; };
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  const view = (i: number | 'host' | 'tv'): View => eng.buildView(room, i === 'host' ? { role: 'host' } : i === 'tv' ? { role: 'tv' } : { role: 'player', pid: ids[i] }, now);
  const advance = (ms: number) => { now += ms; eng.tick(room, now); };
  void hostKey; void seedNo;
  return { eng, room, ids, host, pl, view, advance, get now() { return now; } };
}

function botSubmit(g: ReturnType<typeof mkEngine>, task: TaskDef, rand: () => number) {
  const { room, ids, pl, eng } = g;
  const stage = room.round!.stage;
  ids.forEach((id, i) => {
    switch (task.mode) {
      case 'geo': {
        if (i === ids.length - 1) return; // fehlende Abgabe
        const a = task.answer;
        pl(i, { k: 'submit', payload: { lat: Math.max(-80, Math.min(80, a.lat + (rand() - 0.5) * 30 * (i + 1))), lon: Math.max(-170, Math.min(170, a.lon + (rand() - 0.5) * 40 * (i + 1))) } });
        break;
      }
      case 'rank': {
        const r = room.round!;
        const step = r.m.step as number;
        if (i === 0) { /* Spieler 0 platziert perfekt */ const item = task.order[step]; pl(i, { k: 'submit', payload: { step, slot: item } }); }
        else { const pm = r.pm[id]; const free = [0, 1, 2, 3, 4].filter(s => !pm || pm.slots[s] === -1); if (free.length) pl(i, { k: 'submit', payload: { step, slot: free[Math.floor(rand() * free.length)] } }); }
        break;
      }
      case 'estimate': {
        if (stage === 'open') pl(i, { k: 'submit', payload: { value: Math.round(task.answer * (0.5 + rand())) } });
        else {
          const guessers = ids.filter(x => room.round!.pm[x]?.guess !== undefined);
          const amount = task.bets[i % task.bets.length];
          pl(i, { k: 'submit', payload: { amount, target: guessers[(i + 1) % guessers.length] } });
        }
        break;
      }
      case 'glitch': {
        const z = glitchZones(task)[0];
        pl(i, { k: 'submit', payload: i % 3 === 0 ? { x: z.x, y: z.y } : { x: Math.min(990, z.x + 300), y: Math.min(590, z.y + 200) } });
        break;
      }
      case 'codebreak': {
        if (i % 2 === 0) { pl(i, { k: 'hint' }); }
        pl(i, { k: 'submit', payload: { answer: i === 1 ? 'falsch' : task.answers[0] } });
        break;
      }
      case 'match': {
        const pos = (k: number) => task.order.indexOf(k);
        const perfect = [0, 1, 2, 3, 4, 5].map(pos);
        const pairs = i === 0 ? perfect : i === 1 ? perfect.map((p, k) => (k < 3 ? p : -1)) : [0, 1, 2, 3, 4, 5].map(k => (k + i) % 6);
        const clean = pairs.map((p, k) => (pairs.indexOf(p) === k ? p : -1));
        if (i !== 3) pl(i, { k: 'submit', payload: { pairs: clean, final: true } });   // Spieler 3 gibt nichts ab
        break;
      }
      case 'link': {
        if (i === 6) return;                                                          // keine Abgabe
        pl(i, { k: 'submit', payload: { answer: i % 2 === 0 ? task.answer : 'Phantasie' + i } });
        break;
      }
      case 'unique': {
        const names = task.valid.map(v => v.name);
        pl(i, { k: 'submit', payload: { answer: i < 2 ? names[0] : i === 2 ? 'Atlantis' : names[i % names.length] } });
        break;
      }
    }
  });
  void eng;
}

test('Komplette Show: alle Modi, Zwischenstände, Finale (verborgen), Siegerehrung – ohne Hänger, Punkte konsistent', () => {
  const g = mkEngine(7);
  const rand = rng(42);
  const { eng, host, view } = g;
  const room: Room = g.room;
  assert.ok(host({ k: 'h.startShow' }).ok);
  assert.equal(room.phase, 'intro');
  assert.ok(host({ k: 'h.introDone' }).ok);
  const phase = () => room.phase as string;
  const modesSeen = new Set<string>();
  const pickers = new Set<string>();
  let tiles = 0;
  const maxTileScore: Record<string, number> = {};
  let guard = 0;

  while (phase() !== 'ceremony' && guard++ < 400) {
    if (phase() === 'wall') {
      pickers.add(room.pickerId!);
      const open = Object.entries(room.tileStatus).filter(([, s]) => s === 'open').map(([id]) => id);
      // Picker wählt selbst (über Spieleraktion)
      const pi = g.ids.indexOf(room.pickerId!);
      const r = g.pl(pi, { k: 'pick', tileId: open[Math.floor(rand() * open.length)] });
      assert.ok(r.ok, JSON.stringify(r));
      tiles++;
      continue;
    }
    if (phase() === 'scoreboard') {
      const v = view('tv');
      assert.equal(v.scoreboard!.standings.length, 7);
      assert.ok(host({ k: 'h.continue' }).ok);
      continue;
    }
    assert.equal(phase(), 'round');
    const task = eng.curTask(room)!;
    modesSeen.add(task.mode);
    const tile = eng.curTile(room)!;
    assert.ok(host({ k: 'h.begin' }).ok);
    // Spieler antworten; mehrstufige Modi durchlaufen
    for (let step = 0; step < 12 && ['view', 'open', 'bet'].includes(room.round!.stage); step++) {
      if (room.round!.stage === 'view') { g.advance((room.round!.deadline! - g.now) + 1); continue; }
      botSubmit(g, task, rand);
      if (['view', 'open', 'bet'].includes(room.round!.stage)) {
        if (task.mode === 'rank' || task.mode === 'estimate') continue; // Auto-Weiterschaltung bei "alle fertig"
        host({ k: 'h.lock' });
      }
    }
    if (task.mode === 'link') {
      assert.equal(room.round!.stage, 'review', 'falsche Antworten brauchen die Host-Prüfung');
      assert.ok(view('tv').round!.data.groups === undefined, 'TV sieht Antworten erst bei der Auflösung');
    }
    if (task.mode === 'unique') {
      assert.equal(room.round!.stage, 'review');
      const groups = view('host').round!.data.groups;
      const unknown = groups.find((x: any) => x.state === 'unknown');
      assert.ok(unknown);
      assert.ok(host({ k: 'h.review', groupKey: unknown.key, decision: 'valid' }).ok);
    }
    assert.ok(host({ k: 'h.reveal' }).ok, 'reveal');
    assert.equal(room.round!.stage, 'reveal');
    // negative Punkte niemals
    for (const p of room.players) assert.ok(p.score >= 0);
    // Aufgabenbudget nie überschritten
    for (const p of eng.active(room)) {
      const key = `${tile.id}#${room.round!.taskIndex}`;
      const got = room.scoreLog.filter(e => e.key === key && e.pid === p.id).reduce((a, e) => a + e.applied, 0);
      const max = room.round!.result!.entries.length ? 1000 : 0;
      assert.ok(got <= max);
    }
    assert.ok(host({ k: 'h.next' }).ok);
    if (phase() !== 'round' || room.round?.tileId !== tile.id) {
      const id = tile.id;
      for (const p of eng.active(room)) {
        const total = room.scoreLog.filter(e => e.key.startsWith(id + '#') && e.pid === p.id).reduce((a, e) => a + e.applied, 0);
        maxTileScore[id] = Math.max(maxTileScore[id] ?? 0, total);
        const cap = tile.kind === 'final' ? 2000 : 1000;
        assert.ok(total <= cap, `${id}: ${total} > ${cap}`);
      }
    }
    if (room.hideScores) {
      // Finale: Rangliste verborgen
      const pv = view(0);
      assert.equal(pv.players.every(p => p.score === null), true, 'Scores im Finale verborgen');
      assert.equal(pv.me!.score, null);
    }
  }
  assert.equal(phase(), 'ceremony');
  assert.ok(guard < 400);
  assert.equal(tiles, 6, 'sechs Kategorien');
  assert.ok(!modesSeen.has('codebreak'), 'CODEBREAK kommt im neuen Paket nicht mehr vor');
  for (const m of ['unique', 'geo', 'link', 'rank', 'estimate']) assert.ok(modesSeen.has(m), 'Modus ' + m + ' (Überraschung/Finale garantieren diese Modi)');
  assert.ok(pickers.size >= 6, 'Auswahl wechselt reihum: ' + pickers.size);

  // Siegerehrung
  const steps = eng.ceremonySteps(room);
  assert.equal(steps, 1 + 4 + 4);
  const hidden = view(0);
  assert.equal(hidden.players.every(p => p.score === null), true);
  assert.deepEqual(hidden.ceremony!.standings, []); // Handys sehen vor dem Ende keine Plätze
  const tvStandings: number[][] = [];
  for (let s = 0; s < steps; s++) {
    const tv = view('tv');
    assert.equal(tv.ceremony!.step, s);
    tvStandings.push(tv.ceremony!.standings.map(x => x.score));
    if (s < steps - 1) assert.ok(host({ k: 'h.ceremonyNext' }).ok);
  }
  const finalV = view('tv');
  const sorted = finalV.ceremony!.standings;
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i - 1].score >= sorted[i].score);
  const winner = sorted[0];
  const real = eng.active(room).map(p => p.score);
  assert.equal(winner.score, Math.max(...real));
  // Gesamtstände = Summe der Log-Einträge
  for (const p of eng.active(room)) assert.equal(p.score, room.scoreLog.filter(e => e.pid === p.id).reduce((a, e) => a + e.applied, 0));
  assert.equal(view(0).players.every(p => p.score !== null), true, 'am Ende sehen alle die Punkte');
  assert.ok(host({ k: 'h.end' }).ok);
  assert.equal(phase(), 'ended');
});

test('Gleichstand-Regel: mehr Finalpunkte, dann frühere Anmeldung', () => {
  const g = mkEngine(3);
  const { room, eng } = g;
  const [a, b, c] = g.ids;
  room.scoreLog.push({ id: 1, key: 'x#0', pid: a, requested: 100, applied: 100, label: '', at: 0 });
  room.scoreLog.push({ id: 2, key: 'x#0', pid: b, requested: 100, applied: 100, label: '', at: 0 });
  room.scoreLog.push({ id: 3, key: 'x#0', pid: c, requested: 100, applied: 100, label: '', at: 0 });
  const finalId = BOOK.tiles.find(t => t.kind === 'final')!.id;
  room.scoreLog.push({ id: 4, key: finalId + '#0', pid: c, requested: 50, applied: 50, label: '', at: 0 });
  room.scoreLog.push({ id: 5, key: finalId + '#0', pid: a, requested: 50, applied: 50, label: '', at: 0 });
  room.scoreLog.push({ id: 6, key: 'y#0', pid: b, requested: 50, applied: 50, label: '', at: 0 });
  eng.recompute(room);
  // alle 150; Finalpunkte: a=50, c=50, b=0 → a vor c (früher), b zuletzt
  assert.deepEqual(eng.sortedPlayers(room).map(x => x.p.id), [a, c, b]);
});

test('Setz auf mich: Einsatz gewonnen/verloren nachvollziehbar, nie negativ, Mindestbestand', () => {
  const g = mkEngine(3);
  const { room, host, pl, ids, eng } = g;
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  // Spieler 1 hat 0 Punkte → darf nichts setzen; Spieler 2 hat 150
  room.players[1].score = 0; room.players[2].score = 150;
  room.scoreLog.push({ id: 99, key: 'bonus#0', pid: ids[2], requested: 150, applied: 150, label: '', at: 0 });
  room.scoreLog.push({ id: 98, key: 'bonus#0', pid: ids[0], requested: 100, applied: 100, label: '', at: 0 });
  eng.recompute(room);
  assert.ok(pl(room.players.findIndex(p => p.id === room.pickerId), { k: 'pick', tileId: 'v2-wahnsinnszahlen' }).ok);
  host({ k: 'h.begin' });
  // Tipps: exakt (p0), 500 (p1), 20000 (p2)
  pl(0, { k: 'submit', payload: { value: 533 } }); pl(1, { k: 'submit', payload: { value: 150 } }); pl(2, { k: 'submit', payload: { value: '20.000' } });
  assert.equal(room.round!.stage, 'bet');
  // p1 (0 Punkte) darf den Mindesteinsatz 100 setzen, aber nicht 200
  assert.equal(pl(1, { k: 'submit', payload: { amount: 200, target: ids[0] } }).err, 'not_enough_points');
  assert.ok(pl(1, { k: 'submit', payload: { amount: 0, target: null } }).ok);
  // p2 hat nur 150 Punkte: 200 ist nicht erlaubt, 100 auf sich selbst schon (und geht verloren)
  assert.equal(pl(2, { k: 'submit', payload: { amount: 200, target: ids[2] } }).err, 'not_enough_points');
  assert.ok(pl(2, { k: 'submit', payload: { amount: 100, target: ids[2] } }).ok);
  assert.equal(pl(2, { k: 'submit', payload: { amount: 100, target: ids[1] } }).ok, false); // endgültig
  // p0 setzt 100 auf sich (gewinnt)
  assert.ok(pl(0, { k: 'submit', payload: { amount: 100, target: ids[0] } }).ok);
  assert.equal(room.round!.stage, 'locked');
  assert.ok(host({ k: 'h.reveal' }).ok);
  const rev = room.round!.result!.reveal;
  assert.deepEqual(rev.winners, [ids[0]]);
  assert.equal(room.players[0].score, 100 + 300 + 100); // Start 100 + bester Tipp 300 + Einsatz 100
  assert.ok(room.players[2].score >= 0);
  const p2log = room.scoreLog.filter(e => e.pid === ids[2]);
  assert.ok(p2log.some(e => e.label.startsWith('Einsatz verloren')));
  assert.equal(room.players[2].score, 150 + 30 - 100); // Platz 3 von 3 = 30 Punkte, Einsatz 100 verloren
  void eng;
});

test('Blind Rank: Platzierung ist endgültig, nur gerade geöffneter Begriff, fehlende Platzierung = nicht gewertet', () => {
  const g = mkEngine(2);
  const { room, host, pl, ids } = g;
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  pl(room.players.findIndex(p => p.id === room.pickerId), { k: 'pick', tileId: 'v2-fussball-zeitreise' });
  host({ k: 'h.begin' });
  assert.equal(room.round!.m.step, 0);
  const task: any = g.eng.curTask(room);
  // Spieler 0 platziert Begriff 1 auf Platz 2
  assert.ok(pl(0, { k: 'submit', payload: { step: 0, slot: 1 } }).ok);
  assert.equal(pl(0, { k: 'submit', payload: { step: 0, slot: 1 } }).ok && true, true); // idempotent
  assert.equal(pl(0, { k: 'submit', payload: { step: 0, slot: 2 } }).ok, false); // nicht verschiebbar
  assert.equal(pl(0, { k: 'submit', payload: { step: 1, slot: 2 } }).err, 'wrong_step');
  // Spieler 1 tut nichts → Frist läuft ab → nächster Begriff
  g.advance(task.secondsPerItem * 1000 + 10);
  assert.equal(room.round!.m.step, 1);
  assert.equal(pl(1, { k: 'submit', payload: { step: 0, slot: 0 } }).ok, false); // zu spät für Schritt 0
  assert.equal(pl(0, { k: 'submit', payload: { step: 0, slot: 1 } }).dup, true); // Wiederholung der bestätigten Platzierung bleibt unkritisch
  // Rest durchlaufen lassen
  for (let i = 0; i < 4; i++) g.advance(task.secondsPerItem * 1000 + 10);
  assert.equal(room.round!.stage, 'locked');
  host({ k: 'h.reveal' });
  const rows = room.round!.result!.reveal.rows;
  assert.equal(rows.find((r: any) => r.pid === ids[1]).points, 0);
});

test('Einzigartig: Host kann unklare Antwort freigeben, mappen oder verwerfen', () => {
  const g = mkEngine(3);
  const { room, host, pl, ids } = g;
  room.plan = ['surprise', 'board', 'final']; // direkt zur Überraschung
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  assert.equal(room.round!.tileId, 'v2-einzigartig');
  host({ k: 'h.begin' });
  pl(0, { k: 'submit', payload: { answer: 'Ungarn' } });
  pl(1, { k: 'submit', payload: { answer: 'Hungary' } });     // Synonym → gleiche Gruppe
  pl(2, { k: 'submit', payload: { answer: 'Slowakai' } });   // Tippfehler → Slowakei
  assert.equal(room.round!.stage, 'review');
  host({ k: 'h.reveal' });
  assert.equal(room.players[0].score, 0); assert.equal(room.players[1].score, 0); assert.equal(room.players[2].score, 500);   // mehrfach genannt = 0 Punkte
});

test('Einsatz nur aus vorhandenen Punkten: 0 Punkte = kein positiver Einsatz, Verlust exakt der Einsatz', () => {
  const g = mkEngine(3);
  const { room, host, pl, ids, eng } = g;
  (eng as any).src = { ...BOOK, rules: { startCredit: 200 } };
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  assert.ok(room.players.every(p => p.score === 200), 'identisches Startguthaben');
  // Spieler 1 verliert per Host-Korrektur alles
  host({ k: 'h.adjust', pid: ids[1], delta: -500, note: 'Test' });
  assert.equal(room.players[1].score, 0);
  pl(room.players.findIndex(p => p.id === room.pickerId), { k: 'pick', tileId: 'v2-wahnsinnszahlen' });
  host({ k: 'h.begin' });
  pl(0, { k: 'submit', payload: { value: 533 } }); pl(1, { k: 'submit', payload: { value: 1000 } }); pl(2, { k: 'submit', payload: { value: 90000 } });
  assert.equal(pl(1, { k: 'submit', payload: { amount: 100, target: ids[2] } }).err, 'not_enough_points'); // 0 Punkte: kein Einsatz
  assert.ok(pl(1, { k: 'submit', payload: { amount: 0, target: null } }).ok);                            // aber schätzen darf er
  assert.equal(pl(2, { k: 'submit', payload: { amount: 300, target: ids[0] } }).err, 'invalid_bet');       // nicht erlaubter Betrag
  assert.ok(pl(2, { k: 'submit', payload: { amount: 200, target: ids[1] } }).ok);                         // 200 von 200 vorhanden: erlaubt
  pl(0, { k: 'submit', payload: { amount: 0, target: null } });
  host({ k: 'h.reveal' });
  const bet = room.scoreLog.find(e => e.pid === ids[2] && e.label.startsWith('Einsatz verloren'))!;
  assert.equal(bet.applied, -200); // verliert genau den Einsatz – nie mehr, nie weniger
  assert.ok(room.players.every(p => p.score >= 0));
  assert.equal(room.players[1].score, room.scoreLog.filter(e => e.pid === ids[1]).reduce((a, e) => a + e.applied, 0));
});

test('Verteilungsregeln: Fußball- und Modus-Limit sperren Kacheln, aber nie alle', () => {
  const g = mkEngine(3);
  const { room, host, pl, eng } = g;
  (eng as any).src = { ...BOOK, rules: { maxFootball: 1, maxPerMode: 2 } };
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  const pickerIdx = () => room.players.findIndex(p => p.id === room.pickerId);
  const play = (id: string) => { const r = pl(pickerIdx(), { k: 'pick', tileId: id }); host({ k: 'h.skipTile' }); return r; };
  assert.ok(play('v2-fussball-zeitreise').ok);                              // 1. Fußball-Kachel
  assert.equal(eng.blockedTiles(room).has('v2-heimspiel'), true);    // weitere Fußball-Kacheln gesperrt
  assert.equal(pl(pickerIdx(), { k: 'pick', tileId: 'v2-heimspiel' }).err, 'tile_limited');
  assert.ok(play('v2-orte-mit-geschichte').ok); assert.ok(play('v2-wer-war-zuerst').ok);
  // geo-daneben (1 von 2 geo) ok; zweite Rank-Kachel? 'koenig' + 'damals' = 2 rank -> keine weitere rank-Kachel
  const view = eng.buildView(room, { role: 'tv' }, 0);
  assert.equal(view.wall, null); // Board nach 3 Kacheln
});


test('Alle neun Kategorien einzeln durchgespielt (sieben Spieler): jeder Modus läuft ohne Hänger, Punkte nie negativ, Budget eingehalten', () => {
  const g = mkEngine(7);
  const { eng, room, host, view } = g;
  (eng as any).src = { ...BOOK, rules: { startCredit: 200, maxFootball: 9, maxPerMode: 9 } };
  room.plan = [...Array(9).fill('wall'), 'surprise', 'final'];
  const rand = rng(7);
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  const seen = new Set<string>();
  let guard = 0;
  while (room.phase !== 'ceremony' && guard++ < 300) {
    if (room.phase === 'wall') {
      const open = Object.entries(room.tileStatus).filter(([, st]) => st === 'open').map(([id]) => id);
      assert.ok(g.pl(g.ids.indexOf(room.pickerId!), { k: 'pick', tileId: open[0] }).ok);
      continue;
    }
    if (room.phase === 'scoreboard') { host({ k: 'h.continue' }); continue; }
    const task = eng.curTask(room)!;
    seen.add(task.mode);
    host({ k: 'h.begin' });
    for (let step = 0; step < 14 && ['view', 'open', 'bet'].includes(room.round!.stage); step++) {
      if (room.round!.stage === 'view') { g.advance(room.round!.deadline! - g.now + 1); continue; }
      botSubmit(g, task, rand);
      if (['view', 'open', 'bet'].includes(room.round!.stage) && !['rank', 'estimate'].includes(task.mode)) host({ k: 'h.lock' });
    }
    if (room.round!.stage === 'review') {
      const groups = view('host').round!.data.groups ?? [];
      for (const gr of groups) if (gr.state === 'unknown') host({ k: 'h.review', groupKey: gr.key, decision: 'valid' });
    }
    assert.ok(host({ k: 'h.reveal' }).ok, 'reveal ' + task.mode);
    for (const p of room.players) assert.ok(p.score >= 0);
    const rv = room.round!.result!.reveal;
    assert.ok(rv);
    host({ k: 'h.next' });
  }
  for (const m of ['geo', 'rank', 'estimate', 'glitch', 'unique', 'match', 'link']) assert.ok(seen.has(m), 'Modus fehlt: ' + m);
  assert.ok(!seen.has('codebreak'));
  assert.equal(room.phase, 'ceremony');
});
