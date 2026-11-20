import { useEffect, useState } from 'react';
import { Brand } from '../ui/Brand';
import { adm, errText } from './api';
import { Home, type AdminTab } from './Home';
import { Library } from './Library';
import { Packs } from './Packs';
import { MoreContent } from './More';
import { Data } from './Data';
import { useUpdate } from './Update';
import { guard } from './ui';
import { Help } from './Help';

const TABS: { id: AdminTab; label: string }[] = [{ id: 'home', label: '🏠 Start' }, { id: 'questions', label: '❓ Fragen' }, { id: 'packs', label: '📦 Pakete' }, { id: 'io', label: '💾 Sicherung & Update' }, { id: 'more', label: '🧱 Weitere Inhalte' }];

export function Admin() {
  const [state, setState] = useState<'loading' | 'in' | 'out' | 'setup' | 'first'>('loading'); const [local, setLocal] = useState(true);
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => setHealth(null));
    adm('GET', '/me').then(r => { setLocal(r.data?.local !== false); setState(r.status === 503 ? 'setup' : r.data?.setup ? 'first' : r.ok ? 'in' : 'out'); });
    const f = () => setState('out'); window.addEventListener('outplay-admin-401', f); return () => window.removeEventListener('outplay-admin-401', f);
  }, []);
  if (state === 'loading') return <div className="adm"><p className="pulse">Lade …</p></div>;
  if (state === 'setup' || (health?.mode === 'online' && (!health.storage?.configured || !health.admin?.passwordConfigured))) return <Setup health={health} />;
  if (state === 'first') return <FirstSetup local={local} onDone={() => { try { localStorage.setItem('adm.welcome', '1'); } catch { /* */ } setState('in'); }} />;
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

function FirstSetup({ local, onDone }: { local: boolean; onDone: () => void }) {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const ok = pw.length >= 12 && pw === pw2;
  const go = async () => { setBusy(true); setErr(''); const r = await adm('POST', '/setup', { password: pw, confirm: pw2 }); setBusy(false); if (r.ok) onDone(); else setErr(errText(r)); };
  if (!local) return (
    <div className="hostlogin"><div className="logo"><Brand /></div><h2>Willkommen bei JANIQUIZITION</h2>
      <div className="card"><p>Die Einrichtung des Admin-Zugangs ist aus Sicherheitsgründen nur <b>an dem Computer selbst</b> möglich, auf dem JANIQUIZITION läuft.</p><p className="small muted">Öffne dort im Browser die Adresse <code>http://localhost:8080/admin</code>.</p></div></div>);
  return (
    <div className="hostlogin"><div className="logo"><Brand /></div><h2>Willkommen bei JANIQUIZITION</h2>
      <div className="card">
        <p>Richte deinen Admin-Zugang ein, damit nur du Fragen und Spieleabende verändern kannst.</p>
        <label className="field"><span>Admin-Passwort wählen</span><input type="password" autoFocus autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></label>
        <p className={`small ${pw.length >= 12 ? 'okc' : 'muted'}`} style={{ margin: '-4px 0 8px' }}>{pw.length >= 12 ? '✓ Lang genug' : `Mindestens 12 Zeichen (noch ${Math.max(0, 12 - pw.length)}) – am besten ein Satz, den du dir merken kannst.`}</p>
        <label className="field"><span>Passwort wiederholen</span><input type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} onKeyDown={e => e.key === 'Enter' && ok && go()} /></label>
        {pw2 && pw !== pw2 && <p className="small" style={{ color: '#ff9a9a' }}>Die Passwörter sind nicht gleich.</p>}
        {err && <div className="status bad">{err}</div>}
        <button className="btn primary wide" disabled={!ok || busy} onClick={go}>Passwort speichern &amp; loslegen</button>
        <p className="small muted" style={{ marginTop: 10 }}>Das Passwort gilt nur auf diesem Computer und wird nirgends hin gesendet. Mitspieler brauchen es nicht.</p>
      </div>
    </div>);
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
        <details className="more"><summary>Passwort vergessen?</summary><p className="small muted">{online ? <>Es ist die Umgebungsvariable <code>ADMIN_PASSWORD</code> im Vercel-Projekt.</> : <>Im Programmordner <b>JANIQUIZITION-PASSWORT-ZURUECKSETZEN.bat</b> doppelklicken. Danach legst du hier ein neues Passwort fest. Deine Fragen, Pakete und Spielstände bleiben erhalten.</>}</p></details>
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
  const go = (t: AdminTab) => { if (guard.dirty && t !== tab && !window.confirm('Im Paket gibt es noch ungespeicherte Änderungen. Trotzdem wechseln? Sie bleiben als Wiederherstellung in diesem Browser erhalten.')) return; setTab(t); sessionStorage.setItem('admtab', t); window.scrollTo({ top: 0 }); };
  const u = useUpdate(bump);                 // ein gemeinsamer Update-Status für Start und Sicherung
  const [help, setHelp] = useState(() => { try { if (localStorage.getItem('adm.welcome') === '1') { localStorage.removeItem('adm.welcome'); return true; } } catch { /* */ } return false; });
  return (
    <div className="adm">
      <div className="admtop">
        <div className="logo tiny"><Brand /> <small>Admin</small></div>
        <span className={`envchip ${online ? 'online' : 'local'}`} title={online ? 'Online-Verwaltung: Inhalte vorbereiten' : 'Lokale Version auf diesem Rechner'}>{online ? '☁️ Online' : '💻 Lokal'}</span>
        <div className="spacer" />{!online && <a className="btn small ghost" href="/host">🎤 Zur Show</a>}
        <button className="btn small ghost" onClick={() => setHelp(true)}>❔ Hilfe</button>
        <button className="btn small ghost" onClick={async () => { await adm('POST', '/logout'); onOut(); }}>Abmelden</button>
        <nav aria-label="Hauptnavigation">{TABS.map(t => <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>{t.label}</button>)}</nav>
      </div>
      {help && <Help online={!!online} onClose={() => setHelp(false)} />}
      {tab === 'home' && <Home go={go} online={!!online} u={u} bump={bump} openPack={id => { setOpenId(id); go('packs'); }} />}
      {tab === 'packs' && <Packs rev={rev} bump={bump} openId={openId} onOpened={() => setOpenId(undefined)} />}
      {tab === 'questions' && <Library rev={rev} bump={bump} />}
      {tab === 'more' && <MoreContent rev={rev} bump={bump} section={section} setSection={setSection} />}
      {tab === 'io' && <Data bump={bump} online={!!online} u={u} />}
    </div>
  );
}
