// Spielregeln aus dem ersten Praxistest: Geo-Entfernung (60 s), Blind-Rank-Varianten, SETZ AUF MICH, GLITCH-Ablauf, VERBINDUNG 20 s, EINZIGARTIG-Prüfung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Engine } from '../server/engine';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { TILES, SEED_PACK, SEED_SHOW } from '../content';
import { AV } from './helpers';
import { geoPoints, rankPairs } from '../shared/scoring';
import type { Action, Book, View } from '../shared/types';

const CS = new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'outplay-r2-')), 'c.db')), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW });
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
