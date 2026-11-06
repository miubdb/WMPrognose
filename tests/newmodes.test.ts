// MATCHMAKER, DIE VERBINDUNG, CODEBREAK-Altbestand und sicherer Einbau des neuen Standardpakets.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Engine } from '../server/engine';
import { BOOK, SEED_PACK, TILES } from '../content';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { AV, Admin, startEnv, type TestEnv } from './helpers';
import type { Action, LinkTask, MatchTask, TileDef, View } from '../shared/types';
import { LINK_POINTS, linkMatch, scoreMatch, validMatching } from '../shared/scoring';
import { ACTIVE_MODES, MODE_LABEL, normalizeTask, validateTask } from '../shared/validate';
import { analyzeBook } from '../shared/analysis';

const tile = (id: string) => TILES.find(t => t.id === id)!;
function game(tiles: TileDef[], n = 7) {
  const eng = new Engine({ tiles, scenes: SCENES, rules: { startCredit: 200 } });
  let now = 1_800_000_000_000;
  const { room } = eng.newRoom('NEW1', now);
  const ids: string[] = [];
  for (let i = 0; i < n; i++) { const r = eng.join(room, `Bot${i + 1}`, AV, now); assert.ok(r.ok); if (r.ok) ids.push(r.player.id); }
  let rq = 0;
  const host = (a: Action): any => eng.act(room, { role: 'host' }, `h${++rq}`, a, now);
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  const view = (who: number | 'host' | 'tv'): View => eng.buildView(room, who === 'host' ? { role: 'host' } : who === 'tv' ? { role: 'tv' } : { role: 'player', pid: ids[who] }, now);
  const advance = (ms: number) => { now += ms; eng.tick(room, now); };
  const start = (tileId: string) => { host({ k: 'h.startShow' }); host({ k: 'h.introDone' }); room.plan = ['wall', 'wall']; assert.ok(host({ k: 'h.pick', tileId }).ok); };
  return { eng, room, ids, host, pl, view, advance, start, get now() { return now; }, set now(v: number) { now = v; } };
}

// ------------------------------------------------------------------ MATCHMAKER
test('MATCHMAKER: Regeln – 50 Punkte je Paar, max. 300, keine Minuspunkte, Zuordnung nur 1:1', () => {
  const order = [3, 5, 0, 4, 2, 1];
  const perfect = [0, 1, 2, 3, 4, 5].map(k => order.indexOf(k));
  assert.deepEqual(scoreMatch(perfect, order), { correct: 6, points: 300, rows: [true, true, true, true, true, true] });
  assert.equal(scoreMatch([perfect[0], perfect[1], -1, -1, -1, -1], order).points, 100);
  assert.equal(scoreMatch(undefined, order).points, 0);
  assert.equal(scoreMatch([5, 4, 3, 2, 1, 0].map(x => (order[x] === 0 ? -1 : x)), order).points >= 0, true);
  assert.equal(validMatching([0, 1, 2, 3, 4, 5]), true);
  assert.equal(validMatching([0, 0, 2, 3, 4, 5]), false, 'doppelte Zuordnung');
  assert.equal(validMatching([0, 1, 2, 3, 4]), false); assert.equal(validMatching([0, 1, 2, 3, 4, 9]), false); assert.equal(validMatching('x'), false);
});

test('MATCHMAKER: sieben Spieler, Entwurf zählt bei Zeitablauf, endgültige Abgabe sperrt, keine Lösung im Spieler-/TV-Datenstrom', () => {
  const g = game([tile('v2-passt-zusammen'), ...TILES.filter(t => t.kind !== 'tile')]);
  const t = tile('v2-passt-zusammen').tasks[0] as MatchTask;
  g.start('v2-passt-zusammen'); g.host({ k: 'h.begin' });
  const pos = (k: number) => t.order.indexOf(k);
  const perfect = [0, 1, 2, 3, 4, 5].map(pos);
  // Sichten: keine Zuordnung/Reihenfolge, keine Auflösung
  for (const who of [0, 'tv', 'host'] as const) {
    const json = JSON.stringify(g.view(who).round!.data);
    assert.ok(!json.includes('"order"'), 'order nicht ausliefern');
    if (who !== 'host') assert.ok(!json.includes('solution'));
  }
  const d0 = g.view(0).round!.data;
  assert.deepEqual(d0.right, t.order.map(i => t.pairs[i].right)); assert.deepEqual(d0.left, t.pairs.map(p => p.left));
  assert.equal(g.view(0).round!.reveal, null);
  // Spieler 0: Entwurf, dann Änderung, dann endgültig
  assert.ok(g.pl(0, { k: 'submit', payload: { pairs: [perfect[1], perfect[0], -1, -1, -1, -1], final: false } }).ok);
  assert.ok(g.pl(0, { k: 'submit', payload: { pairs: perfect, final: false } }).ok, 'Zuordnung ist änderbar');
  assert.equal(g.pl(0, { k: 'submit', payload: { pairs: [0, 0, 0, 0, 0, 0], final: true } }).err, 'invalid', 'nur 1:1');
  assert.deepEqual(g.view(0).round!.data.mine, { pairs: perfect, final: false }, 'Reload/Reconnect: Entwurf bleibt erhalten');
  assert.equal(g.view(0).players[0].answered, false);
  assert.ok(g.pl(0, { k: 'submit', payload: { pairs: perfect, final: true } }).ok);
  assert.equal(g.pl(0, { k: 'submit', payload: { pairs: perfect, final: true } }).dup, true, 'doppelte Abgabe harmlos');
  assert.equal(g.pl(0, { k: 'submit', payload: { pairs: [1, 0, 2, 3, 4, 5], final: false } }).err, 'already_submitted', 'nach Abgabe gesperrt');
  assert.deepEqual(g.view(0).round!.data.mine.pairs, perfect);
  assert.equal(g.view(0).players[0].answered, true);
  // Spieler 1: nur 3 richtig (Entwurf, nie abgegeben) – zählt bei Zeitablauf
  g.pl(1, { k: 'submit', payload: { pairs: [perfect[0], perfect[1], perfect[2], -1, -1, -1], final: false } });
  // Spieler 2: komplett falsch rotiert (final)
  g.pl(2, { k: 'submit', payload: { pairs: perfect.map((_, k) => perfect[(k + 1) % 6]), final: true } });
  // Spieler 3..5 final perfekt, Spieler 6 nichts
  for (const i of [3, 4, 5]) g.pl(i, { k: 'submit', payload: { pairs: perfect, final: true } });
  assert.equal(g.room.round!.stage, 'open', 'nicht alle fertig → läuft weiter');
  g.advance(t.seconds * 1000 + 50);                                      // Zeit abgelaufen
  assert.equal(g.room.round!.stage, 'locked');
  assert.equal(g.pl(6, { k: 'submit', payload: { pairs: perfect, final: true } }).err, 'closed', 'nach Ablauf keine Abgabe');
  assert.ok(g.host({ k: 'h.reveal' }).ok);
  const rows = g.room.round!.result!.reveal.rows as any[];
  const pts = (i: number) => rows.find(r => r.pid === g.ids[i]).points;
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(pts), [300, 150, 0, 300, 300, 300, 0]);
  assert.ok(g.room.players.every(p => p.score >= 200), 'keine Minuspunkte (Startguthaben bleibt)');
  assert.equal(g.room.players[6].score, 200, 'ohne Abgabe: unverändert');
  assert.equal(g.view('tv').round!.reveal.pairs.length, 6);
});

test('MATCHMAKER: Abgabe kurz vor Ablauf zählt, alle fertig → sofort gesperrt, gleichzeitige Abgaben', () => {
  const g = game([tile('v2-passt-zusammen'), ...TILES.filter(t => t.kind !== 'tile')], 7);
  const t = tile('v2-passt-zusammen').tasks[0] as MatchTask;
  g.start('v2-passt-zusammen'); g.host({ k: 'h.begin' });
  const perfect = [0, 1, 2, 3, 4, 5].map(k => t.order.indexOf(k));
  g.advance(t.seconds * 1000 - 100);                                     // 0,1 s vor Ablauf
  for (let i = 0; i < 7; i++) assert.ok(g.pl(i, { k: 'submit', payload: { pairs: perfect, final: true } }).ok);
  assert.equal(g.room.round!.stage, 'locked', 'alle haben endgültig abgegeben');
  g.host({ k: 'h.reveal' });
  assert.ok((g.room.round!.result!.reveal.rows as any[]).every(r => r.points === 300));
});

// ------------------------------------------------------------------ DIE VERBINDUNG
test('DIE VERBINDUNG: Antwortprüfung – Varianten, Umlaute, Tippfehler → Host entscheidet, sonst falsch', () => {
  assert.equal(linkMatch('venedig', 'Venedig', ['Venice']), 'exact');
  assert.equal(linkMatch('  VENICE ', 'Venedig', ['Venice']), 'exact');
  assert.equal(linkMatch('Post it', 'Post-it', []), 'exact');
  assert.equal(linkMatch('Marie Curie', 'Marie Curie', ['Curie']), 'exact');
  assert.equal(linkMatch('Maria Curie', 'Marie Curie', []), 'close');
  assert.equal(linkMatch('Venedik', 'Venedig', []), 'close');
  assert.equal(linkMatch('Rom', 'Venedig', []), 'none'); assert.equal(linkMatch('', 'Venedig', []), 'none');
  assert.equal(linkMatch('Ärger', 'Aerger', []), 'exact');
});

function linkGame(n = 7) {
  const g = game([tile('v2-wer-oder-was'), ...TILES.filter(t => t.kind !== 'tile')], n);
  const t = tile('v2-wer-oder-was').tasks[0] as LinkTask;
  g.start('v2-wer-oder-was'); g.host({ k: 'h.begin' });
  return { g, t };
}
test('DIE VERBINDUNG: Hinweise erscheinen alle 20 s, Server bestimmt die Stufe – Punkte 300/225/150/75', () => {
  const { g, t } = linkGame();
  const shown = () => (g.view(0).round!.data.clues as string[]).length;
  assert.equal(shown(), 1); assert.equal(g.view(0).round!.data.level, 0);
  assert.equal(g.room.round!.stageSeconds, 20);
  // niemand sieht spätere Hinweise vorzeitig
  assert.ok(!JSON.stringify(g.view('tv').round!.data).includes(t.clues[1]));
  g.pl(0, { k: 'submit', payload: { answer: 'Venedig' } });                 // Stufe 1 → 300
  g.advance(20_000 + 5); assert.equal(shown(), 2);
  g.pl(1, { k: 'submit', payload: { answer: 'venice' } });                  // Stufe 2 → 225 (Variante)
  g.advance(20_000); assert.equal(shown(), 3);
  g.pl(2, { k: 'submit', payload: { answer: 'VENEZIA' } } as any);          // nicht hinterlegt → falsch/unklar
  g.pl(3, { k: 'submit', payload: { answer: 'Venedig' } });                 // Stufe 3 → 150
  g.advance(20_000); assert.equal(shown(), 4);
  g.pl(4, { k: 'submit', payload: { answer: 'Venedig' } });                 // Stufe 4 → 75
  assert.equal(g.pl(1, { k: 'submit', payload: { answer: 'Rom' } }).err, 'already_submitted', 'nur eine endgültige Antwort');
  assert.equal(g.pl(0, { k: 'submit', payload: { answer: 'Venedig' } }).dup, true, 'doppelte Abgabe harmlos');
  g.pl(5, { k: 'submit', payload: { answer: 'Rom' } });
  // Antworten anderer bleiben verborgen (TV/Handys), auch nach Sperre
  assert.ok(!JSON.stringify(g.view('tv')).includes('"Rom"'));
  assert.equal(g.view(0).round!.data.mine.level, 0); assert.equal(g.view(1).round!.data.mine.level, 1);
  g.advance(20_000 + 5);                                                    // Ende des vierten Fensters
  assert.equal(g.room.round!.stage, 'review', 'unklare/falsche Antworten brauchen die Host-Prüfung');
  assert.equal(g.pl(6, { k: 'submit', payload: { answer: 'Venedig' } }).err, 'closed');
  assert.ok(!('groups' in g.view('tv').round!.data) && !('groups' in g.view(0).round!.data), 'nur der Host sieht die Antworten');
  const groups = g.view('host').round!.data.groups as any[];
  assert.ok(groups.find(x => x.label === 'VENEZIA') || groups.some(x => x.members.includes(g.ids[2])));
  // Auflösung ist nur möglich, wenn nichts „unklar“ ist – Venezia ist hier eindeutig falsch (nicht hinterlegt) → Host kann es freigeben
  const venezia = groups.find(x => x.members.includes(g.ids[2]))!;
  assert.ok(g.host({ k: 'h.review', groupKey: venezia.key, decision: 'valid' }).ok);
  assert.ok(g.host({ k: 'h.reveal' }).ok);
  const rows = g.room.round!.result!.reveal.rows as any[];
  const pts = (i: number) => rows.find(r => r.pid === g.ids[i]).points;
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(pts), [300, 225, 150, 150, 75, 0, 0]);
  assert.deepEqual(LINK_POINTS, [300, 225, 150, 75]);
  assert.ok(g.room.players.every(p => p.score >= 200));
});

test('DIE VERBINDUNG: Abgabe unmittelbar nach Fristende (Tick hinkt hinterher) zählt für die NÄCHSTE Stufe; nach 80 s geschlossen', () => {
  const { g } = linkGame();
  g.now = g.now + 20_000 + 30;                                              // Frist überschritten, aber kein Tick
  assert.ok(g.pl(0, { k: 'submit', payload: { answer: 'Venedig' } }).ok);
  g.eng.tick(g.room, g.now);
  g.advance(20_000 * 3);                                                    // weit über das Ende
  assert.notEqual(g.room.round!.stage, 'open');
  g.host({ k: 'h.reveal' }) as any;
  const r0 = (g.room.round!.result!.reveal.rows as any[]).find(r => r.pid === g.ids[0]);
  assert.equal(r0.points, 225, 'Stufe 2, weil der Server die Zeit bestimmt');
});

test('DIE VERBINDUNG: Tippfehler wartet auf die Host-Prüfung (nie stillschweigend richtig/falsch); alle fertig → sofort gesperrt', () => {
  const { g } = linkGame(3);
  g.pl(0, { k: 'submit', payload: { answer: 'Venedik' } });                 // Tippfehler → unklar
  g.pl(1, { k: 'submit', payload: { answer: 'Venedig' } });
  g.pl(2, { k: 'submit', payload: { answer: 'Paris' } });
  assert.equal(g.room.round!.stage, 'review', 'alle abgegeben → direkt zur Prüfung');
  assert.equal(g.host({ k: 'h.reveal' }).err, 'review_needed', 'ohne Entscheidung keine Auflösung');
  const k = (g.view('host').round!.data.groups as any[]).find(x => x.members.includes(g.ids[0])).key;
  g.host({ k: 'h.review', groupKey: k, decision: 'valid' });
  assert.ok(g.host({ k: 'h.reveal' }).ok);
  const rows = g.room.round!.result!.reveal.rows as any[];
  assert.equal(rows.find(r => r.pid === g.ids[0]).points, 300); assert.equal(rows.find(r => r.pid === g.ids[2]).points, 0);
});

test('DIE VERBINDUNG: Pause friert die Hinweisfrist ein, Host-Sperre beendet sofort', () => {
  const { g } = linkGame(2);
  g.host({ k: 'h.pause', paused: true });
  g.advance(60_000);
  assert.equal(g.view(0).round!.data.level, 0, 'pausiert: kein neuer Hinweis');
  g.host({ k: 'h.pause', paused: false });
  g.pl(0, { k: 'submit', payload: { answer: 'Venedig' } });
  assert.ok(g.host({ k: 'h.lock' }).ok);
  assert.notEqual(g.room.round!.stage, 'open', 'Sperre schließt die Runde komplett');
});

// ------------------------------------------------------------------ Struktur / Paket
test('Neues Standardpaket: neun Kategorien, sieben Modi, 34 Aufgaben, Dauer 60–80 min, Fußballanteil 20–35 %, kein CODEBREAK', () => {
  const regular = TILES.filter(t => t.kind === 'tile');
  assert.equal(regular.length, 9);
  const modes = regular.map(t => t.mode).sort();
  assert.deepEqual(modes, ['estimate', 'estimate', 'geo', 'geo', 'glitch', 'link', 'match', 'rank', 'rank']);
  assert.equal(TILES.filter(t => t.kind === 'surprise')[0].mode, 'unique');
  const all = TILES.flatMap(t => t.tasks);
  assert.ok(all.length >= 32 && all.length <= 36, 'Aufgaben: ' + all.length);
  assert.ok(!all.some(k => k.mode === 'codebreak'));
  assert.deepEqual(new Set(all.map(k => k.mode)), new Set(ACTIVE_MODES));
  const fin = TILES.find(t => t.kind === 'final')!;
  assert.ok(new Set(fin.tasks.map(k => k.mode)).size >= 3, 'Finale: mehrere unterschiedliche Aufgaben');
  for (const k of all) { const e = validateTask(normalizeTask(k), id => !!SCENES[id]); assert.deepEqual(e, [], k.prompt); }
  const a = analyzeBook({ tiles: TILES, rules: { startCredit: 200, maxFootball: 2, maxPerMode: 2 } });
  assert.ok(a.combos!.minutesExpected.min >= 60 && a.combos!.minutesExpected.max <= 80, JSON.stringify(a.combos!.minutesExpected));
  assert.ok(a.combos!.footballShare.mean >= 0.2 && a.combos!.footballShare.mean <= 0.35, 'Fußball Ø ' + a.combos!.footballShare.mean);
  // keine Frage doppelt; Pointe „Allianz Arena“ nur einmal wiederholt
  const prompts = all.map(k => k.prompt); assert.equal(new Set(prompts).size, prompts.length);
  const arena = all.filter(k => k.mode === 'geo' && Math.abs((k as any).answer.lat - 48.2188) < 0.01);
  assert.equal(arena.length, 2, 'Allianz Arena: Einstieg + EIN Rückbezug (Champions-League-Finale)');
  assert.ok(MODE_LABEL.match.length && !ACTIVE_MODES.includes('codebreak' as any));
});

// ------------------------------------------------------------------ Altbestand & Installer
test('CODEBREAK: Altbestand bleibt les-/spielbar, neue Fragen werden abgelehnt, Pakete mit CODEBREAK lassen sich nicht neu veröffentlichen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'outplay-leg-'));
  const store = new Store(join(dir, 'a.db'));
  const c = new ContentService(store, { tiles: TILES, scenes: SCENES, pack: SEED_PACK });
  assert.throws(() => c.createQuestion({ task: { mode: 'codebreak', prompt: 'x', input: 'text', answers: ['a'], hints: [], seconds: 60, points: 100, explain: 'e' } }), /nicht mehr verwendet/);
  const legacy = c.createQuestion({ task: { mode: 'codebreak', prompt: 'Altes Rätsel', input: 'text', answers: ['a'], hints: ['h'], seconds: 60, points: 300, explain: 'e' } }, 'q_alt', { allowLegacy: true });
  assert.equal(legacy.mode, 'codebreak'); assert.equal(c.getQuestion('q_alt').task.prompt, 'Altes Rätsel');
  const cat = c.createCategory({ title: 'Alt', topic: 'Altbestand', icon: '🧩', color: '#8b5cf6', kind: 'tile', blurb: 'alt', taskIds: ['q_alt'] });
  assert.ok(cat.problems.some(p => p.includes('CODEBREAK')));
  const pk = c.createPack({ name: 'Altpaket', categoryIds: [...TILES.filter(t => t.kind === 'tile').slice(0, 5).map(t => t.id), cat.id], surprise: 'v2-einzigartig', final: 'v2-final' });
  assert.throws(() => c.publish(pk.id), /nicht veröffentlicht/);
  // Export/Import-Rundlauf mit Altfrage geht weiterhin (kein Datenverlust)
  const dump = c.export('questions');
  assert.ok(dump.questions.some((q: any) => q.id === 'q_alt'));
  store.close();
});

test('Standardpaket nachträglich installieren: bestehende Inhalte bleiben unangetastet, Vorgänger wird archiviert, kein Duplikat bei Wiederholung', () => {
  const dir = mkdtempSync(join(tmpdir(), 'outplay-inst-'));
  const file = join(dir, 'old.db');
  // „Alte Datenbank“: nur ein altes Standardpaket (standard-1) + eigene Frage des Nutzers
  const oldTiles: TileDef[] = [
    ...[1, 2, 3, 4, 5, 6].map(n => ({ id: `alt-geo${n}`, title: `Alt Geo ${n}`, topic: 'alt', icon: '🧭', color: '#14d9c0', mode: 'geo' as const, kind: 'tile' as const, football: false, blurb: 'b', tasks: [{ mode: 'geo' as const, map: 'world' as const, seconds: 30, points: 1000, prompt: `Alt: Wo liegt Rom ${n}?`, answer: { lat: 41.9, lon: 12.5, label: 'Rom' }, explain: 'Rom.' }] })),
    ...TILES.filter(t => t.kind !== 'tile').map(t => ({ ...t, id: 'alt-' + t.id })),
  ];
  const s1 = new Store(file);
  const c1 = new ContentService(s1, { tiles: oldTiles, scenes: SCENES, pack: { id: 'standard-1', name: 'Alt', description: 'alt' } });
  const mine = c1.createQuestion({ task: { ...tile('v2-heimspiel').tasks[0] as any, prompt: 'Meine eigene Frage' }, topic: 'Eigen' }, 'q_meine');
  assert.ok(c1.listPublished().some(p => p.id === 'standard-1'));
  s1.close();
  // Neue Version der App öffnet dieselbe Datenbank – es passiert noch NICHTS automatisch
  const s2 = new Store(file);
  const c2 = new ContentService(s2, { tiles: TILES, scenes: SCENES, pack: SEED_PACK });
  assert.deepEqual(c2.listPublished().map(p => p.id), ['standard-1']);
  assert.equal(c2.seedStatus().installed, false); assert.deepEqual(c2.seedStatus().olderPacks.map(p => p.id), ['standard-1']);
  const qBefore = c2.listQuestions().length;
  const rep = c2.installSeed({ archiveOlder: true });
  assert.equal(rep.alreadyInstalled, false); assert.equal(rep.created.packs, 1); assert.equal(rep.created.categories, 11); assert.equal(rep.created.questions, 34);
  assert.deepEqual(rep.archived, ['standard-1']);
  assert.equal(rep.ref, 'standard-2@1');
  assert.deepEqual(c2.listPublished().map(p => p.id), ['standard-2'], 'neues Paket ist aktiv, altes archiviert (nicht gelöscht)');
  assert.equal(c2.getPack('standard-1').status, 'archived'); assert.equal(c2.getPack('standard-1').currentVersion, 1);
  assert.ok(c2.resolveBook('standard-1@1').tiles.length > 0, 'laufende/alte Räume behalten ihren Stand');
  assert.equal(c2.getQuestion('q_meine').task.prompt, 'Meine eigene Frage', 'eigene Frage unverändert');
  assert.equal(c2.listQuestions().length, qBefore + 34);
  // Wiederholung: keine Duplikate, nichts wird erneut archiviert
  c2.setPackStatus('standard-1', 'published');                                   // Nutzer aktiviert das alte Paket bewusst wieder
  const again = c2.installSeed({ archiveOlder: true });
  assert.equal(again.alreadyInstalled, true); assert.deepEqual(again.created, { scenes: 0, questions: 0, categories: 0, packs: 0 }); assert.deepEqual(again.archived, []);
  assert.equal(c2.listQuestions().length, qBefore + 34); assert.equal(c2.getPack('standard-1').status, 'published');
  // Eigene Änderung am neuen Paket wird nie überschrieben
  c2.updateQuestion('v2-heimspiel-1', { topic: 'Von mir geändert' });
  c2.installSeed({ archiveOlder: true });
  assert.equal(c2.getQuestion('v2-heimspiel-1').topic, 'Von mir geändert');
  assert.ok(c2.listScenes().some(s => s.id === 'chat1') && c2.listScenes().some(s => s.id === 'ticket1'), 'neue Szenen vorhanden');
  void mine;
  s2.close();
});

// ------------------------------------------------------------------ Admin-API
const envs: TestEnv[] = [];
after(async () => { for (const e of envs) await e.close().catch(() => {}); });
test('Admin-API: Standardpaket-Status/Installation nur mit Anmeldung, Editor/Vorschau/Import für MATCHMAKER und DIE VERBINDUNG', async () => {
  const e = await startEnv({ adminPassword: 'test-admin-pw' }); envs.push(e);
  const a = new Admin(e);
  assert.equal((await a.req('GET', '/standard', undefined, { cookie: false })).status, 401);
  assert.equal((await a.req('POST', '/standard', {}, { cookie: false })).status, 401);
  await a.login();
  const st = (await a.get('/standard')).data; assert.equal(st.id, 'standard-2'); assert.equal(st.installed, true, 'frische Installation enthält das neue Paket');
  const rep = (await a.post('/standard', {})).data; assert.equal(rep.alreadyInstalled, true); assert.equal(rep.created.questions, 0);
  // neue Fragen anlegen + Vorschau (echte Engine) + Veröffentlichungsprüfung
  const m = tile('v2-passt-zusammen').tasks[0], l = tile('v2-wer-oder-was').tasks[0];
  const qm = await a.post('/questions', { task: m, topic: 'T' }); assert.equal(qm.status, 201);
  const ql = await a.post('/questions', { task: l, topic: 'T' }); assert.equal(ql.status, 201);
  assert.equal((await a.post('/questions', { task: { mode: 'codebreak', prompt: 'x', input: 'text', answers: ['a'], hints: [], seconds: 60, points: 100, explain: 'e' } })).status, 422);
  for (const task of [m, l]) {
    const pv = (await a.post('/preview', { task })).data;
    assert.equal(pv.ok, true); assert.ok(pv.frames.length >= 4);
    const json = JSON.stringify(pv.frames.map((f: any) => f.player.round.data));
    if (task.mode === 'link') assert.ok(!json.includes((task as any).clues[3]) || pv.frames.some((f: any) => f.label === 'Hinweis 4'), 'Hinweis 4 erst in der letzten Stufe');
    assert.ok(pv.scores.length === 4 && pv.scores[0].points > 0);
  }
  const bad = (await a.post('/preview', { task: { ...(m as any), pairs: (m as any).pairs.slice(0, 5) } })).data;
  assert.equal(bad.ok, false); assert.ok(bad.problems.some((p: string) => p.includes('sechs')));
  // Import/Export-Rundlauf
  const ex = (await a.get('/export?scope=pack:standard-2')).data;
  assert.ok(ex.questions.some((q: any) => q.task.mode === 'match') && ex.questions.some((q: any) => q.task.mode === 'link'));
  const dry = (await a.post('/import', { data: ex, onConflict: 'rename', dryRun: true, publish: true })).data;
  assert.equal(dry.errors.length, 0);
  assert.equal(dry.questions.created, 0, 'identischer Inhalt → keine Duplikate');
});
