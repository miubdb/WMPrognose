import { useEffect, useMemo, useState } from 'react';
import type { Mode } from '../../../shared/types';
import { MODE_LABEL, normalizeTask, taskMax, validateTask } from '../../../shared/validate';
import { diffZones, type Scene } from '../../../shared/scenes';
import { MapView } from '../ui/MapView';
import { adm, errText } from './api';
import { Preview } from './Preview';
import { GAMES } from '../../../shared/games';
import { SceneBuilder, ScenePair } from './SceneBuilder';
import { SceneView, sceneVariant } from '../ui/SceneView';

export const MODE_ICON: Record<string, string> = { geo: '🧭', rank: '↕️', estimate: '🎯', glitch: '👁️', codebreak: '🧩', unique: '✨', match: '🧲', link: '🔗', vote: '🤝', bluff: '😈', corridor: '↔️', twist: '🔄', pixel: '🟪', duel: '⚔️', arena: '🏟️', sound: '🎧', timeline: '⏳', panic: '🚨', impostor: '🕵️' };
export const MODE_HELP: Record<string, string> = {
  geo: 'Spieler setzen einen Pin auf der Karte. Gewertet wird die Platzierung nach Entfernung.',
  rank: 'Fünf Begriffe erscheinen nacheinander; jeder muss sofort auf einen Rangplatz. Gewertet werden richtig angeordnete Paare.',
  estimate: 'Geheim schätzen, dann auf eine Schätzung Punkte setzen. Die beste Schätzung bekommt die meisten Punkte.',
  glitch: 'Ein Bild wird kurz gezeigt, dann verändert. Spieler tippen auf die veränderte Stelle.',
  codebreak: 'Ein Rätsel mit eindeutiger Lösung. Hinweise kosten Punkte, drei Versuche.',
  unique: 'Alle nennen eine gültige Antwort – nur einzigartige Antworten bringen volle Punkte.',
  match: 'Sechs Paare verbinden: je richtigem Paar 50 Punkte, höchstens 300. Keine Minuspunkte.',
  pixel: 'Ein Bild wird stufenweise schärfer – je früher erkannt, desto mehr Punkte.',
  duel: 'Zwei Spieler duellieren sich in drei Fragen, die anderen tippen auf den Sieger.',
  arena: 'Alle beantworten dieselben drei Fragen – wer falsch liegt, scheidet aus.',
  sound: 'Ein Geräusch erkennen: erstes Hören, zweites Hören, Hinweis.',
  timeline: 'Ein Ereignis zwischen vier feste Ankerereignisse einordnen.',
  panic: 'Teamspiel: verteilte Hinweise ergeben gemeinsam einen Code.',
  impostor: 'Alle kennen ein geheimes Wort – bis auf einen Hochstapler.',
  bluff: 'Alle erfinden eine falsche Antwort, dann wird die echte gesucht. Punkte fürs Erkennen und fürs Täuschen.',
  corridor: 'Einen Zahlenbereich (von … bis …) angeben: Treffer zählt, je enger desto mehr Punkte.',
  twist: 'Ein bekannter Titel wurde ins Gegenteil verdreht – das Original eintippen, je schneller desto mehr Punkte.',
  link: 'Vier Hinweise erscheinen nacheinander (alle 12 s) – je früher die richtige Lösung, desto mehr Punkte (300/225/150/75).',
};

export function newTask(mode: Mode): any {
  switch (mode) {
    case 'geo': return { mode, prompt: '', map: 'world', answer: { lat: 20, lon: 0, label: '' }, seconds: 35, points: 250, explain: '' };
    case 'rank': return { mode, prompt: '', topLabel: '', bottomLabel: '', items: [0, 1, 2, 3, 4].map(() => ({ text: '', value: '' })), order: [2, 4, 0, 3, 1], secondsPerItem: 12, points: 330, explain: '' };
    case 'estimate': return { mode, prompt: '', unit: '', answer: '', seconds: 45, betSeconds: 30, points: 300, bets: [0, 100, 200], explain: '' };
    case 'glitch': return { mode, prompt: '', viewPrompt: 'Merk dir das Bild!', scene: '', viewSeconds: 12, seconds: 25, points: 250, explain: '' };
    case 'codebreak': return { mode, prompt: '', display: '', input: 'number', answers: [], hints: ['', '', ''], seconds: 90, points: 300, explain: '' };
    case 'match': return { mode, prompt: '', pairs: [0, 1, 2, 3, 4, 5].map(() => ({ left: '', right: '' })), order: [2, 4, 0, 5, 1, 3], seconds: 60, points: 300, explain: '' };
    case 'vote': return { mode, prompt: '', seconds: 45, points: 600, explain: '' };
    case 'pixel': return { mode, prompt: 'Was ist auf dem Bild zu sehen?', answer: '', accept: [], levels: [], levelSeconds: 6, explain: '' };
    case 'duel': return { mode, prompt: 'WER KENNT SICH BESSER AUS? – Thema', questions: [0, 1, 2].map(() => ({ q: '', options: ['', '', '', ''], correct: 0 })), seconds: 20, explain: '' };
    case 'arena': return { mode, prompt: 'DIE ARENA – Thema', questions: [0, 1, 2].map(() => ({ q: '', options: ['', '', '', ''], correct: 0 })), seconds: 20, explain: '' };
    case 'sound': return { mode, prompt: 'Was hörst du?', answer: '', accept: [], audio: '', audio2: '', hint: '', playSeconds: 15, explain: '' };
    case 'timeline': return { mode, prompt: '', anchors: [0, 1, 2, 3].map(() => ({ year: '', label: '' })), answerYear: '', answerLabel: '', seconds: 40, explain: '' };
    case 'panic': return { mode, prompt: '', code: '', clues: ['', '', '', ''], seconds: 90, explain: '' };
    case 'impostor': return { mode, prompt: '', word: '', accept: [], seconds: 40, voteSeconds: 45, explain: '' };
    case 'bluff': return { mode, prompt: '', answer: '', accept: [], seconds: 45, pickSeconds: 30, points: 200, bluffPoints: 100, explain: '' };
    case 'corridor': return { mode, prompt: '', unit: '', answer: '', seconds: 45, points: 300, explain: '' };
    case 'twist': return { mode, prompt: 'Welcher bekannte Titel steckt dahinter?', twisted: '', answer: '', accept: [], seconds: 40, points: 300, explain: '' };
    case 'link': return { mode, prompt: 'Was oder wer wird gesucht?', clues: ['', '', '', ''], answer: '', accept: [], clueSeconds: 20, points: 300, explain: '' };
    case 'unique': return { mode, prompt: '', closed: false, placeholder: '', valid: [0, 1, 2].map(() => ({ name: '', variants: [] })), seconds: 45, pointsUnique: 500, pointsShared: 150, explain: '' };
  }
}

/** Bild verkleinern und in fünf Verpixelungsstufen umrechnen (im Browser – kein Server nötig). */
async function makePixelLevels(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file); const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const S = 480, src = document.createElement('canvas'); src.width = S; src.height = S; const c = src.getContext('2d')!; c.fillStyle = '#1a1f3a'; c.fillRect(0, 0, S, S);
  const k = Math.min(S / img.width, S / img.height); c.drawImage(img, (S - img.width * k) / 2, (S - img.height * k) / 2, img.width * k, img.height * k); URL.revokeObjectURL(url);
  return [6, 10, 18, 40, 0].map(n => { const o = document.createElement('canvas'); o.width = S; o.height = S; const oc = o.getContext('2d')!; if (!n) { oc.drawImage(src, 0, 0); return o.toDataURL('image/jpeg', 0.85); } const t = document.createElement('canvas'); t.width = n; t.height = n; t.getContext('2d')!.drawImage(src, 0, 0, n, n); oc.imageSmoothingEnabled = false; oc.drawImage(t, 0, 0, S, S); return o.toDataURL('image/png'); });
}
const readDataUri = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small className="muted">{hint}</small>}</label>;
}

const num = (set: (k: string, v: any) => void, k: string) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value);

export function QuestionEditor({ id, mode, initial, scenes, onClose, onSaved, meta }: {
  id?: string; mode?: Mode; initial?: { task: any; topic: string; updated?: number }; scenes: Scene[]; onClose: () => void; onSaved: (q: any) => void; meta?: any;
}) {
  const [task, setTask] = useState<any>(initial?.task ?? newTask(mode ?? 'geo'));
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [msg, setMsg] = useState('');
  const [prev, setPrev] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [sceneList, setSceneList] = useState<Scene[]>(scenes);
  const [builder, setBuilder] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSceneList(scenes), [scenes]);
  const set = (k: string, v: any) => setTask({ ...task, [k]: v });
  const problems = useMemo(() => validateTask(normalizeTask(task), sid => sceneList.some(s => s.id === sid)), [task, sceneList]);
  const save = async () => {
    setBusy(true); setMsg('');
    const r = id ? await adm('PUT', '/questions/' + id, { task, topic, ifUpdated: initial?.updated }) : await adm('POST', '/questions', { task, topic });
    setBusy(false);
    if (r.ok) onSaved(r.data); else setMsg(errText(r));
  };
  const norm: any = normalizeTask(task);
  const m = task.mode as Mode;
  const pinOk = m === 'geo' && Number.isFinite(norm.answer?.lat) && Number.isFinite(norm.answer?.lon);
  const sec = (label: string, key: string, ph?: string) => <Field label={label}><input inputMode="numeric" value={task[key]} placeholder={ph} onChange={num(set, key)} /></Field>;
  if (m === 'codebreak') return (
    <div className="modal" onClick={onClose}><div className="modalbox editor" onClick={e => e.stopPropagation()}>
      <h2>🧩 CODEBREAK (veraltet)</h2>
      <div className="card warnbox"><b>CODEBREAK wird nicht mehr verwendet.</b><p className="small">Diese Frage bleibt gespeichert (z. B. in älteren Paketen und Backups), kann aber nicht mehr bearbeitet und nicht in neue Pakete übernommen werden.</p><p className="small muted">{task.prompt}</p></div>
      <div className="actionbar"><span className="spacer" /><button className="btn" onClick={onClose}>Schließen</button></div></div></div>
  );
  return (
    <div className="modal" onClick={onClose}>
      <div className="modalbox wide editor" onClick={e => e.stopPropagation()}>
        <div className="row between sticky-top"><h2>{MODE_ICON[m]} {id ? 'Frage bearbeiten' : 'Neue Frage'} <span className="muted modename">{MODE_LABEL[m]}</span></h2><button className="btn small ghost" onClick={onClose}>Schließen ✕</button></div>

        {(() => { const g = GAMES.find(x => x.mode === m); return g ? <div className="gameinfo"><b>{g.icon} {g.name}</b> – {g.short}<br /><span className="muted">Du legst an: {g.ask}</span></div> : null; })()}

        {m !== 'glitch' && <Field label={m === 'link' ? 'Überschrift' : m === 'impostor' ? 'Thema' : m === 'timeline' ? 'Frage (Ereignis)' : m === 'duel' || m === 'arena' ? 'Titel auf dem TV' : m === 'panic' ? 'Titel des Rätsels' : 'Fragetext'}><textarea rows={2} value={task.prompt} maxLength={300} placeholder={m === 'link' ? 'z. B. Wer oder was wird gesucht?' : m === 'match' ? 'z. B. Was haben diese Unternehmen ursprünglich hergestellt?' : 'Was soll gefragt werden?'} onChange={e => set('prompt', e.target.value)} /></Field>}

        {m === 'geo' && <>
          <Field label="Ortsname (für die Auflösung)"><input value={task.answer.label} maxLength={80} placeholder="z. B. Timbuktu, Mali" onChange={e => set('answer', { ...task.answer, label: e.target.value })} /></Field>
          <div className="seg" role="tablist">{([['germany', 'Deutschland'], ['europe', 'Europa'], ['world', 'Welt']] as const).map(([k, l]) => <button key={k} type="button" className={task.map === k ? 'on' : ''} onClick={() => set('map', k)}>{l}</button>)}</div>
          <MapView key={task.map} kind={task.map} mode="pick" pin={pinOk ? { lat: norm.answer.lat, lon: norm.answer.lon } : null}
            onPin={ll => set('answer', { ...task.answer, lat: Math.round(ll.lat * 1e4) / 1e4, lon: Math.round(ll.lon * 1e4) / 1e4 })} className="adminmap" />
          <p className="small muted">Antippen setzt die richtige Position, der Pin lässt sich verschieben. Zoomen: Doppeltippen, + / − oder zwei Finger.</p>
        </>}

        {m === 'rank' && <RankForm task={task} set={set} setTask={setTask} />}

        {m === 'estimate' && <div className="form2">
          <Field label="Richtiger Wert"><input inputMode="decimal" value={task.answer} onChange={num(set, 'answer')} /></Field>
          <Field label="Einheit"><input value={task.unit} maxLength={30} placeholder="km, Jahre, Tore …" onChange={e => set('unit', e.target.value)} /></Field>
        </div>}

        {m === 'glitch' && <>
          <Field label="Suchauftrag"><input value={task.prompt} maxLength={200} placeholder="Was hat sich verändert?" onChange={e => set('prompt', e.target.value)} /></Field>
          <div className="row between"><b>Szene</b><button className="btn small" onClick={() => setBuilder(true)}>＋ Neue Szene</button></div>
          <div className="scenegrid">{sceneList.map(s => (
            <button key={s.id} type="button" className={`scenecard ${task.scene === s.id ? 'sel' : ''}`} onClick={() => set('scene', s.id)}>
              <SceneView scene={sceneVariant(s, 'a')} className="scenemini" /><span>{s.title}{s.builtin ? '' : ' ★'}</span></button>))}</div>
          {sceneList.find(s => s.id === task.scene) && <details className="more"><summary>Unterschied &amp; Trefferzone ansehen</summary><ScenePair scene={sceneList.find(s => s.id === task.scene)!} />
            <p className="small muted">{diffZones(sceneList.find(s => s.id === task.scene)!).length} Unterschied(e), jeder zählt als Treffer.</p></details>}
        </>}

        {m === 'match' && <>
          <b>Sechs Paare (links gehört zu rechts)</b>
          {task.pairs.map((p: any, i: number) => (
            <div className="row" key={i}>
              <span className="rankno">{i + 1}</span>
              <input value={p.left} placeholder={`Links ${i + 1}`} maxLength={50} onChange={e => set('pairs', task.pairs.map((x: any, j: number) => j === i ? { ...x, left: e.target.value } : x))} />
              <span className="muted">=</span>
              <input value={p.right} placeholder={`Passend rechts ${i + 1}`} maxLength={50} onChange={e => set('pairs', task.pairs.map((x: any, j: number) => j === i ? { ...x, right: e.target.value } : x))} />
            </div>))}
          <details className="more"><summary>Mischung der rechten Spalte</summary>
            <p className="small muted">So sehen die Spieler die rechte Spalte (von oben nach unten):</p>
            <ol>{task.order.map((o: number, k: number) => <li key={k}>{task.pairs[o]?.right || <i className="muted">(leer)</i>}</li>)}</ol>
            <button className="btn small" onClick={() => { let o: number[]; do { o = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5); } while (o.every((v, i) => v === i)); set('order', o); }}>🔀 Neu mischen</button>
          </details>
        </>}

        {m === 'link' && <>
          <b>Vier Hinweise – von schwer (1) zu leicht (4)</b>
          {task.clues.map((c: string, i: number) => <Field key={i} label={`Hinweis ${i + 1}${i === 0 ? ' (erscheint sofort, 300 Punkte)' : i === 1 ? ' (nach 12 s, 225)' : i === 2 ? ' (nach 24 s, 150)' : ' (nach 36 s, 75)'}`}><textarea rows={2} maxLength={220} value={c} onChange={e => set('clues', task.clues.map((x: string, j: number) => j === i ? e.target.value : x))} /></Field>)}
          <div className="form2">
            <Field label="Hauptlösung"><input value={task.answer} maxLength={80} onChange={e => set('answer', e.target.value)} /></Field>
            <Field label="Weitere gültige Schreibweisen (eine pro Zeile)"><textarea rows={2} value={(task.accept ?? []).join('\n')} onChange={e => set('accept', e.target.value.split('\n'))} /></Field>
          </div>
        </>}

        {m === 'bluff' && <div className="form2">
          <Field label="Richtige Antwort" hint="Kurz und eindeutig – die Spieler müssen sie zwischen ihren Erfindungen erkennen."><input value={task.answer} maxLength={60} onChange={e => set('answer', e.target.value)} /></Field>
          <Field label="Weitere Schreibweisen der Wahrheit (eine pro Zeile)" hint="Wer genau diese schreibt, bekommt „zu nah an der Wahrheit“."><textarea rows={2} value={(task.accept ?? []).join('\n')} onChange={e => set('accept', e.target.value.split('\n'))} /></Field>
        </div>}
        {m === 'corridor' && <div className="form2">
          <Field label="Richtige Zahl"><input inputMode="decimal" value={task.answer} onChange={e => set('answer', e.target.value)} /></Field>
          <Field label="Einheit"><input value={task.unit} maxLength={30} placeholder="z. B. Meter" onChange={e => set('unit', e.target.value)} /></Field>
        </div>}
        {m === 'twist' && <>
          <Field label="Verdrehter Text" hint="z. B. „Langsame und Neugierige“ für Fast & Furious"><input value={task.twisted} maxLength={200} onChange={e => set('twisted', e.target.value)} /></Field>
          <div className="form2">
            <Field label="Original (richtige Antwort)"><input value={task.answer} maxLength={80} onChange={e => set('answer', e.target.value)} /></Field>
            <Field label="Weitere gültige Schreibweisen (eine pro Zeile)"><textarea rows={2} value={(task.accept ?? []).join('\n')} onChange={e => set('accept', e.target.value.split('\n'))} /></Field>
          </div>
        </>}

        {m === 'pixel' && <>
          <div className="form2">
            <Field label="Lösung"><input value={task.answer} maxLength={80} onChange={e => set('answer', e.target.value)} /></Field>
            <Field label="Weitere gültige Schreibweisen (eine pro Zeile)"><textarea rows={2} value={(task.accept ?? []).join('\n')} onChange={e => set('accept', e.target.value.split('\n'))} /></Field>
          </div>
          <Field label="Bild" hint="Nur Bilder, die ihr nutzen dürft (eigene Fotos, lizenzfrei). Die fünf Stufen entstehen automatisch."><input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { set('levels', await makePixelLevels(f)); } catch { setMsg('Bild konnte nicht gelesen werden.'); } }} /></Field>
          {task.levels?.length === 5 && task.levels[0] && <div className="pixthumbs">{task.levels.map((l: string, i: number) => <img key={i} src={l} alt={`Stufe ${i + 1}`} />)}</div>}
        </>}
        {(m === 'duel' || m === 'arena') && <>
          {task.questions.map((q: any, i: number) => (
            <div className="card small" key={i}><b>Frage {i + 1}</b>{m === 'arena' && <span className="muted"> {i === 0 ? '(leicht)' : i === 1 ? '(mittel)' : '(schwer)'}</span>}
              <input value={q.q} maxLength={200} placeholder="Fragetext" onChange={e => set('questions', task.questions.map((x: any, j: number) => j === i ? { ...x, q: e.target.value } : x))} />
              {q.options.map((o: string, k: number) => <div className="row" key={k}><input type="radio" name={`c${i}`} aria-label={`Antwort ${String.fromCharCode(65 + k)} ist richtig`} checked={Number(q.correct) === k} onChange={() => set('questions', task.questions.map((x: any, j: number) => j === i ? { ...x, correct: k } : x))} /><input value={o} maxLength={60} placeholder={`Antwort ${String.fromCharCode(65 + k)}${Number(q.correct) === k ? ' (richtig)' : ''}`} onChange={e => set('questions', task.questions.map((x: any, j: number) => j === i ? { ...x, options: x.options.map((y: string, l: number) => l === k ? e.target.value : y) } : x))} /></div>)}
            </div>))}
        </>}
        {m === 'sound' && <>
          <div className="form2">
            <Field label="Lösung"><input value={task.answer} maxLength={80} onChange={e => set('answer', e.target.value)} /></Field>
            <Field label="Weitere gültige Schreibweisen (eine pro Zeile)"><textarea rows={2} value={(task.accept ?? []).join('\n')} onChange={e => set('accept', e.target.value.split('\n'))} /></Field>
          </div>
          <Field label="Hinweis (erscheint nach dem zweiten Hören)"><input value={task.hint} maxLength={160} onChange={e => set('hint', e.target.value)} /></Field>
          {(['audio', 'audio2'] as const).map(k => <Field key={k} label={k === 'audio' ? 'Audio – erstes Hören (WAV/MP3, max. 1,5 MB)' : 'Audio – zweites Hören, z. B. deutlicher (optional)'} hint="Nur Töne, die ihr nutzen dürft (selbst aufgenommen, lizenzfrei).">
            <div className="row"><input type="file" accept="audio/*" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 1_500_000) { setMsg('Datei zu groß (max. 1,5 MB).'); return; } set(k, await readDataUri(f)); }} />{task[k] && <audio controls src={task[k]} />}{task[k] && <button type="button" className="btn tiny ghost" onClick={() => set(k, '')}>✕</button>}</div></Field>)}
        </>}
        {m === 'timeline' && <>
          <b>Vier Ankerereignisse (aufsteigend nach Jahr)</b>
          {task.anchors.map((a: any, i: number) => <div className="row" key={i}><input style={{ maxWidth: 110 }} inputMode="numeric" placeholder="Jahr" value={a.year} onChange={e => set('anchors', task.anchors.map((x: any, j: number) => j === i ? { ...x, year: e.target.value } : x))} /><input placeholder="Ereignis" value={a.label} maxLength={60} onChange={e => set('anchors', task.anchors.map((x: any, j: number) => j === i ? { ...x, label: e.target.value } : x))} /></div>)}
          <div className="form2"><Field label="Gesuchtes Jahr" hint="Darf nicht gleich einem Ankerjahr sein."><input inputMode="numeric" value={task.answerYear} onChange={e => set('answerYear', e.target.value)} /></Field>
            <Field label="Bezeichnung (für die Auflösung)"><input value={task.answerLabel} maxLength={80} placeholder="z. B. YouTube gegründet" onChange={e => set('answerLabel', e.target.value)} /></Field></div>
        </>}
        {m === 'panic' && <>
          <Field label="Code (3 Ziffern)"><input inputMode="numeric" maxLength={3} value={task.code} onChange={e => set('code', e.target.value.replace(/\D/g, '').slice(0, 3))} /></Field>
          <b>Hinweise (werden auf die Handys verteilt – nur alle zusammen ergeben den Code)</b>
          {task.clues.map((c: string, i: number) => <div className="row" key={i}><input value={c} maxLength={200} placeholder={`Hinweis ${i + 1}`} onChange={e => set('clues', task.clues.map((x: string, j: number) => j === i ? e.target.value : x))} />{task.clues.length > 3 && <button type="button" className="btn tiny ghost" onClick={() => set('clues', task.clues.filter((_: string, j: number) => j !== i))}>✕</button>}</div>)}
          {task.clues.length < 8 && <button type="button" className="btn small ghost" onClick={() => set('clues', [...task.clues, ''])}>＋ Hinweis</button>}
        </>}
        {m === 'impostor' && <div className="form2">
          <Field label="Geheimes Wort"><input value={task.word} maxLength={40} onChange={e => set('word', e.target.value)} /></Field>
          <Field label="Weitere Schreibweisen (eine pro Zeile)"><textarea rows={2} value={(task.accept ?? []).join('\n')} onChange={e => set('accept', e.target.value.split('\n'))} /></Field>
        </div>}

        {m === 'unique' && <>
          <b>Gültige Antworten</b>
          {task.valid.map((v: any, i: number) => (
            <div className="row" key={i}>
              <input value={v.name} placeholder="Gültige Antwort" onChange={e => set('valid', task.valid.map((x: any, j: number) => j === i ? { ...x, name: e.target.value } : x))} />
              <input value={(v.variants ?? []).join(', ')} placeholder="Schreibweisen (Komma)" onChange={e => set('valid', task.valid.map((x: any, j: number) => j === i ? { ...x, variants: e.target.value.split(',').map((y: string) => y.trim()) } : x))} />
              <button className="btn tiny ghost" aria-label="Entfernen" onClick={() => set('valid', task.valid.filter((_: any, j: number) => j !== i))}>✕</button>
            </div>))}
          <button className="btn small ghost" disabled={task.valid.length >= 60} onClick={() => set('valid', [...task.valid, { name: '', variants: [] }])}>＋ Antwort</button>
        </>}

        <Field label="Lösungserklärung (optional, erscheint bei der Auflösung)"><textarea rows={2} value={task.explain} maxLength={500} placeholder="Ein Satz mit einem netten Zusatzfakt" onChange={e => set('explain', e.target.value)} /></Field>

        <details className="more"><summary>Weitere Einstellungen</summary>
          <div className="form2">
            <Field label="Thema (zum Filtern)"><input value={topic} maxLength={60} placeholder="z. B. Fußball, Geografie" onChange={e => setTopic(e.target.value)} /></Field>
            {m === 'geo' && <>
              <Field label="Breite (lat)"><input inputMode="decimal" value={task.answer.lat} onChange={e => set('answer', { ...task.answer, lat: e.target.value })} /></Field>
              <Field label="Länge (lon)"><input inputMode="decimal" value={task.answer.lon} onChange={e => set('answer', { ...task.answer, lon: e.target.value })} /></Field>
              {sec('Zeit (Sek.)', 'seconds')}{sec('Punkte', 'points')}
            </>}
            {m === 'rank' && <>{sec('Sek. pro Begriff', 'secondsPerItem')}{sec('Punkte', 'points')}<label className="field"><span>Bedienung</span><select value={task.variant ?? 'sequence'} onChange={e => set('variant', e.target.value)}><option value="sequence">Begriffe nacheinander (klassisch)</option><option value="sort">Alle fünf sichtbar & sortieren</option></select></label></>}
            {m === 'estimate' && <>{sec('Zeit zum Schätzen (Sek.)', 'seconds')}{sec('Zeit zum Setzen (Sek.)', 'betSeconds')}{sec('Punkte', 'points')}
              <Field label="Einsatzstufen (veraltet – es gilt: bis 50 % des Punktestands)"><input value={task.bets.join(', ')} onChange={e => set('bets', e.target.value.split(',').map((x: string) => x.trim()).filter(x => x !== ''))} /></Field></>}
            {m === 'glitch' && <>
              <p className="small muted">Wertung: Treffer = volle Punkte, sonst 0 (keine Trostpunkte).</p>
              <Field label="Hinweis beim Betrachten"><input value={task.viewPrompt} maxLength={120} onChange={e => set('viewPrompt', e.target.value)} /></Field>
              {sec('Betrachtungszeit (Sek.)', 'viewSeconds')}{sec('Suchzeit (Sek.)', 'seconds')}{sec('Punkte', 'points')}</>}
            {m === 'match' && <>{sec('Zeit (Sek.)', 'seconds')}<p className="small muted">Fest: 50 Punkte je richtigem Paar (max. 300), keine Minuspunkte.</p></>}
            {m === 'vote' && <>{sec('Zeit (Sek.)', 'seconds')}{sec('Punkte je richtiger Wahl', 'points')}<Field label="Zusätzlicher Kandidat (optional, z. B. Showmaster)"><input value={task.candidate ?? ''} maxLength={40} onChange={e => set('candidate', e.target.value)} /></Field><p className="small muted">Nur im Finale einsetzbar. Jeder wählt geheim eine Person; Punkte für alle, die die Wahl mit den meisten Stimmen getroffen haben (mind. 2 Stimmen; bei Gleichstand zählen alle Spitzenwahlen). Der Zusatzkandidat bekommt keine Punkte.</p></>}
            {m === 'pixel' && <>{sec('Sekunden je Stufe', 'levelSeconds')}</>}
            {(m === 'duel' || m === 'arena') && <>{sec('Sekunden je Frage', 'seconds')}</>}
            {m === 'sound' && <>{sec('Sekunden je Hör-Stufe', 'playSeconds')}</>}
            {m === 'timeline' && <>{sec('Zeit (Sek.)', 'seconds')}</>}
            {m === 'panic' && <>{sec('Zeit (Sek.)', 'seconds')}</>}
            {m === 'impostor' && <>{sec('Sekunden für Hinweise', 'seconds')}{sec('Sekunden für die Abstimmung', 'voteSeconds')}</>}
            {m === 'bluff' && <>{sec('Zeit zum Erfinden (Sek.)', 'seconds')}{sec('Zeit zum Raten (Sek.)', 'pickSeconds')}{sec('Punkte fürs Erkennen', 'points')}{sec('Punkte je Hereingefallenem', 'bluffPoints')}</>}
            {m === 'corridor' && <>{sec('Zeit (Sek.)', 'seconds')}{sec('Maximalpunkte', 'points')}<p className="small muted">Nur Treffer zählen; Punkte sinken mit der Breite des Bereichs (mind. 10 %).</p></>}
            {m === 'twist' && <>{sec('Zeit (Sek.)', 'seconds')}{sec('Maximalpunkte', 'points')}<p className="small muted">Schnelligkeit zählt: sofort 100 %, am Ende 50 %.</p></>}
            {m === 'link' && <>{sec('Sekunden je Hinweis', 'clueSeconds')}<p className="small muted">Fest: 300 / 225 / 150 / 75 Punkte, eine endgültige Antwort je Spieler.</p></>}
            {m === 'unique' && <>
              <Field label="Platzhalter im Eingabefeld"><input value={task.placeholder} maxLength={40} onChange={e => set('placeholder', e.target.value)} /></Field>
              {sec('Zeit (Sek.)', 'seconds')}{sec('Punkte (nur einmalig genannte gültige Antwort)', 'pointsUnique')}
              <label className="field check"><input type="checkbox" checked={!!task.closed} onChange={e => set('closed', e.target.checked)} /> <span>Die Antwortliste ist <b>vollständig</b> (z. B. Farben der Flagge): Unbekanntes wird automatisch ungültig. Bei offenen Fragen aus – dann prüft der Showmaster.</span></label>
              <p className="small muted">Mehrfach genannte Antworten zählen immer 0 Punkte.</p></>}
          </div>
        </details>

        {msg && <div className="status bad">{msg}</div>}
        {showProblems && problems.length > 0 && <div className="card warnbox"><ul>{problems.map(p => <li key={p}>{p}</li>)}</ul></div>}
        <div className="actionbar">
          <span className="maxline">{Number.isFinite(taskMax(norm)) ? taskMax(norm) : '?'} P.</span>
          {problems.length > 0 && <button className="btn small ghost warnchip" onClick={() => setShowProblems(v => !v)}>⚠ {problems.length}<span className="hide-s"> offen</span></button>}
          <span className="spacer" />
          <button className="btn gold" disabled={problems.length > 0} onClick={() => setPrev(true)}>👀<span className="hide-s"> Testen</span></button>
          <button className="btn primary" disabled={busy} onClick={save}>💾 Speichern</button>
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
      <Field label="Platz 1 bedeutet …"><input value={task.topLabel} placeholder="z. B. meiste Tore" onChange={e => set('topLabel', e.target.value)} /></Field>
      <Field label="Platz 5 bedeutet …"><input value={task.bottomLabel} placeholder="z. B. wenigste Tore" onChange={e => set('bottomLabel', e.target.value)} /></Field>
    </div>
    <b>Richtige Reihenfolge</b>
    {task.items.map((it: any, i: number) => (
      <div className="row" key={i}>
        <span className="rankno">{i + 1}</span>
        <input value={it.text} placeholder={`Begriff ${i + 1}`} maxLength={60} onChange={e => set('items', task.items.map((x: any, j: number) => j === i ? { ...x, text: e.target.value } : x))} />
        <input style={{ maxWidth: 150 }} value={it.value ?? ''} placeholder="Wert (Auflösung)" onChange={e => set('items', task.items.map((x: any, j: number) => j === i ? { ...x, value: e.target.value } : x))} />
        <button className="btn tiny ghost" aria-label="Nach oben" onClick={() => swapItems(i, i - 1)} disabled={i === 0}>▲</button><button className="btn tiny ghost" aria-label="Nach unten" onClick={() => swapItems(i, i + 1)} disabled={i === 4}>▼</button>
      </div>))}
    <details className="more"><summary>Reihenfolge der Einblendung</summary>
      <p className="small muted">In dieser Reihenfolge erscheinen die Begriffe. Sie darf nicht der richtigen entsprechen.</p>
      {task.order.map((idx: number, p: number) => (
        <div className="row" key={p}>
          <span className="rankno">{p + 1}.</span><span className="ordtext">{task.items[idx]?.text || `Begriff ${idx + 1}`}</span>
          <button className="btn tiny ghost" aria-label="Früher" onClick={() => moveOrder(p, -1)} disabled={p === 0}>▲</button><button className="btn tiny ghost" aria-label="Später" onClick={() => moveOrder(p, 1)} disabled={p === 4}>▼</button>
        </div>))}
    </details>
  </>);
}
