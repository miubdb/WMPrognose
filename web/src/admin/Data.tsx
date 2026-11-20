import { useCallback, useEffect, useState } from 'react';
import { adm, download, errText } from './api';
import { Badge, Toast, useConfirm, useList, useToast } from './ui';
import { UpdateSection, useUpdate } from './Update';

function Report({ r }: { r: any }) {
  const row = (label: string, st: any) => <tr key={label}><td>{label}</td><td>{st.created}</td><td>{st.identical}</td><td>{st.renamed}</td><td>{st.overwritten}</td><td>{st.skipped}</td></tr>;
  return (
    <div className="card">
      <h4>{r.dryRun ? '🔍 Prüfung (nichts wurde gespeichert)' : '✅ Import abgeschlossen'}</h4>
      <div className="tablescroll"><table className="scoretab"><thead><tr><th></th><th>neu</th><th>identisch</th><th>als Kopie</th><th>überschrieben</th><th>übersprungen</th></tr></thead>
        <tbody>{row('Szenen', r.scenes)}{row('Fragen', r.questions)}{row('Kategorien', r.categories)}{row('Pakete', r.packs)}</tbody></table></div>
      {r.packResults.map((p: any) => (
        <div key={p.id} className={`status ${p.errors.length ? 'bad' : 'ok'}`} style={{ textAlign: 'left' }}>
          📦 <b>{p.name}</b>: {p.errors.length ? <>nicht veröffentlichbar – {p.errors.slice(0, 5).join(' · ')}</> : p.published ? <>veröffentlicht ({p.ref}){p.note ? ' – ' + p.note : ''}{p.match === true ? ' · ✓ Inhalt stimmt mit dem Export überein' : p.match === false ? ' · ⚠ Inhalt weicht vom Export ab' : ''}</> : 'geprüft – bereit zum Veröffentlichen'}
          {p.warnings.length > 0 && <div className="small muted">Hinweise: {p.warnings.join(' · ')}</div>}
        </div>))}
      {r.warnings.length > 0 && <div className="warnbox card"><b>Hinweise:</b><ul>{r.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>}
      {r.errors.length > 0 && <div className="warnbox card"><b>Probleme:</b><ul>{r.errors.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>}
    </div>
  );
}


/** Seite „Sicherung“: 1 Aktualisierungen · 2 Inhalte sichern · 3 Inhalte importieren · 4 Erweitert. */
export function Data({ bump, online, u }: { bump: () => void; online: boolean; u: ReturnType<typeof useUpdate> }) {
  const { data: packs } = useList<any>('/packs', 0);
  const [mode, setMode] = useState('rename'); const [err, setErr] = useState(''); const [text, setText] = useState('');
  const [pack, setPack] = useState(''); const [file, setFile] = useState<any>(null); const [fname, setFname] = useState(''); const [rep, setRep] = useState<any>(null); const [busy, setBusy] = useState(false);
  const t = useToast(); const { ask, node } = useConfirm();
  useEffect(() => { if (!pack && packs.length) setPack((packs.find((p: any) => p.status === 'published') ?? packs[0]).id); }, [packs, pack]);
  const exp = async (scope: string, name: string) => { setErr(''); const r = await adm('GET', '/export?scope=' + scope); if (r.ok) { download(name, r.data); t.show('Sicherung heruntergeladen ✓'); } else setErr(errText(r)); };
  const parse = (raw: string, name = '') => { setErr(''); setRep(null); try { const d = JSON.parse(raw); if (!d || d.format !== 'outplay-content') { setErr('Das ist keine gültige JANIQUIZITION-Datei (Export aus „Inhalte sichern“ verwenden).'); setFile(null); return null; } setFile(d); setFname(name); return d; } catch { setErr('Die Datei ist nicht lesbar (kein gültiges JSON).'); setFile(null); return null; } };
  const check = async (d = file) => { if (!d) return; setBusy(true); const r = await adm('POST', '/import', { data: d, onConflict: mode, dryRun: true, publish: true }); setBusy(false); if (r.ok) setRep(r.data); else setErr(errText(r)); };
  const doImport = async (publish: boolean) => {
    if (!(await ask({ title: 'Import ausführen?', text: <>Die oben angezeigten Änderungen werden übernommen. {mode === 'overwrite' ? <b>Vorhandene Inhalte mit gleicher ID werden überschrieben.</b> : 'Vorhandenes wird nicht überschrieben.'}</>, confirmLabel: 'Importieren' }))) return;
    setBusy(true); const r = await adm('POST', '/import', { data: file, onConflict: mode, publish }); setBusy(false); if (r.ok) { setRep(r.data); bump(); u.reload(); } else setErr(errText(r));
  };
  const backup = async () => {
    setErr(''); try {
      const r = await fetch('/api/admin/backup', { credentials: 'same-origin' }); if (!r.ok) { setErr('Sicherung fehlgeschlagen (' + r.status + ')'); return; }
      const cd = r.headers.get('content-disposition') ?? ''; const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? 'JANIQUIZITION-VOLLBACKUP-VERTRAULICH.db';
      const url = URL.createObjectURL(await r.blob()); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000); t.show('Datenbank-Sicherung heruntergeladen ✓');
    } catch { setErr('Sicherung fehlgeschlagen.'); }
  };
  const [std, setStd] = useState<any>(null); const [stdMsg, setStdMsg] = useState('');
  const loadStd = useCallback(() => { adm('GET', '/standard').then(r => r.ok && setStd(r.data)); }, []);
  useEffect(loadStd, [loadStd]);
  const installStd = async () => {
    if (!(await ask({ title: 'Fehlende mitgelieferte Inhalte ergänzen?', text: 'Vorher wird automatisch eine Datenbanksicherung angelegt. Bestehende Fragen, Kategorien, Szenen und Pakete bleiben unverändert – es wird nur Fehlendes ergänzt.', confirmLabel: 'Ergänzen' }))) return;
    const r = await adm('POST', '/standard', {});
    if (r.ok) { setStdMsg(r.data.alreadyInstalled ? 'Bereits vollständig – nichts geändert.' : `Ergänzt: ${r.data.created.questions} Fragen, ${r.data.created.categories} Kategorien, ${r.data.created.packs} Paket(e).`); bump(); loadStd(); u.reload(); } else setStdMsg(errText(r));
  };
  return (
    <div>
      <header className="pagehead"><div><h2>Sicherung &amp; Update</h2><p className="muted">Inhalte aktualisieren, sichern und übernehmen.</p></div></header>
      <UpdateSection u={u} />

      <section className="datasec" id="sichern">
        <h3>2 · Meine Inhalte sichern</h3>
        <p className="why">Eine Datei mit allen Fragen, Kategorien, Szenen und Paketen – zum Aufbewahren oder für einen anderen Rechner.</p>
        <button className="btn primary" onClick={() => exp('all', 'JANIQUIZITION-Inhalte-komplett.json')}>💾 Inhalte sichern</button>
        <p className="small muted" style={{ marginTop: 10 }}><Badge kind="warn">vertraulich</Badge> <b>Komplette Datenbank</b> zusätzlich mit Zugangsdaten{online ? '' : ', Räumen und Spielständen'}: <button className="btn tiny quiet" onClick={backup}>🔒 Datenbank-Sicherung (.db)</button>{!online && <> · Automatische Sicherung alle 10 Minuten in <code>data/backups</code>.</>}</p>
      </section>

      <section className="datasec" id="import">
        <h3>3 · Inhalte aus einer Datei übernehmen</h3>
        <p className="why">Unterstützt wird eine JANIQUIZITION-Export-Datei (.json). Vor dem Import siehst du, was neu ist und was verändert würde.</p>
        <input type="file" accept="application/json,.json" aria-label="Export-Datei wählen" onChange={async e => { const f = e.target.files?.[0]; if (f) { const d = parse(await f.text(), f.name); if (d) check(d); } e.target.value = ''; }} />
        {fname && <p className="small">Datei: <b>{fname}</b>{file?.counts ? ` · ${file.counts.questions} Fragen, ${file.counts.categories} Kategorien, ${file.counts.packs} Paket(e)` : ''}</p>}
        {busy && <p className="pulse">Prüfe …</p>}
        {rep && <Report r={rep} />}
        {file && rep?.dryRun && <div className="row wrap"><button className="btn primary" disabled={busy} onClick={() => doImport(true)}>✅ Importieren &amp; veröffentlichen</button><button className="btn quiet" disabled={busy} onClick={() => doImport(false)}>Nur als Entwurf</button></div>}
        {rep && !rep.dryRun && rep.packResults.some((p: any) => p.published) && <p className="status ok">Fertig. Im Showmaster-Pult das Paket „{rep.packResults.find((p: any) => p.published)?.name}“ wählen.</p>}
        {err && <div className="status bad" role="alert">{err}</div>}
      </section>

      <details className="datasec more" id="erweitert"><summary><b>4 · Erweiterte Optionen</b></summary>
        <h4>Einzelne Inhalte exportieren</h4>
        <div className="row wrap">
          <label className="field inline"><span>Paket</span><select value={pack} onChange={e => setPack(e.target.value)}>{packs.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.versions ? ` (v${p.currentVersion})` : ' (Entwurf)'}</option>)}</select></label>
          <button className="btn quiet" disabled={!pack} onClick={() => exp('pack:' + pack, `JANIQUIZITION-Spieleabend-${pack}.json`)}>📤 Dieses Paket exportieren</button>
          <button className="btn quiet" onClick={() => exp('questions', 'JANIQUIZITION-Fragen.json')}>Nur Fragen</button>
        </div>
        <h4>Import-Verhalten</h4>
        <label className="field"><span>Wenn eine ID schon existiert, der Inhalt aber anders ist …</span><select value={mode} onChange={e => setMode(e.target.value)}><option value="rename">als Kopie importieren (sicher)</option><option value="skip">vorhandene behalten</option><option value="overwrite">vorhandene überschreiben</option></select></label>
        <p className="small muted">Oder JSON einfügen:</p>
        <textarea rows={3} className="mono" value={text} onChange={e => setText(e.target.value)} /><button className="btn small" disabled={!text.trim()} onClick={() => { const d = parse(text, 'eingefügt'); if (d) check(d); }}>Prüfen</button>
        {std && !std.installed && <><h4>Mitgelieferte Inhalte</h4><p className="small">Es fehlen noch mitgelieferte Pakete oder Fragen. Normalerweise erledigt das „Sicher aktualisieren“; hier kannst du nur das Fehlende ergänzen.</p><button className="btn quiet" onClick={installStd}>Fehlende Inhalte ergänzen</button></>}
        {stdMsg && <div className="status ok">{stdMsg}</div>}
      </details>
      {node}<Toast msg={t.msg} />
    </div>
  );
}
