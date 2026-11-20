// Aktualisierung (neue Inhalte, neue Paketversionen, Archivierung alter Pakete) – mit eindeutigem Status:
// keine Aktualisierung nötig · verfügbar · läuft · abgeschlossen · teilweise · Fehler. Nichts passiert ohne Bestätigung.
import { useCallback, useEffect, useState } from 'react';
import { adm, errText } from './api';
import { Badge, useConfirm } from './ui';

export type UpdState = 'loading' | 'clean' | 'available' | 'running' | 'done' | 'partial' | 'error';
interface Plan { rows: { id: string; name: string; action: string; needsUpdate: boolean; needsRename: boolean }[]; archive: string[]; update: string[]; rename: string[]; install: boolean; clean: boolean }

const nameOf = (plan: Plan, id: string) => plan.rows.find(r => r.id === id)?.name ?? id;
export function summaryOf(p: Plan): string[] {
  const out: string[] = [];
  if (p.install) out.push('Neue Spiele, Fragen und Pakete werden ergänzt.');
  if (p.update.length) out.push(`${p.update.length} Paket${p.update.length > 1 ? 'e bekommen' : ' bekommt'} eine neue Version.`);
  if (p.archive.length) out.push(`${p.archive.length} ältere${p.archive.length > 1 ? ' Pakete werden' : 's Paket wird'} archiviert (nicht gelöscht).`);
  if (p.rename.length) out.push('Ein Paket wird umbenannt.');
  return out;
}

export function useUpdate(bump: () => void) {
  const [plan, setPlan] = useState<Plan | null>(null); const [state, setState] = useState<UpdState>('loading'); const [msg, setMsg] = useState(''); const [rest, setRest] = useState<string[]>([]);
  const { ask, node } = useConfirm();
  const load = useCallback(async (keep = false) => { const r = await adm('GET', '/cleanup'); if (!r.ok) { setState('error'); setMsg(errText(r)); return null; } setPlan(r.data); if (!keep) setState(r.data.clean ? 'clean' : 'available'); return r.data as Plan; }, []);
  useEffect(() => { load(); }, [load]);
  const run = async () => {
    if (!plan || plan.clean) return;
    const lines = summaryOf(plan);
    const ok = await ask({
      title: 'Jetzt sicher aktualisieren?', confirmLabel: 'Aktualisieren',
      text: <><b>Das passiert:</b><ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <p><b>Datenbanksicherung:</b> wird vorher automatisch angelegt.</p>
        {plan.archive.length > 0 && <p><b>Archivieren</b> ist etwas anderes als eine Sicherung: Archivierte Pakete bleiben gespeichert, sind aber für neue Shows nicht mehr wählbar.</p>}
        <p>Laufende und bereits beendete Räume bleiben unverändert.</p></>,
    });
    if (!ok) return;
    setState('running'); setMsg('');
    const r = await adm('POST', '/cleanup', {});
    if (!r.ok) { setState('error'); setMsg(errText(r)); await load(true); return; }
    bump();
    const after = await load(true);          // Status wirklich neu bestimmen – keine widersprüchlichen Meldungen
    if (after?.clean) { setState('done'); setMsg(`Aktualisierung abgeschlossen${r.data.backupFile ? ` · Sicherung: ${r.data.backupFile}` : ' · Sicherung wurde angelegt'}.`); setRest([]); }
    else { setState('partial'); setRest(after ? summaryOf(after) : []); setMsg('Die Aktualisierung wurde ausgeführt, aber nicht alles konnte übernommen werden.'); }
  };
  return { plan, state, msg, rest, run, reload: load, node };
}

/** Details (ausklappbar): welche Pakete betroffen sind. */
export function UpdateDetails({ plan }: { plan: Plan }) {
  const rows = plan.rows.filter(r => r.action === 'archive' || r.needsUpdate || r.needsRename);
  return (
    <details className="more"><summary>Änderungen ansehen</summary>
      <ul className="small">
        {plan.install && <li><b>Neue Spiele, Fragen und Pakete</b> – werden nur ergänzt, Vorhandenes bleibt unverändert.</li>}
        {rows.map(r => <li key={r.id}><b>{r.name}</b> – {r.action === 'archive' ? 'wird archiviert (nicht gelöscht, nicht mehr für neue Shows wählbar)' : r.needsUpdate ? 'bekommt eine neue Version (alte Version bleibt erhalten)' : 'wird umbenannt'}</li>)}
      </ul>
    </details>
  );
}

/** Kompakte Zeile für die Startseite. */
export function UpdateBar({ u, onDetails }: { u: ReturnType<typeof useUpdate>; onDetails: () => void }) {
  if (u.state === 'loading' || u.state === 'clean') return null;
  return (
    <div className={`updatebar ${u.state === 'done' ? 'done' : u.state === 'error' ? 'err' : ''}`} role="status">
      <span>
        {u.state === 'available' && <><Badge kind="warn">Update</Badge> Neue Inhalte oder Paketaktualisierungen verfügbar.</>}
        {u.state === 'running' && <>⏳ Aktualisierung läuft …</>}
        {u.state === 'done' && <><Badge kind="ok">Fertig</Badge> {u.msg}</>}
        {u.state === 'partial' && <><Badge kind="warn">Teilweise</Badge> {u.msg}</>}
        {u.state === 'error' && <><Badge kind="bad">Fehler</Badge> {u.msg}</>}
      </span>
      <span className="pageact">
        {(u.state === 'available' || u.state === 'partial') && <><button className="btn small quiet" onClick={onDetails}>Änderungen ansehen</button>{u.state === 'available' && <button className="btn small primary" onClick={u.run}>Sicher aktualisieren</button>}</>}
      </span>
      {u.node}
    </div>
  );
}

/** Vollständiger Abschnitt auf der Seite „Sicherung“. */
export function UpdateSection({ u }: { u: ReturnType<typeof useUpdate> }) {
  const p = u.plan;
  return (
    <section className="datasec" id="update">
      <h3>1 · Aktualisierungen</h3>
      <p className="why">Neue Inhalte und Paketversionen übernehmen.</p>
      {u.state === 'loading' && <p className="muted">Prüfe …</p>}
      {u.state === 'clean' && <p><Badge kind="ok">Aktuell</Badge> Keine Aktualisierung notwendig.</p>}
      {u.state === 'running' && <p>⏳ Aktualisierung läuft …</p>}
      {u.state === 'done' && <p><Badge kind="ok">Abgeschlossen</Badge> {u.msg}</p>}
      {u.state === 'error' && <p><Badge kind="bad">Fehler</Badge> {u.msg}</p>}
      {u.state === 'partial' && <div><p><Badge kind="warn">Teilweise</Badge> {u.msg}</p>{u.rest.length > 0 && <ul className="small">{u.rest.map((l, i) => <li key={i}>{l}</li>)}</ul>}</div>}
      {p && (u.state === 'available' || u.state === 'partial') && <>
        <p><Badge kind="warn">Verfügbar</Badge> {summaryOf(p).join(' ')}</p>
        <ul className="small checklist">
          <li><b>Datenbanksicherung:</b> wird vor der Aktualisierung automatisch erstellt.</li>
          {p.archive.length > 0 ? <li><b>Archivierung:</b> {p.archive.length} ältere Pakete werden archiviert – sie bleiben gespeichert, sind aber nicht mehr für neue Shows wählbar.</li> : <li><b>Archivierung:</b> keine.</li>}
          <li>Laufende Räume bleiben unverändert.</li>
        </ul>
        <UpdateDetails plan={p} />
        {u.state === 'available' && <button className="btn primary" onClick={u.run}>Sicher aktualisieren</button>}
      </>}
      {u.node}
    </section>
  );
}
void nameOf;
