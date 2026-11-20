import { useEffect, useState } from 'react';
import { Brand } from '../ui/Brand';
import { adm, errText } from './api';
import { Home, type AdminTab } from './Home';
import { Library } from './Library';
import { Packs } from './Packs';
import { MoreContent } from './More';
import { Data } from './Data';
import { useUpdate } from './Update';

const TABS: { id: AdminTab; label: string }[] = [{ id: 'home', label: '🏠 Start' }, { id: 'questions', label: '❓ Fragen' }, { id: 'packs', label: '📦 Pakete' }, { id: 'io', label: '💾 Sicherung & Update' }, { id: 'more', label: '🧱 Weitere Inhalte' }];

export function Admin() {
  const [state, setState] = useState<'loading' | 'in' | 'out' | 'setup'>('loading');
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => setHealth(null));
    adm('GET', '/me').then(r => setState(r.status === 503 ? 'setup' : r.ok ? 'in' : 'out'));
    const f = () => setState('out'); window.addEventListener('outplay-admin-401', f); return () => window.removeEventListener('outplay-admin-401', f);
  }, []);
  if (state === 'loading') return <div className="adm"><p className="pulse">Lade …</p></div>;
  if (state === 'setup' || (health?.mode === 'online' && (!health.storage?.configured || !health.admin?.passwordConfigured))) return <Setup health={health} />;
  if (state === 'out') return <Login onIn={() => setState('in')} online={health?.mode === 'online'} />;
  return <Shell onOut={() => setState('out')} online={health?.mode === 'online'} />;
}

function Setup({ health }: { health: any }) {
  const st = !!health?.storage?.configured, pw = !!health?.admin?.passwordConfigured;
  return (
    <div className="hostlogin">
      <div className="logo"><Brand /></div>
      <h2>Einrichtung nötig</h2>
      <div className="card">
        <ol className="setuplist">
          <li className={st ? 'done' : ''}><b>{st ? '✓' : '1.'} Speicher:</b> Vercel-Projekt → <i>Storage</i> → <i>Blob</i> (Private) mit diesem Projekt verbinden.</li>
          <li className={pw ? 'done' : ''}><b>{pw ? '✓' : '2.'} Passwort:</b> <i>Settings → Environment Variables</i> → <code>ADMIN_PASSWORD</code> (mind. 12 Zeichen).</li>
          <li><b>3.</b> Danach das neueste Deployment per „Redeploy“ neu starten und diese Seite neu laden.</li>
        </ol>
      </div>
    </div>
  );
}

function Login({ onIn, online }: { onIn: () => void; online?: boolean }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); setErr(''); const r = await adm('POST', '/login', { password: pw }); setBusy(false); if (r.ok) onIn(); else setErr(errText(r)); };
  return (
    <div className="hostlogin">
      <div className="logo"><Brand /></div>
      <h2>Admin-Bereich</h2>
      <div className="card">
        <label className="field"><span>Admin-Passwort</span><input type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && pw && go()} /></label>
        <details className="more"><summary>Passwort vergessen?</summary><p className="small muted">{online ? <>Es ist die Umgebungsvariable <code>ADMIN_PASSWORD</code> im Vercel-Projekt.</> : <>Beim ersten Start erzeugt: Datei <code>data/admin-passwort.txt</code> (oder <code>ADMIN_PASSWORD</code>).</>}</p></details>
        {err && <div className="status bad">{err}</div>}
        <button className="btn primary wide" disabled={!pw || busy} onClick={go}>Anmelden</button>
      </div>
    </div>
  );
}

function Shell({ onOut, online }: { onOut: () => void; online?: boolean }) {
  const saved = sessionStorage.getItem('admtab');
  const [tab, setTab] = useState<AdminTab>(TABS.some(t => t.id === saved) ? (saved as AdminTab) : 'home');
  const [section, setSection] = useState<'categories' | 'scenes'>('categories');
  const [rev, setRev] = useState(0);            // erzwingt Neuladen der Listen
  const [openId, setOpenId] = useState<string | undefined>();
  const bump = () => setRev(x => x + 1);
  const go = (t: AdminTab) => { setTab(t); sessionStorage.setItem('admtab', t); window.scrollTo({ top: 0 }); };
  const u = useUpdate(bump);                 // ein gemeinsamer Update-Status für Start und Sicherung
  return (
    <div className="adm">
      <div className="admtop">
        <div className="logo tiny"><Brand /> <small>Admin</small></div>
        <span className={`envchip ${online ? 'online' : 'local'}`} title={online ? 'Online-Verwaltung: Inhalte vorbereiten' : 'Lokale Version auf diesem Rechner'}>{online ? '☁️ Online' : '💻 Lokal'}</span>
        <div className="spacer" />{!online && <a className="btn small ghost" href="/host">🎤 Zur Show</a>}
        <button className="btn small ghost" onClick={async () => { await adm('POST', '/logout'); onOut(); }}>Abmelden</button>
        <nav aria-label="Hauptnavigation">{TABS.map(t => <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>{t.label}</button>)}</nav>
      </div>
      {tab === 'home' && <Home go={go} online={!!online} u={u} bump={bump} openPack={id => { setOpenId(id); go('packs'); }} />}
      {tab === 'packs' && <Packs rev={rev} bump={bump} openId={openId} onOpened={() => setOpenId(undefined)} />}
      {tab === 'questions' && <Library rev={rev} bump={bump} />}
      {tab === 'more' && <MoreContent rev={rev} bump={bump} section={section} setSection={setSection} />}
      {tab === 'io' && <Data bump={bump} online={!!online} u={u} />}
    </div>
  );
}
