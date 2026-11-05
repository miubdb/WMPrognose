import { useEffect, useMemo, useState } from 'react';
import type { Mode } from '../../../shared/types';
import { MODE_LABEL, normalizeTask, taskMax, validateTask } from '../../../shared/validate';
import { diffZones, type Scene } from '../../../shared/scenes';
import { MapView } from '../ui/MapView';
import { adm, errText } from './api';
import { Preview } from './Preview';
import { SceneBuilder, ScenePair } from './SceneBuilder';
import { SceneView, sceneVariant } from '../ui/SceneView';

export const MODE_ICON: Record<string, string> = { geo: '🧭', rank: '↕️', estimate: '🎯', glitch: '👁️', codebreak: '🧩', unique: '✨' };
export const MODE_HELP: Record<string, string> = {
  geo: 'Spieler setzen einen Pin auf der Karte. Gewertet wird die Platzierung nach Entfernung.',
  rank: 'Fünf Begriffe erscheinen nacheinander; jeder muss sofort auf einen Rangplatz. Gewertet werden richtig angeordnete Paare.',
  estimate: 'Geheim schätzen, dann auf eine Schätzung Punkte setzen. Die beste Schätzung bekommt die meisten Punkte.',
  glitch: 'Ein Bild wird kurz gezeigt, dann verändert. Spieler tippen auf die veränderte Stelle.',
  codebreak: 'Ein Rätsel mit eindeutiger Lösung. Hinweise kosten Punkte, drei Versuche.',
  unique: 'Alle nennen eine gültige Antwort – nur einzigartige Antworten bringen volle Punkte.',
};

export function newTask(mode: Mode): any {
  switch (mode) {
    case 'geo': return { mode, prompt: '', map: 'world', answer: { lat: 20, lon: 0, label: '' }, seconds: 35, points: 250, explain: '' };
    case 'rank': return { mode, prompt: '', topLabel: '', bottomLabel: '', items: [0, 1, 2, 3, 4].map(() => ({ text: '', value: '' })), order: [2, 4, 0, 3, 1], secondsPerItem: 12, points: 330, explain: '' };
    case 'estimate': return { mode, prompt: '', unit: '', answer: '', seconds: 45, betSeconds: 30, points: 300, bets: [0, 100, 200], explain: '' };
    case 'glitch': return { mode, prompt: '', viewPrompt: 'Merk dir das Bild!', scene: '', viewSeconds: 12, seconds: 25, points: 250, explain: '' };
    case 'codebreak': return { mode, prompt: '', display: '', input: 'number', answers: [], hints: ['', '', ''], seconds: 90, points: 300, explain: '' };
    case 'unique': return { mode, prompt: '', placeholder: '', valid: [0, 1, 2].map(() => ({ name: '', variants: [] })), seconds: 45, pointsUnique: 500, pointsShared: 150, explain: '' };
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small className="muted">{hint}</small>}</label>;
}

export function QuestionEditor({ id, mode, initial, scenes, onClose, onSaved, meta }: {
  id?: string; mode?: Mode; initial?: { task: any; topic: string }; scenes: Scene[]; onClose: () => void; onSaved: (q: any) => void; meta?: any;
}) {
  const [task, setTask] = useState<any>(initial?.task ?? newTask(mode ?? 'geo'));
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [msg, setMsg] = useState('');
  const [prev, setPrev] = useState(false);
  const [sceneList, setSceneList] = useState<Scene[]>(scenes);
  const [builder, setBuilder] = useState(false);
  useEffect(() => setSceneList(scenes), [scenes]);
  const set = (k: string, v: any) => setTask({ ...task, [k]: v });
  const problems = useMemo(() => validateTask(normalizeTask(task), sid => sceneList.some(s => s.id === sid)), [task, sceneList]);
  const save = async () => {
    const r = id ? await adm('PUT', '/questions/' + id, { task, topic }) : await adm('POST', '/questions', { task, topic });
    if (r.ok) onSaved(r.data); else setMsg(errText(r));
  };
  const common = (<>
    <Field label="Fragetext (erscheint auf dem Fernseher und den Handys)"><textarea rows={2} value={task.prompt} maxLength={300} onChange={e => set('prompt', e.target.value)} /></Field>
  </>);
  const tail = (<>
    <Field label="Lösungserklärung (wird bei der Auflösung auf dem TV gezeigt)" hint="Ein bis zwei Sätze mit einem netten Zusatzfakt."><textarea rows={2} value={task.explain} maxLength={500} onChange={e => set('explain', e.target.value)} /></Field>
  </>);
  const norm = normalizeTask(task);
  return (
    <div className="modal" onClick={onClose}>
      <div className="modalbox wide" onClick={e => e.stopPropagation()}>
        <div className="row between"><h2>{MODE_ICON[task.mode]} {id ? 'Frage bearbeiten' : 'Neue Frage'} · {MODE_LABEL[task.mode as Mode]}</h2><button className="btn small ghost" onClick={onClose}>Schließen ✕</button></div>
        <p className="muted small">{MODE_HELP[task.mode]}</p>
        <Field label="Thema (zum Filtern in der Bibliothek)"><input value={topic} maxLength={60} placeholder="z. B. Fußball, Geografie, Popkultur" onChange={e => setTopic(e.target.value)} /></Field>
        {common}

        {task.mode === 'geo' && <>
          <div className="form2">
            <Field label="Karte"><select value={task.map} onChange={e => set('map', e.target.value)}><option value="world">Weltkarte</option><option value="europe">Europakarte</option><option value="germany">Deutschlandkarte</option></select></Field>
            <Field label="Ortsbezeichnung (für die Auflösung)"><input value={task.answer.label} maxLength={80} onChange={e => set('answer', { ...task.answer, label: e.target.value })} /></Field>
          </div>
          <p className="small muted">Tippe auf die Karte, um die richtige Position zu setzen (zoomen: + / − oder zwei Finger).</p>
          <MapView key={task.map} kind={task.map} mode="pick" pin={Number.isFinite(norm.mode === 'geo' ? (norm as any).answer.lat : NaN) ? { lat: (norm as any).answer.lat, lon: (norm as any).answer.lon } : null}
            onPin={ll => set('answer', { ...task.answer, lat: Math.round(ll.lat * 1e4) / 1e4, lon: Math.round(ll.lon * 1e4) / 1e4 })} className="adminmap" />
          <div className="form2">
            <Field label="Breite (lat)"><input inputMode="decimal" value={task.answer.lat} onChange={e => set('answer', { ...task.answer, lat: e.target.value })} /></Field>
            <Field label="Länge (lon)"><input inputMode="decimal" value={task.answer.lon} onChange={e => set('answer', { ...task.answer, lon: e.target.value })} /></Field>
            <Field label="Zeitlimit (Sekunden)"><input inputMode="numeric" value={task.seconds} onChange={e => set('seconds', e.target.value)} /></Field>
            <Field label="Punkte" hint="Maximal erreichbar für diese Aufgabe"><input inputMode="numeric" value={task.points} onChange={e => set('points', e.target.value)} /></Field>
          </div>
        </>}

        {task.mode === 'rank' && <RankForm task={task} set={set} setTask={setTask} />}

        {task.mode === 'estimate' && <div className="form2">
          <Field label="Richtiger Zahlenwert (größer als 0)"><input inputMode="decimal" value={task.answer} onChange={e => set('answer', e.target.value)} /></Field>
          <Field label="Einheit"><input value={task.unit} maxLength={30} placeholder="km, Jahre, Tore …" onChange={e => set('unit', e.target.value)} /></Field>
          <Field label="Zeit zum Schätzen (Sek.)"><input inputMode="numeric" value={task.seconds} onChange={e => set('seconds', e.target.value)} /></Field>
          <Field label="Zeit zum Setzen (Sek.)"><input inputMode="numeric" value={task.betSeconds} onChange={e => set('betSeconds', e.target.value)} /></Field>
          <Field label="Punkte für die beste Schätzung"><input inputMode="numeric" value={task.points} onChange={e => set('points', e.target.value)} /></Field>
          <Field label="Erlaubte Einsätze (mit Komma, beginnt mit 0)" hint="Einsätze sind nur bis zum vorhandenen Punktestand möglich."><input value={task.bets.join(', ')} onChange={e => set('bets', e.target.value.split(',').map((x: string) => x.trim()).filter(x => x !== ''))} /></Field>
        </div>}

        {task.mode === 'glitch' && <>
          <Field label="Hinweis während der Betrachtungsphase (TV)"><input value={task.viewPrompt} maxLength={120} onChange={e => set('viewPrompt', e.target.value)} /></Field>
          <div className="row between"><b>Szene wählen</b><button className="btn small" onClick={() => setBuilder(true)}>＋ Neue Szene aus Vorlage</button></div>
          <div className="scenegrid">{sceneList.map(s => (
            <button key={s.id} type="button" className={`scenecard ${task.scene === s.id ? 'sel' : ''}`} onClick={() => set('scene', s.id)}>
              <SceneView scene={sceneVariant(s, 'a')} className="scenemini" /><span>{s.title}{s.builtin ? '' : ' ★'}</span></button>))}</div>
          {sceneList.find(s => s.id === task.scene) && <div className="card"><h4>Unterschied &amp; Trefferzone</h4><ScenePair scene={sceneList.find(s => s.id === task.scene)!} />
            <p className="small muted">{diffZones(sceneList.find(s => s.id === task.scene)!).length} Unterschied(e) – jeder davon zählt als Treffer. Die Zone entsteht automatisch aus dem tatsächlichen Unterschied.</p></div>}
          <Field label="Suchauftrag (nach der Veränderung)"><input value={task.prompt} maxLength={200} onChange={e => set('prompt', e.target.value)} /></Field>
          <div className="form2">
            <Field label="Betrachtungszeit (Sek.)"><input inputMode="numeric" value={task.viewSeconds} onChange={e => set('viewSeconds', e.target.value)} /></Field>
            <Field label="Suchzeit (Sek.)"><input inputMode="numeric" value={task.seconds} onChange={e => set('seconds', e.target.value)} /></Field>
            <Field label="Punkte"><input inputMode="numeric" value={task.points} onChange={e => set('points', e.target.value)} /></Field>
          </div>
        </>}

        {task.mode === 'codebreak' && <>
          <Field label="Optionale Darstellung (Zahlenfolge, Raster …)" hint="Wird in Festbreitenschrift angezeigt, Zeilenumbrüche sind erlaubt."><textarea rows={3} className="mono" value={task.display ?? ''} onChange={e => set('display', e.target.value)} /></Field>
          <div className="form2">
            <Field label="Antwortart"><select value={task.input} onChange={e => set('input', e.target.value)}><option value="number">Zahl</option><option value="text">Text</option></select></Field>
            <Field label="Zeitlimit (Sek.)"><input inputMode="numeric" value={task.seconds} onChange={e => set('seconds', e.target.value)} /></Field>
            <Field label="Punkte"><input inputMode="numeric" value={task.points} onChange={e => set('points', e.target.value)} /></Field>
          </div>
          <Field label="Richtige Antwort(en) – eine pro Zeile (Varianten wie „zwei“ / „2“)" hint="Groß-/Kleinschreibung, Leerzeichen und Satzzeichen werden ignoriert."><textarea rows={3} value={(task.answers ?? []).join('\n')} onChange={e => set('answers', e.target.value.split('\n'))} /></Field>
          {[0, 1, 2].map(i => <Field key={i} label={`Hinweis ${i + 1} (optional, −25 % Punkte je Hinweis)`}><input value={task.hints[i] ?? ''} onChange={e => { const h = [...task.hints]; while (h.length < 3) h.push(''); h[i] = e.target.value; set('hints', h); }} /></Field>)}
        </>}

        {task.mode === 'unique' && <>
          <div className="form2">
            <Field label="Platzhalter im Eingabefeld"><input value={task.placeholder} maxLength={40} onChange={e => set('placeholder', e.target.value)} /></Field>
            <Field label="Zeitlimit (Sek.)"><input inputMode="numeric" value={task.seconds} onChange={e => set('seconds', e.target.value)} /></Field>
            <Field label="Punkte: einzigartige Antwort"><input inputMode="numeric" value={task.pointsUnique} onChange={e => set('pointsUnique', e.target.value)} /></Field>
            <Field label="Punkte: mehrfach genannt"><input inputMode="numeric" value={task.pointsShared} onChange={e => set('pointsShared', e.target.value)} /></Field>
          </div>
          <b>Gültige Antworten</b>
          <p className="small muted">Pro Zeile die richtige Schreibweise und optional Synonyme/Schreibvarianten (mit Komma). Tippfehler von 1–2 Buchstaben erkennt der Server automatisch. Unklare Antworten entscheidet der Showmaster.</p>
          {task.valid.map((v: any, i: number) => (
            <div className="row" key={i}>
              <input value={v.name} placeholder="Gültige Antwort" onChange={e => set('valid', task.valid.map((x: any, j: number) => j === i ? { ...x, name: e.target.value } : x))} />
              <input value={(v.variants ?? []).join(', ')} placeholder="Synonyme, Varianten (Komma)" onChange={e => set('valid', task.valid.map((x: any, j: number) => j === i ? { ...x, variants: e.target.value.split(',').map((y: string) => y.trim()) } : x))} />
              <button className="btn tiny ghost" onClick={() => set('valid', task.valid.filter((_: any, j: number) => j !== i))}>✕</button>
            </div>))}
          <button className="btn small ghost" disabled={task.valid.length >= 60} onClick={() => set('valid', [...task.valid, { name: '', variants: [] }])}>＋ Antwort</button>
        </>}

        {tail}
        <div className="maxline">Maximal erreichbar: <b>{Number.isFinite(taskMax(norm)) ? taskMax(norm) : '?'}</b> Punkte</div>
        {problems.length > 0 && <div className="card warnbox"><b>Noch offen:</b><ul>{problems.map(p => <li key={p}>{p}</li>)}</ul><small className="muted">Unvollständige Fragen können als Entwurf gespeichert, aber nicht veröffentlicht werden.</small></div>}
        {msg && <div className="status bad">{msg}</div>}
        <div className="row wrap">
          <button className="btn primary" onClick={save}>💾 Speichern</button>
          <button className="btn gold" disabled={problems.length > 0} onClick={() => setPrev(true)}>👀 Vorschau</button>
        </div>
      </div>
      {prev && <div onClick={e => e.stopPropagation()}><Preview task={task} meta={meta} onClose={() => setPrev(false)} /></div>}
      {builder && <div onClick={e => e.stopPropagation()}><SceneBuilder onClose={() => setBuilder(false)} onSaved={s => { setSceneList(l => [...l, s]); set('scene', s.id); setBuilder(false); }} /></div>}
    </div>
  );
}

function RankForm({ task, set, setTask }: { task: any; set: (k: string, v: any) => void; setTask: (t: any) => void }) {
  const swapItems = (i: number, j: number) => {
    if (j < 0 || j > 4) return;
    const items = task.items.slice(); [items[i], items[j]] = [items[j], items[i]];
    setTask({ ...task, items, order: task.order.map((v: number) => (v === i ? j : v === j ? i : v)) });
  };
  const moveOrder = (p: number, d: number) => {
    const q = p + d; if (q < 0 || q > 4) return;
    const o = task.order.slice(); [o[p], o[q]] = [o[q], o[p]]; set('order', o);
  };
  return (<>
    <div className="form2">
      <Field label="Beschriftung oben (Platz 1)"><input value={task.topLabel} placeholder="z. B. meiste Tore" onChange={e => set('topLabel', e.target.value)} /></Field>
      <Field label="Beschriftung unten (Platz 5)"><input value={task.bottomLabel} placeholder="z. B. wenigste Tore" onChange={e => set('bottomLabel', e.target.value)} /></Field>
    </div>
    <b>Begriffe in der KORREKTEN Reihenfolge (Platz 1 oben)</b>
    {task.items.map((it: any, i: number) => (
      <div className="row" key={i}>
        <span className="rankno">{i + 1}</span>
        <input value={it.text} placeholder={`Begriff ${i + 1}`} maxLength={60} onChange={e => set('items', task.items.map((x: any, j: number) => j === i ? { ...x, text: e.target.value } : x))} />
        <input style={{ maxWidth: 150 }} value={it.value ?? ''} placeholder="Wert (Auflösung)" onChange={e => set('items', task.items.map((x: any, j: number) => j === i ? { ...x, value: e.target.value } : x))} />
        <button className="btn tiny ghost" onClick={() => swapItems(i, i - 1)} disabled={i === 0}>▲</button><button className="btn tiny ghost" onClick={() => swapItems(i, i + 1)} disabled={i === 4}>▼</button>
      </div>))}
    <b>Reihenfolge, in der die Begriffe EINGEBLENDET werden</b>
    <p className="small muted">Mische so, dass nicht der erste Begriff schon Platz 1 verrät. Sie darf nicht der richtigen Reihenfolge entsprechen.</p>
    {task.order.map((idx: number, p: number) => (
      <div className="row" key={p}>
        <span className="rankno">{p + 1}.</span><span className="ordtext">{task.items[idx]?.text || `Begriff ${idx + 1}`}</span>
        <button className="btn tiny ghost" onClick={() => moveOrder(p, -1)} disabled={p === 0}>▲</button><button className="btn tiny ghost" onClick={() => moveOrder(p, 1)} disabled={p === 4}>▼</button>
      </div>))}
    <div className="form2">
      <Field label="Zeit pro Begriff (Sek.)"><input inputMode="numeric" value={task.secondsPerItem} onChange={e => set('secondsPerItem', e.target.value)} /></Field>
      <Field label="Punkte" hint="Verteilt auf 10 Begriffspaare"><input inputMode="numeric" value={task.points} onChange={e => set('points', e.target.value)} /></Field>
    </div>
  </>);
}
