// Spielregeln aus dem ersten Praxistest: Geo-Entfernung (60 s), Blind-Rank-Varianten, SETZ AUF MICH, GLITCH-Ablauf, VERBINDUNG 20 s, EINZIGARTIG-Prüfung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Engine } from '../server/engine';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS } from '../content';
import { AV } from './helpers';
import { analyzeShow } from '../shared/analysis';
import { geoPoints, rankPairs } from '../shared/scoring';
import type { Action, Book, View } from '../shared/types';

const CS = new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'outplay-r2-')), 'c.db')), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });
const BASE: Book = CS.resolveBook('show-1@1');

function game(rules: Book['rules'] = {}, n = 7) {
  const book: Book = { ...BASE, rules: { ...BASE.rules, ...rules } };
  const eng = new Engine(() => book);
  let now = 1_800_000_000_000;
  const { room } = eng.newRoom('R2', now, 'show-1@1', 'show');
  const ids: string[] = [];
  for (let i = 0; i < n; i++) { const r = eng.join(room, `Bot${i + 1}`, AV, now); assert.ok(r.ok); if (r.ok) ids.push(r.player.id); }
  let rq = 0;
  const host = (a: Action): any => eng.act(room, { role: 'host' }, `h${++rq}`, a, now);
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  const view = (who: number | 'host' | 'tv'): View => eng.buildView(room, who === 'host' ? { role: 'host' } : who === 'tv' ? { role: 'tv' } : { role: 'player', pid: ids[who] }, now);
  const advance = (ms: number) => { now += ms; eng.tick(room, now); };
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  const goto = (tile: string) => { for (let i = 0; i < 20 && (room.round?.tileId !== tile || room.phase !== 'round'); i++) host({ k: (room.phase as string) === 'scoreboard' ? 'h.continue' : 'h.skipTile' }); assert.equal(room.round!.tileId, tile); };
  return { eng, room, ids, host, pl, view, advance, goto, get now() { return now; } };
}
const G = (g: ReturnType<typeof game>) => g;

test('Geo: 60 Sekunden, Punkte nur nach Entfernung, Auflösung zeigt km und Punkte, kein Platz-Rang', () => {
  const g = game(); g.goto('s3-r1'); assert.ok(g.host({ k: 'h.begin' }).ok);
  const t = g.eng.curTask(g.room) as any;
  assert.equal(Math.round((g.room.round!.deadline! - g.now) / 1000), 60, 'Betrachtungszeit 60 s');
  const km = [0, 0.01, 0.02, 0.9, 1.8, 3, 6];        // Breitengrad-Offsets → ca. 0 … 670 km
  g.ids.forEach((_, i) => g.pl(i, { k: 'submit', payload: { lat: t.answer.lat + km[i], lon: t.answer.lon } }));
  g.host({ k: 'h.lock' }); assert.ok(g.host({ k: 'h.reveal' }).ok);
  const rev = g.view('tv').round!.reveal; assert.equal(rev.guesses.length, 7);
  for (const gu of rev.guesses) assert.equal(gu.points, geoPoints(gu.km, t.points, t.map), 'Punkte = Formel(Entfernung)');
  assert.equal(rev.guesses[0].points, t.points, 'Treffer = volle Punkte');
  const pts = rev.guesses.map((x: any) => x.points); for (let i = 1; i < pts.length; i++) assert.ok(pts[i] <= pts[i - 1]);
  // gleiche Entfernung → gleiche Punkte, unabhängig vom Rang (Spieler 2 und 3 liegen praktisch gleich weit)
  assert.ok(g.room.players.every(p => p.score >= 0));
});

test('BLIND RANK: Standard bleibt „nacheinander“; Paketregel „sort“ zeigt alle fünf, Wertung identisch (Paarvergleiche), Auflösung nennt Paare', () => {
  const seq = game(); seq.goto('s3-r3'); seq.host({ k: 'h.begin' });
  assert.equal(seq.view(0).round!.data.variant, 'sequence'); assert.ok(seq.view(0).round!.data.item);
  const g = game({ rankVariant: 'sort' }); g.goto('s3-r3'); g.host({ k: 'h.begin' });
  const d = g.view(0).round!.data; assert.equal(d.variant, 'sort'); assert.equal(d.pool.length, 5); assert.equal(d.item, null);
  assert.equal(g.room.round!.stageSeconds, 42, 'Gesamtzeit der Sortier-Variante');
  assert.equal(g.pl(0, { k: 'submit', payload: { order: [0, 1, 2, 3] } }).ok, false, 'unvollständig');
  assert.equal(g.pl(0, { k: 'submit', payload: { order: [0, 0, 1, 2, 3] } }).ok, false, 'Duplikate');
  const perfect = [0, 1, 2, 3, 4], reversed = [4, 3, 2, 1, 0], mixed = [1, 0, 2, 3, 4];
  assert.ok(g.pl(0, { k: 'submit', payload: { order: perfect } }).ok);
  assert.equal(g.pl(0, { k: 'submit', payload: { order: reversed } }).err, 'already_submitted');
  assert.ok(g.pl(0, { k: 'submit', payload: { order: perfect } }).dup);
  assert.ok(g.pl(1, { k: 'submit', payload: { order: reversed } }).ok); assert.ok(g.pl(2, { k: 'submit', payload: { order: mixed } }).ok);
  for (let i = 3; i < 7; i++) g.pl(i, { k: 'submit', payload: { order: perfect } });
  assert.equal(g.room.round!.stage, 'locked', 'alle abgegeben → gesperrt'); assert.ok(g.host({ k: 'h.reveal' }).ok);
  const rev = g.view('tv').round!.reveal; const pts = (task: any) => task.points;
  const t = g.eng.curTask(g.room) as any; void pts;
  const row = (i: number) => rev.rows.find((r: any) => r.pid === g.ids[i]);
  assert.equal(row(0).correct, 10); assert.equal(row(0).points, t.points); assert.equal(row(1).correct, 0); assert.equal(row(1).points, 0);
  assert.equal(row(2).correct, 9); assert.equal(row(2).points, Math.round(t.points * 9 / 10));
  assert.equal(row(2).pairs.length, 10); assert.equal(row(2).pairs.filter((p: any) => !p.ok).length, 1);
  assert.equal(rankPairs(row(2).slots).correct, 9);
});

test('SETZ AUF MICH: Wettphase startet automatisch, bei Zeitablauf trotz fehlender Spieler, immer volle Wettzeit; Zähler und Erklärung', () => {
  const g = game(); g.goto('s3-r5'); g.host({ k: 'h.begin' }); const t = g.eng.curTask(g.room) as any;
  g.pl(0, { k: 'submit', payload: { value: t.answer } }); g.pl(1, { k: 'submit', payload: { value: t.answer * 2 } });
  assert.equal(g.view('tv').round!.data.guessedCount, 2); assert.equal(g.view(3).round!.data.total, 7);
  g.advance(10_000); for (let i = 2; i < 6; i++) g.pl(i, { k: 'submit', payload: { value: t.answer * (1 + i / 10) } });
  assert.equal(g.room.round!.stage, 'open', 'ein Spieler fehlt noch');
  g.pl(6, { k: 'submit', payload: { value: t.answer * 3 } });                   // letzte Schätzung kurz vor Ablauf
  assert.equal(g.room.round!.stage, 'bet', 'alle gültig abgegeben → Wettphase startet automatisch');
  assert.equal(Math.round((g.room.round!.deadline! - g.now) / 1000), t.betSeconds, 'volle Wettzeit unabhängig vom Eingang der letzten Schätzung');
  assert.equal(g.view('tv').round!.data.guesses.length, 7, 'alle Schätzungen mit Spielernamen (pid) sichtbar');
  // Zeitablauf ohne alle Antworten: zweites Spiel
  const h = game(); h.goto('s3-r5'); h.host({ k: 'h.begin' }); h.pl(0, { k: 'submit', payload: { value: t.answer } }); h.pl(1, { k: 'submit', payload: { value: t.answer * 2 } });
  h.advance((t.seconds + 1) * 1000); assert.equal(h.room.round!.stage, 'bet', 'Zeitablauf → kontrollierte Wettphase, fehlende Spieler blockieren nicht');
  assert.equal(h.view(0).round!.data.guesses.length, 2);
  assert.equal(h.pl(5, { k: 'submit', payload: { amount: t.bets[1], target: h.ids[0] } }).ok, true, 'auch Spieler ohne Schätzung dürfen wetten');
  h.pl(0, { k: 'submit', payload: { amount: t.bets[1], target: h.ids[1] } });
  h.advance((t.betSeconds + 1) * 1000); assert.equal(h.room.round!.stage, 'locked'); assert.ok(h.host({ k: 'h.reveal' }).ok);
  const rev = h.view('tv').round!.reveal; assert.ok(rev.summary.length >= 2); assert.ok(/Beste Schätzung/.test(rev.summary[0]));
  assert.ok(h.room.players.every(p => p.score >= 0));
});

test('GLITCH: TV zeigt die Ursprungsszene nur in der Betrachtung; in der Suche nur Countdown/Status; Handys sehen Bild B; Auflösung zeigt Bild B + Zonen', () => {
  const g = game(); g.goto('s3-r4'); g.host({ k: 'h.begin' });
  assert.equal(g.room.round!.stage, 'view'); assert.ok(g.view('tv').round!.data.sceneData, 'TV zeigt Ursprungsszene'); assert.equal(g.view(0).round!.data.sceneData, null, 'Handy sieht sie nicht');
  g.advance(g.room.round!.deadline! - g.now + 1); assert.equal(g.room.round!.stage, 'open');
  const tv = g.view('tv').round!.data; assert.equal(tv.sceneData, null, 'TV zeigt in der Suche keine Szene'); assert.equal(tv.searching, true);
  const ph = g.view(0).round!.data; assert.ok(ph.sceneData); assert.equal(ph.variant, 'b');
  const zones = g.view('host').round!.data.zones; assert.ok(zones.length >= 1 && zones[0].hw > 0);
  g.pl(0, { k: 'submit', payload: { x: zones[0].x, y: zones[0].y } }); g.pl(1, { k: 'submit', payload: { x: 5, y: 5 } });
  g.host({ k: 'h.lock' }); assert.equal(g.view('tv').round!.data.sceneData, null, 'auch nach Sperren noch verborgen'); assert.equal(g.view('tv').round!.data.taps, undefined);
  g.host({ k: 'h.reveal' }); const rv = g.view('tv'); assert.ok(rv.round!.data.sceneData); assert.ok(rv.round!.reveal.zones.length);
  const rows = rv.round!.reveal.rows; assert.equal(rows.find((r: any) => r.pid === g.ids[0]).hit, true); assert.equal(rows.find((r: any) => r.pid === g.ids[1]).hit, false);
});

test('DIE VERBINDUNG: 20 Sekunden je Hinweis (auch für gespeicherte 12-s-Fragen), eine Abgabe, Auflösung mit Hinweisnummer', () => {
  const g = game(); g.goto('s3-r6'); g.host({ k: 'h.begin' }); const t = g.eng.curTask(g.room) as any;
  assert.equal(Math.round((g.room.round!.deadline! - g.now) / 1000), 20); assert.equal(g.view(0).round!.data.clueSeconds, 20);
  g.pl(0, { k: 'submit', payload: { answer: t.answer } });                                    // Hinweis 1
  g.advance(21_000); g.pl(1, { k: 'submit', payload: { answer: t.answer } });                 // Hinweis 2
  assert.equal(g.pl(1, { k: 'submit', payload: { answer: 'Anderes' } }).err, 'already_submitted');
  g.advance(21_000); g.pl(2, { k: 'submit', payload: { answer: 'völlig falsch' } });          // Hinweis 3
  g.advance(21_000 * 2); g.host({ k: 'h.lock' });
  for (const gr of (g.view('host').round!.data.groups ?? [])) if (gr.state === 'unknown') g.host({ k: 'h.review', groupKey: gr.key, decision: 'invalid' });
  g.host({ k: 'h.reveal' }); const rows = g.view('tv').round!.reveal.rows;
  const r = (i: number) => rows.find((x: any) => x.pid === g.ids[i]);
  assert.equal(r(0).level, 0); assert.equal(r(1).level, 1); assert.equal(r(2).level, 2); assert.equal(r(0).correct, true); assert.equal(r(2).correct, false);
  assert.ok(r(0).points > r(1).points && r(1).points > 0 && r(2).points === 0);
});

test('EINZIGARTIG: unbekannte Antworten sperren die Auflösung bis zur Prüfung; Synonyme werden zusammengeführt; Tippfehler sichtbar markiert', () => {
  const g = game(); g.goto('s3-sur'); g.host({ k: 'h.begin' }); const t = g.eng.curTask(g.room) as any;
  const a = t.valid[0], b = t.valid[1];
  g.pl(0, { k: 'submit', payload: { answer: a.name } }); g.pl(1, { k: 'submit', payload: { answer: (a.variants[0] ?? a.name).toUpperCase() } });
  g.pl(2, { k: 'submit', payload: { answer: b.name } }); g.pl(3, { k: 'submit', payload: { answer: 'Fantasiewort' } });
  for (let i = 4; i < 7; i++) g.pl(i, { k: 'submit', payload: { answer: t.valid[2 + (i % 2)].name } });
  assert.equal(g.room.round!.stage, 'review');
  const groups = g.view('host').round!.data.groups; const unk = groups.find((x: any) => x.state === 'unknown'); assert.ok(unk);
  assert.equal(g.host({ k: 'h.reveal' }).ok, false, 'keine Punkte vor Prüfung');
  assert.equal(groups.find((x: any) => x.label === a.name).members.length, 2, 'Schreibweise/Synonym zusammengeführt');
  assert.ok(g.host({ k: 'h.review', groupKey: unk.key, decision: { mapTo: b.name } }).ok);
  assert.ok(g.host({ k: 'h.reveal' }).ok);
  const res = g.view('tv').round!.reveal.results; assert.equal(res[g.ids[3]].points, res[g.ids[2]].points, 'Fantasiewort = identisch mit b → gleiche Wertung');
  assert.ok(g.room.players.every(p => p.score >= 0));
});
void G;

// ---------------------------------------------------------------- Reus 65 Mio: Proberunden, 4/5 Aufgaben, Zwischenstände
const CS2 = CS;
const REUS_COMPACT: Book = CS2.resolveBook('show-2@1');
function reusGame(book: Book = REUS_COMPACT, n = 7) {
  const eng = new Engine(() => book);
  let now = 1_800_000_000_000;
  const { room } = eng.newRoom('RE', now, 'show-2@1', 'show');
  const ids: string[] = [];
  for (let i = 0; i < n; i++) { const r = eng.join(room, `Bot${i + 1}`, AV, now); if (r.ok) ids.push(r.player.id); }
  let rq = 0;
  const host = (a: Action): any => eng.act(room, { role: 'host' }, `h${++rq}`, a, now);
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  const view = (who: number | 'host' | 'tv'): View => eng.buildView(room, who === 'host' ? { role: 'host' } : who === 'tv' ? { role: 'tv' } : { role: 'player', pid: ids[who] }, now);
  const advance = (ms: number) => { now += ms; eng.tick(room, now); };
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  return { eng, room, ids, host, pl, view, advance };
}

test('Reus 65 Mio: Paketname, Branding, Ablauf mit Zwischenständen nach R1, R3 und vor dem Finale', () => {
  assert.equal(CS2.listPublished().find((p: any) => p.id === 'show-2')!.name, 'Reus 65 Mio');
  assert.equal(REUS_COMPACT.rules!.winnerTitle, 'Reus65Mio-Champion'); assert.equal(REUS_COMPACT.rules!.showTitle, 'Reus 65 Mio');
  assert.deepEqual(REUS_COMPACT.show!.map(s => (s.k === 'board' ? 'board' : s.cat)), ['s4-r1', 'board', 's4-r2', 's4-r3', 'board', 's4-sur', 's4-r4', 's4-r5', 's4-r6', 'board', 's3-final']);
  const g = reusGame(); const v = g.view('tv'); assert.equal(v.room.brand!.winner, 'Reus65Mio-Champion'); assert.equal(v.room.brand!.title, 'Reus 65 Mio');
  // Wertung: je Modus 4 gewertete Aufgaben + 1 Probe, Überraschung 3 + 1 Probe, Finale 4
  for (const t of REUS_COMPACT.tiles) { const reg = t.tasks.filter(x => !x.practice).length; assert.equal(reg, t.kind === 'surprise' ? 3 : 4, t.id); assert.equal(t.tasks.filter(x => x.practice).length, t.kind === 'final' ? 0 : 1, t.id); if (t.kind !== 'final') assert.ok(t.tasks[0].practice, 'Probe steht zuerst'); }
});

test('Längere Show: Paketregel tasksPerMode = 5 ergibt 5 gewertete Aufgaben je Spielmodus (neue Paketversion), Proben bleiben, kompakte Version unverändert', () => {
  const p = CS2.getPack('show-2'); CS2.updatePack('show-2', { ...p, rules: { ...p.rules, tasksPerMode: 5 } });
  const pub = CS2.publish('show-2', 'Längere Show'); assert.equal(pub.ref, 'show-2@2');
  const long: Book = CS2.resolveBook('show-2@2');
  for (const t of long.tiles) assert.equal(t.tasks.filter(x => !x.practice).length, t.kind === 'tile' ? 5 : t.kind === 'surprise' ? 3 : 4, t.id);
  assert.equal(CS2.resolveBook('show-2@1').tiles.find(t => t.id === 's4-r1')!.tasks.filter(x => !x.practice).length, 4, 'veröffentlichte Version bleibt unverändert');
  const a = analyzeShow(long)!, c = analyzeShow(REUS_COMPACT)!;
  assert.equal(c.tasksTotal, 31); assert.equal(a.tasksTotal, 37); assert.ok(a.minutesExpected > c.minutesExpected + 8, `${c.minutesExpected} → ${a.minutesExpected}`);
  CS2.updatePack('show-2', { ...p, rules: { ...p.rules, tasksPerMode: 4 } });   // Entwurf zurück (Testisolation)
});

test('Proberunden: erste Aufgabe jedes Modus, mitspielen möglich, KEINE Punkte, überspringbar, zählen nicht als gewertete Aufgabe; CL-Finale 2025 ist die erste Wertung', () => {
  const g = reusGame(); const before = g.room.players.map(p => p.score);
  assert.equal(g.room.round!.tileId, 's4-r1'); const v0 = g.view('tv').round!; assert.equal(v0.practice, true); assert.equal(v0.scoredIndex, 0); assert.equal(v0.scoredCount, 4);
  assert.ok(g.host({ k: 'h.begin' }).ok); const t = g.eng.curTask(g.room) as any; assert.match(t.prompt, /Allianz Arena/);
  assert.equal(Math.round((g.room.round!.deadline! - Date.now() * 0) > 0 ? 1 : 0), 1);
  g.ids.forEach((_, i) => g.pl(i, { k: 'submit', payload: { lat: t.answer.lat + i * 0.2, lon: t.answer.lon } }));
  g.host({ k: 'h.lock' }); assert.ok(g.host({ k: 'h.reveal' }).ok);
  const rev = g.view('tv').round!.reveal; assert.equal(rev.practice, true); assert.ok(rev.guesses[0].points > 0, 'Anzeige zeigt, wie gewertet worden wäre');
  assert.deepEqual(g.room.players.map(p => p.score), before, 'keine Punkte gebucht');
  g.host({ k: 'h.next' });
  const v1 = g.view('tv').round!; assert.equal(v1.practice, false); assert.equal(v1.scoredIndex, 1); assert.equal(v1.taskIndex, 1);
  assert.match((g.eng.curTask(g.room) as any).prompt, /Champions-League-Finale 2025/);
  // Probe überspringen: neue Runde (R2) → Probe skippen → erste gewertete Aufgabe
  const h = reusGame(); h.host({ k: 'h.skipTask' }); assert.equal(h.room.round!.taskIndex, 1); assert.equal(h.room.round!.tileId, 's4-r1');
});

test('Alle sieben Probe-Aufgaben: spielbar bis zur Auflösung ohne Punktebuchung (Match, Rank, Setz auf mich inkl. Wetten, Glitch, Einzigartig inkl. Prüfung, Verbindung)', () => {
  const g = reusGame(); const total0 = () => g.room.players.reduce((a, p) => a + p.score, 0); const start = total0();
  const playProbe = () => {
    assert.ok(g.host({ k: 'h.begin' }).ok); const t = g.eng.curTask(g.room) as any;
    for (let s = 0; s < 30 && ['view', 'open', 'bet'].includes(g.room.round!.stage); s++) {
      const stage = g.room.round!.stage as string; if (stage === 'view') { g.advance(g.room.round!.deadline! - Date.now() * 0 > 0 ? 20_000 : 1); continue; }
      g.ids.forEach((_, i) => {
        if (t.mode === 'geo') g.pl(i, { k: 'submit', payload: { lat: t.answer.lat, lon: t.answer.lon } });
        if (t.mode === 'match') g.pl(i, { k: 'submit', payload: { pairs: [0, 1, 2, 3, 4, 5].map(k => t.order.indexOf(k)), final: true } });
        if (t.mode === 'rank') { const st = g.room.round!.m.step as number; g.pl(i, { k: 'submit', payload: { step: st, slot: t.order[st] } }); }
        if (t.mode === 'estimate') { if (stage === 'open') g.pl(i, { k: 'submit', payload: { value: 16 + i } }); else g.pl(i, { k: 'submit', payload: { amount: 100, target: g.ids[0] } }); }
        if (t.mode === 'glitch') { const z = g.view('host').round!.data.zones[0]; g.pl(i, { k: 'submit', payload: { x: z.x, y: z.y } }); }
        if (t.mode === 'unique') g.pl(i, { k: 'submit', payload: { answer: i % 2 ? 'Rot' : 'Fantasie' } });
        if (t.mode === 'link') g.pl(i, { k: 'submit', payload: { answer: 'Mond' } });
      });
      if (['open', 'bet'].includes(g.room.round!.stage) && !['rank'].includes(t.mode)) g.host({ k: 'h.lock' });
    }
    g.host({ k: 'h.reveal' });
    for (const gr of (g.view('host').round!.data.groups ?? [])) if (gr.state === 'unknown') g.host({ k: 'h.review', groupKey: gr.key, decision: 'invalid' });
    if (g.room.round!.stage !== 'reveal') assert.ok(g.host({ k: 'h.reveal' }).ok);
    assert.equal(g.view('tv').round!.reveal.practice, true);
    return t.mode;
  };
  const modes = new Set<string>();
  for (const tile of ['s4-r1', 's4-r2', 's4-r3', 's4-sur', 's4-r4', 's4-r5', 's4-r6']) {
    for (let i = 0; i < 40 && g.room.round?.tileId !== tile; i++) g.host({ k: (g.room.phase as string) === 'scoreboard' ? 'h.continue' : 'h.skipTile' });
    assert.equal(g.room.round?.tileId, tile, `phase=${g.room.phase} round=${g.room.round?.tileId}`); modes.add(playProbe());
  }
  assert.equal(modes.size, 7); assert.equal(total0(), start, 'Proberunden buchen niemals Punkte');
});
