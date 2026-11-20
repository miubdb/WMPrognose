// Show-Builder: ein Spieleabend zusammenstellen wie eine Playlist – Runden und Fragen per Ziehen anordnen,
// Änderungen werden laufend als Entwurf gespeichert (nie automatisch veröffentlicht), geteilte Runden werden vor dem Ändern kopiert (Copy-on-Write).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Mode, ShowStep } from '../../../shared/types';
import { MODE_LABEL, taskMax } from '../../../shared/validate';
import { GAMES } from '../../../shared/games';
import type { Scene } from '../../../shared/scenes';
import { adm, errText } from './api';
import { MODE_ICON, QuestionEditor } from './QuestionEditor';
import { Preview } from './Preview';
import { Sortable } from './Sortable';
import { Badge, Dialog, Empty, SearchBox, Toast, fmtDate, guard, useConfirm, useList, useToast } from './ui';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';
interface CatEdit { taskIds?: string[]; title?: string }
const COLOR: Record<string, string> = { geo: '#14d9c0', match: '#8b5cf6', rank: '#ec4899', glitch: '#38bdf8', estimate: '#f5b82e', link: '#3b82f6', unique: '#fb923c', bluff: '#ef4444', corridor: '#14d9c0', twist: '#8b5cf6', pixel: '#8b5cf6', duel: '#ec4899', arena: '#f5b82e', sound: '#14d9c0', timeline: '#38bdf8', panic: '#22c55e', impostor: '#3b82f6', vote: '#22c55e' };
const MODES_ALL = GAMES.filter(g => g.kind === 'Spiel').map(g => g.mode as Mode);
const KIND_LABEL: Record<string, string> = { tile: 'Runde', surprise: 'Überraschung', final: 'Finale' };
const modeOfCat = (c: any): Mode | null => c.mode ?? (Object.entries(MODE_LABEL).find(([, l]) => l === c.topic)?.[0] as Mode | undefined) ?? null;

/** Fragen aus der Bibliothek wählen – standardmäßig nur passende (Spielmodus der Runde). */
function QuestionPicker({ lib, mode, exclude, multi, onPick, onClose, title }: { lib: any[]; mode: Mode | null; exclude: string[]; multi: boolean; onPick: (ids: string[]) => void; onClose: () => void; title: string }) {
  const [q, setQ] = useState(''); const [topic, setTopic] = useState(''); const [m, setM] = useState<string>(mode ?? ''); const [sel, setSel] = useState<string[]>([]);
  const topics = useMemo(() => [...new Set(lib.map(x => x.topic).filter(Boolean))].sort() as string[], [lib]);
  const list = lib.filter(x => !exclude.includes(x.id) && !x.problems?.length && (!m || x.mode === m) && (!topic || x.topic === topic) && (!q || JSON.stringify(x.task).toLowerCase().includes(q.toLowerCase())));
  const toggle = (id: string) => (multi ? setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id])) : onPick([id]));
  return (
    <Dialog title={title} onClose={onClose} wide actions={multi ? <><button className="btn ghost" onClick={onClose}>Abbrechen</button><button className="btn primary" disabled={!sel.length} onClick={() => onPick(sel)}>{sel.length ? `${sel.length} hinzufügen` : 'Hinzufügen'}</button></> : undefined}>
      <div className="qrow"><SearchBox value={q} onChange={setQ} placeholder="Frage suchen …" />
        <select aria-label="Spielmodus" value={m} onChange={e => setM(e.target.value)}>{mode ? <option value={mode}>Nur {MODE_LABEL[mode]} (passend)</option> : null}<option value="">Alle Spielmodi</option>{MODES_ALL.filter(x => x !== mode).map(x => <option key={x} value={x}>{MODE_LABEL[x]}</option>)}</select>
        <select aria-label="Thema" value={topic} onChange={e => setTopic(e.target.value)}><option value="">Alle Themen</option>{topics.map(t => <option key={t}>{t}</option>)}</select></div>
      <div className="picklist">{list.slice(0, 80).map(x => (
        <button key={x.id} type="button" className={`pickrow2 ${sel.includes(x.id) ? 'sel' : ''}`} onClick={() => toggle(x.id)}>
          <span aria-hidden>{MODE_ICON[x.mode]}</span><span><b style={{ display: 'block' }}>{x.task.prompt || x.task.twisted}</b><small className="muted">{x.topic || MODE_LABEL[x.mode as Mode]} · {taskMax(x.task)} P.{x.usedIn.length ? ` · in ${x.usedIn.length} Runde(n)` : ' · unbenutzt'}</small></span><span>{multi ? (sel.includes(x.id) ? '✓' : '') : 'Wählen'}</span>
        </button>))}
        {!list.length && <Empty icon="🔎" title="Keine passende Frage" text="Andere Suche probieren – oder unten eine neue Frage erstellen." />}
        {list.length > 80 && <p className="muted small" style={{ textAlign: 'center' }}>Nur die ersten 80 – bitte Suche eingrenzen.</p>}</div>
    </Dialog>
  );
}

/** + Spielrunde hinzufügen: Spielmodus wählen → vorhandene Runde nehmen oder neue Runde anlegen. */
function AddRound({ cats, packId, usedCats, hasFinal, count, onClose, onAdd }: { cats: any[]; packId: string; usedCats: string[]; hasFinal: boolean; count: number; onClose: () => void; onAdd: (a: { cat: any; kind: string; pos: number }) => void }) {
  const [kind, setKind] = useState<'tile' | 'surprise' | 'final'>('tile'); const [mode, setMode] = useState<Mode | null>(null); const [title, setTitle] = useState(''); const [pos, setPos] = useState(hasFinal ? count - 1 : count); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [q, setQ] = useState('');
  const existing = cats.filter(c => c.kind === kind && !c.disabled && !usedCats.includes(c.id) && (kind === 'final' || !mode || modeOfCat(c) === mode) && (!q || c.title.toLowerCase().includes(q.toLowerCase())));
  const finalPos = hasFinal ? count - 1 : count;
  const create = async () => {
    if (!mode) return; setBusy(true); setErr(''); const g = GAMES.find(x => x.mode === mode)!;
    const r = await adm('POST', '/categories', { title: (title.trim() || g.name).slice(0, 40), topic: MODE_LABEL[mode], icon: g.icon, color: COLOR[mode] ?? '#8b5cf6', kind, football: false, blurb: g.short.slice(0, 200), taskIds: [] });
    setBusy(false); if (!r.ok) { setErr(errText(r)); return; } onAdd({ cat: r.data, kind, pos: kind === 'final' ? count : pos });
  };
  const maxPos = kind === 'final' ? count : hasFinal ? count - 1 : count;
  return (
    <Dialog title="Spielrunde hinzufügen" onClose={onClose} wide>
      <div className="chipsrow" role="tablist" aria-label="Art der Runde">
        {([['tile', 'Spielrunde'], ['surprise', 'Überraschungsrunde'], ['final', 'Finale']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={kind === k} disabled={k === 'final' && hasFinal} title={k === 'final' && hasFinal ? 'Dieses Paket hat schon ein Finale – es bleibt am Ende.' : undefined} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => { setKind(k); setMode(null); }}>{l}</button>)}
      </div>
      {kind === 'final' ? (
        <>
          <p className="muted small">Das Finale steht immer am Ende. Wähle ein vorhandenes oder lege KICKBASE-KONSENS neu an.</p>
          <div className="picklist">{existing.map(c => <button key={c.id} className="pickrow2" onClick={() => onAdd({ cat: c, kind, pos: count })}><span aria-hidden>{c.icon}</span><span><b>{c.title}</b><small className="muted" style={{ display: 'block' }}>{c.taskCount} Aufgaben{c.usedInPacks.length ? ` · in ${c.usedInPacks.length} Paket(en)` : ''}</small></span><span>Nehmen</span></button>)}</div>
          <button className="btn quiet" disabled={busy} onClick={() => { setMode('vote'); setTitle('KICKBASE-KONSENS'); }}>＋ Neues KICKBASE-KONSENS-Finale</button>
        </>
      ) : !mode ? (
        <>
          <p className="muted small">Welches Spiel soll die {kind === 'surprise' ? 'Überraschungsrunde' : 'Runde'} sein?</p>
          <div className="gamepick">{GAMES.filter(g => g.kind === 'Spiel').map(g => <button key={g.mode} onClick={() => { setMode(g.mode as Mode); setTitle(''); }}><span className="gi" aria-hidden>{g.icon}</span><b>{g.name}</b><small>{g.short}</small></button>)}</div>
        </>
      ) : null}
      {mode && (
        <>
          <div className="row between"><b>{MODE_ICON[mode]} {MODE_LABEL[mode]}</b>{kind !== 'final' && <button className="btn tiny ghost" onClick={() => setMode(null)}>← anderes Spiel</button>}</div>
          {kind !== 'final' && <>
            <SearchBox value={q} onChange={setQ} placeholder="Vorhandene Runde suchen …" />
            <div className="picklist">{existing.map(c => <button key={c.id} className="pickrow2" onClick={() => onAdd({ cat: c, kind, pos })}><span aria-hidden>{c.icon}</span><span><b>{c.title}</b><small className="muted" style={{ display: 'block' }}>{c.taskCount} Frage(n){c.usedInPacks.some((u: any) => u.id !== packId) ? ` · auch in ${c.usedInPacks.filter((u: any) => u.id !== packId).length} anderem Paket (wird vor dem Ändern kopiert)` : ''}</small></span><span>Nehmen</span></button>)}
              {!existing.length && <p className="muted small">Keine freie vorhandene Runde für dieses Spiel.</p>}</div></>}
          <div className="softcard"><b>Neue Runde für {MODE_LABEL[mode]} anlegen</b>
            <label className="field"><span>Name der Runde</span><input value={title} maxLength={40} placeholder={GAMES.find(g => g.mode === mode)?.name} onChange={e => setTitle(e.target.value)} /></label>
            {kind !== 'final' && <label className="field"><span>Position</span><select value={pos} onChange={e => setPos(Number(e.target.value))}>{Array.from({ length: maxPos + 1 }).map((_, i) => <option key={i} value={i}>{i === maxPos ? (hasFinal ? 'am Ende (vor dem Finale)' : 'am Ende') : `an Position ${i + 1}`}</option>)}</select></label>}
            {err && <div className="status bad">{err}</div>}
            <button className="btn primary" disabled={busy} onClick={create}>Neue Runde anlegen</button></div>
        </>
      )}
      <span hidden>{finalPos}</span>
    </Dialog>
  );
}

/** Erweiterte Einstellungen (Länge, Startpunkte, Texte) – bewusst eingeklappt. */
function RulesForm({ p, set, setRule }: { p: any; set: (k: string, v: any) => void; setRule: (k: string, v: string) => void }) {
  return (
    <>
<div className="more rulesbox">
          <label className="field"><span>Beschreibung</span><input value={p.description} maxLength={300} onChange={e => set('description', e.target.value)} /></label>
          <div className="form2">
            <label className="field"><span>Startguthaben</span><input inputMode="numeric" value={p.rules.startCredit} onChange={e => setRule('startCredit', e.target.value)} /></label>
          </div>
          <div className="form2">
            <label className="field"><span>Länge der Show (gewertete Aufgaben je Spielmodus)</span><select value={p.rules.tasksPerMode ?? 4} onChange={e => set('rules', { ...p.rules, tasksPerMode: Number(e.target.value) })}><option value={4}>Kompakte Show – 4 Aufgaben je Spielmodus</option><option value={5}>Längere Show – 5 Aufgaben je Spielmodus</option><option value={6}>Best-of-Show – 6 Aufgaben je Spielmodus (sehr lang, ca. 2,5 Std.)</option></select></label>
          </div>
          <details className="more"><summary>Experten-Einstellungen (meist nicht nötig)</summary>
          <div className="form2">
                        <label className="field"><span>Max. Fußball-Kacheln</span><input inputMode="numeric" value={p.rules.maxFootball} onChange={e => setRule('maxFootball', e.target.value)} /></label>
            <label className="field"><span>Max. Kacheln je Modus</span><input inputMode="numeric" value={p.rules.maxPerMode} onChange={e => setRule('maxPerMode', e.target.value)} /></label>
          </div>
          <div className="form2">
            <label className="field"><span>SORTIER’S! / BLIND RANK – Bedienung</span><select value={p.rules.rankVariant ?? 'task'} onChange={e => set('rules', { ...p.rules, rankVariant: e.target.value })}><option value="task">je Frage festgelegt (Standard: nacheinander)</option><option value="sequence">immer nacheinander (klassisch)</option><option value="sort">immer: SORTIER’S! (fünf Karten auf Plätze ziehen)</option></select></label>
          </div>
          <div className="form2">
            <label className="field"><span>Showtitel (TV-Eröffnung)</span><input value={p.rules.showTitle ?? ''} maxLength={40} placeholder="JANIQUIZITION" onChange={e => set('rules', { ...p.rules, showTitle: e.target.value })} /></label>
            <label className="field"><span>Gewinnerbezeichnung (Siegerehrung)</span><input value={p.rules.winnerTitle ?? ''} maxLength={40} placeholder="JANIQUIZITION-Champion" onChange={e => set('rules', { ...p.rules, winnerTitle: e.target.value })} /></label>
          </div>
          <div className="form2">
            <label className="field"><span>SETZ AUF MICH – (veraltet, wird nicht mehr verwendet: Einsatz = bis 50 % des Punktestands)</span><input value={(p.rules.estimateBets ?? []).join(', ')} placeholder="0, 50, 100" onChange={e => set('rules', { ...p.rules, estimateBets: e.target.value.split(/[ ,;]+/).filter(Boolean).map(Number).filter(n => Number.isFinite(n)) })} /></label>
            <label className="field"><span>EINZIGARTIG: Punkte je einmaliger Antwort (0 = je Frage)</span><input inputMode="numeric" value={p.rules.uniquePoints ?? 0} onChange={e => set('rules', { ...p.rules, uniquePoints: Number(e.target.value) || 0 })} /></label>
            <label className="field"><span>Bonus für die beste Schätzung (Punkte)</span><input inputMode="numeric" value={p.rules.estimateBonus ?? 0} onChange={e => set('rules', { ...p.rules, estimateBonus: Number(e.target.value) || 0 })} /></label>
          </div>
          <div className="card small"><b>Punktebalance SETZ AUF MICH:</b> je Aufgabe Rangpunkte nach Genauigkeit (bis zur Aufgabenpunktzahl, i. d. R. 300) {p.rules.estimateBonus ? <>+ <b>{p.rules.estimateBonus} Bonus</b> für die beste Schätzung (bei Gleichstand für alle Besten)</> : '(kein Bonus)'}; Wetten {(p.rules.estimateBets?.length ? p.rules.estimateBets : [0, 100, 200]).join(' / ')}: Gewinn = Einsatz, Verlust = Einsatz (nie unter 0) – reine Umverteilung. {p.rules.estimateBonus ? `Der Bonus ist größer als der höchste Einsatz (${Math.max(0, ...(p.rules.estimateBets ?? [0]))}) – wer am besten schätzt, gewinnt die Aufgabe, nicht der beste Wetter.` : ''}</div>
          <div className="form2">
            <label className="field"><span>Zeile unter dem Showtitel</span><input value={p.rules.tagline ?? ''} maxLength={80} placeholder="z. B. Dein persönlicher Kickbase-Abend" onChange={e => set('rules', { ...p.rules, tagline: e.target.value })} /></label>
            <label className="field"><span>Zeile unter dem Sieger</span><input value={p.rules.winnerLine ?? ''} maxLength={80} onChange={e => set('rules', { ...p.rules, winnerLine: e.target.value })} /></label>
            <label className="field"><span>Titel der Zwischenstände</span><input value={p.rules.boardTitle ?? ''} maxLength={30} placeholder="Zwischenstand" onChange={e => set('rules', { ...p.rules, boardTitle: e.target.value })} /></label>
          </div>
          </details>
          <p className="muted small">Änderungen gelten für neue Räume, sobald du das Paket neu veröffentlichst; laufende Räume bleiben unverändert.</p>
        </div>
    </>
  );
}

export function PackBuilder({ pack, onClose, bump, onPublished }: { pack: any; onClose: () => void; bump: () => void; onPublished?: () => void }) {
  const [p, setP] = useState<any>(pack); const [edits, setEdits] = useState<Record<string, CatEdit>>({}); const [status, setStatus] = useState<SaveState>('saved'); const [err, setErr] = useState('');
  const [tick, setTick] = useState(0); const [open, setOpen] = useState<string | null>(null); const [ana, setAna] = useState<any>(null); const [vers, setVers] = useState<any[]>([]);
  const { data: catsList } = useList<any>('/categories', 0); const [catsOv, setCatsOv] = useState<any[] | null>(null); const cats: any[] = catsOv ?? catsList; const { data: lib, reload: reloadLib } = useList<any>('/questions?archived=0', 0); const { data: scenes } = useList<Scene>('/scenes', 0);
  const [addRound, setAddRound] = useState(false); const [picker, setPicker] = useState<null | { cat: any; stepI: number; replace?: number }>(null); const [qEdit, setQEdit] = useState<null | { cat: any; stepI: number; id?: string; mode?: Mode; initial?: any }>(null); const [prev, setPrev] = useState<any>(null); const [agenda, setAgenda] = useState(false); const [modePick, setModePick] = useState<null | { cat: any; stepI: number }>(null);
  const [recover, setRecover] = useState<any>(null); const t = useToast(); const { ask, node } = useConfirm();
  const latest = useRef({ p, edits, cats }); latest.current = { p, edits, cats }; const baseRef = useRef<number>(pack.updated); const saving = useRef(false); const tickRef = useRef(0); const key = 'adm.pkdraft.' + pack.id;
  const byId = useMemo(() => new Map(cats.map((c: any) => [c.id, c])), [cats]); const qById = useMemo(() => new Map(lib.map((q: any) => [q.id, q])), [lib]);
  const reloadCats = useCallback(async () => { const r = await adm('GET', '/categories'); if (r.ok) { latest.current.cats = r.data; setCatsOv(r.data); } return r.ok ? (r.data as any[]) : latest.current.cats; }, []);

  // ---- Änderungen markieren, lokal sichern (gegen versehentliches Neuladen) und automatisch als Entwurf speichern
  const touch = () => { tickRef.current++; setStatus(s => (s === 'conflict' ? s : 'dirty')); setTick(x => x + 1); };
  const setPack = (patch: any) => { setP((prev: any) => ({ ...prev, ...patch })); touch(); };
  const setEdit = (cid: string, e: CatEdit) => { setEdits(prev => ({ ...prev, [cid]: { ...prev[cid], ...e } })); touch(); };
  useEffect(() => { guard.dirty = status !== 'saved'; return () => { guard.dirty = false; }; }, [status]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (guard.dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, []);
  useEffect(() => {      // Wiederherstellung nach versehentlichem Neuladen
    try { const raw = localStorage.getItem(key); if (!raw) return; const d = JSON.parse(raw); if (d.base === pack.updated && JSON.stringify(d.p) !== JSON.stringify(pack)) setRecover(d); else localStorage.removeItem(key); } catch { /* */ }
  }, [key, pack]);        // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (r: any) => { if (r.status === 409 && r.data?.details?.recordConflict) { setStatus('conflict'); setErr('Dieses Paket wurde zwischenzeitlich woanders geändert.'); } else { setStatus('error'); setErr(errText(r)); } return false; };
  const flush = useCallback(async (): Promise<boolean> => {
    while (saving.current) await new Promise(r => setTimeout(r, 120));
    if (tickRef.current === 0) return true;
    saving.current = true; setStatus('saving'); const snap = tickRef.current;
    try {
      const { p: cur, edits: ed } = latest.current; let cs = latest.current.cats;
      for (const [cid, e] of Object.entries(ed)) {
        const cat = cs.find((c: any) => c.id === cid); if (!cat) continue;
        const r = await adm('PUT', '/categories/' + cid, { ...cat, ...e, ifUpdated: cat.updated }); if (!r.ok) return fail(r);
        cs = cs.map((c: any) => (c.id === cid ? r.data : c)); latest.current.cats = cs;
      }
      const r = await adm('PUT', '/packs/' + cur.id, { ...cur, ifUpdated: baseRef.current }); if (!r.ok) return fail(r);
      baseRef.current = r.data.updated; await reloadCats();
      if (tickRef.current === snap) { setEdits({}); setP((prev: any) => ({ ...prev, updated: r.data.updated })); setStatus('saved'); setErr(''); tickRef.current = 0; try { localStorage.removeItem(key); } catch { /* */ } }
      else setStatus('dirty');
      adm('GET', `/packs/${cur.id}/analysis`).then(a => a.ok && setAna(a.data));
      return true;
    } finally { saving.current = false; }
  }, [key, reloadCats]);          // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!tick) return; try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), base: baseRef.current, p: latest.current.p, edits: latest.current.edits })); } catch { /* */ }
    if (status === 'conflict') return; const h = setTimeout(() => { flush(); }, 1200); return () => clearTimeout(h);
  }, [tick]);                     // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (status !== 'error') return; const h = setTimeout(() => flush(), 8000); return () => clearTimeout(h); }, [status, flush]);
  useEffect(() => { adm('GET', `/packs/${pack.id}/analysis`).then(a => a.ok && setAna(a.data)); adm('GET', `/packs/${pack.id}/versions`).then(v => v.ok && setVers(v.data)); }, [pack.id]);

  // ---- Runden
  const steps: ShowStep[] = p.show ?? []; const isShow = steps.length > 0;
  const rounds = steps.map((st, i) => ({ st, i })).filter(x => x.st.k !== 'board').map(x => ({ ...x, cat: byId.get((x.st as any).cat) as any }));
  const hasFinal = rounds.some(r => r.st.k === 'final'); const minutes = ana?.show?.minutesExpected;
  const tasksOf = (c: any): string[] => edits[c.id]?.taskIds ?? c.taskIds; const titleOf = (c: any) => edits[c.id]?.title ?? c.title;
  const moveRound = (from: number, to: number) => { const order = rounds.map(r => r.st); const [m] = order.splice(from, 1); order.splice(to, 0, m); let k = 0; setPack({ show: steps.map(s => (s.k === 'board' ? s : order[k++])) }); };
  /** Copy-on-Write: wird die Runde auch in anderen Paketen verwendet, bekommt DIESES Paket vor der ersten Änderung eine eigene Kopie (dieselben Fragen, keine Verdopplung). */
  const ensurePrivate = async (stepI: number): Promise<any> => {
    const st: any = latest.current.p.show[stepI]; const cat = latest.current.cats.find((c: any) => c.id === st.cat) ?? byId.get(st.cat);
    if (!cat.usedInPacks.some((u: any) => u.id !== latest.current.p.id)) return cat;
    const d = await adm('POST', `/categories/${cat.id}/duplicate`, { copyQuestions: false }); if (!d.ok) throw new Error(errText(d));
    const copy = d.data; const u = await adm('PUT', '/categories/' + copy.id, { ...copy, title: cat.title, disabled: false, ifUpdated: copy.updated }); if (!u.ok) throw new Error(errText(u));
    await reloadCats(); setEdits(prev => ({ ...prev, [copy.id]: { taskIds: tasksOf(cat) } }));
    setP((prev: any) => ({ ...prev, show: prev.show.map((s: any, i: number) => (i === stepI ? { ...s, cat: copy.id } : s)) })); touch(); setOpen(copy.id);
    t.show('Diese Runde wird auch in anderen Paketen genutzt – dein Paket arbeitet jetzt mit einer eigenen Kopie. Die anderen Pakete bleiben unverändert.');
    return { ...u.data, usedInPacks: [] };
  };
  const setTasks = async (stepI: number, ids: string[]) => { try { const c = await ensurePrivate(stepI); setEdit(c.id, { taskIds: ids }); } catch (e: any) { t.show('Fehler: ' + e.message); } };
  const removeRound = async (r: any) => { if (!(await ask({ title: `Runde „${titleOf(r.cat)}“ entfernen?`, text: 'Die Runde und ihre Fragen bleiben in der Bibliothek erhalten, sie kommt nur nicht mehr in diesem Paket vor.', confirmLabel: 'Entfernen', danger: true }))) return; setPack({ show: steps.filter((_, i) => i !== r.i) }); };
  const renameRound = async (r: any) => { const v = await ask({ title: 'Runde umbenennen', confirmLabel: 'Umbenennen', input: { label: 'Name der Runde', placeholder: titleOf(r.cat) } }); if (typeof v !== 'string' || !v.trim()) return; try { const c = await ensurePrivate(r.i); setEdit(c.id, { title: v.trim().slice(0, 40) }); } catch (e: any) { t.show('Fehler: ' + e.message); } };
  const doAddRound = async (a: { cat: any; kind: string; pos: number }) => {
    setAddRound(false); await reloadCats(); const step: any = { k: a.kind === 'tile' ? 'round' : a.kind, cat: a.cat.id }; const order = rounds.map(r => r.st); order.splice(a.kind === 'final' ? order.length : a.pos, 0, step);
    let k = 0; const next: ShowStep[] = [];    // Zwischenstände behalten ihre Stellen, die neue Runde kommt an die gewünschte Rundenposition
    order.forEach(o => { while (k < steps.length && steps[k].k === 'board') { next.push(steps[k]); k++; } next.push(o); k++; }); for (; k < steps.length; k++) if (steps[k].k === 'board') next.push(steps[k]);
    setPack({ show: next }); setOpen(a.cat.id); if (!(a.cat.taskCount)) t.show('Runde angelegt – füge jetzt Fragen hinzu.');
  };

  // ---- Fragen in Runden
  const addQuestions = (r: any, ids: string[]) => { setPicker(null); setTasks(r.i, [...tasksOf(r.cat), ...ids]); };
  const editQuestion = async (r: any, id: string) => {
    const q: any = qById.get(id); if (!q) return; const shared = q.usedIn.length > 1 || r.cat.usedInPacks.some((u: any) => u.id !== p.id);
    if (!shared) { setQEdit({ cat: r.cat, stepI: r.i, id, initial: { task: q.task, topic: q.topic, updated: q.updated } }); return; }
    const choice = await ask({ title: 'Diese Frage wird auch anderswo verwendet', confirmLabel: 'Kopie für dieses Paket bearbeiten', text: <><p>Änderungen würden auch andere Runden oder Pakete betreffen.</p><p><b>Empfohlen:</b> Es wird eine Kopie nur für dieses Paket erstellt. Für eine Änderung überall: „Abbrechen“ und die Frage in der Fragenbibliothek bearbeiten.</p></> });
    if (!choice) return; const d = await adm('POST', `/questions/${id}/duplicate`); if (!d.ok) { t.show(errText(d)); return; }
    await reloadLib(); const tasks = tasksOf(r.cat).map(x => (x === id ? d.data.id : x)); await setTasks(r.i, tasks); setQEdit({ cat: r.cat, stepI: r.i, id: d.data.id, initial: { task: d.data.task, topic: d.data.topic, updated: d.data.updated } });
  };
  const newQuestion = (r: any) => { const m = modeOfCat(r.cat); if (m && (r.st.k !== 'final' || m === 'vote')) setQEdit({ cat: r.cat, stepI: r.i, mode: m }); else setModePick({ cat: r.cat, stepI: r.i }); };   // gemischte Finals: Spiel wählen

  // ---- Speichern/Veröffentlichen/Verlassen
  const publish = async () => {
    if (!(await flush())) { t.show('Speichern fehlgeschlagen – es wurde nichts veröffentlicht.'); return; }
    const a = await adm('GET', `/packs/${p.id}/analysis`); const errs: string[] = a.ok ? a.data.errors : [];
    const note = await ask({ title: errs.length ? 'Veröffentlichen nicht möglich' : 'Paket veröffentlichen?', confirmLabel: 'Veröffentlichen',
      text: errs.length ? <><p>Bitte zuerst beheben:</p><ul>{errs.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}</ul></> : <p>Die neue Version ist für zukünftige Shows verfügbar. <b>Bereits gestartete Räume bleiben unverändert.</b> Ältere Versionen bleiben erhalten.</p>,
      input: errs.length ? undefined : { label: 'Notiz zu dieser Version (optional)', placeholder: 'z. B. Neue Runde PIXELPANIK' } });
    if (note === null || errs.length) return;
    const r = await adm('POST', `/packs/${p.id}/publish`, { note: typeof note === 'string' ? note : '' }); if (!r.ok) { t.show(errText(r)); return; }
    const g = await adm('GET', '/packs/' + p.id); if (g.ok) { baseRef.current = g.data.updated; setP((prev: any) => ({ ...prev, ...g.data })); }
    adm('GET', `/packs/${p.id}/versions`).then(v => v.ok && setVers(v.data)); t.show(`Veröffentlicht: Version ${r.data.version} ✓`); bump(); onPublished?.();
  };
  const leave = async () => {
    if (status === 'saved') { onClose(); return; }
    const c = await ask({ title: 'Ungespeicherte Änderungen', confirmLabel: 'Speichern & verlassen', text: status === 'error' || status === 'conflict' ? 'Das Speichern ist fehlgeschlagen. Du kannst trotzdem verlassen – deine Änderungen bleiben in diesem Browser als Wiederherstellung erhalten.' : 'Es gibt Änderungen, die noch nicht gespeichert sind.' });
    if (c === null) return; if (c && (await flush())) { onClose(); return; } if (c) { if (await ask({ title: 'Speichern fehlgeschlagen', text: 'Trotzdem verlassen? Die Änderungen bleiben als lokale Wiederherstellung in diesem Browser erhalten.', confirmLabel: 'Verlassen', danger: true })) onClose(); }
  };
  const saveCopy = async () => { const r = await adm('POST', '/packs', { ...p, name: (p.name + ' (meine Änderungen)').slice(0, 60), id: undefined, updated: undefined }); if (r.ok) { t.show('Deine Fassung wurde als neuer Entwurf gespeichert.'); try { localStorage.removeItem(key); } catch { /* */ } guard.dirty = false; bump(); onClose(); } else t.show(errText(r)); };
  const reloadServer = async () => { try { localStorage.removeItem(key); } catch { /* */ } guard.dirty = false; const g = await adm('GET', '/packs/' + p.id); if (g.ok) { baseRef.current = g.data.updated; setP(g.data); setEdits({}); setStatus('saved'); tickRef.current = 0; setErr(''); reloadCats(); } };
  const setRule = (k: string, v: string) => setPack({ rules: { ...p.rules, [k]: v === '' ? '' : Number(v) } });
  const stateLabel: Record<SaveState, string> = { saved: '✓ Gespeichert', dirty: '● Ungespeichert', saving: '⏳ Speichert …', error: '⚠ Speichern fehlgeschlagen', conflict: '⚠ Konflikt' };
  const dirtySincePublish = p.status === 'published' && vers[0] && (p.updated ?? 0) > (vers[0].created ?? 0);

  return (
    <div className="builder">
      <div className="bhead">
        <button className="btn small quiet" onClick={leave}>← Alle Pakete</button>
        <input className="bname" aria-label="Paketname" value={p.name} maxLength={60} onChange={e => setPack({ name: e.target.value })} />
        <div className="bmeta"><span>{rounds.length} Runden</span>{minutes ? <span>· ca. {minutes} min</span> : null}<span className={`savestate ${status}`} role="status" aria-live="polite">{stateLabel[status]}</span></div>
        <div className="pageact"><button className="btn small quiet" onClick={() => setAgenda(true)}>👀 Vorschau</button><button className="btn small primary" onClick={publish} disabled={status === 'conflict'}>🚀 Veröffentlichen</button></div>
      </div>
      <div className="bmeta"><Badge kind={p.status === 'published' ? 'ok' : p.status === 'archived' ? 'muted' : 'warn'}>{p.status === 'published' ? `Veröffentlicht · v${p.currentVersion}` : p.status === 'archived' ? 'Archiviert' : 'Entwurf'}</Badge>{dirtySincePublish && <Badge kind="info">Entwurf hat Änderungen seit v{vers[0].version} – erst „Veröffentlichen“ macht sie für neue Shows wirksam</Badge>}<span>zuletzt gespeichert {fmtDate(p.updated)}</span></div>
      {recover && <div className="banner"><span>Es gibt ungespeicherte Änderungen aus einer früheren Sitzung ({new Date(recover.ts).toLocaleString('de-DE')}).</span><span className="pageact"><button className="btn small primary" onClick={() => { setP(recover.p); setEdits(recover.edits ?? {}); setRecover(null); touch(); }}>Wiederherstellen</button><button className="btn small quiet" onClick={() => { try { localStorage.removeItem(key); } catch { /* */ } setRecover(null); }}>Verwerfen</button></span></div>}
      {status === 'error' && <div className="banner bad" role="alert"><span>Speichern fehlgeschlagen: {err}. Deine Änderungen bleiben hier erhalten, es wird automatisch erneut versucht.</span><button className="btn small" onClick={() => flush()}>Jetzt erneut versuchen</button></div>}
      {status === 'conflict' && <div className="banner bad" role="alert"><span>{err} Damit nichts überschrieben wird, ist das Speichern pausiert.</span><span className="pageact"><button className="btn small primary" onClick={saveCopy}>Meine Fassung als Kopie sichern</button><button className="btn small quiet" onClick={reloadServer}>Neu laden (meine Änderungen verwerfen)</button></span></div>}

      {!isShow && <div className="softcard"><b>Klassischer Modus (Kategorienwand)</b><p className="muted small">Dieses Paket hat keinen festen Showablauf. Die Runden-Playlist gibt es für Pakete mit festem Ablauf; die klassischen Einstellungen findest du unter „Erweitert“.</p></div>}

      {isShow && <section aria-label="Spielrunden">
        <h3 style={{ margin: '4px 0 8px' }}>Spielrunden <span className="muted small">– am ⠿ anfassen und ziehen (Tastatur: Leertaste, dann Pfeile)</span></h3>
        <Sortable items={rounds} keyOf={r => (r.st as any).cat} label="Runde" locked={r => r.st.k === 'final'} onMove={moveRound} render={(r, handle, st) => {
          const c = r.cat; const isOpen = !!c && open === c.id; const tasks = c ? tasksOf(c) : [];
          return (
            <div className="round" style={{ ['--c' as any]: c?.color ?? '#8b5cf6' }}>
              <div className="rhead">{handle}<span className="rno" aria-hidden>{st.index + 1}</span>
                <button className="rmain" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c?.id ?? null)}>
                  <b>{c ? `${c.icon} ${titleOf(c)}` : '⚠ Runde fehlt'}</b>
                  <span className="meta">{c && modeOfCat(c) && <span>{MODE_ICON[modeOfCat(c)!]} {MODE_LABEL[modeOfCat(c)!]}</span>}<span>· {tasks.length} Frage{tasks.length === 1 ? '' : 'n'}</span>{r.st.k !== 'round' && <Badge kind="info">{KIND_LABEL[r.st.k === 'final' ? 'final' : 'surprise']}</Badge>}{c?.problems?.length > 0 && tasks.length === 0 && <Badge kind="warn">noch keine Fragen</Badge>}</span>
                </button>
                <span aria-hidden className="muted">{isOpen ? '▾' : '▸'}</span>
              </div>
              {isOpen && c && (
                <div className="rbody">
                  <Sortable items={tasks} keyOf={id => id} label="Frage" onMove={(f, to) => { const a = tasks.slice(); const [m] = a.splice(f, 1); a.splice(to, 0, m); setTasks(r.i, a); }} render={(id, h2, qs) => {
                    const q: any = qById.get(id);
                    return (
                      <div className="qitem">{h2}
                        <span className="qtxt"><b>{qs.index + 1}.</b> {q ? (q.task.prompt || q.task.twisted) : <i>(Frage nicht gefunden – bitte entfernen)</i>}{q?.task.practice && <Badge>Probe</Badge>}</span>
                        <div className="qacts"><span className="qm">{q ? `${MODE_LABEL[q.mode as Mode]} · ${taskMax(q.task)} P.${q.usedIn.length > 1 ? ` · in ${q.usedIn.length} Runden` : ''}` : ''}</span><span className="spacer" style={{ flex: 1 }} />
                          {q && <button className="btn tiny" onClick={() => editQuestion(r, id)}>Bearbeiten</button>}
                          {q && <button className="btn tiny quiet" onClick={() => setPrev(q)}>👀 Testen</button>}
                          <button className="btn tiny quiet" onClick={() => setPicker({ cat: c, stepI: r.i, replace: qs.index })}>Ersetzen</button>
                          <button className="btn tiny quiet" onClick={() => { setTasks(r.i, tasks.filter((_, k) => k !== qs.index)); t.show('Entfernt – die Frage bleibt in der Bibliothek.'); }}>Entfernen</button></div>
                      </div>);
                  }} />
                  {!tasks.length && <Empty icon="❓" title="Diese Runde hat noch keine Fragen" text="Wähle vorhandene Fragen oder erstelle eine neue." />}
                  <div className="pageact"><button className="btn primary" onClick={() => setPicker({ cat: c, stepI: r.i })}>＋ Vorhandene Frage auswählen</button><button className="btn quiet" onClick={() => newQuestion(r)}>＋ Neue Frage erstellen</button>
                    <span className="spacer" style={{ flex: 1 }} /><button className="btn small quiet" onClick={() => renameRound(r)}>Umbenennen</button><button className="btn small quiet" onClick={() => removeRound(r)}>Runde entfernen</button></div>
                </div>)}
            </div>);
        }} />
        <p className="muted small" style={{ margin: '6px 0' }}>📊 {p.rules?.boardEveryRound ? 'Nach jeder Runde folgt automatisch ein Zwischenstand.' : 'Zwischenstände stehen an festen Stellen im Ablauf.'} Das Finale bleibt immer am Ende.</p>
        <button className="addround" onClick={() => setAddRound(true)}>＋ Spielrunde hinzufügen</button>
      </section>}

      <details className="softcard more"><summary><b>Erweiterte Einstellungen</b> – Beschreibung, Startpunkte, Länge, Texte</summary><RulesForm p={p} set={(k, v) => setPack({ [k]: v })} setRule={setRule} /></details>
      <details className="softcard more" open={!!ana?.errors?.length}><summary><b>Prüfhinweise</b>{ana ? (ana.errors.length ? ` – ⚠ ${ana.errors.length} Fehler` : ' – ✓ keine Fehler') : ''}</summary>
        {ana?.errors?.length > 0 && <div className="warnbox card"><b>Verhindert die Veröffentlichung:</b><ul>{ana.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></div>}
        {ana?.warnings?.length > 0 && <div><b>Hinweise:</b><ul>{ana.warnings.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></div>}
        {ana?.show && <p className="small">{ana.show.tasksTotal} Aufgaben · erwartet {ana.show.minutesExpected} min (höchstens {ana.show.minutesMax} min) · max. {ana.show.pointsMax.toLocaleString('de-DE')} Punkte</p>}
        <p className="muted small">Die Prüfung bezieht sich auf den zuletzt gespeicherten Stand.</p></details>
      <details className="softcard more"><summary><b>Versionshistorie</b> ({vers.length}) – Entwurf = in Arbeit · Version = für neue Shows wählbar</summary>
        <div className="tablescroll"><table className="scoretab"><tbody>{vers.map(v => <tr key={v.ref}><td><b>v{v.version}</b> {v.current && <Badge kind="ok">aktuell</Badge>}</td><td>{new Date(v.created).toLocaleString('de-DE')}</td><td className="muted">{v.note}</td><td>{v.categories} Runden · {v.questions} Fr.</td>
          <td>{!v.current && <button className="btn tiny quiet" onClick={async () => { if (!(await ask({ title: `Version ${v.version} wieder aktivieren?`, text: 'Neue Shows verwenden dann diese Version. Laufende Räume sind nicht betroffen. Dein Entwurf bleibt unverändert.', confirmLabel: 'Aktivieren' }))) return; const r = await adm('POST', `/packs/${p.id}/rollback`, { version: v.version }); if (r.ok) { setP((prev: any) => ({ ...prev, status: r.data.status, currentVersion: r.data.currentVersion })); adm('GET', `/packs/${p.id}/versions`).then(x => x.ok && setVers(x.data)); t.show(`Version ${v.version} ist jetzt aktuell ✓`); bump(); } else t.show(errText(r)); }}>Aktivieren</button>}</td></tr>)}</tbody></table></div>
        {!vers.length && <p className="muted small">Noch keine Version veröffentlicht.</p>}</details>

      {addRound && <AddRound cats={cats} packId={p.id} usedCats={rounds.map(r => (r.st as any).cat)} hasFinal={hasFinal} count={rounds.length} onClose={() => setAddRound(false)} onAdd={doAddRound} />}
      {picker && <QuestionPicker lib={lib} mode={modeOfCat(picker.cat)} exclude={tasksOf(picker.cat)} multi={picker.replace === undefined} title={picker.replace === undefined ? 'Vorhandene Fragen auswählen' : 'Frage ersetzen'}
        onClose={() => setPicker(null)} onPick={ids => { const r = rounds.find(x => x.i === picker.stepI); if (!r) return; if (picker.replace === undefined) addQuestions(r, ids); else { const a = tasksOf(r.cat).slice(); a[picker.replace] = ids[0]; setPicker(null); setTasks(r.i, a); } }} />}
      {modePick && <Dialog title="Für welches Spiel ist die neue Frage?" wide onClose={() => setModePick(null)}><div className="gamepick">{GAMES.filter(g => g.mode !== 'final-lock').map(g => <button key={g.mode} onClick={() => { const m = modePick; setModePick(null); setQEdit({ cat: m.cat, stepI: m.stepI, mode: g.mode as Mode }); }}><span className="gi">{g.icon}</span><b>{g.name}</b><small>{g.short}</small></button>)}</div></Dialog>}
      {qEdit && <QuestionEditor id={qEdit.id} mode={qEdit.mode} initial={qEdit.initial} scenes={scenes} onClose={() => setQEdit(null)} onSaved={async (q: any) => { const e = qEdit; setQEdit(null); await reloadLib(); if (!e.id) { const r = latest.current.p.show[e.stepI]; const cat = latest.current.cats.find((c: any) => c.id === (r as any).cat); const cur = (edits[cat.id]?.taskIds ?? cat.taskIds); await setTasks(e.stepI, [...cur, q.id]); t.show('Frage gespeichert und zur Runde hinzugefügt ✓'); } else t.show('Frage gespeichert ✓'); }} />}
      {prev && <Preview task={prev.task} onClose={() => setPrev(null)} />}
      {agenda && <Dialog title="Ablauf-Vorschau" wide onClose={() => setAgenda(false)}>
        {status !== 'saved' && <p className="muted small">Zeigt den zuletzt gespeicherten Stand.</p>}
        <ol className="agendalist">{(ana?.show?.rounds ?? []).map((r: any, i: number) => <li key={i}><b>{r.icon} {r.title}</b> <span className="muted">{(r.modes ?? []).map((m: string) => MODE_LABEL[m as Mode]).join(', ')} · {r.tasks} Aufgaben · ca. {r.expectedMin} min</span></li>)}</ol>
        {ana?.show && <p><b>Gesamt:</b> ca. {ana.show.minutesExpected} min erwartet (höchstens {ana.show.minutesMax} min).</p>}
      </Dialog>}
      {node}<Toast msg={t.msg} />
    </div>
  );
}
