// Die sechs Spielmodi: Eingabe-Validierung, Stage-Übergänge, Wertung, Sichten.
import type { Stage, TaskDef, GeoTask, RankTask, EstimateTask, GlitchTask, CodeTask, UniqueTask, GlitchZone } from '../shared/types';
import type { PlayerRec, Room, RoundState } from './model';
import {
  scoreGeo, scoreRank, scoreEstimate, scoreGlitch, scoreCode, codeMatches, groupUnique, scoreUnique, rankPairs,
} from '../shared/scoring';
import { SCENES, diffZones } from '../shared/scenes';
import { parseNumber } from '../shared/util';

export interface Ctx {
  room: Room;
  round: RoundState;
  task: TaskDef;
  now: number;
  players: PlayerRec[]; // aktive Spieler
  setStage(stage: Stage, seconds: number | null): void;
}
export type Audience = { role: 'tv' | 'host' | 'player'; pid?: string };
export type SubmitResult = { ok: true; dup?: boolean; info?: any } | { ok: false; err: string };
export interface Draft { pid: string; delta: number; label: string }

export interface ModeImpl {
  begin(c: Ctx): void;
  /** Nächster Schritt, wenn Zeit abgelaufen / Host sperrt / alle fertig. */
  advance(c: Ctx): void;
  submit(c: Ctx, pid: string, payload: any): SubmitResult;
  hint?(c: Ctx, pid: string): SubmitResult;
  answered(c: Ctx, pid: string): boolean;
  score(c: Ctx): { entries: Draft[]; reveal: any };
  view(c: Ctx, a: Audience): any;
  /** Budget der Aufgabe (Maximalpunkte) */
  maxPoints(t: TaskDef): number;
  /** wird auf allen Spielern erwartet, damit "alle fertig" gilt */
  complete?(c: Ctx): boolean;
}

const err = (e: string): SubmitResult => ({ ok: false, err: e });
const OK: SubmitResult = { ok: true };
const sameJson = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const nm = (c: Ctx, pid: string) => c.players.find(p => p.id === pid)?.name ?? '?';
const balanceOf = (c: Ctx, pid: string) => c.room.players.find(p => p.id === pid)?.score ?? 0;

// =====================================================================
// GEO
// =====================================================================
const geo: ModeImpl = {
  maxPoints: t => (t as GeoTask).points,
  begin(c) { c.setStage('open', (c.task as GeoTask).seconds); },
  advance(c) { c.setStage('locked', null); },
  submit(c, pid, payload) {
    if (c.round.stage !== 'open') return err('closed');
    const lat = Number(payload?.lat), lon = Number(payload?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return err('invalid');
    const cur = c.round.pm[pid];
    const val = { lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lon * 1e5) / 1e5 };
    if (cur) return sameJson(cur, val) ? { ok: true, dup: true } : err('already_submitted');
    c.round.pm[pid] = val;
    return OK;
  },
  answered: (c, pid) => !!c.round.pm[pid],
  score(c) {
    const t = c.task as GeoTask;
    const res = scoreGeo(c.round.pm, t.answer, t.points, c.players.length);
    const entries: Draft[] = Object.entries(res).map(([pid, r]) => ({ pid, delta: r.points, label: `Platz ${r.place} · ${r.km.toLocaleString('de-DE')} km` }));
    return {
      entries,
      reveal: {
        answer: t.answer, explain: t.explain, map: t.map,
        guesses: Object.entries(res).map(([pid, r]) => ({ pid, ...c.round.pm[pid], km: r.km, place: r.place, points: r.points }))
          .sort((a, b) => a.km - b.km),
      },
    };
  },
  view(c, a) {
    const t = c.task as GeoTask;
    const base: any = { prompt: t.prompt, map: t.map };
    if (a.role === 'player' && a.pid) base.mine = c.round.pm[a.pid] ?? null;
    if (c.round.stage === 'locked' || c.round.stage === 'reveal') {
      base.pins = c.players.filter(p => c.round.pm[p.id]).map(p => ({ pid: p.id, ...c.round.pm[p.id] }));
    }
    if (a.role === 'host') base.solution = t.answer.label;
    return base;
  },
};

// =====================================================================
// RANK
// =====================================================================
const rank: ModeImpl = {
  maxPoints: t => (t as RankTask).points,
  begin(c) {
    const t = c.task as RankTask;
    c.round.m = { step: 0 };
    c.setStage('open', t.secondsPerItem);
  },
  advance(c) {
    const t = c.task as RankTask;
    const step = c.round.m.step as number;
    if (step + 1 >= t.order.length) { c.setStage('locked', null); return; }
    c.round.m.step = step + 1;
    c.setStage('open', t.secondsPerItem);
  },
  submit(c, pid, payload) {
    const t = c.task as RankTask;
    const step = Number(payload?.step), slot = Number(payload?.slot);
    if (!Number.isInteger(step) || !Number.isInteger(slot) || slot < 0 || slot >= t.items.length) return err('invalid');
    const pm = (c.round.pm[pid] ??= { slots: new Array(t.items.length).fill(-1) });
    const item = t.order[step];
    if (step < c.round.m.step || c.round.stage !== 'open') {
      // erneuter Versand einer bereits bestätigten Platzierung ist unkritisch
      if (step <= c.round.m.step && pm.slots[slot] === item) return { ok: true, dup: true };
      return err('closed');
    }
    if (step !== c.round.m.step) return err('wrong_step');
    if (pm.slots.includes(item)) return pm.slots[slot] === item ? { ok: true, dup: true } : err('already_submitted');
    if (pm.slots[slot] !== -1) return err('slot_taken');
    pm.slots[slot] = item;
    return OK;
  },
  answered(c, pid) {
    const t = c.task as RankTask;
    const pm = c.round.pm[pid];
    if (!pm) return false;
    if (c.round.stage === 'open') return pm.slots.includes(t.order[c.round.m.step]);
    return pm.slots.some((s: number) => s >= 0);
  },
  complete(c) {
    const t = c.task as RankTask;
    if (c.round.stage !== 'open') return false;
    const item = t.order[c.round.m.step];
    return c.players.length > 0 && c.players.every(p => c.round.pm[p.id]?.slots.includes(item));
  },
  score(c) {
    const t = c.task as RankTask;
    const rows = c.players.map(p => {
      const slots: number[] = c.round.pm[p.id]?.slots ?? new Array(t.items.length).fill(-1);
      const r = scoreRank(c.round.pm[p.id]?.slots, t.points);
      return { pid: p.id, slots, correct: r.correct, total: r.total, points: r.points, placed: slots.filter(s => s >= 0).length };
    });
    return {
      entries: rows.filter(r => r.placed > 0 || r.points > 0).map(r => ({ pid: r.pid, delta: r.points, label: `${r.correct} von ${r.total} Paaren richtig` })),
      reveal: { items: t.items, explain: t.explain, rows, topLabel: t.topLabel, bottomLabel: t.bottomLabel },
    };
  },
  view(c, a) {
    const t = c.task as RankTask;
    const step = c.round.m?.step ?? 0;
    const showItem = c.round.stage === 'open' || c.round.stage === 'locked' || c.round.stage === 'review';
    const base: any = {
      prompt: t.prompt, topLabel: t.topLabel, bottomLabel: t.bottomLabel, slots: t.items.length,
      step, steps: t.order.length,
      item: c.round.stage === 'open' ? t.items[t.order[step]].text : null,
      seen: showItem ? t.order.slice(0, c.round.stage === 'open' ? step : t.order.length).map(i => t.items[i].text) : [],
    };
    if (a.role === 'player' && a.pid) {
      const pm = c.round.pm[a.pid];
      base.mine = (pm?.slots ?? new Array(t.items.length).fill(-1)).map((i: number) => (i >= 0 ? t.items[i].text : null));
      base.itemIndex = t.order[step];
    }
    if (a.role === 'host') base.solution = t.items.map(i => i.text);
    if (a.role === 'tv' && c.round.stage !== 'reveal') {
      // Fortschritt: Platzierungen je Spieler (Anzahl), ohne Inhalte
      base.counts = Object.fromEntries(c.players.map(p => [p.id, (c.round.pm[p.id]?.slots ?? []).filter((s: number) => s >= 0).length]));
    }
    return base;
  },
};

// =====================================================================
// ESTIMATE (SETZ AUF MICH)
// =====================================================================
const estimate: ModeImpl = {
  maxPoints: t => (t as EstimateTask).points + Math.max(...(t as EstimateTask).bets),
  begin(c) { c.setStage('open', (c.task as EstimateTask).seconds); },
  advance(c) {
    const t = c.task as EstimateTask;
    if (c.round.stage === 'open') c.setStage('bet', t.betSeconds);
    else c.setStage('locked', null);
  },
  submit(c, pid, payload) {
    const t = c.task as EstimateTask;
    const pm = (c.round.pm[pid] ??= {});
    if (c.round.stage === 'open') {
      const v = parseNumber(payload?.value);
      if (v === null || Math.abs(v) > 1e15) return err('invalid');
      if (pm.guess !== undefined) return pm.guess === v ? { ok: true, dup: true } : err('already_submitted');
      pm.guess = v;
      return OK;
    }
    if (c.round.stage === 'bet') {
      const amount = Number(payload?.amount);
      const target = String(payload?.target ?? '');
      if (!t.bets.includes(amount)) return err('invalid_bet');
      if (amount > 0) {
        if (amount > Math.max(balanceOf(c, pid), t.minStake ?? 0)) return err('not_enough_points');
        if (c.round.pm[target]?.guess === undefined) return err('invalid_target');
      }
      const val = { amount, target: amount > 0 ? target : null };
      if (pm.bet) return sameJson(pm.bet, val) ? { ok: true, dup: true } : err('already_submitted');
      pm.bet = val;
      return OK;
    }
    return err('closed');
  },
  answered(c, pid) {
    const pm = c.round.pm[pid];
    return c.round.stage === 'bet' ? !!pm?.bet : pm?.guess !== undefined;
  },
  complete(c) {
    return (c.round.stage === 'open' || c.round.stage === 'bet') && c.players.length > 0 && c.players.every(p => estimate.answered(c, p.id));
  },
  score(c) {
    const t = c.task as EstimateTask;
    const guesses: Record<string, number> = {};
    for (const [pid, pm] of Object.entries<any>(c.round.pm)) if (pm.guess !== undefined && c.players.some(p => p.id === pid)) guesses[pid] = pm.guess;
    const res = scoreEstimate(guesses, t.answer, t.points, c.players.length);
    const winners = Object.entries(res).filter(([, r]) => r.best).map(([pid]) => pid);
    const entries: Draft[] = Object.entries(res).map(([pid, r]) => ({ pid, delta: r.points, label: `Schätzung Platz ${r.place}` }));
    const bets: any[] = [];
    for (const p of c.players) {
      const b = c.round.pm[p.id]?.bet;
      if (!b || b.amount <= 0) continue;
      const have = balanceOf(c, p.id) + (res[p.id]?.points ?? 0);
      const won = winners.includes(b.target);
      const delta = won ? b.amount : -Math.min(b.amount, have);
      entries.push({ pid: p.id, delta, label: `${won ? 'Einsatz gewonnen' : 'Einsatz verloren'} (${b.amount} auf ${nm(c, b.target)})` });
      bets.push({ pid: p.id, target: b.target, amount: b.amount, won, delta });
    }
    return {
      entries,
      reveal: {
        answer: t.answer, unit: t.unit, explain: t.explain, winners,
        guesses: Object.entries(res).map(([pid, r]) => ({ pid, value: guesses[pid], place: r.place, points: r.points, best: r.best }))
          .sort((a, b) => a.place - b.place),
        bets,
      },
    };
  },
  view(c, a) {
    const t = c.task as EstimateTask;
    const st = c.round.stage;
    const base: any = { prompt: t.prompt, unit: t.unit, bets: t.bets };
    if (st === 'bet' || st === 'locked' || st === 'review' || st === 'reveal') {
      base.guesses = c.players.filter(p => c.round.pm[p.id]?.guess !== undefined).map(p => ({ pid: p.id, value: c.round.pm[p.id].guess }));
    }
    if (st === 'locked' || st === 'reveal') {
      base.bets_placed = c.players.filter(p => c.round.pm[p.id]?.bet?.amount > 0)
        .map(p => ({ pid: p.id, target: c.round.pm[p.id].bet.target, amount: c.round.pm[p.id].bet.amount }));
    }
    if (a.role === 'player' && a.pid) {
      base.mine = c.round.pm[a.pid] ?? {};
      base.balance = balanceOf(c, a.pid);
      base.allowance = Math.max(base.balance, t.minStake ?? 0);
    }
    if (a.role === 'host') base.solution = `${t.answer} ${t.unit}`;
    return base;
  },
};

// =====================================================================
// GLITCH
// =====================================================================
export function glitchZones(t: GlitchTask): GlitchZone[] {
  if (t.zones) return t.zones;
  const s = SCENES[t.scene];
  return s ? diffZones(s) : [];
}
const glitch: ModeImpl = {
  maxPoints: t => (t as GlitchTask).points,
  begin(c) { c.setStage('view', (c.task as GlitchTask).viewSeconds); },
  advance(c) {
    if (c.round.stage === 'view') c.setStage('open', (c.task as GlitchTask).seconds);
    else c.setStage('locked', null);
  },
  submit(c, pid, payload) {
    if (c.round.stage !== 'open') return err('closed');
    const x = Number(payload?.x), y = Number(payload?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1000 || y < 0 || y > 600) return err('invalid');
    const val = { x: Math.round(x), y: Math.round(y) };
    const cur = c.round.pm[pid];
    if (cur) return sameJson(cur, val) ? { ok: true, dup: true } : err('already_submitted');
    c.round.pm[pid] = val;
    return OK;
  },
  answered: (c, pid) => !!c.round.pm[pid],
  complete(c) { return c.round.stage === 'open' && c.players.length > 0 && c.players.every(p => !!c.round.pm[p.id]); },
  score(c) {
    const t = c.task as GlitchTask;
    const zones = glitchZones(t);
    const rows = c.players.map(p => ({ pid: p.id, tap: c.round.pm[p.id] ?? null, ...scoreGlitch(c.round.pm[p.id], zones, t.points) }));
    return {
      entries: rows.filter(r => r.tap).map(r => ({ pid: r.pid, delta: r.points, label: r.hit ? 'Treffer' : r.points > 0 ? 'Knapp daneben' : 'Daneben' })),
      reveal: { zones, scene: t.scene, explain: t.explain, rows },
    };
  },
  view(c, a) {
    const t = c.task as GlitchTask;
    const st = c.round.stage;
    const base: any = { scene: t.scene, prompt: st === 'view' ? t.viewPrompt : t.prompt, variant: st === 'view' ? 'a' : 'b', hasDiff: !t.zones };
    if (a.role === 'player') {
      // Während der Betrachtungsphase sehen Handys das Bild nicht (nur der TV).
      if (st === 'view') base.scene = null;
      if (a.pid) base.mine = c.round.pm[a.pid] ?? null;
    }
    if (st === 'locked' || st === 'review' || st === 'reveal') {
      base.taps = c.players.filter(p => c.round.pm[p.id]).map(p => ({ pid: p.id, ...c.round.pm[p.id] }));
    }
    if (a.role === 'host') base.zones = glitchZones(t);
    return base;
  },
};

// =====================================================================
// CODEBREAK
// =====================================================================
export const MAX_ATTEMPTS = 3;
const code: ModeImpl = {
  maxPoints: t => (t as CodeTask).points,
  begin(c) { c.setStage('open', (c.task as CodeTask).seconds); },
  advance(c) { c.setStage('locked', null); },
  submit(c, pid, payload) {
    const t = c.task as CodeTask;
    if (c.round.stage !== 'open') return err('closed');
    const answer = String(payload?.answer ?? '').trim().slice(0, 80);
    if (!answer) return err('invalid');
    const pm = (c.round.pm[pid] ??= { hints: 0, attempts: 0, solved: false, wrong: [] as string[] });
    if (pm.solved) return { ok: true, dup: true };
    if (pm.wrong.includes(answer)) return { ok: true, dup: true, info: { correct: false, left: MAX_ATTEMPTS - pm.attempts } };
    if (pm.attempts >= MAX_ATTEMPTS) return err('no_attempts_left');
    if (codeMatches(answer, t.answers)) { pm.solved = true; pm.answer = answer; return { ok: true, info: { correct: true } }; }
    pm.attempts++; pm.wrong.push(answer);
    return { ok: true, info: { correct: false, left: MAX_ATTEMPTS - pm.attempts } };
  },
  hint(c, pid) {
    const t = c.task as CodeTask;
    if (c.round.stage !== 'open') return err('closed');
    const pm = (c.round.pm[pid] ??= { hints: 0, attempts: 0, solved: false, wrong: [] as string[] });
    if (pm.solved) return err('already_solved');
    if (pm.hints >= Math.min(3, t.hints.length)) return err('no_more_hints');
    pm.hints++;
    return { ok: true, info: { hints: pm.hints } };
  },
  answered: (c, pid) => !!c.round.pm[pid]?.solved || (c.round.pm[pid]?.attempts ?? 0) >= MAX_ATTEMPTS,
  complete(c) { return c.round.stage === 'open' && c.players.length > 0 && c.players.every(p => code.answered(c, p.id)); },
  score(c) {
    const t = c.task as CodeTask;
    const rows = c.players.map(p => {
      const pm = c.round.pm[p.id];
      return { pid: p.id, solved: !!pm?.solved, hints: pm?.hints ?? 0, attempts: pm?.attempts ?? 0, points: scoreCode(!!pm?.solved, pm?.hints ?? 0, t.points) };
    });
    return {
      entries: rows.filter(r => r.solved).map(r => ({ pid: r.pid, delta: r.points, label: r.hints ? `Gelöst mit ${r.hints} Hinweis${r.hints > 1 ? 'en' : ''}` : 'Gelöst ohne Hinweis' })),
      reveal: { answer: t.answers[0], explain: t.explain, rows, maxHints: Math.min(3, t.hints.length) },
    };
  },
  view(c, a) {
    const t = c.task as CodeTask;
    const base: any = { prompt: t.prompt, display: t.display ?? null, input: t.input, hintCount: Math.min(3, t.hints.length), maxAttempts: MAX_ATTEMPTS };
    if (a.role === 'player' && a.pid) {
      const pm = c.round.pm[a.pid] ?? { hints: 0, attempts: 0, solved: false };
      base.mine = { hints: pm.hints, attempts: pm.attempts, solved: pm.solved, hintTexts: t.hints.slice(0, pm.hints) };
    }
    if (a.role === 'host') base.solution = t.answers[0];
    return base;
  },
};

// =====================================================================
// UNIQUE (EINZIGARTIG)
// =====================================================================
function uniqueGroups(c: Ctx) {
  const t = c.task as UniqueTask;
  const answers: Record<string, string> = {};
  for (const p of c.players) if (c.round.pm[p.id]?.answer) answers[p.id] = c.round.pm[p.id].answer;
  return groupUnique(answers, t.valid, c.round.m?.overrides ?? {});
}
const unique: ModeImpl = {
  maxPoints: t => (t as UniqueTask).pointsUnique,
  begin(c) { c.round.m = { overrides: {} }; c.setStage('open', (c.task as UniqueTask).seconds); },
  advance(c) {
    if (c.round.stage === 'open') c.setStage('review', null);
    else c.setStage('locked', null);
  },
  submit(c, pid, payload) {
    if (c.round.stage !== 'open') return err('closed');
    const answer = String(payload?.answer ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!answer) return err('invalid');
    const cur = c.round.pm[pid];
    if (cur) return cur.answer === answer ? { ok: true, dup: true } : err('already_submitted');
    c.round.pm[pid] = { answer };
    return OK;
  },
  answered: (c, pid) => !!c.round.pm[pid]?.answer,
  complete(c) { return c.round.stage === 'open' && c.players.length > 0 && c.players.every(p => !!c.round.pm[p.id]?.answer); },
  score(c) {
    const t = c.task as UniqueTask;
    const groups = uniqueGroups(c);
    const res = scoreUnique(groups, t.pointsUnique, t.pointsShared);
    const entries: Draft[] = Object.entries(res).map(([pid, r]) => ({
      pid, delta: r.points,
      label: r.kind === 'unique' ? 'Einzigartig!' : r.kind === 'shared' ? 'Mehrfach genannt' : 'Ungültige Antwort',
    }));
    return { entries, reveal: { explain: t.explain, groups, results: res, pointsUnique: t.pointsUnique, pointsShared: t.pointsShared, validNames: t.valid.map(v => v.name) } };
  },
  view(c, a) {
    const t = c.task as UniqueTask;
    const st = c.round.stage;
    const base: any = { prompt: t.prompt, placeholder: t.placeholder, pointsUnique: t.pointsUnique, pointsShared: t.pointsShared };
    if (st === 'review' || st === 'locked' || st === 'reveal') base.groups = uniqueGroups(c);
    if (a.role === 'player' && a.pid) base.mine = c.round.pm[a.pid] ?? null;
    if (a.role === 'host') base.validNames = t.valid.map(v => v.name);
    return base;
  },
};

export const MODES: Record<TaskDef['mode'], ModeImpl> = { geo, rank, estimate, glitch, codebreak: code, unique };
export { rankPairs };
