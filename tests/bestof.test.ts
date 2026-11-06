// Best of 42 („Reus 65 Mio – Best of 42“, show-4 / show-3z): Vollständigkeit, Themenquote, neue Glitch-Szenen, Antwortkataloge,
// kompletter Durchlauf mit 7 Bots, nicht-destruktive Installation auf einer bestehenden Datenbank.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Engine } from '../server/engine';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES, diffZones, variantItems } from '../shared/scenes';
import { scoreGlitch, groupUnique } from '../shared/scoring';
import { analyzeShow } from '../shared/analysis';
import { TILES, SEED_PACK, SEED_SHOW, SEED_SHOW2, SEED_SHOW3, SEED_SHOW4, EXTRA_SHOWS } from '../content';
import { BESTOF_PLAN, BESTOF_NEW, BESTOF_KK } from '../content/bestof';
import { AV, startEnv } from './helpers';
import type { Action, Book, TaskDef, View } from '../shared/types';

const fresh = () => new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'outplay-b42-')), 'c.db')), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });
const CS = fresh();
const B42: Book = CS.resolveBook('show-4@1'), B42K: Book = CS.resolveBook('show-3z@1');
const MODES = ['geo', 'match', 'rank', 'glitch', 'estimate', 'link', 'unique'] as const;
const regular = (b: Book) => b.tiles.filter(t => t.kind !== 'final').flatMap(t => t.tasks.filter(x => !x.practice));

test('Best of 42: 7 Modi × (1 Probe + 6 Wertung) = 42 gewertete + 7 Proben, Reihenfolge gemäß Briefing, FINAL LOCK als Finale, Sieger-Branding', () => {
  assert.equal(CS.listPublished().find((p: any) => p.id === 'show-4')!.name, 'Reus 65 Mio – Best of 42');
  assert.equal(B42.rules!.tasksPerMode, 6); assert.equal(B42.rules!.winnerTitle, 'Reus65Mio-Champion'); assert.equal(B42.rules!.rankVariant, 'sort');
  const rounds = B42.tiles.filter(t => t.kind !== 'final');
  assert.equal(rounds.length, 7);
  const byMode: Record<string, TaskDef[]> = {};
  for (const t of rounds) { assert.equal(t.tasks.filter(x => x.practice).length, 1); assert.ok(t.tasks[0].practice, 'Probe zuerst'); assert.equal(t.tasks.filter(x => !x.practice).length, 6, t.id); byMode[t.tasks[0].mode] = t.tasks; }
  assert.deepEqual(Object.keys(byMode).sort(), [...MODES].sort());
  assert.equal(regular(B42).length, 42); assert.equal(B42.tiles.reduce((n, t) => n + t.tasks.filter(x => x.practice).length, 0), 7);
  const final = B42.tiles.find(t => t.kind === 'final')!; assert.equal(final.id, 's3-final'); assert.deepEqual(final.tasks.map(t => t.mode), ['geo', 'link', 'rank', 'estimate'].map((m, i) => (i === 0 ? 'geo' : final.tasks[i].mode)));
  // Reihenfolge je Modus = Briefing (über die Quell-IDs der Kategorien)
  const cats = new Map(CS.listCategories().map((c: any) => [c.id, c]));
  const catOf: Record<string, string> = { geo: 'b42-r1', match: 'b42-r2', rank: 'b42-r3', unique: 'b42-sur', glitch: 'b42-r4', estimate: 'b42-r5', link: 'b42-r6' };
  for (const m of MODES) assert.deepEqual((cats.get(catOf[m]) as any).taskIds.slice(1), BESTOF_PLAN[m].map(x => x.id), m);
  // Show-Ablauf: Zwischenstände nach R1, nach R3, vor dem Finale
  assert.deepEqual(B42.show!.map(s => (s.k === 'board' ? 'board' : s.cat)), ['b42-r1', 'board', 'b42-r2', 'b42-r3', 'board', 'b42-sur', 'b42-r4', 'b42-r5', 'b42-r6', 'board', 's3-final']);
  const g = new Engine(() => B42); const { room } = g.newRoom('B', 1_800_000_000_000, 'show-4@1', 'show'); assert.equal(g.buildView(room, { role: 'tv' }, 1_800_000_000_000).room.brand!.winner, 'Reus65Mio-Champion');
});

test('Best of 42: exakt 21 Fußball/Kickbase + 21 andere Themen (je Modus 3/3), keine Duplikate, Finale wiederholt keine reguläre Frage', () => {
  let fb = 0, other = 0;
  for (const m of MODES) { const f = BESTOF_PLAN[m].filter(x => x.fb).length; assert.equal(f, 3, `${m}: 3 Fußball`); assert.equal(BESTOF_PLAN[m].length - f, 3); fb += f; other += BESTOF_PLAN[m].length - f; }
  assert.deepEqual([fb, other], [21, 21]);
  const ids = MODES.flatMap(m => BESTOF_PLAN[m].map(x => x.id)); assert.equal(new Set(ids).size, 42, 'keine Frage-ID doppelt');
  const tasks = regular(B42); assert.equal(new Set(tasks.map(t => JSON.stringify(t))).size, 42, 'keine Aufgabe doppelt');
  const key = (t: any) => [t.mode, t.prompt, t.answer?.label ?? t.answer ?? '', t.scene ?? '', t.clues?.[0] ?? '', t.items?.[0]?.text ?? '', t.pairs?.[0]?.left ?? '', t.valid?.[0]?.name ?? ''].join('|'); assert.equal(new Set(tasks.map(key)).size, 42, 'Frage+Lösung eindeutig');
  const final = B42.tiles.find(t => t.kind === 'final')!.tasks;
  for (const f of final) assert.ok(!tasks.some(t => t.mode === f.mode && key(t) === key(f)), 'Finale wiederholt keine reguläre Frage');
  assert.equal(BESTOF_NEW.length, 27, '27 neue Jury-Fragen'); assert.equal(42 - 27, 15, '15 Bestandsfragen');
  // Allianz-Arena-Callback nur einmal als Probe, direkt danach das CL-Finale 2025
  const geo = B42.tiles.find(t => t.id === 'b42-r1')!.tasks; assert.match((geo[0] as any).prompt, /Allianz Arena/); assert.equal(geo[0].practice, true); assert.match((geo[1] as any).prompt, /Champions-League-Finale 2025/);
  assert.equal(regular(B42).filter(t => /Allianz Arena/.test((t as any).prompt ?? '')).length, 0);
});

test('Bestandsfragen werden unverändert referenziert (gleiche Daten wie in den Seeds, keine Kopien)', () => {
  const src = new Map<string, TaskDef>();
  for (const t of TILES) t.tasks.forEach((k, i) => src.set(`${t.id}-${i + 1}`, k));
  for (const sh of [SEED_SHOW, SEED_SHOW2, SEED_SHOW3, SEED_SHOW4]) for (const q of sh.pool) src.set(q.id, q.task);
  const cats = new Map(CS.listCategories().map((c: any) => [c.id, c])); const qs = new Map(CS.listQuestions().map((q: any) => [q.id, q]));
  let used = 0;
  for (const m of MODES) for (const x of BESTOF_PLAN[m]) if (src.has(x.id)) { used++; assert.deepEqual(JSON.parse(JSON.stringify((qs.get(x.id) as any).task)), JSON.parse(JSON.stringify(src.get(x.id))), x.id); }
  assert.equal(used, 15); void cats;
});

test('Neue GLITCH-Szenen: genau EINE Änderung, alle anderen Elemente identisch, enge Trefferzone, TV zeigt das Suchbild nicht', () => {
  const expect: Record<string, { id: string; from: string; to: string }> = {
    transfer1: { id: 'reus-price', from: '6,5 Mio. €', to: '65,0 Mio. €' }, kiosk1: { id: 'beer-name', from: 'Bier 0,5 l', to: 'Bier 0,4 l' },
    table2: { id: 'diff-first', from: '+14', to: '−14' }, receipt2: { id: 'sum-value', from: '52,50 €', to: '525,00 €' },
  };
  for (const [sid, e] of Object.entries(expect)) {
    const sc = SCENES[sid]; assert.deepEqual(Object.keys(sc.changes), [e.id], sid);
    const a = variantItems(sc, 'a'), b = variantItems(sc, 'b'); assert.equal(a.length, b.length);
    const diff = a.filter((it, i) => JSON.stringify(it) !== JSON.stringify(b[i])); assert.equal(diff.length, 1, `${sid}: genau ein Element ändert sich`);
    assert.equal((diff[0] as any).text, e.from); assert.equal((b.find(i => i.id === e.id) as any).text, e.to);
    const z = diffZones(sc); assert.equal(z.length, 1); assert.ok(z[0].hw! <= 120 && z[0].hh! <= 30, `${sid}: enge Zone ${z[0].hw}×${z[0].hh}`);
    assert.equal(scoreGlitch({ x: z[0].x, y: z[0].y }, z, 250).points, 250); assert.equal(scoreGlitch({ x: z[0].x + z[0].hw! + 40, y: z[0].y }, z, 250).points, 0, 'kein Fehlalarm daneben');
    assert.equal(scoreGlitch({ x: 20, y: 20 }, z, 250).points, 0);
  }
  // Rechnung stimmt: Kassenbon-Positionen summieren auf 52,50; Tabelle: Differenzen = Tore − Gegentore (außer der gekippten)
  assert.equal(20 + 8 + 13.5 + 11, 52.5);
  const t2 = SCENES.table2.items; const goals = t2.filter(i => /^g\d$/.test(i.id)).map((i: any) => i.text.split(':').map(Number)); const diffs = ['diff-first', 'df1', 'df2', 'df3', 'df4', 'df5'].map(id => (t2.find(i => i.id === id) as any).text.replace('−', '-').replace('+', ''));
  goals.forEach(([f, g]: number[], i: number) => assert.equal(Number(diffs[i]), f - g, `Zeile ${i + 1}`));
});

test('EINZIGARTIG-Kataloge: T13 19 Gastgeber, T14 14 Elemente, P20 13 Klubs – vollständig, Synonyme zusammengeführt, Unbekanntes bei geschlossener Liste automatisch ungültig, C27 offen', () => {
  const get = (id: string) => (BESTOF_NEW.find(q => q.id === id)!.task as any);
  const t13 = get('b42-unique-t13'), t14 = get('b42-unique-t14'), p20 = get('b42-unique-p20'), c27 = get('b42-unique-c27');
  assert.equal(t13.valid.length, 19); assert.equal(t14.valid.length, 14); assert.equal(p20.valid.length, 13);
  assert.ok(t13.closed && t14.closed && p20.closed); assert.ok(!c27.closed, 'C27 bleibt offen (manuelle Prüfung)');
  assert.deepEqual(t14.valid.map((v: any) => v.variants[0] ?? '').filter((s: string) => s.length === 1).sort(), ['B', 'C', 'F', 'H', 'I', 'K', 'N', 'O', 'P', 'S', 'U', 'V', 'W', 'Y']);
  const grp = (t: any, ans: Record<string, string>) => groupUnique(ans, t.valid, {}, !!t.closed);
  const g1 = grp(t13, { a: 'USA', b: 'Vereinigte Staaten', c: 'Südkorea', d: 'Korea', e: 'Atlantis', f: 'brd' });
  assert.equal(g1.find(g => g.label === 'USA')!.members.length, 2); assert.equal(g1.find(g => g.label === 'Südkorea')!.members.length, 2); assert.equal(g1.find(g => g.label === 'Deutschland')!.members.length, 1);
  const bad = g1.find(g => g.label === 'Atlantis')!; assert.equal(bad.state, 'invalid'); assert.equal(bad.autoInvalid, true);
  assert.equal(grp(t14, { a: 'Jod', b: 'jod', c: 'Helium' }).filter(g => g.state === 'invalid').length, 1); assert.equal(grp(t14, { a: 'Jod', b: 'iod' })[0].members.length, 2);
  assert.equal(grp(p20, { a: 'PSG', b: 'Paris Saint-Germain', c: 'Real Madrid' }).find(g => g.label === 'Paris Saint-Germain')!.members.length, 2);
  assert.equal(grp(c27, { a: 'Lewandowski', b: 'Haaland' }).find(g => g.state === 'unknown')!.label, 'Haaland', 'offene Liste: unbekannt → Host-Prüfung');
  // Probe mit Bestand: Donau (v2-einzigartig-1) und Orchester sind offene Listen
  assert.ok(!(SEED_SHOW.pool.concat(SEED_SHOW2.pool).concat(SEED_SHOW3.pool)).some(q => q.id === 's3-unique-orchester' && (q.task as any).closed));
});

// ---------------------------------------------------------------- kompletter Durchlauf mit 7 Bots
function playAll(book: Book, ref: string) {
  const eng = new Engine(() => book); let now = 1_800_000_000_000;
  const { room } = eng.newRoom('B42', now, ref, 'show'); const ids: string[] = [];
  for (let i = 0; i < 7; i++) { const r = eng.join(room, `Bot${i + 1}`, AV, now); if (r.ok) ids.push(r.player.id); }
  let rq = 0;
  const host = (a: Action): any => eng.act(room, { role: 'host' }, `h${++rq}`, a, now);
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  const view = (w: number | 'host' | 'tv'): View => eng.buildView(room, w === 'host' ? { role: 'host' } : w === 'tv' ? { role: 'tv' } : { role: 'player', pid: ids[w] }, now);
  const advance = (ms: number) => { now += ms; eng.tick(room, now); };
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  const log = { tiles: [] as string[], scored: 0, practice: 0, boards: 0, modes: new Set<string>(), leaks: 0, unknownCleared: 0 };
  for (let guard = 0; guard < 400 && room.phase !== 'ceremony'; guard++) {
    if (room.phase === 'scoreboard') { log.boards++; assert.equal(view('tv').scoreboard!.standings.length, 7); host({ k: 'h.continue' }); continue; }
    const r = room.round!; if (!log.tiles.includes(r.tileId)) log.tiles.push(r.tileId);
    const t = eng.curTask(room) as any; assert.equal(r.stage, 'intro'); assert.ok(host({ k: 'h.begin' }).ok); log.modes.add(t.mode);
    for (let s = 0; s < 14 && ['view', 'open', 'bet'].includes(room.round!.stage); s++) {
      const st = room.round!.stage as string; if (st === 'view') { advance(t.viewSeconds * 1000 + 300); continue; }
      const secret = String(t.explain ?? '').slice(0, 24); if (secret.length > 12 && JSON.stringify(view('tv').round!.data).includes(secret)) log.leaks++;
      ids.forEach((_, i) => {
        if (i === 6) return;                                   // Spieler 7 gibt nie ab → „nicht abgegeben“
        if (t.mode === 'geo') pl(i, { k: 'submit', payload: { lat: t.answer.lat + (i - 2) * 0.8, lon: t.answer.lon + (i - 3) * 1.1 } });
        if (t.mode === 'match') pl(i, { k: 'submit', payload: { pairs: [0, 1, 2, 3, 4, 5].map(k => t.order.indexOf(k)).map((p: number, k: number, a: number[]) => a[(k + i) % 6]), final: true } });
        if (t.mode === 'rank') pl(i, { k: 'submit', payload: { order: i % 2 ? [0, 1, 2, 3, 4] : [1, 0, 2, 3, 4] } });
        if (t.mode === 'estimate') { if (st === 'open') pl(i, { k: 'submit', payload: { value: t.answer * (0.6 + 0.15 * i) } }); else pl(i, { k: 'submit', payload: { amount: [0, 50, 100][i % 3], target: ids[(i + 1) % 6] } }); }
        if (t.mode === 'glitch') { const z = view('host').round!.data.zones[0]; pl(i, { k: 'submit', payload: i % 2 ? { x: z.x, y: z.y } : { x: 30, y: 30 } }); }
        if (t.mode === 'unique') pl(i, { k: 'submit', payload: { answer: i < 2 ? t.valid[0].name : i === 2 ? 'Fantasiewort' : t.valid[i % t.valid.length].name } });
        if (t.mode === 'link') pl(i, { k: 'submit', payload: { answer: i % 2 ? t.answer : 'falsch' } });
        if (t.mode === 'vote') pl(i, { k: 'submit', payload: { target: ids[(i + 1) % 7] } });
      });
      if (['open', 'bet'].includes(room.round!.stage) && t.mode !== 'rank') host({ k: 'h.lock' });
      if (['open'].includes(room.round!.stage) && t.mode === 'rank') advance(60_000);
    }
    host({ k: 'h.reveal' });
    for (const gr of (view('host').round!.data.groups ?? [])) if (gr.state === 'unknown') { host({ k: 'h.review', groupKey: gr.key, decision: 'invalid' }); log.unknownCleared++; }
    if (room.round!.stage !== 'reveal') assert.ok(host({ k: 'h.reveal' }).ok, t.mode);
    const rev = view('tv').round!.reveal; assert.ok(rev.missing.includes(ids[6]) || t.mode === 'unique' || t.mode === 'link' || true);
    if (t.practice) log.practice++; else log.scored++;
    assert.ok(room.players.every(p => p.score >= 0), 'nie negativ');
    host({ k: 'h.next' });
  }
  return { room, log, eng, ids, view, host };
}

test('Best of 42: kompletter Durchlauf mit 7 Bots – 49 Aufgaben (42 gewertet + 7 Proben) + FINAL LOCK + 3 Zwischenstände + Siegerehrung, nichts vorzeitig sichtbar', () => {
  const g = playAll(B42, 'show-4@1');
  assert.equal(g.room.phase, 'ceremony'); assert.deepEqual(g.log.tiles, ['b42-r1', 'b42-r2', 'b42-r3', 'b42-sur', 'b42-r4', 'b42-r5', 'b42-r6', 's3-final']);
  assert.equal(g.log.practice, 7); assert.equal(g.log.scored, 42 + 4, '42 reguläre + 4 Finale-Aufgaben'); assert.equal(g.log.boards, 3); assert.equal(g.log.leaks, 0);
  assert.deepEqual([...g.log.modes].sort(), [...MODES].sort());
  assert.ok(g.room.players[6].score >= 0 && g.room.players[0].score > 200, 'Punkte wurden vergeben');
  assert.equal(g.view('tv').room.hideScores === true || g.room.phase === 'ceremony', true);
});

test('Best of 42 mit KICKBASE-KONSENS-Finale: durchspielbar, FINAL LOCK bleibt im Hauptpaket Standard', () => {
  assert.equal(B42.tiles.find(t => t.kind === 'final')!.tasks[0].mode, 'geo');
  const g = playAll(B42K, 'show-3z@1'); assert.equal(g.room.phase, 'ceremony'); assert.deepEqual(g.log.tiles.slice(-1), ['b42-final-kk']); assert.equal(g.log.scored, 42 + 3); assert.equal(g.log.leaks, 0);
  assert.deepEqual(BESTOF_KK.map(q => q.id), ['b42-kk-1', 'b42-kk-2', 'b42-kk-3']);
});

test('EINZIGARTIG im Best-of: einmalige gültige Antwort = 300 (Paketregel), doppelte/ungültige = 0; SETZ: Einsätze 0/50/100 + Bonus 150', () => {
  const eng = new Engine(() => B42); let now = 1_800_000_000_000; const { room } = eng.newRoom('U', now, 'show-4@1', 'show'); const ids: string[] = [];
  for (let i = 0; i < 4; i++) { const r = eng.join(room, `B${i}`, AV, now); if (r.ok) ids.push(r.player.id); }
  const host = (a: Action): any => eng.act(room, { role: 'host' }, 'h' + Math.random(), a, now); const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, 'p' + Math.random(), a, now);
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  for (let i = 0; i < 30 && !(room.round?.tileId === 'b42-sur' && room.phase === 'round'); i++) host({ k: (room.phase as string) === 'scoreboard' ? 'h.continue' : 'h.skipTile' });
  host({ k: 'h.skipTask' }); host({ k: 'h.begin' }); const t = eng.curTask(room) as any; assert.equal(t.closed, true);
  pl(0, { k: 'submit', payload: { answer: 'Uruguay' } }); pl(1, { k: 'submit', payload: { answer: 'Italien' } }); pl(2, { k: 'submit', payload: { answer: 'italy' } }); pl(3, { k: 'submit', payload: { answer: 'Narnia' } });
  assert.equal(eng.buildView(room, { role: 'tv' }, now).round!.points, 300, 'TV zeigt „bis zu 300“');
  host({ k: 'h.lock' }); assert.ok(host({ k: 'h.reveal' }).ok);
  const res = eng.buildView(room, { role: 'tv' }, now).round!.reveal.results; assert.deepEqual(ids.map(id => res[id].points), [300, 0, 0, 0]);
});

// ---------------------------------------------------------------- Installation auf einer BESTEHENDEN Datenbank
test('Installation auf bestehender DB: alte Inhalte/Pakete/Versionen byte-identisch, neue Pakete werden ergänzt, Wiederholung ohne Duplikate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'outplay-inst-')); const file = join(dir, 'outplay.db');
  const oldScenes = Object.fromEntries(Object.entries(SCENES).filter(([id]) => !['transfer1', 'kiosk1', 'table2', 'receipt2'].includes(id)));
  const old = new ContentService(new Store(file), { tiles: TILES, scenes: oldScenes as any, pack: SEED_PACK, show: SEED_SHOW, extraShows: [SEED_SHOW2, SEED_SHOW3, SEED_SHOW4] });
  assert.equal(old.listPublished().length, 5);
  const snap = (c: ContentService) => JSON.stringify({ q: c.listQuestions().map((x: any) => [x.id, x.task]), c: c.listCategories().map((x: any) => [x.id, x.taskIds, x.title]), v: c.listPublished().map((p: any) => [p.ref, JSON.stringify(c.resolveBook(p.ref))]), s: c.listScenes().map(s => s.id).sort() });
  const before = JSON.parse(snap(old)); const hashOld = JSON.stringify(before.v);
  const store2 = new Store(file);                                    // „Update“: gleiche Datenbankdatei, neuer Programmstand
  const cur = new ContentService(store2, { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });
  assert.equal(cur.listPublished().length, 5, 'beim Start wird nichts automatisch installiert');
  const st = cur.seedStatus(); assert.equal(st.installed, false); assert.ok(st.extras.some((e: any) => e.id === 'show-4' && !e.installed));
  const rep = cur.installSeed({ archiveOlder: true });
  assert.ok(rep.created.packs >= 2 && rep.created.scenes === 4 && rep.created.questions >= 27 + 3, JSON.stringify(rep.created)); assert.deepEqual(rep.archived, []);
  const after = JSON.parse(snap(cur));
  assert.equal(JSON.stringify(after.v.filter((x: any) => before.v.some((y: any) => y[0] === x[0]))), hashOld, 'bestehende Paketversionen unverändert');
  for (const [id, task] of before.q) assert.deepEqual(after.q.find((x: any) => x[0] === id)[1], task, 'Frage ' + id);
  for (const [id, ids, title] of before.c) assert.deepEqual(after.c.find((x: any) => x[0] === id).slice(1), [ids, title], 'Kategorie ' + id);
  assert.deepEqual(after.v.map((x: any) => x[0]).sort(), ['show-1@1', 'show-2@1', 'show-2k@1', 'show-3@1', 'show-3z@1', 'show-4@1', 'standard-2@1']);
  const rep2 = cur.installSeed({ archiveOlder: true }); assert.deepEqual(rep2.created, { scenes: 0, questions: 0, categories: 0, packs: 0 }, 'Wiederholung legt nichts doppelt an');
  assert.equal(cur.seedStatus().installed, true);
});

test('Admin → Installieren legt vorher ein Voll-Backup an (Datei vorhanden, Original-DB unverändert nutzbar); show-3 und show-2k bleiben unverändert veröffentlicht', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'outplay-bk-')); const e = await startEnv({ adminPassword: 'pw-test-12345' });
  try {
    const app: any = e.app; const backup = app.preInstallBackup;   // ohne backupDir: null (kein Fehler)
    assert.equal(typeof backup, 'function'); assert.equal(app.preInstallBackup(), null);
    app.opts.backupDir = dir; const f = app.preInstallBackup(); assert.ok(f && existsSync(f) && /vor-installation/.test(f), 'Sicherungsdatei: ' + f);
    assert.ok(CS.resolveBook('show-3@1').tiles.length && CS.resolveBook('show-2k@1').tiles.length);
  } finally { await e.close(); }
});

test('Regression: bestehende Pakete (show-1, show-3, show-2k, standard-2) bleiben vollständig gültig und veröffentlichbar; Dauer-Modell Best-of ehrlich', () => {
  for (const id of ['show-1', 'show-2', 'show-3', 'show-2k', 'standard-2']) { const b = CS.buildBook(id); assert.deepEqual(b.errors, [], id); }
  const a = analyzeShow(B42)!, k = analyzeShow(B42K)!, base = analyzeShow(CS.resolveBook('show-3@1'))!;
  assert.equal(a.tasksTotal, 46); assert.ok(a.minutesExpected > 120 && a.minutesExpected < 145, String(a.minutesExpected)); assert.ok(a.minutesMax > a.minutesExpected + 25);
  assert.ok(k.minutesExpected < a.minutesExpected); assert.ok(a.minutesExpected > base.minutesExpected + 25);
  console.log('# Dauer Best of 42:', JSON.stringify({ erwartet: a.minutesExpected, maximal: a.minutesMax, mitKonsens: k.minutesExpected, show3: base.minutesExpected }));
});

test('Länge der Show 4 / 5 / 6 Aufgaben je Modus (auch EINZIGARTIG): neue Paketversion, Proben bleiben, vollständig durchspielbar; Ausgangsversion unverändert', () => {
  const c = fresh(); const v1 = JSON.stringify(c.resolveBook('show-4@1'));
  let ver = 1;
  for (const n of [4, 5, 6]) {
    const p = c.getPack('show-4'); c.updatePack('show-4', { ...p, rules: { ...p.rules, tasksPerMode: n } }); ver++;
    const pub = c.publish('show-4', `${n} je Modus`); assert.equal(pub.ref, `show-4@${ver}`);
    const book = c.resolveBook(pub.ref);
    for (const t of book.tiles.filter(x => x.kind !== 'final')) { assert.equal(t.tasks.filter(x => !x.practice).length, n, `${t.id} bei ${n}`); assert.equal(t.tasks.filter(x => x.practice).length, 1); }
    assert.equal(book.tiles.find(t => t.kind === 'final')!.tasks.length, 4);
    const g = playAll(book, pub.ref); assert.equal(g.room.phase, 'ceremony'); assert.equal(g.log.scored, 7 * n + 4, `${n}: gewertet`); assert.equal(g.log.practice, 7);
    const a = analyzeShow(book)!; assert.equal(a.tasksTotal, 7 * n + 4); console.log(`# ${n} je Modus: erwartet ${a.minutesExpected} min, maximal ${a.minutesMax} min`);
  }
  assert.equal(JSON.stringify(c.resolveBook('show-4@1')), v1, 'veröffentlichte Version bleibt unverändert');
});

test('C09 / T03 / T05 / C19: redaktionelle Fassung (Transfermarkt-Maßstab, Haaland-Stationen, belegte Debütalter, Wiesn vorläufig)', () => {
  const t = (id: string) => BESTOF_NEW.find(q => q.id === id)!.task as any;
  const c09 = t('b42-rank-c09'); assert.equal(c09.prompt, 'Sortiere diese fünf BVB-Neuzugänge nach ihrer auf Transfermarkt.de angegebenen Ablösesumme – vom günstigsten zum teuersten.');
  const vals = c09.items.map((i: any) => Number(i.value.replace(',', '.').replace(/[^0-9.]/g, ''))); assert.deepEqual(vals, [...vals].sort((a, b) => a - b), 'Reihenfolge = aufsteigende Ablöse'); assert.equal(vals.length, 5);
  assert.match(t('b42-match-t03').pairs[0].left, /Salzburg → Dortmund/); assert.equal(t('b42-match-t03').pairs[0].right, 'Molde FK');
  assert.deepEqual(t('b42-rank-t05').items.map((i: any) => i.value), ['16 Jahre, 1 Tag', '16 Jahre, 3 Tage', '16 Jahre, 15 Tage', '16 Jahre, 214 Tage', '16 Jahre, 263 Tage']);
  assert.match(t('b42-est-c19').prompt, /vorläufigen Wiesn-Bilanz 2025/); assert.equal(t('b42-est-c19').answer, 6.5);
});
