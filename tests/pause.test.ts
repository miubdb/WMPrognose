// „Show pausieren“ (Bundesliga-Pause): alle Timer/Phasen eingefroren, nach „Show fortsetzen“ exakt weiter; Reload/Neustart (Raumzustand aus JSON) übersteht die Pause.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Engine } from '../server/engine'; import { ContentService } from '../server/content'; import { Store } from '../server/store';
import { SCENES } from '../shared/scenes'; import { TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS } from '../content';
import { AV } from './helpers'; import type { Action, Book, View } from '../shared/types';

const CS = new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'outplay-pause-')), 'c.db')), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });
const BOOK: Book = CS.resolveBook('show-3@1');
function game(eng = new Engine(() => BOOK), room?: any, nowStart = 1_800_000_000_000) {
  let now = nowStart; let r = room;
  if (!r) { r = eng.newRoom('PA', now, 'show-3@1', 'show').room; }
  const ids: string[] = r.players.map((p: any) => p.id);
  if (!room) for (let i = 0; i < 4; i++) { const j = eng.join(r, `B${i}`, AV, now); if (j.ok) ids.push(j.player.id); }
  let rq = 0;
  const host = (a: Action): any => eng.act(r, { role: 'host' }, `h${++rq}${Math.random()}`, a, now);
  const pl = (i: number, a: Action): any => eng.act(r, { role: 'player', pid: ids[i] }, `p${i}-${++rq}${Math.random()}`, a, now);
  const view = (w: number | 'tv' | 'host'): View => eng.buildView(r, w === 'host' ? { role: 'host' } : w === 'tv' ? { role: 'tv' } : { role: 'player', pid: ids[w] }, now);
  const advance = (ms: number) => { now += ms; eng.tick(r, now); };
  return { eng, room: r, ids, host, pl, view, advance, get now() { return now; }, set now(v: number) { now = v; } };
}
const goto = (g: ReturnType<typeof game>, tile: string, task = 0) => { g.host({ k: 'h.startShow' }); g.host({ k: 'h.introDone' }); for (let i = 0; i < 30 && g.room.round?.tileId !== tile; i++) g.host({ k: (g.room.phase as string) === 'scoreboard' ? 'h.continue' : 'h.skipTile' }); for (let i = 0; i < task; i++) g.host({ k: 'h.skipTask' }); };

test('Show pausieren: Timer eingefroren (auch eine Stunde lang), Abgaben gesperrt, TV/Handy sehen die Pause, Fortsetzen = exakt die Restzeit', () => {
  const g = game(); goto(g, 's5-r1', 1); g.host({ k: 'h.begin' });
  const total = g.room.round!.stageSeconds!; g.advance(20_000);
  const left = g.room.round!.deadline! - g.now; assert.equal(Math.round(left / 1000), total - 20);
  assert.ok(g.host({ k: 'h.showPause', paused: true }).ok);
  assert.equal(g.room.round!.deadline, null); assert.equal(g.room.round!.pausedLeft, left);
  for (const w of ['tv', 0, 'host'] as const) assert.equal(g.view(w).room.showPaused, true); assert.equal(g.view('tv').round!.pausedLeft, left);
  g.advance(3_600_000);                                                // Bundesliga-Halbzeit: eine Stunde vergeht
  assert.equal(g.room.round!.stage, 'open', 'Phase bleibt stehen'); assert.equal(g.room.round!.pausedLeft, left, 'Restzeit unverändert');
  assert.equal(g.pl(0, { k: 'submit', payload: { lat: 50, lon: 10 } }).err, 'paused', 'während der Pause keine Abgabe');
  assert.equal(g.host({ k: 'h.pause', paused: false }).ok, false, 'der Timer-Schalter kann die Show-Pause nicht aufheben');
  assert.ok(g.host({ k: 'h.showPause', paused: false }).ok);
  assert.equal(g.room.round!.deadline, g.now + left); assert.equal(g.room.round!.pausedLeft, null);
  assert.ok(g.pl(0, { k: 'submit', payload: { lat: 50, lon: 10 } }).ok, 'nach Fortsetzen wieder Abgaben');
  g.advance(left - 1000); assert.equal(g.room.round!.stage, 'open'); g.advance(2000); assert.equal(g.room.round!.stage, 'locked', 'läuft exakt zur ursprünglichen Frist ab');
});

test('Pause mitten in DIE VERBINDUNG (Hinweisstufen) und im Wettfenster: Stufe/Frist bleiben exakt erhalten', () => {
  const g = game(); goto(g, 's5-r6', 1); g.host({ k: 'h.begin' });
  g.advance(25_000); const shown = () => (g.view(0).round!.data.clues as string[]).length; assert.equal(shown(), 2);
  g.host({ k: 'h.showPause', paused: true }); g.advance(7_200_000); assert.equal(shown(), 2, 'nach 2 Stunden Pause immer noch Hinweis 2');
  g.host({ k: 'h.showPause', paused: false }); g.advance(14_000); assert.equal(shown(), 2); g.advance(2_000); assert.equal(shown(), 3, 'Hinweis 3 kommt nach der restlichen Hinweisfrist');
  g.pl(0, { k: 'submit', payload: { answer: 'x' } }); assert.equal(g.view(0).round!.data.mine.level, 2, 'Server bestimmt die Stufe korrekt');
});

test('Pause + Browser-Reload/Neustart: Raumzustand (JSON) mit Pause wird wiederhergestellt, Fortsetzen funktioniert, TV/Handy zeigen den Stand', () => {
  const g = game(); goto(g, 's5-r1', 1); g.host({ k: 'h.begin' }); g.advance(10_000); g.pl(1, { k: 'submit', payload: { lat: 48.2, lon: 11.6 } });
  const left = g.room.round!.deadline! - g.now; g.host({ k: 'h.showPause', paused: true });
  const restored = JSON.parse(JSON.stringify(g.room));                 // Serverneustart: Raum aus SQLite (JSON)
  const h = game(new Engine(() => BOOK), restored, g.now + 7_200_000);   // zwei Stunden später
  assert.equal(restored.showPaused, true); assert.equal(h.view('tv').round!.pausedLeft, left); assert.equal(h.view(1).round!.data.mine !== null, true, 'Antwort blieb erhalten');
  h.eng.tick(restored, h.now); assert.equal(restored.round.stage, 'open', 'tick während der Pause ändert nichts');
  h.host({ k: 'h.showPause', paused: false }); assert.equal(restored.round.deadline, h.now + left); h.advance(left + 100); assert.equal(restored.round.stage, 'locked');
});

test('Pause in jeder Phase: Zwischenstand, Regelkarte (Intro), SETZ-Wettphase – Fortsetzen setzt nahtlos fort', () => {
  const g = game(); goto(g, 's5-r1', 0); assert.equal(g.room.round!.stage, 'intro');
  g.host({ k: 'h.showPause', paused: true }); g.advance(600_000); assert.equal(g.room.round!.stage, 'intro'); g.host({ k: 'h.showPause', paused: false }); assert.ok(g.host({ k: 'h.begin' }).ok, 'Aufgabe startet erst auf Freigabe');
  const e = game(); goto(e, 's5-r5', 1); e.host({ k: 'h.begin' }); const t = e.eng.curTask(e.room) as any;
  [1, 0.5, 2, 3].forEach((f, i) => e.pl(i, { k: 'submit', payload: { value: t.answer * f } })); assert.equal(e.room.round!.stage, 'bet');
  e.advance(10_000); const left = e.room.round!.deadline! - e.now; e.host({ k: 'h.showPause', paused: true }); e.advance(1_800_000); assert.equal(e.room.round!.stage, 'bet');
  e.host({ k: 'h.showPause', paused: false }); assert.equal(e.room.round!.deadline, e.now + left);
});
