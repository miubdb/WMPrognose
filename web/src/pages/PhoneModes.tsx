import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerPublic, RoundView, View } from '../../../shared/types';
import { Avatar } from '../ui/Avatar';
import { MapView, type LL } from '../ui/MapView';
import { SceneView } from '../ui/SceneView';
import { Countdown } from '../ui/widgets';
import type { Ack } from '../net';
import { store } from '../net';

type Act = (a: any) => Promise<Ack>;
interface Props { view: View; round: RoundView; act: Act; serverNow: () => number; room: string; pid: string }

const ERR: Record<string, string> = {
  closed: 'Die Zeit ist abgelaufen – keine Abgabe mehr möglich.', already_submitted: 'Du hast bereits abgegeben.', invalid: 'Ungültige Eingabe.', paused: 'Die Show ist pausiert.',
  not_enough_points: 'Dafür hast du nicht genug Punkte.', wrong_step: 'Dieser Begriff ist schon vorbei.', slot_taken: 'Dieser Platz ist schon belegt.', no_attempts_left: 'Keine Versuche mehr.',
  session_replaced: 'Dieses Gerät wurde abgemeldet.', review_needed: 'Bitte zuerst die unklaren Antworten prüfen.', invalid_target: 'Diese Schätzung kann man nicht wählen.', invalid_bet: 'Ungültiger Einsatz.',
};
export const errText = (e?: string) => (e && ERR[e]) || (e ? `Fehler: ${e}` : 'Fehler');

/** Lokaler Entwurf (überlebt Reload / App-Wechsel). */
function useDraft<T>(key: string, initial: T): [T, (v: T) => void, () => void] {
  const [v, setV] = useState<T>(() => store.get<T>('outplay.draft.' + key) ?? initial);
  const k = useRef(key); k.current = key;
  useEffect(() => { setV(store.get<T>('outplay.draft.' + key) ?? initial); /* eslint-disable-next-line */ }, [key]);
  return [v, (x: T) => { setV(x); store.set('outplay.draft.' + k.current, x); }, () => store.del('outplay.draft.' + k.current)];
}

function useSender(act: Act) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const send = async (a: any): Promise<Ack> => {
    setState('sending'); setMsg('');
    const ack = await act(a);
    if (ack.ok) { setState('ok'); } else { setState('err'); setMsg(errText(ack.err)); }
    return ack;
  };
  return { state, msg, send, reset: () => { setState('idle'); setMsg(''); } };
}

function Status({ sent, draft, sending, msg }: { sent: boolean; draft: boolean; sending?: boolean; msg?: string }) {
  if (msg) return <div className="status bad">{msg}</div>;
  if (sent) return <div className="status ok">✓ Antwort gesendet und gespeichert</div>;
  if (sending) return <div className="status warn">Wird gesendet … (wartet ggf. auf Verbindung)</div>;
  if (draft) return <div className="status warn">Antwort noch nicht gesendet</div>;
  return <div className="status">&nbsp;</div>;
}

export function PhoneRound(p: Props) {
  const { round, view } = p;
  const me = view.players.find(x => x.id === p.pid);
  return (
    <div className="phoneround" style={{ ['--accent' as any]: round.color }}>
      <header className="prhead">
        <div><small>{round.taskCount > 1 ? `Aufgabe ${round.taskIndex + 1}/${round.taskCount}` : 'Aufgabe'}</small><b>{round.icon} {round.title}</b></div>
        {round.stage !== 'intro' && round.stage !== 'reveal' && <Countdown round={round} serverNow={p.serverNow} size={64} />}
      </header>
      {round.stage === 'intro' && <PhoneIntro round={round} />}
      {round.stage !== 'intro' && round.stage !== 'reveal' && <PhoneBody {...p} me={me} />}
      {round.stage === 'reveal' && <PhoneReveal {...p} />}
    </div>
  );
}

const MODE_TXT: Record<string, string> = {
  geo: 'Setze deinen Pin auf der Karte und bestätige. Je näher dran, desto besser.',
  rank: 'Begriffe erscheinen nacheinander. Setze jeden SOFORT auf einen freien Rangplatz – endgültig!',
  estimate: 'Erst schätzt du geheim. Dann siehst du alle Tipps und setzt Punkte auf die Schätzung, der du vertraust.',
  glitch: 'Merk dir das Bild auf dem Fernseher. Danach tippst du auf die veränderte Stelle.',
  codebreak: 'Knack das Rätsel. Hinweise helfen, kosten aber Punkte. Drei Versuche.',
  unique: 'Nenne eine gültige Antwort – aber bloß keine, die auch andere nennen!',
  match: 'Verbinde links und rechts, was zusammengehört. 6 Paare, 50 Punkte je richtigem Paar – ändern geht bis zur Abgabe.',
  link: 'Vier Hinweise erscheinen nacheinander. Je früher du die gemeinsame Lösung nennst, desto mehr Punkte – aber du hast nur einen Versuch!',
};
function PhoneIntro({ round }: { round: RoundView }) {
  return (
    <div className="card center big">
      <div className="bigicon">{round.icon}</div>
      <h2>{round.title}</h2>
      <p>{MODE_TXT[round.mode]}</p>
      <p className="muted">Der Showmaster startet gleich …</p>
    </div>
  );
}

function PhoneBody(p: Props & { me?: PlayerPublic }) {
  const { round } = p;
  const d = round.data;
  switch (round.mode) {
    case 'geo': return <GeoPhone {...p} d={d} />;
    case 'rank': return <RankPhone {...p} d={d} />;
    case 'estimate': return <EstimatePhone {...p} d={d} />;
    case 'glitch': return <GlitchPhone {...p} d={d} />;
    case 'codebreak': return <CodePhone {...p} d={d} />;
    case 'unique': return <UniquePhone {...p} d={d} />;
    case 'match': return <MatchPhone {...p} d={d} />;
    case 'link': return <LinkPhone {...p} d={d} />;
  }
}

function Waiting({ text, sub }: { text: string; sub?: string }) {
  return <div className="card center"><div className="spinner" /><h3>{text}</h3>{sub && <p className="muted">{sub}</p>}</div>;
}

// ---------------------------------------------------------------- GEO
function GeoPhone({ round, act, room, d }: Props & { d: any }) {
  const mine: LL | null = d.mine;
  const [draft, setDraft, clear] = useDraft<LL | null>(`${room}.${round.rid}`, null);
  const snd = useSender(act);
  const locked = round.stage !== 'open';
  const pin = mine ?? draft;
  useEffect(() => { if (mine) clear(); /* eslint-disable-next-line */ }, [!!mine]);
  if (locked && !mine) return <Waiting text="Zeit abgelaufen" sub="Du hast diesmal nichts abgegeben." />;
  return (
    <div className="geo">
      <div className="question">{d.prompt}</div>
      <MapView kind={d.map} mode="pick" pin={pin} onPin={ll => !mine && !locked && setDraft(ll)} disabled={!!mine || locked} className="phonemap" />
      <Status sent={!!mine} draft={!!draft && !mine} sending={snd.state === 'sending'} msg={snd.msg} />
      {!mine && (
        <button className="btn primary wide" disabled={!draft || snd.state === 'sending'} onClick={() => draft && snd.send({ k: 'submit', payload: draft })}>
          {draft ? 'Tipp abgeben' : 'Tippe auf die Karte, um den Pin zu setzen'}
        </button>
      )}
      {mine && <p className="muted center">Warte auf die anderen …</p>}
    </div>
  );
}

// ---------------------------------------------------------------- RANK
function RankPhone({ round, act, d, view, pid }: Props & { d: any }) {
  const snd = useSender(act);
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { setSel(null); snd.reset(); /* eslint-disable-next-line */ }, [d.step]);
  const mine: (string | null)[] = d.mine ?? new Array(d.slots).fill(null);
  const placedThis = round.stage === 'open' && d.item && mine.includes(d.item);
  void view; void pid;
  if (round.stage !== 'open') return (
    <div className="rank"><div className="question">{d.prompt}</div><SlotList d={d} mine={mine} sel={null} onSel={() => {}} /><Waiting text="Alle Begriffe sind vergeben" sub="Gleich kommt die Auflösung." /></div>
  );
  return (
    <div className="rank">
      <div className="question">{d.prompt}</div>
      <div className="itemcard" key={d.step}><small>Begriff {d.step + 1} von {d.steps}</small><b>{d.item}</b></div>
      <SlotList d={d} mine={mine} sel={sel} onSel={i => !placedThis && mine[i] === null && setSel(i)} />
      {placedThis ? <div className="status ok">✓ Platziert – warte auf den nächsten Begriff</div> : <div className="status">{snd.msg || 'Wähle einen freien Platz'}</div>}
      {!placedThis && <button className="btn primary wide" disabled={sel === null || snd.state === 'sending'}
        onClick={async () => { if (sel === null) return; const a = await snd.send({ k: 'submit', payload: { step: d.step, slot: sel } }); if (a.ok) setSel(null); }}>
        {sel === null ? 'Platz antippen' : `Auf Platz ${sel + 1} setzen – endgültig`}
      </button>}
    </div>
  );
}
function SlotList({ d, mine, sel, onSel }: { d: any; mine: (string | null)[]; sel: number | null; onSel: (i: number) => void }) {
  return (
    <div className="slots">
      <small className="edge">▲ {d.topLabel}</small>
      {mine.map((t, i) => (
        <button type="button" key={i} className={`slot ${t ? 'filled' : ''} ${sel === i ? 'sel' : ''}`} onClick={() => onSel(i)}>
          <b>{i + 1}</b><span>{t ?? 'frei'}</span>
        </button>
      ))}
      <small className="edge">▼ {d.bottomLabel}</small>
    </div>
  );
}

// ---------------------------------------------------------------- ESTIMATE
function EstimatePhone({ round, act, room, d, view, pid }: Props & { d: any }) {
  const snd = useSender(act);
  const mine = d.mine ?? {};
  const [draft, setDraft, clear] = useDraft<string>(`${room}.${round.rid}.est`, '');
  const [target, setTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  useEffect(() => { if (mine.guess !== undefined) clear(); /* eslint-disable-next-line */ }, [mine.guess !== undefined]);
  if (round.stage === 'open') {
    return (
      <div className="est">
        <div className="question">{d.prompt}</div>
        {mine.guess === undefined ? (
          <>
            <div className="inputrow"><input inputMode="decimal" autoComplete="off" placeholder="Deine Schätzung" value={draft} onChange={e => setDraft(e.target.value)} /><span className="unit">{d.unit}</span></div>
            <Status sent={false} draft={!!draft} sending={snd.state === 'sending'} msg={snd.msg} />
            <button className="btn primary wide" disabled={!draft.trim() || snd.state === 'sending'} onClick={() => snd.send({ k: 'submit', payload: { value: draft } })}>Schätzung abgeben</button>
          </>
        ) : <><Status sent draft={false} /><div className="bignum">{mine.guess.toLocaleString('de-DE')} <small>{d.unit}</small></div><p className="muted center">Warte auf die anderen …</p></>}
      </div>
    );
  }
  if (round.stage === 'bet') {
    const guesses: { pid: string; value: number }[] = d.guesses ?? [];
    const placed = mine.bet;
    return (
      <div className="est">
        <div className="question small">{d.prompt}</div>
        <p className="center muted">Wem vertraust du am meisten? Setze Punkte auf eine Schätzung (auch die eigene).</p>
        <div className="guesslist">
          {guesses.slice().sort((a, b) => a.value - b.value).map(g => {
            const pl = view.players.find(x => x.id === g.pid);
            const on = (placed ? placed.target : target) === g.pid;
            return (
              <button type="button" key={g.pid} disabled={!!placed} className={`guess ${on ? 'sel' : ''}`} onClick={() => setTarget(g.pid)}>
                {pl && <Avatar a={pl.avatar} size={44} />}<span className="who">{pl?.name}{g.pid === pid ? ' (du)' : ''}</span><b>{g.value.toLocaleString('de-DE')}</b>
              </button>
            );
          })}
        </div>
        {!placed ? (
          <>
            <div className="chips">{d.bets.map((b: number) => (
              <button type="button" key={b} disabled={b > (d.allowance ?? d.balance ?? 0)} className={`chipbtn ${amount === b ? 'sel' : ''}`} onClick={() => setAmount(b)}>{b === 0 ? 'Kein Einsatz' : `${b} Punkte`}</button>
            ))}</div>
            <p className="muted center small">Du hast {(d.balance ?? 0).toLocaleString('de-DE')} Punkte. Gewonnen: +Einsatz. Verloren: −Einsatz, höchstens so viel, wie du besitzt (nie unter 0).</p>
            <button className="btn primary wide" disabled={snd.state === 'sending' || (amount > 0 && !target)}
              onClick={() => snd.send({ k: 'submit', payload: { amount, target: amount > 0 ? target : null } })}>
              {amount === 0 ? 'Ohne Einsatz weiter' : `${amount} Punkte setzen`}
            </button>
            <Status sent={false} draft={false} sending={snd.state === 'sending'} msg={snd.msg} />
          </>
        ) : <Status sent draft={false} />}
      </div>
    );
  }
  return <Waiting text="Einsätze gesperrt" sub="Gleich kommt die Lösung …" />;
}

// ---------------------------------------------------------------- GLITCH
function GlitchPhone({ round, act, room, d }: Props & { d: any }) {
  const snd = useSender(act);
  const mine = d.mine;
  const [draft, setDraft, clear] = useDraft<{ x: number; y: number } | null>(`${room}.${round.rid}`, null);
  useEffect(() => { if (mine) clear(); /* eslint-disable-next-line */ }, [!!mine]);
  if (round.stage === 'view') return <div className="card center big"><div className="bigicon">📺</div><h2>Schau auf den Fernseher!</h2><p>{d.prompt}</p></div>;
  if (round.stage !== 'open') return mine ? <Waiting text="Abgegeben" sub="Gleich kommt die Auflösung." /> : <Waiting text="Zeit abgelaufen" />;
  const marker = mine ?? draft;
  return (
    <div className="glitch">
      <div className="question small">{d.prompt}</div>
      <SceneView scene={d.sceneData} marker={marker} onTap={(x, y) => !mine && setDraft({ x, y })} disabled={!!mine} className="phonescene" />
      <Status sent={!!mine} draft={!!draft && !mine} sending={snd.state === 'sending'} msg={snd.msg} />
      {!mine && <button className="btn primary wide" disabled={!draft || snd.state === 'sending'} onClick={() => draft && snd.send({ k: 'submit', payload: draft })}>{draft ? 'Markierung abgeben' : 'Tippe auf die gesuchte Stelle'}</button>}
    </div>
  );
}

// ---------------------------------------------------------------- CODEBREAK
function CodePhone({ round, act, room, d }: Props & { d: any }) {
  const snd = useSender(act);
  const mine = d.mine ?? { hints: 0, attempts: 0, solved: false, hintTexts: [] };
  const [draft, setDraft] = useDraft<string>(`${room}.${round.rid}.code`, '');
  const [feedback, setFeedback] = useState('');
  const left = d.maxAttempts - mine.attempts;
  const nextCost = [0, 25, 50, 75][Math.min(3, mine.hints + 1)];
  return (
    <div className="code">
      <div className="question">{d.prompt}</div>
      {d.display && <pre className="display">{d.display}</pre>}
      {mine.hintTexts.map((h: string, i: number) => <div key={i} className="hint">💡 Hinweis {i + 1}: {h}</div>)}
      {mine.solved ? <div className="status ok big">✓ Gelöst! {mine.hints ? `(mit ${mine.hints} Hinweis${mine.hints > 1 ? 'en' : ''})` : '(ohne Hinweis!)'}</div> : round.stage === 'open' && left > 0 ? (
        <>
          <div className="inputrow"><input inputMode={d.input === 'number' ? 'decimal' : 'text'} autoComplete="off" placeholder="Deine Lösung" value={draft} onChange={e => { setDraft(e.target.value); setFeedback(''); }} /></div>
          <div className={`status ${feedback ? 'bad' : ''}`}>{feedback || `Noch ${left} Versuch${left === 1 ? '' : 'e'}`}{snd.msg ? ' · ' + snd.msg : ''}</div>
          <button className="btn primary wide" disabled={!draft.trim() || snd.state === 'sending'} onClick={async () => {
            const a = await snd.send({ k: 'submit', payload: { answer: draft } });
            if (a.ok && a.info && a.info.correct === false) setFeedback(`Leider falsch. Noch ${a.info.left} Versuch${a.info.left === 1 ? '' : 'e'}.`);
            if (a.ok && a.info?.correct === false) setDraft('');
          }}>Lösung prüfen</button>
          {mine.hints < d.hintCount && <button className="btn ghost wide" disabled={snd.state === 'sending'} onClick={() => snd.send({ k: 'hint' })}>💡 Hinweis freischalten (−{nextCost}% Punkte)</button>}
        </>
      ) : <Waiting text={left <= 0 ? 'Keine Versuche mehr' : 'Zeit abgelaufen'} sub="Gleich kommt die Auflösung." />}
    </div>
  );
}

// ---------------------------------------------------------------- UNIQUE
function UniquePhone({ round, act, room, d }: Props & { d: any }) {
  const snd = useSender(act);
  const mine = d.mine;
  const [draft, setDraft, clear] = useDraft<string>(`${room}.${round.rid}.uni`, '');
  useEffect(() => { if (mine) clear(); /* eslint-disable-next-line */ }, [!!mine]);
  if (round.stage === 'open') return (
    <div className="uni">
      <div className="question">{d.prompt}</div>
      <p className="center muted">Einzigartig = {d.pointsUnique} Punkte · Mehrfach genannt = nur {d.pointsShared}</p>
      {!mine ? (
        <>
          <div className="inputrow"><input autoComplete="off" autoCapitalize="words" placeholder={d.placeholder} value={draft} maxLength={60} onChange={e => setDraft(e.target.value)} /></div>
          <Status sent={false} draft={!!draft} sending={snd.state === 'sending'} msg={snd.msg} />
          <button className="btn primary wide" disabled={!draft.trim() || snd.state === 'sending'} onClick={() => snd.send({ k: 'submit', payload: { answer: draft } })}>Antwort abgeben</button>
        </>
      ) : <><Status sent draft={false} /><div className="bignum">{mine.answer}</div><p className="muted center">Warte auf die anderen … denk dran: nur einzigartige Antworten zählen voll!</p></>}
    </div>
  );
  return <Waiting text={mine ? 'Antworten werden geprüft' : 'Zeit abgelaufen'} sub="Der Showmaster prüft unklare Antworten." />;
}


// ---------------------------------------------------------------- MATCHMAKER
const PAIR_COLORS = ['#14d9c0', '#f5b82e', '#ec4899', '#38bdf8', '#a3e635', '#fb923c'];
function MatchPhone({ round, act, d }: Props & { d: any }) {
  const n: number = d.n;
  const serverPairs: number[] = d.mine?.pairs ?? new Array(n).fill(-1);
  const final: boolean = !!d.mine?.final;
  const [pairs, setPairs] = useState<number[]>(serverPairs);
  const [sel, setSel] = useState<{ side: 'L' | 'R'; i: number } | null>(null);
  const [confirmMsg, setConfirmMsg] = useState('');
  const snd = useSender(act);
  const dirty = useRef(false);
  useEffect(() => { setPairs(d.mine?.pairs ?? new Array(n).fill(-1)); dirty.current = false; /* eslint-disable-next-line */ }, [round.rid]);
  // Entwurf laufend beim Server sichern – bei Zeitablauf oder Reload zählt der letzte Stand
  useEffect(() => {
    if (!dirty.current || final || round.stage !== 'open') return;
    const t = setTimeout(() => { void act({ k: 'submit', payload: { pairs, final: false } }); dirty.current = false; }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [pairs]);
  const locked = final || round.stage !== 'open';
  const colorOf = (li: number) => PAIR_COLORS[li % PAIR_COLORS.length];
  const owner = (ri: number) => pairs.findIndex(p => p === ri);
  const link = (li: number, ri: number) => {
    const next = pairs.map(p => (p === ri ? -1 : p)); next[li] = ri;   // nur 1:1: alte Verbindungen der beiden Enden lösen
    dirty.current = true; setPairs(next); setSel(null);
  };
  const tapL = (li: number) => {
    if (locked) return;
    if (sel?.side === 'R') { link(li, sel.i); return; }
    if (sel?.side === 'L' && sel.i === li) { setSel(null); return; }
    if (pairs[li] >= 0) { const next = pairs.slice(); next[li] = -1; dirty.current = true; setPairs(next); }   // verbundenen Begriff antippen = lösen und neu wählen
    setSel({ side: 'L', i: li });
  };
  const tapR = (ri: number) => {
    if (locked) return;
    if (sel?.side === 'L') { link(sel.i, ri); return; }
    if (sel?.side === 'R' && sel.i === ri) { setSel(null); return; }
    const o = owner(ri);
    if (o >= 0) { const next = pairs.slice(); next[o] = -1; dirty.current = true; setPairs(next); }
    setSel({ side: 'R', i: ri });
  };
  const done = pairs.filter(x => x >= 0).length;
  const ROW = 68, GAP = 10;
  const y = (i: number) => i * (ROW + GAP) + ROW / 2;
  const H = n * ROW + (n - 1) * GAP;
  const submit = async () => {
    if (done < n && !confirmMsg) { setConfirmMsg(`Nur ${done} von ${n} verbunden. Nochmal tippen zum Abgeben.`); return; }
    setConfirmMsg('');
    await snd.send({ k: 'submit', payload: { pairs, final: true } });
  };
  return (
    <div className="match">
      <div className="question small">{d.prompt}</div>
      <div className="matchgrid" style={{ ['--rowh' as any]: ROW + 'px', ['--gap' as any]: GAP + 'px' }}>
        <div className="mcol">{d.left.map((t: string, i: number) => (
          <button type="button" key={i} disabled={locked} className={`mitem ${pairs[i] >= 0 ? 'linked' : ''} ${sel?.side === 'L' && sel.i === i ? 'sel' : ''}`} style={pairs[i] >= 0 ? { ['--pc' as any]: colorOf(i) } : undefined} onClick={() => tapL(i)}>{t}</button>))}</div>
        <svg className="mlines" viewBox={`0 0 60 ${H}`} preserveAspectRatio="none" aria-hidden>
          {pairs.map((ri, i) => ri >= 0 ? <path key={i} d={`M0 ${y(i)} C30 ${y(i)} 30 ${y(ri)} 60 ${y(ri)}`} fill="none" stroke={colorOf(i)} strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null)}
        </svg>
        <div className="mcol">{d.right.map((t: string, ri: number) => { const o = owner(ri); return (
          <button type="button" key={ri} disabled={locked} className={`mitem ${o >= 0 ? 'linked' : ''} ${sel?.side === 'R' && sel.i === ri ? 'sel' : ''}`} style={o >= 0 ? { ['--pc' as any]: colorOf(o) } : undefined} onClick={() => tapR(ri)}>{t}</button>); })}</div>
      </div>
      {final ? <div className="status ok">✓ Abgegeben – Eingabe gesperrt</div>
        : round.stage !== 'open' ? <div className="status warn">Zeit abgelaufen – deine letzte Zuordnung wird gewertet</div>
        : <div className="status">{snd.msg || confirmMsg || (sel ? 'Jetzt den passenden Begriff auf der anderen Seite antippen' : `${done} von ${n} verbunden – Begriff antippen, dann den Partner`)}</div>}
      {!locked && <button className="btn primary wide" disabled={done === 0 || snd.state === 'sending'} onClick={submit}>{done === n ? 'Endgültig abgeben' : done ? `Abgeben (${done} von ${n})` : 'Verbinde zuerst Paare'}</button>}
      {final && <p className="muted center">Warte auf die anderen …</p>}
    </div>
  );
}

// ---------------------------------------------------------------- DIE VERBINDUNG
function LinkPhone({ round, act, room, d }: Props & { d: any }) {
  const snd = useSender(act);
  const mine = d.mine;
  const [draft, setDraft, clear] = useDraft<string>(`${room}.${round.rid}.link`, '');
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (mine) clear(); /* eslint-disable-next-line */ }, [!!mine]);
  const now = d.points[d.level];
  const next = d.points[d.level + 1];
  return (
    <div className="link">
      <div className="question small">{d.prompt}</div>
      <div className="clues">{d.clues.map((c: string, i: number) => <div key={i} className={`clue ${i === d.level ? 'new' : ''}`}><b>{i + 1}</b><span>{c}</span></div>)}
        {Array.from({ length: d.total - d.clues.length }).map((_, i) => <div key={'x' + i} className="clue locked"><b>{d.clues.length + i + 1}</b><span>noch verborgen · {d.points[d.clues.length + i]} Punkte</span></div>)}</div>
      {round.stage === 'open' && !mine && <div className="center linkpts"><b>{now} Punkte</b> für eine richtige Antwort jetzt{next !== undefined ? <> · mit dem nächsten Hinweis nur noch {next}</> : ' (letzter Hinweis)'}</div>}
      {round.stage === 'open' && !mine ? (
        <>
          <div className="inputrow"><input autoComplete="off" autoCapitalize="words" placeholder="Deine Lösung" value={draft} maxLength={80} onChange={e => { setDraft(e.target.value); setArmed(false); }} /></div>
          <Status sent={false} draft={!!draft} sending={snd.state === 'sending'} msg={snd.msg} />
          <button className={`btn wide ${armed ? 'gold' : 'primary'}`} disabled={!draft.trim() || snd.state === 'sending'} onClick={async () => { if (!armed) { setArmed(true); return; } await snd.send({ k: 'submit', payload: { answer: draft } }); setArmed(false); }}>
            {armed ? 'Wirklich endgültig abgeben? (nur ein Versuch!)' : 'Lösung abgeben'}</button>
        </>
      ) : mine ? <><Status sent draft={false} /><div className="bignum">{mine.answer}</div><p className="muted center">Abgegeben nach Hinweis {mine.level + 1}. Die Antwort bleibt bis zur Auflösung verborgen.</p></>
        : <Waiting text="Zeit abgelaufen" sub="Gleich kommt die Auflösung." />}
    </div>
  );
}

// ---------------------------------------------------------------- Auflösung
function PhoneReveal({ round, view, pid }: Props) {
  const rev = round.reveal;
  const info = useMemo(() => ownResult(round.mode, rev, pid, view), [round.mode, rev, pid, view]);
  return (
    <div className="card center big reveal">
      <small>{info.title}</small>
      <div className={`pts ${info.points > 0 ? 'pos' : info.points < 0 ? 'neg' : ''}`}>{info.points > 0 ? '+' : ''}{info.points}</div>
      <p>{info.text}</p>
      {round.mode === 'match' && rev?.rows && <div className="mreveal">{rev.pairs.map((pr: any, i: number) => { const r = rev.rows.find((x: any) => x.pid === pid); return <div key={i} className={`mr ${r?.marks?.[i] ? 'ok' : 'no'}`}>{r?.marks?.[i] ? '✓' : '✗'} {pr.left} → <b>{pr.right}</b></div>; })}</div>}
      {round.mode === 'link' && rev && <p><b>Lösung: {rev.answer}</b></p>}
      <p className="muted small">{rev?.explain}</p>
    </div>
  );
}
function ownResult(mode: string, rev: any, pid: string, view: View): { points: number; text: string; title: string } {
  const none = { points: 0, title: 'Auflösung', text: 'Keine Abgabe – 0 Punkte.' };
  if (!rev) return none;
  switch (mode) {
    case 'geo': { const g = rev.guesses.find((x: any) => x.pid === pid); return g ? { points: g.points, title: `Platz ${g.place}`, text: `${g.km.toLocaleString('de-DE')} km daneben` } : none; }
    case 'rank': { const r = rev.rows.find((x: any) => x.pid === pid); return r && r.placed ? { points: r.points, title: 'Blind Rank', text: `${r.correct} von ${r.total} Paaren richtig` } : none; }
    case 'estimate': {
      const g = rev.guesses.find((x: any) => x.pid === pid); const b = rev.bets.find((x: any) => x.pid === pid);
      const pts = (g?.points ?? 0) + (b?.delta ?? 0);
      const t = [g ? `Schätzung: Platz ${g.place}${g.best ? ' 🎯' : ''}` : 'Keine Schätzung', b ? (b.won ? `Einsatz gewonnen (+${b.amount})` : `Einsatz verloren (${b.delta})`) : ''].filter(Boolean).join(' · ');
      return { points: pts, title: `Lösung: ${rev.answer.toLocaleString('de-DE')} ${rev.unit}`, text: t };
    }
    case 'glitch': { const r = rev.rows.find((x: any) => x.pid === pid); return r?.tap ? { points: r.points, title: r.hit ? 'Treffer!' : 'Daneben', text: r.hit ? 'Genau erkannt.' : r.points ? 'Knapp daneben.' : 'Nicht getroffen.' } : none; }
    case 'codebreak': { const r = rev.rows.find((x: any) => x.pid === pid); return r ? { points: r.points, title: `Lösung: ${rev.answer}`, text: r.solved ? (r.hints ? `Gelöst mit ${r.hints} Hinweis(en)` : 'Gelöst ohne Hinweis!') : 'Nicht gelöst.' } : none; }
    case 'match': { const r = rev.rows.find((x: any) => x.pid === pid); return r && r.submitted ? { points: r.points, title: 'MATCHMAKER', text: `${r.correct} von 6 Paaren richtig` } : none; }
    case 'link': { const r = rev.rows.find((x: any) => x.pid === pid); return r && r.answer ? { points: r.points, title: r.correct ? `Richtig nach Hinweis ${r.level + 1}!` : 'Leider falsch', text: `Deine Antwort: ${r.answer}` } : none; }
    case 'unique': { const r = rev.results[pid]; return r ? { points: r.points, title: r.kind === 'unique' ? 'EINZIGARTIG! ✨' : r.kind === 'shared' ? 'Mehrfach genannt' : 'Ungültig', text: rev.groups.find((g: any) => g.members.includes(pid))?.label ?? '' } : none; }
  }
  void view;
  return none;
}
