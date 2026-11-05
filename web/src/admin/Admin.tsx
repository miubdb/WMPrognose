import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Mode } from '../../../shared/types';
import { MODES, MODE_LABEL, taskMax } from '../../../shared/validate';
import type { Scene } from '../../../shared/scenes';
import { adm, download, errText } from './api';
import { MODE_ICON, QuestionEditor } from './QuestionEditor';
import { Preview } from './Preview';
import { SceneBuilder, ScenePair } from './SceneBuilder';

type Tab = 'packs' | 'categories' | 'questions' | 'scenes' | 'io';
const TABS: { id: Tab; label: string }[] = [{ id: 'packs', label: '📦 Spielepakete' }, { id: 'categories', label: '🧱 Kategorien' }, { id: 'questions', label: '❓ Fragenbibliothek' }, { id: 'scenes', label: '🖼️ Szenen' }, { id: 'io', label: '⇅ Import/Export' }];

export function Admin() {
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading');
  useEffect(() => { adm('GET', '/me').then(r => setState(r.ok ? 'in' : 'out')); const f = () => setState('out'); window.addEventListener('outplay-admin-401', f); return () => window.removeEventListener('outplay-admin-401', f); }, []);
  if (state === 'loading') return <div className="adm"><p className="pulse">Lade …</p></div>;
  if (state === 'out') return <Login onIn={() => setState('in')} />;
  return <Shell onOut={() => setState('out')} />;
}

function Login({ onIn }: { onIn: () => void }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); setErr(''); const r = await adm('POST', '/login', { password: pw }); setBusy(false); if (r.ok) onIn(); else setErr(errText(r)); };
  return (
    <div className="hostlogin">
      <div className="logo">OUT<span>PLAY</span></div>
      <h2>Admin-Bereich</h2>
      <div className="card">
        <label className="field"><span>Admin-Passwort</span><input type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && pw && go()} /></label>
        <p className="muted small">Beim ersten Serverstart wurde ein Passwort erzeugt: Konsole bzw. Datei <code>data/admin-passwort.txt</code>. Alternativ: Umgebungsvariable <code>ADMIN_PASSWORD</code>.</p>
        {err && <div className="status bad">{err}</div>}
        <button className="btn primary wide" disabled={!pw || busy} onClick={go}>Anmelden</button>
      </div>
    </div>
  );
}

function Shell({ onOut }: { onOut: () => void }) {
  const [tab, setTab] = useState<Tab>((sessionStorage.getItem('admtab') as Tab) || 'packs');
  const [rev, setRev] = useState(0);            // erzwingt Neuladen der Listen
  const bump = () => setRev(x => x + 1);
  const go = (t: Tab) => { setTab(t); sessionStorage.setItem('admtab', t); };
  return (
    <div className="adm">
      <div className="admtop">
        <div className="logo tiny">OUT<span>PLAY</span> <small>Admin</small></div>
        <nav>{TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>{t.label}</button>)}</nav>
        <div className="spacer" /><a className="btn small ghost" href="/host">🎤 Zur Show</a>
        <button className="btn small ghost" onClick={async () => { await adm('POST', '/logout'); onOut(); }}>Abmelden</button>
      </div>
      {tab === 'packs' && <Packs rev={rev} bump={bump} />}
      {tab === 'categories' && <Categories rev={rev} bump={bump} />}
      {tab === 'questions' && <Library rev={rev} bump={bump} />}
      {tab === 'scenes' && <Scenes rev={rev} bump={bump} />}
      {tab === 'io' && <IO bump={bump} />}
    </div>
  );
}

function useList<T>(path: string, rev: number, deps: unknown[] = []) {
  const [data, setData] = useState<T[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); adm<T[]>('GET', path).then(r => { if (r.ok) setData(r.data); setLoading(false); }); }, [path]);
  useEffect(load, [load, rev, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading, reload: load };
}
function Toast({ msg }: { msg: string }) { return msg ? <div className="toast">{msg}</div> : null; }
function useToast() { const [m, setM] = useState(''); return { msg: m, show: (t: string) => { setM(t); setTimeout(() => setM(''), 4000); } }; }

// ---------------------------------------------------------------- Fragenbibliothek
function Library({ rev, bump }: { rev: number; bump: () => void }) {
  const [q, setQ] = useState(''); const [mode, setMode] = useState(''); const [topic, setTopic] = useState(''); const [archived, setArchived] = useState(false);
  const qs = `/questions?${q ? `q=${encodeURIComponent(q)}&` : ''}${mode ? `mode=${mode}&` : ''}${topic ? `topic=${encodeURIComponent(topic)}&` : ''}archived=${archived ? 1 : 0}`;
  const { data, loading } = useList<any>(qs, rev);
  const { data: all } = useList<any>('/questions', rev);
  const { data: scenes } = useList<Scene>('/scenes', rev);
  const topics = useMemo(() => [...new Set(all.map((x: any) => x.topic).filter(Boolean))].sort() as string[], [all]);
  const [edit, setEdit] = useState<{ id?: string; mode?: Mode; initial?: any } | null>(null);
  const [prev, setPrev] = useState<any>(null);
  const t = useToast();
  const act = async (fn: () => Promise<any>) => { const r = await fn(); if (!r.ok) t.show(errText(r)); else bump(); };
  return (
    <div>
      <div className="card toolbar">
        <input placeholder="🔍 Suchen (Fragetext, Thema, ID)" value={q} onChange={e => setQ(e.target.value)} />
        <select value={mode} onChange={e => setMode(e.target.value)}><option value="">Alle Modi</option>{MODES.map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select>
        <select value={topic} onChange={e => setTopic(e.target.value)}><option value="">Alle Themen</option>{topics.map(x => <option key={x}>{x}</option>)}</select>
        <label className="check"><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />Archiv</label>
        <details className="newmenu"><summary className="btn primary">＋ Neue Frage</summary><div>{MODES.map(m => <button key={m} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setEdit({ mode: m }); }}>{MODE_ICON[m]} {MODE_LABEL[m]}</button>)}</div></details>
      </div>
      <p className="muted small">{loading ? 'Lade …' : `${data.length} Frage(n)`}</p>
      <div className="qlist">{data.map((x: any) => (
        <div key={x.id} className={`qcard ${x.archived ? 'arch' : ''}`}>
          <div className="qhead"><span className={`badge m-${x.mode}`}>{MODE_ICON[x.mode]} {MODE_LABEL[x.mode as Mode]}</span>{x.topic && <span className="badge">{x.topic}</span>}
            {x.problems.length > 0 && <span className="badge bad" title={x.problems.join('\n')}>⚠ unvollständig</span>}<span className="badge">{taskMax(x.task)} P.</span></div>
          <div className="qprompt">{x.task.prompt || <i>(ohne Text)</i>}</div>
          <div className="small muted">{x.usedIn.length ? 'In: ' + x.usedIn.map((u: any) => u.title).join(', ') : 'In keiner Kategorie'}</div>
          <div className="row wrap">
            <button className="btn small" onClick={() => setEdit({ id: x.id, initial: { task: x.task, topic: x.topic } })}>✏️ Bearbeiten</button>
            <button className="btn small gold" disabled={x.problems.length > 0} onClick={() => setPrev(x)}>👀 Vorschau</button>
            <button className="btn small ghost" onClick={() => act(() => adm('POST', `/questions/${x.id}/duplicate`))}>⧉ Duplizieren</button>
            <button className="btn small ghost" onClick={() => act(() => adm('PUT', '/questions/' + x.id, { archived: !x.archived }))}>{x.archived ? '↩ Aus Archiv' : '🗄 Archivieren'}</button>
            <button className="btn small warn" onClick={() => confirm('Frage endgültig löschen?') && act(() => adm('DELETE', '/questions/' + x.id))}>🗑</button>
          </div>
        </div>))}</div>
      {edit && <QuestionEditor id={edit.id} mode={edit.mode} initial={edit.initial} scenes={scenes} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); bump(); t.show('Gespeichert ✓'); }} />}
      {prev && <Preview task={prev.task} onClose={() => setPrev(null)} />}
      <Toast msg={t.msg} />
    </div>
  );
}

// ---------------------------------------------------------------- Kategorien
const ICONS = ['⚽', '🧭', '🧩', '🎯', '👁️', '📼', '🎲', '🏟️', '🕵️', '🎬', '🎵', '🍕', '🚀', '🧠', '🌍', '🔬', '🎨', '🏆', '✨', '🔒'];
const COLORS = ['#14d9c0', '#22c55e', '#8b5cf6', '#f5b82e', '#38bdf8', '#ec4899', '#fb923c', '#3b82f6', '#ef4444'];

function Categories({ rev, bump }: { rev: number; bump: () => void }) {
  const { data } = useList<any>('/categories', rev);
  const [edit, setEdit] = useState<any>(null);
  const t = useToast();
  const act = async (fn: () => Promise<any>) => { const r = await fn(); if (!r.ok) t.show(errText(r)); else bump(); };
  return (
    <div>
      <div className="row between"><h2>Kategorien</h2><button className="btn primary" onClick={() => setEdit({ title: '', topic: '', icon: '🧪', color: '#8b5cf6', kind: 'tile', football: false, blurb: '', taskIds: [] })}>＋ Neue Kategorie</button></div>
      <div className="catgrid">{data.map((c: any) => (
        <div key={c.id} className={`catcard ${c.disabled ? 'off' : ''}`} style={{ ['--c' as any]: c.color }}>
          <div className="cathead"><span className="ic">{c.icon}</span><div><b>{c.title}</b><small>{c.topic}</small></div></div>
          <div className="qhead">
            <span className="badge">{c.kind === 'tile' ? 'Kachel' : c.kind === 'surprise' ? 'Überraschung' : 'Finale'}</span>
            {c.mode && <span className={`badge m-${c.mode}`}>{MODE_ICON[c.mode]} {MODE_LABEL[c.mode as Mode]}</span>}
            <span className="badge">{c.taskCount} Frage(n) · {c.points}/{c.budget} P.</span>
            {c.football && <span className="badge">⚽</span>}{c.disabled && <span className="badge bad">deaktiviert</span>}
            {c.problems.length > 0 && <span className="badge bad" title={c.problems.join('\n')}>⚠ {c.problems.length}</span>}
          </div>
          {c.usedInPacks.length > 0 && <div className="small muted">Pakete: {c.usedInPacks.map((p: any) => p.name).join(', ')}</div>}
          <div className="row wrap">
            <button className="btn small" onClick={() => setEdit(c)}>✏️ Bearbeiten</button>
            <button className="btn small ghost" onClick={() => act(() => adm('POST', `/categories/${c.id}/duplicate`, { copyQuestions: confirm('Auch die Fragen kopieren?\nOK = Fragen kopieren, Abbrechen = dieselben Fragen verwenden') }))}>⧉ Duplizieren</button>
            <button className="btn small ghost" onClick={() => act(() => adm('PUT', '/categories/' + c.id, { ...c, disabled: !c.disabled }))}>{c.disabled ? '▶ Aktivieren' : '⏸ Deaktivieren'}</button>
            <button className="btn small warn" onClick={() => confirm(`Kategorie „${c.title}“ löschen? (Die Fragen bleiben erhalten.)`) && act(() => adm('DELETE', '/categories/' + c.id))}>🗑</button>
          </div>
        </div>))}</div>
      {edit && <CategoryEditor cat={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); bump(); t.show('Gespeichert ✓'); }} />}
      <Toast msg={t.msg} />
    </div>
  );
}

function CategoryEditor({ cat, onClose, onSaved }: { cat: any; onClose: () => void; onSaved: () => void }) {
  const [c, setC] = useState<any>({ ...cat });
  const [msg, setMsg] = useState('');
  const { data: lib, reload } = useList<any>('/questions?archived=0', 0);
  const { data: scenes } = useList<Scene>('/scenes', 0);
  const [pick, setPick] = useState(false); const [qsearch, setQsearch] = useState('');
  const [create, setCreate] = useState<Mode | null>(null);
  const set = (k: string, v: any) => setC({ ...c, [k]: v });
  const byId = new Map(lib.map((x: any) => [x.id, x]));
  const mine = c.taskIds.map((id: string) => byId.get(id)).filter(Boolean);
  const mode: Mode | null = c.kind === 'final' ? null : (mine[0]?.mode ?? null);
  const points = mine.reduce((a: number, x: any) => a + taskMax(x.task), 0);
  const budget = c.kind === 'final' ? 2000 : 1000;
  const move = (i: number, d: number) => { const a = c.taskIds.slice(); const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set('taskIds', a); };
  const save = async () => { const r = c.id ? await adm('PUT', '/categories/' + c.id, c) : await adm('POST', '/categories', c); if (r.ok) onSaved(); else setMsg(errText(r)); };
  const avail = lib.filter((x: any) => !c.taskIds.includes(x.id) && (!mode || x.mode === mode) && (!qsearch || (x.task.prompt + x.topic).toLowerCase().includes(qsearch.toLowerCase())));
  return (
    <div className="modal" onClick={onClose}>
      <div className="modalbox" onClick={e => e.stopPropagation()}>
        <div className="row between"><h2>{c.id ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</h2><button className="btn small ghost" onClick={onClose}>Schließen ✕</button></div>
        <label className="field"><span>Titel (auf der Kategorienwand)</span><input value={c.title} maxLength={40} onChange={e => set('title', e.target.value)} /></label>
        <label className="field"><span>Beschreibung / Themengebiet (Untertitel)</span><input value={c.topic} maxLength={80} onChange={e => set('topic', e.target.value)} /></label>
        <label className="field"><span>Regeltext für die TV-Regelkarte (kurz)</span><textarea rows={2} value={c.blurb} maxLength={300} onChange={e => set('blurb', e.target.value)} /></label>
        <div className="form2">
          <label className="field"><span>Typ</span><select value={c.kind} onChange={e => set('kind', e.target.value)}><option value="tile">Normale Kachel (max. 1.000 Punkte)</option><option value="surprise">Überraschungsrunde (max. 1.000)</option><option value="final">Finale (max. 2.000, Modi dürfen gemischt sein)</option></select></label>
          <label className="field"><span>Fußball-Thema?</span><label className="check"><input type="checkbox" checked={!!c.football} onChange={e => set('football', e.target.checked)} /> zählt für das Fußball-Limit</label></label>
        </div>
        <div className="field"><span>Icon</span><div className="chips">{ICONS.map(i => <button key={i} className={`chipbtn ${c.icon === i ? 'sel' : ''}`} onClick={() => set('icon', i)}>{i}</button>)}<input style={{ maxWidth: 90 }} value={c.icon} maxLength={4} onChange={e => set('icon', e.target.value)} /></div></div>
        <div className="field"><span>Farbe</span><div className="chips">{COLORS.map(x => <button key={x} className={`sw ${c.color === x ? 'sel' : ''}`} style={{ background: x }} onClick={() => set('color', x)} aria-label={x} />)}<input type="color" value={c.color} onChange={e => set('color', e.target.value)} style={{ width: 50, padding: 2 }} /></div></div>
        <div className="catprev" style={{ ['--c' as any]: c.color }}><span>{c.icon}</span><b>{c.title || 'Titel'}</b><small>{c.topic || 'Beschreibung'}</small></div>
        <h3>Aufgaben dieser Kategorie {mode && <span className={`badge m-${mode}`}>{MODE_ICON[mode]} {MODE_LABEL[mode]}</span>}</h3>
        <div className={`pointsbar ${points > budget ? 'bad' : points === budget ? 'ok' : ''}`}>{points} / {budget} Punkte{points > budget ? ' – zu viele!' : points < budget ? ' – noch nicht ausgeschöpft' : ' ✓'}</div>
        {mine.map((x: any, i: number) => (
          <div className="row taskrow" key={x.id}><span className="rankno">{i + 1}</span><span className="ordtext">{MODE_ICON[x.mode]} {x.task.prompt || '(ohne Text)'} <small className="muted">· {taskMax(x.task)} P.</small></span>
            <button className="btn tiny ghost" onClick={() => move(i, -1)}>▲</button><button className="btn tiny ghost" onClick={() => move(i, 1)}>▼</button>
            <button className="btn tiny ghost" onClick={() => set('taskIds', c.taskIds.filter((y: string) => y !== x.id))}>✕</button></div>))}
        {!mine.length && <p className="muted">Noch keine Aufgaben.</p>}
        <div className="row wrap">
          <button className="btn small" onClick={() => setPick(!pick)}>＋ Aus Bibliothek hinzufügen</button>
          {(mode ? [mode] : MODES).map(m => <button key={m} className="btn small ghost" onClick={() => setCreate(m)}>＋ Neu: {MODE_ICON[m]} {MODE_LABEL[m]}</button>)}
        </div>
        {pick && <div className="pickbox"><input placeholder="🔍 Suchen" value={qsearch} onChange={e => setQsearch(e.target.value)} />
          {avail.slice(0, 40).map((x: any) => <button key={x.id} className="pickrow" disabled={x.problems.length > 0} onClick={() => set('taskIds', [...c.taskIds, x.id])}>{MODE_ICON[x.mode]} {x.task.prompt || '(ohne Text)'} <small className="muted">{x.topic} · {taskMax(x.task)} P.{x.problems.length ? ' · unvollständig' : ''}</small></button>)}
          {!avail.length && <p className="muted small">Keine passenden Fragen{mode ? ` im Modus ${MODE_LABEL[mode]}` : ''}.</p>}</div>}
        {msg && <div className="status bad">{msg}</div>}
        <button className="btn primary wide" onClick={save}>💾 Kategorie speichern</button>
      </div>
      {create && <div onClick={e => e.stopPropagation()}><QuestionEditor mode={create} scenes={scenes} meta={{ title: c.title, icon: c.icon, color: c.color, blurb: c.blurb, topic: c.topic, kind: c.kind }} onClose={() => setCreate(null)}
        onSaved={q => { setCreate(null); reload(); setC((cur: any) => ({ ...cur, taskIds: [...cur.taskIds, q.id] })); }} /></div>}
    </div>
  );
}

// ---------------------------------------------------------------- Pakete
function Packs({ rev, bump }: { rev: number; bump: () => void }) {
  const { data } = useList<any>('/packs', rev);
  const [edit, setEdit] = useState<any>(null);
  const t = useToast();
  const act = async (fn: () => Promise<any>, ok = '') => { const r = await fn(); if (!r.ok) t.show(errText(r)); else { bump(); if (ok) t.show(ok); } };
  return (
    <div>
      <div className="row between"><h2>Spielepakete</h2><button className="btn primary" onClick={() => setEdit({ name: '', description: '', categoryIds: [], surprise: '', final: '', rules: { startCredit: 200, maxFootball: 2, maxPerMode: 2 } })}>＋ Neues Paket</button></div>
      <p className="muted small">Ein Paket = Kategorien für den Abend + Überraschungsrunde + Finale. Beim Erstellen eines Raums wird die <b>veröffentlichte Version</b> fest übernommen – spätere Änderungen betreffen nur neue Räume.</p>
      <div className="catgrid">{data.map((p: any) => (
        <div key={p.id} className="catcard" style={{ ['--c' as any]: p.status === 'published' ? '#22c55e' : p.status === 'archived' ? '#6b7280' : '#f5b82e' }}>
          <div className="cathead"><span className="ic">📦</span><div><b>{p.name}</b><small>{p.description}</small></div></div>
          <div className="qhead"><span className={`badge ${p.status === 'published' ? 'ok' : ''}`}>{p.status === 'published' ? `Veröffentlicht v${p.currentVersion}` : p.status === 'archived' ? 'Archiviert' : 'Entwurf'}</span><span className="badge">{p.categoryIds.length} Kategorien</span><span className="badge">{p.versions} Version(en)</span></div>
          <div className="row wrap">
            <button className="btn small" onClick={() => setEdit(p)}>✏️ Öffnen</button>
            <button className="btn small ghost" onClick={() => act(() => adm('POST', `/packs/${p.id}/duplicate`), 'Dupliziert ✓')}>⧉ Duplizieren</button>
            {p.status === 'archived' ? <button className="btn small ghost" onClick={() => act(() => adm('POST', `/packs/${p.id}/status`, { status: 'published' }))}>↩ Wieder aktivieren</button>
              : p.versions > 0 && <button className="btn small ghost" onClick={() => act(() => adm('POST', `/packs/${p.id}/status`, { status: 'archived' }))}>🗄 Archivieren</button>}
            {p.versions === 0 && <button className="btn small warn" onClick={() => confirm('Entwurf löschen?') && act(() => adm('DELETE', '/packs/' + p.id))}>🗑</button>}
          </div>
        </div>))}</div>
      {edit && <PackEditor pack={edit} onClose={() => { setEdit(null); bump(); }} />}
      <Toast msg={t.msg} />
    </div>
  );
}

function PackEditor({ pack, onClose }: { pack: any; onClose: () => void }) {
  const [p, setP] = useState<any>(pack);
  const [msg, setMsg] = useState(''); const [ana, setAna] = useState<any>(null); const [vers, setVers] = useState<any[]>([]);
  const { data: cats } = useList<any>('/categories', 0);
  const set = (k: string, v: any) => setP({ ...p, [k]: v });
  const setRule = (k: string, v: string) => set('rules', { ...p.rules, [k]: v === '' ? '' : Number(v) });
  const tiles = cats.filter((c: any) => c.kind === 'tile'), byId = new Map(cats.map((c: any) => [c.id, c]));
  const loadVers = useCallback(() => { if (p.id) adm('GET', `/packs/${p.id}/versions`).then(r => r.ok && setVers(r.data)); }, [p.id]);
  useEffect(loadVers, [loadVers]);
  const save = async (): Promise<boolean> => {
    const r = p.id ? await adm('PUT', '/packs/' + p.id, p) : await adm('POST', '/packs', p);
    if (!r.ok) { setMsg(errText(r)); return false; }
    setP(r.data); setMsg('Entwurf gespeichert ✓'); return true;
  };
  useEffect(() => { if (p.id) adm('GET', `/packs/${p.id}/analysis`).then(r => r.ok && setAna(r.data)); }, [p.id, msg]);
  const doPublish = async () => {
    let id = p.id;
    const r0 = p.id ? await adm('PUT', '/packs/' + p.id, p) : await adm('POST', '/packs', p);
    if (!r0.ok) { setMsg(errText(r0)); return; }
    id = r0.data.id; setP(r0.data);
    const note = prompt('Notiz zu dieser Version (optional):', '') ?? '';
    const r = await adm('POST', `/packs/${id}/publish`, { note });
    if (!r.ok) { setMsg(errText(r)); return; }
    setMsg(`Veröffentlicht: Version ${r.data.version} ✓`); const g = await adm('GET', '/packs/' + id); if (g.ok) setP(g.data); loadVers();
  };
  const addCat = (id: string) => set('categoryIds', [...p.categoryIds, id]);
  const moveCat = (i: number, d: number) => { const a = p.categoryIds.slice(); const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set('categoryIds', a); };
  const a = ana?.analysis;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modalbox wide" onClick={e => e.stopPropagation()}>
        <div className="row between"><h2>📦 {p.id ? 'Paket bearbeiten' : 'Neues Paket'}</h2><button className="btn small ghost" onClick={onClose}>Schließen ✕</button></div>
        <div className="form2">
          <label className="field"><span>Name</span><input value={p.name} maxLength={60} onChange={e => set('name', e.target.value)} /></label>
          <label className="field"><span>Beschreibung</span><input value={p.description} maxLength={300} onChange={e => set('description', e.target.value)} /></label>
        </div>
        <h3>Kategorien für die Kategorienwand ({p.categoryIds.length}) <small className="muted">– empfohlen 8–9, gespielt werden 6</small></h3>
        {p.categoryIds.map((id: string, i: number) => { const c: any = byId.get(id); return (
          <div className="row taskrow" key={id}><span className="rankno">{i + 1}</span><span className="ordtext">{c ? `${c.icon} ${c.title}` : id} {c && <small className="muted">· {MODE_LABEL[c.mode as Mode] ?? '–'} · {c.taskCount} Aufg.{c.football ? ' · ⚽' : ''}{c.disabled ? ' · deaktiviert!' : ''}{c.problems.length ? ' · ⚠' : ''}</small>}</span>
            <button className="btn tiny ghost" onClick={() => moveCat(i, -1)}>▲</button><button className="btn tiny ghost" onClick={() => moveCat(i, 1)}>▼</button>
            <button className="btn tiny ghost" onClick={() => set('categoryIds', p.categoryIds.filter((x: string) => x !== id))}>✕</button></div>); })}
        <label className="field"><span>＋ Kategorie hinzufügen</span>
          <select value="" onChange={e => e.target.value && addCat(e.target.value)}><option value="">wählen …</option>{tiles.filter((c: any) => !p.categoryIds.includes(c.id)).map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.title} ({MODE_LABEL[c.mode as Mode] ?? '–'}){c.disabled ? ' – deaktiviert' : ''}</option>)}</select></label>
        <div className="form2">
          <label className="field"><span>Überraschungsrunde</span><select value={p.surprise} onChange={e => set('surprise', e.target.value)}><option value="">– wählen –</option>{cats.filter((c: any) => c.kind === 'surprise').map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}</select></label>
          <label className="field"><span>Finale</span><select value={p.final} onChange={e => set('final', e.target.value)}><option value="">– wählen –</option>{cats.filter((c: any) => c.kind === 'final').map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}</select></label>
        </div>
        <h3>Spielregeln dieses Pakets</h3>
        <div className="form2">
          <label className="field"><span>Startguthaben je Spieler</span><input inputMode="numeric" value={p.rules.startCredit} onChange={e => setRule('startCredit', e.target.value)} /><small className="muted">Einsätze sind nur aus vorhandenen Punkten möglich.</small></label>
          <label className="field"><span>Max. Fußball-Kacheln</span><input inputMode="numeric" value={p.rules.maxFootball} onChange={e => setRule('maxFootball', e.target.value)} /><small className="muted">Begrenzt den Fußballanteil bei freier Wahl.</small></label>
          <label className="field"><span>Max. Kacheln je Spielmodus</span><input inputMode="numeric" value={p.rules.maxPerMode} onChange={e => setRule('maxPerMode', e.target.value)} /><small className="muted">Verhindert einseitige Abende.</small></label>
        </div>
        <div className="row wrap"><button className="btn" onClick={save}>💾 Entwurf speichern</button><button className="btn primary" onClick={doPublish}>🚀 Prüfen &amp; veröffentlichen</button>
          {p.id && p.versions > 0 && <button className="btn ghost" onClick={async () => { const r = await adm('GET', `/export?scope=pack:${p.id}`); if (r.ok) download(`outplay-paket-${p.id}.json`, r.data); }}>⬇ Paket exportieren</button>}</div>
        {msg && <div className={`status ${msg.includes('✓') ? 'ok' : 'bad'}`}>{msg}</div>}
        {ana && (<div className="card">
          <h3>Prüfung &amp; Analyse</h3>
          {ana.errors.length > 0 && <div className="warnbox"><b>Fehler (verhindern Veröffentlichung):</b><ul>{ana.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></div>}
          {ana.warnings.length > 0 && <div><b>Hinweise:</b><ul>{ana.warnings.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></div>}
          {a?.combos && <div className="stats">
            <div><b>{a.combos.minutesExpected.min}–{a.combos.minutesExpected.max} min</b><small>erwartete Spieldauer (alle {a.combos.count} möglichen Kategorie-Auswahlen)</small></div>
            <div><b>{a.combos.minutesMax.min}–{a.combos.minutesMax.max} min</b><small>maximal, wenn ALLE Zeitlimits ausgeschöpft werden (kein harter Abbruch)</small></div>
            <div><b>{Math.round(a.combos.footballShare.min * 100)}–{Math.round(a.combos.footballShare.max * 100)} %</b><small>Fußballanteil der Aufgaben (Ø {Math.round(a.combos.footballShare.mean * 100)} %)</small></div>
            <div><b>≤ {a.combos.maxSameModeTiles}</b><small>Kacheln desselben Modus · mind. {a.combos.minDistinctModes} verschiedene Modi</small></div>
          </div>}
          {a && <table className="scoretab"><tbody>{[...a.tiles, ...a.specials].map((t: any) => <tr key={t.id}><td>{t.title}</td><td className="muted">{t.mode ?? t.kind}</td><td>{t.tasks} Aufg. · {t.points} P.</td><td>{t.expectedMin}–{t.maxMin} min</td></tr>)}</tbody></table>}
        </div>)}
        {p.id && vers.length > 0 && <div className="card"><h3>Versionen</h3>
          <table className="scoretab"><tbody>{vers.map(v => <tr key={v.ref}><td><b>v{v.version}</b> {v.current && <span className="badge ok">aktuell</span>}</td><td>{new Date(v.created).toLocaleString('de-DE')}</td><td className="muted">{v.note}</td><td>{v.categories} Kat. · {v.questions} Aufg.</td>
            <td>{!v.current && <button className="btn tiny" onClick={async () => { if (!confirm(`Version ${v.version} wieder zur aktuellen Version machen? Laufende Räume sind nicht betroffen.`)) return; const r = await adm('POST', `/packs/${p.id}/rollback`, { version: v.version }); if (r.ok) { setP(r.data); loadVers(); setMsg(`Version ${v.version} ist wieder aktiv ✓`); } else setMsg(errText(r)); }}>↩ Wiederherstellen</button>}</td></tr>)}</tbody></table></div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Szenen
function Scenes({ rev, bump }: { rev: number; bump: () => void }) {
  const { data } = useList<Scene>('/scenes', rev);
  const [edit, setEdit] = useState<{ id?: string; tpl?: any } | null>(null);
  const t = useToast();
  return (
    <div>
      <div className="row between"><h2>Szenen für GLITCH</h2><button className="btn primary" onClick={() => setEdit({})}>＋ Neue Szene</button></div>
      <p className="muted small">Mitgelieferte Szenen sind schreibgeschützt. Eigene Szenen (★) entstehen aus Vorlagen und können jederzeit bearbeitet werden – bereits veröffentlichte Pakete behalten ihren Stand.</p>
      <div className="qlist">{data.map(s => (
        <div key={s.id} className="qcard"><div className="qhead"><span className="badge">{s.builtin ? 'mitgeliefert' : '★ eigene'}</span><b>{s.title}</b></div>
          <ScenePair scene={s} />
          {!s.builtin && <div className="row"><button className="btn small" onClick={() => setEdit({ id: s.id, tpl: s.template })}>✏️ Bearbeiten</button>
            <button className="btn small warn" onClick={async () => { if (!confirm('Szene löschen?')) return; const r = await adm('DELETE', '/scenes/' + s.id); if (r.ok) bump(); else t.show(errText(r)); }}>🗑</button></div>}
        </div>))}</div>
      {edit && <SceneBuilder initial={edit.tpl} sceneId={edit.id} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); bump(); }} />}
      <Toast msg={t.msg} />
    </div>
  );
}

// ---------------------------------------------------------------- Import / Export
function IO({ bump }: { bump: () => void }) {
  const { data: packs } = useList<any>('/packs', 0);
  const [mode, setMode] = useState('rename'); const [res, setRes] = useState<any>(null); const [err, setErr] = useState(''); const [text, setText] = useState('');
  const exp = async (scope: string, name: string) => { const r = await adm('GET', '/export?scope=' + scope); if (r.ok) download(name, r.data); else setErr(errText(r)); };
  const imp = async (raw: string) => {
    setErr(''); setRes(null);
    let data: any; try { data = JSON.parse(raw); } catch { setErr('Das ist kein gültiges JSON.'); return; }
    const r = await adm('POST', '/import', { data, onConflict: mode });
    if (r.ok) { setRes(r.data); bump(); } else setErr(errText(r));
  };
  return (
    <div>
      <h2>Import / Export &amp; Sicherung</h2>
      <div className="card"><h3>⬇ Exportieren</h3>
        <p className="muted small">JSON-Dateien enthalten Fragen, Kategorien, Szenen und Pakete. „Alles“ ist deine vollständige Sicherung (inkl. aller veröffentlichten Versionen). Zusätzlich liegt die gesamte Datenbank in <code>data/outplay.db</code> – diese Datei kopieren genügt als Komplett-Backup.</p>
        <div className="row wrap"><button className="btn primary" onClick={() => exp('all', 'outplay-komplett.json')}>Alles (Backup)</button><button className="btn" onClick={() => exp('questions', 'outplay-fragen.json')}>Nur Fragen</button>
          {packs.map((p: any) => <button key={p.id} className="btn ghost" onClick={() => exp('pack:' + p.id, `outplay-paket-${p.id}.json`)}>Paket: {p.name}</button>)}</div></div>
      <div className="card"><h3>⬆ Importieren</h3>
        <label className="field"><span>Wenn eine ID schon existiert …</span><select value={mode} onChange={e => setMode(e.target.value)}><option value="rename">als Kopie importieren (sicher, Standard)</option><option value="skip">vorhandene überspringen</option><option value="overwrite">vorhandene überschreiben</option></select></label>
        <input type="file" accept="application/json,.json" onChange={async e => { const f = e.target.files?.[0]; if (f) imp(await f.text()); e.target.value = ''; }} />
        <p className="muted small">… oder JSON einfügen:</p>
        <textarea rows={5} className="mono" value={text} onChange={e => setText(e.target.value)} />
        <button className="btn" disabled={!text.trim()} onClick={() => imp(text)}>Importieren</button>
        {err && <div className="status bad">{err}</div>}
        {res && <div className="status ok">Importiert: {res.questions} Fragen, {res.categories} Kategorien, {res.scenes} Szenen, {res.packs} Pakete{res.skipped ? `, ${res.skipped} übersprungen` : ''}{res.renamed ? `, ${res.renamed} als Kopie` : ''}.{res.errors.length > 0 && <ul>{res.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>}</div>}
        <p className="muted small">Importierte Pakete erscheinen als Entwurf und müssen veröffentlicht werden.</p></div>
    </div>
  );
}
