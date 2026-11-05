import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Play } from './pages/Play';
import { Tv } from './pages/Tv';
import { Host } from './pages/Host';
import { Admin } from './admin/Admin';

function Landing() {
  const [code, setCode] = useState('');
  const c = code.trim().toUpperCase();
  return (
    <div className="landing">
      <div className="logo huge">OUT<span>PLAY</span></div>
      <p className="tagline">Die interaktive Gameshow für deine Freunde</p>
      <div className="landcards">
        <div className="card"><h3>🎤 Showmaster</h3><p className="muted">Raum erstellen und die Show steuern.</p><a className="btn primary wide" href="/host">Show hosten</a><a className="linkbtn" href="/admin">⚙️ Admin (Fragen &amp; Pakete)</a></div>
        <div className="card"><h3>📱 Mitspielen</h3><label className="field"><input value={code} maxLength={5} placeholder="Raumcode" onChange={e => setCode(e.target.value.toUpperCase())} style={{ textAlign: 'center', letterSpacing: '.25em', fontSize: '1.5rem' }} /></label>
          <a className={`btn primary wide ${c.length < 4 ? 'disabled' : ''}`} href={c.length >= 4 ? `/play/${c}` : undefined}>Beitreten</a>
          <a className={`btn ghost wide ${c.length < 4 ? 'disabled' : ''}`} href={c.length >= 4 ? `/tv/${c}` : undefined}>📺 Als TV-Ansicht öffnen</a></div>
      </div>
    </div>
  );
}

function App() {
  const parts = location.pathname.split('/').filter(Boolean);
  const code = (parts[1] ?? '').toUpperCase();
  if (parts[0] === 'play' && code) return <Play code={code} />;
  if (parts[0] === 'tv' && code) return <Tv code={code} />;
  if (parts[0] === 'host') return <Host code={code || undefined} />;
  if (parts[0] === 'admin') return <Admin />;
  return <Landing />;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
