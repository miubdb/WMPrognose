import { useEffect, useMemo, useRef, useState } from 'react';
import type { View } from '../../../shared/types';
import { RoundTv } from '../pages/Tv';
import { PhoneRound } from '../pages/PhoneModes';
import { adm, errText } from './api';

export interface PreviewMeta { title?: string; topic?: string; icon?: string; color?: string; blurb?: string; kind?: 'tile' | 'surprise' | 'final' }
interface Frame { label: string; tv: View; player: View; host: View }

export function TvFrame({ view }: { view: View }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.4);
  useEffect(() => {
    const fit = () => { if (ref.current) setK(ref.current.clientWidth / 1920); };
    fit(); const ro = new ResizeObserver(fit); if (ref.current) ro.observe(ref.current); return () => ro.disconnect();
  }, []);
  return (
    <div className="tvframe" ref={ref} style={{ height: 1080 * k }}>
      <div className="tv tvstatic" style={{ transform: `scale(${k})` }}>
        <div className="tvbg" />
        {view.round && <RoundTv view={view} round={view.round} serverNow={() => view.now} />}
      </div>
    </div>
  );
}

export function Preview({ task, meta, onClose }: { task: any; meta?: PreviewMeta; onClose: () => void }) {
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState('');
  const [i, setI] = useState(0);
  const room = useMemo(() => 'preview-' + Math.random().toString(36).slice(2), []);
  useEffect(() => {
    adm('POST', '/preview', { task, meta }).then(r => { if (r.ok) setRes(r.data); else setErr(errText(r)); });
    // eslint-disable-next-line
  }, []);
  const f: Frame | undefined = res?.frames?.[i];
  return (
    <div className="modal" onClick={onClose}>
      <div className="modalbox wide" onClick={e => e.stopPropagation()}>
        <div className="row between"><h2>👀 Vorschau – so läuft die Frage in der Show</h2><button className="btn small ghost" onClick={onClose}>Schließen ✕</button></div>
        <p className="muted small">Berechnet mit der echten Spiel-Engine und den echten Bildschirmen. Vier Beispielspieler (Anna sehr gut, Ben mittel, Cem schwach, Dana ohne Abgabe). Ein echter Raum wird nicht berührt.</p>
        {!res && !err && <p className="pulse">Lade Vorschau …</p>}
        {err && <div className="status bad">{err}</div>}
        {res && !res.ok && <div className="card"><b>Die Frage ist noch nicht vollständig:</b><ul>{res.problems.map((p: string) => <li key={p}>{p}</li>)}</ul></div>}
        {f && (
          <>
            <div className="frametabs">{res.frames.map((x: Frame, n: number) => <button key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)}>{n + 1}. {x.label}</button>)}</div>
            <div className="prevgrid">
              <div><h4>📺 Fernseher</h4><TvFrame view={f.tv} /></div>
              <div><h4>📱 Handy von Anna</h4>
                <div className="phone phoneframe"><PhoneRound view={f.player} round={f.player.round!} act={async () => ({ reqId: '', ok: true })} serverNow={() => f.player.now} room={room} pid={f.player.me!.id} /></div></div>
            </div>
            <div className="prevgrid">
              <div className="card"><h4>🔑 Showmaster sieht</h4><pre className="hostdata">{JSON.stringify(f.host.round?.data?.solution ?? f.host.round?.data?.zones ?? f.host.round?.data?.validNames ?? '—', null, 1)}</pre></div>
              <div className="card"><h4>🧮 Punkteberechnung (Beispiel)</h4>
                <table className="scoretab"><tbody>{res.scores.map((s: any) => <tr key={s.name}><td>{s.name}</td><td className={s.points > 0 ? 'pos' : s.points < 0 ? 'neg' : ''}><b>{s.points > 0 ? '+' : ''}{s.points}</b></td><td className="muted">{s.label}</td></tr>)}</tbody></table>
                <p className="small muted">{res.formula}</p></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
