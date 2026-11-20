// Sieben weitere Spiele: PIXELPANIK, DUELL DER DEPPEN, DIE ARENA, TONSPUR, ZEITSPRUNG, PANIK / HOT WIRE, HOCHSTAPLER.
// Der Server ist maßgeblich für Timer, Rollen, Antworten und Wertung; Lösungen/Geheimnisse gehen erst zum richtigen Zeitpunkt an die richtigen Geräte.
import { createHash } from 'node:crypto';
import type { PixelTask, DuelTask, ArenaTask, SoundTask, TimelineTask, PanicTask, ImpostorTask } from '../shared/types';
import { linkMatch, PIXEL_POINTS, SOUND_POINTS, DUEL_WIN, DUEL_DRAW, DUEL_PREDICT, ARENA_STEP, ARENA_BONUS, timelineSlot, timelinePoints, PANIC_PER_PLAYER, PANIC_FAST_BONUS, IMPOSTOR_SURVIVE, IMPOSTOR_GUESS, IMPOSTOR_CATCH } from '../shared/scoring';
import { normText } from '../shared/util';
import type { Ctx, ModeImpl, SubmitResult, Draft } from './modes';
import type { Room, RoundState } from './model';

const err = (e: string): SubmitResult => ({ ok: false, err: e });
const OK: SubmitResult = { ok: true };
const nm = (c: Ctx, pid: string) => c.players.find(p => p.id === pid)?.name ?? '?';
const shuffle = <T,>(a: T[]): T[] => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const isPlayer = (c: Ctx, pid: string) => c.players.some(p => p.id === pid);

/** Unratbarer Zugriffsschlüssel für Medien (Bilder/Audio): steckt nur in den Ansichten von TV und Showmaster, nie in Handy-Ansichten. */
export const mediaToken = (room: Room, r: RoundState) => createHash('sha256').update(`${room.code}:${room.seed}:${r.tileId}#${r.taskIndex}#${r.attempt}`).digest('hex').slice(0, 20);

/** Faire Rotation für Sonderrollen (Duellanten, Entschärfer, Hochstapler): wer bisher am seltensten dran war, kommt zuerst. */
function rotPick(c: Ctx, kind: string, n: number): string[] {
  const rot = ((c.room as any).rot ??= {}) as Record<string, Record<string, number>>; const cnt = (rot[kind] ??= {});
  const order = shuffle(c.players.map(p => p.id)).sort((a, b) => (cnt[a] ?? 0) - (cnt[b] ?? 0));
  return order.slice(0, Math.min(n, order.length));
}
function assignedOr(c: Ctx, kind: string, n: number): string[] {
  const valid = (a?: string[]) => !!a && a.length === Math.min(n, c.players.length) && a.every(id => isPlayer(c, id)) && new Set(a).size === a.length;
  const m = (c.round.m ??= {});
  if (valid(m.assigned)) return m.assigned;
  if (!valid(m.proposed)) m.proposed = rotPick(c, kind, n);        // einmal festlegen, damit der Vorschlag im Showmaster-Pult nicht flackert
  return m.proposed;
}
const countRot = (c: Ctx, kind: string, pids: string[]) => { const rot = ((c.room as any).rot ??= {}) as Record<string, Record<string, number>>; const cnt = (rot[kind] ??= {}); for (const id of pids) cnt[id] = (cnt[id] ?? 0) + 1; };
const answerText = (v: unknown, max = 80) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

// =====================================================================
// PIXELPANIK
// =====================================================================
const pixel: ModeImpl = {
  maxPoints: () => PIXEL_POINTS[0],
  begin(c) { c.round.m = { ...(c.round.m ?? {}), level: 0 }; c.setStage('open', (c.task as PixelTask).levelSeconds); },
  advance(c) {
    const t = c.task as PixelTask; const lvl = c.round.m.level as number;
    if (c.round.stage === 'open' && lvl < 4) { c.round.m.level = lvl + 1; c.setStage('open', t.levelSeconds); return; }
    c.setStage('locked', null);
  },
  submit(c, pid, payload) {
    if (c.round.stage !== 'open') return err('closed');
    const a = answerText(payload?.answer); if (!normText(a)) return err('invalid');
    const cur = c.round.pm[pid]; if (cur) return cur.answer === a ? { ok: true, dup: true } : err('already_submitted');
    c.round.pm[pid] = { answer: a, level: c.round.m.level as number }; return OK;
  },
  answered: (c, pid) => !!c.round.pm[pid]?.answer,
  complete: c => c.round.stage === 'open' && c.players.length > 0 && c.players.every(p => !!c.round.pm[p.id]?.answer),
  score(c) {
    const t = c.task as PixelTask;
    const rows = c.players.map(p => { const pm = c.round.pm[p.id]; const ok = !!pm && linkMatch(pm.answer, t.answer, t.accept) !== 'none'; return { pid: p.id, answer: pm?.answer ?? null, level: pm?.level ?? null, correct: ok, points: ok ? PIXEL_POINTS[pm.level] : 0 }; });
    return { entries: rows.filter(r => r.answer).map(r => ({ pid: r.pid, delta: r.points, label: r.correct ? `Erkannt auf Stufe ${r.level + 1}` : 'Falsch' })), reveal: { answer: t.answer, explain: t.explain, rows, points: PIXEL_POINTS, media: mediaToken(c.room, c.round), clearLevel: 4 } };
  },
  view(c, a) {
    const t = c.task as PixelTask; const lvl = c.round.m.level as number;
    const base: any = { prompt: t.prompt, level: lvl, levels: 5, points: PIXEL_POINTS, levelSeconds: t.levelSeconds, answeredCount: c.players.filter(p => !!c.round.pm[p.id]?.answer).length, playerCount: c.players.length };
    if (a.role !== 'player') base.media = mediaToken(c.room, c.round);       // Bild nur für TV/Showmaster – die Handys bekommen es nie
    if (a.role === 'player' && a.pid) base.mine = c.round.pm[a.pid] ? { answer: c.round.pm[a.pid].answer, level: c.round.pm[a.pid].level } : null;
    if (a.role === 'host') base.solution = t.answer;
    return base;
  },
};

// =====================================================================
// DUELL DER DEPPEN
// =====================================================================
const PREDICT_SECONDS = 20;
const duel: ModeImpl = {
  maxPoints: () => DUEL_WIN + DUEL_PREDICT,
  propose: c => ({ kind: 'duel', need: 2, pids: assignedOr(c, 'duel', 2) }),
  begin(c) {
    const d = assignedOr(c, 'duel', 2); countRot(c, 'duel', d); c.round.m = { duelists: d, q: 0, phase: 'predict' };
    if (c.players.length <= 2) { c.round.m.phase = 'duel'; c.setStage('bet', (c.task as DuelTask).seconds); } else c.setStage('open', PREDICT_SECONDS);
  },
  advance(c) {
    const t = c.task as DuelTask; const m = c.round.m;
    if (c.round.stage === 'open') { m.phase = 'duel'; m.q = 0; c.setStage('bet', t.seconds); return; }
    if (c.round.stage === 'bet') { if (m.q < 2) { m.q++; c.setStage('bet', t.seconds); } else c.setStage('locked', null); return; }
    c.setStage('locked', null);
  },
  submit(c, pid, payload) {
    const m = c.round.m; const t = c.task as DuelTask; const pm = (c.round.pm[pid] ??= { ans: [] as (number | null)[] });
    if (c.round.stage === 'open') {
      if (m.duelists.includes(pid)) return err('duelist');
      const w = String(payload?.winner ?? ''); if (!m.duelists.includes(w)) return err('invalid_target');
      if (pm.pick) return pm.pick === w ? { ok: true, dup: true } : err('already_submitted'); pm.pick = w; return OK;
    }
    if (c.round.stage === 'bet') {
      if (!m.duelists.includes(pid)) return err('spectator');
      const a = Number(payload?.answer); if (!Number.isInteger(a) || a < 0 || a > 3) return err('invalid');
      const q = m.q as number; if (pm.ans[q] !== undefined && pm.ans[q] !== null) return pm.ans[q] === a ? { ok: true, dup: true } : err('already_submitted'); pm.ans[q] = a; void t; return OK;
    }
    return err('closed');
  },
  answered(c, pid) { const m = c.round.m; if (c.round.stage === 'open') return m.duelists.includes(pid) || !!c.round.pm[pid]?.pick; if (!m.duelists.includes(pid)) return true; const a = c.round.pm[pid]?.ans?.[m.q]; return a !== undefined && a !== null; },
  complete(c) { const m = c.round.m; if (c.round.stage === 'open') return c.players.filter(p => !m.duelists.includes(p.id)).every(p => !!c.round.pm[p.id]?.pick); if (c.round.stage === 'bet') return m.duelists.every((d: string) => { const a = c.round.pm[d]?.ans?.[m.q]; return a !== undefined && a !== null; }); return false; },
  score(c) {
    const t = c.task as DuelTask; const m = c.round.m; const [a, b]: string[] = m.duelists ?? [];
    const right = (pid: string) => t.questions.filter((q, i) => c.round.pm[pid]?.ans?.[i] === q.correct).length;
    const ra = right(a), rb = right(b); const winner = ra > rb ? a : rb > ra ? b : null;
    const entries: Draft[] = [];
    for (const [pid, r] of [[a, ra], [b, rb]] as [string, number][]) entries.push({ pid, delta: winner === null ? DUEL_DRAW : winner === pid ? DUEL_WIN : 0, label: winner === null ? 'Unentschieden' : winner === pid ? 'Duell gewonnen' : 'Duell verloren' }), void r;
    const picks = c.players.filter(p => !m.duelists.includes(p.id)).map(p => ({ pid: p.id, pick: c.round.pm[p.id]?.pick ?? null, correct: winner !== null && c.round.pm[p.id]?.pick === winner }));
    for (const p of picks) if (p.correct) entries.push({ pid: p.pid, delta: DUEL_PREDICT, label: 'Siegerprognose richtig' });
    return { entries, reveal: { explain: t.explain, duelists: [a, b], scores: { [a]: ra, [b]: rb }, winner, picks, questions: t.questions.map((q, i) => ({ q: q.q, options: q.options, correct: q.correct, answers: { [a]: c.round.pm[a]?.ans?.[i] ?? null, [b]: c.round.pm[b]?.ans?.[i] ?? null } })), win: DUEL_WIN, draw: DUEL_DRAW, predict: DUEL_PREDICT } };
  },
  view(c, a) {
    const t = c.task as DuelTask; const m = c.round.m ?? {}; const st = c.round.stage;
    const base: any = { prompt: t.prompt, duelists: m.duelists ?? [], phase: m.phase, q: m.q ?? 0, qCount: 3, win: DUEL_WIN, draw: DUEL_DRAW, predict: DUEL_PREDICT, playerCount: c.players.length,
      predictedCount: c.players.filter(p => !(m.duelists ?? []).includes(p.id) && !!c.round.pm[p.id]?.pick).length };
    if (st === 'bet' || st === 'locked') { const q = t.questions[Math.min(m.q ?? 0, 2)]; base.question = { q: q.q, options: q.options }; base.answeredNow = (m.duelists ?? []).filter((d: string) => { const x = c.round.pm[d]?.ans?.[m.q]; return x !== undefined && x !== null; }); }
    if (a.role === 'player' && a.pid) { base.role = (m.duelists ?? []).includes(a.pid) ? 'duelist' : 'spectator'; base.mine = { pick: c.round.pm[a.pid]?.pick ?? null, ans: c.round.pm[a.pid]?.ans ?? [] }; }
    if (a.role === 'host') base.solution = t.questions.map(q => q.options[q.correct]).join(' · ');
    return base;
  },
};

// =====================================================================
// DIE ARENA
// =====================================================================
const SHOW_SECONDS = 8;
const arena: ModeImpl = {
  maxPoints: () => ARENA_STEP * 3 + ARENA_BONUS,
  begin(c) { c.round.m = { q: 0, phase: 'ask', alive: c.players.map(p => p.id), results: [] as any[], survived: Object.fromEntries(c.players.map(p => [p.id, 0])) }; c.setStage('open', (c.task as ArenaTask).seconds); },
  advance(c) {
    const t = c.task as ArenaTask; const m = c.round.m;
    if (c.round.stage === 'open' && m.phase === 'ask') {
      const q = m.q as number; const right = t.questions[q].correct;
      const ok: string[] = [], out: string[] = [];
      for (const id of m.alive as string[]) { if (c.round.pm[id]?.ans?.[q] === right) { ok.push(id); m.survived[id] = (m.survived[id] ?? 0) + 1; } else out.push(id); }
      m.results[q] = { survivors: ok, eliminated: out, correct: right }; m.alive = ok; m.phase = 'show'; c.setStage('bet', SHOW_SECONDS); return;
    }
    if (c.round.stage === 'bet') {
      if (m.q < 2 && m.alive.length > 0) { m.q++; m.phase = 'ask'; c.setStage('open', t.seconds); } else c.setStage('locked', null);
      return;
    }
    c.setStage('locked', null);
  },
  submit(c, pid, payload) {
    const m = c.round.m; if (c.round.stage !== 'open' || m.phase !== 'ask') return err('closed');
    if (!(m.alive as string[]).includes(pid)) return err('eliminated');
    const a = Number(payload?.answer); if (!Number.isInteger(a) || a < 0 || a > 3) return err('invalid');
    const pm = (c.round.pm[pid] ??= { ans: [] as number[] }); const cur = pm.ans[m.q];
    if (cur !== undefined) return cur === a ? { ok: true, dup: true } : err('already_submitted'); pm.ans[m.q] = a; return OK;
  },
  answered(c, pid) { const m = c.round.m; if (!m || !(m.alive as string[]).includes(pid)) return true; return c.round.pm[pid]?.ans?.[m.q] !== undefined; },
  complete(c) { const m = c.round.m; return c.round.stage === 'open' && m.phase === 'ask' && (m.alive as string[]).length > 0 && (m.alive as string[]).every(id => c.round.pm[id]?.ans?.[m.q] !== undefined); },
  score(c) {
    const t = c.task as ArenaTask; const m = c.round.m;
    const rows = c.players.map(p => { const s = (m.survived[p.id] ?? 0) as number; return { pid: p.id, survived: s, points: s * ARENA_STEP + (s === 3 ? ARENA_BONUS : 0) }; });
    return { entries: rows.filter(r => r.points > 0 || true).map(r => ({ pid: r.pid, delta: r.points, label: r.survived === 3 ? 'Arena komplett überlebt!' : `${r.survived} von 3 Herausforderungen überlebt` })),
      reveal: { explain: t.explain, rows, step: ARENA_STEP, bonus: ARENA_BONUS, results: m.results, questions: t.questions.map((q, i) => ({ q: q.q, options: q.options, correct: q.correct, answers: Object.fromEntries(c.players.map(p => [p.id, c.round.pm[p.id]?.ans?.[i] ?? null])) })) } };
  },
  view(c, a) {
    const t = c.task as ArenaTask; const m = c.round.m ?? { q: 0, phase: 'ask', alive: [], results: [] }; const st = c.round.stage;
    const base: any = { prompt: t.prompt, q: m.q, qCount: 3, phase: m.phase, alive: m.alive, results: m.results, step: ARENA_STEP, bonus: ARENA_BONUS, playerCount: c.players.length,
      answeredCount: (m.alive as string[]).filter(id => c.round.pm[id]?.ans?.[m.q] !== undefined).length, aliveCount: (m.alive as string[]).length };
    if (st === 'open' || st === 'bet' || st === 'locked') { const q = t.questions[Math.min(m.q, 2)]; base.question = { q: q.q, options: q.options }; }
    if (a.role === 'player' && a.pid) base.mine = { alive: (m.alive as string[]).includes(a.pid), ans: c.round.pm[a.pid]?.ans?.[m.q] ?? null, survived: m.survived?.[a.pid] ?? 0 };
    if (a.role === 'host') base.solution = t.questions[Math.min(m.q, 2)].options[t.questions[Math.min(m.q, 2)].correct];
    return base;
  },
};

// =====================================================================
// TONSPUR
// =====================================================================
const sound: ModeImpl = {
  maxPoints: () => SOUND_POINTS[0],
  begin(c) { c.round.m = { phase: 0, plays: 1 }; c.setStage('open', (c.task as SoundTask).playSeconds); },
  advance(c) {
    const t = c.task as SoundTask; const m = c.round.m;
    if (c.round.stage === 'open' && m.phase < 2) { m.phase++; if (m.phase === 1) m.plays++; c.setStage('open', t.playSeconds); return; }
    c.setStage('locked', null);
  },
  submit(c, pid, payload) {
    if (c.round.stage !== 'open') return err('closed');
    const a = answerText(payload?.answer); if (!normText(a)) return err('invalid');
    const cur = c.round.pm[pid]; if (cur) return cur.answer === a ? { ok: true, dup: true } : err('already_submitted');
    c.round.pm[pid] = { answer: a, phase: c.round.m.phase }; return OK;
  },
  answered: (c, pid) => !!c.round.pm[pid]?.answer,
  complete: c => c.round.stage === 'open' && c.players.length > 0 && c.players.every(p => !!c.round.pm[p.id]?.answer),
  score(c) {
    const t = c.task as SoundTask;
    const rows = c.players.map(p => { const pm = c.round.pm[p.id]; const ok = !!pm && linkMatch(pm.answer, t.answer, t.accept) !== 'none'; return { pid: p.id, answer: pm?.answer ?? null, phase: pm?.phase ?? null, correct: ok, points: ok ? SOUND_POINTS[pm.phase] : 0 }; });
    return { entries: rows.filter(r => r.answer).map(r => ({ pid: r.pid, delta: r.points, label: r.correct ? ['Beim ersten Hören erkannt', 'Beim zweiten Hören erkannt', 'Mit Hinweis erkannt'][r.phase] : 'Falsch' })), reveal: { answer: t.answer, explain: t.explain, rows, points: SOUND_POINTS, media: mediaToken(c.room, c.round), hasSecond: !!t.audio2 } };
  },
  view(c, a) {
    const t = c.task as SoundTask; const m = c.round.m;
    const base: any = { prompt: t.prompt, phase: m.phase, plays: m.plays, points: SOUND_POINTS, hint: m.phase >= 2 ? t.hint : null, hasSecond: !!t.audio2, playSeconds: t.playSeconds, answeredCount: c.players.filter(p => !!c.round.pm[p.id]?.answer).length, playerCount: c.players.length };
    if (a.role !== 'player') base.media = mediaToken(c.room, c.round);       // Audio nur für TV/Showmaster
    if (a.role === 'player' && a.pid) base.mine = c.round.pm[a.pid] ? { answer: c.round.pm[a.pid].answer, phase: c.round.pm[a.pid].phase } : null;
    if (a.role === 'host') base.solution = t.answer;
    return base;
  },
};

// =====================================================================
// ZEITSPRUNG
// =====================================================================
const slotOf = (t: TimelineTask) => timelineSlot(t.anchors.map(a => a.year), t.answerYear);
const timeline: ModeImpl = {
  maxPoints: () => 250,
  begin(c) { c.setStage('open', (c.task as TimelineTask).seconds); },
  advance(c) { c.setStage('locked', null); },
  submit(c, pid, payload) {
    if (c.round.stage !== 'open') return err('closed');
    const s = Number(payload?.slot); if (!Number.isInteger(s) || s < 0 || s > 4) return err('invalid');
    const cur = c.round.pm[pid]; if (cur) return cur.slot === s ? { ok: true, dup: true } : err('already_submitted'); c.round.pm[pid] = { slot: s }; return OK;
  },
  answered: (c, pid) => c.round.pm[pid]?.slot !== undefined,
  complete: c => c.round.stage === 'open' && c.players.length > 0 && c.players.every(p => c.round.pm[p.id]?.slot !== undefined),
  score(c) {
    const t = c.task as TimelineTask; const correct = slotOf(t);
    const rows = c.players.map(p => { const s = c.round.pm[p.id]?.slot; return { pid: p.id, slot: s ?? null, points: s === undefined ? 0 : timelinePoints(s, correct) }; });
    return { entries: rows.filter(r => r.slot !== null).map(r => ({ pid: r.pid, delta: r.points, label: r.slot === correct ? 'Richtiges Zeitfeld' : r.points ? 'Direkt daneben' : 'Falsches Zeitfeld' })), reveal: { explain: t.explain, anchors: t.anchors, answerYear: t.answerYear, answerLabel: t.answerLabel, correct, rows } };
  },
  view(c, a) {
    const t = c.task as TimelineTask;
    const base: any = { prompt: t.prompt, anchors: t.anchors, answeredCount: c.players.filter(p => c.round.pm[p.id]?.slot !== undefined).length, playerCount: c.players.length };
    if (a.role === 'player' && a.pid) base.mine = c.round.pm[a.pid] ?? null;
    if (a.role === 'host') base.solution = `${t.answerYear} (Feld ${slotOf(t) + 1})`;
    return base;
  },
};

// =====================================================================
// PANIK / HOT WIRE (kooperativ)
// =====================================================================
const MAX_ATTEMPTS = 3;
const panic: ModeImpl = {
  maxPoints: () => PANIC_PER_PLAYER + PANIC_FAST_BONUS,
  propose: c => ({ kind: 'defuser', need: 1, pids: assignedOr(c, 'panic', 1) }),
  begin(c) {
    const t = c.task as PanicTask; const [defuser] = assignedOr(c, 'panic', 1); countRot(c, 'panic', [defuser]);
    const helpers = c.players.map(p => p.id).filter(id => id !== defuser); const holders = helpers.length ? helpers : [defuser];
    const deal: Record<string, number[]> = Object.fromEntries(holders.map(h => [h, [] as number[]]));
    shuffle(t.clues.map((_, i) => i)).forEach((ci, k) => deal[holders[k % holders.length]].push(ci));
    for (const h of holders) deal[h].sort((a, b) => a - b);
    c.round.m = { defuser, deal, attempts: 0, solved: false, left: null, wrong: [] as string[] };
    c.setStage('open', t.seconds);
  },
  advance(c) { c.setStage('locked', null); },
  submit(c, pid, payload) {
    const t = c.task as PanicTask; const m = c.round.m;
    if (c.round.stage !== 'open') return err('closed');
    if (pid !== m.defuser) return err('not_defuser');
    if (m.solved || m.attempts >= MAX_ATTEMPTS) return err('closed');
    const code = String(payload?.code ?? '').replace(/\D/g, ''); if (code.length !== 3) return err('invalid');
    m.attempts++;
    if (code === t.code) { m.solved = true; m.left = c.round.deadline !== null ? Math.max(0, c.round.deadline - c.now) : (c.round.pausedLeft ?? 0); return { ok: true, info: { correct: true } }; }
    m.wrong.push(code); return { ok: true, info: { correct: false, left: MAX_ATTEMPTS - m.attempts } };
  },
  answered: () => true,
  complete(c) { const m = c.round.m; return c.round.stage === 'open' && !!m && (m.solved || m.attempts >= MAX_ATTEMPTS); },
  score(c) {
    const t = c.task as PanicTask; const m = c.round.m; const fast = m.solved && m.left !== null && m.left >= t.seconds * 500;
    const per = m.solved ? PANIC_PER_PLAYER + (fast ? PANIC_FAST_BONUS : 0) : 0;
    return { entries: c.players.map(p => ({ pid: p.id, delta: per, label: m.solved ? (fast ? 'Entschärft – blitzschnell!' : 'Entschärft!') : 'Nicht entschärft' })),
      reveal: { explain: t.explain, solved: m.solved, fast, code: t.code, defuser: m.defuser, attempts: m.attempts, wrong: m.wrong, clues: t.clues.map((text, i) => ({ text, holder: Object.entries(m.deal as Record<string, number[]>).find(([, l]) => l.includes(i))?.[0] ?? null })), points: PANIC_PER_PLAYER, bonus: PANIC_FAST_BONUS, perPlayer: per } };
  },
  view(c, a) {
    const t = c.task as PanicTask; const m = c.round.m ?? {};
    const base: any = { prompt: t.prompt, defuser: m.defuser, attempts: m.attempts ?? 0, maxAttempts: MAX_ATTEMPTS, solved: !!m.solved, clueCount: t.clues.length, points: PANIC_PER_PLAYER, bonus: PANIC_FAST_BONUS, wrongCount: (m.wrong ?? []).length, holders: Object.keys(m.deal ?? {}) };
    if (a.role === 'player' && a.pid) {
      base.role = a.pid === m.defuser ? 'defuser' : 'helper';
      base.myClues = (m.deal?.[a.pid] ?? []).map((i: number) => ({ no: i + 1, text: t.clues[i] }));       // nur die eigenen Hinweise
      if (a.pid === m.defuser) base.wrong = m.wrong ?? [];
    }
    if (a.role === 'host') { base.solution = t.code; base.allClues = t.clues.map((text, i) => ({ no: i + 1, text, holder: Object.entries(m.deal as Record<string, number[]>).find(([, l]) => l.includes(i))?.[0] })); }
    return base;
  },
};

// =====================================================================
// HOCHSTAPLER
// =====================================================================
const impostor: ModeImpl = {
  maxPoints: () => IMPOSTOR_SURVIVE + IMPOSTOR_CATCH,
  propose: c => ({ kind: 'impostor', need: 1, pids: assignedOr(c, 'impostor', 1) }),
  begin(c) { const [imp] = assignedOr(c, 'impostor', 1); countRot(c, 'impostor', [imp]); c.round.m = { impostor: imp, phase: 'clue' }; c.setStage('open', (c.task as ImpostorTask).seconds); },
  advance(c) {
    const t = c.task as ImpostorTask; const m = c.round.m;
    if (c.round.stage === 'open') { m.phase = 'vote'; c.setStage('bet', t.voteSeconds); return; }
    c.setStage('locked', null);
  },
  submit(c, pid, payload) {
    const t = c.task as ImpostorTask; const m = c.round.m; const pm = (c.round.pm[pid] ??= {});
    if (c.round.stage === 'open') {
      const w = answerText(payload?.clue, 24); if (!normText(w)) return err('invalid');
      if (pid !== m.impostor && [t.word, ...t.accept].some(x => normText(x) === normText(w))) return err('is_word');       // das geheime Wort selbst ist kein Hinweis
      if (pm.clue) return pm.clue === w ? { ok: true, dup: true } : err('already_submitted'); pm.clue = w; return OK;
    }
    if (c.round.stage === 'bet') {
      if (payload?.guess !== undefined) {
        if (pid !== m.impostor) return err('not_impostor');
        const g = answerText(payload.guess, 40); if (!normText(g)) return err('invalid'); pm.guess = g; if (payload?.vote === undefined) return OK;
      }
      const v = String(payload?.vote ?? ''); if (!isPlayer(c, v) || v === pid) return err('invalid_target');
      if (pm.vote) return pm.vote === v ? { ok: true, dup: true } : err('already_submitted'); pm.vote = v; return OK;
    }
    return err('closed');
  },
  answered: (c, pid) => (c.round.stage === 'bet' || c.round.stage === 'locked' ? !!c.round.pm[pid]?.vote : !!c.round.pm[pid]?.clue),
  complete(c) { if (c.round.stage === 'open') return c.players.every(p => !!c.round.pm[p.id]?.clue); if (c.round.stage === 'bet') return c.players.every(p => !!c.round.pm[p.id]?.vote); return false; },
  score(c) {
    const t = c.task as ImpostorTask; const m = c.round.m; const imp: string = m.impostor;
    const votes: Record<string, string[]> = {}; for (const p of c.players) { const v = c.round.pm[p.id]?.vote; if (v) (votes[v] ??= []).push(p.id); }
    const top = Math.max(0, ...Object.values(votes).map(v => v.length)); const leaders = Object.entries(votes).filter(([, v]) => v.length === top && top > 0).map(([k]) => k);
    const caught = leaders.length === 1 && leaders[0] === imp;
    const g = c.round.pm[imp]?.guess; const guessed = !!g && [t.word, ...t.accept].some(x => normText(x) === normText(g));
    const entries: Draft[] = [];
    if (!caught) entries.push({ pid: imp, delta: IMPOSTOR_SURVIVE, label: 'Nicht enttarnt – Hochstapler-Meisterstück!' });
    else if (guessed) entries.push({ pid: imp, delta: IMPOSTOR_GUESS, label: 'Enttarnt, aber das Wort erraten' });
    for (const id of votes[imp] ?? []) entries.push({ pid: id, delta: IMPOSTOR_CATCH, label: 'Hochstapler erkannt' });
    return { entries, reveal: { explain: t.explain, impostor: imp, word: t.word, topic: t.prompt, caught, guess: g ?? null, guessed, votes, clues: c.players.map(p => ({ pid: p.id, clue: c.round.pm[p.id]?.clue ?? null })), survive: IMPOSTOR_SURVIVE, guessPts: IMPOSTOR_GUESS, catchPts: IMPOSTOR_CATCH } };
  },
  view(c, a) {
    const t = c.task as ImpostorTask; const m = c.round.m ?? {}; const st = c.round.stage;
    const base: any = { topic: t.prompt, phase: m.phase, survive: IMPOSTOR_SURVIVE, catchPts: IMPOSTOR_CATCH, guessPts: IMPOSTOR_GUESS, clueCount: c.players.filter(p => !!c.round.pm[p.id]?.clue).length, voteCount: c.players.filter(p => !!c.round.pm[p.id]?.vote).length, playerCount: c.players.length };
    if (st === 'bet' || st === 'locked') base.clues = c.players.map(p => ({ pid: p.id, clue: c.round.pm[p.id]?.clue ?? '–' }));       // erst in der Abstimmung sichtbar
    if (a.role === 'player' && a.pid) { const imp = a.pid === m.impostor; base.role = imp ? 'impostor' : 'crew'; if (!imp) base.word = t.word; base.mine = { clue: c.round.pm[a.pid]?.clue ?? null, vote: c.round.pm[a.pid]?.vote ?? null, guess: c.round.pm[a.pid]?.guess ?? null }; }
    if (a.role === 'host') { base.solution = `${t.word} · Hochstapler: ${nm(c, m.impostor)}`; base.word = t.word; base.impostor = m.impostor; }
    return base;
  },
};

export const NEW_MODES2 = { pixel, duel, arena, sound, timeline, panic, impostor };
