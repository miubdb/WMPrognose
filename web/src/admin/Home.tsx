import { useEffect, useState } from 'react';
import { GAMES, INACTIVE_GAMES } from '../../../shared/games';
import { adm } from './api';
import { Badge, fmtDate } from './ui';
import { UpdateBar, UpdateDetails, type useUpdate } from './Update';

export type AdminTab = 'home' | 'questions' | 'packs' | 'io' | 'more';

/** Startseite: Status, drei Hauptaktionen, wichtigste Pakete, Update-Hinweis, Spielübersicht zum Aufklappen. */
export function Home({ go, online, u, openPack }: { go: (t: AdminTab) => void; online: boolean; u: ReturnType<typeof useUpdate>; openPack: (id: string) => void; bump: () => void }) {
  const [packs, setPacks] = useState<any[] | null>(null); const [ov, setOv] = useState<any>(null); const [showDetails, setShowDetails] = useState(false);
  useEffect(() => { adm('GET', '/packs').then(r => r.ok && setPacks(r.data)); adm('GET', '/overview').then(r => r.ok && setOv(r.data)); }, [u.state]);
  const active = (packs ?? []).filter(p => p.status === 'published');
  // Hauptshow nur, wenn sie wirklich veröffentlicht und nicht archiviert ist (kein Hinweis auf archivierte Pakete)
  const main = active.find(p => `${p.id}@${p.currentVersion}` === ov?.defaultRef);
  const recent = [...(packs ?? [])].filter(p => p.status !== 'archived').sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0))[0];
  const shown = [recent, main].filter((p, i, a) => p && a.indexOf(p) === i) as any[];
  const rounds = (p: any) => (p.show?.length ? p.show.filter((x: any) => x.k !== 'board').length : p.categoryIds?.length ?? 0);
  const games = GAMES.filter(g => g.kind === 'Spiel');
  return (
    <div className="dash">
      <section className="hero">
        <div><h2>JANIQUIZITION – Verwaltung</h2><p className="muted" style={{ margin: 0 }}>Bereit für den nächsten Spieleabend?</p></div>
        <div className="statchips" aria-label="Status">
          <Badge kind={online ? 'info' : 'ok'}>{online ? '☁️ Online' : '💻 Lokal'}</Badge>
          <Badge>{packs ? active.length : '…'} aktive Pakete</Badge>
          <Badge>{ov ? ov.questions : '…'} Fragen</Badge>
        </div>
      </section>

      <UpdateBar u={u} onDetails={() => setShowDetails(!showDetails)} />
      {showDetails && u.plan && <div className="softcard"><UpdateDetails plan={u.plan} /><p className="small muted">Alle Einzelheiten und die Ausführung findest du auch unter <button className="btn tiny quiet" onClick={() => go('io')}>Sicherung &amp; Update</button>.</p></div>}

      <section>
        <h3 style={{ margin: '0 0 8px' }}>Was möchtest du machen?</h3>
        <div className="bigactions">
          <button className="bigaction primary" onClick={() => go('packs')}><b>📦 Show vorbereiten</b><span>Spielepaket zusammenstellen und veröffentlichen</span></button>
          <button className="bigaction" onClick={() => go('questions')}><b>❓ Fragen verwalten</b><span>Fragen suchen, anlegen, ändern und testen</span></button>
          {online
            ? <div className="bigaction" aria-disabled="true"><b>🎤 Show starten</b><span>Online-Verwaltung: Die Show startest du am Laptop. Hier bereitest du Inhalte vor und überträgst sie per Export/Import.</span></div>
            : <a className="bigaction" href="/host"><b>🎤 Show starten</b><span>Showmaster-Pult öffnen{main ? ` – Hauptshow: ${main.name}` : ''}</span></a>}
        </div>
      </section>

      <section className="softcard">
        <div className="row between" style={{ marginBottom: 8 }}><h3 style={{ margin: 0 }}>Spielepakete</h3><button className="btn small quiet" onClick={() => go('packs')}>Alle Pakete ansehen</button></div>
        {packs && !shown.length && <p className="muted">Noch kein Paket vorhanden.</p>}
        <div className="minipacks">{shown.map(p => (
          <div key={p.id} className="minipack">
            <div><b>{p.name}</b><span className="muted small">{p.status === 'published' ? `Veröffentlicht · v${p.currentVersion}` : 'Entwurf'} · {rounds(p)} Runden · {fmtDate(p.updated)}</span></div>
            <span className="pageact">{p === main && <Badge kind="ok">Hauptshow</Badge>}<button className="btn small quiet" onClick={() => openPack(p.id)}>Öffnen</button></span>
          </div>))}</div>
      </section>

      <details className="softcard more">
        <summary><b>{games.length} Spielmodi + Finalspiele entdecken</b></summary>
        <div className="tablescroll"><table className="scoretab gametab"><thead><tr><th></th><th>Spiel</th><th>So geht’s</th><th>Punkte</th></tr></thead>
          <tbody>{GAMES.map(g => <tr key={g.mode}><td>{g.icon}</td><td><b>{g.name}</b>{g.kind === 'Finale' && <small className="muted"> Finale</small>}</td><td>{g.short}</td><td className="nowrap">{g.points}</td></tr>)}</tbody></table></div>
        <details className="more"><summary>Nicht mehr aktiv</summary><ul className="small">{INACTIVE_GAMES.map(g => <li key={g.name}><b>{g.name}</b> – {g.note}</li>)}</ul></details>
      </details>
    </div>
  );
}
