// Inhaltsverwaltung: Fragen-Bibliothek, Kategorien, Spielepakete (Entwurf -> Veröffentlichung -> unveränderliche Version), Szenen, Import/Export.
import { randomBytes } from 'node:crypto';
import type { Book, PackRules, TaskDef, TileDef } from '../shared/types';
import { BUDGET, MODES, normalizeCategory, normalizeTask, taskMax, validateCategory, validateTask, type CategoryData } from '../shared/validate';
import { buildScene, validateTemplate, type SceneTemplate } from '../shared/sceneTemplates';
import { analyzeBook } from '../shared/analysis';
import type { Scene } from '../shared/scenes';
import type { Store } from './store';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}
const nid = (p: string) => p + randomBytes(5).toString('hex');
const J = <T>(s: string) => JSON.parse(s) as T;

export interface PackData { name: string; description: string; categoryIds: string[]; surprise: string; final: string; rules: Required<PackRules> }
export const DEFAULT_RULES: Required<PackRules> = { startCredit: 200, maxFootball: 2, maxPerMode: 2 };

export function normalizePack(raw: any): PackData {
  const r = raw ?? {};
  const s = (v: unknown, m: number) => (typeof v === 'string' ? v.trim().slice(0, m) : '');
  const n = (v: unknown, d: number, lo: number, hi: number) => { const x = Math.trunc(Number(v)); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d; };
  return {
    name: s(r.name, 60), description: s(r.description, 300), categoryIds: Array.isArray(r.categoryIds) ? [...new Set<string>(r.categoryIds.map((x: unknown) => s(x, 80)).filter(Boolean))].slice(0, 20) : [],
    surprise: s(r.surprise, 80), final: s(r.final, 80),
    rules: { startCredit: n(r.rules?.startCredit, DEFAULT_RULES.startCredit, 0, 1000), maxFootball: n(r.rules?.maxFootball, DEFAULT_RULES.maxFootball, 0, 20), maxPerMode: n(r.rules?.maxPerMode, DEFAULT_RULES.maxPerMode, 1, 10) },
  };
}

export class ContentService {
  private cache = new Map<string, Book>();
  constructor(private store: Store, private seed: { tiles: TileDef[]; scenes: Record<string, Scene> }, private now: () => number = Date.now) {
    if (!this.setting('seeded')) { this.importBuiltins(); this.setSetting('seeded', '1'); }
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
  /** Importiert die fest codierten Inhalte als bearbeitbare Vorlagen (ohne Vorhandenes zu überschreiben). */
  importBuiltins() {
    const t = this.now();
    this.tx(() => {
      for (const [id, sc] of Object.entries(this.seed.scenes)) this.db.prepare('INSERT OR IGNORE INTO scenes(id,data,builtin,updated) VALUES(?,?,1,?)').run(id, JSON.stringify({ ...sc, builtin: true }), t);
      const ids: string[] = []; let surprise = '', final = '';
      for (const tile of this.seed.tiles) {
        const taskIds: string[] = [];
        tile.tasks.forEach((task, i) => {
          const qid = `${tile.id}-${i + 1}`;
          this.db.prepare('INSERT OR IGNORE INTO questions(id,mode,topic,data,archived,created,updated) VALUES(?,?,?,?,0,?,?)').run(qid, task.mode, tile.topic, JSON.stringify(task), t, t);
          taskIds.push(qid);
        });
        const cat: CategoryData = { title: tile.title, topic: tile.topic, icon: tile.icon, color: tile.color, kind: tile.kind, football: tile.football, blurb: tile.blurb, taskIds };
        this.db.prepare('INSERT OR IGNORE INTO categories(id,data,created,updated) VALUES(?,?,?,?)').run(tile.id, JSON.stringify(cat), t, t);
        if (tile.kind === 'tile') ids.push(tile.id); else if (tile.kind === 'surprise') surprise = tile.id; else final = tile.id;
      }
      if (!this.db.prepare('SELECT 1 FROM packs WHERE id=?').get('standard-1')) {
        const pack: PackData = { name: 'Standardpaket – Abend 1', description: 'Die ursprünglichen OUTPLAY-Inhalte (9 Kategorien, Überraschung, Finale).', categoryIds: ids, surprise, final, rules: { ...DEFAULT_RULES } };
        this.db.prepare("INSERT INTO packs(id,data,status,current_version,created,updated) VALUES('standard-1',?,'draft',NULL,?,?)").run(JSON.stringify(pack), t, t);
        this.publish('standard-1', 'Initiale Vorlage (aus content/tiles.ts)');
      }
    });
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
  createQuestion(raw: { task: any; topic?: string }, id?: string) {
    const task = this.cleanTask(raw.task);
    const qid = id ?? nid('q_'), t = this.now();
    this.db.prepare('INSERT INTO questions(id,mode,topic,data,archived,created,updated) VALUES(?,?,?,?,0,?,?)').run(qid, task.mode, String(raw.topic ?? '').trim().slice(0, 60), JSON.stringify(task), t, t);
    return this.getQuestion(qid);
  }
  updateQuestion(id: string, raw: { task?: any; topic?: string; archived?: boolean }) {
    const cur = this.getQuestion(id);
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
    const budget = BUDGET[c.data.kind];
    if (points > budget) problems.push(`Punkte (${points}) überschreiten das Budget von ${budget}`);
    if (!tasks.length) problems.push('Keine Fragen zugeordnet');
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
    this.getCategory(id);
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
    this.getPack(id);
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
      if (c.points < c.budget && !c.problems.length) warnings.push(`${label}: nur ${c.points} von ${c.budget} Punkten verteilt`);
      tiles.push({ id: c.id, title: c.title, topic: c.topic, icon: c.icon, color: c.color, mode: (tasks[0]?.mode ?? 'geo'), kind, football: c.football, blurb: c.blurb, tasks: JSON.parse(JSON.stringify(tasks)) });
    };
    pack.categoryIds.forEach(id => add(id, 'tile'));
    if (pack.categoryIds.length < 6) errors.push(`Mindestens 6 Kategorien nötig (aktuell ${pack.categoryIds.length}); empfohlen sind 8–9`);
    else if (pack.categoryIds.length < 8) warnings.push('Empfohlen: 8–9 Kategorien, damit die Spieler wirklich wählen können');
    add(pack.surprise, 'surprise'); add(pack.final, 'final');
    const used: Record<string, Scene> = {};
    for (const t of tiles) for (const k of t.tasks) if (k.mode === 'glitch' && scenes[k.scene]) used[k.scene] = scenes[k.scene];
    const book: Book = { tiles, scenes: used, rules: { ...pack.rules } };
    if (!errors.length) {
      const a = analyzeBook(book);
      if (a.combos) {
        if (a.combos.minutesExpected.min < 55 || a.combos.minutesExpected.max > 80) warnings.push(`Erwartete Spieldauer ${a.combos.minutesExpected.min}–${a.combos.minutesExpected.max} min liegt außerhalb des Ziels 60–75 min`);
        if (a.combos.footballShare.max > 0.45) warnings.push(`Fußballanteil kann bis ${(a.combos.footballShare.max * 100).toFixed(0)} % steigen`);
      }
    }
    return { book: errors.length ? null : book, errors, warnings };
  }
  analysis(packId: string) {
    const b = this.buildBook(packId);
    if (b.book) return { ok: true, errors: b.errors, warnings: b.warnings, analysis: analyzeBook(b.book) };
    // Auch bei Fehlern eine Analyse versuchen (ohne harte Validierung)
    return { ok: false, errors: b.errors, warnings: b.warnings, analysis: null };
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
    return this.listPacks().filter(p => p.status === 'published' && p.currentVersion !== null).map(p => ({ id: p.id, name: p.data.name, description: p.data.description, version: p.currentVersion!, ref: `${p.id}@${p.currentVersion}` }));
  }
  defaultRef(): string { return this.listPublished()[0]?.ref ?? 'standard-1@1'; }
  /** Fester Stand für einen Raum (Cache, da unveränderlich). */
  resolveBook(ref: string): Book {
    if (ref === 'legacy' || !ref) ref = 'standard-1@1';
    const hit = this.cache.get(ref); if (hit) return hit;
    const r = this.db.prepare('SELECT book FROM pack_versions WHERE id=?').get(ref) as any;
    if (!r) throw new ApiError(404, 'Paketversion nicht gefunden');
    const b = J<Book>(r.book); this.cache.set(ref, b); return b;
  }
  versionBook(ref: string) { return this.resolveBook(ref); }

  // ------------------------------------------------------------- Import / Export
  export(scope: 'all' | 'questions' | { pack: string }) {
    const out: any = { format: 'outplay-content', version: 1, exportedAt: new Date(this.now()).toISOString() };
    if (scope === 'questions') {
      out.questions = this.listQuestions().map(q => ({ id: q.id, topic: q.topic, task: q.task }));
      out.scenes = this.listScenes().filter(s => !s.builtin);
      return out;
    }
    let catIds: Set<string> | null = null;
    if (typeof scope === 'object') { const p = this.getPack(scope.pack); catIds = new Set([...p.categoryIds, p.surprise, p.final]); out.packs = [{ id: p.id, name: p.name, description: p.description, categoryIds: p.categoryIds, surprise: p.surprise, final: p.final, rules: p.rules }]; }
    else out.packs = this.listPacksView().map(p => ({ id: p.id, name: p.name, description: p.description, categoryIds: p.categoryIds, surprise: p.surprise, final: p.final, rules: p.rules, status: p.status, versions: this.versions(p.id).map(v => ({ ...v, book: this.resolveBook(v.ref) })) }));
    const cats = this.listCategories().filter(c => !catIds || catIds.has(c.id));
    out.categories = cats.map(c => ({ id: c.id, title: c.title, topic: c.topic, icon: c.icon, color: c.color, kind: c.kind, football: c.football, blurb: c.blurb, taskIds: c.taskIds, disabled: !!c.disabled }));
    const qids = new Set(cats.flatMap(c => c.taskIds));
    const qs = this.listQuestions().filter(q => qids.has(q.id));
    out.questions = qs.map(q => ({ id: q.id, topic: q.topic, task: q.task }));
    const sceneIds = new Set(qs.filter(q => q.task.mode === 'glitch').map(q => (q.task as any).scene));
    out.scenes = this.listScenes().filter(s => !s.builtin && sceneIds.has(s.id));
    return out;
  }
  import(data: any, onConflict: 'rename' | 'skip' | 'overwrite' = 'rename') {
    if (!data || data.format !== 'outplay-content' || data.version !== 1) throw new ApiError(422, 'Keine gültige OUTPLAY-Exportdatei (format/version)');
    const res = { scenes: 0, questions: 0, categories: 0, packs: 0, skipped: 0, renamed: 0, errors: [] as string[] };
    const exists = (tbl: string, id: string) => !!this.db.prepare(`SELECT 1 FROM ${tbl} WHERE id=?`).get(id);
    const maps = { s: new Map<string, string>(), q: new Map<string, string>(), c: new Map<string, string>() };
    const resolve = (tbl: string, id: string, prefix: string, map: Map<string, string>): string | null => {
      if (!exists(tbl, id)) { map.set(id, id); return id; }
      if (onConflict === 'skip') { map.set(id, id); res.skipped++; return null; }
      if (onConflict === 'overwrite') { map.set(id, id); return id; }
      const n = nid(prefix); map.set(id, n); res.renamed++; return n;
    };
    this.tx(() => {
      for (const sc of Array.isArray(data.scenes) ? data.scenes : []) {
        if (!sc?.id || !sc.template) { res.errors.push('Szene ohne Vorlage übersprungen'); continue; }
        const errs = validateTemplate(sc.template); if (errs.length) { res.errors.push(`Szene ${sc.id}: ${errs.join('; ')}`); continue; }
        const nidv = resolve('scenes', sc.id, 's_', maps.s); if (!nidv) continue;
        const built = buildScene(nidv, sc.template);
        this.db.prepare('INSERT INTO scenes(id,data,builtin,updated) VALUES(?,?,0,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').run(nidv, JSON.stringify(built), this.now()); res.scenes++;
      }
      for (const q of Array.isArray(data.questions) ? data.questions : []) {
        if (!q?.id || !q.task || !MODES.includes(q.task.mode)) { res.errors.push('Frage ohne gültigen Modus übersprungen'); continue; }
        const qid = resolve('questions', q.id, 'q_', maps.q); if (!qid) continue;
        const task: any = normalizeTask(q.task);
        if (task.mode === 'glitch') task.scene = maps.s.get(task.scene) ?? task.scene;
        const t = this.now();
        this.db.prepare('INSERT INTO questions(id,mode,topic,data,archived,created,updated) VALUES(?,?,?,?,0,?,?) ON CONFLICT(id) DO UPDATE SET mode=excluded.mode, topic=excluded.topic, data=excluded.data, updated=excluded.updated')
          .run(qid, task.mode, String(q.topic ?? '').slice(0, 60), JSON.stringify(task), t, t); res.questions++;
      }
      for (const c of Array.isArray(data.categories) ? data.categories : []) {
        if (!c?.id) continue;
        const cid = resolve('categories', c.id, 'c_', maps.c); if (!cid) continue;
        const cat = normalizeCategory({ ...c, taskIds: (c.taskIds ?? []).map((x: string) => maps.q.get(x) ?? x).filter((x: string) => exists('questions', x)) });
        const t = this.now();
        this.db.prepare('INSERT INTO categories(id,data,created,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').run(cid, JSON.stringify(cat), t, t); res.categories++;
      }
      for (const p of Array.isArray(data.packs) ? data.packs : []) {
        if (!p?.id) continue;
        const pid = resolve('packs', p.id, 'p_', new Map());
        if (!pid) continue;
        const d = normalizePack({ ...p, categoryIds: (p.categoryIds ?? []).map((x: string) => maps.c.get(x) ?? x), surprise: maps.c.get(p.surprise) ?? p.surprise, final: maps.c.get(p.final) ?? p.final });
        if (!d.name) { res.errors.push('Paket ohne Namen übersprungen'); continue; }
        if (exists('packs', pid)) { this.db.prepare('UPDATE packs SET data=?, updated=? WHERE id=?').run(JSON.stringify(d), this.now(), pid); }
        else { const t = this.now(); this.db.prepare("INSERT INTO packs(id,data,status,current_version,created,updated) VALUES(?,?,'draft',NULL,?,?)").run(pid, JSON.stringify(d), t, t); }
        res.packs++;
      }
    });
    return res;
  }
}
