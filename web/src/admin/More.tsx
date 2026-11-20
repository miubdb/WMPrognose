import { useEffect, useMemo, useState } from 'react';
import type { Mode } from '../../../shared/types';
import { ACTIVE_MODES, MODE_LABEL, taskMax } from '../../../shared/validate';
const MODES: Mode[] = [...ACTIVE_MODES, 'vote'];
import type { Scene } from '../../../shared/scenes';
import { adm, errText } from './api';
import { MODE_ICON, QuestionEditor } from './QuestionEditor';
import { SceneBuilder, ScenePair } from './SceneBuilder';
import { Badge, Dialog, Empty, PageHead, RowMenu, SearchBox, Toast, useConfirm, useList, useToast } from './ui';

const ICONS = ['⚽', '🧭', '🧩', '🎯', '👁️', '📼', '🎲', '🏟️', '🕵️', '🎬', '🎵', '🍕', '🚀', '🧠', '🌍', '🔬', '🎨', '🏆', '✨', '🔒'];
const COLORS = ['#14d9c0', '#22c55e', '#8b5cf6', '#f5b82e', '#38bdf8', '#ec4899', '#fb923c', '#3b82f6', '#ef4444'];

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
  const save = async () => { const r = c.id ? await adm('PUT', '/categories/' + c.id, { ...c, ifUpdated: cat.updated }) : await adm('POST', '/categories', c); if (r.ok) onSaved(); else setMsg(errText(r)); };
  const avail = lib.filter((x: any) => !c.taskIds.includes(x.id) && (!mode || x.mode === mode) && (!qsearch || (x.task.prompt + x.topic).toLowerCase().includes(qsearch.toLowerCase())));
  return (
    <div className="modal" onClick={onClose}>
      <div className="modalbox editor" onClick={e => e.stopPropagation()}>
        <div className="row between sticky-top"><h2>{c.id ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</h2><button className="btn small ghost" onClick={onClose}>Schließen ✕</button></div>
        <label className="field"><span>Titel</span><input value={c.title} maxLength={40} placeholder="Name auf der Kategorienwand" onChange={e => set('title', e.target.value)} /></label>
        <div className="catprev" style={{ ['--c' as any]: c.color }}><span>{c.icon}</span><b>{c.title || 'Titel'}</b>{c.topic && <small>{c.topic}</small>}</div>
        <div className="field"><span>Icon</span><div className="chips">{ICONS.map(i => <button key={i} className={`chipbtn ${c.icon === i ? 'sel' : ''}`} onClick={() => set('icon', i)}>{i}</button>)}</div></div>
        <div className="field"><span>Farbe</span><div className="chips">{COLORS.map(x => <button key={x} className={`sw ${c.color === x ? 'sel' : ''}`} style={{ background: x }} onClick={() => set('color', x)} aria-label={x} />)}</div></div>
        <h3>Fragen {mode && <span className={`badge m-${mode}`}>{MODE_ICON[mode]} {MODE_LABEL[mode]}</span>}</h3>
        <div className={`pointsbar ${points > budget ? 'bad' : points === budget ? 'ok' : ''}`}>{points} / {budget} Punkte{points > budget ? ' – zu viele' : points === budget ? ' ✓' : ''}</div>
        {mine.map((x: any, i: number) => (
          <div className="row taskrow" key={x.id}><span className="rankno">{i + 1}</span><span className="ordtext">{MODE_ICON[x.mode]} {x.task.prompt || '(ohne Text)'} <small className="muted">· {taskMax(x.task)} P.</small></span>
            <button className="btn tiny ghost" aria-label="Nach oben" onClick={() => move(i, -1)}>▲</button><button className="btn tiny ghost" aria-label="Nach unten" onClick={() => move(i, 1)}>▼</button>
            <button className="btn tiny ghost" aria-label="Entfernen" onClick={() => set('taskIds', c.taskIds.filter((y: string) => y !== x.id))}>✕</button></div>))}
        {!mine.length && <p className="muted">Noch keine Fragen.</p>}
        <div className="row wrap">
          <button className="btn small" onClick={() => setPick(!pick)}>＋ Aus Fragen wählen</button>
          <details className="newmenu inline"><summary className="btn small ghost">＋ Neue Frage</summary><div>{(mode ? [mode] : MODES).map(m => <button key={m} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setCreate(m); }}><b>{MODE_ICON[m]} {MODE_LABEL[m]}</b></button>)}</div></details>
        </div>
        {pick && <div className="pickbox"><input placeholder="🔍 Suchen" value={qsearch} onChange={e => setQsearch(e.target.value)} />
          {avail.slice(0, 40).map((x: any) => <button key={x.id} className="pickrow" disabled={x.problems.length > 0} onClick={() => set('taskIds', [...c.taskIds, x.id])}>{MODE_ICON[x.mode]} {x.task.prompt || '(ohne Text)'} <small className="muted">{x.topic} · {taskMax(x.task)} P.{x.problems.length ? ' · unvollständig' : ''}</small></button>)}
          {!avail.length && <p className="muted small">Keine passenden Fragen{mode ? ` im Modus ${MODE_LABEL[mode]}` : ''}.</p>}</div>}
        <details className="more"><summary>Weitere Einstellungen</summary>
          <label className="field"><span>Untertitel</span><input value={c.topic} maxLength={80} onChange={e => set('topic', e.target.value)} /></label>
          <label className="field"><span>Regeltext für die TV-Regelkarte</span><textarea rows={2} value={c.blurb} maxLength={300} onChange={e => set('blurb', e.target.value)} /></label>
          <div className="form2">
            <label className="field"><span>Art</span><select value={c.kind} onChange={e => set('kind', e.target.value)}><option value="tile">Kachel (max. 1.000 P.)</option><option value="surprise">Überraschungsrunde (max. 1.000 P.)</option><option value="final">Finale (max. 2.000 P.)</option></select></label>
            <label className="field"><span>Fußball-Thema</span><label className="check"><input type="checkbox" checked={!!c.football} onChange={e => set('football', e.target.checked)} /> zählt für das Fußball-Limit</label></label>
          </div>
        </details>
        {msg && <div className="status bad">{msg}</div>}
        <div className="actionbar"><span className="spacer" /><button className="btn primary" onClick={save}>💾 Kategorie speichern</button></div>
      </div>
      {create && <div onClick={e => e.stopPropagation()}><QuestionEditor mode={create} scenes={scenes} meta={{ title: c.title, icon: c.icon, color: c.color, blurb: c.blurb, topic: c.topic, kind: c.kind }} onClose={() => setCreate(null)}
        onSaved={q => { setCreate(null); reload(); setC((cur: any) => ({ ...cur, taskIds: [...cur.taskIds, q.id] })); }} /></div>}
    </div>
  );
}

// ---------------------------------------------------------------- Pakete

const KIND_LABEL: Record<string, string> = { tile: 'Runde', surprise: 'Überraschung', final: 'Finale' };
function Categories({ rev, bump }: { rev: number; bump: () => void }) {
  const { data, loading } = useList<any>('/categories', rev);
  const [edit, setEdit] = useState<any>(null); const [q, setQ] = useState(''); const [mode, setMode] = useState(''); const [kind, setKind] = useState(''); const [sort, setSort] = useState('name');
  const [info, setInfo] = useState(() => { try { return localStorage.getItem('adm.catinfo') !== '1'; } catch { return true; } });
  const t = useToast(); const { ask, node } = useConfirm();
  const act = async (fn: () => Promise<any>, ok = '') => { const r = await fn(); if (!r.ok) t.show(errText(r)); else { bump(); if (ok) t.show(ok); } };
  const list = useMemo(() => data.filter((c: any) => (!q || c.title.toLowerCase().includes(q.toLowerCase())) && (!mode || c.mode === mode) && (!kind || c.kind === kind))
    .sort((a: any, b: any) => (sort === 'count' ? b.taskCount - a.taskCount : a.title.localeCompare(b.title, 'de'))), [data, q, mode, kind, sort]);
  const modes = useMemo(() => [...new Set(data.map((c: any) => c.mode).filter(Boolean))] as string[], [data]);
  const sections = [{ k: 'tile', title: 'Runden' }, { k: 'surprise', title: 'Überraschungsrunden' }, { k: 'final', title: 'Finalrunden' }];
  const filtered = !!(q || mode || kind);
  return (
    <div>
      <PageHead title="Kategorien" sub="Alle Spielrunden, aus denen Pakete entstehen.">
        <button className="btn primary" onClick={() => setEdit({ title: '', topic: '', icon: '🧪', color: '#8b5cf6', kind: 'tile', football: false, blurb: '', taskIds: [] })}>＋ Neue Kategorie</button>
      </PageHead>
      {info && <div className="infobar"><span>Eine Kategorie ist eine Spielrunde mit mehreren Fragen desselben Spielmodus.</span><button className="btn tiny ghost" onClick={() => { setInfo(false); try { localStorage.setItem('adm.catinfo', '1'); } catch { /* */ } }}>Verstanden</button></div>}
      <div className="qrow">
        <SearchBox value={q} onChange={setQ} placeholder="Kategorie suchen …" />
        <select aria-label="Spielmodus" value={mode} onChange={e => setMode(e.target.value)}><option value="">Alle Spielmodi</option>{modes.map(m => <option key={m} value={m}>{MODE_ICON[m]} {MODE_LABEL[m as Mode]}</option>)}</select>
        <select aria-label="Art" value={kind} onChange={e => setKind(e.target.value)}><option value="">Alle Arten</option><option value="tile">Runden</option><option value="surprise">Überraschung</option><option value="final">Finale</option></select>
        <select aria-label="Sortierung" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Nach Name</option><option value="count">Nach Fragenzahl</option></select>
      </div>
      <p className="muted small">{loading ? 'Lade …' : `${list.length} Kategorie${list.length === 1 ? '' : 'n'}`}{filtered && <> <button className="btn tiny ghost" onClick={() => { setQ(''); setMode(''); setKind(''); }}>Filter zurücksetzen</button></>}</p>
      {!loading && !list.length && <Empty icon="🧱" title={filtered ? 'Keine Kategorie gefunden' : 'Noch keine Kategorien'} text={filtered ? 'Andere Suche oder Filter probieren.' : 'Lege die erste Spielrunde an.'} />}
      {sections.map(s => { const items = list.filter((c: any) => c.kind === s.k); if (!items.length) return null; return (
        <section key={s.k} className="packgroup"><h3>{s.title} <Badge>{items.length}</Badge></h3>
          <div className="cgrid">{items.map((c: any) => (
            <div key={c.id} className={`ccard ${c.disabled ? 'off' : ''}`} style={{ ['--c' as any]: c.color }}>
              <button className="cm" aria-label={`${c.title} bearbeiten`} onClick={() => setEdit(c)}>
                <b>{c.icon} {c.title}</b>
                <span className="meta">{c.topic && c.topic !== c.title && <span>{c.topic} ·</span>}{c.mode && <span>{MODE_ICON[c.mode]} {MODE_LABEL[c.mode as Mode]}</span>}<span>· {c.taskCount} Frage{c.taskCount === 1 ? '' : 'n'}</span><Badge>{KIND_LABEL[c.kind]}</Badge>{c.disabled && <Badge kind="muted">aus</Badge>}{c.problems.length > 0 && <Badge kind="warn" title={c.problems.join('\n')}>⚠ {c.problems.length}</Badge>}</span>
              </button>
              <RowMenu>
                <button onClick={async () => { const copy = await ask({ title: 'Kategorie duplizieren', text: 'Sollen die Fragen mitkopiert werden? Wenn nicht, verwendet die Kopie dieselben Fragen.', confirmLabel: 'Fragen mitkopieren' }); const r = await adm('POST', `/categories/${c.id}/duplicate`, { copyQuestions: !!copy }); if (r.ok) { bump(); t.show('Dupliziert ✓'); } else t.show(errText(r)); }}>⧉ Duplizieren</button>
                <button onClick={() => act(() => adm('PUT', '/categories/' + c.id, { ...c, disabled: !c.disabled, ifUpdated: c.updated }))}>{c.disabled ? '▶ Aktivieren' : '⏸ Deaktivieren'}</button>
                <button className="danger" onClick={async () => { if (await ask({ title: `Kategorie „${c.title}“ löschen?`, text: 'Die Fragen bleiben erhalten. Veröffentlichte Paketversionen sind nicht betroffen.', confirmLabel: 'Löschen', danger: true })) act(() => adm('DELETE', '/categories/' + c.id), 'Gelöscht'); }}>🗑 Löschen</button>
              </RowMenu>
            </div>))}</div></section>); })}
      {edit && <CategoryEditor cat={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); bump(); t.show('Gespeichert ✓'); }} />}
      {node}<Toast msg={t.msg} />
    </div>
  );
}

function Scenes({ rev, bump }: { rev: number; bump: () => void }) {
  const { data, loading } = useList<Scene>('/scenes', rev);
  const [edit, setEdit] = useState<{ id?: string; tpl?: any } | null>(null); const [view, setView] = useState<Scene | null>(null); const [q, setQ] = useState(''); const [own, setOwn] = useState('');
  const t = useToast(); const { ask, node } = useConfirm();
  const list = data.filter(s => (!q || s.title.toLowerCase().includes(q.toLowerCase())) && (!own || (own === 'own' ? !s.builtin : !!s.builtin)));
  return (
    <div>
      <PageHead title="GLITCH-Szenen" sub="Hier legst du die Bilder an, bei denen Spieler eine Veränderung finden müssen.">
        <button className="btn primary" onClick={() => setEdit({})}>＋ Neue Szene erstellen</button>
      </PageHead>
      <div className="qrow"><SearchBox value={q} onChange={setQ} placeholder="Szene suchen …" />
        <select aria-label="Herkunft" value={own} onChange={e => setOwn(e.target.value)}><option value="">Alle</option><option value="own">Eigene</option><option value="builtin">Mitgelieferte</option></select></div>
      <p className="muted small">{loading ? 'Lade …' : `${list.length} Szene${list.length === 1 ? '' : 'n'}`}</p>
      {!loading && !list.length && <Empty icon="🖼️" title={q || own ? 'Keine Szene gefunden' : 'Noch keine Szenen'} text="Mit „Neue Szene erstellen“ legst du eine eigene an." />}
      <div className="scgrid">{list.map(s => (
        <button key={s.id} className="scard" onClick={() => setView(s)} aria-label={`${s.title} ansehen`}>
          <span className="row between"><b>{s.title}</b><Badge kind={s.builtin ? 'muted' : 'info'}>{s.builtin ? 'Mitgeliefert' : 'Eigene Szene'}</Badge></span>
          <ScenePair scene={s} />
        </button>))}</div>
      {view && <Dialog title={view.title} wide onClose={() => setView(null)} actions={<>
        {!view.builtin && <><button className="btn warn" onClick={async () => { if (await ask({ title: 'Szene löschen?', text: 'Fragen, die diese Szene nutzen, funktionieren dann nicht mehr.', confirmLabel: 'Löschen', danger: true })) { const r = await adm('DELETE', '/scenes/' + view.id); setView(null); if (r.ok) bump(); else t.show(errText(r)); } }}>🗑 Löschen</button>
          <button className="btn primary" onClick={() => { setEdit({ id: view.id, tpl: view.template }); setView(null); }}>✏️ Bearbeiten</button></>}</>}>
        <ScenePair scene={view} />{view.builtin && <p className="muted small">Mitgelieferte Szenen kann man nicht ändern – aber als Vorlage für eine eigene Szene nutzen.</p>}
      </Dialog>}
      {edit && <SceneBuilder initial={edit.tpl} sceneId={edit.id} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); bump(); }} />}
      {node}<Toast msg={t.msg} />
    </div>
  );
}

/** „Weitere Inhalte“: Kategorien (Runden) und GLITCH-Szenen. */
export function MoreContent({ rev, bump, section, setSection }: { rev: number; bump: () => void; section: 'categories' | 'scenes'; setSection: (s: 'categories' | 'scenes') => void }) {
  return (
    <div>
      <div className="chipsrow" role="tablist" aria-label="Weitere Inhalte">
        <button role="tab" aria-selected={section === 'categories'} className={`chip ${section === 'categories' ? 'on' : ''}`} onClick={() => setSection('categories')}>🧱 Kategorien</button>
        <button role="tab" aria-selected={section === 'scenes'} className={`chip ${section === 'scenes' ? 'on' : ''}`} onClick={() => setSection('scenes')}>🖼️ GLITCH-Szenen</button>
      </div>
      {section === 'categories' ? <Categories rev={rev} bump={bump} /> : <Scenes rev={rev} bump={bump} />}
    </div>
  );
}
