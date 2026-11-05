import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { PlayerPublic } from '../../../shared/types';
import { Avatar } from './Avatar';

export function useTick(ms = 200) {
  const [, set] = useState(0);
  useEffect(() => { const id = setInterval(() => set(x => x + 1), ms); return () => clearInterval(id); }, [ms]);
}

/** Verbleibende Sekunden aus Serverfrist (oder eingefrorener Restzeit). */
export function remaining(round: { deadline: number | null; pausedLeft: number | null } | null, serverNow: () => number): number | null {
  if (!round) return null;
  if (round.pausedLeft !== null) return Math.ceil(round.pausedLeft / 1000);
  if (round.deadline === null) return null;
  return Math.max(0, Math.ceil((round.deadline - serverNow()) / 1000));
}

export function Countdown({ round, serverNow, size = 120, onTick }: {
  round: { deadline: number | null; pausedLeft: number | null; stageSeconds: number | null } | null; serverNow: () => number; size?: number; onTick?: (s: number) => void;
}) {
  useTick(200);
  const s = remaining(round, serverNow);
  const last = useRef<number | null>(null);
  useEffect(() => { if (s !== null && s !== last.current) { last.current = s; onTick?.(s); } });
  if (s === null || !round?.stageSeconds) return null;
  const total = round.stageSeconds;
  const frac = Math.max(0, Math.min(1, s / total));
  const paused = round.pausedLeft !== null;
  const color = paused ? '#a7a3d0' : s <= 5 ? '#ef4444' : s <= 10 ? '#f5b82e' : '#14d9c0';
  const R = 44, C = 2 * Math.PI * R;
  return (
    <div className={`countdown ${s <= 5 && !paused ? 'urgent' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={R} fill="rgba(10,8,32,.7)" stroke="rgba(255,255,255,.12)" strokeWidth="8" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s' }} />
      </svg>
      <span style={{ fontSize: size * 0.36 }}>{paused ? '⏸' : s}</span>
    </div>
  );
}

const isLoopback = (h: string) => /^(localhost|127\.|\[?::1\]?$|0\.0\.0\.0)/i.test(h);
/** Basisadresse, die Smartphones erreichen können. Bei localhost/127.0.0.1 wird die LAN-Adresse vom Server geholt – nie localhost im QR-Code. */
export function useBaseUrl(): { base: string; loopback: boolean; ready: boolean; ambiguous: boolean; candidates: { name: string; url: string; virtual: boolean; preferred: boolean }[] } {
  const loop = isLoopback(location.hostname);
  const [info, setInfo] = useState<any>(null);
  useEffect(() => { if (loop) fetch('/api/netinfo').then(r => r.json()).then(setInfo).catch(() => setInfo({ preferred: null, candidates: [] })); }, [loop]);
  if (!loop) return { base: location.origin, loopback: false, ready: true, ambiguous: false, candidates: [] };
  return { base: info?.preferred ?? '', loopback: true, ready: !!info, ambiguous: !!info?.ambiguous, candidates: info?.candidates ?? [] };
}

export function QR({ text, size = 280 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState('');
  useEffect(() => { QRCode.toString(text, { type: 'svg', margin: 1, color: { dark: '#0a0820', light: '#ffffff' } }).then(setSvg).catch(() => setSvg('')); }, [text]);
  return <div className="qr" data-url={text} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function PlayerChip({ p, size = 44, ring }: { p: PlayerPublic; size?: number; ring?: boolean }) {
  return (
    <div className={`chip ${p.connected ? '' : 'off'} ${ring ? 'ring' : ''}`}>
      <Avatar a={p.avatar} size={size} /><span>{p.name}</span>
    </div>
  );
}

/** Spieler-Fortschrittsleiste: wer hat abgegeben (ohne Inhalt). */
export function AnswerRow({ players }: { players: PlayerPublic[] }) {
  return (
    <div className="answerrow">
      {players.map(p => (
        <div key={p.id} className={`ans ${p.answered ? 'done' : ''} ${p.connected ? '' : 'off'}`}>
          <div className="av"><Avatar a={p.avatar} size="100%" /></div>
          <b>{p.name}</b>
          <i>{p.answered ? '✓' : p.connected ? '…' : '⚡'}</i>
        </div>
      ))}
    </div>
  );
}

export function useCountUp(target: number, from: number, run: boolean, ms = 1400) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (!run) { setV(from); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const f = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - f, 3);
      setV(Math.round(from + (target - from) * e));
      if (f < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, from, run, ms]);
  return v;
}

/** Animierte Rangliste: Avatare wechseln sichtbar ihre Plätze (FLIP über transform-Transition). */
export function Leaderboard({ rows, prev, animate = true, rowH = 92, showScore = true }: {
  rows: { id: string; name: string; avatar: PlayerPublic['avatar']; score: number }[]; prev?: Record<string, number>; animate?: boolean; rowH?: number; showScore?: boolean;
}) {
  const [phase, setPhase] = useState(animate && prev ? 0 : 1);
  useEffect(() => {
    if (!(animate && prev)) { setPhase(1); return; }
    setPhase(0);
    const t = setTimeout(() => setPhase(1), 1600);
    return () => clearTimeout(t);
  }, [animate, JSON.stringify(rows.map(r => [r.id, r.score]))]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevScore = (id: string) => prev?.[id] ?? 0;
  const orderNow = rows.map(r => r.id);
  const orderPrev = rows.slice().sort((a, b) => prevScore(b.id) - prevScore(a.id) || orderNow.indexOf(a.id) - orderNow.indexOf(b.id)).map(r => r.id);
  const order = phase === 0 && prev ? orderPrev : orderNow;
  return (
    <div className="lb" style={{ height: rows.length * rowH }}>
      {rows.map(r => {
        const pos = order.indexOf(r.id);
        const final = orderNow.indexOf(r.id);
        const climbed = prev ? orderPrev.indexOf(r.id) - final : 0;
        return (
          <LbRow key={r.id} r={r} pos={pos} rank={final + 1} rowH={rowH} phase={phase} from={prevScore(r.id)} showScore={showScore} climbed={phase === 1 ? climbed : 0} />
        );
      })}
    </div>
  );
}
function LbRow({ r, pos, rank, rowH, phase, from, showScore, climbed }: { r: { id: string; name: string; avatar: PlayerPublic['avatar']; score: number }; pos: number; rank: number; rowH: number; phase: number; from: number; showScore: boolean; climbed: number }) {
  const v = useCountUp(r.score, from, phase === 1, 1500);
  const shown = phase === 0 ? from : v;
  return (
    <div className={`lbrow ${rank === 1 && phase === 1 ? 'first' : ''} ${climbed > 0 ? 'up' : ''}`} style={{ transform: `translateY(${pos * rowH}px)`, height: rowH - 10 }}>
      <b className="pos">{(phase === 0 ? pos : rank - 1) + 1}</b>
      <Avatar a={r.avatar} size={rowH - 26} />
      <span className="nm">{r.name}</span>
      {climbed > 0 && <em className="arrow">▲{climbed}</em>}
      {showScore && <strong className="sc">{shown.toLocaleString('de-DE')}</strong>}
    </div>
  );
}

export function ConnBadge({ conn, pending }: { conn: string; pending?: number }) {
  const text = conn === 'online' ? (pending ? `Sende … (${pending})` : 'Verbunden') : conn === 'connecting' ? 'Verbinde …' : conn === 'offline' ? 'Verbinde neu …' : conn === 'kicked' ? 'Abgemeldet' : 'Kein Zugang';
  const cls = conn === 'online' && !pending ? 'ok' : conn === 'online' ? 'warn' : conn === 'kicked' || conn === 'denied' ? 'bad' : 'warn';
  return <span className={`conn ${cls}`}><i />{text}</span>;
}
