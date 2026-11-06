import { normText } from '../../../shared/util';
import { useEffect, useState } from 'react';
import { api, store, useGame } from '../net';
import { Avatar } from '../ui/Avatar';
import { ConnBadge, Countdown, QR, useBaseUrl } from '../ui/widgets';
import { MODE_NAME } from './Tv';
import type { Action, PlayerPublic, RoundView, View } from '../../../shared/types';

interface HostSession { code: string; key: string; pin?: string }
const SK = 'outplay.host';

export function Host({ code }: { code?: string }) {
  const [sess, setSess] = useState<HostSession | null>(() => { const s = store.get<HostSession>(SK); return s && (!code || s.code === code) ? s : null; });
  if (!sess) return <HostLogin code={code} onSession={s => { store.set(SK, s); setSess(s); }} />;
  return <Panel sess={sess} onLeave={() => { store.del(SK); setSess(null); }} />;
}

function HostLogin({ code, onSession }: { code?: string; onSession: (s: HostSession) => void }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [rc, setRc] = useState(code ?? ''); const [pin, setPin] = useState('');
  const [packs, setPacks] = useState<{ id: string; name: string; version: number; description: string; show?: boolean; classic?: boolean }[]>([]);
  const [pack, setPack] = useState('');
  const [flow, setFlow] = useState<'show' | 'classic'>('show');
  useEffect(() => { api('/api/packs').then(r => { if (r.ok) { const l = r.data as any[]; setPacks(l); const f = l.some(p => p.show) ? 'show' : 'classic'; setFlow(f); setPack((l.find(p => p[f]) ?? l[0])?.id ?? ''); } }); }, []);
  const usable = packs.filter(p => (p as any)[flow] !== false);
  const pickFlow = (f: 'show' | 'classic') => { setFlow(f); const l = packs.filter(p => (p as any)[f] !== false); if (!l.some(p => p.id === pack)) setPack(l[0]?.id ?? ''); };
  const create = async () => {
    setBusy(true); setErr('');
    const r = await api('/api/rooms', { password: pw, pack, flow });
    setBusy(false);
    if (!r.ok) { setErr(r.status === 400 && (r.data as any).message ? (r.data as any).message : r.status === 403 ? 'Falsches Passwort.' : r.status === 501 ? ((r.data as any).message ?? 'Die Gameshow läuft nur lokal auf dem Laptop.') : 'Server nicht erreichbar.'); return; }
    onSession({ code: (r.data as any).code, key: (r.data as any).hostKey, pin: (r.data as any).hostPin });
  };
  const login = async () => {
    setBusy(true); setErr('');
    const r = await api(`/api/rooms/${rc.toUpperCase()}/host-login`, { pin });
    setBusy(false);
    if (!r.ok) { setErr(r.status === 404 ? 'Raum nicht gefunden.' : 'Falsche PIN.'); return; }
    onSession({ code: rc.toUpperCase(), key: (r.data as any).hostKey, pin });
  };
  return (
    <div className="hostlogin">
      <div className="logo">OUT<span>PLAY</span></div>
      <h2>Showmaster</h2>
      <div className="card">
        <h3>Neue Show erstellen</h3>
        <div className="seg" role="tablist">
          <button type="button" className={flow === 'show' ? 'on' : ''} onClick={() => pickFlow('show')}>🎬 Showmodus – fester Ablauf</button>
          <button type="button" className={flow === 'classic' ? 'on' : ''} onClick={() => pickFlow('classic')}>🧱 Klassisch – Kategorienwand</button>
        </div>
        <p className="muted small">{flow === 'show' ? 'Alle Runden in bewusst festgelegter Reihenfolge, jeder Spielmodus kommt vor. Empfohlen.' : 'Die Spieler wählen abwechselnd sechs von neun Kategorien (Fallback).'}</p>
        <label className="field"><span>Spielepaket</span>
          <select value={pack} onChange={e => setPack(e.target.value)}>{usable.map(p => <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>)}{!usable.length && <option value="">kein passendes Paket veröffentlicht</option>}</select></label>
        {packs.find(p => p.id === pack)?.description && <p className="muted small">{packs.find(p => p.id === pack)!.description}</p>}
        <label className="field"><span>Passwort (nur falls der Server eines verlangt)</span><input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="optional" /></label>
        <button className="btn primary wide" disabled={busy || !pack} onClick={create}>🎬 Spielraum erstellen</button>
      </div>
      <div className="card">
        <h3>Bestehende Show übernehmen</h3>
        <p className="muted small">Neues Gerät oder Schlüssel verloren? Raumcode und Host-PIN eingeben (die PIN steht im Kontrollpult oben unter „Host-PIN“).</p>
        <label className="field"><span>Raumcode</span><input value={rc} onChange={e => setRc(e.target.value.toUpperCase())} maxLength={5} /></label>
        <label className="field"><span>Host-PIN</span><input value={pin} inputMode="numeric" onChange={e => setPin(e.target.value)} maxLength={6} /></label>
        <button className="btn ghost wide" disabled={busy || rc.length < 4 || pin.length < 6} onClick={login}>Show übernehmen</button>
      </div>
      {err && <div className="status bad">{err}</div>}
    </div>
  );
}

function Panel({ sess, onLeave }: { sess: HostSession; onLeave: () => void }) {
  const { view, conn, reason, act, serverNow, pendingCount } = useGame('host', sess.code, sess.key);
  const [busy, setBusy] = useState(false);
  const nb = useBaseUrl();
  const [toast, setToast] = useState('');
  const run = async (a: Action) => {
    if (busy) return; setBusy(true);
    const r = await act(a); setBusy(false);
    if (!r.ok) { setToast(r.err === 'review_needed' ? 'Bitte zuerst die unklaren Antworten prüfen (✓ gültig / ✗ ungültig).' : `Aktion nicht möglich (${r.err})`); setTimeout(() => setToast(''), 3500); }
  };
  if (conn === 'denied' || conn === 'kicked') return (
    <div className="hostlogin"><div className="card center"><h2>{conn === 'kicked' ? 'Auf anderem Gerät übernommen' : 'Kein Zugang'}</h2><p className="muted">{reason}</p>
      <button className="btn primary" onClick={onLeave}>Neu anmelden</button></div></div>
  );
  if (!view) return <div className="hostlogin"><div className="card center"><div className="spinner" /><p>Verbinde mit Raum {sess.code} …</p></div></div>;
  const tvUrl = `${nb.base || location.origin}/tv/${sess.code}`;
  const joinUrl = `${nb.base || location.origin}/play/${sess.code}`;
  return (
    <div className="host">
      <div className="hosttop">
        <div className="logo tiny">OUT<span>PLAY</span></div>
        <div className="roomtag">Raum <b>{sess.code}</b></div>
        <ConnBadge conn={conn} pending={pendingCount} />
        <span className="act">{view.room.act}</span>
        <div className="spacer" />
        <button className={`btn small ${view.room.sound ? '' : 'ghost'}`} onClick={() => run({ k: 'h.sound', on: !view.room.sound })}>{view.room.sound ? '🔊 Ton an' : '🔇 Ton aus'}</button>
        <button className={`btn small ${view.room.reduced ? '' : 'ghost'}`} onClick={() => run({ k: 'h.reduced', on: !view.room.reduced })}>{view.room.reduced ? '✨ Animationen reduziert' : '✨ Animationen voll'}</button>
        <button className={`btn small ${view.room.showPaused ? 'warn' : 'ghost'}`} onClick={() => run({ k: 'h.showPause', paused: !view.room.showPaused })}>{view.room.showPaused ? '▶ Show fortsetzen' : '⏸ Show pausieren'}</button>
      </div>
      {nb.loopback && (!nb.base || nb.ambiguous) && <div className="card warnbox small">{!nb.base ? '⚠ Es wurde keine Netzwerkadresse gefunden – ohne WLAN/LAN können Handys nicht beitreten.' : <>⚠ Mehrere Netzwerkadapter gefunden. Verwendet wird <b>{nb.base}</b>. Verbinden sich die Handys nicht, <code>OUTPLAY-STARTEN.bat</code> neu starten und den richtigen Adapter wählen. Alle: {nb.candidates.map(c => `${c.name} ${c.url}${c.virtual ? ' (virtuell)' : ''}`).join(' · ')}</>}</div>}
      {toast && <div className="toast">{toast}</div>}
      <div className="hostgrid">
        <div className="hostmain">
          <Main view={view} run={run} busy={busy} serverNow={serverNow} tvUrl={tvUrl} joinUrl={joinUrl} code={sess.code} />
        </div>
        <aside className="hostside">
          {view.room.agenda && <Agenda view={view} />}
          <Players view={view} run={run} />
          <div className="card">
            <h3>Zugang</h3>
            <p className="small">TV: <a href={tvUrl} target="_blank" rel="noreferrer">{tvUrl}</a></p>
            <p className="small">Beitritt: <b>{joinUrl}</b></p>
            <p className="small">Host-PIN (für Gerätewechsel): <b className="mono">{view.host?.pin}</b></p>
            <button className="linkbtn" onClick={onLeave}>Dieses Gerät abmelden</button>
          </div>
          <details className="card"><summary>Protokoll</summary><ul className="log">{view.host?.log.slice().reverse().map((l, i) => <li key={i}><time>{new Date(l.at).toLocaleTimeString('de-DE')}</time> {l.text}</li>)}</ul></details>
        </aside>
      </div>
    </div>
  );
}

type Run = (a: Action) => void | Promise<void>;

function Main({ view, run, busy, serverNow, tvUrl, joinUrl, code }: { view: View; run: Run; busy: boolean; serverNow: () => number; tvUrl: string; joinUrl: string; code: string }) {
  const ph = view.room.phase;
  if (ph === 'lobby') return (
    <div className="card">
      <h2>Lobby</h2>
      <div className="lobbyhost">
        <QR text={joinUrl} size={150} />
        <div>
          <p>Spieler scannen den QR-Code oder öffnen <b>{joinUrl.replace(/^https?:\/\//, '')}</b>.</p>
          <p className="muted">{view.players.length} Kandidat(en) · {view.players.filter(p => p.connected).length} verbunden</p>
          <label className="check"><input type="checkbox" checked={view.room.joinOpen} onChange={e => run({ k: 'h.joinOpen', open: e.target.checked })} /> Lobby geöffnet (neue Spieler dürfen beitreten)</label>
          <p className="small muted">TV: <a href={tvUrl} target="_blank" rel="noreferrer">TV-Ansicht öffnen</a> – auf dem Fernseher einmal klicken, damit Ton &amp; Vollbild starten.</p>
        </div>
      </div>
      <button className="btn primary huge" disabled={busy || view.players.length < 1} onClick={() => run({ k: 'h.startShow' })}>🎬 Lobby schließen &amp; Show starten</button>
    </div>
  );
  if (ph === 'intro') return <div className="card"><h2>Eröffnung läuft</h2><p>Die Kandidaten werden auf dem TV vorgestellt.</p><button className="btn primary huge" disabled={busy} onClick={() => run({ k: 'h.introDone' })}>{view.room.flow === 'show' ? '▶ Weiter zur ersten Runde' : '▶ Weiter zur Kategorienwand'}</button></div>;
  if (ph === 'wall') return <WallHost view={view} run={run} busy={busy} />;
  if (ph === 'scoreboard') return <div className="card"><h2>Zwischenstand wird gezeigt</h2><p>{view.scoreboard?.reason}</p><button className="btn primary huge" disabled={busy} onClick={() => run({ k: 'h.continue' })}>▶ Weiter ({view.host?.planNext})</button></div>;
  if (ph === 'ceremony') return (
    <div className="card"><h2>Siegerehrung</h2><p>Schritt {view.ceremony!.step + 1} von {view.ceremony!.steps}: <b>{view.ceremony!.stepTitle}</b></p>
      {view.ceremony!.step < view.ceremony!.steps - 1 ? <button className="btn primary huge" disabled={busy} onClick={() => run({ k: 'h.ceremonyNext' })}>▶ Nächster Schritt</button> : <button className="btn primary huge" disabled={busy} onClick={() => run({ k: 'h.end' })}>🏁 Show beenden</button>}
    </div>
  );
  if (ph === 'ended') return <div className="card center"><h2>🏁 Show beendet</h2><p className="muted">Danke fürs Moderieren! Räume bleiben 14 Tage gespeichert.</p></div>;
  if (ph === 'round' && view.round) return <RoundHost view={view} round={view.round} run={run} busy={busy} serverNow={serverNow} />;
  return null;
}

function Agenda({ view }: { view: View }) {
  const ag = view.room.agenda!;
  return (
    <details className="card" open>
      <summary><b>Showablauf</b> <small className="muted">{view.room.act}</small></summary>
      <div className="agendahost">{ag.map((a, i) => (
        <div key={i} className={`ah ${a.state}`}>{a.state === 'done' ? '✓' : a.state === 'now' ? '▶' : '○'} <span>{a.icon ?? '📊'} {a.k === 'board' ? 'Zwischenstand' : a.title}</span>{a.tasks ? <small>{a.tasks} Aufg.</small> : null}</div>))}</div>
    </details>
  );
}

function WallHost({ view, run, busy }: { view: View; run: Run; busy: boolean }) {
  const w = view.wall!;
  const picker = view.players.find(p => p.id === w.pickerId);
  return (
    <div className="card">
      <h2>Kategorienwand</h2>
      <p>Am Zug: <b>{picker?.name ?? '–'}</b> (wählt auf dem Handy). Du kannst die Auswahl auch übernehmen:</p>
      <div className="row wrap">
        <label className="field inline"><span>Spieler wechseln</span>
          <select value={w.pickerId ?? ''} onChange={e => run({ k: 'h.setPicker', pid: e.target.value })}>{view.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <button className="btn ghost" onClick={() => run({ k: 'h.scoreboard', show: true })}>📊 Zwischenstand zeigen</button>
      </div>
      <div className="hosttiles">
        {w.tiles.map(t => <button key={t.id} disabled={busy || t.status !== 'open' || !!t.blocked} className={`htile ${t.status}`} style={{ ['--c' as any]: t.color }} onClick={() => run({ k: 'h.pick', tileId: t.id })}><span>{t.icon}</span><b>{t.title}</b><small>{t.status === 'played' ? 'gespielt' : t.blocked ? '🔒 Limit' : 'öffnen'}</small></button>)}
      </div>
    </div>
  );
}

function RoundHost({ view, round, run, busy, serverNow }: { view: View; round: RoundView; run: Run; busy: boolean; serverNow: () => number }) {
  const st = round.stage;
  const answered = view.players.filter(p => p.answered).length;
  const timed = st === 'view' || st === 'open' || st === 'bet';
  const frozen = round.pausedLeft !== null;
  const d = round.data;
  const lastTask = round.taskIndex + 1 >= round.taskCount;
  return (
    <div className="card">
      <div className="row between">
        <div><h2>{round.icon} {round.title}</h2><p className="muted">{MODE_NAME[round.mode]} · Aufgabe {round.taskIndex + 1}/{round.taskCount} · Stage: <b>{STAGE[st]}</b></p></div>
        {timed && <Countdown round={round} serverNow={serverNow} size={96} />}
      </div>

      {st === 'intro' && <div><p>Regelkarte läuft auf dem TV. Wenn alle bereit sind:</p><button className="btn primary huge" disabled={busy} onClick={() => run({ k: 'h.begin' })}>▶ Aufgabe {round.taskIndex + 1} starten</button></div>}

      {st !== 'intro' && d?.solution && <div className="solution">🔑 Lösung (nur Host): <b>{Array.isArray(d.solution) ? d.solution.join(' › ') : d.solution}</b></div>}
      {st !== 'intro' && st !== 'reveal' && <div className="muted">Abgegeben: <b>{answered}/{view.players.length}</b></div>}

      {timed && (
        <div className="row wrap">
          <button className="btn primary big" disabled={busy} onClick={() => run({ k: 'h.lock' })}>{st === 'view' ? '⏩ Betrachtung beenden' : st === 'bet' ? '🔒 Einsätze sperren' : '🔒 Antworten sperren'}</button>
          <button className="btn ghost" disabled={busy} onClick={() => run({ k: 'h.pause', paused: !frozen })}>{frozen ? '▶ Timer fortsetzen' : '⏸ Timer pausieren'}</button>
          <button className="btn ghost" disabled={busy} onClick={() => run({ k: 'h.addTime', seconds: 15 })}>+15 s</button>
          <button className="btn ghost" disabled={busy} onClick={() => run({ k: 'h.addTime', seconds: 30 })}>+30 s</button>
          <button className="btn gold big" disabled={busy} onClick={() => run({ k: 'h.reveal' })}>✨ Sofort auflösen</button>
        </div>
      )}
      {(st === 'locked' || st === 'review') && (
        <>
          {st === 'review' && <ReviewList view={view} round={round} run={run} />}
          <div className="row wrap">
            <button className="btn gold huge" disabled={busy || (round.data.groups ?? []).some((g: any) => g.state === 'unknown')} title={(round.data.groups ?? []).some((g: any) => g.state === 'unknown') ? 'Erst alle unklaren Antworten prüfen' : ''} onClick={() => run({ k: 'h.reveal' })}>✨ Auflösung auf dem TV zeigen</button>
            {st === 'locked' && round.mode !== 'rank' && <button className="btn ghost" disabled={busy} onClick={() => run({ k: 'h.addTime', seconds: 20 })}>Nachspielzeit +20 s (Antworten wieder öffnen)</button>}
          </div>
        </>
      )}
      {st === 'reveal' && (
        <div className="row wrap">
          <button className="btn primary huge" disabled={busy} onClick={() => run({ k: 'h.next' })}>{lastTask ? (view.room.flow === 'show' ? '▶ Runde abschließen' : '▶ Kachel abschließen') : `▶ Weiter zu Aufgabe ${round.taskIndex + 2}`}</button>
          {!lastTask && <button className="btn ghost" disabled={busy} title="Gibt die nächste Aufgabe sofort frei (zwei Aktionen in einem Klick)" onClick={async () => { await run({ k: 'h.next' }); await run({ k: 'h.begin' }); }}>⏩ Weiter &amp; Aufgabe {round.taskIndex + 2} sofort starten</button>}
        </div>)}

      <details className="danger"><summary>Korrektur &amp; Notfall</summary>
        <div className="row wrap">
          <button className="btn warn" disabled={busy} onClick={() => confirm('Aufgabe für ALLE neu starten? Bisherige Antworten und Punkte dieser Aufgabe werden verworfen.') && run({ k: 'h.restartTask' })}>↺ Aufgabe für alle neu starten</button>
          <button className="btn warn" disabled={busy} onClick={() => confirm('Aufgabe überspringen (ohne Punkte)?') && run({ k: 'h.skipTask' })}>⏭ Aufgabe überspringen</button>
          <button className="btn warn" disabled={busy} onClick={() => confirm('Ganze Kachel überspringen?') && run({ k: 'h.skipTile' })}>⏭⏭ Kachel überspringen</button>
          {round.kind === 'tile' && view.room.flow !== 'show' && <button className="btn warn" disabled={busy} onClick={() => confirm('Zurück zur Wand? Kachel wird wieder freigegeben, ihre Punkte werden verworfen.') && run({ k: 'h.backToWall' })}>↩ Zurück zur Wand</button>}
        </div>
      </details>
    </div>
  );
}

const STAGE: Record<string, string> = { intro: 'Regelkarte', view: 'Betrachten', open: 'Antworten offen', bet: 'Einsätze', locked: 'Gesperrt', review: 'Prüfung', reveal: 'Aufgelöst' };

function ReviewList({ view, round, run }: { view: View; round: RoundView; run: Run }) {
  const groups: any[] = round.data.groups ?? [];
  const valid: string[] = round.data.validNames ?? [];
  const nameOf = (id: string) => view.players.find(p => p.id === id)?.name ?? '?';
  const open = groups.filter(g => g.state === 'unknown').length;
  const Decide = ({ k }: { k: string }) => (
    <span className="decide">
      <button className="btn small" onClick={() => run({ k: 'h.review', groupKey: k, decision: 'valid' })}>✓ gültig</button>
      <button className="btn small ghost" onClick={() => run({ k: 'h.review', groupKey: k, decision: 'invalid' })}>✗ ungültig</button>
      <select defaultValue="" onChange={e => e.target.value && run({ k: 'h.review', groupKey: k, decision: { mapTo: e.target.value } })}><option value="">= identisch mit …</option>{valid.map(v => <option key={v}>{v}</option>)}</select>
    </span>
  );
  return (
    <div className="review">
      <h3>Antworten prüfen {open > 0 ? <span className="tag warn">{open} offen – Auflösung gesperrt</span> : <span className="tag ok">alles geprüft</span>}</h3>
      {groups.map(g => (
        <div key={g.key} className={`rgroup ${g.state}`}>
          <b>{g.label}</b>
          <span className="tag">{g.state === 'valid' ? 'gültig' : g.state === 'invalid' ? 'ungültig' : 'unklar – bitte entscheiden'}</span>
          <ul className="rmembers">{g.members.map((m: string) => {
            const raw = g.raw?.[m]; const auto = g.auto?.includes(m);
            return <li key={m}><b>{nameOf(m)}</b> schrieb „{raw ?? g.label}“{auto && <> <span className="tag warn">Tippfehler automatisch als „{g.label}“ gewertet</span> <button className="btn tiny ghost" title="Diese Eingabe ist ein anderer Begriff – selbst entscheiden" onClick={() => run({ k: 'h.review', groupKey: 'u:' + normText(raw), decision: 'invalid' })}>✗ war etwas anderes</button></>}</li>;
          })}</ul>
          {g.key.startsWith('u:') && <Decide k={g.key} />}
        </div>
      ))}
      {!groups.length && <p className="muted">Keine Antworten.</p>}
    </div>
  );
}

function Players({ view, run }: { view: View; run: Run }) {
  const [adj, setAdj] = useState<{ pid: string; delta: string; note: string } | null>(null);
  return (
    <div className="card">
      <h3>Spieler</h3>
      <ul className="plist">
        {view.players.map((p: PlayerPublic) => (
          <li key={p.id} className={p.connected ? '' : 'off'}>
            <Avatar a={p.avatar} size={40} />
            <div className="info"><b>{p.name}</b>
              <small>{p.connected ? '🟢 verbunden' : '🔴 getrennt'}{p.answered ? ' · ✓ abgegeben' : ''}{p.seatReleased ? ' · Platz frei' : ''}</small>
              <small className="mono">Code {view.host?.recoveries[p.id]}</small></div>
            <div className="sc">{p.score?.toLocaleString('de-DE')}</div>
            <div className="acts">
              <button className="btn tiny ghost" title="Punkte korrigieren" onClick={() => setAdj({ pid: p.id, delta: '', note: '' })}>±</button>
              <button className="btn tiny ghost" title="Platz für neues Gerät freigeben" onClick={() => confirm(`Platz von ${p.name} freigeben? Das alte Gerät wird abgemeldet.`) && run({ k: 'h.release', pid: p.id })}>📱</button>
              {view.room.phase === 'lobby' && <button className="btn tiny ghost" title="Entfernen" onClick={() => confirm(`${p.name} entfernen?`) && run({ k: 'h.remove', pid: p.id })}>✕</button>}
            </div>
          </li>
        ))}
        {view.players.length === 0 && <li className="muted">Noch niemand beigetreten.</li>}
      </ul>
      {adj && (
        <div className="adjust">
          <b>Punkte korrigieren: {view.players.find(p => p.id === adj.pid)?.name}</b>
          <input inputMode="numeric" placeholder="z. B. 100 oder -50" value={adj.delta} onChange={e => setAdj({ ...adj, delta: e.target.value })} />
          <input placeholder="Notiz (z. B. Verbindungsproblem)" value={adj.note} onChange={e => setAdj({ ...adj, note: e.target.value })} />
          <div className="row"><button className="btn small primary" disabled={!Number(adj.delta)} onClick={() => { run({ k: 'h.adjust', pid: adj.pid, delta: Number(adj.delta), note: adj.note }); setAdj(null); }}>Buchen</button>
            <button className="btn small ghost" onClick={() => setAdj(null)}>Abbrechen</button></div>
        </div>
      )}
    </div>
  );
}
