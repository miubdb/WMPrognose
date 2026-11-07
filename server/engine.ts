// Autoritative Spiel-Engine: State-Machine, Aktionen, Wertung, Sichten.
import { createHash, randomBytes, randomInt } from 'node:crypto';
import type {
  Book, Action, Avatar, PlayerPublic, Phase, RoundView, ScoreEntry, TaskDef, TileDef, TileView, View, Flow,
} from '../shared/types';
import { AVATAR_LIMITS } from '../shared/types';
import { applyClamped } from '../shared/scoring';
import { expandShowSteps, hashSeed, rng, shuffled } from '../shared/util';
import type { PlanStep, PlayerRec, Room, RoundState } from './model';
import { MODES, type Audience, type Ctx } from './modes';
import { SCENES } from '../shared/scenes';

export type { Book };
export type BookSource = Book | ((bookId: string) => Book);
export type Actor = { role: 'tv' | 'host' | 'player'; pid?: string };
export type ActResult = { ok: true; dup?: boolean; info?: any } | { ok: false; err: string };

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randCode = (n: number) => Array.from({ length: n }, () => ALPHA[randomInt(ALPHA.length)]).join('');
export const sha = (s: string) => createHash('sha256').update(s).digest('hex');
export const MAX_PLAYERS = 8;
const MAX_LOG = 150;
const MAX_PROCESSED = 600;

export const DEFAULT_PLAN: PlanStep[] = ['wall', 'wall', 'wall', 'board', 'surprise', 'board', 'wall', 'wall', 'wall', 'board', 'final'];

export class Engine {
  constructor(public src: BookSource) {}
  /** Fester Inhaltsstand des Raums (Paketversion) – ändert sich nach Raumerstellung nie. */
  bk(room: Room): Book { return typeof this.src === 'function' ? this.src(room.bookId ?? 'legacy') : this.src; }

  // ---------------------------------------------------------------- Räume
  /** Ablaufplan der festen Show aus dem Paket (Runden → 'tile:<id>', Zwischenstände → 'board'). */
  static showPlan(book: Book): PlanStep[] {
    return expandShowSteps(book.show ?? [], book.rules).map(s => (s.k === 'board' ? 'board' : (`tile:${s.cat}` as PlanStep)));
  }
  newRoom(code: string, now: number, bookId = 'legacy', flowReq: Flow = 'classic'): { room: Room; hostKey: string } {
    const book = typeof this.src === 'function' ? this.src(bookId) : this.src;
    const flow: Flow = flowReq === 'show' && book.show?.length ? 'show' : 'classic';
    const hostKey = randomBytes(24).toString('base64url');
    const pin = String(randomInt(100000, 999999));
    const room: Room = {
      code, createdAt: now, hostKeyHash: sha(hostKey), hostPin: pin, hostPinHash: sha(pin),
      phase: 'lobby', joinOpen: true, showPaused: false, frozen: false, sound: true, reduced: false, hideScores: false,
      players: [], nextPlayerNo: 1, seq: 1, flow, plan: flow === 'show' ? Engine.showPlan(book) : DEFAULT_PLAN.slice(), planIdx: 0,
      bookId, tileStatus: Object.fromEntries(book.tiles.filter(t => t.kind === 'tile').map(t => [t.id, 'open' as const])),
      pickOrder: [], pickNo: 0, pickerId: null, round: null, scoreLog: [], scoreSeq: 1, scoreboard: null, lastBoard: {},
      ceremonyStep: 0, tilesPlayed: 0, log: [], processed: {}, processedOrder: [], seed: hashSeed(code + now),
    };
    this.log(room, now, `Raum ${code} erstellt`);
    return { room, hostKey };
  }
  static newCode(exists: (c: string) => boolean): string {
    for (let i = 0; i < 200; i++) { const c = randCode(4); if (!exists(c)) return c; }
    return randCode(5);
  }
  checkHost(room: Room, key: string | undefined): boolean {
    return !!key && sha(key) === room.hostKeyHash;
  }
  hostLoginPin(room: Room, pin: string): boolean {
    return sha(String(pin).trim()) === room.hostPinHash;
  }
  /** Host-Schlüssel rotieren (PIN-Login auf neuem Gerät). */
  rotateHostKey(room: Room): string {
    const key = randomBytes(24).toString('base64url');
    room.hostKeyHash = sha(key);
    return key;
  }

  // ---------------------------------------------------------------- Spieler
  active(room: Room): PlayerRec[] { return room.players.filter(p => !p.removed); }
  playerByToken(room: Room, token: string | undefined): PlayerRec | null {
    if (!token) return null;
    const h = sha(token);
    return room.players.find(p => !p.removed && p.tokenHash === h) ?? null;
  }
  validAvatar(a: any): a is Avatar {
    if (!a || typeof a !== 'object') return false;
    return (Object.keys(AVATAR_LIMITS) as (keyof Avatar)[]).every(k => Number.isInteger(a[k]) && a[k] >= 0 && a[k] < AVATAR_LIMITS[k]);
  }
  cleanName(n: any): string {
    return String(n ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  }
  join(room: Room, name: any, avatar: any, now: number): { ok: true; player: PlayerRec; token: string } | { ok: false; err: string } {
    if (!room.joinOpen || room.phase !== 'lobby') return { ok: false, err: 'lobby_closed' };
    const clean = this.cleanName(name);
    if (clean.length < 1) return { ok: false, err: 'name_required' };
    if (!this.validAvatar(avatar)) return { ok: false, err: 'invalid_avatar' };
    if (this.active(room).length >= MAX_PLAYERS) return { ok: false, err: 'room_full' };
    if (this.active(room).some(p => p.name.toLowerCase() === clean.toLowerCase())) return { ok: false, err: 'name_taken' };
    const token = randomBytes(24).toString('base64url');
    const player: PlayerRec = {
      id: 'p' + room.nextPlayerNo, name: clean, avatar, tokenHash: sha(token),
      recovery: this.uniqueRecovery(room), score: 0, joinedOrder: room.nextPlayerNo, released: false, lastSeen: now,
    };
    room.nextPlayerNo++;
    room.players.push(player);
    this.log(room, now, `${clean} ist beigetreten`);
    this.bump(room);
    return { ok: true, player, token };
  }
  private uniqueRecovery(room: Room): string {
    for (;;) { const c = randCode(6); if (!room.players.some(p => p.recovery === c)) return c; }
  }
  /** Wiederherstellung mit persönlichem Code: rotiert den Token (altes Gerät wird abgemeldet). */
  recover(room: Room, code: string, now: number): { ok: true; player: PlayerRec; token: string } | { ok: false; err: string } {
    const c = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const p = this.active(room).find(x => x.recovery === c);
    if (!c || !p) return { ok: false, err: 'unknown_code' };
    const token = randomBytes(24).toString('base64url');
    p.tokenHash = sha(token);
    p.released = false;
    this.log(room, now, `${p.name} wurde wiederhergestellt`);
    this.bump(room);
    return { ok: true, player: p, token };
  }
  /** Freigegebenen Platz übernehmen. */
  claim(room: Room, pid: string, now: number): { ok: true; player: PlayerRec; token: string } | { ok: false; err: string } {
    const p = this.active(room).find(x => x.id === pid);
    if (!p || !p.released) return { ok: false, err: 'seat_not_released' };
    const token = randomBytes(24).toString('base64url');
    p.tokenHash = sha(token);
    p.released = false;
    this.log(room, now, `${p.name} hat den Platz auf einem neuen Gerät übernommen`);
    this.bump(room);
    return { ok: true, player: p, token };
  }
  releasedSeats(room: Room) {
    return this.active(room).filter(p => p.released).map(p => ({ id: p.id, name: p.name, avatar: p.avatar }));
  }

  // ---------------------------------------------------------------- Hilfen
  bump(room: Room) { room.seq++; }
  log(room: Room, now: number, text: string) {
    room.log.push({ at: now, text });
    if (room.log.length > MAX_LOG) room.log.splice(0, room.log.length - MAX_LOG);
  }
  tile(room: Room, id: string): TileDef | undefined { return this.bk(room).tiles.find(t => t.id === id); }
  curTile(room: Room): TileDef | null { return room.round ? this.tile(room, room.round.tileId) ?? null : null; }
  curTask(room: Room): TaskDef | null {
    const t = this.curTile(room);
    return t && room.round ? t.tasks[room.round.taskIndex] ?? null : null;
  }
  private ctx(room: Room, now: number): Ctx | null {
    const round = room.round, task = this.curTask(room);
    if (!round || !task) return null;
    return {
      room, round, task, now, players: this.active(room), scenes: this.bk(room).scenes ?? SCENES, rules: this.bk(room).rules,
      setStage: (stage, seconds) => {
        round.stage = stage; round.stageStartedAt = now; round.stageSeconds = seconds;
        if (seconds == null) { round.deadline = null; round.pausedLeft = null; }
        else if (room.frozen) { round.deadline = null; round.pausedLeft = seconds * 1000; }
        else { round.deadline = now + seconds * 1000; round.pausedLeft = null; }
      },
    };
  }
  scoreKey(room: Room): string { return `${room.round!.tileId}#${room.round!.taskIndex}`; }

  sortedPlayers(room: Room, opts: { throughFinalTask?: number } = {}): { p: PlayerRec; score: number; finalPts: number }[] {
    const finalId = this.bk(room).tiles.find(t => t.kind === 'final')?.id;
    const totals = new Map<string, { score: number; finalPts: number }>();
    for (const p of this.active(room)) totals.set(p.id, { score: 0, finalPts: 0 });
    for (const e of room.scoreLog) {
      const t = totals.get(e.pid); if (!t) continue;
      const isFinal = finalId && e.key.startsWith(finalId + '#');
      if (isFinal && opts.throughFinalTask !== undefined) {
        const idx = Number(e.key.split('#')[1]);
        if (idx >= opts.throughFinalTask) continue;
      }
      t.score += e.applied;
      if (isFinal) t.finalPts += e.applied;
    }
    return this.active(room).map(p => ({ p, ...totals.get(p.id)! }))
      // Gleichstand: 1) mehr Punkte 2) mehr Finalpunkte 3) frühere Anmeldung
      .sort((a, b) => b.score - a.score || b.finalPts - a.finalPts || a.p.joinedOrder - b.p.joinedOrder);
  }
  recompute(room: Room) {
    const bal: Record<string, number> = {};
    for (const e of room.scoreLog) {
      e.applied = applyClamped(bal[e.pid] ?? 0, e.requested);
      bal[e.pid] = (bal[e.pid] ?? 0) + e.applied;
    }
    for (const p of room.players) p.score = bal[p.id] ?? 0;
  }
  private addEntry(room: Room, key: string, pid: string, requested: number, label: string, now: number, manual = false) {
    room.scoreLog.push({ id: room.scoreSeq++, key, pid, requested, applied: requested, label, at: now, manual });
  }
  private dropEntries(room: Room, key: string) {
    room.scoreLog = room.scoreLog.filter(e => e.key !== key);
  }

  // ---------------------------------------------------------------- Tick (Timer)
  /** Serverseitige Fristen. Gibt true zurück, wenn sich etwas geändert hat. */
  tick(room: Room, now: number): boolean {
    const c = this.ctx(room, now);
    if (!c || room.phase !== 'round') return false;
    const r = c.round;
    let changed = false;
    for (let guard = 0; guard < 8; guard++) {
      if ((r.stage === 'view' || r.stage === 'open' || r.stage === 'bet') && r.deadline !== null && now >= r.deadline && r.pausedLeft === null) {
        // Folge-Stage startet ab dem eigentlichen Fristende (keine Drift)
        const at = r.deadline;
        const c2 = { ...c, now: at, setStage: (s: any, sec: any) => { c.setStage(s, sec); if (sec != null && !room.frozen) { r.stageStartedAt = at; r.deadline = at + sec * 1000; } } };
        MODES[c.task.mode].advance(c2 as Ctx);
        changed = true;
      } else break;
    }
    if (changed) this.bump(room);
    return changed;
  }
  private afterSubmit(room: Room, c: Ctx) {
    const mode = MODES[c.task.mode];
    for (let i = 0; i < 6 && mode.complete?.(c); i++) mode.advance(c);
  }

  // ---------------------------------------------------------------- Aktionen
  act(room: Room, actor: Actor, reqId: string, a: Action, now: number): ActResult {
    if (reqId && room.processed[reqId]) return { ...room.processed[reqId], dup: true };
    const res = this.dispatch(room, actor, a, now);
    if (res.ok) this.bump(room);
    if (reqId) {
      room.processed[reqId] = res;
      room.processedOrder.push(reqId);
      while (room.processedOrder.length > MAX_PROCESSED) delete room.processed[room.processedOrder.shift()!];
    }
    return res;
  }

  private dispatch(room: Room, actor: Actor, a: Action, now: number): ActResult {
    if (actor.role === 'tv') return { ok: false, err: 'forbidden' };
    if (actor.role === 'player') return this.playerAction(room, actor.pid!, a, now);
    if (!a.k.startsWith('h.')) return { ok: false, err: 'forbidden' };
    return this.hostAction(room, a, now);
  }

  private playerAction(room: Room, pid: string, a: Action, now: number): ActResult {
    const p = this.active(room).find(x => x.id === pid);
    if (!p) return { ok: false, err: 'unknown_player' };
    switch (a.k) {
      case 'submit': {
        if (room.phase !== 'round' || !room.round) return { ok: false, err: 'no_round' };
        if (room.showPaused) return { ok: false, err: 'paused' };
        const c = this.ctx(room, now)!;
        const r = MODES[c.task.mode].submit(c, pid, a.payload);
        if (r.ok && !r.dup) { this.afterSubmit(room, c); }
        return r;
      }
      case 'hint': {
        const c = this.ctx(room, now);
        if (!c || room.phase !== 'round') return { ok: false, err: 'no_round' };
        const m = MODES[c.task.mode];
        return m.hint ? m.hint(c, pid) : { ok: false, err: 'unsupported' };
      }
      case 'pick': {
        if (room.phase !== 'wall' || room.pickerId !== pid) return { ok: false, err: 'not_your_turn' };
        return this.pickTile(room, a.tileId, now);
      }
      case 'setAvatar': {
        if (room.phase !== 'lobby') return { ok: false, err: 'locked' };
        if (a.name !== undefined) {
          const n = this.cleanName(a.name);
          if (!n) return { ok: false, err: 'name_required' };
          if (this.active(room).some(x => x.id !== pid && x.name.toLowerCase() === n.toLowerCase())) return { ok: false, err: 'name_taken' };
          p.name = n;
        }
        if (a.avatar !== undefined) { if (!this.validAvatar(a.avatar)) return { ok: false, err: 'invalid_avatar' }; p.avatar = a.avatar; }
        return { ok: true };
      }
      default: return { ok: false, err: 'forbidden' };
    }
  }

  // ---------------------------------------------------------------- Ablaufsteuerung
  /** Kacheln, die wegen der Verteilungsregeln (Fußball-/Modus-Limit) gerade nicht wählbar sind. Nie alle auf einmal. */
  blockedTiles(room: Room): Set<string> {
    const rules = this.bk(room).rules;
    const out = new Set<string>();
    if (!rules || (rules.maxFootball === undefined && rules.maxPerMode === undefined)) return out;
    const tiles = this.bk(room).tiles.filter(t => t.kind === 'tile');
    const chosen = tiles.filter(t => room.tileStatus[t.id] === 'selected' || room.tileStatus[t.id] === 'played');
    const f = chosen.filter(t => t.football).length;
    const open = tiles.filter(t => room.tileStatus[t.id] === 'open');
    for (const t of open) {
      const m = chosen.filter(c => c.mode === t.mode).length;
      if ((t.football && rules.maxFootball !== undefined && f >= rules.maxFootball) || (rules.maxPerMode !== undefined && m >= rules.maxPerMode)) out.add(t.id);
    }
    if (open.length && open.every(t => out.has(t.id))) out.clear();
    return out;
  }
  private pickTile(room: Room, tileId: string, now: number): ActResult {
    if (room.phase !== 'wall') return { ok: false, err: 'wrong_phase' };
    const t = this.tile(room, tileId);
    if (!t || t.kind !== 'tile') return { ok: false, err: 'unknown_tile' };
    if (room.tileStatus[tileId] !== 'open') return { ok: false, err: 'tile_used' };
    if (this.blockedTiles(room).has(tileId)) return { ok: false, err: 'tile_limited' };
    room.tileStatus[tileId] = 'selected';
    this.startRound(room, t, now);
    const picker = room.players.find(p => p.id === room.pickerId);
    this.log(room, now, `${picker?.name ?? 'Host'} wählt „${t.title}“`);
    return { ok: true };
  }
  private startRound(room: Room, t: TileDef, now: number) {
    room.phase = 'round';
    room.round = this.freshRound(t.id, 0, now);
    room.scoreboard = null;
  }
  private freshRound(tileId: string, taskIndex: number, now: number, attempt = 0): RoundState {
    return { tileId, taskIndex, stage: 'intro', stageStartedAt: now, deadline: null, pausedLeft: null, stageSeconds: null, m: {}, pm: {}, result: null, attempt };
  }
  private enterPlan(room: Room, now: number) {
    room.pickerId = null;
    room.round = null;
    const step = room.plan[room.planIdx];
    if (!step) { room.phase = 'ceremony'; room.ceremonyStep = 0; room.hideScores = false; return; }
    if (step.startsWith('tile:')) {                       // feste Show: Runde direkt starten (Regelkarte, Host gibt die Aufgabe frei)
      const t = this.tile(room, step.slice(5));
      if (!t) { this.log(room, now, `Runde „${step.slice(5)}“ fehlt im Paket – übersprungen`); this.nextPlan(room, now); return; }
      if (t.kind === 'final') room.hideScores = true;
      this.startRound(room, t, now);
      return;
    }
    switch (step) {
      case 'wall': {
        room.phase = 'wall';
        const ids = this.active(room).map(p => p.id);
        // Auswahlreihenfolge: Spieler reihum
        if (!room.pickOrder.length) room.pickOrder = shuffled(ids, rng(room.seed));
        let guard = 0;
        do { room.pickerId = room.pickOrder[room.pickNo % room.pickOrder.length]; room.pickNo++; guard++; }
        while (guard <= room.pickOrder.length && !ids.includes(room.pickerId!));
        break;
      }
      case 'surprise': {
        const t = this.bk(room).tiles.find(x => x.kind === 'surprise')!;
        this.startRound(room, t, now);
        break;
      }
      case 'final': {
        const t = this.bk(room).tiles.find(x => x.kind === 'final')!;
        room.hideScores = true;
        this.startRound(room, t, now);
        break;
      }
      case 'board': {
        const prev = { ...room.lastBoard };
        room.phase = 'scoreboard';
        const nPlayed = room.tilesPlayed;
        const finalNext = this.stepKind(room, room.planIdx + 1) === 'final';
        const afterSurprise = this.stepKind(room, room.planIdx - 1) === 'surprise';
        room.scoreboard = {
          title: finalNext ? (this.boardName(room) === 'Zwischenstand' ? 'Letzter sichtbarer Stand' : `Letztes ${this.boardName(room)}`) : this.boardName(room),
          reason: finalNext ? 'Im Finale wird die Rangliste verborgen – alles ist noch möglich!' : `Nach ${nPlayed} gespielten ${room.flow === 'show' ? 'Runden' : 'Kategorien'}${afterSurprise ? ' und der Überraschungsrunde' : ''}`,
          prev,
        };
        room.lastBoard = Object.fromEntries(this.active(room).map(p => [p.id, p.score]));
        break;
      }
    }
  }
  /** Art eines Planschritts: 'round' | 'surprise' | 'final' | 'board' | 'wall' | undefined */
  stepKind(room: Room, idx: number): 'round' | 'surprise' | 'final' | 'board' | 'wall' | undefined {
    const s = room.plan[idx];
    if (!s) return undefined;
    if (s === 'board' || s === 'wall' || s === 'surprise' || s === 'final') return s === 'wall' ? 'wall' : s;
    const t = this.tile(room, s.slice(5));
    return t?.kind === 'surprise' ? 'surprise' : t?.kind === 'final' ? 'final' : 'round';
  }
  private nextPlan(room: Room, now: number) {
    room.planIdx++;
    this.enterPlan(room, now);
  }
  private finishTile(room: Room, now: number) {
    const t = this.curTile(room)!;
    if (t.kind === 'tile') room.tileStatus[t.id] = 'played';
    room.tilesPlayed++;
    this.log(room, now, `„${t.title}“ beendet`);
    this.nextPlan(room, now);
  }
  private freeze(room: Room, now: number) {
    room.frozen = true;
    const r = room.round;
    if (r && r.deadline !== null) { r.pausedLeft = Math.max(0, r.deadline - now); r.deadline = null; }
  }
  private unfreeze(room: Room, now: number) {
    room.frozen = false;
    const r = room.round;
    if (r && r.pausedLeft !== null) { r.deadline = now + r.pausedLeft; r.pausedLeft = null; }
  }
  private forceLock(c: Ctx) {
    const mode = MODES[c.task.mode];
    for (let i = 0; i < 12 && (['view', 'open', 'bet'] as string[]).includes(c.round.stage); i++) mode.advance(c);
  }
  private doReveal(room: Room, c: Ctx, now: number): ActResult {
    const r = c.round;
    if (r.stage === 'reveal') return { ok: true, dup: true };
    if (r.stage === 'intro') return { ok: false, err: 'not_started' };
    this.forceLock(c);
    if (MODES[c.task.mode].blockReveal?.(c)) return { ok: false, err: 'review_needed' };
    const res = MODES[c.task.mode].score(c);
    res.reveal = { ...res.reveal, missing: c.players.filter(p => !MODES[c.task.mode].answered(c, p.id)).map(p => p.id) };   // wer nichts abgegeben hat (für die TV-Auflösung)
    if (c.task.practice) {
      // Proberunde: Auflösung wie gewohnt, aber niemals Punkte buchen (gezeigte Punkte = „so wäre es gewertet worden“)
      r.result = { entries: [], reveal: { ...res.reveal, practice: true } };
    } else {
      r.result = res;
      const key = this.scoreKey(room);
      this.dropEntries(room, key);
      for (const e of res.entries) this.addEntry(room, key, e.pid, e.delta, e.label, now);
      this.recompute(room);
    }
    c.setStage('reveal', null);
    this.log(room, now, `Auflösung: ${this.curTile(room)!.title} · Aufgabe ${r.taskIndex + 1}`);
    return { ok: true };
  }

  private hostAction(room: Room, a: Action, now: number): ActResult {
    const ok: ActResult = { ok: true };
    const bad = (e: string): ActResult => ({ ok: false, err: e });
    switch (a.k) {
      case 'h.joinOpen': if (room.phase !== 'lobby') return bad('wrong_phase'); room.joinOpen = !!a.open; return ok;
      case 'h.startShow': {
        if (room.phase !== 'lobby') return { ok: true, dup: true };
        if (this.active(room).length < 1) return bad('no_players');
        room.joinOpen = false; room.phase = 'intro';
        // Identisches Startguthaben für alle (Einsätze gibt es nur aus vorhandenen Punkten)
        const credit = this.bk(room).rules?.startCredit ?? 0;
        if (credit > 0 && !room.scoreLog.some(e => e.key === 'start')) {
          for (const p of this.active(room)) this.addEntry(room, 'start', p.id, credit, 'Startguthaben', now);
          this.recompute(room);
          room.lastBoard = Object.fromEntries(this.active(room).map(p => [p.id, p.score]));
        }
        room.pickOrder = shuffled(this.active(room).map(p => p.id), rng(room.seed));
        this.log(room, now, 'Show gestartet');
        return ok;
      }
      case 'h.introDone': {
        if (room.phase !== 'intro') return { ok: true, dup: true };
        room.planIdx = 0; this.enterPlan(room, now); return ok;
      }
      case 'h.pick': return this.pickTile(room, a.tileId, now);
      case 'h.setPicker': {
        if (room.phase !== 'wall' || !this.active(room).some(p => p.id === a.pid)) return bad('wrong_phase');
        room.pickerId = a.pid; return ok;
      }
      case 'h.sound': room.sound = !!a.on; return ok;
      case 'h.liveRank': room.liveRank = !!a.on; return ok;
      case 'h.music': { const cur = room.music ?? { on: false, vol: 25 }; room.music = { on: a.on ?? cur.on, vol: Math.max(0, Math.min(100, Math.round(a.vol ?? cur.vol))) }; return ok; }
      case 'h.reduced': room.reduced = !!a.on; return ok;
      case 'h.showPause': {
        room.showPaused = !!a.paused;
        if (a.paused) this.freeze(room, now); else this.unfreeze(room, now);
        return ok;
      }
      case 'h.pause': {
        if (!a.paused && room.showPaused) return bad('paused');          // Während der Show-Pause läuft kein Timer weiter
        if (a.paused) this.freeze(room, now); else this.unfreeze(room, now);
        return ok;
      }
      case 'h.scoreboard': {
        if (a.show && room.phase === 'wall') {
          room.scoreboard = { title: this.boardName(room), reason: 'Zwischendurch eingeblendet', prev: { ...room.lastBoard }, manual: true };
          room.lastBoard = Object.fromEntries(this.active(room).map(p => [p.id, p.score]));
          room.phase = 'scoreboard';
          return ok;
        }
        return bad('wrong_phase');
      }
      case 'h.continue': {
        if (room.phase === 'scoreboard') {
          if (room.scoreboard?.manual) { room.phase = 'wall'; room.scoreboard = null; return ok; }
          this.nextPlan(room, now);
          return ok;
        }
        return { ok: true, dup: true };
      }
      case 'h.adjust': {
        const p = this.active(room).find(x => x.id === a.pid);
        const d = Math.trunc(Number(a.delta));
        if (!p || !Number.isFinite(d) || d === 0 || Math.abs(d) > 5000) return bad('invalid');
        this.addEntry(room, 'manual', p.id, d, `Host-Korrektur: ${String(a.note ?? '').slice(0, 60) || 'ohne Notiz'}`, now, true);
        this.recompute(room);
        this.log(room, now, `Punktekorrektur ${p.name}: ${d > 0 ? '+' : ''}${d}`);
        return ok;
      }
      case 'h.release': {
        const p = this.active(room).find(x => x.id === a.pid);
        if (!p) return bad('unknown_player');
        p.released = true; p.tokenHash = sha(randomBytes(16).toString('hex'));
        this.log(room, now, `Platz von ${p.name} freigegeben`);
        return ok;
      }
      case 'h.remove': {
        const p = this.active(room).find(x => x.id === a.pid);
        if (!p) return bad('unknown_player');
        if (room.phase !== 'lobby') return bad('only_in_lobby');
        p.removed = true; return ok;
      }
      case 'h.end': room.phase = 'ended'; this.log(room, now, 'Show beendet'); return ok;
      case 'h.ceremonyNext': {
        if (room.phase !== 'ceremony') return bad('wrong_phase');
        const max = this.ceremonySteps(room) - 1;
        if (room.ceremonyStep < max) room.ceremonyStep++;
        return ok;
      }
      case 'h.startFinal': return bad('use_begin');
      case 'h.backToWall': {
        if (room.flow === 'show') return bad('not_allowed');        // feste Show kennt keine Wand
        if (room.phase !== 'round' || !room.round) return bad('wrong_phase');
        const t = this.curTile(room)!;
        if (t.kind !== 'tile') return bad('not_allowed');
        // Kachel wieder freigeben, Punkte dieser Kachel verwerfen, Auswahl bleibt beim selben Spieler
        room.tileStatus[t.id] = 'open';
        for (let i = 0; i < t.tasks.length; i++) this.dropEntries(room, `${t.id}#${i}`);
        this.recompute(room);
        room.round = null; room.phase = 'wall';
        return ok;
      }
    }
    // --- Runden-Aktionen ---
    const c = this.ctx(room, now);
    if (!c || room.phase !== 'round') return bad('no_round');
    const mode = MODES[c.task.mode];
    const r = c.round;
    switch (a.k) {
      case 'h.begin': {
        if (r.stage !== 'intro') return { ok: true, dup: true };
        mode.begin(c); this.log(room, now, `Aufgabe ${r.taskIndex + 1} gestartet`); return ok;
      }
      case 'h.lock': {
        if (!(['view', 'open', 'bet'] as string[]).includes(r.stage)) return { ok: true, dup: true };
        if (c.task.mode === 'link') this.forceLock(c); else mode.advance(c);
        this.afterSubmit(room, c); return ok;
      }
      case 'h.reveal': return this.doReveal(room, c, now);
      case 'h.next': {
        if (r.stage !== 'reveal') return bad('not_revealed');
        const tile = this.curTile(room)!;
        if (r.taskIndex + 1 < tile.tasks.length) { room.round = this.freshRound(tile.id, r.taskIndex + 1, now); room.round.stageStartedAt = now; return ok; }
        this.finishTile(room, now); return ok;
      }
      case 'h.addTime': {
        const s = Math.max(1, Math.min(300, Math.trunc(Number(a.seconds) || 0)));
        if (r.deadline !== null) r.deadline += s * 1000;
        else if (r.pausedLeft !== null) r.pausedLeft += s * 1000;
        else if (r.stage === 'locked' && c.task.mode !== 'rank') c.setStage('open', s);
        else return bad('no_timer');
        return ok;
      }
      case 'h.restartTask': {
        this.dropEntries(room, this.scoreKey(room)); this.recompute(room);
        room.round = this.freshRound(r.tileId, r.taskIndex, now, r.attempt + 1);
        this.log(room, now, `Aufgabe ${r.taskIndex + 1} wurde neu gestartet`);
        return ok;
      }
      case 'h.skipTask': {
        this.dropEntries(room, this.scoreKey(room)); this.recompute(room);
        const tile = this.curTile(room)!;
        if (r.taskIndex + 1 < tile.tasks.length) room.round = this.freshRound(tile.id, r.taskIndex + 1, now);
        else this.finishTile(room, now);
        return ok;
      }
      case 'h.skipTile': this.finishTile(room, now); return ok;
      case 'h.review': {
        if ((c.task.mode !== 'unique' && c.task.mode !== 'link') || (r.stage !== 'review' && r.stage !== 'locked')) return bad('wrong_phase');
        r.m.overrides ??= {};
        r.m.overrides[a.groupKey] = a.decision;
        return ok;
      }
    }
    return bad('unknown_action');
  }

  ceremonySteps(room: Room): number {
    const k = this.bk(room).tiles.find(t => t.kind === 'final')?.tasks.length ?? 0;
    return 1 + k + 4; // Stand davor, je Finalaufgabe, Platz n..4, 3, 2, 1
  }

  // ---------------------------------------------------------------- Sichten
  buildView(room: Room, aud: Audience, now: number): View {
    const active = this.active(room);
    const sorted = this.sortedPlayers(room);
    const rankOf = new Map<string, number>();
    sorted.forEach((s, i) => rankOf.set(s.p.id, i > 0 && s.score === sorted[i - 1].score ? rankOf.get(sorted[i - 1].p.id)! : i + 1));
    const ceremonyHide = room.phase === 'ceremony' && room.ceremonyStep < this.ceremonySteps(room) - 1;
    const hide = (room.hideScores || ceremonyHide) && aud.role !== 'host';
    const c = this.ctx(room, now);
    const answeredFor = (pid: string): boolean => {
      if (!c || room.phase !== 'round' || c.round.stage === 'intro' || c.round.stage === 'reveal') return false;
      return MODES[c.task.mode].answered(c, pid);
    };
    const players: PlayerPublic[] = active.map(p => ({
      id: p.id, name: p.name, avatar: p.avatar,
      score: hide ? null : p.score, rank: hide ? null : rankOf.get(p.id) ?? null,
      connected: this.liveSet.has(room.code + ':' + p.id),
      answered: answeredFor(p.id), seatReleased: p.released, joinedOrder: p.joinedOrder,
    }));
        const planStep = room.plan[room.planIdx];
    const view: View = {
      v: 1, seq: room.seq, now,
      room: {
        code: room.code, phase: room.phase, joinOpen: room.joinOpen, showPaused: room.showPaused, sound: room.sound,
        reduced: room.reduced, hideScores: hide,
        act: this.actLabel(room),
        progress: { tilesPlayed: room.tilesPlayed, tilesTotal: room.flow === 'show' ? room.plan.filter(x => x.startsWith('tile:')).length : room.plan.filter(s => s === 'wall').length + 2 },
        flow: room.flow ?? 'classic', boardName: this.boardName(room),
        brand: { title: this.bk(room).rules?.showTitle || 'OUTPLAY', winner: this.bk(room).rules?.winnerTitle || 'OUTPLAY-Champion', tagline: this.bk(room).rules?.tagline || undefined, winnerLine: this.bk(room).rules?.winnerLine || undefined },
        liveRank: room.liveRank ?? true, music: room.music ?? { on: false, vol: 25 },
        ...(room.flow === 'show' ? { agenda: this.agenda(room) } : {}),
      },
      players, wall: null, round: null, scoreboard: null, ceremony: null,
    };
    void planStep;
    if (room.phase === 'wall') {
      const picker = aud.role === 'player' && aud.pid === room.pickerId;
      const blocked = this.blockedTiles(room);
      view.wall = {
        tiles: this.bk(room).tiles.filter(t => t.kind === 'tile').map<TileView>(t => ({
          id: t.id, title: t.title, topic: t.topic, icon: t.icon, color: t.color, kind: t.kind, status: room.tileStatus[t.id] ?? 'open', ...(blocked.has(t.id) ? { blocked: true } : {}),
          ...(room.tileStatus[t.id] === 'played' ? { mode: t.tasks[0].mode } : {}),
        })),
        pickerId: room.pickerId, pickNo: room.pickNo, pickerMayPick: !!picker,
      };
      if (aud.role === 'player') view.isPicker = picker;
    }
    if (room.phase === 'round' && c) view.round = this.roundView(room, c, aud);
    if (room.phase === 'scoreboard' && room.scoreboard) {
      view.scoreboard = {
        title: room.scoreboard.title, reason: room.scoreboard.reason,
        standings: sorted.map(s => ({ id: s.p.id, score: s.score, prev: room.scoreboard!.prev[s.p.id] ?? 0 })),
      };
    }
    if (room.phase === 'ceremony' || room.phase === 'ended') {
      const steps = this.ceremonySteps(room);
      const k = steps - 5;
      const step = room.phase === 'ended' ? steps - 1 : room.ceremonyStep;
      const through = Math.min(step, k);
      const cur = this.sortedPlayers(room, { throughFinalTask: through });
      const prevS = this.sortedPlayers(room, { throughFinalTask: Math.max(0, through - 1) });
      const prevScore = new Map(prevS.map(s => [s.p.id, s.score]));
      const titles = ['Der Stand vor dem Finale', ...Array.from({ length: k }, (_, i) => `Nach Finalaufgabe ${i + 1}`), 'Die Plätze dahinter', 'Platz 3', 'Platz 2', 'Der Sieger!'];
      view.ceremony = {
        step, steps, stepTitle: titles[Math.min(step, titles.length - 1)],
        standings: aud.role === 'player' && step < steps - 1 ? [] : cur.map((s, i) => ({ id: s.p.id, score: s.score, delta: through > 0 && step <= k ? s.score - (prevScore.get(s.p.id) ?? 0) : 0, place: i + 1 })),
      };
    }
    if (aud.role === 'player' && aud.pid) {
      const p = active.find(x => x.id === aud.pid);
      if (p) view.me = { id: p.id, recovery: p.recovery, score: hide ? null : p.score, rank: hide ? null : rankOf.get(p.id) ?? null };
    }
    if (aud.role === 'host') {
      view.host = {
        pin: room.hostPin, recoveries: Object.fromEntries(active.map(p => [p.id, p.recovery])), log: room.log.slice(-40), scoreLog: room.scoreLog.slice(-60),
        tilesLeft: Object.entries(room.tileStatus).filter(([, s]) => s === 'open').map(([id]) => id),
        planNext: this.planNextLabel(room),
      };
    }
    return view;
  }

  liveSet = new Set<string>(); // "ROOM:pid" – von der Verbindungsschicht gepflegt

  /** Programm der festen Show (für TV und Showmaster). */
  agenda(room: Room) {
    const list: NonNullable<View['room']['agenda']> = [];
    room.plan.forEach((s, i) => {
      const state: 'done' | 'now' | 'todo' = room.phase === 'ceremony' || room.phase === 'ended' || i < room.planIdx ? 'done' : i === room.planIdx && room.phase !== 'lobby' && room.phase !== 'intro' ? 'now' : 'todo';
      if (s === 'board') { list.push({ k: 'board', title: this.boardName(room), state }); return; }
      const t = s.startsWith('tile:') ? this.tile(room, s.slice(5)) : undefined;
      if (t) list.push({ k: t.kind === 'tile' ? 'round' : t.kind, title: t.title, icon: t.icon, mode: t.tasks[0]?.mode, tasks: t.tasks.filter(x => !x.practice).length, state });
    });
    return list;
  }
  private roundNumber(room: Room, idx: number): { n: number; of: number } {
    let n = 0, of = 0;
    room.plan.forEach((_, i) => { if (this.stepKind(room, i) === 'round') { of++; if (i <= idx) n++; } });
    return { n, of };
  }
  private actLabel(room: Room): string {
    if (room.flow === 'show') {
      switch (room.phase) {
        case 'lobby': return 'Lobby';
        case 'intro': return 'Eröffnung';
        case 'ceremony': case 'ended': return 'Siegerehrung';
        default: {
          const k = this.stepKind(room, Math.max(0, room.planIdx));
          if (k === 'board') return this.boardName(room);
          if (k === 'final') return 'FINAL LOCK';
          if (k === 'surprise') return 'Überraschungsrunde';
          const r = this.roundNumber(room, room.planIdx); return `Runde ${r.n} von ${r.of}`;
        }
      }
    }
    switch (room.phase) {
      case 'lobby': return 'Lobby';
      case 'intro': return 'Eröffnung';
      case 'ceremony': case 'ended': return 'Siegerehrung';
      default: {
        const step = room.plan[Math.max(0, room.planIdx)];
        const idx = room.planIdx;
        const surprise = room.plan.indexOf('surprise');
        if (room.round && this.curTile(room)?.kind === 'final') return 'Akt 4 – FINAL LOCK';
        if (room.round && this.curTile(room)?.kind === 'surprise') return 'Akt 2 – Überraschungsrunde';
        if (idx < surprise || surprise < 0) return step === 'board' ? this.boardName(room) : 'Akt 1 – Kategorienwand';
        if (idx === surprise) return 'Akt 2 – Überraschungsrunde';
        return 'Akt 3 – Die Jagd';
      }
    }
  }
  /** Einheitliche Bezeichnung der Zwischenstände (Paketregel boardTitle; bei „Zwischenstand nach jeder Runde“ standardmäßig Marktwert-Update). */
  boardName(room: Room): string { const r = this.bk(room).rules; return r?.boardTitle || (r?.boardEveryRound ? 'Marktwert-Update' : 'Zwischenstand'); }
  private planNextLabel(room: Room): string {
    const nxt = room.plan[room.planIdx + 1];
    if (nxt && nxt.startsWith('tile:')) { const t = this.tile(room, nxt.slice(5)); return t ? (t.kind === 'final' ? 'FINAL LOCK' : t.kind === 'surprise' ? 'Überraschungsrunde' : `Runde: ${t.title}`) : 'nächste Runde'; }
    return nxt === 'wall' ? 'Kategorienwand' : nxt === 'board' ? this.boardName(room) : nxt === 'surprise' ? 'Überraschungsrunde' : nxt === 'final' ? 'FINAL LOCK' : 'Siegerehrung';
  }

  private roundView(room: Room, c: Ctx, aud: Audience): RoundView {
    const tile = this.curTile(room)!;
    const r = c.round;
    const mode = MODES[c.task.mode];
    // Fragetext/Daten erst nach dem Start der Aufgabe
    const data = r.stage === 'intro' ? { preview: true } : mode.view(c, aud);
    const reveal = r.stage === 'reveal' ? this.revealView(r.result?.reveal, aud) : null;
    return {
      rid: `${tile.id}#${r.taskIndex}#${r.attempt}`, tileId: tile.id, title: tile.title, topic: tile.topic, icon: tile.icon, color: tile.color, mode: c.task.mode, kind: tile.kind,
      blurb: tile.blurb, taskIndex: r.taskIndex, taskCount: tile.tasks.length, practice: !!c.task.practice,
      scoredIndex: c.task.practice ? 0 : tile.tasks.slice(0, r.taskIndex + 1).filter(x => !x.practice).length, scoredCount: tile.tasks.filter(x => !x.practice).length, stage: r.stage,
      deadline: r.deadline, pausedLeft: r.pausedLeft, stageSeconds: r.stageSeconds,
      points: c.task.mode === 'unique' && c.rules?.uniquePoints ? c.rules.uniquePoints : mode.maxPoints(c.task), data, reveal,
    };
  }
  private revealView(rev: any, _aud: Audience) { return rev ?? null; }
}
