import { useCallback, useEffect, useState } from 'react';
import { GAMES, INACTIVE_GAMES, PLANNED_GAMES } from '../../../shared/games';
import { adm, download, errText } from './api';

export type AdminTab = 'home' | 'questions' | 'packs' | 'io' | 'advanced';

/** „Pakete aufräumen & aktualisieren“ – zeigt vorab, was passiert; legt vor dem Ausführen automatisch eine Sicherung an. */
export function CleanupCard({ bump, onlyIfNeeded }: { bump: () => void; onlyIfNeeded?: boolean }) {
  const [cl, setCl] = useState<any>(null); const [msg, setMsg] = useState('');
  const load = useCallback(() => { adm('GET', '/cleanup').then(r => r.ok && setCl(r.data)); }, []);
  useEffect(load, [load]);
  if (!cl || (onlyIfNeeded && cl.clean)) return null;
  const run = async () => {
    const lines = [...(cl.install ? ['• neue Spiele und Fragen ergänzen (nichts Vorhandenes wird verändert)'] : []), ...cl.archive.map((i: string) => '• archivieren: ' + i), ...cl.update.map((i: string) => '• neue Version mit aktuellem Inhalt: ' + i), ...(cl.rename ?? []).map((i: string) => '• umbenennen: ' + i)].join('\n');
    if (!confirm('Jetzt aktualisieren?\n\n' + lines + '\n\nVorher wird automatisch eine Datenbanksicherung angelegt. Nichts wird gelöscht; laufende und beendete Räume behalten ihren Stand.')) return;
    const r = await adm('POST', '/cleanup', {});
    if (r.ok) { setMsg(`Fertig ✓${r.data.backupFile ? ' · Sicherung: ' + r.data.backupFile : ''}`); bump(); load(); } else setMsg(errText(r));
  };
  return (
    <div className={`card ${cl.clean ? '' : 'attn'}`}>
      <h3>{cl.clean ? '✔ Alles aktuell' : '🔄 Update verfügbar'}</h3>
      {cl.clean
        ? <p className="muted small">Aktiv: Hauptshow (KICKBASE-KONSENS), Alternative (FINAL LOCK) und das alte Backup-Paket. Nichts zu tun.</p>
        : <>
          <p className="small">Neue Spiele, Fragen und Regeln als <b>neue Version</b>. Nichts wird gelöscht, laufende Räume bleiben unverändert, eine Sicherung entsteht automatisch.</p>
          <ul className="small">{cl.install && <li><b>Neue Spiele und Fragen</b> – werden ergänzt</li>}{cl.rows.filter((r: any) => r.action === 'archive' || r.needsUpdate || r.needsRename).map((r: any) => <li key={r.id}><b>{r.name}</b> – {r.action === 'archive' ? 'wird archiviert' : r.needsUpdate ? 'bekommt neue Version' : 'wird umbenannt'}</li>)}</ul>
          <button className="btn primary" onClick={run}>Jetzt sicher aktualisieren</button>
        </>}
      {msg && <p className="small">{msg}</p>}
    </div>
  );
}

/** Startseite des Admin-Bereichs: was ist bereit, was funktioniert, was kann ich tun – ohne Fachbegriffe. */
export function Home({ go, online, bump }: { go: (t: AdminTab) => void; online: boolean; bump: () => void }) {
  const [packs, setPacks] = useState<any[]>([]); const [ov, setOv] = useState<any>(null);
  useEffect(() => { adm('GET', '/packs').then(r => r.ok && setPacks(r.data)); adm('GET', '/overview').then(r => r.ok && setOv(r.data)); }, []);
  const active = packs.filter(p => p.status === 'published');
  const main = ov?.defaultRef?.split('@')[0];
  const rounds = (p: any) => (p.show ?? []).filter((x: any) => x.k !== 'board').length;
  return (
    <div className="home">
      <h2>Willkommen</h2>
      <CleanupCard bump={bump} onlyIfNeeded />
      <div className="card">
        <h3>🎤 Heute spielen</h3>
        {!online && <p><a className="btn primary" href="/host">Showmaster-Pult öffnen</a></p>}
        <ul className="packlist">{active.map(p => (
          <li key={p.id} className={p.id === main ? 'main' : ''}>
            <b>{p.name}</b>{p.id === main && <span className="badge ok">Hauptshow</span>}
            <small className="muted"> · {rounds(p) ? `${rounds(p)} Runden` : `${p.categoryIds?.length ?? 0} Kategorien`} · v{p.currentVersion}</small>
          </li>))}
          {!active.length && <li className="muted">Noch kein veröffentlichtes Paket.</li>}</ul>
      </div>
      <div className="card">
        <h3>Was möchtest du tun?</h3>
        <div className="bigbtns">
          <button className="btn" onClick={() => go('questions')}>❓ Frage erstellen oder testen</button>
          <button className="btn" onClick={() => go('packs')}>📦 Paket erstellen oder ändern</button>
          <button className="btn" onClick={async () => { const r = await adm('GET', '/export?scope=all'); if (r.ok) download('JANIQUIZITION-Sicherung-Inhalte.json', r.data); }}>💾 Inhalte sichern</button>
        </div>
      </div>
      <div className="card">
        <h3>🎮 Alle Spiele ({GAMES.filter(g => g.kind === 'Spiel').length} + Finale)</h3>
        <div className="tablescroll"><table className="scoretab gametab"><thead><tr><th></th><th>Spiel</th><th>So geht’s</th><th>Punkte</th></tr></thead>
          <tbody>{GAMES.map(g => <tr key={g.mode}><td>{g.icon}</td><td><b>{g.name}</b>{g.kind === 'Finale' && <small className="muted"> Finale</small>}</td><td>{g.short}</td><td className="nowrap">{g.points}</td></tr>)}</tbody></table></div>
        {PLANNED_GAMES.length > 0 && <details className="more"><summary>Geplant</summary>
          <ul className="small">{PLANNED_GAMES.map(g => <li key={g.name}><b>{g.name}</b> – {g.note}</li>)}</ul></details>}
        <details className="more"><summary>Nicht mehr aktiv</summary>
          <ul className="small">{INACTIVE_GAMES.map(g => <li key={g.name}><b>{g.name}</b> – {g.note}</li>)}</ul></details>
      </div>
      <p className="muted small">Ablauf: Fragen anlegen → Paket zusammenstellen → veröffentlichen → im Showmaster-Pult wählen.</p>
    </div>
  );
}
