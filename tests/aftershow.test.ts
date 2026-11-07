// Nachspielzeit v2: nur ungespielte Fragen, vier neue Finalaufgaben und nicht-destruktive Updates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS } from '../content';
import { AFTERSHOW_NEW, AFTERSHOW_ROUNDS, AFTERSHOW_SELECTION, SEED_SHOW_AFTER } from '../content/aftershow';
import { BESTOF3_PLAN, BESTOF3_KK } from '../content/bestof3';

const seed = { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS };
const fresh = () => new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'outplay-after2-')), 'game.db')), seed);

test('Nachspielzeit: 21 verschiedene ungespielte reguläre Fragen und 4 Finalfragen, keine Proben', () => {
  const ids = Object.values(AFTERSHOW_SELECTION).flat();
  assert.equal(ids.length, 21);
  assert.equal(new Set(ids).size, ids.length);
  const mainIds = new Set([...Object.values(BESTOF3_PLAN).flat().map(q => q.id), ...BESTOF3_KK.map(q => q.id)]);
  for (const id of ids) assert.ok(!mainIds.has(id), 'Hauptshow-Frage darf nicht wiederholt werden: ' + id);
  assert.equal(SEED_SHOW_AFTER.revision, 2);
  assert.equal(AFTERSHOW_ROUNDS.length, 8);
  assert.equal(new Set(AFTERSHOW_ROUNDS.map(r => r.id)).size, 8);
  const c = fresh();
  const ref = c.listPublished().find(p => p.id === 'show-after')!.ref;
  const b = c.resolveBook(ref);
  const normal = b.tiles.filter(t => t.kind !== 'final');
  assert.equal(normal.length, 7);
  assert.equal(normal.flatMap(t => t.tasks).length, 21);
  assert.equal(normal.flatMap(t => t.tasks).filter(t => t.practice).length, 0);
  assert.equal(b.tiles.find(t => t.kind === 'final')!.tasks.length, 4);
  assert.equal(b.rules!.startCredit, 0);
  assert.equal(b.rules!.boardEveryRound, true);
  assert.deepEqual(c.buildBook('show-after').errors, []);
});

test('Nachspielzeit: beide Matchmaker-Aufgaben haben genau sechs eindeutige, gemischte Paare', () => {
  for (const id of ['after2-match-exclubs', 'after2-match-sameyear']) {
    const t: any = AFTERSHOW_NEW.find(x => x.id === id)!.task;
    assert.equal(t.mode, 'match'); assert.equal(t.pairs.length, 6);
    assert.equal(new Set(t.pairs.map((p: any) => p.left)).size, 6);
    assert.equal(new Set(t.pairs.map((p: any) => p.right)).size, 6);
    assert.deepEqual([...t.order].sort((a: number, b: number) => a - b), [0, 1, 2, 3, 4, 5]);
    assert.ok(t.order.some((v: number, i: number) => v !== i), 'kein vorgeschaltetes Lösungs-Muster');
  }
  const unique: any = AFTERSHOW_NEW.find(x => x.id === 'after2-unique-bayernfinals')!.task;
  assert.equal(unique.mode, 'unique'); assert.equal(unique.closed, true);
  assert.equal(unique.valid.length, 6, 'bei sieben Spielern muss es Dopplungen geben');
});

test('Nachspielzeit v2: aktualisiert dasselbe Paket mit neu angelegten Kategorie-IDs; alte Version und Hauptshow bleiben unverändert', () => {
  const dir = mkdtempSync(join(tmpdir(), 'outplay-after-upgrade-'));
  const store = new Store(join(dir, 'game.db'));
  // Alte Paketrevision simulieren, ohne in die eigentliche Nutzerdatenbank einzugreifen.
  const oldSeed = { ...seed, extraShows: EXTRA_SHOWS.map(s => s.pack.id === 'show-after' ? { ...s, revision: 1 } : s) };
  const c1 = new ContentService(store, oldSeed);
  const oldRef = c1.listPublished().find(p => p.id === 'show-after')!.ref;
  const oldSnapshot = JSON.stringify(c1.resolveBook(oldRef));
  const mainRef = c1.listPublished().find(p => p.id === 'show-4z')!.ref;
  const mainSnapshot = JSON.stringify(c1.resolveBook(mainRef));
  const c2 = new ContentService(store, seed);
  assert.ok(c2.cleanupPlan().update.includes('show-after'));
  c2.cleanupApply();
  const newRef = c2.listPublished().find(p => p.id === 'show-after')!.ref;
  assert.notEqual(newRef, oldRef);
  assert.equal(JSON.stringify(c2.resolveBook(oldRef)), oldSnapshot, 'bestehende Räume behalten alte Fragen');
  assert.equal(JSON.stringify(c2.resolveBook(mainRef)), mainSnapshot, 'die Hauptshow darf sich nicht ändern');
  assert.ok(c2.resolveBook(newRef).tiles.some(t => t.id === 'after2-r2'), 'neue MATCHMAKER-Kategorie ist vorhanden');
  assert.equal(c2.cleanupPlan().update.includes('show-after'), false, 'nach Update auf neuestem Stand');
});
