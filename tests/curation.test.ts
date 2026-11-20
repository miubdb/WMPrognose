// Paket-Kuratierung: genau zwei Spieleabende bleiben aktiv, alles andere wird archiviert (nie gelöscht); dauerhaft und update-fest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Engine } from '../server/engine';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS, SEED_SHOW_B44, SEED_SHOW_B44K } from '../content';
import { AV } from './helpers';

const mk = (file: string, extra = EXTRA_SHOWS) => new ContentService(new Store(file), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: extra });
const fresh = () => mk(join(mkdtempSync(join(tmpdir(), 'outplay-cur-')), 'c.db'));
const U = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { rooms: v, finished: v, last: 1_800_000_000_000 }]));

test('Zweites Paket wird aus der Raumhistorie erkannt – nicht aus dem Namen; bei Zweifel Auswahl statt Raten', () => {
  const c = fresh();
  const a = c.curationPlan(U({ 'show-after': 2 })); assert.equal(a.second, 'show-after'); assert.equal(a.autoDetected, true); assert.equal(a.needsChoice, false);
  const b = c.curationPlan(U({ 'show-5': 1 })); assert.equal(b.second, 'show-5');
  const both = c.curationPlan(U({ 'show-5': 1, 'show-after': 3 })); assert.equal(both.needsChoice, true); assert.equal(both.second, null, 'beide gespielt → keine Vermutung');
  const none = c.curationPlan({}); assert.equal(none.needsChoice, true); assert.ok(none.options.some(o => o.id === 'show-after') && none.options.some(o => o.id === 'show-5'), 'Kandidaten mit Details zur Auswahl');
  const chosen = c.curationPlan({}, 'show-5'); assert.equal(chosen.second, 'show-5'); assert.ok(chosen.archive.every(p => p.id !== 'show-4z' && p.id !== 'show-5'));
  assert.equal(c.curationPlan({}, 'show-4z').second, null, 'Hauptversion kann nicht zweites Paket sein');
});

test('Anwenden: nur zwei Pakete aktiv, alle anderen archiviert (nichts gelöscht), Namen gesetzt, Versionen und Räume unverändert', () => {
  const c = fresh(); const before = c.listPacksView().length; const v = (id: string) => JSON.stringify(c.resolveBook(`${id}@1`));
  const books = Object.fromEntries(c.listPacksView().map(p => [p.id, v(p.id)])); const q = c.listQuestions().length;
  const eng = new Engine(r => c.resolveBook(r)); const { room } = eng.newRoom('R', 1_800_000_000_000, 'show-5@1', 'show'); const plan0 = JSON.stringify(room.plan);
  const r = c.curationApply(U({ 'show-after': 1 }), 'show-after');
  assert.equal(c.listPacksView().length, before, 'nichts gelöscht'); assert.equal(c.listQuestions().length, q);
  const active = c.listPublished().map(p => p.id).sort(); assert.deepEqual(active, ['show-4z', 'show-after']);
  assert.equal(c.getPack('show-4z').name, 'Kickbase-Abend bei MJ – Hauptversion'); assert.equal(c.getPack('show-after').name, 'Kickbase-Abend bei MJ – Zweite Version');
  for (const id of Object.keys(books)) assert.equal(v(id), books[id], 'veröffentlichte Version unverändert: ' + id);
  assert.equal(JSON.stringify(room.plan), plan0); assert.equal(room.bookId, 'show-5@1', 'bestehender Raum läuft mit seinem Paketstand weiter');
  assert.ok(r.archived.length >= 8); assert.ok(c.listPacksView().filter(p => !['show-4z', 'show-after'].includes(p.id)).every(p => p.status === 'archived'));
  assert.throws(() => c.curationApply({}, 'show-4z'), /gültiges zweites Paket/);
  assert.equal(c.curation()!.second, 'show-after');
});

test('Updates aktivieren nichts wieder: kein erneutes Archivieren gewollter Reaktivierung, neue Pakete landen im Archiv, Namen bleiben', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'outplay-cur2-')), 'c.db');
  const old = mk(file, EXTRA_SHOWS.filter(x => x !== EXTRA_SHOWS[EXTRA_SHOWS.length - 1] && x !== EXTRA_SHOWS[EXTRA_SHOWS.length - 2]));       // „alte Installation“ ohne die letzten zwei Seed-Pakete
  old.curationApply({}, 'show-5'); const n0 = old.listPacksView().length;
  const cur = mk(file); assert.equal(cur.cleanupPlan().install, true); cur.installSeed();
  assert.ok(cur.listPacksView().length > n0, 'neue Pakete ergänzt'); assert.deepEqual(cur.listPublished().map(p => p.id).sort(), ['show-4z', 'show-5'], 'neue Pakete sind archiviert, nicht in der Übersicht');
  cur.setPackStatus('show-3', 'published');                                   // bewusst wieder aktiviert
  const plan = cur.cleanupPlan(); assert.deepEqual(plan.archive, [], 'Update archiviert nach Kuratierung nichts mehr automatisch'); assert.deepEqual(plan.rename, []);
  const before = cur.getPack('show-4z').name; 
  cur.cleanupApply(); assert.equal(cur.getPack('show-4z').name, before, 'Update überschreibt den gewählten Namen nicht'); assert.ok(cur.listPublished().some(p => p.id === 'show-3'), 'reaktiviertes Paket bleibt aktiv');
});

test('Kategorie-Nutzung enthält auch Pakete mit festem Showablauf (Grundlage für Copy-on-Write im Builder)', () => {
  const c = fresh(); const cat = c.listCategories().find(x => x.usedInPacks.length > 1)!; assert.ok(cat, 'geteilte Kategorie vorhanden'); assert.ok(cat.usedInPacks.every(p => c.getPack(p.id)));
});
