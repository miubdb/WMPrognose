import { useEffect, useMemo, useRef, useState } from 'react';
import { BRAND_NAME } from '../../../shared/brand';
import { Brand } from '../ui/Brand';
import { useGame } from '../net';
import { Avatar } from '../ui/Avatar';
import { AnswerRow, Countdown, Leaderboard, QR, useBaseUrl } from '../ui/widgets';
import { MapView } from '../ui/MapView';
import { SceneView } from '../ui/SceneView';
import { initAudio, play, setMusic, setSoundEnabled, testTone } from '../ui/audio';
import type { PlayerPublic, RoundView, View } from '../../../shared/types';
import { estimateNetLine } from '../../../shared/util';

/** Sichtbarer Modusname: SORTIER’S! (Karten sortieren); nur die klassische Nacheinander-Variante heißt weiter BLIND RANK. */
export const modeName = (r: { mode: string; data?: any }) => (r.mode === 'rank' && r.data?.variant === 'sequence' ? 'BLIND RANK' : MODE_NAME[r.mode]);
export const MODE_NAME: Record<string, string> = {
  geo: 'WO ZUR HÖLLE?', rank: 'SORTIER’S!', estimate: 'SETZ AUF MICH', glitch: 'GLITCH', codebreak: 'CODEBREAK', unique: 'EINZIGARTIG', match: 'MATCHMAKER', link: 'DIE VERBINDUNG', pixel: 'PIXELPANIK', duel: 'DUELL DER DEPPEN', arena: 'DIE ARENA', sound: 'TONSPUR', timeline: 'ZEITSPRUNG', panic: 'PANIK', impostor: 'HOCHSTAPLER', bluff: 'LÜGEN HABEN KURZE BEINE', corridor: 'SCHÄTZKORRIDOR', twist: 'VERDREHTE WELT', vote: 'KICKBASE-KONSENS',
};
const MODE_RULES: Record<string, string[]> = {
  geo: ['Setze auf deinem Handy einen Pin auf die Karte.', 'Du kannst ihn bis zum Absenden verschieben.', 'Je näher dein Pin, desto mehr Punkte – egal, wie die anderen tippen.'],
  rank: ['Fünf Begriffe erscheinen nacheinander.', 'Setze jeden sofort auf einen freien Rangplatz.', 'Endgültig – nichts wird mehr verschoben!'],
  estimate: ['Schätze geheim eine Zahl.', 'Dann siehst du alle Tipps und setzt Punkte auf die Schätzung, der du vertraust.', 'Gewonnener Einsatz: plus. Verlorener: minus.'],
  glitch: ['Merk dir das Bild genau.', 'Dann ändert sich etwas.', 'Tippe auf deinem Handy auf die veränderte Stelle.'],
  codebreak: ['Knacke das Rätsel mit Logik.', 'Hinweise helfen – kosten aber Punkte.', 'Drei Versuche, Tempo zählt kaum.'],
  unique: ['Nenne eine gültige Antwort.', 'Nur eine Antwort, die kein anderer nennt, bringt Punkte.', 'Doppelte und ungültige Antworten zählen 0.'],
  match: ['Sechs Begriffe links, sechs Partner rechts.', 'Verbinde auf dem Handy, was zusammengehört.', '50 Punkte je richtigem Paar – ändern geht bis zur Abgabe.'],
  vote: ['Fünf Fragen – wähle geheim eine Person – auch dich selbst.', 'Meiste Stimmen = Konsens: Wer richtig tippt, bekommt +100.', 'Maximal 500 Punkte · keine Minuspunkte · Einzelstimmen zählen nicht.'],
  pixel: ['Ein Bild wird Stufe für Stufe schärfer.', 'Tippe auf dem Handy ein, was du erkennst.', 'Je früher richtig, desto mehr Punkte – nur ein Versuch.'],
  duel: ['Zwei Spieler treten in drei Fragen gegeneinander an.', 'Alle anderen tippen vorher auf den Sieger.', 'Sieg: 250 · richtiger Tipp: 100 · Unentschieden: 75 je Duellant.'],
  arena: ['Alle beantworten dieselbe Frage – geheim.', 'Wer falsch liegt, scheidet aus.', 'Jede überlebte Frage 50 Punkte – alle drei: +150 Bonus.'],
  sound: ['Hört genau auf den Fernseher.', 'Tippe ein, was du hörst.', 'Erstes Hören 300 · zweites 200 · mit Hinweis 100.'],
  timeline: ['Vier Ereignisse stehen fest auf der Zeitleiste.', 'Ordne das gesuchte Ereignis auf dem Handy ein.', 'Richtiges Feld 250 · direkt daneben 100.'],
  panic: ['Teamspiel: Jeder hat nur einen Teil der Hinweise.', 'Sprecht euch laut ab – der Entschärfer gibt den Code ein.', 'Gelöst: 200 Punkte für alle · blitzschnell +50.'],
  impostor: ['Einer von euch kennt das geheime Wort nicht.', 'Gebt reihum einen Hinweis und enttarnt den Hochstapler.', 'Nicht enttarnt: 300 · Hochstapler erkannt: 100.'],
  bluff: ['Erfinde eine glaubwürdige falsche Antwort.', 'Dann suchst du die echte unter allen Antworten.', 'Echte erkannt = Punkte · wer auf deine Lüge hereinfällt, bringt dir Punkte.'],
  corridor: ['Gib einen Bereich an, in dem die Lösung liegt.', 'Je enger der Bereich, desto mehr Punkte.', 'Liegt die Lösung daneben: 0 Punkte.'],
  twist: ['Ein bekannter Titel wurde ins Gegenteil verdreht.', 'Tippe das Original auf dem Handy ein.', 'Je schneller richtig, desto mehr Punkte – nur ein Versuch.'],
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
  const lastTest = useRef<number | null>(null);
  useEffect(() => { const v = view?.room.soundTest; if (v === undefined) return; if (lastTest.current === null) { lastTest.current = v; return; } if (v !== lastTest.current) { lastTest.current = v; testTone(); } }, [view?.room.soundTest]);
  useEffect(() => { setMusic(!!view?.room.music?.on && started && !view?.room.showPaused, view?.room.music?.vol ?? 25); }, [view?.room.music?.on, view?.room.music?.vol, view?.room.sound, view?.room.showPaused, started]);
  useSounds(view, started);
  return (
    <div className={`tv ${view?.room.reduced ? 'reduced' : ''}`} ref={rootRef}>
      <div className="tvbg" />
      {!started && <div className="startgate" onClick={start}><div className="logo huge"><Brand /></div><button className="btn primary huge">▶ Bildschirm starten</button><p>Einmal klicken: aktiviert Ton &amp; Vollbild</p></div>}
      {!view ? <div className="tvcenter"><div className="logo huge"><Brand /></div><p className="pulse">{conn === 'denied' ? 'Raum nicht gefunden' : 'Verbinde …'}</p></div> : <Screen view={view} serverNow={serverNow} code={code} />}
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
  return <div className="tvhead"><div className="logo tiny"><Brand /></div><div className="act">{view.room.act}</div><div className="right">{right}</div></div>;
}

// ---------------------------------------------------------------- Lobby
function LobbyTv({ view, code }: { view: View; code: string }) {
  const { base, ready, loopback } = useBaseUrl();
  const url = `${base}/play/${code}`;
  const shown = base.replace(/^https?:\/\//, '');
  return (
    <div className="lobbytv">
      <div className="left">
        <div className="logo huge"><Brand /></div>
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
      <div className="showtitle">{view.room.brand?.title ?? BRAND_NAME}</div>
      {view.room.brand?.tagline && <div className="tagline2">{view.room.brand.tagline}</div>}
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
    <aside className="liverank" aria-label="Ranking">
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
        <div className="roundtitle"><span className="ic">{round.icon}</span><div><b>{round.kind === 'final' && round.mode !== 'vote' ? 'FINAL LOCK' : modeName(round)}</b><small>{taskLine(round, view.room.flow === 'classic' ? round.title : undefined)}</small></div></div>
      )}
      {round.stage === 'reveal' && round.mode !== 'match' && <MissingNote view={view} rev={round.reveal} />}
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
          round.mode === 'vote' ? <VoteTv view={view} round={round} /> :
          round.mode === 'bluff' ? <BluffTv view={view} round={round} /> :
          round.mode === 'pixel' ? <PixelTv view={view} round={round} /> :
          round.mode === 'duel' ? <DuelTv view={view} round={round} /> :
          round.mode === 'arena' ? <ArenaTv view={view} round={round} /> :
          round.mode === 'sound' ? <SoundTv view={view} round={round} /> :
          round.mode === 'timeline' ? <TimelineTv view={view} round={round} /> :
          round.mode === 'panic' ? <PanicTv view={view} round={round} /> :
          round.mode === 'impostor' ? <ImpostorTv view={view} round={round} /> :
          round.mode === 'corridor' ? <CorridorTv view={view} round={round} /> :
          round.mode === 'twist' ? <TwistTv view={view} round={round} /> :
          <UniqueTv view={view} round={round} />}
      </div>
    </div>
  );
}

/** Kleine Zusatzzeile: Aufgabe X von Y und Maximalpunkte – bei Proberunden der Hinweis „keine Punkte“. */
function taskLine(round: RoundView, cat?: string): string {
  const parts: string[] = [];
  if (cat && cat !== modeName(round)) parts.push(cat);
  if (round.practice) parts.push('Proberunde', 'keine Punkte');
  else { if (round.scoredCount > 1) parts.push(`Aufgabe ${round.scoredIndex} von ${round.scoredCount}`); parts.push(`bis zu ${round.points} Punkte`); }
  return parts.join(' · ');
}

/** Regeltexte je Modus – variantenabhängig (SORTIER’S!/BLIND RANK; SETZ AUF MICH: Einsätze und Bonus aus dem Paket). */
function rulesFor(round: RoundView): string[] {
  const d = round.data ?? {};
  if (round.mode === 'rank' && d.variant === 'sort') return ['Fünf gemischte Karten liegen auf deinem Handy.', 'Ziehe sie auf die Plätze 1 bis 5 – oder erst Karte, dann Platz antippen.', `Je Karte auf der exakt richtigen Position: ${d.points ? Math.round(d.points / 5) : 50} Punkte.`];
  if (round.mode === 'estimate' && d.bets) return ['Schätze geheim eine Zahl.', `Dann siehst du alle Tipps und setzt bis zu 50 % deiner Punkte auf eine Schätzung – oder gar nichts.`, d.bonus ? `Die beste Schätzung bringt zusätzlich +${d.bonus} Punkte.` : 'Gewonnener Einsatz: plus. Verlorener: minus.'];
  return MODE_RULES[round.mode];
}

function RuleCard({ round, view }: { round: RoundView; view: View }) {
  if (round.taskIndex > 0) {                     // ab der 2. Aufgabe einer Runde: kompakte Karte statt voller Regelkarte (spart Zeit)
    return (
      <div className="rulecard compact">
        <div className="flip"><div className="bigic">{round.icon}</div></div>
        <h1>{round.kind === 'final' && round.mode !== 'vote' ? 'FINAL LOCK' : modeName(round)}</h1>
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
      {round.kind === 'final' && round.taskIndex === 0 && round.mode !== 'vote' ? <>
        <h1>FINAL LOCK</h1>
        <ol><li style={{ animationDelay: '.4s' }}>① Ein Ort auf der Karte – 400 Punkte</li><li style={{ animationDelay: '.8s' }}>② Eine gemeinsame Lösung – bis 300 Punkte</li><li style={{ animationDelay: '1.2s' }}>③ Eine Sortieraufgabe – 500 Punkte</li><li style={{ animationDelay: '1.6s' }}>④ Schätzen mit Einsatz – bis zu 800 Punkte</li></ol>
      </> : <>
        <h1>{modeName(round)}</h1>
        <ol>{rulesFor(round).map((r, i) => <li key={i} style={{ animationDelay: `${0.4 + i * 0.5}s` }}>{r}</li>)}</ol>
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

function Explain({ text }: { text?: string }) { return text && !/^So funktioniert/.test(text) ? <div className="explain">💡 {text}</div> : null; }
/** Wer nichts abgegeben hat – in jeder Auflösung sichtbar. */
function MissingNote({ view, rev }: { view: View; rev: any }) {
  const ids: string[] = rev?.missing ?? []; if (!ids.length) return null;
  return <div className="missingnote"><span>Nicht abgegeben · 0 Punkte:</span>{ids.map(id => { const p = pl(view, id); return p ? <em key={id}><Avatar a={p.avatar} size={30} />{p.name}</em> : null; })}</div>;
}

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
          {sorted.map((r: any, ri: number) => { const p = pl(view, r.pid)!; if (!p || !r.placed) return null; return (
            <div key={r.pid} className="rrow" style={{ animationDelay: `${1.2 + ri * 0.4}s` }}>
              <div className="who"><Avatar a={p.avatar} size={42} /><b>{p.name}</b></div>
              <div className="cols">{r.slots.map((s: number, i: number) => <div key={i} className={`cell ${s < 0 ? 'none' : rev.scoring === 'exact' ? (s === i ? 'good' : 'bad') : (r.pairs ?? []).filter((x: any) => (x.a === s || x.b === s) && x.ok).length >= 3 ? 'good' : 'mid'}`}><span>{s >= 0 ? rev.items[s].text : '—'}</span></div>)}</div>
              <div className="sc"><small>{rev.scoring === 'exact' ? `${r.correct} von 5 richtig` : `${r.correct} von ${r.total} Paaren`}</small><strong>+{r.points}</strong></div>
            </div>); })}
        </div>
        <p className="rankhow">{rev.scoring === 'exact' ? `Je ${rev.perPos} Punkte für jeden Begriff auf der richtigen Position (grün).` : `Gewertet werden alle 10 Paarvergleiche („steht der richtige Begriff weiter oben?“), je ${rev.perPair} Punkte.`}</p>
        <Explain text={rev.explain} />
      </div>
    );
  }
  return (
    <div className="ranktv">
      <div className="bigq small">{d.prompt}</div>
      <div className="rankstage">
        {d.variant === 'sort' && d.pool && <div className="curitem"><small>Sortiere die fünf Karten auf deinem Handy auf die Plätze 1–5</small><div className="seen">{d.pool.map((x: any) => <span key={x.idx}>{x.text}</span>)}</div><small>▲ {d.topLabel} · ▼ {d.bottomLabel}</small></div>}
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
          <PointsList view={view} rows={view.players.map(p => { const g = guesses.find(x => x.pid === p.id); const b = bets.find(x => x.pid === p.id); return { pid: p.id, points: (g?.points ?? 0) + (g?.bonus ?? 0) + (b?.delta ?? 0), note: (g ? `Platz ${g.place}${g.bonus ? ` · Bonus +${g.bonus}` : ''} · ` : 'keine Schätzung · ') + estimateNetLine((g?.points ?? 0) + (g?.bonus ?? 0), b ? b.delta : null) + (b ? ` ${b.won ? '✅' : '❌'} auf ${pl(view, b.target)?.name}` : '') }; }).sort((a, b) => b.points - a.points)} />
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
          <div className="mtpairs compact">{rev.pairs.map((p: any, i: number) => <div key={i} className="mtpair" style={{ animationDelay: `${i * 0.3}s` }}><span>{p.left}</span><i>→</i><b>{p.right}</b></div>)}</div>
          <div className="mtplayers">
            {rev.rows.slice().sort((a: any, b: any) => b.points - a.points).map((r: any) => { const p = pl(view, r.pid); if (!p) return null; return (
              <div key={r.pid} className={`mtp ${r.submitted ? '' : 'none'}`}>
                <div className="who"><Avatar a={p.avatar} size={38} /><b>{p.name}</b></div>
                {r.submitted ? <div className="marks">{rev.pairs.map((pp: any, i: number) => <span key={i} className={r.marks?.[i] ? 'ok' : 'no'} title={pp.left}>{r.marks?.[i] ? '✓' : '✗'}<small>{pp.left}</small></span>)}</div> : <div className="marks"><em>Nicht abgegeben</em></div>}
                <strong>{r.submitted ? `${r.correct}/6 · +${r.points}` : '0 Punkte'}</strong>
              </div>); })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- KICKBASE-KONSENS
function VoteTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  if (!rev) return (
    <div className="votetv"><div className="bigq">{d.prompt}</div>
      <p className="hint big">{d.answeredCount} von {d.playerCount} haben gewählt – die Stimmen bleiben geheim.</p><AnswerRow players={view.players} /></div>
  );
  const max = Math.max(1, rev.max);
  const shown = rev.counts.filter((c: any) => c.votes > 0).slice().reverse();   // Spannung: wenigste Stimmen zuerst, Konsens zuletzt
  const none = rev.counts.filter((c: any) => c.votes === 0);
  const nameOf = (c: any) => c.host ? c.name : pl(view, c.pid)?.name ?? '?';
  return (
    <div className="votetv reveal"><div className="bigq small">{rev.prompt}</div>
      <div className="votebars">
        {shown.map((c: any, i: number) => { const p = c.host ? null : pl(view, c.pid); const win = rev.winners.includes(c.pid); const last = i === shown.length - 1; return (
          <div key={c.pid} className={`vbar ${win ? 'win' : ''}`} style={{ animationDelay: `${0.4 + i * 0.9}s` }}>
            <div className="who">{c.host ? <span className="hostav" aria-hidden>🎙️</span> : p ? <Avatar a={p.avatar} size={52} /> : null}<b>{nameOf(c)}</b></div>
            <div className="track"><div className="fill" style={{ width: `${(c.votes / max) * 100}%`, animationDelay: `${0.6 + i * 0.9}s` }} /></div>
            <div className="voters">{c.voters.map((v: string) => { const vp = pl(view, v); return vp ? <Avatar key={v} a={vp.avatar} size={30} /> : null; })}</div>
            <strong>{c.votes}{win ? ' 🤝' : ''}{last && !win ? '' : ''}</strong>
          </div>); })}
      </div>
      {none.length > 0 && <p className="muted small">Keine Stimmen: {none.map(nameOf).join(', ')}</p>}
      {rev.noConsensus
        ? <p className="rankhow"><b>Kein Konsens</b> – jede Person nur eine Stimme, niemand bekommt Punkte.</p>
        : <p className="rankhow">Konsens{rev.winners.length > 1 ? ' (Gleichstand: alle Spitzenwahlen zählen)' : ''}: wer ihn getippt hat, erhält <b>+{rev.points} Punkte</b>.</p>}
      <Explain text={rev.explain} />
    </div>
  );
}

// ---- Neue Spiele: PIXELPANIK, DUELL, ARENA, TONSPUR, ZEITSPRUNG, PANIK, HOCHSTAPLER
const media = (view: View, token: string, name: string) => `/api/media/${view.room.code}/${token}/${name}`;
function PixelTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal; const token = rev ? rev.media : d.media;
  return (
    <div className="pixelTv"><div className="bigq small">{d.prompt}</div>
      <div className="pixelframe"><img key={rev ? 'clear' : d.level} className={rev ? 'clear' : 'pix'} src={media(view, token, `l${rev ? 4 : d.level}`)} alt="" /></div>
      {!rev && <><div className="pixlevels">{Array.from({ length: d.levels }).map((_, i) => <span key={i} className={i <= d.level ? 'on' : ''}>{d.points[i]}</span>)}</div>
        <p className="hint big">Stufe {d.level + 1} von {d.levels} · jetzt richtig = <b>{d.points[d.level]} Punkte</b> · {d.answeredCount} von {d.playerCount} haben getippt</p><AnswerRow players={view.players} /></>}
      {rev && <div className="lreveal"><div className="lanswer">Gesucht war: <b>{rev.answer}</b></div>
        <table className="linktable"><tbody>{rev.rows.map((r: any) => { const p = pl(view, r.pid)!; return <tr key={r.pid} className={r.answer ? (r.correct ? 'ok' : 'bad') : 'none'}><td><Avatar a={p.avatar} size={40} /> <b>{p.name}</b></td><td>{r.answer ? `„${r.answer}“` : 'keine Abgabe'}</td><td>{r.answer ? `Stufe ${r.level + 1}` : ''}</td><td>{r.correct ? `+${r.points}` : '0'}</td></tr>; })}</tbody></table><Explain text={rev.explain} /></div>}
    </div>);
}
function DuelTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal; const [a, b] = d.duelists.map((id: string) => pl(view, id)) as (PlayerPublic | undefined)[];
  const side = (p: PlayerPublic | undefined, score?: number, win?: boolean) => p && <div className={`duelist ${win ? 'win' : ''}`}><Avatar a={p.avatar} size={190} /><b>{p.name}</b>{score !== undefined && <span className="dscore">{score} / 3</span>}{d.answeredNow?.includes(p.id) && !rev && <span className="dtick">✓ geantwortet</span>}</div>;
  return (
    <div className="duelTv"><div className="bigq small">{d.prompt}</div>
      <div className="duelstage">{side(a, rev?.scores[a?.id ?? ''], rev && rev.winner === a?.id)}<div className="vs">VS</div>{side(b, rev?.scores[b?.id ?? ''], rev && rev.winner === b?.id)}</div>
      {!rev && round.stage === 'open' && <p className="hint big">Wer gewinnt? {d.predictedCount} von {d.playerCount - 2} haben getippt – {d.predict} Punkte für den richtigen Tipp.</p>}
      {!rev && round.stage === 'bet' && d.question && <><div className="bigq small">Frage {d.q + 1} von 3: {d.question.q}</div><div className="bluffopts">{d.question.options.map((o: string, i: number) => <div key={i} className="bopt"><b className="bl">{String.fromCharCode(65 + i)}</b><span className="bt">{o}</span></div>)}</div></>}
      {rev && <><p className="hint big">{rev.winner ? <>🏆 <b>{pl(view, rev.winner)?.name}</b> gewinnt das Duell!</> : <b>Unentschieden!</b>}</p>
        <div className="lreveal"><table className="linktable"><tbody>{rev.questions.map((q: any, i: number) => <tr key={i}><td>{q.q}</td><td>✅ {q.options[q.correct]}</td>{rev.duelists.map((id: string) => <td key={id} className={q.answers[id] === q.correct ? 'ok' : 'bad'}>{pl(view, id)?.name}: {q.answers[id] === null ? '–' : q.options[q.answers[id]]}</td>)}</tr>)}</tbody></table>
          {rev.picks.length > 0 && <p className="rankhow">Richtig getippt: {rev.picks.filter((p: any) => p.correct).map((p: any) => pl(view, p.pid)?.name).join(', ') || 'niemand'}{rev.winner === null ? ' (Unentschieden – kein Verlust)' : ''}</p>}<Explain text={rev.explain} /></div></>}
    </div>);
}
function ArenaTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal; const res = d.results?.[d.q];
  const out = (id: string) => !(d.alive as string[]).includes(id);
  return (
    <div className="arenaTv"><div className="bigq small">Herausforderung {Math.min(d.q + 1, d.qCount)} von {d.qCount}</div>
      <div className="arenagrid">{view.players.map(p => <div key={p.id} className={`arenap ${out(p.id) ? 'out' : ''} ${res?.eliminated?.includes(p.id) && round.stage === 'bet' ? 'just' : ''}`}><Avatar a={p.avatar} size={64} /><b>{p.name}</b>{out(p.id) && <span>💀</span>}{!out(p.id) && round.stage === 'open' && p.answered && <span>✓</span>}</div>)}</div>
      {!rev && d.question && <><div className="bigq">{d.question.q}</div><div className="bluffopts">{d.question.options.map((o: string, i: number) => <div key={i} className={`bopt ${round.stage === 'bet' && res && res.correct === i ? 'truth' : ''}`}><b className="bl">{String.fromCharCode(65 + i)}</b><span className="bt">{o}</span></div>)}</div></>}
      {!rev && round.stage === 'open' && <p className="hint big">{d.answeredCount} von {d.aliveCount} Überlebenden haben geantwortet.</p>}
      {!rev && round.stage === 'bet' && res && <p className="hint big">{res.eliminated.length ? `💀 Ausgeschieden: ${res.eliminated.map((id: string) => pl(view, id)?.name).join(', ')}` : 'Alle haben überlebt!'}{res.survivors.length === 0 ? ' – die Arena ist leer!' : ''}</p>}
      {rev && <div className="lreveal"><table className="linktable"><tbody>{rev.rows.slice().sort((a: any, b: any) => b.points - a.points).map((r: any) => { const p = pl(view, r.pid)!; return <tr key={r.pid} className={r.survived === 3 ? 'ok' : r.survived ? '' : 'bad'}><td><Avatar a={p.avatar} size={40} /> <b>{p.name}</b></td><td>{r.survived} von 3 überlebt{r.survived === 3 ? ` · Bonus +${rev.bonus}` : ''}</td><td>+{r.points}</td></tr>; })}</tbody></table><Explain text={rev.explain} /></div>}
    </div>);
}
function SoundTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal; const token = rev ? rev.media : d.media; const last = useRef('');
  useEffect(() => {
    if (!token) return; const key = rev ? 'reveal' : `${d.plays}`; if (last.current === key) return; last.current = key;
    const name = rev ? 'a1' : d.plays >= 2 ? 'a2' : 'a1'; const au = new Audio(media(view, token, name)); au.play().catch(() => { /* Autoplay gesperrt: Bildschirm-Start-Klick fehlt */ });
    return () => { au.pause(); };
  }, [token, d.plays, !!rev]);          // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="soundTv"><div className="bigq small">{d.prompt}</div>
      <div className={`wave ${rev ? '' : 'live'}`}>{Array.from({ length: 28 }).map((_, i) => <i key={i} style={{ animationDelay: `${(i % 7) * 0.09}s`, height: `${20 + ((i * 37) % 60)}%` }} />)}</div>
      {!rev && <><p className="hint big">🎧 {['Erstes Hören', 'Zweites Hören', 'Mit Hinweis'][d.phase]} · jetzt richtig = <b>{d.points[d.phase]} Punkte</b></p>{d.hint && <div className="explain">💡 Hinweis: {d.hint}</div>}<p className="muted">{d.answeredCount} von {d.playerCount} haben getippt</p><AnswerRow players={view.players} /></>}
      {rev && <div className="lreveal"><div className="lanswer">Das war: <b>{rev.answer}</b></div><table className="linktable"><tbody>{rev.rows.map((r: any) => { const p = pl(view, r.pid)!; return <tr key={r.pid} className={r.answer ? (r.correct ? 'ok' : 'bad') : 'none'}><td><Avatar a={p.avatar} size={40} /> <b>{p.name}</b></td><td>{r.answer ? `„${r.answer}“` : 'keine Abgabe'}</td><td>{r.correct ? `+${r.points}` : '0'}</td></tr>; })}</tbody></table><Explain text={rev.explain} /></div>}
    </div>);
}
function TimelineTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal; const A = (rev ? rev.anchors : d.anchors) as { year: number; label: string }[];
  const label = (i: number) => (i === 0 ? `vor ${A[0].year}` : i === 4 ? `nach ${A[3].year}` : `${A[i - 1].year}–${A[i].year}`);
  return (
    <div className="timelineTv"><div className="bigq">{d.prompt}</div>
      <div className="tlaxis">{[0, 1, 2, 3, 4].map(i => (
        <div className="tlcol" key={i}>
          <div className={`tlgap ${rev && rev.correct === i ? 'hit' : ''}`}><small>{label(i)}</small>
            {rev && <div className="tlwho">{rev.rows.filter((r: any) => r.slot === i).map((r: any) => <Avatar key={r.pid} a={pl(view, r.pid)!.avatar} size={44} />)}{rev.correct === i && <b className="tlyear">{rev.answerYear}</b>}</div>}</div>
          {i < 4 && <div className="tlanchor"><b>{A[i].year}</b><span>{A[i].label}</span></div>}
        </div>))}</div>
      {!rev && <><p className="hint big">{d.answeredCount} von {d.playerCount} haben sich entschieden.</p><AnswerRow players={view.players} /></>}
      {rev && <><p className="hint big">{rev.answerLabel || 'Gesucht'}: <b>{rev.answerYear}</b></p><p className="rankhow">Richtiges Feld +250 · direkt daneben +100</p><Explain text={rev.explain} /></>}
    </div>);
}
function PanicTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal; const def = pl(view, d.defuser);
  return (
    <div className={`panicTv ${rev ? (rev.solved ? 'won' : 'lost') : ''}`}><div className="bigq small">{d.prompt}</div>
      <div className="codeslots">{[0, 1, 2].map(i => <span key={i} className="slot">{rev ? rev.code[i] : '?'}</span>)}</div>
      <p className="hint big">💣 Entschärfer: <b>{def?.name}</b> · Hinweise verteilt: {d.clueCount} · Versuche: {'🔴'.repeat(d.attempts)}{'⚪'.repeat(Math.max(0, d.maxAttempts - d.attempts))}</p>
      {!rev && <p className="muted">Sprecht euch laut ab! Nur der Entschärfer gibt den Code ein.</p>}
      {rev && <div className="lreveal"><div className="lanswer">{rev.solved ? (rev.fast ? '💥 ENTSCHÄRFT – blitzschnell!' : '✅ ENTSCHÄRFT!') : '⏰ Nicht geschafft'} · Code: <b>{rev.code}</b> · {rev.perPlayer} Punkte für alle</div>
        <table className="linktable"><tbody>{rev.clues.map((c: any, i: number) => <tr key={i}><td><b>{i + 1}</b></td><td>{c.text}</td><td>{c.holder ? pl(view, c.holder)?.name : ''}</td></tr>)}</tbody></table><Explain text={rev.explain} /></div>}
    </div>);
}
function ImpostorTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  const clues: { pid: string; clue: string }[] = rev ? rev.clues : d.clues ?? [];
  return (
    <div className="impTv"><div className="bigq small">🕵️ Thema: {rev ? rev.topic : d.topic}</div>
      {!rev && round.stage === 'open' && <p className="hint big">Alle schreiben ein Hinweiswort … {d.clueCount} von {d.playerCount} fertig. Einer von euch kennt das Wort NICHT!</p>}
      {(rev || round.stage !== 'open') && <div className="cluecards">{clues.map(c => { const p = pl(view, c.pid)!; return <div key={c.pid} className={`cluecard ${rev && rev.impostor === c.pid ? 'imp' : ''}`}><Avatar a={p.avatar} size={56} /><b>{p.name}</b><span>{c.clue ?? '–'}</span>{rev && <em>{(rev.votes[c.pid] ?? []).length > 0 ? `${rev.votes[c.pid].length} Stimme(n)` : ''}</em>}</div>; })}</div>}
      {!rev && round.stage === 'bet' && <p className="hint big">Wer ist der Hochstapler? {d.voteCount} von {d.playerCount} haben abgestimmt.</p>}
      {!rev && round.stage === 'bet' && <AnswerRow players={view.players} />}
      {rev && <div className="lreveal"><div className="lanswer">Das Wort war: <b>{rev.word}</b> · Hochstapler: <b>{pl(view, rev.impostor)?.name}</b> {rev.caught ? '– enttarnt!' : '– unentdeckt!'}</div>{rev.guess && <p className="hint big">Sein Tipp: „{rev.guess}“ {rev.guessed ? '✅' : '❌'}</p>}<Explain text={rev.explain} /></div>}
    </div>);
}

// ---- LÜGEN HABEN KURZE BEINE
function BluffTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  if (rev) return (
    <div className="bluffTv reveal"><div className="bigq small">{d.prompt}</div>
      <div className="bluffopts">{rev.options.map((o: any, i: number) => (
        <div key={o.id} className={`bopt ${o.truth ? 'truth' : ''}`} style={{ animationDelay: `${0.3 + i * 0.5}s` }}>
          <b className="bl">{String.fromCharCode(65 + i)}</b><span className="bt">{o.text}{o.truth ? ' ✅ DIE WAHRHEIT' : ''}</span>
          <span className="bwho">{o.truth ? 'gewählt von ' : o.authors.length ? `erfunden von ${o.authors.map((a: string) => pl(view, a)?.name).join(', ')} · gewählt von ` : 'gewählt von '}{o.pickers.length ? o.pickers.map((a: string) => pl(view, a)?.name).join(', ') : 'niemandem'}</span>
        </div>))}</div>
      <p className="rankhow">Wahrheit erkannt: <b>+{rev.points}</b> · pro Hereingefallenem auf deine Lüge: <b>+{rev.bluffPoints}</b></p>
      <Explain text={rev.explain} />
    </div>);
  return (
    <div className="bluffTv"><div className="bigq">{d.prompt}</div>
      {round.stage === 'open' && <p className="hint big">✍️ Alle erfinden jetzt eine glaubwürdige falsche Antwort … {d.writtenCount} von {d.playerCount} fertig.</p>}
      {round.stage === 'bet' && d.options && <>
        <div className="bluffopts">{d.options.map((o: any, i: number) => <div key={o.id} className="bopt"><b className="bl">{String.fromCharCode(65 + i)}</b><span className="bt">{o.text}</span></div>)}</div>
        <p className="hint big">🔍 Welche Antwort ist die echte? {d.pickedCount} von {d.playerCount} haben gewählt.</p></>}
      {round.stage !== 'open' && round.stage !== 'bet' && <p className="hint big">Alle Stimmen sind drin!</p>}
      <AnswerRow players={view.players} />
    </div>);
}

// ---- SCHÄTZKORRIDOR
function CorridorTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  if (!rev) return <div className="corrTv"><div className="bigq">{d.prompt}</div><p className="hint big">Gib einen Bereich in {d.unit} an – {d.answeredCount} von {d.playerCount} haben abgegeben.</p><AnswerRow players={view.players} /></div>;
  const rows = rev.rows.filter((r: any) => r.low !== null);
  const vals = [rev.answer, ...rows.flatMap((r: any) => [r.low, r.high])]; const mn = Math.min(...vals), mx = Math.max(...vals), span = Math.max(mx - mn, 1e-9);
  const pos = (v: number) => `${4 + ((v - mn) / span) * 92}%`;
  return (
    <div className="corrTv reveal"><div className="bigq small">{d.prompt}</div>
      <div className="corraxis">
        <div className="corrans" style={{ left: `calc(16vw + 10px + (100% - 22vw - 20px) * ${(0.04 + 0.92 * ((rev.answer - mn) / span)).toFixed(4)})` }}><span>{rev.answer.toLocaleString('de-DE')} {rev.unit}</span></div>
        {rows.map((r: any, i: number) => { const p = pl(view, r.pid)!; return (
          <div key={r.pid} className={`corrbar ${r.hit ? 'hit' : 'miss'}`} style={{ animationDelay: `${0.3 + i * 0.4}s` }}>
            <span className="cwho"><Avatar a={p.avatar} size={34} /> {p.name}</span>
            <div className="ctrack"><div className="cfill" style={{ left: pos(r.low), width: `calc(${pos(r.high)} - ${pos(r.low)} + 6px)` }} /></div>
            <strong>{r.hit ? `+${r.points}` : '0'}</strong>
          </div>); })}
      </div>
      <p className="rankhow">Treffer zählen – je enger der Bereich, desto mehr Punkte (bis {rev.points}).</p>
      <Explain text={rev.explain} />
    </div>);
}

// ---- VERDREHTE WELT
function TwistTv({ view, round }: { view: View; round: RoundView }) {
  const d = round.data; const rev = round.reveal;
  return (
    <div className="twistTv"><div className="bigq small">{d.prompt}</div>
      <div className="twistedbig">{d.twisted}</div>
      {!rev && <><p className="hint big">{d.answeredCount} von {d.playerCount} haben getippt.</p><AnswerRow players={view.players} /></>}
      {rev && <div className="lreveal"><div className="lanswer">Das Original: <b>{rev.answer}</b></div>
        <table className="linktable"><tbody>{rev.rows.map((r: any) => { const p = pl(view, r.pid)!; return <tr key={r.pid} className={r.answer ? (r.correct ? 'ok' : 'bad') : 'none'}><td><Avatar a={p.avatar} size={40} /> <b>{p.name}</b></td><td>{r.answer ? `„${r.answer}“` : 'keine Abgabe'}</td><td>{r.correct ? `+${r.points}` : '0'}</td></tr>; })}</tbody></table>
        <Explain text={rev.explain} /></div>}
    </div>);
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
      {!rev && round.stage === 'open' && <div className="lnow">Jetzt richtig: <b>{d.points[d.level]} Punkte</b> · {d.answeredCount} von {d.playerCount} Antworten abgegeben</div>}
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
      <h1>{/markt/i.test(b.title) ? '📈 ' : ''}{b.title}</h1><p className="muted">{/markt/i.test(b.title) ? 'Wer steigt, wer fällt? · ' : ''}{b.reason}</p>
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
      {winner && <div className="winnerbanner"><small>Der {view.room.brand?.winner ?? 'JANIQUIZITION-Champion'}</small><b>{winner.name}</b><span className="trophy">🏆</span>{view.room.brand?.winnerLine && <em className="wline">{view.room.brand.winnerLine}</em>}</div>}
    </div>
  );
}
