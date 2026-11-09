// Praxistest 4: Startguthaben 0, Aufgabenzähler (MATCHMAKER/EINZIGARTIG 5), Inhaltsänderungen, SORTIER'S!-Karte, EINZIGARTIG-Host-Korrektur,
// SETZ-AUF-MICH-Anzeige, KICKBASE-KONSENS (5 × 100, Michael als Kandidat), sichere Aktualisierung bestehender Datenbanken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Engine } from '../server/engine';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { groupUnique, scoreUnique, scoreRankExact } from '../shared/scoring';
import { estimateNetLine } from '../shared/util';
import { shuffledPool } from '../server/modes';
import { TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS } from '../content';
import { AV } from './helpers';
import type { Action, Book } from '../shared/types';

const fresh = () => new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'outplay-p4-')), 'c.db')), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });
const CS = fresh();
const MAIN: Book = CS.resolveBook(CS.listPublished().find(p => p.id === 'show-4z')!.ref), LOCK: Book = CS.resolveBook(CS.listPublished().find(p => p.id === 'show-5')!.ref);
const scored = (b: Book, cat: string) => b.tiles.find(t => t.id === cat)!.tasks.filter(t => !t.practice) as any[];
const probes = (b: Book) => b.tiles.reduce((n, t) => n + t.tasks.filter(x => x.practice).length, 0);

test('Startguthaben 0 in beiden Best-of-Paketen; Backup-Paket show-3 unverändert; Admin-Standard für neue Pakete 0', () => {
  assert.equal(MAIN.rules!.startCredit, 0); assert.equal(LOCK.rules!.startCredit, 0);
  assert.equal(CS.resolveBook('show-3@1').rules!.startCredit, 200, 'altes Backup bleibt unverändert');
  for (const b of [MAIN, LOCK]) { const eng = new Engine(() => b); const { room } = eng.newRoom('X', 1_800_000_000_000, 'x@1', 'show'); eng.join(room, 'A', AV, 1); eng.join(room, 'B', AV, 1); eng.act(room, { role: 'host' }, 'h1', { k: 'h.startShow' }, 1_800_000_000_000); assert.deepEqual(room.players.map(p => p.score), [0, 0]); }
});

test('Aufgabenzähler: MATCHMAKER und EINZIGARTIG je 5, die fünf anderen Modi je 6, 7 Proben getrennt – 40 Wertungsfragen (bei 4: 4/4/4…)', () => {
  for (const b of [MAIN, LOCK]) {
    const per = Object.fromEntries(b.tiles.filter(t => t.kind !== 'final').map(t => [t.tasks[0].mode, t.tasks.filter(x => !x.practice).length]));
    assert.deepEqual(per, { geo: 6, match: 5, rank: 6, unique: 5, glitch: 6, estimate: 6, link: 6 });
    assert.equal(probes(b), 7); assert.ok(b.tiles.filter(t => t.kind !== 'final').every(t => t.tasks[0].practice));
    assert.equal(b.tiles.filter(t => t.kind !== 'final').reduce((n, t) => n + t.tasks.filter(x => !x.practice).length, 0), 40);
  }
  const c = fresh(); for (const n of [4, 5, 6]) { const p = c.getPack('show-4z'); c.updatePack('show-4z', { ...p, rules: { ...p.rules, tasksPerMode: n } }); const b = c.resolveBook(c.publish('show-4z', `${n}`).ref);
    const sc = (m: string) => b.tiles.filter(t => t.kind !== 'final' && t.tasks[0].mode === m).reduce((k, t) => k + t.tasks.filter(x => !x.practice).length, 0);
    assert.equal(sc('match'), Math.min(n, 5)); assert.equal(sc('unique'), Math.min(n, 5)); assert.equal(sc('geo'), n); }
});

test('Paketnamen ohne feste Zahl, eindeutig; show-4z ist Standard im Showmaster-Angebot, keine archivierten Pakete', () => {
  const c = fresh(); c.cleanupApply(); const l = c.listPublished(); assert.deepEqual(l.map(p => p.id).sort(), ['show-3', 'show-4z', 'show-5', 'show-after']); for (const p of l) assert.ok(!/42/.test(p.name), p.name);
  assert.match(l.find(p => p.id === 'show-4z')!.name, /KICKBASE-KONSENS/); assert.match(l.find(p => p.id === 'show-5')!.name, /FINAL LOCK/);
  assert.match(c.defaultRef(), /^show-4z@/);
});

test('MATCHMAKER: Giraffe verständlich, Haaland nur „(danach Salzburg)“, Gaming-Frage nicht im aktiven Ablauf, aber im Pool erhalten', () => {
  for (const b of [MAIN, LOCK]) {
    const m = scored(b, 'b44-r2'); const tier = m.find(t => /Rekord/.test(t.prompt)); assert.ok(tier);
    assert.ok(tier.pairs.some((p: any) => p.left === 'Giraffe' && p.right === 'Tier mit der größten Körperhöhe an Land')); assert.ok(!JSON.stringify(tier).includes('höchstes Landtier') || !tier.pairs.some((p: any) => p.right === 'höchstes Landtier'));
    assert.equal(tier.pairs.length, 6); assert.equal(tier.pairs.filter((p: any) => p.left !== 'Giraffe').map((p: any) => p.right).join('|'), 'schnellstes Landtier|größtes Tier der Erde|größter Vogel|kleinster Vogel (Bienenelfe)|wird über 250 Jahre alt');
    const h = m.find(t => t.pairs.some((p: any) => /Haaland/.test(p.left))); assert.ok(h.pairs.some((p: any) => p.left === 'Erling Haaland (danach Salzburg)' && p.right === 'Molde FK')); assert.ok(!JSON.stringify(h.pairs).includes('→'));
    assert.ok(!JSON.stringify(b).includes('Spielfigur'), 'keine Gaming-Frage');
  }
  const ids = CS.listQuestions().map((q: any) => q.id); assert.ok(ids.includes('s3-match-spiele') && ids.includes('s3-unique-orchester') && ids.includes('s4-match-tierrekorde'), 'nichts gelöscht');
});

test('EINZIGARTIG: Champions-League-Frage vereinfacht (Katalog gleich), Orchesterfrage entfernt (aber im Pool)', () => {
  const u = scored(MAIN, 'b44-sur'); assert.equal(u.length, 5);
  const cl = u.find(t => /Champions League/.test(t.prompt)); assert.equal(cl.prompt, 'Nenne einen Verein außerhalb von Deutschland, England und Spanien, der schon einmal die Champions League oder den früheren Europapokal gewonnen hat.');
  const old = (CS.listQuestions().find((q: any) => q.id === 'b42-unique-p20') as any).task; assert.deepEqual(cl.valid, old.valid); assert.equal(cl.closed, true); assert.equal(cl.explain, old.explain);
  assert.ok(!JSON.stringify(MAIN).includes('Sinfonieorchester'));
});

test('SORTIER’S!: Moukoko & Iličević teilen eine Karte, Reihenfolge eindeutig, 50 Punkte je Karte, nie in Lösungsreihenfolge gemischt', () => {
  const t = scored(MAIN, 'b44-r3').find(x => /Bundesliga-Einsatz/.test(x.prompt)); assert.ok(t);
  assert.equal(t.prompt, 'Sortiere diese fünf Karten nach dem Alter beim ersten Bundesliga-Einsatz – die jüngsten zuerst.');
  assert.deepEqual(t.items.map((i: any) => i.text), ['Youssoufa Moukoko & Niko Iličević', 'Linus Güther', 'Paul Wanner', 'Louis Lemke', 'Tom Bischof']);
  assert.deepEqual(t.items.map((i: any) => i.value), ['jeweils 16 Jahre, 1 Tag', '16 Jahre, 3 Tage', '16 Jahre, 15 Tage', '16 Jahre, 214 Tage', '16 Jahre, 264 Tage']);
  assert.match(t.explain, /gemeinsam/); assert.match(t.explain, /Iličević/); assert.match(t.explain, /1\. November 2026/);
  assert.equal(t.items.filter((i: any) => /Iličević/.test(i.text)).length, 1, 'beide Rekordhalter in genau einer Karte');
  assert.equal(scoreRankExact([0, 1, 2, 3, 4], 250).points, 250); assert.equal(scoreRankExact([1, 0, 2, 3, 4], 250).points, 150);
  const sh = shuffledPool(t); assert.ok(sh.some((v, i) => v !== i));
});

test('DIE VERBINDUNG: Kaiserslautern – Hinweis 1 neu, übrige Hinweise und Lösung unverändert', () => {
  const k = scored(MAIN, 'b44-r6').find(x => x.answer === '1. FC Kaiserslautern'); const o = (CS.listQuestions().find((q: any) => q.id === 'b42-link-t11') as any).task;
  assert.equal(k.clues[0], 'Ein dramatischer Rückschlag und ein historischer Triumph lagen bei mir nur zwei Jahre auseinander.'); assert.deepEqual(k.clues.slice(1), o.clues.slice(1)); assert.equal(k.answer, o.answer);
});

test('SETZ AUF MICH: Netto-Anzeige „Schätzung +30 · Wette −100 = −70 Punkte“, gewonnene Wetten, ohne Wette', () => {
  assert.equal(estimateNetLine(30, -100), 'Schätzung +30 · Wette −100 = −70 Punkte');
  assert.equal(estimateNetLine(30, 100), 'Schätzung +30 · Wette +100 = +130 Punkte');
  assert.equal(estimateNetLine(30, null), 'Schätzung +30 Punkte'); assert.equal(estimateNetLine(0, -50), 'Schätzung 0 · Wette −50 = −50 Punkte');
});

// ---------------------------------------------------------------- Spiel-Treiber
function game(book: Book, n: number) {
  let now = 1_800_000_000_000; const eng = new Engine(() => book); const { room } = eng.newRoom('P4', now, 'x@1', 'show'); const ids: string[] = [];
  for (let i = 0; i < n; i++) { const r = eng.join(room, `Bot${i + 1}`, AV, now); if (r.ok) ids.push(r.player.id); }
  let rq = 0; const host = (a: Action): any => eng.act(room, { role: 'host' }, `h${++rq}`, a, now);
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  const view = (w: 'host' | 'tv' | number) => eng.buildView(room, typeof w === 'number' ? { role: 'player', pid: ids[w] } : { role: w } as any, now);
  const advance = (ms: number) => { now += ms; eng.tick(room, now); };
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  const goto = (tile: string) => { for (let g = 0; g < 60; g++) { if (room.phase === 'scoreboard') { host({ k: 'h.continue' }); continue; } if (room.phase === 'round' && room.round!.tileId === tile) return; assert.ok(host({ k: 'h.skipTile' }).ok); } assert.fail('Kachel nicht erreicht ' + tile); };
  return { eng, room, ids, host, pl, view, advance, goto };
}

test('EINZIGARTIG: jede Antwort ist durch den Host korrigierbar (auch automatisch gültige); Synonyme, Dopplungen und 0 Punkte bei Mehrfachnennung bleiben korrekt', () => {
  const g = game(MAIN, 4); g.goto('b44-sur'); const { host, pl, room, view } = g;
  host({ k: 'h.skipTask' });   // Probe überspringen
  const t = g.eng.curTask(room) as any; assert.equal(t.mode, 'unique'); assert.ok(!t.practice);
  assert.ok(host({ k: 'h.begin' }).ok);
  const nat = t.valid.map((v: any) => v.name);
  const ans = [nat[0], t.valid[0].variants[0] ?? nat[0], nat[1], 'Atlantis'];   // 0 doppelt (Name + Synonym/Name), 1 gültig einzeln, Atlantis unbekannt/ungültig
  ans.forEach((a: string, i: number) => assert.ok(pl(i, { k: 'submit', payload: { answer: a } }).ok));
  host({ k: 'h.lock' }); assert.equal(room.round!.stage, 'review');
  const groups = () => (view('host').round!.data.groups as any[]); const pts = () => { const rr = view('host'); return rr; };
  const of = (pid: string) => groups().find(x => x.members.includes(pid))!;
  // Automatik: 0+1 gleiche Gruppe (geteilt), 2 gültig einzeln, 3 ungültig (geschlossene Liste)
  assert.equal(of(g.ids[0]).members.length, 2); assert.equal(of(g.ids[3]).state, 'invalid');
  // Host: Spieler 1 ist doch etwas anderes → ungültig. Danach ist Spieler 0 einzigartig.
  assert.ok(host({ k: 'h.review', groupKey: 'a:' + g.ids[1], decision: 'invalid' }).ok); assert.equal(of(g.ids[0]).members.length, 1); assert.equal(of(g.ids[1]).state, 'invalid'); assert.deepEqual(of(g.ids[1]).manual, [g.ids[1]]);
  // Host: „Atlantis“ ausnahmsweise gültig → eigene Gruppe, einzigartig
  assert.ok(host({ k: 'h.review', groupKey: 'a:' + g.ids[3], decision: 'valid' }).ok); assert.equal(of(g.ids[3]).state, 'valid');
  // Host: Spieler 2 ist identisch mit Spieler 0 → Mehrfachnennung (beide 0 Punkte)
  assert.ok(host({ k: 'h.review', groupKey: 'a:' + g.ids[2], decision: { sameAs: g.ids[0] } }).ok); assert.equal(of(g.ids[0]).members.length, 2);
  // Zurück zur Automatik für Spieler 2 und 1
  assert.ok(host({ k: 'h.review', groupKey: 'a:' + g.ids[2], decision: 'auto' }).ok); assert.equal(of(g.ids[2]).members.length, 1); assert.ok(host({ k: 'h.review', groupKey: 'a:' + g.ids[1], decision: 'auto' }).ok); assert.equal(of(g.ids[0]).members.length, 2);
  assert.equal(host({ k: 'h.review', groupKey: 'a:' + g.ids[1], decision: 'quatsch' as any }).ok, false, 'ungültige Entscheidung abgelehnt');
  // Endstand: 1 ✗ ungültig → 0 einzigartig (300), 2 einzigartig, 3 Atlantis einzigartig
  host({ k: 'h.review', groupKey: 'a:' + g.ids[1], decision: 'invalid' });
  const before = room.players.map(p => p.score); host({ k: 'h.reveal' }); assert.equal(room.round!.stage, 'reveal');
  const d = room.players.map((p, i) => p.score - before[i]); const U = g.eng.bk(room).rules!.uniquePoints || t.pointsUnique;
  assert.deepEqual(d, [U, 0, U, U]);
});

test('groupUnique/scoreUnique: Overrides pro Antwort – gültig/ungültig/identisch/Auto; Mehrfachnennung bleibt 0; Zyklen und fehlende Ziele sind harmlos', () => {
  const valid = [{ name: 'Gold', variants: ['Gelb'] }, { name: 'Rot', variants: [] }];
  const answers = { a: 'Gelb', b: 'Gold', c: 'Rot', d: 'Blau' };
  const sc = (ov: any) => scoreUnique(groupUnique(answers, valid, ov, true), 300, 0);
  assert.deepEqual(Object.values(sc({})).map(r => r.points), [0, 0, 300, 0]);
  assert.equal(sc({ 'a:a': 'invalid' }).b.points, 300);                       // „Gelb“ ungültig → Gold einzigartig
  assert.equal(sc({ 'a:d': 'valid' }).d.points, 300);                         // Blau ausnahmsweise gültig
  assert.equal(sc({ 'a:d': { sameAs: 'c' } }).c.points, 0);                   // Blau = Rot → beide Mehrfachnennung
  assert.equal(sc({ 'a:d': { mapTo: 'Rot' } }).d.points, 0);
  assert.equal(sc({ 'a:a': { sameAs: 'b' } }).a.points, 0);
  assert.doesNotThrow(() => sc({ 'a:a': { sameAs: 'b' }, 'a:b': { sameAs: 'a' } })); assert.doesNotThrow(() => sc({ 'a:a': { sameAs: 'nobody' } }));
  assert.equal(sc({ 'a:c': 'invalid', 'a:d': 'valid' }).d.points, 300);
});

// ---------------------------------------------------------------- KICKBASE-KONSENS
function consensus(n: number, votes: (q: number, i: number, ids: string[]) => string, hostCand = true) {
  const g = game(MAIN, n); g.goto('b44-final-kk');
  const rows: any[] = []; let max = 0;
  for (let q = 0; q < 5; q++) {
    assert.ok(g.host({ k: 'h.begin' }).ok); const d = g.view('tv').round!.data; assert.equal(d.candidate?.name, hostCand ? 'Michael (Showmaster)' : undefined);
    g.ids.forEach((id, i) => { const tg = votes(q, i, g.ids); const r = g.pl(i, { k: 'submit', payload: { target: tg } }); assert.ok(r.ok, `Q${q + 1} Spieler ${i + 1} → ${tg}: ${r.err}`); });
    assert.equal(JSON.stringify(g.view('tv').round!.data).includes('votes'), false, 'Stimmen bleiben geheim');
    const before = g.room.players.map(p => p.score); g.host({ k: 'h.lock' }); g.host({ k: 'h.reveal' });
    const rev = g.view('host').round!.reveal; rows.push({ rev, delta: g.room.players.map((p, i) => p.score - before[i]) });
    g.host({ k: 'h.next' });
  }
  return { g, rows };
}
const M = 'host:candidate';

test('KICKBASE-KONSENS: fünf Fragen à 100, max. 500; Michael ist Kandidat, aber kein Spieler und bekommt nie Punkte', () => {
  const f = MAIN.tiles.find(t => t.kind === 'final')!; assert.equal(f.tasks.length, 5); assert.ok(f.tasks.every((t: any) => t.mode === 'vote' && t.points === 100 && t.candidate === 'Michael (Showmaster)'));
  assert.deepEqual(f.tasks.map((t: any) => t.prompt), [
    'Wer würde von uns am ehesten 65 Millionen für einen Spieler ausgeben, nur damit ihn kein Konkurrent bekommt?', 'Wer kontrolliert seine Kickbase-Aufstellung fünf Minuten vor Anpfiff noch einmal panisch?',
    'Wer sorgt in unserer Gruppe am häufigsten für Ragebait?', 'Wer würde bei einem gemeinsamen Urlaub am ehesten den Zug oder Flug verpassen?', 'Wer würde in einer Quizshow am überzeugendsten eine komplett falsche Antwort geben?']);
  // 4 Spieler: immer alle stimmen für Michael (Konsens) → jeder 100 je Frage = genau 500, Michael erscheint nirgends als Spieler
  const { g, rows } = consensus(4, () => M);
  assert.deepEqual(g.room.players.map(p => p.score), [500, 500, 500, 500]); assert.equal(g.room.players.length, 4);
  for (const r of rows) { assert.equal(r.rev.winners[0], M); assert.equal(r.rev.counts.find((c: any) => c.pid === M).votes, 4); assert.equal(r.rev.noConsensus, false); }
  assert.ok(!g.view('tv').players.some(p => /Michael/.test(p.name)), 'kein Fake-Spieler');
  assert.ok(g.view('tv').players.every(p => p.score === null), 'Gesamtwertung verborgen bis zur Siegerehrung');
});

test('KICKBASE-KONSENS: Wertung – Michael vorn: nur seine Wähler; Gleichstand ab zwei Stimmen; nur Einzelstimmen = 0; kein Punkt fürs Gewähltwerden', () => {
  // Frage 1: Michael 3 Stimmen, Spieler 4 wählt P1 → nur P1–P3 punkten
  const { rows } = consensus(4, (q, i, ids) => (q === 0 ? (i < 3 ? M : ids[0]) : q === 1 ? ids[(i + 1) % 4] : q === 2 ? (i % 2 === 0 ? ids[1] : ids[2]) : q === 3 ? (i === 0 ? ids[1] : i === 1 ? ids[2] : i === 2 ? ids[3] : ids[0]) : M));
  assert.deepEqual(rows[0].delta, [100, 100, 100, 0], 'Michael hat die meisten Stimmen: nur seine Wähler');
  assert.deepEqual(rows[1].delta, [0, 0, 0, 0]); assert.equal(rows[1].rev.noConsensus, true, 'jeder genau eine Stimme: kein Konsens');
  // Frage 3: P3 (Spieler 3) und P4 je 2 Stimmen → Gleichstand mit je ≥2 → alle vier punkten; Gewählte (P3,P4) punkten, weil sie selbst getippt haben (Spieler 3 stimmt für P4? hier: ids[2]/ids[3])
  assert.equal(rows[2].rev.winners.length, 2); assert.deepEqual(rows[2].delta.map((x: number) => x > 0), [true, true, true, true].map((_, i) => rows[2].delta[i] > 0));
  assert.deepEqual(rows[2].delta, [100, 100, 100, 100]);
  // Frage 4: alle einzeln gewählt → 0
  assert.deepEqual(rows[3].delta, [0, 0, 0, 0]);
  assert.deepEqual(rows[4].delta, [100, 100, 100, 100]);
});

test('KICKBASE-KONSENS: Gleichstand mit Einzelstimme als Spitze → kein Konsens; Selbstwahl erlaubt; Michael immer wählbar', () => {
  const g = game(MAIN, 3); g.goto('b44-final-kk'); g.host({ k: 'h.begin' });
  assert.equal(g.pl(0, { k: 'submit', payload: { target: 'nobody' } }).ok, false); assert.ok(g.pl(0, { k: 'submit', payload: { target: g.ids[0] } }).ok, 'Selbstwahl erlaubt (auch ab 3 Spielern)'); assert.ok(g.pl(1, { k: 'submit', payload: { target: M } }).ok);
  const two = game(MAIN, 2); two.goto('b44-final-kk'); two.host({ k: 'h.begin' }); assert.ok(two.pl(0, { k: 'submit', payload: { target: two.ids[0] } }).ok, 'zwei Spieler: Selbstwahl erlaubt');
  assert.ok(two.pl(1, { k: 'submit', payload: { target: M } }).ok);
  // zwei Spieler, beide wählen Michael → Konsens (2 Stimmen); verschiedene Ziele → kein Konsens
  const a = consensus(2, () => M); assert.deepEqual(a.g.room.players.map(p => p.score), [500, 500]);
  const b = consensus(2, (_q, i, ids) => (i === 0 ? M : ids[1])); assert.deepEqual(b.g.room.players.map(p => p.score), [0, 0], 'zwei Einzelstimmen = kein Konsens');
});

test('KICKBASE-KONSENS: TV-Titel nur „KICKBASE-KONSENS“ (nie zusammen mit FINAL LOCK); FINAL LOCK-Paket behält seinen Namen; Marktwert-Updates bleiben', () => {
  const g = game(MAIN, 3); assert.equal(g.eng.finalName(g.room), 'KICKBASE-KONSENS'); g.goto('b44-final-kk');
  const v = g.view('tv'); assert.ok(!/FINAL LOCK/.test(JSON.stringify([v.room.act, v.round!.title])));
  const h = g.view('host'); assert.ok(!/FINAL LOCK/.test(JSON.stringify([h.room, h.host?.planNext])), 'Host-Ansicht ohne FINAL LOCK');
  const gl = game(LOCK, 3); assert.equal(gl.eng.finalName(gl.room), 'FINAL LOCK');
  const plan = Engine.showPlan(MAIN); assert.equal(plan.filter(x => x === 'board').length, 7);
});

test('Bestehende Datenbank (Stand Praxistest 3) wird sicher aktualisiert: neue Versionen von show-5/show-4z, alte Versionen und Räume unverändert, nichts gelöscht, nichts reaktiviert', () => {
  const c = fresh();
  // Zustand vor Praxistest 4 nachstellen: Revision unbekannt, Best-of-Pakete auf alter Version
  const db = (c as any).store.db; db.prepare("DELETE FROM settings WHERE key LIKE 'rev:%'").run();
  c.setPackStatus('show-4', 'archived');
  const old5 = c.listPacksView().find(p => p.id === 'show-5')!.currentVersion, oldBook = JSON.stringify(c.resolveBook(`show-5@${old5}`));
  const eng = new Engine(r => c.resolveBook(r)); const { room } = eng.newRoom('R', 1_800_000_000_000, `show-5@${old5}`, 'show'); const planBefore = JSON.stringify(room.plan);
  const plan = c.cleanupPlan(); assert.ok(plan.update.includes('show-5') && plan.update.includes('show-4z'), JSON.stringify(plan.update));
  const before = { q: c.listQuestions().length, cat: c.listCategories().length, packs: c.listPacksView().length };
  const r = c.cleanupApply();
  assert.equal(r.updated.length, 3); assert.ok(r.updated.every(x => /^show-(5|4z|after)@\d+$/.test(x)));
  assert.equal(c.listPacksView().length, before.packs, 'keine neuen Pakete'); assert.ok(c.listQuestions().length >= before.q);
  assert.equal(JSON.stringify(c.resolveBook(`show-5@${old5}`)), oldBook, 'alte Version unverändert'); assert.equal(JSON.stringify(room.plan), planBefore); assert.equal(room.bookId, `show-5@${old5}`);
  assert.equal(c.getPack('show-4').status, 'archived', 'archivierte Pakete bleiben archiviert');
  assert.ok(c.cleanupPlan().clean, 'Zweiter Lauf: nichts mehr zu tun');
  const nb = c.resolveBook(r.updated.find(x => x.startsWith('show-4z'))!); assert.equal(nb.rules!.startCredit, 0); assert.equal(nb.tiles.find(t => t.kind === 'final')!.tasks.length, 5);
});
