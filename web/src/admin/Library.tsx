// Fragenbibliothek: Suche, kombinierbare Filter, kompakte Karten, geführter Einstieg „Neue Frage“.
import { useMemo, useState } from 'react';
import type { Mode } from '../../../shared/types';
import { ACTIVE_MODES, MODE_LABEL, taskMax } from '../../../shared/validate';
import { GAMES } from '../../../shared/games';
import type { Scene } from '../../../shared/scenes';
import { adm, errText } from './api';
import { MODE_ICON, QuestionEditor } from './QuestionEditor';
import { Preview } from './Preview';
import { Badge, Dialog, Empty, PageHead, RowMenu, SearchBox, Toast, useConfirm, useList, useToast } from './ui';

const MODES: Mode[] = [...ACTIVE_MODES, 'vote'];
const PAGE = 40;

/** Schritt 1 von „Neue Frage“: Spiel wählen. */
function GamePicker({ onPick, onClose }: { onPick: (m: Mode) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = GAMES.filter(g => MODES.includes(g.mode as Mode) && (!q || (g.name + ' ' + g.short).toLowerCase().includes(q.toLowerCase())));
  return (
    <Dialog title="Welches Spiel möchtest du mit einer neuen Frage erweitern?" onClose={onClose} wide>
      <SearchBox value={q} onChange={setQ} placeholder="Spiel suchen …" />
      <div className="gamepick" style={{ marginTop: 10 }}>
        {list.map(g => <button key={g.mode} onClick={() => onPick(g.mode as Mode)}><span className="gi" aria-hidden>{g.icon}</span><b>{g.name}</b><small>{g.short}</small></button>)}
        {!list.length && <Empty icon="🔎" title="Kein Spiel gefunden" />}
      </div>
    </Dialog>
  );
}

export function Library({ rev, bump }: { rev: number; bump: () => void }) {
  const [q, setQ] = useState(''); const [mode, setMode] = useState(''); const [topic, setTopic] = useState(''); const [archived, setArchived] = useState(false); const [usage, setUsage] = useState(''); const [shown, setShown] = useState(PAGE);
  const qs = `/questions?${q ? `q=${encodeURIComponent(q)}&` : ''}${mode ? `mode=${mode}&` : ''}${topic ? `topic=${encodeURIComponent(topic)}&` : ''}archived=${archived ? 1 : 0}`;
  const { data, loading } = useList<any>(qs, rev);
  const { data: all } = useList<any>('/questions', rev);
  const { data: scenes } = useList<Scene>('/scenes', rev);
  const topics = useMemo(() => [...new Set(all.map((x: any) => x.topic).filter(Boolean))].sort() as string[], [all]);
  const list = useMemo(() => data.filter((x: any) => !usage || (usage === 'used' ? x.usedIn.length > 0 : x.usedIn.length === 0)), [data, usage]);
  const [pick, setPick] = useState(false); const [edit, setEdit] = useState<{ id?: string; mode?: Mode; initial?: any } | null>(null); const [prev, setPrev] = useState<any>(null);
  const t = useToast(); const { ask, node } = useConfirm();
  const act = async (fn: () => Promise<any>, ok = '') => { const r = await fn(); if (!r.ok) t.show(errText(r)); else { bump(); if (ok) t.show(ok); } };
  const filtered = !!(q || mode || topic || archived || usage);
  const reset = () => { setQ(''); setMode(''); setTopic(''); setArchived(false); setUsage(''); setShown(PAGE); };
  const visible = list.slice(0, shown);
  return (
    <div>
      <PageHead title="Fragen" sub="Hier verwaltest und testest du alle Fragen deiner Gameshow.">
        <button className="btn primary" onClick={() => setPick(true)}>＋ Neue Frage</button>
      </PageHead>
      <div className="qfilters">
        <div className="qrow">
          <SearchBox value={q} onChange={v => { setQ(v); setShown(PAGE); }} placeholder="Frage suchen …" />
          <select aria-label="Spielmodus" value={mode} onChange={e => { setMode(e.target.value); setShown(PAGE); }}><option value="">Alle Spielmodi</option>{MODES.map(m => <option key={m} value={m}>{MODE_ICON[m]} {MODE_LABEL[m]}</option>)}</select>
        </div>
        <details className="more" open={!!(topic || archived || usage)}><summary>Weitere Filter{(topic || archived || usage) ? ' (aktiv)' : ''}</summary>
          <div className="qrow" style={{ marginTop: 8 }}>
            <select aria-label="Thema" value={topic} onChange={e => { setTopic(e.target.value); setShown(PAGE); }}><option value="">Alle Themen</option>{topics.map(x => <option key={x}>{x}</option>)}</select>
            <select aria-label="Status" value={archived ? 'arch' : 'act'} onChange={e => { setArchived(e.target.value === 'arch'); setShown(PAGE); }}><option value="act">Aktiv</option><option value="arch">Archiviert</option></select>
            <select aria-label="Verwendung" value={usage} onChange={e => { setUsage(e.target.value); setShown(PAGE); }}><option value="">Verwendet &amp; unbenutzt</option><option value="used">Bereits verwendet</option><option value="unused">Noch nicht verwendet</option></select>
          </div>
        </details>
        <div className="qrow muted small">{loading ? 'Lade …' : `${list.length} Frage${list.length === 1 ? '' : 'n'}${filtered ? ' gefunden' : ''}`}{filtered && <button className="btn tiny ghost" onClick={reset}>Filter zurücksetzen</button>}</div>
      </div>
      <div className="qlist" role="list">{visible.map((x: any) => (
        <div role="listitem" key={x.id} className={`qcard2 ${x.archived ? 'arch' : ''}`}>
          <span className="qi" aria-hidden>{MODE_ICON[x.mode]}</span>
          <span className="qt">{x.task.prompt || x.task.twisted || <i>(ohne Text)</i>}</span>
          <span className="qm"><span>{MODE_LABEL[x.mode as Mode]}</span>{x.topic && <span>· {x.topic}</span>}<span>· {taskMax(x.task)} P.</span>{x.usedIn.length > 0 && <span>· {x.usedIn.length}× verwendet</span>}{x.archived && <Badge>Archiviert</Badge>}{x.problems.length > 0 && <Badge kind="warn" title={x.problems.join('\n')}>unvollständig</Badge>}</span>
          <div className="qa">
            <button className="btn small primary" onClick={() => setEdit({ id: x.id, initial: { task: x.task, topic: x.topic, updated: x.updated } })}>Bearbeiten</button>
            <button className="btn small quiet" disabled={x.problems.length > 0} onClick={() => setPrev(x)}>👀 Testen</button>
            <span className="spacer" style={{ flex: 1 }} />
            <RowMenu>
              <button onClick={() => act(() => adm('POST', `/questions/${x.id}/duplicate`), 'Dupliziert ✓')}>⧉ Duplizieren</button>
              <button onClick={() => act(() => adm('PUT', '/questions/' + x.id, { archived: !x.archived, ifUpdated: x.updated }), x.archived ? 'Aus dem Archiv geholt ✓' : 'Archiviert ✓')}>{x.archived ? '↩ Aus Archiv holen' : '🗄 Archivieren'}</button>
              <button className="danger" onClick={async () => { if (await ask({ title: 'Frage endgültig löschen?', text: x.usedIn.length ? <>Diese Frage wird in {x.usedIn.length} Runde(n) verwendet. Veröffentlichte Paketversionen bleiben unverändert. Besser: archivieren.</> : 'Das lässt sich nicht rückgängig machen. Besser: archivieren.', confirmLabel: 'Löschen', danger: true })) act(() => adm('DELETE', '/questions/' + x.id), 'Gelöscht'); }}>🗑 Löschen</button>
            </RowMenu>
          </div>
        </div>))}</div>
      {!loading && !list.length && (filtered
        ? <Empty icon="🔎" title="Keine Fragen gefunden" text="Probiere eine andere Suche oder setze die Filter zurück."><button className="btn" onClick={reset}>Filter zurücksetzen</button></Empty>
        : <Empty icon="❓" title="Noch keine Fragen" text="Lege die erste Frage an – du wählst dazu zuerst das Spiel."><button className="btn primary" onClick={() => setPick(true)}>＋ Neue Frage</button></Empty>)}
      {list.length > shown && <p style={{ textAlign: 'center' }}><button className="btn" onClick={() => setShown(shown + PAGE)}>Mehr anzeigen ({list.length - shown} weitere)</button></p>}
      {pick && <GamePicker onClose={() => setPick(false)} onPick={m => { setPick(false); setEdit({ mode: m }); }} />}
      {edit && <QuestionEditor id={edit.id} mode={edit.mode} initial={edit.initial} scenes={scenes} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); bump(); t.show('Gespeichert ✓ – bereits veröffentlichte Pakete ändern sich erst mit einer neuen Version.'); }} />}
      {prev && <Preview task={prev.task} onClose={() => setPrev(null)} />}
      {node}<Toast msg={t.msg} />
    </div>
  );
}
