// Neue Spiele (Praxistest 5): LÜGEN HABEN KURZE BEINE (bluff), SCHÄTZKORRIDOR (corridor), VERDREHTE WELT (twist).
import type { BluffTask, CorridorTask, TwistTask } from '../shared/types';
import { corridorPoints, twistPoints, linkMatch } from '../shared/scoring';
import { normText, parseNumber } from '../shared/util';
import type { Ctx, ModeImpl, SubmitResult, Draft } from './modes';

const err = (e: string): SubmitResult => ({ ok: false, err: e });
const OK: SubmitResult = { ok: true };
const nm = (c: Ctx, pid: string) => c.players.find(p => p.id === pid)?.name ?? '?';
const shuffle = <T,>(a: T[]): T[] => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

// =====================================================================
// LÜGEN HABEN KURZE BEINE
// =====================================================================
interface BluffOption { id: string; text: string; truth: boolean; authors: string[] }
const bluffOptions = (c: Ctx): BluffOption[] => c.round.m?.options ?? [];
/** Baut nach der Schreibphase die Auswahlliste: die echte Antwort + alle erfundenen (gleiche Lügen werden zusammengefasst), gemischt. */
function buildBluffOptions(c: Ctx) {
  const t = c.task as BluffTask; const byNorm = new Map<string, BluffOption>();
  for (const p of c.players) {
    const lie: string | undefined = c.round.pm[p.id]?.lie; if (!lie) continue;
    const k = normText(lie); const o = byNorm.get(k);
    if (o) o.authors.push(p.id); else byNorm.set(k, { id: '', text: lie, truth: false, authors: [p.id] });
  }
  const all = shuffle<BluffOption>([{ id: '', text: t.answer, truth: true, authors: [] }, ...byNorm.values()]);
  all.forEach((o, i) => { o.id = 'o' + (i + 1); });
  c.round.m = { ...(c.round.m ?? {}), options: all };
}
const bluff: ModeImpl = {
  maxPoints: t => (t as BluffTask).points + 2 * (t as BluffTask).bluffPoints,
  begin(c) { c.round.m = {}; c.setStage('open', (c.task as BluffTask).seconds); },
  advance(c) {
    const t = c.task as BluffTask;
    if (c.round.stage === 'open') {
      buildBluffOptions(c);
      if (bluffOptions(c).length < 2) c.setStage('locked', null);       // niemand hat gelogen: nichts zu raten
      else c.setStage('bet', t.pickSeconds);
    } else c.setStage('locked', null);
  },
  submit(c, pid, payload) {
    const t = c.task as BluffTask; const pm = (c.round.pm[pid] ??= {});
    if (c.round.stage === 'open') {
      const lie = String(payload?.lie ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!lie) return err('invalid');
      const n = normText(lie);
      if ([t.answer, ...t.accept].some(a => normText(a) === n)) return err('is_truth');          // zu nah an der Wahrheit
      if (pm.lie) return pm.lie === lie ? { ok: true, dup: true } : err('already_submitted');
      pm.lie = lie; return OK;
    }
    if (c.round.stage === 'bet') {
      const opt = bluffOptions(c).find(o => o.id === String(payload?.option ?? '')); if (!opt) return err('invalid_option');
      if (opt.authors.includes(pid)) return err('own_lie');
      if (pm.pick) return pm.pick === opt.id ? { ok: true, dup: true } : err('already_submitted');
      pm.pick = opt.id; return OK;
    }
    return err('closed');
  },
  answered: (c, pid) => (c.round.stage === 'bet' || c.round.stage === 'locked' || c.round.stage === 'reveal') && c.round.m?.options ? !!c.round.pm[pid]?.pick : !!c.round.pm[pid]?.lie,
  complete(c) {
    if (c.round.stage === 'open') return c.players.length > 0 && c.players.every(p => !!c.round.pm[p.id]?.lie);
    if (c.round.stage === 'bet') return c.players.every(p => !!c.round.pm[p.id]?.pick);
    return false;
  },
  score(c) {
    const t = c.task as BluffTask; const opts = bluffOptions(c);
    const pickers = (id: string) => c.players.filter(p => c.round.pm[p.id]?.pick === id).map(p => p.id);
    const entries: Draft[] = []; const rows = c.players.map(p => {
      const pm = c.round.pm[p.id] ?? {}; const picked = opts.find(o => o.id === pm.pick); const correct = !!picked?.truth;
      const fooled = opts.filter(o => o.authors.includes(p.id)).reduce((n, o) => n + pickers(o.id).length, 0);
      const pts = (correct ? t.points : 0) + fooled * t.bluffPoints;
      if (correct) entries.push({ pid: p.id, delta: t.points, label: 'Wahrheit erkannt' });
      if (fooled) entries.push({ pid: p.id, delta: fooled * t.bluffPoints, label: `${fooled} Spieler getäuscht` });
      return { pid: p.id, lie: pm.lie ?? null, pick: pm.pick ?? null, correct, fooled, points: pts };
    });
    return { entries, reveal: { answer: t.answer, explain: t.explain, points: t.points, bluffPoints: t.bluffPoints, rows,
      options: opts.map(o => ({ id: o.id, text: o.text, truth: o.truth, authors: o.authors, pickers: pickers(o.id) })) } };
  },
  view(c, a) {
    const t = c.task as BluffTask; const st = c.round.stage; const opts = bluffOptions(c);
    const base: any = { prompt: t.prompt, points: t.points, bluffPoints: t.bluffPoints, writtenCount: c.players.filter(p => !!c.round.pm[p.id]?.lie).length, pickedCount: c.players.filter(p => !!c.round.pm[p.id]?.pick).length, playerCount: c.players.length };
    // Wahrheit und Autoren bleiben bis zur Auflösung serverseitig verborgen (nur der Showmaster sieht die Wahrheit)
    if (opts.length) base.options = opts.map(o => ({ id: o.id, text: o.text, ...(a.role === 'host' ? { truth: o.truth } : {}) }));
    if (a.role === 'player' && a.pid) { const pm = c.round.pm[a.pid] ?? {}; base.mine = { lie: pm.lie ?? null, pick: pm.pick ?? null }; base.ownOptions = opts.filter(o => o.authors.includes(a.pid!)).map(o => o.id); }
    if (a.role === 'host') { base.solution = t.answer; if (st === 'open') base.live = c.players.filter(p => c.round.pm[p.id]?.lie).map(p => ({ pid: p.id, lie: c.round.pm[p.id].lie })); }
    return base;
  },
};

// =====================================================================
// SCHÄTZKORRIDOR
// =====================================================================
const corridor: ModeImpl = {
  maxPoints: t => (t as CorridorTask).points,
  begin(c) { c.setStage('open', (c.task as CorridorTask).seconds); },
  advance(c) { c.setStage('locked', null); },
  submit(c, pid, payload) {
    if (c.round.stage !== 'open') return err('closed');
    const low = parseNumber(payload?.low), high = parseNumber(payload?.high);
    if (low === null || high === null || Math.abs(low) > 1e15 || Math.abs(high) > 1e15) return err('invalid');
    if (low > high) return err('low_gt_high');
    const cur = c.round.pm[pid];
    if (cur) return cur.low === low && cur.high === high ? { ok: true, dup: true } : err('already_submitted');
    c.round.pm[pid] = { low, high }; return OK;
  },
  answered: (c, pid) => c.round.pm[pid]?.low !== undefined,
  complete: c => c.round.stage === 'open' && c.players.length > 0 && c.players.every(p => c.round.pm[p.id]?.low !== undefined),
  score(c) {
    const t = c.task as CorridorTask;
    const rows = c.players.map(p => { const pm = c.round.pm[p.id]; if (!pm) return { pid: p.id, low: null, high: null, hit: false, width: null, points: 0 }; const r = corridorPoints(pm.low, pm.high, t.answer, t.points); return { pid: p.id, low: pm.low, high: pm.high, hit: r.hit, width: r.width, points: r.points }; });
    return { entries: rows.filter(r => r.low !== null).map(r => ({ pid: r.pid, delta: r.points, label: r.hit ? `Treffer im Korridor (Breite ${r.width})` : 'Lösung nicht im Korridor' })),
      reveal: { answer: t.answer, unit: t.unit, explain: t.explain, points: t.points, rows: rows.slice().sort((a, b) => b.points - a.points) } };
  },
  view(c, a) {
    const t = c.task as CorridorTask;
    const base: any = { prompt: t.prompt, unit: t.unit, points: t.points, answeredCount: c.players.filter(p => c.round.pm[p.id]?.low !== undefined).length, playerCount: c.players.length };
    if (a.role === 'player' && a.pid) base.mine = c.round.pm[a.pid] ?? null;
    if (a.role === 'host') base.solution = `${t.answer} ${t.unit}`;
    return base;
  },
};

// =====================================================================
// VERDREHTE WELT
// =====================================================================
const twist: ModeImpl = {
  maxPoints: t => (t as TwistTask).points,
  begin(c) { c.round.m = {}; c.setStage('open', (c.task as TwistTask).seconds); },
  advance(c) { c.setStage('locked', null); },
  submit(c, pid, payload) {
    const t = c.task as TwistTask; if (c.round.stage !== 'open') return err('closed');
    const answer = String(payload?.answer ?? '').trim().replace(/\s+/g, ' ').slice(0, 80); if (!answer) return err('invalid');
    const cur = c.round.pm[pid]; if (cur) return cur.answer === answer ? { ok: true, dup: true } : err('already_submitted');
    const ok = linkMatch(answer, t.answer, t.accept) !== 'none';
    c.round.pm[pid] = { answer, ok, ms: c.now - c.round.stageStartedAt }; return OK;
  },
  answered: (c, pid) => !!c.round.pm[pid]?.answer,
  complete: c => c.round.stage === 'open' && c.players.length > 0 && c.players.every(p => !!c.round.pm[p.id]?.answer),
  score(c) {
    const t = c.task as TwistTask;
    const rows = c.players.map(p => { const pm = c.round.pm[p.id]; const pts = pm?.ok ? twistPoints(t.points, pm.ms, t.seconds) : 0; return { pid: p.id, answer: pm?.answer ?? null, correct: !!pm?.ok, points: pts }; });
    return { entries: rows.filter(r => r.answer).map(r => ({ pid: r.pid, delta: r.points, label: r.correct ? 'Original erkannt' : 'falsch' })), reveal: { answer: t.answer, twisted: t.twisted, explain: t.explain, points: t.points, rows: rows.slice().sort((a, b) => b.points - a.points) } };
  },
  view(c, a) {
    const t = c.task as TwistTask;
    const base: any = { prompt: t.prompt, twisted: t.twisted, points: t.points, answeredCount: c.players.filter(p => !!c.round.pm[p.id]?.answer).length, playerCount: c.players.length };
    if (a.role === 'player' && a.pid) base.mine = c.round.pm[a.pid] ? { answer: c.round.pm[a.pid].answer } : null;
    if (a.role === 'host') base.solution = t.answer;
    return base;
  },
};

export const NEW_MODES = { bluff, corridor, twist };
void nm;
