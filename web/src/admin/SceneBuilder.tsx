import { useMemo, useState } from 'react';
import { buildScene, validateTemplate, type SceneTemplate } from '../../../shared/sceneTemplates';
import { diffZones, type Scene } from '../../../shared/scenes';
import { SceneView, sceneVariant } from '../ui/SceneView';
import { adm, errText } from './api';

/** Vorschau A | B mit Trefferzonen. */
export function ScenePair({ scene, zones }: { scene: Scene; zones?: { x: number; y: number; r: number }[] }) {
  const z = zones ?? diffZones(scene);
  return (
    <div className="scenepair">
      <div><small>Bild A (Betrachtung)</small><SceneView scene={sceneVariant(scene, 'a')} className="scenemini" /></div>
      <div><small>Bild B (Suche) – grün gestrichelt: gültige Trefferzone</small><SceneView scene={sceneVariant(scene, 'b')} zones={z} className="scenemini" /></div>
    </div>
  );
}

const DEFAULTS: Record<SceneTemplate['kind'], SceneTemplate> = {
  grid: { kind: 'grid', title: 'Raster', emoji: '🔵', oddEmoji: '🟣', cols: 8, rows: 5, oddRow: 2, oddCol: 5 },
  list: { kind: 'list', title: 'Speisekarte', style: 'menu', rows: [{ label: 'Gulaschsuppe', value: '6,50' }, { label: 'Schnitzel', value: '14,90' }, { label: 'Apfelstrudel', value: '5,20' }, { label: 'Currywurst', value: '7,90' }], changeRow: 1, newValue: '19,40' },
  table: { kind: 'table', title: 'Tabelle', headers: ['Team', 'S', 'U', 'N', 'Pkt'], rows: [['Team A', '3', '1', '0', '10'], ['Team B', '2', '2', '0', '8'], ['Team C', '1', '1', '2', '4']], changeRow: 1, changeCol: 4, newValue: '9' },
  pitch: { kind: 'pitch', title: 'Taktiktafel', change: 'ball', index: 0, dx: 120, dy: -80 },
};
const KIND_LABEL: Record<string, string> = { grid: '🔳 Raster (ein Symbol weicht ab)', list: '🧾 Liste / Speisekarte / Kassenzettel', table: '📊 Tabelle (eine Zelle ändert sich)', pitch: '⚽ Spielfeld (Spieler/Ball verschoben)' };

export function SceneBuilder({ initial, sceneId, onClose, onSaved }: { initial?: SceneTemplate; sceneId?: string; onClose: () => void; onSaved: (s: Scene) => void }) {
  const [t, setT] = useState<SceneTemplate>(initial ?? DEFAULTS.grid);
  const [msg, setMsg] = useState('');
  const errors = useMemo(() => validateTemplate(t), [t]);
  const scene = useMemo(() => (errors.length ? null : buildScene('preview', t)), [t, errors.length]);
  const set = (patch: any) => setT({ ...t, ...patch } as SceneTemplate);
  const num = (v: string) => Number(v);
  const save = async () => {
    const r = sceneId ? await adm('PUT', '/scenes/' + sceneId, { template: t }) : await adm('POST', '/scenes', { template: t });
    if (r.ok) onSaved(r.data); else setMsg(errText(r));
  };
  return (
    <div className="modal" onClick={onClose}>
      <div className="modalbox wide" onClick={e => e.stopPropagation()}>
        <div className="row between"><h2>🖼️ {sceneId ? 'Szene bearbeiten' : 'Neue Szene aus Vorlage'}</h2><button className="btn small ghost" onClick={onClose}>Schließen ✕</button></div>
        {!sceneId && <div className="chips">{(Object.keys(DEFAULTS) as SceneTemplate['kind'][]).map(k => <button key={k} className={`chipbtn ${t.kind === k ? 'sel' : ''}`} onClick={() => setT(DEFAULTS[k])}>{KIND_LABEL[k]}</button>)}</div>}
        <label className="field"><span>Titel der Szene</span><input value={t.title} onChange={e => set({ title: e.target.value })} maxLength={40} /></label>
        {t.kind === 'grid' && <div className="form2">
          <label className="field"><span>Normales Symbol</span><input value={t.emoji} onChange={e => set({ emoji: e.target.value })} /></label>
          <label className="field"><span>Abweichendes Symbol</span><input value={t.oddEmoji} onChange={e => set({ oddEmoji: e.target.value })} /></label>
          <label className="field"><span>Spalten (3–12)</span><input inputMode="numeric" value={t.cols} onChange={e => set({ cols: num(e.target.value) })} /></label>
          <label className="field"><span>Zeilen (2–8)</span><input inputMode="numeric" value={t.rows} onChange={e => set({ rows: num(e.target.value) })} /></label>
          <label className="field"><span>Abweichung in Zeile</span><input inputMode="numeric" value={t.oddRow + 1} onChange={e => set({ oddRow: num(e.target.value) - 1 })} /></label>
          <label className="field"><span>… und Spalte</span><input inputMode="numeric" value={t.oddCol + 1} onChange={e => set({ oddCol: num(e.target.value) - 1 })} /></label>
        </div>}
        {t.kind === 'list' && <>
          <label className="field"><span>Stil</span><select value={t.style} onChange={e => set({ style: e.target.value })}><option value="menu">Speisekarte</option><option value="receipt">Kassenzettel</option><option value="dark">Dunkel</option></select></label>
          {t.rows.map((r, i) => (
            <div className="row" key={i}>
              <input value={r.label} placeholder="Text" onChange={e => set({ rows: t.rows.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
              <input style={{ maxWidth: 120 }} value={r.value} placeholder="Wert" onChange={e => set({ rows: t.rows.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} />
              <label className="check"><input type="radio" checked={t.changeRow === i} onChange={() => set({ changeRow: i })} />ändert sich</label>
              <button className="btn tiny ghost" disabled={t.rows.length <= 2} onClick={() => set({ rows: t.rows.filter((_, j) => j !== i), changeRow: Math.min(t.changeRow, t.rows.length - 2) })}>✕</button>
            </div>))}
          <button className="btn small ghost" disabled={t.rows.length >= 9} onClick={() => set({ rows: [...t.rows, { label: '', value: '' }] })}>＋ Zeile</button>
          <label className="field"><span>Neuer Wert der markierten Zeile (Bild B)</span><input value={t.newValue} onChange={e => set({ newValue: e.target.value })} /></label>
        </>}
        {t.kind === 'table' && <>
          <label className="field"><span>Spaltenüberschriften (mit Komma trennen, 2–7)</span><input value={t.headers.join(', ')} onChange={e => { const h = e.target.value.split(',').map(x => x.trim()).slice(0, 7); setT({ ...t, headers: h, rows: t.rows.map(r => h.map((_, c) => r[c] ?? '')) } as SceneTemplate); }} /></label>
          <div className="tablescroll"><table className="edtable"><tbody>{t.rows.map((r, ri) => (
            <tr key={ri}>{r.map((c, ci) => <td key={ci}><input value={c} className={t.changeRow === ri && t.changeCol === ci ? 'chg' : ''} onChange={e => set({ rows: t.rows.map((x, j) => j === ri ? x.map((y, k) => k === ci ? e.target.value : y) : x) })} onFocus={() => set({ changeRow: ri, changeCol: ci })} /></td>)}
              <td><button className="btn tiny ghost" disabled={t.rows.length <= 2} onClick={() => set({ rows: t.rows.filter((_, j) => j !== ri), changeRow: 0 })}>✕</button></td></tr>))}</tbody></table></div>
          <button className="btn small ghost" disabled={t.rows.length >= 10} onClick={() => set({ rows: [...t.rows, t.headers.map(() => '')] })}>＋ Zeile</button>
          <p className="small muted">Klicke in eine Zelle, um sie als „verändert“ zu markieren (orange). Aktuell: Zeile {t.changeRow + 1}, Spalte {t.changeCol + 1}.</p>
          <label className="field"><span>Neuer Wert dieser Zelle (Bild B)</span><input value={t.newValue} onChange={e => set({ newValue: e.target.value })} /></label>
        </>}
        {t.kind === 'pitch' && <div className="form2">
          <label className="field"><span>Was ändert sich?</span><select value={t.change} onChange={e => set({ change: e.target.value })}><option value="ball">Ball wird verschoben</option><option value="home">Rotes Teammitglied wird verschoben</option><option value="away">Blaues Teammitglied wird verschoben</option><option value="remove-home">Rotes Teammitglied verschwindet</option></select></label>
          <label className="field"><span>Spieler-Nr. (1–11)</span><input inputMode="numeric" value={t.index + 1} onChange={e => set({ index: num(e.target.value) - 1 })} /></label>
          <label className="field"><span>Verschiebung rechts (−/+)</span><input inputMode="numeric" value={t.dx} onChange={e => set({ dx: num(e.target.value) })} /></label>
          <label className="field"><span>Verschiebung unten (−/+)</span><input inputMode="numeric" value={t.dy} onChange={e => set({ dy: num(e.target.value) })} /></label>
        </div>}
        {errors.length > 0 && <div className="status bad">{errors.join(' · ')}</div>}
        {scene && <ScenePair scene={scene} />}
        {msg && <div className="status bad">{msg}</div>}
        <button className="btn primary wide" disabled={errors.length > 0} onClick={save}>💾 Szene speichern</button>
      </div>
    </div>
  );
}
