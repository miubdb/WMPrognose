import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../net';
import { Avatar } from '../ui/Avatar';
import { AnswerRow, Countdown, Leaderboard, QR, useBaseUrl } from '../ui/widgets';
import { MapView } from '../ui/MapView';
import { SceneView } from '../ui/SceneView';
import { initAudio, play, setMusic, setSoundEnabled } from '../ui/audio';
import type { PlayerPublic, RoundView, View } from '../../../shared/types';

export const MODE_NAME: Record<string, string> = {
  geo: 'WO ZUR HÖLLE?', rank: 'BLIND RANK', estimate: 'SETZ AUF MICH', glitch: 'GLITCH', codebreak: 'CODEBREAK', unique: 'EINZIGARTIG', match: 'MATCHMAKER', link: 'DIE VERBINDUNG',
};
const MODE_RULES: Record<string, string[]> = {
  geo: ['Setze auf deinem Handy einen Pin auf die Karte.', 'Du kannst ihn bis zum Absenden verschieben.', 'Je näher dein Pin, desto mehr Punkte – egal, wie die anderen tippen.'],
  rank: ['Fünf Begriffe erscheinen nacheinander.', 'Setze jeden sofort auf einen freien Rangplatz.', 'Endgültig – nichts wird mehr verschoben!'],
  estimate: ['Schätze geheim eine Zahl.', 'Dann siehst du alle Tipps und setzt Punkte auf die Schätzung, der du vertraust.', 'Gewonnener Einsatz: plus. Verlorener: minus.'],
  glitch: ['Merk dir das Bild genau.', 'Dann ändert sich etwas.', 'Tippe auf deinem Handy auf die veränderte Stelle.'],
  codebreak: ['Knacke das Rätsel mit Logik.', 'Hinweise helfen – kosten aber Punkte.', 'Drei Versuche, Tempo zählt kaum.'],
  unique: ['Nenne eine gültige Antwort.', 'Nur einzigartige Antworten bringen volle Punkte.', 'Doppelte zählen weniger, Ungültige gar nicht.'],
  match: ['Sechs Begriffe links, sechs Partner rechts.', 'Verbinde auf dem Handy, was zusammengehört.', '50 Punkte je richtigem Paar – ändern geht bis zur Abgabe.'],
  link: ['Vier Hinweise erscheinen nacheinander.', 'Je früher du die Lösung nennst, desto mehr Punkte.', 'Nur ein Versuch – die Antwort bleibt geheim.'],
};

export function Tv({ code }: { code: string }) {
  const { view, conn, serverNow } = useGame('tv', code);
  const [started, setStarted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const start = () => {
    initAudio(); setStarted(true); play('start');
    try { void rootRef.current?.requestFullscreen?.(); } catch { /* */ }
  };
  useEffect(() => { if (view) setSoundEnabled(view.room.sound); }, [view?.room.sound]);
  useEffect(() => { setMusic(!!view?.room.music?.on && started && !view?.room.showPaused, view?.room.music?.vol ?? 25); }, [view?.room.music?.on, view?.room.music?.vol, view?.room.sound, view?.room.showPaused, started]);
  useSounds(view, started);
  return (
    <div className={`tv ${view?.room.reduced ? 'reduced' : ''}`} ref={rootRef}>
      <div className="tvbg" />
      {!started && <div className="startgate" onClick={start}><div className="logo huge">OUT<span>PLAY</span></div><button className="btn primary huge">▶ Bildschirm starten</button><p>Einmal klicken: aktiviert Ton &amp; Vollbild</p></div>}
      {!view ? <div className="tvcenter"><div className="logo huge">OUT<span>PLAY</span></div><p className="pulse">{conn === 'denied' ? 'Raum nicht gefunden' : 'Verbinde …'}</p></div> : <Screen view={view} serverNow={serverNow} code={code} />}
      {conn !== 'online' && view && <div className="tvconn">Verbinde neu …</div>}
      {view?.room.showPaused && <div className="pauseveil"><div>⏸ SHOW PAUSIERT</div></div>}
    </div>
  );
}

function useSounds(view: View | null, enabled: boolean) {
  const prev = useRef<{ phase?: string; stage?: string; rid?: string; board?: boolean; step?: number }>({});
  useEffect(() => {
    if (!view || !enabled) return;
    const p = prev.current;
    const ph = view.room.phase, st = view.round?.stage, rid = view.round?.rid;
    if (ph === 'wall' && p.phase !== 'wall') play('open');
    if (ph === 'round' && (rid !== p.rid)) play(view.round?.kind === 'final' ? 'final' : 'open');
    if (st && st !== p.stage && rid === p.rid) {
      if (st === 'open' || st === 'bet') play('start');
      if (st === 'locked' || st === 'review') play('lock');
      if (st === 'reveal') play('points');
    }
    if (ph === 'scoreboard' && p.phase !== 'scoreboard') play('points');
    if (ph === 'ceremony' && view.ceremony) { if (p.step !== view.ceremony.step) play(view.ceremony.step >= view.ceremony.steps - 1 ? 'win' : view.ceremony.step >= view.ceremony.steps - 4 ? 'correct' : 'points'); }
    prev.current = { phase: ph, stage: st, rid, step: view.ceremony?.step };
  }, [view, enabled]);
}

function Screen({ view, serverNow, code }: { view: View; serverNow: () => number; code: string }) {
  switch (view.room.phase) {
    case 'lobby': return <LobbyTv view={view} code={code} />;
    case 'intro': return <IntroTv view={view} />;
    case 'wall': return <WallTv view={view} />;
    case 'round': return view.round ? <RoundTv view={view} round={view.round} serverNow={serverNow} /> : null;
    case 'scoreboard': return <BoardTv view={view} />;
    case 'ceremony': case 'ended': return <CeremonyTv view={view} />;
  }
}

export function Header({ view, right }: { view: View; right?: React.ReactNode }) {
  return <div className="tvhead"><div className="logo tiny">OUT<span>PLAY</span></div><div className="act">{view.room.act}</div><div className="right">{right}</div></div>;
}

// ---------------------------------------------------------------- Lobby
function LobbyTv({ view, code }: { view: View; code: string }) {
  const { base, ready, loopback } = useBaseUrl();
  const url = `${base}/play/${code}`;
  const shown = base.replace(/^https?:\/\//, '');
  return (
    <div className="lobbytv">
      <div className="left">
        <div className="logo huge">OUT<span>PLAY</span></div>
        <div className="tagline">Die interaktive Gameshow</div>
        <div className="players">
          {view.players.length === 0 && <p className="pulse waiting">Warte auf Kandidaten …</p>}
          {view.players.map((p, i) => (
            <div key={p.id} className={`cand ${p.connected ? '' : 'off'}`} style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
              <Avatar a={p.avatar} size="100%" /><b>{p.name}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="right joinbox">
        <h2>Mitspielen</h2>
        {ready && base ? <QR text={url} size={Math.round(Math.min(window.innerWidth * 0.2, 380))} /> : <div className="qr noqr">{ready ? 'Keine Netzwerkadresse gefunden' : '…'}</div>}
        <div className="codelabel">Raumcode</div>
        <div className="roomcode">{code}</div>
        <div className="joinurl">{ready && base ? `${shown}/play/${code}` : ''}</div>
        {loopback && ready && !base && <div className="joinwarn">⚠ Kein WLAN/LAN gefunden – Laptop mit dem Netzwerk verbinden und Seite neu laden</div>}
        <div className="count">{view.players.length} / 8 Kandidaten</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Vorstellung
function IntroTv({ view }: { view: View }) {
  return (
    <div className="introtv calm">
      <div className="showtitle">{view.room.brand?.title ?? 'OUTPLAY'}</div>
      <h1 className="introtitle">Heute im Studio</h1>
      <div className="introgrid">
        {view.players.map((p, i) => (
          <div key={p.id} className="introcard" style={{ animationDelay: `${0.5 + i * 0.7}s` }}>
            <Avatar a={p.avatar} size="100%" /><b>{p.name}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Wand
function WallTv({ view }: { view: View }) {
  const w = view.wall!;
  const picker = view.players.find(p => p.id === w.pickerId);
  return (
    <div className="walltv">
      <Header view={view} right={<span>{view.room.progress.tilesPlayed} von {view.room.progress.tilesTotal} gespielt</span>} />
      {picker && <div className="pickerbanner" key={picker.id}><Avatar a={picker.avatar} size={90} /><div><small>Am Zug</small><b>{picker.name}</b><span>wählt eine Kategorie</span></div></div>}
      <div className="wall">
        {w.tiles.map((t, i) => (
          <div key={t.id} className={`wtile ${t.status} ${t.blocked ? 'blocked' : ''}`} style={{ ['--c' as any]: t.color, animationDelay: `${i * 0.06}s` }}>
            <div className="ic">{t.icon}</div>
            <b>{t.title}</b>
            <small>{t.status === 'played' ? 'Gespielt' : t.topic}</small>
            {t.status === 'selected' && <i className="sel">Gewählt</i>}
            {t.blocked && <i className="sel lock">🔒 Limit erreicht</i>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Runde
function LiveRank({ view }: { view: View }) {
  const rows = view.players.filter(p => p.score !== undefined && p.score !== null).slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  if (!rows.length) return null;
  return (
    <aside className="liverank" aria-label="Zwischenstand">
      <small>Ranking</small>
      {rows.map((p, i) => <div key={p.id} className="lr"><b>{i + 1}</b><Avatar a={p.avatar} size={28} /><span>{p.name}</span><em>{(p.score ?? 0).toLocaleString('de-DE')}</em></div>)}
    </aside>
  );
}

export function RoundTv({ view, round, serverNow }: { view: View; round: RoundView; serverNow: () => number }) {
  const showLive = !!view.room.liveRank && !view.room.hideScores && round.kind !== 'final' && round.stage !== 'intro';
  const timer = round.stage !== 'intro' && round.stage !== 'reveal' && round.deadline !== null || round.pausedLeft !== null;
  return (
    <div className={`roundtv k-${round.kind} ${showLive ? 'withlive' : ''}`} style={{ ['--accent' as any]: round.color }}>
      {showLive && <LiveRank view={view} />}
      <Header view={view} right={timer ? <Countdown round={round} serverNow={serverNow} size={140} onTick={s => { if (s > 0 && s <= 5 && round.pausedLeft === null) play('tick'); }} /> : undefined} />
      {round.stage !== 'intro' && (
        <div className="roundtitle"><span className="ic">{round.icon}</span><div><b>{round.kind === 'final' ? 'FINAL LOCK' : MODE_NAME[round.mode]}</b><small>{taskLine(round, view.room.flow === 'classic' ? round.title : undefined)}</small></div></div>
      )}
      {round.practice && round.stage === 'reveal' && <div className="probebanner">🎓 Proberunde – so wäre es gewertet worden. Es werden <b>keine Punkte</b> vergeben.</div>}
      <div className="roundbody">
        {round.stage === 'intro' ? <RuleCard round={round} view={view} /> :
          round.mode === 'geo' ? <GeoTv view={view} round={round} /> :
          round.mode === 'rank' ? <RankTv view={view} round={round} /> :
          round.mode === 'estimate' ? <EstimateTv view={view} round={round} /> :
          round.mode === 'glitch' ? <GlitchTv view={view} round={round} /> :
          round.mode === 'codebreak' ? <CodeTv view={view} round={round} /> :
          round.mode === 'match' ? <MatchTv view={view} round={round} /> :
          round.mode === 'link' ? <LinkTv view={view} round={round} /> :
          <UniqueTv view={view} round={round} />}
      </div>
    </div>
  );
}

/** Kleine Zusatzzeile: Aufgabe X von Y und Maximalpunkte – bei Proberunden der Hinweis „keine Punkte“. */
function taskLine(round: RoundView, cat?: string): string {
  const parts: string[] = [];
  if (cat && cat !== MODE_NAME[round.mode]) parts.push(cat);
  if (round.practice) parts.push('Proberunde', 'keine Punkte');
  else { if (round.scoredCount > 1) parts.push(`Aufgabe ${round.scoredIndex} von ${round.scoredCount}`); parts.push(`bis zu ${round.points} Punkte`); }
  return parts.join(' · ');
}

function RuleCard({ round, view }: { round: RoundView; view: View }) {
  if (round.taskIndex > 0) {                     // ab der 2. Aufgabe einer Runde: kompakte Karte statt voller Regelkarte (spart Zeit)
    return (
      <div className="rulecard compact">
        <div className="flip"><div className="bigic">{round.icon}</div></div>
        <h1>{round.kind === 'final' ? 'FINAL LOCK' : MODE_NAME[round.mode]}</h1>
        <p className="muted">{taskLine(round, view.room.flow === 'classic' ? round.title : undefined)}</p>
      </div>
    );
  }
  return (
    <div className="rulecard">
      {round.practice && <div className="kicker probe">🎓 PROBERUNDE – alle spielen mit, keine Punkte</div>}
      {round.kind === 'surprise' && !round.practice && <div className="kicker surprise">⚡ ÜBERRASCHUNG ⚡</div>}
      {round.kind === 'final' && <div className="kicker final">🔒 Rangliste ab jetzt verborgen</div>}
      <div className="flip"><div className="bigic">{round.icon}</div></div>
      {round.kind === 'final' && round.taskIndex === 0 ? <>
        <h1>FINAL LOCK</h1>
        <ol><li style={{ animationDelay: '.4s' }}>① Ein Ort auf der Karte – 400 Punkte</li><li style={{ animationDelay: '.8s' }}>② Eine gemeinsame Lösung – bis 300 Punkte</li><li style={{ animationDelay: '1.2s' }}>③ Eine Sortieraufgabe – 500 Punkte</li><li style={{ animationDelay: '1.6s' }}>④ Schätzen mit Einsatz – bis zu 800 Punkte</li></ol>
      </> : <>
        <h1>{MODE_NAME[round.mode]}</h1>
        <ol>{MODE_RULES[round.mode].map((r, i) => <li key={i} style={{ animationDelay: `${0.4 + i * 0.5}s` }}>{r}</li>)}</ol>
      </>}
      <p className="muted">{taskLine(round, view.room.flow === 'classic' ? round.title : undefined)}</p>
    </div>
  );
}

const pl = (view: View, id: string): PlayerPublic | undefined => view.players.find(p => p.id === id);

function PointsList({ view, rows }: { view: View; rows: { pid: string; points: number; note?: string }[] }) {
  return (
    <div className="pointslist">
      {rows.map((r, i) => { const p = pl(view, r.pid); return p ? (
        <div key={r.pid} className="prow" style={{ animationDelay: `${0.4 + (rows.length - 1 - i) * 0.35}s` }}>
          <Avatar a={p.avatar} size={54} /><b>{p.name}</b><span className="note">{r.note}</span><strong className={r.points > 0 ? 'pos' : r.points < 0 ? 'neg' : ''}>{r.points > 0 ? '+' : ''}{r.points}</strong>
        </div>) : null; })}
    </div>
  );
}

function Explain({ text }: { text?: string }) { return text ? <div className="explain">💡 {text}</div> : null; }

// ---- GEO
function GeoTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  const showPins = round.stage === 'locked' || round.stage === 'reveal';
  const pins = (rev ? rev.guesses : d.pins ?? []).map((g: any, i: number) => ({ id: g.pid, ll: { lat: g.lat, lon: g.lon }, avatar: pl(view, g.pid)?.avatar, label: rev ? `${g.km.toLocaleString('de-DE')} km` : undefined, delay: rev ? (rev.guesses.length - 1 - i) * 0.5 : i * 0.35, color: rev && g.place === 1 ? '#f5b82e' : '#8b5cf6' }));
  return (
    <div className="geotv">
      <div className="qcol"><div className="bigq">{d.prompt}</div>
        {rev ? <PointsList view={view} rows={rev.guesses.map((g: any) => ({ pid: g.pid, points: g.points, note: `${g.km.toLocaleString('de-DE')} km entfernt` }))} /> : <AnswerRow players={view.players} />}
        {rev && <Explain text={rev.explain} />}
      </div>
      <div className="mapcol"><MapView kind={d.map} mode="show" uiScale={1.5} pins={showPins ? pins : []} answer={rev ? { ...rev.answer } : undefined} fit={showPins} className="tvmap" /></div>
    </div>
  );
}

// ---- RANK
function RankTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  if (rev) {
    const sorted = rev.rows.slice().sort((a: any, b: any) => b.points - a.points);
    return (
      <div className="ranktv reveal">
        <div className="bigq small">{d.prompt}</div>
        <div className="truth"><small>Richtige Reihenfolge</small><div className="cols">{rev.items.map((it: any, i: number) => <div key={i} className="cell good" style={{ animationDelay: `${i * 0.25}s` }}><b>{i + 1}</b><span>{it.text}</span><em>{it.value}</em></div>)}</div></div>
        <div className="rrows">
          {sorted.map((r: any, ri: number) => { const p = pl(view, r.pid)!;
            // je Begriff: wie viele seiner 4 Paarvergleiche stimmen
            const okOf = (item: number) => (r.pairs ?? []).filter((x: any) => (x.a === item || x.b === item) && x.ok).length;
            return (
            <div key={r.pid} className="rrow" style={{ animationDelay: `${1.4 + ri * 0.5}s` }}>
              <div className="who"><Avatar a={p.avatar} size={46} /><b>{p.name}</b></div>
              <div className="cols">{r.slots.map((s: number, i: number) => { const k = s >= 0 ? okOf(s) : 0; const cls = s < 0 ? 'none' : k >= 4 ? 'good' : k >= 2 ? 'mid' : 'bad'; return <div key={i} className={`cell ${cls}`}><span>{s >= 0 ? rev.items[s].text : '—'}</span>{s >= 0 && <em>{k}/4 Vergleiche</em>}</div>; })}</div>
              <div className="sc"><small>{r.correct} von {r.total} Paaren</small><strong>+{r.points}</strong></div>
            </div>); })}
        </div>
        <p className="rankhow">So wird gewertet: Jedes Begriffspaar ist ein Vergleich („steht der richtige weiter oben?“) – 10 Vergleiche bei 5 Begriffen, <b>je {rev.perPair} Punkte</b>. Die Zahl unter jedem Begriff zeigt, wie viele seiner 4 Vergleiche stimmen.</p>
        <Explain text={rev.explain} />
      </div>
    );
  }
  return (
    <div className="ranktv">
      <div className="bigq small">{d.prompt}</div>
      <div className="rankstage">
        {d.variant === 'sort' && d.pool && <div className="curitem"><small>Bringe alle fünf Begriffe in die richtige Reihenfolge – auf deinem Handy</small><div className="seen">{d.pool.map((x: any) => <span key={x.idx}>{x.text}</span>)}</div><small>▲ {d.topLabel} · ▼ {d.bottomLabel}</small></div>}
        {round.stage === 'open' && d.item && <div className="curitem" key={d.step}><small>Begriff {d.step + 1} von {d.steps}</small><b>{d.item}</b></div>}
        {round.stage !== 'open' && <div className="curitem"><small>Alle Begriffe vergeben</small><b>Gleich die Auflösung …</b></div>}
        <div className="seen">{d.seen.map((t: string, i: number) => <span key={i}>{t}</span>)}</div>
      </div>
      <div className="progrows">
        {view.players.map(p => <div key={p.id} className={`pr ${p.answered ? 'done' : ''}`}><Avatar a={p.avatar} size={52} /><b>{p.name}</b><div className="dots">{Array.from({ length: d.slots }, (_, i) => <i key={i} className={i < (d.counts?.[p.id] ?? 0) ? 'on' : ''} />)}</div></div>)}
      </div>
    </div>
  );
}

// ---- ESTIMATE
function EstimateTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  const guesses: any[] = rev ? rev.guesses : d.guesses ?? [];
  const bets: any[] = rev ? rev.bets : d.bets_placed ?? [];
  if (rev) {
    const lo = Math.min(rev.answer, ...guesses.map(g => g.value)), hi = Math.max(rev.answer, ...guesses.map(g => g.value));
    const useLog = lo > 0 && hi / lo > 20;
    const pos = (v: number) => { const a = useLog ? Math.log(lo) : lo, b = useLog ? Math.log(hi) : hi; const x = useLog ? Math.log(v) : v; return b === a ? 50 : 6 + ((x - a) / (b - a)) * 88; };
    return (
      <div className="esttv reveal">
        <div className="bigq small">{d.prompt}</div>
        <div className="numline">
          <div className="axis" />
          <div className="answermark" style={{ left: `${pos(rev.answer)}%` }}><div className="flag">🎯 {rev.answer.toLocaleString('de-DE')} {rev.unit}</div><i /></div>
          {guesses.map((g, i) => { const p = pl(view, g.pid)!; return (
            <div key={g.pid} className={`gmark ${g.best ? 'best' : ''}`} style={{ left: `${pos(g.value)}%`, top: `${(i % 4) * 2.4 + 5}em`, animationDelay: `${0.3 + i * 0.4}s` }}>
              <Avatar a={p.avatar} size={50} /><b>{g.value.toLocaleString('de-DE')}</b>
            </div>); })}
        </div>
        <div className="estcols">
          <PointsList view={view} rows={view.players.map(p => { const g = guesses.find(x => x.pid === p.id); const b = bets.find(x => x.pid === p.id); return { pid: p.id, points: (g?.points ?? 0) + (b?.delta ?? 0), note: [g ? `Platz ${g.place}` : 'keine Schätzung', b ? `${b.won ? '✅' : '❌'} ${b.amount} auf ${pl(view, b.target)?.name}` : ''].filter(Boolean).join(' · ') }; }).sort((a, b) => b.points - a.points)} />
          <div><ul className="estsummary">{(rev.summary ?? []).map((l: string, i: number) => <li key={i}>{l}</li>)}</ul><Explain text={rev.explain} /></div>
        </div>
      </div>
    );
  }
  return (
    <div className="esttv">
      <div className="bigq">{d.prompt}</div>
      {round.stage === 'open' && <><p className="hint big">{d.guessedCount} von {d.total} haben geschätzt</p><AnswerRow players={view.players} /></>}
      {round.stage !== 'open' && (
        <>
          <div className="guesscards">
            {guesses.slice().sort((a, b) => a.value - b.value).map((g, i) => { const p = pl(view, g.pid)!; const on = bets.filter(b => b.target === g.pid); return (
              <div key={g.pid} className="gcard" style={{ animationDelay: `${i * 0.2}s` }}>
                <Avatar a={p.avatar} size={64} /><b>{p.name}</b><strong>{g.value.toLocaleString('de-DE')} <small>{d.unit}</small></strong>
                <div className="bets">{on.map(b => { const bp = pl(view, b.pid)!; return <span key={b.pid} className="bet"><Avatar a={bp.avatar} size={30} />{b.amount}</span>; })}</div>
              </div>); })}
          </div>
          {round.stage === 'bet' && <><p className="hint big">Wettphase: Wem vertraust du? Setze Punkte auf dem Handy – {d.betCount} von {d.total} haben gesetzt.</p><AnswerRow players={view.players} /></>}
        </>
      )}
    </div>
  );
}

// ---- GLITCH
function GlitchTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  const taps = (rev ? rev.rows.filter((r: any) => r.tap).map((r: any) => ({ ...r.tap, avatar: pl(view, r.pid)?.avatar, hit: r.hit })) : (d.taps ?? []).map((t: any) => ({ ...t, avatar: pl(view, t.pid)?.avatar })));
  return (
    <div className="glitchtv">
      <div className="qcol">
        <div className="bigq">{d.prompt}</div>
        {rev ? <><PointsList view={view} rows={rev.rows.map((r: any) => ({ pid: r.pid, points: r.points, note: r.tap ? (r.hit ? 'Treffer!' : r.points ? 'knapp daneben' : 'daneben') : 'keine Abgabe' })).sort((a: any, b: any) => b.points - a.points)} /><Explain text={rev.explain} /></> :
          round.stage === 'view' ? <p className="hint big">Merken, merken, merken …</p> : <AnswerRow players={view.players} />}
      </div>
      <div className="scenecol">{d.sceneData ? <SceneView scene={d.sceneData} zones={rev?.zones} taps={taps} className="tvscene" /> : <div className="sceneHidden"><div className="big">🔍</div><p>Die Suche läuft jetzt auf den Handys.</p><p className="muted">Das veränderte Bild zeigt der Fernseher erst bei der Auflösung.</p></div>}</div>
    </div>
  );
}

// ---- CODE
function CodeTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  return (
    <div className="codetv">
      <div className="bigq">{d.prompt}</div>
      {d.display && <pre className="display">{d.display}</pre>}
      {!rev && <AnswerRow players={view.players} />}
      {rev && <><div className="solution">Lösung: <b>{rev.answer}</b></div><PointsList view={view} rows={rev.rows.map((r: any) => ({ pid: r.pid, points: r.points, note: r.solved ? (r.hints ? `${r.hints} Hinweis(e)` : 'ohne Hinweis') : 'nicht gelöst' })).sort((a: any, b: any) => b.points - a.points)} /><Explain text={rev.explain} /></>}
    </div>
  );
}

// ---- UNIQUE
function UniqueTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  const groups: any[] = rev ? rev.groups : d.groups ?? [];
  return (
    <div className="uniqtv">
      <div className="bigq">{d.prompt}</div>
      {round.stage === 'open' && <AnswerRow players={view.players} />}
      {round.stage !== 'open' && (
        <div className="groups">
          {groups.map((g, i) => { const kind = rev ? rev.results[g.members[0]]?.kind : g.state; return (
            <div key={g.key} className={`group ${kind}`} style={{ animationDelay: `${i * 0.3}s` }}>
              <b className="label">{g.label}</b>
              <div className="members">{g.members.map((m: string) => { const p = pl(view, m); return p ? <span key={m}><Avatar a={p.avatar} size={44} />{p.name}</span> : null; })}</div>
              {rev ? <strong className="gp">{kind === 'unique' ? '✨ ' : ''}{rev.results[g.members[0]]?.points > 0 ? `+${rev.results[g.members[0]].points}` : '0'}</strong> : <em>{g.state === 'unknown' ? 'wird geprüft' : g.members.length > 1 ? 'mehrfach' : 'einzigartig?'}</em>}
            </div>); })}
        </div>
      )}
      {rev && <Explain text={rev.explain} />}
    </div>
  );
}


// ---- MATCHMAKER
function MatchTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  return (
    <div className={`matchtv ${rev ? 'rev' : ''}`}>
      <div className="bigq">{d.prompt}</div>
      {!rev && (
        <>
          <div className="mtcols"><div>{d.left.map((t: string, i: number) => <div key={i} className="mtitem">{t}</div>)}</div><div className="mtmid">⇄</div><div>{d.right.map((t: string, i: number) => <div key={i} className="mtitem">{t}</div>)}</div></div>
          <AnswerRow players={view.players} />
        </>
      )}
      {rev && (
        <div className="mtreveal">
          <div className="mtpairs">{rev.pairs.map((p: any, i: number) => <div key={i} className="mtpair" style={{ animationDelay: `${i * 0.45}s` }}><span>{p.left}</span><i>→</i><b>{p.right}</b></div>)}</div>
          <PointsList view={view} rows={rev.rows.filter((r: any) => r.submitted).map((r: any) => ({ pid: r.pid, points: r.points, note: `${r.correct} von 6 richtig` })).sort((a: any, b: any) => b.points - a.points)} />
          <Explain text={rev.explain} />
        </div>
      )}
    </div>
  );
}

// ---- DIE VERBINDUNG
function LinkTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  const clues: string[] = rev ? rev.clues : d.clues;
  const total = 4;
  return (
    <div className={`linktv ${rev ? 'rev' : ''}`}>
      <div className="bigq">{d.prompt}</div>
      <div className="lclues">
        {Array.from({ length: total }).map((_, i) => i < clues.length
          ? <div key={i} className={`lclue ${!rev && round.stage === 'open' && i === d.level ? 'new' : ''}`}><b className="ln">{i + 1}</b><span>{clues[i]}</span><em>{(rev?.points ?? d.points)[i]} P.</em></div>
          : <div key={i} className="lclue hidden"><b className="ln">{i + 1}</b><span>?</span><em>{d.points[i]} P.</em></div>)}
      </div>
      {!rev && round.stage === 'open' && <div className="lnow">Jetzt richtig: <b>{d.points[d.level]} Punkte</b></div>}
      {!rev && round.stage !== 'open' && <div className="lnow">{round.stage === 'review' ? 'Der Showmaster prüft die Antworten …' : 'Alle Antworten sind drin!'}</div>}
      {!rev && <AnswerRow players={view.players} />}
      {rev && (
        <div className="lreveal">
          <div className="lanswer">Gesucht war: <b>{rev.answer}</b></div>
          <table className="linktable"><thead><tr><th>Spieler</th><th>Antwort</th><th>Hinweis</th><th></th><th>Punkte</th></tr></thead><tbody>
            {rev.rows.slice().sort((a: any, b: any) => b.points - a.points || (a.level ?? 9) - (b.level ?? 9)).map((r: any) => { const p = pl(view, r.pid)!; return (
              <tr key={r.pid} className={r.answer ? (r.correct ? 'ok' : 'bad') : 'none'}><td><Avatar a={p.avatar} size={40} /> <b>{p.name}</b></td><td>{r.answer ? `„${r.answer}“` : 'keine Abgabe'}</td><td>{r.answer ? `Hinweis ${r.level + 1}` : '–'}</td><td>{r.answer ? (r.correct ? '✅' : '❌') : ''}</td><td className="pts">{r.points > 0 ? `+${r.points}` : '0'}</td></tr>); })}
          </tbody></table>
          <Explain text={rev.explain} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Zwischenstand
function BoardTv({ view }: { view: View }) {
  const b = view.scoreboard!;
  const rows = useMemo(() => b.standings.map(s => ({ ...pl(view, s.id)!, id: s.id, score: s.score })), [b.standings, view.players]); // eslint-disable-line
  const prev = useMemo(() => Object.fromEntries(b.standings.map(s => [s.id, s.prev])), [b.standings]);
  return (
    <div className="boardtv">
      <Header view={view} />
      <h1>{b.title}</h1><p className="muted">{b.reason}</p>
      <Leaderboard rows={rows.filter(r => r.name)} prev={prev} rowH={Math.min(110, Math.floor((window.innerHeight * 0.62) / Math.max(rows.length, 1)))} />
    </div>
  );
}

// ---------------------------------------------------------------- Siegerehrung
function CeremonyTv({ view }: { view: View }) {
  const c = view.ceremony!;
  const k = c.steps - 5;
  const standings = c.standings;
  const n = standings.length;
  const revealed = c.step <= k ? 0 : c.step === k + 1 ? Math.max(0, n - 3) : c.step === k + 2 ? n - 2 : c.step === k + 3 ? n - 1 : n; // wie viele Plätze von unten schon sichtbar
  const rows = useMemo(() => standings.map(s => ({ ...pl(view, s.id)!, id: s.id, score: s.score })), [standings, view.players]); // eslint-disable-line
  const prevMap = useMemo(() => Object.fromEntries(standings.map(s => [s.id, s.score - s.delta])), [standings]);
  const winner = c.step >= c.steps - 1 ? rows[0] : null;
  if (c.step <= k) {
    return (
      <div className="boardtv ceremony">
        <Header view={view} />
        <h1>{c.stepTitle}</h1><p className="muted">{c.step === 0 ? 'Die Rangliste war im Finale verborgen – jetzt wird abgerechnet.' : 'Die Punkte der Finalaufgabe sind eingerechnet.'}</p>
        <Leaderboard rows={rows} prev={c.step === 0 ? undefined : prevMap} rowH={Math.min(100, Math.floor((window.innerHeight * 0.6) / Math.max(n, 1)))} />
      </div>
    );
  }
  const podium = [2, 1, 0].map(i => ({ r: rows[i], place: i + 1 })).filter(x => x.r);
  const lower = rows.slice(3);
  return (
    <div className={`ceremonytv ${winner ? 'won' : ''}`}>
      <Header view={view} />
      {!winner && <h1>{c.stepTitle}</h1>}
      <div className="lowerlist">{lower.map((r, i) => { const place = i + 4; const shown = n - place < revealed; return <div key={r.id} className={`lrow ${shown ? 'show' : ''}`}><b>{place}</b><Avatar a={r.avatar} size={54} /><span>{r.name}</span><strong>{shown ? r.score.toLocaleString('de-DE') : '???'}</strong></div>; })}</div>
      <div className="podium">
        {podium.map(({ r, place }) => { const shown = n - place < revealed; return (
          <div key={r.id} className={`step p${place} ${shown ? 'show' : ''}`}>
            <div className="av"><Avatar a={r.avatar} size="100%" /></div>
            <b>{shown ? r.name : '?'}</b><strong>{shown ? r.score.toLocaleString('de-DE') : ''}</strong>
            <div className="block"><span>{place}</span></div>
          </div>); })}
      </div>
      {winner && <div className="confetti">{Array.from({ length: 60 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 12) * 0.25}s`, background: ['#f5b82e', '#8b5cf6', '#14d9c0', '#3b82f6', '#ec4899'][i % 5] }} />)}</div>}
      {winner && <div className="winnerbanner"><small>Der {view.room.brand?.winner ?? 'OUTPLAY-Champion'}</small><b>{winner.name}</b><span className="trophy">🏆</span></div>}
    </div>
  );
}
