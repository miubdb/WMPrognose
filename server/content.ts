// Inhaltsverwaltung: Fragen-Bibliothek, Kategorien, Spielepakete (Entwurf -> Veröffentlichung -> unveränderliche Version), Szenen, Import/Export.
import { createHash, randomBytes } from 'node:crypto';
import type { Book, Flow, PackRules, ShowStep, TaskDef, TileDef } from '../shared/types';
import { ACTIVE_MODES, FINAL_ONLY_MODES, BUDGET, MODES, normalizeCategory, normalizeTask, taskMax, validateCategory, validateTask, type CategoryData } from '../shared/validate';
import { buildScene, validateTemplate, type SceneTemplate } from '../shared/sceneTemplates';
import { analyzeBook, analyzeShow } from '../shared/analysis';
import type { Scene } from '../shared/scenes';
import type { Store } from './store';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}
const nid = (p: string) => p + randomBytes(5).toString('hex');
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v as object).sort().filter(k => (v as any)[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical((v as any)[k])).join(',') + '}';
  return JSON.stringify(v);
}
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
/** Inhalts-Fingerprint eines Paketstands – unabhängig von IDs (Kategorie-/Szenen-IDs werden durch Inhalt ersetzt). */
export function bookHash(book: Book): string {
  const sceneSig = (id: string) => { const sc = book.scenes?.[id]; return sc ? sha(canonical({ bg: sc.bg, items: sc.items, changes: sc.changes })) : 'missing'; };
  const tiles = book.tiles.map(t => ({ ...t, id: undefined, tasks: t.tasks.map(k => (k.mode === 'glitch' ? { ...k, scene: sceneSig(k.scene) } : k)) }));
  return sha(canonical({ tiles, rules: book.rules ?? {} }));
}
const J = <T>(s: string) => JSON.parse(s) as T;

export interface PackData { name: string; description: string; categoryIds: string[]; surprise: string; final: string; rules: Required<PackRules>; /** fester Showablauf (optional) */ show?: ShowStep[] }
export const DEFAULT_RULES: Required<PackRules> = { startCredit: 200, maxFootball: 2, maxPerMode: 2, rankVariant: 'task', showTitle: 'OUTPLAY', winnerTitle: 'OUTPLAY-Champion', tasksPerMode: 4, estimateBets: [], estimateBonus: 0, tagline: '', winnerLine: '', boardTitle: '', uniquePoints: 0, boardEveryRound: false };

export function normalizePack(raw: any): PackData {
  const r = raw ?? {};
  const s = (v: unknown, m: number) => (typeof v === 'string' ? v.trim().slice(0, m) : '');
  const n = (v: unknown, d: number, lo: number, hi: number) => { const x = Math.trunc(Number(v)); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d; };
  return {
    name: s(r.name, 60), description: s(r.description, 300), categoryIds: Array.isArray(r.categoryIds) ? [...new Set<string>(r.categoryIds.map((x: unknown) => s(x, 80)).filter(Boolean))].slice(0, 20) : [],
    surprise: s(r.surprise, 80), final: s(r.final, 80),
    ...(Array.isArray(r.show) && r.show.length ? { show: r.show.slice(0, 40).map((x: any): ShowStep | null => (x?.k === 'board' ? { k: 'board' } : (x?.k === 'round' || x?.k === 'surprise' || x?.k === 'final') && s(x.cat, 80) ? { k: x.k, cat: s(x.cat, 80) } : null)).filter((x: ShowStep | null): x is ShowStep => !!x) } : {}),
    rules: { startCredit: n(r.rules?.startCredit, DEFAULT_RULES.startCredit, 0, 1000), maxFootball: n(r.rules?.maxFootball, DEFAULT_RULES.maxFootball, 0, 20), maxPerMode: n(r.rules?.maxPerMode, DEFAULT_RULES.maxPerMode, 1, 10), rankVariant: ['task', 'sequence', 'sort'].includes(r.rules?.rankVariant) ? r.rules.rankVariant : DEFAULT_RULES.rankVariant, showTitle: s(r.rules?.showTitle, 40) || DEFAULT_RULES.showTitle, winnerTitle: s(r.rules?.winnerTitle, 40) || DEFAULT_RULES.winnerTitle, tasksPerMode: n(r.rules?.tasksPerMode, DEFAULT_RULES.tasksPerMode, 3, 6),
      estimateBets: Array.isArray(r.rules?.estimateBets) ? [...new Set<number>(r.rules.estimateBets.map((x: unknown) => Math.trunc(Number(x))).filter((x: number) => Number.isFinite(x) && x >= 0 && x <= 1000))].sort((a: number, b: number) => a - b).slice(0, 5) : [],
      estimateBonus: n(r.rules?.estimateBonus, 0, 0, 500), tagline: s(r.rules?.tagline, 80), winnerLine: s(r.rules?.winnerLine, 80), boardTitle: s(r.rules?.boardTitle, 30), uniquePoints: n(r.rules?.uniquePoints, 0, 0, 1000), boardEveryRound: r.rules?.boardEveryRound === true },
  };
}

export interface SeedShow {
  /** Inhaltsstand des Pakets; höher als der in der Datenbank vermerkte Stand → „Aktualisieren“ im Admin veröffentlicht eine neue Version */
  revision?: number;
  pack: { id: string; name: string; description: string; rules?: Partial<PackRules> };
  pool: { id: string; topic: string; task: TaskDef }[];
  rounds: { id: string; title: string; topic: string; icon: string; color: string; kind: 'tile' | 'surprise' | 'final'; football: boolean; blurb: string; taskIds: string[] }[];
  steps: ShowStep[];
}

export class ContentService {
  private cache = new Map<string, Book>();
  constructor(private store: Store, private seed: { tiles: TileDef[]; scenes: Record<string, Scene>; pack?: { id: string; name: string; description: string }; show?: SeedShow; /** weitere mitgelieferte Showpakete (z. B. „Reus 65 Mio“) */ extraShows?: SeedShow[] }, private now: () => number = Date.now) {
    if (!this.setting('seeded')) { this.installSeed(); this.setSetting('seeded', '1'); this.wasSeeded = true; }
  }
  private get db() { return this.store.db; }
  private setting(k: string): string | null { return (this.db.prepare('SELECT value FROM settings WHERE key=?').get(k) as any)?.value ?? null; }
  private setSetting(k: string, v: string) { this.db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, v); }
  private depth = 0;
  tx<T>(fn: () => T): T {
    if (this.depth++ > 0) { try { return fn(); } finally { this.depth--; } }
    this.db.exec('BEGIN');
    try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { this.db.exec('ROLLBACK'); throw e; } finally { this.depth--; }
  }

  // ------------------------------------------------------------- Initiale Vorlagen
  /** Kennung des mitgelieferten Standardpakets (neue Inhalte: standard-2; ältere Datenbanken enthalten noch standard-1). */
  get seedPack() { return this.seed.pack ?? { id: 'standard-2', name: 'Standardpaket – Spieleabend', description: 'Neun Kategorien, Überraschungsrunde und Finale.' }; }
  /** Importiert die fest codierten Inhalte als bearbeitbare Vorlagen (ohne Vorhandenes zu überschreiben). */
  importBuiltins() { this.installSeed(); }

  /**
   * Legt das mitgelieferte Standardpaket an – idempotent und nicht-destruktiv: vorhandene Szenen, Fragen, Kategorien und Pakete
   * mit gleicher ID werden NIE verändert (INSERT OR IGNORE). Mehrfaches Ausführen erzeugt keine Duplikate.
   * Bei archiveOlder werden ältere mitgelieferte Standardpakete archiviert (nicht gelöscht), aber nur beim erstmaligen Anlegen.
   */
  installSeed(opts: { archiveOlder?: boolean } = {}) {
    const t = this.now();
    const report = { alreadyInstalled: false, created: { scenes: 0, questions: 0, categories: 0, packs: 0 }, archived: [] as string[], ref: '', showRef: '', showCreated: false, extraRefs: [] as string[] };
    this.tx(() => {
      const pk = this.seedPack;
      const had = !!this.db.prepare('SELECT 1 FROM packs WHERE id=?').get(pk.id);
      const run = (sql: string, ...args: any[]) => Number((this.db.prepare(sql).run(...args) as any).changes);
      for (const [id, sc] of Object.entries(this.seed.scenes)) report.created.scenes += run('INSERT OR IGNORE INTO scenes(id,data,builtin,updated) VALUES(?,?,1,?)', id, JSON.stringify({ ...sc, builtin: true }), t);
      const ids: string[] = []; let surprise = '', final = '';
      for (const tile of this.seed.tiles) {
        const taskIds: string[] = [];
        tile.tasks.forEach((task, i) => {
          const qid = `${tile.id}-${i + 1}`;
          report.created.questions += run('INSERT OR IGNORE INTO questions(id,mode,topic,data,archived,created,updated) VALUES(?,?,?,?,0,?,?)', qid, task.mode, tile.topic, JSON.stringify(task), t, t);
          taskIds.push(qid);
        });
        const cat: CategoryData = { title: tile.title, topic: tile.topic, icon: tile.icon, color: tile.color, kind: tile.kind, football: tile.football, blurb: tile.blurb, taskIds };
        report.created.categories += run('INSERT OR IGNORE INTO categories(id,data,created,updated) VALUES(?,?,?,?)', tile.id, JSON.stringify(cat), t, t);
        if (tile.kind === 'tile') ids.push(tile.id); else if (tile.kind === 'surprise') surprise = tile.id; else final = tile.id;
      }
      if (!had && this.seed.tiles.length) {
        const pack: PackData = { name: pk.name, description: pk.description, categoryIds: ids, surprise, final, rules: { ...DEFAULT_RULES } };
        this.db.prepare("INSERT INTO packs(id,data,status,current_version,created,updated) VALUES(?,?,'draft',NULL,?,?)").run(pk.id, JSON.stringify(pack), t, t);
        const pub = this.publish(pk.id, 'Mitgeliefertes Standardpaket (aus content/tiles.ts)');
        report.created.packs = 1; report.ref = pub.ref;
        if (opts.archiveOlder) {
          for (const old of this.listPacks()) if (old.id !== pk.id && /^standard-\d+$/.test(old.id) && old.status !== 'archived') { this.setPackStatus(old.id, 'archived'); report.archived.push(old.id); }
        }
      } else if (had) { report.alreadyInstalled = true; const row = this.listPacks().find(p => p.id === pk.id); report.ref = row?.currentVersion ? `${pk.id}@${row.currentVersion}` : ''; }
      // ---- Showpakete (fester Ablauf) + erweiterter Fragenpool: ebenfalls nur ergänzend (INSERT OR IGNORE)
      for (const sh of [this.seed.show, ...(this.seed.extraShows ?? [])]) {
        if (!sh) continue;
        for (const q of sh.pool) report.created.questions += run('INSERT OR IGNORE INTO questions(id,mode,topic,data,archived,created,updated) VALUES(?,?,?,?,0,?,?)', q.id, q.task.mode, q.topic, JSON.stringify(q.task), t, t);
        for (const r of sh.rounds) {
          const cat: CategoryData = { title: r.title, topic: r.topic, icon: r.icon, color: r.color, kind: r.kind, football: r.football, blurb: r.blurb, taskIds: r.taskIds };
          report.created.categories += run('INSERT OR IGNORE INTO categories(id,data,created,updated) VALUES(?,?,?,?)', r.id, JSON.stringify(cat), t, t);
        }
        const exists = !!this.db.prepare('SELECT 1 FROM packs WHERE id=?').get(sh.pack.id);
        if (!exists) {
          const pack: PackData = { name: sh.pack.name, description: sh.pack.description, categoryIds: [], surprise: '', final: '', rules: { ...DEFAULT_RULES, ...(sh.pack.rules ?? {}) } as Required<PackRules>, show: sh.steps };
          this.db.prepare("INSERT INTO packs(id,data,status,current_version,created,updated) VALUES(?,?,'draft',NULL,?,?)").run(sh.pack.id, JSON.stringify(pack), t, t);
          const ref = this.publish(sh.pack.id, 'Mitgeliefertes Showpaket (fester Ablauf)').ref; report.created.packs++; report.showCreated = true; if (sh.revision) this.setSetting('rev:' + sh.pack.id, String(sh.revision));
          if (sh === this.seed.show) report.showRef = ref; else report.extraRefs.push(ref);
        } else { const row = this.listPacks().find(p => p.id === sh.pack.id); const ref = row?.currentVersion ? `${sh.pack.id}@${row.currentVersion}` : ''; if (sh === this.seed.show) report.showRef = ref; }
      }
      if (report.showCreated) report.alreadyInstalled = false;
    });
    return report;
  }
  /** Status für die Admin-Oberfläche: ist das mitgelieferte Standardpaket schon vorhanden? */
  seedStatus() {
    const pk = this.seedPack;
    const row = this.listPacks().find(p => p.id === pk.id);
    const sh = this.seed.show; const shRow = sh ? this.listPacks().find(p => p.id === sh.pack.id) : undefined;
    const qMissing = (x: SeedShow) => x.pool.filter(q => !this.db.prepare('SELECT 1 FROM questions WHERE id=?').get(q.id)).length;
    const extras = (this.seed.extraShows ?? []).map(x => ({ id: x.pack.id, name: x.pack.name, installed: !!this.listPacks().find(p => p.id === x.pack.id) && qMissing(x) === 0 }));
    return { extras, id: pk.id, name: pk.name, installed: !!row && (!sh || (!!shRow && !qMissing(sh))) && extras.every(e => e.installed), classicInstalled: !!row, show: sh ? { id: sh.pack.id, name: sh.pack.name, installed: !!shRow } : null, poolMissing: (sh ? qMissing(sh) : 0) + (this.seed.extraShows ?? []).reduce((a, x) => a + qMissing(x), 0), status: row?.status ?? null, olderPacks: this.listPacks().filter(p => p.id !== pk.id && /^standard-\d+$/.test(p.id) && p.status !== 'archived').map(p => ({ id: p.id, name: p.data.name })) };
  }

  // ------------------------------------------------------------- Szenen
  private sceneRow(r: any): Scene { return J<Scene>(r.data); }
  listScenes(): Scene[] { return (this.db.prepare('SELECT * FROM scenes ORDER BY builtin DESC, id').all() as any[]).map(r => this.sceneRow(r)); }
  getScene(id: string): Scene | null { const r = this.db.prepare('SELECT * FROM scenes WHERE id=?').get(id) as any; return r ? this.sceneRow(r) : null; }
  saveScene(id: string | null, tpl: SceneTemplate): Scene {
    const errors = validateTemplate(tpl);
    if (errors.length) throw new ApiError(422, 'Szene ungültig', errors);
    const existing = id ? this.getScene(id) : null;
    if (id && !existing) throw new ApiError(404, 'Szene nicht gefunden');
    if (existing?.builtin) throw new ApiError(403, 'Mitgelieferte Szenen sind schreibgeschützt (bitte neu aus einer Vorlage erstellen)');
    const sid = id ?? nid('s_');
    const sc = buildScene(sid, tpl);
    this.db.prepare('INSERT INTO scenes(id,data,builtin,updated) VALUES(?,?,0,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').run(sid, JSON.stringify(sc), this.now());
    return sc;
  }
  deleteScene(id: string) {
    const sc = this.getScene(id);
    if (!sc) throw new ApiError(404, 'Szene nicht gefunden');
    if (sc.builtin) throw new ApiError(403, 'Mitgelieferte Szenen können nicht gelöscht werden');
    const used = this.listQuestions().filter(q => q.task.mode === 'glitch' && (q.task as any).scene === id);
    if (used.length) throw new ApiError(409, `Szene wird noch von ${used.length} Frage(n) verwendet`, used.map(q => q.id));
    this.db.prepare('DELETE FROM scenes WHERE id=?').run(id);
  }
  sceneMap(): Record<string, Scene> { return Object.fromEntries(this.listScenes().map(s => [s.id, s])); }

  // ------------------------------------------------------------- Fragen
  private qRow(r: any) {
    const task = J<TaskDef>(r.data);
    const scenes = this.sceneMap();
    return { id: r.id as string, mode: r.mode as string, topic: r.topic as string, archived: !!r.archived, task, updated: r.updated as number, created: r.created as number,
      problems: validateTask(task, id => !!scenes[id]) };
  }
  listQuestions(f: { q?: string; mode?: string; topic?: string; archived?: boolean } = {}) {
    const usage = this.questionUsage();
    const needle = (f.q ?? '').toLowerCase();
    return (this.db.prepare('SELECT * FROM questions ORDER BY updated DESC').all() as any[]).map(r => ({ ...this.qRow(r), usedIn: usage[r.id] ?? [] }))
      .filter(q => (f.archived === undefined ? true : q.archived === f.archived) && (!f.mode || q.mode === f.mode) && (!f.topic || q.topic === f.topic)
        && (!needle || (q.task.prompt + ' ' + q.topic + ' ' + q.id + ' ' + q.task.explain).toLowerCase().includes(needle)));
  }
  getQuestion(id: string) { const r = this.db.prepare('SELECT * FROM questions WHERE id=?').get(id) as any; if (!r) throw new ApiError(404, 'Frage nicht gefunden'); return { ...this.qRow(r), usedIn: this.questionUsage()[id] ?? [] }; }
  private questionUsage(): Record<string, { id: string; title: string }[]> {
    const out: Record<string, { id: string; title: string }[]> = {};
    for (const c of this.listCategoriesRaw()) for (const q of c.data.taskIds) (out[q] ??= []).push({ id: c.id, title: c.data.title });
    return out;
  }
  private cleanTask(raw: any): TaskDef {
    if (!raw || !MODES.includes(raw.mode)) throw new ApiError(422, 'Unbekannter Spielmodus');
    return normalizeTask(raw);
  }
  createQuestion(raw: { task: any; topic?: string }, id?: string, opts: { allowLegacy?: boolean } = {}) {
    const task = this.cleanTask(raw.task);
    if (!opts.allowLegacy && !ACTIVE_MODES.includes(task.mode) && !FINAL_ONLY_MODES.includes(task.mode)) throw new ApiError(422, 'Dieser Spielmodus wird nicht mehr verwendet (CODEBREAK). Bitte einen der sieben aktiven Modi wählen.');
    const qid = id ?? nid('q_'), t = this.now();
    this.db.prepare('INSERT INTO questions(id,mode,topic,data,archived,created,updated) VALUES(?,?,?,?,0,?,?)').run(qid, task.mode, String(raw.topic ?? '').trim().slice(0, 60), JSON.stringify(task), t, t);
    return this.getQuestion(qid);
  }
  /** Optional: ifUpdated = Zeitstempel, den der Client geladen hat. Weicht er ab, wurde der Eintrag zwischenzeitlich geändert -> echter Konflikt. */
  private checkStamp(kind: string, current: number, ifUpdated: unknown) {
    if (ifUpdated !== undefined && ifUpdated !== null && Number(ifUpdated) !== current) throw new ApiError(409, `Dieser Eintrag (${kind}) wurde zwischenzeitlich woanders geändert. Bitte neu laden, damit nichts überschrieben wird.`, { recordConflict: true });
  }
  updateQuestion(id: string, raw: { task?: any; topic?: string; archived?: boolean; ifUpdated?: number }) {
    const cur = this.getQuestion(id);
    this.checkStamp('Frage', cur.updated, raw.ifUpdated);
    const task = raw.task ? this.cleanTask(raw.task) : cur.task;
    if (task.mode !== cur.mode && cur.usedIn.length) throw new ApiError(409, 'Der Spielmodus einer Frage in einer Kategorie kann nicht geändert werden');
    this.db.prepare('UPDATE questions SET mode=?, topic=?, data=?, archived=?, updated=? WHERE id=?').run(task.mode, raw.topic !== undefined ? String(raw.topic).trim().slice(0, 60) : cur.topic, JSON.stringify(task), (raw.archived ?? cur.archived) ? 1 : 0, this.now(), id);
    return this.getQuestion(id);
  }
  duplicateQuestion(id: string) {
    const q = this.getQuestion(id);
    const task = { ...q.task, prompt: (q.task.prompt + ' (Kopie)').slice(0, 300) } as TaskDef;
    return this.createQuestion({ task, topic: q.topic });
  }
  deleteQuestion(id: string) {
    const q = this.getQuestion(id);
    if (q.usedIn.length) throw new ApiError(409, `Die Frage wird in ${q.usedIn.length} Kategorie(n) verwendet: ${q.usedIn.map(u => u.title).join(', ')}`, q.usedIn);
    this.db.prepare('DELETE FROM questions WHERE id=?').run(id);
  }

  // ------------------------------------------------------------- Kategorien
  private listCategoriesRaw(): { id: string; data: CategoryData; updated: number }[] {
    return (this.db.prepare('SELECT * FROM categories ORDER BY created, id').all() as any[]).map(r => ({ id: r.id, data: J<CategoryData>(r.data), updated: r.updated }));
  }
  private catView(c: { id: string; data: CategoryData; updated: number }, qs: Map<string, any>) {
    const tasks = c.data.taskIds.map(id => qs.get(id)).filter(Boolean);
    const problems: string[] = validateCategory(c.data);
    for (const id of c.data.taskIds) if (!qs.has(id)) problems.push(`Frage ${id} existiert nicht mehr`);
    const modes = [...new Set(tasks.map((q: any) => q.mode))];
    if (c.data.kind !== 'final' && modes.length > 1) problems.push('Eine Kategorie darf nur Fragen eines Spielmodus enthalten');
    const points = tasks.reduce((a: number, q: any) => a + taskMax(q.task), 0);
    const betPart = tasks.reduce((a: number, q: any) => a + (q.task.mode === 'estimate' ? Math.max(0, ...q.task.bets) : 0), 0);
    const budget = BUDGET[c.data.kind] + betPart;                 // Wettgewinne sind Umverteilung und zählen nicht zum Rundenbudget
    if (points > budget) problems.push(`Punkte (${points}) überschreiten das Budget von ${budget}`);
    if (!tasks.length) problems.push('Keine Fragen zugeordnet');
    if (modes.includes('codebreak')) problems.push('Enthält CODEBREAK-Fragen – dieser Modus wird nicht mehr verwendet. Bitte durch Fragen eines aktiven Modus ersetzen.');
    return { id: c.id, ...c.data, mode: modes[0] ?? null, taskCount: tasks.length, points, budget, problems, updated: c.updated };
  }
  listCategories() {
    const qs = new Map(this.listQuestions().map(q => [q.id, q]));
    const packs = this.listPacks();
    return this.listCategoriesRaw().map(c => ({ ...this.catView(c, qs), usedInPacks: packs.filter(p => p.data.categoryIds.includes(c.id) || p.data.surprise === c.id || p.data.final === c.id).map(p => ({ id: p.id, name: p.data.name })) }));
  }
  getCategory(id: string) { const c = this.listCategories().find(x => x.id === id); if (!c) throw new ApiError(404, 'Kategorie nicht gefunden'); return c; }
  createCategory(raw: any, id?: string) {
    const c = normalizeCategory(raw); const cid = id ?? nid('c_'), t = this.now();
    this.checkTaskIds(c);
    this.db.prepare('INSERT INTO categories(id,data,created,updated) VALUES(?,?,?,?)').run(cid, JSON.stringify(c), t, t);
    return this.getCategory(cid);
  }
  private checkTaskIds(c: CategoryData) {
    for (const q of c.taskIds) if (!this.db.prepare('SELECT 1 FROM questions WHERE id=?').get(q)) throw new ApiError(422, `Frage ${q} existiert nicht`);
  }
  updateCategory(id: string, raw: any) {
    this.checkStamp('Kategorie', this.getCategory(id).updated, raw?.ifUpdated);
    const c = normalizeCategory(raw); this.checkTaskIds(c);
    this.db.prepare('UPDATE categories SET data=?, updated=? WHERE id=?').run(JSON.stringify(c), this.now(), id);
    return this.getCategory(id);
  }
  duplicateCategory(id: string, copyQuestions = false) {
    const c = this.getCategory(id);
    const taskIds = copyQuestions ? c.taskIds.map(q => this.duplicateQuestion(q).id) : c.taskIds.slice();
    return this.createCategory({ ...c, title: (c.title + ' (Kopie)').slice(0, 40), taskIds, disabled: true });
  }
  deleteCategory(id: string) {
    const c = this.getCategory(id);
    if (c.usedInPacks.length) throw new ApiError(409, `Die Kategorie wird in Paket(en) verwendet: ${c.usedInPacks.map(p => p.name).join(', ')}. Erst dort entfernen.`, c.usedInPacks);
    this.db.prepare('DELETE FROM categories WHERE id=?').run(id);
  }

  // ------------------------------------------------------------- Pakete
  private listPacks() { return (this.db.prepare('SELECT * FROM packs ORDER BY created, id').all() as any[]).map(r => ({ id: r.id as string, data: J<PackData>(r.data), status: r.status as string, currentVersion: r.current_version as number | null, updated: r.updated as number })); }
  listPacksView() {
    return this.listPacks().map(p => ({ id: p.id, ...p.data, status: p.status, currentVersion: p.currentVersion, updated: p.updated,
      versions: (this.db.prepare('SELECT COUNT(*) n FROM pack_versions WHERE pack_id=?').get(p.id) as any).n as number }));
  }
  getPack(id: string) { const p = this.listPacksView().find(x => x.id === id); if (!p) throw new ApiError(404, 'Paket nicht gefunden'); return p; }
  createPack(raw: any, id?: string) {
    const d = normalizePack(raw); const pid = id ?? nid('p_'), t = this.now();
    if (!d.name) throw new ApiError(422, 'Name fehlt');
    this.db.prepare("INSERT INTO packs(id,data,status,current_version,created,updated) VALUES(?,?,'draft',NULL,?,?)").run(pid, JSON.stringify(d), t, t);
    return this.getPack(pid);
  }
  updatePack(id: string, raw: any) {
    this.checkStamp('Paket', this.getPack(id).updated, raw?.ifUpdated);
    const d = normalizePack(raw);
    if (!d.name) throw new ApiError(422, 'Name fehlt');
    this.db.prepare('UPDATE packs SET data=?, updated=? WHERE id=?').run(JSON.stringify(d), this.now(), id);
    return this.getPack(id);
  }
  duplicatePack(id: string) { const p = this.getPack(id); return this.createPack({ ...p, name: (p.name + ' (Kopie)').slice(0, 60) }); }
  setPackStatus(id: string, status: 'archived' | 'draft' | 'published') {
    const p = this.getPack(id);
    if (status === 'published' && p.currentVersion === null) throw new ApiError(409, 'Paket wurde noch nie veröffentlicht');
    this.db.prepare('UPDATE packs SET status=?, updated=? WHERE id=?').run(status, this.now(), id);
    return this.getPack(id);
  }
  deletePack(id: string) {
    const p = this.getPack(id);
    if (p.versions > 0) throw new ApiError(409, 'Veröffentlichte Pakete können nicht gelöscht, nur archiviert werden (laufende Räume verwenden ihre Versionen).');
    this.db.prepare('DELETE FROM packs WHERE id=?').run(id);
  }

  /** Baut den Inhaltsstand aus dem Entwurf und prüft ihn vollständig. */
  buildBook(packId: string): { book: Book | null; errors: string[]; warnings: string[] } {
    const pack = this.getPack(packId);
    const errors: string[] = [], warnings: string[] = [];
    const cats = new Map(this.listCategories().map(c => [c.id, c]));
    const qs = new Map(this.listQuestions().map(q => [q.id, q]));
    const scenes = this.sceneMap();
    const tiles: TileDef[] = [];
    const add = (cid: string, kind: 'tile' | 'surprise' | 'final') => {
      const c = cats.get(cid);
      if (!c) { errors.push(kind === 'tile' ? `Kategorie ${cid} existiert nicht` : `${kind === 'surprise' ? 'Überraschungsrunde' : 'Finale'} fehlt`); return; }
      const label = `„${c.title}“`;
      if (c.disabled) errors.push(`${label} ist deaktiviert`);
      if (c.kind !== kind) errors.push(`${label} hat den Typ „${c.kind}“, erwartet „${kind}“`);
      for (const p of c.problems) errors.push(`${label}: ${p}`);
      const tasks: TaskDef[] = [];
      for (const id of c.taskIds) {
        const q = qs.get(id); if (!q) continue;
        if (q.archived) errors.push(`${label}: Frage „${q.task.prompt.slice(0, 40)}“ ist archiviert`);
        for (const p of q.problems) errors.push(`${label} · „${q.task.prompt.slice(0, 40)}“: ${p}`);
        tasks.push(q.task);
      }
      // Kompakte (4) bzw. längere (5) Show: je regulärem Spielmodus nur die ersten N gewerteten Aufgaben (Proberunden bleiben immer erhalten)
      if ((kind === 'tile' || kind === 'surprise') && pack.show?.length) {
        let reg = 0; const keep: TaskDef[] = [];
        for (const t of tasks) { if (t.practice) keep.push(t); else if (reg < pack.rules.tasksPerMode) { keep.push(t); reg++; } }
        tasks.length = 0; tasks.push(...keep);
      }
      for (const t of tasks) if (t.review) warnings.push(`${label} · „${('prompt' in t ? t.prompt : '').slice(0, 45)}“: Redaktion – ${t.review}`);
      if (c.points < c.budget * 0.8 && !c.problems.length && c.mode !== 'estimate') warnings.push(`${label}: nur ${c.points} von ${c.budget} Punkten verteilt`);
      tiles.push({ id: c.id, title: c.title, topic: c.topic, icon: c.icon, color: c.color, mode: (tasks[0]?.mode ?? 'geo'), kind, football: c.football, blurb: c.blurb, tasks: JSON.parse(JSON.stringify(tasks)) });
    };
    const hasShow = !!pack.show?.length;
    const classic = !hasShow || pack.categoryIds.length > 0 || !!pack.surprise || !!pack.final;   // Wand-Modus ist optional, sobald ein fester Showablauf existiert
    if (classic) {
      pack.categoryIds.forEach(id => add(id, 'tile'));
      if (pack.categoryIds.length < 6) errors.push(`Klassischer Modus: Mindestens 6 Kategorien nötig (aktuell ${pack.categoryIds.length}); empfohlen sind 8–9`);
      else if (pack.categoryIds.length < 8) warnings.push('Empfohlen: 8–9 Kategorien, damit die Spieler wirklich wählen können');
      add(pack.surprise, 'surprise'); add(pack.final, 'final');
    }
    let showSteps: ShowStep[] | undefined;
    if (hasShow) {
      const seenCat = new Set<string>(); let finals = 0, rounds = 0;
      for (const [i, st] of pack.show!.entries()) {
        if (st.k === 'board') continue;
        if (seenCat.has(st.cat)) { errors.push(`Showablauf, Schritt ${i + 1}: Kategorie „${cats.get(st.cat)?.title ?? st.cat}“ kommt doppelt vor`); continue; }
        seenCat.add(st.cat);
        if (st.k === 'final') finals++; else if (st.k === 'round') rounds++;
        if (!tiles.some(t => t.id === st.cat)) add(st.cat, st.k === 'round' ? 'tile' : st.k);
        else if (cats.get(st.cat)?.kind !== (st.k === 'round' ? 'tile' : st.k)) errors.push(`Showablauf, Schritt ${i + 1}: falscher Kategorietyp`);
      }
      if (rounds < 1) errors.push('Showablauf: mindestens eine Runde nötig');
      if (finals !== 1) errors.push('Showablauf: genau ein Finale nötig');
      else if (pack.show![pack.show!.length - 1]?.k !== 'final') errors.push('Showablauf: das Finale muss der letzte Schritt sein');
      showSteps = pack.show!.map(x => ({ ...x }));
    }
    const used: Record<string, Scene> = {};
    for (const t of tiles) for (const k of t.tasks) if (k.mode === 'glitch' && scenes[k.scene]) used[k.scene] = scenes[k.scene];
    const book: Book = { tiles, scenes: used, rules: { ...pack.rules }, ...(showSteps ? { show: showSteps, classic } : {}) };
    if (!errors.length && classic) {
      const a = analyzeBook(book);
      if (a.combos) {
        if (a.combos.minutesExpected.min < 55 || a.combos.minutesExpected.max > 80) warnings.push(`Erwartete Spieldauer ${a.combos.minutesExpected.min}–${a.combos.minutesExpected.max} min liegt außerhalb des Ziels 60–75 min`);
        if (a.combos.footballShare.max > 0.45) warnings.push(`Fußballanteil kann bis ${(a.combos.footballShare.max * 100).toFixed(0)} % steigen`);
      }
    }
    if (!errors.length && showSteps) {
      const sa = analyzeShow(book)!;
      if (sa.modesMissing.length) warnings.push(`Nicht jeder Spielmodus kommt im Showablauf vor (fehlt: ${sa.modesMissing.join(', ')})`);
      const probes = book.tiles.reduce((a, t) => a + t.tasks.filter(x => x.practice).length, 0);
        if (sa.minutesExpected < 60 || sa.minutesExpected > 120) warnings.push(`Erwartete Spieldauer ${sa.minutesExpected} min (höchstens ${sa.minutesMax} min) – für einen Spieleabend ungewöhnlich lang/kurz`);
        else if (sa.minutesExpected > 95) warnings.push(`Erwartete Spieldauer ${sa.minutesExpected} min, davon ca. ${Math.round(probes * 2.3)} min für ${probes} Proberunden (überspringbar). Ohne Proben ca. ${Math.round(sa.minutesExpected - probes * 2.3)} min.`);
      if (showSteps[showSteps.length - 2]?.k !== 'board') warnings.push('Empfohlen: vor dem Finale einen „Zwischenstand“-Schritt');
    }
    return { book: errors.length ? null : book, errors, warnings };
  }
  analysis(packId: string) {
    const b = this.buildBook(packId);
    if (b.book) return { ok: true, errors: b.errors, warnings: b.warnings, analysis: b.book.show && !(b.book.tiles.filter(t => t.kind === 'tile').length >= 6 && b.book.tiles.some(t => t.kind === 'surprise')) ? null : analyzeBook(b.book), show: analyzeShow(b.book) };
    // Auch bei Fehlern eine Analyse versuchen (ohne harte Validierung)
    return { ok: false, errors: b.errors, warnings: b.warnings, analysis: null, show: null };
  }
  publish(packId: string, note = '') {
    const { book, errors, warnings } = this.buildBook(packId);
    if (!book) throw new ApiError(422, 'Paket kann nicht veröffentlicht werden', errors);
    const last = (this.db.prepare('SELECT MAX(version) v FROM pack_versions WHERE pack_id=?').get(packId) as any).v as number | null;
    const version = (last ?? 0) + 1, ref = `${packId}@${version}`;
    book.ref = ref;
    this.tx(() => {
      this.db.prepare('INSERT INTO pack_versions(id,pack_id,version,note,book,created) VALUES(?,?,?,?,?,?)').run(ref, packId, version, String(note).slice(0, 200), JSON.stringify(book), this.now());
      this.db.prepare("UPDATE packs SET status='published', current_version=?, updated=? WHERE id=?").run(version, this.now(), packId);
    });
    return { ref, version, warnings };
  }
  versions(packId: string) {
    const p = this.getPack(packId);
    return (this.db.prepare('SELECT id,version,note,created,book FROM pack_versions WHERE pack_id=? ORDER BY version DESC').all(packId) as any[])
      .map(r => { const b = J<Book>(r.book); return { ref: r.id as string, version: r.version as number, note: r.note as string, created: r.created as number, current: r.version === p.currentVersion, categories: b.tiles.filter(t => t.kind === 'tile').length, questions: b.tiles.reduce((a, t) => a + t.tasks.length, 0) }; });
  }
  rollback(packId: string, version: number) {
    this.getPack(packId);
    if (!this.db.prepare('SELECT 1 FROM pack_versions WHERE id=?').get(`${packId}@${version}`)) throw new ApiError(404, 'Version nicht gefunden');
    this.db.prepare("UPDATE packs SET current_version=?, status='published', updated=? WHERE id=?").run(version, this.now(), packId);
    return this.getPack(packId);
  }
  /** Veröffentlichte, für neue Räume wählbare Pakete (öffentlich, ohne Lösungen). */
  listPublished() {
    return this.listPacks().filter(p => p.status === 'published' && p.currentVersion !== null).map(p => ({ id: p.id, name: p.data.name, description: p.data.description, version: p.currentVersion!, ref: `${p.id}@${p.currentVersion}`, ...this.flowsOf(`${p.id}@${p.currentVersion}`) }));
  }
  /**
   * Paketbereinigung: nur show-5 (Haupt), show-4z (Finale KICKBASE-KONSENS) und show-3 (Backup) bleiben aktiv.
   * Alle anderen Pakete werden archiviert (nie gelöscht). Bereits archivierte Pakete bleiben archiviert.
   * Die Best-of-Pakete bekommen – falls nötig – eine NEUE Version mit „Marktwert-Update nach jeder Runde“;
   * laufende/beendete Räume behalten ihren bisherigen Stand.
   */
  static readonly KEEP_PACKS = ['show-4z', 'show-5', 'show-3'];
  static readonly REFRESH_PACKS = ['show-4z', 'show-5'];
  static readonly MAIN_PACK = 'show-4z';
  private seedShow(id: string) { return (this.seed.extraShows ?? []).find(x => x.pack.id === id); }
  private revisionOf(id: string) { return Number(this.setting('rev:' + id) ?? 0); }
  cleanupPlan() {
    const packs = this.listPacks();
    const rows = packs.map(p => {
      const keep = ContentService.KEEP_PACKS.includes(p.id);
      const action: 'archive' | 'keep' | 'archived' | 'keep-archived' = keep ? (p.status === 'archived' ? 'keep-archived' : 'keep') : (p.status === 'archived' ? 'archived' : 'archive');
      let needsUpdate = false;
      if (keep && p.status !== 'archived' && ContentService.REFRESH_PACKS.includes(p.id)) {
        const sh = this.seedShow(p.id);
        const ref = p.currentVersion !== null ? `${p.id}@${p.currentVersion}` : '';
        let boards = false; try { boards = !!ref && this.resolveBook(ref).rules?.boardEveryRound === true; } catch { boards = false; }
        needsUpdate = !boards || (!!sh?.revision && this.revisionOf(p.id) < sh.revision);
      }
      const sh = this.seedShow(p.id);
      const needsRename = keep && p.status !== 'archived' && p.id === 'show-3' && p.data.name !== ContentService.BACKUP_NAME;
      return { id: p.id, name: p.data.name, status: p.status, version: p.currentVersion, action, needsUpdate, needsRename, revision: sh?.revision ?? null };
    });
    const archive = rows.filter(r => r.action === 'archive').map(r => r.id);
    const update = rows.filter(r => r.needsUpdate).map(r => r.id);
    const rename = rows.filter(r => r.needsRename).map(r => r.id);
    const missing = ContentService.KEEP_PACKS.filter(id => !packs.some(p => p.id === id));
    return { rows, archive, update, rename, missing, clean: !archive.length && !update.length && !rename.length, main: ContentService.MAIN_PACK };
  }
  static readonly BACKUP_NAME = 'Reus 65 Mio (Backup, alt)';
  /** Veröffentlicht den aktuellen Inhaltsstand (Fragen, Ablauf, Regeln) eines mitgelieferten Pakets als NEUE Version desselben Pakets. */
  private refreshFromSeed(id: string, note: string) {
    const sh = this.seedShow(id); if (!sh) throw new ApiError(404, 'Kein mitgeliefertes Paket: ' + id);
    this.installSeed();   // ergänzt nur fehlende Fragen/Kategorien (INSERT OR IGNORE), verändert nichts Vorhandenes
    const p = this.getPack(id);
    this.updatePack(id, { name: sh.pack.name, description: sh.pack.description, categoryIds: [], surprise: '', final: '', show: sh.steps,
      rules: { ...DEFAULT_RULES, ...(sh.pack.rules ?? {}), tasksPerMode: p.rules.tasksPerMode, boardEveryRound: true } });
    const r = this.publish(id, note);
    if (sh.revision) this.setSetting('rev:' + id, String(sh.revision));
    return r.ref;
  }
  cleanupApply() {
    const plan = this.cleanupPlan();
    const archived: string[] = [], updated: string[] = [], renamed: string[] = [];
    this.tx(() => {
      for (const id of plan.archive) { this.setPackStatus(id, 'archived'); archived.push(id); }
      for (const id of plan.update) updated.push(this.refreshFromSeed(id, 'Praxistest 4: aktualisierter Inhalt (neue Version, kein neues Paket)'));
      for (const id of plan.rename) { const p = this.getPack(id); this.updatePack(id, { ...p, name: ContentService.BACKUP_NAME, ifUpdated: undefined }); renamed.push(id); }
    });
    return { archived, updated, renamed, plan: this.cleanupPlan() };
  }
  /** Welche Ablaufmodelle ein veröffentlichter Stand unterstützt. */
  flowsOf(ref: string): { show: boolean; classic: boolean } {
    try { const b = this.resolveBook(ref); return { show: !!b.show?.length, classic: b.show?.length ? !!b.classic : true }; }
    catch { return { show: false, classic: true }; }
  }
    defaultRef(): string { const l = this.listPublished(); return (l.find(x => x.id === ContentService.MAIN_PACK) ?? l.find(x => x.id === 'show-5') ?? l[0])?.ref ?? this.legacyRef(); }
  /** Ältere Räume ohne Paketangabe (bookId 'legacy') laufen mit dem ersten mitgelieferten Stand, der in dieser Datenbank existiert. */
  private legacyRef(): string { for (const id of ['standard-1', 'standard-2']) if (this.db.prepare('SELECT 1 FROM pack_versions WHERE id=?').get(id + '@1')) return id + '@1'; return this.seedPack.id + '@1'; }
  /** Fester Stand für einen Raum (Cache, da unveränderlich). */
  resolveBook(ref: string): Book {
    if (ref === 'legacy' || !ref) ref = this.legacyRef();
    const hit = this.cache.get(ref); if (hit) return hit;
    const r = this.db.prepare('SELECT book FROM pack_versions WHERE id=?').get(ref) as any;
    if (!r) throw new ApiError(404, 'Paketversion nicht gefunden');
    const b = J<Book>(r.book); this.cache.set(ref, b); return b;
  }
  versionBook(ref: string) { return this.resolveBook(ref); }

  // ------------------------------------------------------------- Import / Export (Format v2)
  /** wasSeeded: true, wenn beim Start die initialen Vorlagen importiert wurden (Online-Adapter muss dann speichern). */
  wasSeeded = false;

  export(scope: 'all' | 'questions' | { pack: string }) {
    const out: any = { format: 'outplay-content', version: 2, app: 'OUTPLAY', exportedAt: new Date(this.now()).toISOString() };
    const wantScenes = (qs: { task: TaskDef }[]) => {
      const ids = new Set(qs.filter(q => q.task.mode === 'glitch').map(q => (q.task as any).scene));
      return this.listScenes().filter(s => ids.has(s.id) || (!s.builtin && scope !== 'all' && scope === 'questions')).map(s => ({ id: s.id, title: s.title, builtin: !!s.builtin, template: s.template ?? null, data: { id: s.id, title: s.title, bg: s.bg, items: s.items, changes: s.changes } }));
    };
    if (scope === 'questions') {
      const qs = this.listQuestions();
      out.questions = qs.map(q => ({ id: q.id, topic: q.topic, archived: q.archived, task: q.task }));
      out.scenes = this.listScenes().map(s => ({ id: s.id, title: s.title, builtin: !!s.builtin, template: s.template ?? null, data: { id: s.id, title: s.title, bg: s.bg, items: s.items, changes: s.changes } })).filter(s => !s.builtin || qs.some(q => (q.task as any).scene === s.id));
    } else {
      let catIds: Set<string> | null = null;
      const packRow = (p: any, withVersions: boolean) => ({ id: p.id, name: p.name, description: p.description, categoryIds: p.categoryIds, surprise: p.surprise, final: p.final, rules: p.rules, ...(p.show ? { show: p.show } : {}), status: p.status, currentVersion: p.currentVersion,
        ...(p.currentVersion ? (() => { const b = this.resolveBook(`${p.id}@${p.currentVersion}`); return { book: b, bookHash: bookHash(b) }; })() : {}),
        ...(withVersions ? { versions: this.versions(p.id).map(v => ({ ...v, book: this.resolveBook(v.ref), bookHash: bookHash(this.resolveBook(v.ref)) })) } : {}) });
      if (typeof scope === 'object') { const p = this.getPack(scope.pack); catIds = new Set([...p.categoryIds, p.surprise, p.final, ...(p.show ?? []).flatMap(x => (x.k === 'board' ? [] : [x.cat]))].filter(Boolean)); out.packs = [packRow(p, false)]; }
      else out.packs = this.listPacksView().map(p => packRow(p, true));
      const cats = this.listCategories().filter(c => !catIds || catIds.has(c.id));
      out.categories = cats.map(c => ({ id: c.id, title: c.title, topic: c.topic, icon: c.icon, color: c.color, kind: c.kind, football: c.football, blurb: c.blurb, taskIds: c.taskIds, disabled: !!c.disabled }));
      const qids = new Set(cats.flatMap(c => c.taskIds));
      const qs = this.listQuestions().filter(q => qids.has(q.id));
      out.questions = qs.map(q => ({ id: q.id, topic: q.topic, archived: q.archived, task: q.task }));
      out.scenes = wantScenes(qs);
    }
    out.counts = { questions: out.questions.length, categories: out.categories?.length ?? 0, scenes: out.scenes.length, packs: out.packs?.length ?? 0 };
    out.checksum = sha(canonical({ q: out.questions, c: out.categories ?? [], s: out.scenes, p: (out.packs ?? []).map((p: any) => ({ ...p, versions: undefined })) }));
    return out;
  }

  /**
   * Import mit Konfliktbehandlung. Identische Inhalte (gleiche ID + gleicher Inhalt) werden wiederverwendet – nie doppelt angelegt.
   * onConflict bei gleicher ID mit ANDEREM Inhalt: rename (Kopie mit neuer ID, Standard), skip, overwrite.
   * dryRun: nichts wird gespeichert (Trockenlauf); publish: Pakete prüfen und lokal veröffentlichen (mit Inhaltsvergleich).
   */
  import(data: any, onConflict: 'rename' | 'skip' | 'overwrite' = 'rename', opts: { dryRun?: boolean; publish?: boolean } = {}) {
    if (!data || data.format !== 'outplay-content' || ![1, 2].includes(data.version)) throw new ApiError(422, 'Keine gültige OUTPLAY-Exportdatei (format/version)');
    type St = { created: number; identical: number; renamed: number; overwritten: number; skipped: number };
    const mk = (): St => ({ created: 0, identical: 0, renamed: 0, overwritten: 0, skipped: 0 });
    const res: any = { dryRun: !!opts.dryRun, onConflict, scenes: mk(), questions: mk(), categories: mk(), packs: mk(), errors: [] as string[], warnings: [] as string[], packResults: [] as any[], idMap: {} as Record<string, Record<string, string>> };
    // Rückwärtskompatible Kurzfelder
    const finish = () => { res.questionsCount = res.questions.created + res.questions.renamed + res.questions.overwritten; };
    const get = (tbl: string, id: string): any => this.db.prepare(`SELECT * FROM ${tbl} WHERE id=?`).get(id);
    const maps = { s: new Map<string, string>(), q: new Map<string, string>(), c: new Map<string, string>(), p: new Map<string, string>() };
    const sigOf = (kind: 's' | 'q' | 'c' | 'p', row: any): string => {
      if (!row) return '';
      if (kind === 's') { const sc = J<Scene>(row.data); return canonical({ bg: sc.bg, items: sc.items, changes: sc.changes }); }
      if (kind === 'q') return canonical({ task: J(row.data), topic: row.topic });
      if (kind === 'c') return canonical({ ...J<any>(row.data) });
      return canonical(J<any>(row.data));
    };
    const place = (kind: 's' | 'q' | 'c' | 'p', tbl: string, prefix: string, id: string, sig: string, st: St): string | null => {
      const ex = get(tbl, id);
      const map = maps[kind];
      if (!ex) { map.set(id, id); st.created++; return id; }
      if (sigOf(kind, ex) === sig || (kind === 's' && J<Scene>(ex.data).builtin)) { map.set(id, id); st.identical++; return null; }
      if (onConflict === 'skip') { map.set(id, id); st.skipped++; return null; }
      if (onConflict === 'overwrite') { map.set(id, id); st.overwritten++; return id; }
      const n = nid(prefix); map.set(id, n); st.renamed++; return n;
    };
    const t0 = this.now();
    const run = () => {
      // ---- Szenen: bevorzugt aus Vorlage, sonst aus gespeicherten Szenendaten
      for (const sc of Array.isArray(data.scenes) ? data.scenes : []) {
        if (!sc?.id) { res.errors.push('Szene ohne ID übersprungen'); continue; }
        let built: Scene | null = null;
        const tpl = sc.template ?? sc.data?.template;
        if (tpl) { const errs = validateTemplate(tpl); if (errs.length) { res.errors.push(`Szene ${sc.id}: ${errs.join('; ')}`); continue; } built = buildScene(sc.id, tpl); }
        else if (sc.data && Array.isArray(sc.data.items) && typeof sc.data.bg === 'string' && sc.data.changes && typeof sc.data.changes === 'object') built = { id: sc.id, title: String(sc.data.title ?? sc.title ?? sc.id).slice(0, 40), bg: sc.data.bg, items: sc.data.items, changes: sc.data.changes };
        else if (sc.items && sc.bg) built = { id: sc.id, title: String(sc.title ?? sc.id).slice(0, 40), bg: sc.bg, items: sc.items, changes: sc.changes ?? {} };
        if (!built) { res.errors.push(`Szene ${sc.id}: weder Vorlage noch Szenendaten vorhanden`); continue; }
        const id = place('s', 'scenes', 's_', sc.id, canonical({ bg: built.bg, items: built.items, changes: built.changes }), res.scenes);
        if (!id) continue;
        const fin = { ...built, id, ...(tpl ? { template: tpl } : {}) } as Scene;
        if (tpl) Object.assign(fin, buildScene(id, tpl));
        this.db.prepare('INSERT INTO scenes(id,data,builtin,updated) VALUES(?,?,0,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').run(id, JSON.stringify(fin), this.now());
      }
      // ---- Fragen
      for (const q of Array.isArray(data.questions) ? data.questions : []) {
        if (!q?.id || !q.task || !MODES.includes(q.task.mode)) { res.errors.push(`Frage ${q?.id ?? '?'}: ungültiger Spielmodus`); continue; }
        const task: any = normalizeTask(q.task);
        if (task.mode === 'glitch') task.scene = maps.s.get(task.scene) ?? task.scene;
        const topic = String(q.topic ?? '').slice(0, 60);
        const id = place('q', 'questions', 'q_', q.id, canonical({ task, topic }), res.questions);
        if (!id) continue;
        const t = this.now();
        this.db.prepare('INSERT INTO questions(id,mode,topic,data,archived,created,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET mode=excluded.mode, topic=excluded.topic, data=excluded.data, updated=excluded.updated')
          .run(id, task.mode, topic, JSON.stringify(task), q.archived ? 1 : 0, t, t);
      }
      // ---- Kategorien (Verknüpfungen auf Fragen werden umgeschrieben)
      for (const c of Array.isArray(data.categories) ? data.categories : []) {
        if (!c?.id) continue;
        const taskIds = (c.taskIds ?? []).map((x: string) => maps.q.get(x) ?? x);
        const missing = taskIds.filter((x: string) => !get('questions', x));
        if (missing.length) res.warnings.push(`Kategorie „${c.title}“: ${missing.length} Frage(n) fehlen und wurden nicht verknüpft`);
        const cat = normalizeCategory({ ...c, taskIds: taskIds.filter((x: string) => !missing.includes(x)) });
        const id = place('c', 'categories', 'c_', c.id, canonical(cat), res.categories);
        if (!id) continue;
        const t = this.now();
        this.db.prepare('INSERT INTO categories(id,data,created,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').run(id, JSON.stringify(cat), t, t);
      }
      // ---- Pakete
      for (const p of Array.isArray(data.packs) ? data.packs : []) {
        if (!p?.id) continue;
        const d = normalizePack({ ...p, categoryIds: (p.categoryIds ?? []).map((x: string) => maps.c.get(x) ?? x), surprise: maps.c.get(p.surprise) ?? p.surprise, final: maps.c.get(p.final) ?? p.final,
          show: Array.isArray(p.show) ? p.show.map((x: any) => (x?.k === 'board' ? x : { ...x, cat: maps.c.get(x?.cat) ?? x?.cat })) : undefined });
        if (!d.name) { res.errors.push(`Paket ${p.id}: Name fehlt`); continue; }
        const placed = place('p', 'packs', 'p_', p.id, canonical(d), res.packs);
        const pid: string = placed ?? maps.p.get(p.id) ?? p.id;           // identisch/übersprungen: vorhandenes Paket weiterverwenden
        if (placed && placed !== p.id) d.name = (d.name + ' (Import)').slice(0, 60);
        if (placed) {
          if (!get('packs', pid)) { const t = this.now(); this.db.prepare("INSERT INTO packs(id,data,status,current_version,created,updated) VALUES(?,?,'draft',NULL,?,?)").run(pid, JSON.stringify(d), t, t); }
          else this.db.prepare('UPDATE packs SET data=?, updated=? WHERE id=?').run(JSON.stringify(d), this.now(), pid);
        }
        const result: any = { sourceId: p.id, id: pid, name: d.name, published: false, errors: [] as string[], warnings: [] as string[], expectedHash: p.bookHash ?? null };
        if (opts.publish) {
          const b = this.buildBook(pid);
          result.errors = b.errors; result.warnings = b.warnings;
          if (b.book) {
            const h = bookHash(b.book);
            const cur = this.getPack(pid);
            const curHash = cur.currentVersion ? bookHash(this.resolveBook(`${pid}@${cur.currentVersion}`)) : null;
            if (curHash === h) { result.published = true; result.ref = `${pid}@${cur.currentVersion}`; result.note = 'unverändert (bereits veröffentlicht)'; }
            else { const pub = this.publish(pid, `Import ${new Date(t0).toISOString().slice(0, 16)}`); result.published = true; result.ref = pub.ref; }
            result.actualHash = h; result.match = p.bookHash ? p.bookHash === h : null;
          }
        } else {
          const an = this.buildBook(pid); result.errors = an.errors; result.warnings = an.warnings;
        }
        res.packResults.push(result);
      }
      res.idMap = { scenes: Object.fromEntries(maps.s), questions: Object.fromEntries(maps.q), categories: Object.fromEntries(maps.c), packs: Object.fromEntries(maps.p) };
    };
    if (data.checksum) {
      const sum = sha(canonical({ q: data.questions ?? [], c: data.categories ?? [], s: data.scenes ?? [], p: (data.packs ?? []).map((p: any) => ({ ...p, versions: undefined })) }));
      if (data.version === 2 && sum !== data.checksum) res.warnings.push('Die Prüfsumme der Datei stimmt nicht – die Datei wurde nach dem Export verändert oder ist beschädigt.');
    }
    const ROLLBACK = Symbol('rollback');
    try {
      this.tx(() => { run(); if (opts.dryRun) throw ROLLBACK; });
    } catch (e) { if (e !== ROLLBACK) throw e; }
    this.cache.clear();
    finish();
    return res;
  }
}
