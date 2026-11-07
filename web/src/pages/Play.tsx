import { useEffect, useState } from 'react';
import { useGame, useWakeLock, store, api, type ConnState } from '../net';
import { Avatar, DEFAULT_AVATAR, randomAvatar } from '../ui/Avatar';
import { AvatarEditor } from './Editor';
import { ConnBadge } from '../ui/widgets';
import { PhoneRound } from './PhoneModes';
import type { Avatar as AvatarT, View } from '../../../shared/types';

interface Stored { playerId: string; token: string; recovery: string }
const keyOf = (code: string) => `outplay.player.${code}`;

const JOIN_ERR: Record<string, string> = {
  lobby_closed: 'Die Lobby ist geschlossen. Wenn du schon dabei warst, nutze „Platz wiederherstellen“.', name_taken: 'Dieser Name ist schon vergeben.', name_required: 'Bitte gib einen Namen ein.',
  room_full: 'Der Raum ist voll.', unknown_room: 'Diesen Raum gibt es nicht.', unknown_code: 'Diesen Wiederherstellungscode kenne ich nicht.', network: 'Keine Verbindung zum Server.', seat_not_released: 'Dieser Platz wurde nicht freigegeben.',
};

export function Play({ code }: { code: string }) {
  const [stored, setStored] = useState<Stored | null>(() => store.get<Stored>(keyOf(code)));
  const save = (s: Stored) => { store.set(keyOf(code), s); setStored(s); };
  const forget = () => { store.del(keyOf(code)); setStored(null); };
  if (!stored) return <JoinFlow code={code} onJoined={save} />;
  return <Controller code={code} stored={stored} onLost={forget} onNewIdentity={save} />;
}

// ---------------------------------------------------------------- Beitritt
function JoinFlow({ code, onJoined }: { code: string; onJoined: (s: Stored) => void }) {
  const [info, setInfo] = useState<{ phase: string; joinOpen: boolean; seats: { id: string; name: string; avatar: AvatarT }[] } | null | 'none'>(null);
  const [mode, setMode] = useState<'new' | 'recover'>('new');
  useEffect(() => {
    let dead = false;
    const load = () => api(`/api/rooms/${code}`).then(r => { if (!dead) setInfo(r.ok ? r.data : 'none'); });
    load(); const t = setInterval(load, 4000);
    return () => { dead = true; clearInterval(t); };
  }, [code]);
  if (info === null) return <div className="phone"><div className="card center"><div className="spinner" /><p>Verbinde …</p></div></div>;
  if (info === 'none') return <div className="phone"><div className="card center"><h2>Raum {code} nicht gefunden</h2><p className="muted">Prüfe den Code oder scanne den QR-Code erneut.</p><a className="btn primary" href="/">Zurück</a></div></div>;
  const canJoin = info.joinOpen && info.phase === 'lobby';
  return (
    <div className="phone join">
      <div className="logo small">OUT<span>PLAY</span></div>
      <div className="roomtag">Raum <b>{code}</b></div>
      <div className="tabs wide">
        <button className={mode === 'new' ? 'on' : ''} onClick={() => setMode('new')}>Neu beitreten</button>
        <button className={mode === 'recover' ? 'on' : ''} onClick={() => setMode('recover')}>Platz wiederherstellen</button>
      </div>
      {mode === 'new' ? (canJoin ? <NewPlayer code={code} onJoined={onJoined} /> : <div className="card center"><h3>Beitritt geschlossen</h3><p className="muted">Die Show läuft bereits. Warst du schon dabei? Dann wechsle zu „Platz wiederherstellen“.</p></div>)
        : <Recover code={code} seats={info.seats} onJoined={onJoined} />}
    </div>
  );
}

function NewPlayer({ code, onJoined }: { code: string; onJoined: (s: Stored) => void }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarT>(() => randomAvatar());
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr('');
    const r = await api(`/api/rooms/${code}/join`, { name, avatar });
    setBusy(false);
    if (!r.ok) { setErr(JOIN_ERR[(r.data as any).err] ?? 'Beitritt nicht möglich.'); return; }
    onJoined(r.data as Stored);
  };
  return (
    <div className="card">
      <label className="field"><span>Dein Name</span><input value={name} maxLength={14} placeholder="z. B. Alex" onChange={e => setName(e.target.value)} autoComplete="off" /></label>
      <AvatarEditor value={avatar} onChange={setAvatar} />
      {err && <div className="status bad">{err}</div>}
      <button className="btn primary wide" disabled={!name.trim() || busy} onClick={go}>{busy ? 'Moment …' : 'Beitreten'}</button>
    </div>
  );
}

function Recover({ code, seats, onJoined }: { code: string; seats: { id: string; name: string; avatar: AvatarT }[]; onJoined: (s: Stored) => void }) {
  const [rc, setRc] = useState(''); const [err, setErr] = useState('');
  const go = async (path: string, body: object) => {
    setErr('');
    const r = await api(`/api/rooms/${code}/${path}`, body);
    if (!r.ok) { setErr(JOIN_ERR[(r.data as any).err] ?? 'Das hat nicht geklappt.'); return; }
    onJoined(r.data as Stored);
  };
  return (
    <div className="card">
      <h3>Mit Wiederherstellungscode</h3>
      <p className="muted small">Du findest deinen 6-stelligen Code auf deinem alten Gerät (unten im Controller) – oder frag den Showmaster.</p>
      <label className="field"><input value={rc} maxLength={8} placeholder="ABC123" autoCapitalize="characters" onChange={e => setRc(e.target.value.toUpperCase())} style={{ textAlign: 'center', letterSpacing: '.25em', fontSize: '1.6rem' }} /></label>
      <button className="btn primary wide" disabled={rc.length < 6} onClick={() => go('recover', { code: rc })}>Platz übernehmen</button>
      {seats.length > 0 && <>
        <h3 style={{ marginTop: 22 }}>Vom Showmaster freigegeben</h3>
        <div className="seats">{seats.map(s => (
          <button key={s.id} className="seat" onClick={() => go('claim', { playerId: s.id })}><Avatar a={s.avatar} size={56} /><span>Ich bin {s.name}</span></button>
        ))}</div>
      </>}
      {err && <div className="status bad">{err}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Controller
function Controller({ code, stored, onLost, onNewIdentity }: { code: string; stored: Stored; onLost: () => void; onNewIdentity: (s: Stored) => void }) {
  const { view, conn, reason, act, serverNow, pendingCount } = useGame('player', code, stored.token);
  useWakeLock(true);
  void onNewIdentity;
  if (conn === 'denied' || conn === 'kicked') return <Lost conn={conn} reason={reason} code={code} stored={stored} onLost={onLost} />;
  if (!view) return <div className="phone"><div className="card center"><div className="spinner" /><h3>Verbinde …</h3><ConnBadge conn={conn} /></div></div>;
  const me = view.players.find(p => p.id === stored.playerId);
  if (!me) return <Lost conn="denied" reason="removed" code={code} stored={stored} onLost={onLost} />;
  return (
    <div className="phone ctl">
      <div className="topbar">
        <Avatar a={me.avatar} size={44} />
        <div className="who"><b>{me.name}</b><small>{view.me?.score != null ? `${view.me.score.toLocaleString('de-DE')} Punkte · Platz ${view.me.rank}` : 'Punkte verborgen'}</small></div>
        <ConnBadge conn={conn} pending={pendingCount} />
      </div>
      {conn !== 'online' && <div className="banner warn">Verbindung wird wiederhergestellt – deine Antworten bleiben gespeichert.</div>}
      <div className="stage">
        {view.room.showPaused && <div className="overlay"><div className="card center big"><div className="bigicon">⏸</div><h2>Show pausiert</h2><p className="muted">Gleich geht’s weiter.</p></div></div>}
        <Body view={view} act={act} serverNow={serverNow} code={code} pid={stored.playerId} />
      </div>
      <Footer view={view} stored={stored} />
    </div>
  );
}

function Lost({ conn, reason, code, stored, onLost }: { conn: ConnState; reason: string; code: string; stored: Stored; onLost: () => void }) {
  const replaced = conn === 'kicked';
  return (
    <div className="phone"><div className="card center big">
      <div className="bigicon">{replaced ? '📱' : '🔒'}</div>
      <h2>{replaced ? 'Auf einem anderen Gerät geöffnet' : 'Kein Zugang'}</h2>
      <p className="muted">{replaced ? 'Dein Platz wurde auf einem anderen Gerät übernommen.' : reason === 'unknown_room' ? 'Diesen Raum gibt es nicht mehr.' : 'Dieses Gerät ist für den Platz nicht mehr berechtigt.'}</p>
      <button className="btn primary wide" onClick={() => location.reload()}>Erneut versuchen</button>
      <button className="btn ghost wide" onClick={onLost}>Mit Code wiederherstellen</button>
      <p className="muted small">Raum {code} · Dein Code war: <b>{stored.recovery}</b></p>
    </div></div>
  );
}

function Footer({ view, stored }: { view: View; stored: Stored }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="footer">
      <button className="linkbtn" onClick={() => setOpen(!open)}>{open ? 'Schließen' : 'Wiederherstellungscode'}</button>
      {open && <div className="recbox">Dein Code: <b>{view.me?.recovery ?? stored.recovery}</b><small>Damit kannst du auf einem anderen Handy oder Browser weiterspielen. Notier ihn dir kurz.</small></div>}
    </div>
  );
}

function Body({ view, act, serverNow, code, pid }: { view: View; act: any; serverNow: () => number; code: string; pid: string }) {
  const ph = view.room.phase;
  const me = view.players.find(p => p.id === pid)!;
  if (ph === 'lobby') return <LobbyCtl view={view} act={act} me={me} />;
  if (ph === 'intro') return <div className="card center big"><div className="bigicon">🎬</div><h2>Die Show beginnt!</h2><p className="muted">Schau auf den Fernseher.</p></div>;
  if (ph === 'wall') return <WallCtl view={view} act={act} />;
  if (ph === 'round' && view.round) return <PhoneRound view={view} round={view.round} act={act} serverNow={serverNow} room={code} pid={pid} />;
  if (ph === 'scoreboard') return <div className="card center big"><div className="bigicon">📊</div><h2>{view.scoreboard?.title ?? 'Zwischenstand'}</h2><p className="muted">Schau auf den Fernseher!</p>{view.me?.score != null && <div className="bignum">Platz {view.me.rank} · {view.me.score.toLocaleString('de-DE')}</div>}</div>;
  if (ph === 'ceremony') return <Ceremony view={view} pid={pid} />;
  return <div className="card center big"><div className="bigicon">🏁</div><h2>Danke fürs Mitspielen!</h2>{view.me?.rank != null && <div className="bignum">Platz {view.me.rank} · {view.me.score?.toLocaleString('de-DE')} Punkte</div>}</div>;
}

function LobbyCtl({ view, act, me }: { view: View; act: any; me: View['players'][number] }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(me.name);
  const [av, setAv] = useState<AvatarT>(me.avatar ?? DEFAULT_AVATAR);
  const [msg, setMsg] = useState('');
  if (edit) return (
    <div className="card">
      <label className="field"><span>Name</span><input value={name} maxLength={14} onChange={e => setName(e.target.value)} /></label>
      <AvatarEditor value={av} onChange={setAv} />
      {msg && <div className="status bad">{msg}</div>}
      <button className="btn primary wide" onClick={async () => { const a = await act({ k: 'setAvatar', name, avatar: av }); if (a.ok) setEdit(false); else setMsg(a.err === 'name_taken' ? 'Name bereits vergeben.' : 'Speichern nicht möglich.'); }}>Speichern</button>
      <button className="btn ghost wide" onClick={() => setEdit(false)}>Abbrechen</button>
    </div>
  );
  return (
    <div className="card center big">
      <Avatar a={me.avatar} size={150} />
      <h2>Du bist dabei, {me.name}!</h2>
      <p className="muted">{view.players.length} Kandidat{view.players.length === 1 ? '' : 'en'} in der Lobby. Der Showmaster startet gleich.</p>
      <button className="btn ghost" onClick={() => setEdit(true)}>✏️ Charakter ändern</button>
    </div>
  );
}

function WallCtl({ view, act }: { view: View; act: any }) {
  const w = view.wall!;
  const picker = view.players.find(p => p.id === w.pickerId);
  const [busy, setBusy] = useState('');
  if (!w.pickerMayPick) return <div className="card center big"><div className="bigicon">🧱</div><h2>Kategorienwand</h2><p>{picker ? <><b>{picker.name}</b> wählt eine Kategorie …</> : 'Gleich geht’s weiter …'}</p></div>;
  return (
    <div className="pickwall">
      <h2>Du bist dran! 🎉</h2><p className="muted center">Wähle eine Kategorie. Was dahinter steckt, bleibt geheim.</p>
      <div className="tilegrid">
        {w.tiles.map(t => (
          <button key={t.id} disabled={t.status !== 'open' || !!busy || !!t.blocked} className={`tile ${t.status}`} style={{ ['--c' as any]: t.color }}
            onClick={async () => { setBusy(t.id); await act({ k: 'pick', tileId: t.id }); setBusy(''); }}>
            <span className="ic">{t.icon}</span><b>{t.title}</b><small>{t.blocked ? '🔒 Limit erreicht' : t.topic}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Ceremony({ view, pid }: { view: View; pid: string }) {
  const c = view.ceremony!;
  const done = c.step >= c.steps - 1;
  const me = c.standings.find(s => s.id === pid);
  return (
    <div className="card center big">
      <div className="bigicon">{done ? '🏆' : '🎭'}</div>
      <h2>{done ? 'Die Siegerehrung ist durch!' : 'Siegerehrung'}</h2>
      {done && me ? <div className="bignum">Platz {me.place} · {me.score.toLocaleString('de-DE')}</div> : <p className="muted">Schau auf den Fernseher – es wird spannend …</p>}
    </div>
  );
}
