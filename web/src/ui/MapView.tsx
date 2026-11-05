import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapKind, Avatar as AvatarT } from '../../../shared/types';
import { Avatar } from './Avatar';
import { HEIGHTS, MAX_ZOOM, W, layoutLabels, prepareMap, type Prepared, type LabelItem } from './mapGeo';

export interface LL { lat: number; lon: number }
export interface MapPin { id: string; ll: LL; avatar?: AvatarT; label?: string; color?: string; delay?: number }
interface Props {
  kind: MapKind;
  /** pick: Antippen setzt den Pin, Pin lässt sich verschieben. show: nur Anzeige. */
  mode: 'pick' | 'show';
  pin?: LL | null;
  onPin?: (ll: LL) => void;
  pins?: MapPin[];
  answer?: LL & { label?: string };
  fit?: boolean;
  disabled?: boolean;
  className?: string;
  /** Skalierung aller Beschriftungen/Symbole (Fernseher: größer) */
  uiScale?: number;
}

// OSM-ähnliche Farbwelt (hell, gut lesbar auf Handy und TV)
const C = {
  sea: '#aad3df', land: '#f2efe9', landFar: '#ebe8e0', state: '#ece7dc', coast: '#8bb4c4', border: '#a77dba', stateBorder: '#c9b3d4', river: '#78acd8', lake: '#aad3df', lakeLine: '#86b5c8',
  text: '#2b2b33', halo: '#fbfaf6', sea_t: '#4d83b4', river_t: '#3f7db8', country_t: '#7a7487', state_t: '#8a7a6a', region_t: '#5f7f55', peak_t: '#6b5a48',
};

const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function MapViewSvg({ kind, mode, pin, onPin, pins = [], answer, fit, disabled, className, uiScale = 1 }: Props) {
  const [geo, setGeo] = useState<Prepared | null>(null);
  const H = HEIGHTS[kind], maxK = MAX_ZOOM[kind];
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const tRef = useRef(t); tRef.current = t;
  const [px, setPx] = useState(0.4);            // CSS-Pixel je SVG-Einheit
  const S = uiScale / px;                       // SVG-Einheiten je Design-Pixel (Pins, Steuerung)
  const SL = S * clampN(W * px / 900, 0.8, 1);  // Beschriftungen: auf kleinen Karten (Handy) etwas kleiner
  const [drag, setDrag] = useState<LL | null>(null);

  useEffect(() => { let dead = false; prepareMap(kind).then(g => { if (!dead) setGeo(g); }); return () => { dead = true; }; }, [kind]);
  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const upd = () => { const m = el.getScreenCTM(); if (m && m.a > 0) setPx(m.a); };
    upd(); const ro = new ResizeObserver(upd); ro.observe(el); return () => ro.disconnect();
  }, []);

  const toSvg = useCallback((cx: number, cy: number) => {
    const el = svgRef.current!; const m = el.getScreenCTM()!; const p = el.createSVGPoint(); p.x = cx; p.y = cy; const q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  }, []);
  const clamp = useCallback((k: number, x: number, y: number) => {
    k = clampN(k, 1, maxK);
    return { k, x: clampN(x, W - W * k, 0), y: clampN(y, H - H * k, 0) };
  }, [maxK, H]);
  const zoomAt = useCallback((p: { x: number; y: number }, factor: number) => {
    const cur = tRef.current; const k = clampN(cur.k * factor, 1, maxK); const f = k / cur.k;
    setT(clamp(k, p.x - (p.x - cur.x) * f, p.y - (p.y - cur.y) * f));
  }, [clamp, maxK]);

  const proj = geo?.projection;
  const ptOf = useCallback((ll: LL) => proj?.([ll.lon, ll.lat]) as [number, number] | null | undefined, [proj]);
  const llAtSvg = useCallback((sx: number, sy: number): LL | null => {
    const cur = tRef.current; const ll = proj?.invert?.([(sx - cur.x) / cur.k, (sy - cur.y) / cur.k]);
    return ll && Number.isFinite(ll[0]) && Number.isFinite(ll[1]) && Math.abs(ll[1]) <= 90 ? { lon: ll[0], lat: ll[1] } : null;
  }, [proj]);

  // Auto-Ausschnitt für die Auflösung
  useEffect(() => {
    if (!fit || !proj) return;
    const pts: [number, number][] = [];
    for (const p of pins) { const q = proj([p.ll.lon, p.ll.lat]); if (q) pts.push(q as [number, number]); }
    if (answer) { const q = proj([answer.lon, answer.lat]); if (q) pts.push(q as [number, number]); }
    if (!pts.length) return;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const bw = Math.max(90, Math.max(...xs) - Math.min(...xs)), bh = Math.max(90, Math.max(...ys) - Math.min(...ys));
    const k = clampN(0.7 * Math.min(W / bw, H / bh), 1, Math.min(12, maxK));
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    setT(clamp(k, W / 2 - cx * k, H / 2 - cy * k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, pins.length, answer?.lat, answer?.lon, proj]);

  // ---------------------------------------------------------------- Gesten
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{ moved: boolean; startDist: number; startK: number; startX: number; startY: number; mid: { x: number; y: number }; downAt: number; start: { x: number; y: number }; dragPin: { dx: number; dy: number } | null } | null>(null);
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);
  const shown = drag ?? pin ?? null;

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()]; const cur = tRef.current;
    if (pts.length === 1) {
      const s = toSvg(e.clientX, e.clientY);
      let dragPin: { dx: number; dy: number } | null = null;
      if (mode === 'pick' && !disabled && shown) {   // Pin „greifen“: Kopf oder Spitze
        const a = ptOf(shown);
        if (a) { const sx = a[0] * cur.k + cur.x, sy = a[1] * cur.k + cur.y; const hx = sx, hy = sy - 30 * S;
          if (Math.hypot(s.x - hx, s.y - hy) < 28 * S || Math.hypot(s.x - sx, s.y - sy) < 16 * S) dragPin = { dx: s.x - sx, dy: s.y - sy }; }
      }
      g.current = { moved: false, startDist: 0, startK: cur.k, startX: cur.x, startY: cur.y, mid: s, downAt: Date.now(), start: { x: e.clientX, y: e.clientY }, dragPin };
    } else if (pts.length === 2 && g.current) {
      g.current.moved = true; g.current.dragPin = null; setDrag(null);
      g.current.startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      g.current.startK = cur.k; g.current.startX = cur.x; g.current.startY = cur.y;
      g.current.mid = toSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const gs = g.current; if (!pointers.current.has(e.pointerId) || !gs) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()]; const cur = tRef.current;
    if (pts.length === 1) {
      if (Math.hypot(e.clientX - gs.start.x, e.clientY - gs.start.y) > 7) gs.moved = true;
      if (!gs.moved) return;
      if (gs.dragPin) { const s = toSvg(e.clientX, e.clientY); const ll = llAtSvg(s.x - gs.dragPin.dx, s.y - gs.dragPin.dy); if (ll) setDrag(ll); return; }
      const m = svgRef.current!.getScreenCTM()!;
      setT(clamp(cur.k, cur.x + (e.clientX - prev.x) / m.a, cur.y + (e.clientY - prev.y) / m.d));
    } else if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const k = clampN(gs.startK * (dist / (gs.startDist || dist)), 1, maxK); const f = k / gs.startK;
      const mid = toSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);   // Mitte darf mitwandern → Verschieben + Zoomen gleichzeitig
      setT(clamp(k, mid.x - (gs.mid.x - gs.startX) * f, mid.y - (gs.mid.y - gs.startY) * f));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const gs = g.current; pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0 && gs) {
      if (gs.dragPin && drag) { onPin?.(drag); setDrag(null); }
      else if (!gs.moved && Date.now() - gs.downAt < 600) {
        const s = toSvg(e.clientX, e.clientY); const now = Date.now(); const lt = lastTap.current;
        if (lt && now - lt.at < 320 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 28) { zoomAt(s, 2.4); lastTap.current = null; }   // Doppeltippen = hineinzoomen
        else {
          lastTap.current = { at: now, x: e.clientX, y: e.clientY };
          if (mode === 'pick' && !disabled) { const ll = llAtSvg(s.x, s.y); if (ll) onPin?.(ll); }
        }
      }
      g.current = null; setDrag(null);
    }
  };
  const wheelRef = useRef<(e: WheelEvent) => void>();
  wheelRef.current = (e: WheelEvent) => { e.preventDefault(); zoomAt(toSvg(e.clientX, e.clientY), e.deltaY < 0 ? 1.3 : 1 / 1.3); };
  useEffect(() => { const el = svgRef.current; if (!el) return; const f = (e: WheelEvent) => wheelRef.current?.(e); el.addEventListener('wheel', f, { passive: false }); return () => el.removeEventListener('wheel', f); }, []);

  // ---------------------------------------------------------------- Beschriftungen
  const kb = Math.round(Math.log2(t.k) * 8) / 8;            // Layout nur bei spürbarer Zoomänderung neu
  const pinPts = useMemo(() => {   // Freihalten rund um Tipps/Ziel samt deren Beschriftung (Rechtecke relativ zum Punkt, in SVG-Einheiten)
    if (!proj) return [] as { x: number; y: number; dx: number; dy: number; w: number; h: number }[];
    const arr: { x: number; y: number; dx: number; dy: number; w: number; h: number }[] = [];
    for (const p of pins) { const q = proj([p.ll.lon, p.ll.lat]); if (q) { arr.push({ x: q[0], y: q[1], dx: -24 * S, dy: -24 * S, w: 48 * S, h: 48 * S }); arr.push({ x: q[0], y: q[1], dx: -48 * S, dy: 22 * S, w: 96 * S, h: 28 * S }); } }
    if (answer) { const q = proj([answer.lon, answer.lat]); if (q) { arr.push({ x: q[0], y: q[1], dx: -30 * S, dy: -30 * S, w: 60 * S, h: 60 * S }); arr.push({ x: q[0], y: q[1], dx: -90 * S, dy: 28 * S, w: 180 * S, h: 34 * S }); } }
    return arr;
  }, [proj, pins, answer, S]);
  const placed = useMemo(() => geo ? layoutLabels(geo.labels, Math.pow(2, kb), SL, mode === 'show' ? pinPts : []) : [], [geo, kb, SL, mode, pinPts]);

  const k = t.k;
  const ans = answer ? ptOf(answer) : null;
  const me = shown ? ptOf(shown) : null;
  const detail = geo && kind !== 'world' && (kind === 'germany' || k >= 2.4);
  const sw = (px0: number) => px0 * S / k;       // Linienbreite in „Design-Pixel“

  return (
    <div className={`mapwrap ${className ?? ''}`}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="mapsvg" preserveAspectRatio="xMidYMid meet"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ touchAction: 'none' }}>
        <rect width={W} height={H} fill={C.sea} />
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`} strokeLinejoin="round" strokeLinecap="round">
          {geo && <>
            {geo.worldLand && <path d={geo.worldLand} fill={detail ? C.landFar : C.land} stroke={detail ? 'none' : C.coast} strokeWidth={sw(0.9)} />}
            {geo.worldBorders && !detail && <path d={geo.worldBorders} fill="none" stroke={C.border} strokeWidth={sw(0.8)} opacity={0.75} />}
            {detail && <>
              <path d={geo.detLand} fill={C.land} />
              {kind === 'germany' && <path d={geo.stateFill} fill={C.state} />}
              <path d={geo.lakes} fill={C.lake} stroke={C.lakeLine} strokeWidth={sw(0.7)} />
              {k >= 2.2 && <path d={geo.riversMinor} fill="none" stroke={C.river} strokeWidth={sw(0.9)} opacity={0.9} />}
              {k >= (kind === 'germany' ? 1.5 : 2.4) && <path d={geo.riversMid} fill="none" stroke={C.river} strokeWidth={sw(1.15)} />}
              <path d={geo.riversMain} fill="none" stroke={C.river} strokeWidth={sw(1.6)} />
              {(kind === 'germany' || k >= 3) && <path d={geo.stateBorders} fill="none" stroke={C.stateBorder} strokeWidth={sw(1)} strokeDasharray={`${sw(5)} ${sw(3)}`} />}
              <path d={geo.detBorders} fill="none" stroke={C.border} strokeWidth={sw(1.3)} />
              <path d={geo.detCoast} fill="none" stroke={C.coast} strokeWidth={sw(1.1)} />
            </>}
            {kind === 'world' && geo.riversMain && <path d={geo.riversMain} fill="none" stroke={C.river} strokeWidth={sw(0.8)} opacity={0.9} />}
            <Labels placed={placed} k={k} S={SL} />
          </>}

          {/* Linien vom Ziel zu den Tipps */}
          {ans && pins.map(p => { const q = ptOf(p.ll); return q ? (
            <line key={'l' + p.id} x1={ans[0]} y1={ans[1]} x2={q[0]} y2={q[1]} stroke={p.color ?? '#e0551d'} strokeWidth={sw(2.4)} strokeDasharray={`${sw(7)} ${sw(5)}`} opacity={0.85}
              className="maplink" style={{ animationDelay: `${(p.delay ?? 0) + 0.2}s` }} />) : null; })}
          {pins.map(p => { const q = ptOf(p.ll); return q ? (
            <g key={p.id} transform={`translate(${q[0]},${q[1]}) scale(${S / k})`}>
              <g className="mappin" style={{ animationDelay: `${p.delay ?? 0}s` }}>
                <circle r={20} fill={p.color ?? '#8b5cf6'} stroke="#fff" strokeWidth={3} />
                {p.avatar ? <foreignObject x={-17} y={-17} width={34} height={34}><div style={{ width: 34, height: 34 }}><Avatar a={p.avatar} size={34} /></div></foreignObject> : null}
                {p.label ? <text y={40} textAnchor="middle" fontSize={16} fontWeight={800} fill="#fff" stroke="#1a1640" strokeWidth={4.5} paintOrder="stroke">{p.label}</text> : null}
              </g>
            </g>) : null; })}
          {ans && (
            <g transform={`translate(${ans[0]},${ans[1]}) scale(${S / k})`}>
              <g className="mapanswer">
                <circle r={30} fill="rgba(245,184,46,0.3)" className="pulse" />
                <path d="M0 -22 L6.5 -7 L22 -6 L10 4 L14 20 L0 11 L-14 20 L-10 4 L-22 -6 L-6.5 -7Z" fill="#f5b82e" stroke="#fff" strokeWidth={2.5} />
                {answer?.label ? <text y={46} textAnchor="middle" fontSize={20} fontWeight={800} fill="#fff" stroke="#6a3b00" strokeWidth={5.5} paintOrder="stroke">{answer.label}</text> : null}
              </g>
            </g>
          )}
          {me && (
            <g transform={`translate(${me[0]},${me[1]}) scale(${S / k})`} className={drag ? 'pindrag' : ''}>
              <circle r={drag ? 16 : 9} fill="none" stroke="#0d6e63" strokeWidth={1.5} opacity={0.7} />
              <circle r={2.2} fill="#0d6e63" />
              <g className="mypin">
                <path d="M0 0 C-10 -14 -15 -22 -15 -30 A15 15 0 1 1 15 -30 C15 -22 10 -14 0 0Z" fill="#14d9c0" stroke="#fff" strokeWidth={2.5} />
                <circle cy={-30} r={5.5} fill="#0a0820" />
              </g>
            </g>
          )}
        </g>
      </svg>
      {!geo && <div className="maploading">Karte lädt …</div>}
      {mode === 'pick' && (
        <div className="mapctl">
          <button type="button" aria-label="Vergrößern" onClick={() => zoomAt({ x: W / 2, y: H / 2 }, 1.8)}>+</button>
          <button type="button" aria-label="Verkleinern" onClick={() => zoomAt({ x: W / 2, y: H / 2 }, 1 / 1.8)}>−</button>
          {k > 1.05 && <button type="button" aria-label="Ganze Karte" className="small" onClick={() => setT({ k: 1, x: 0, y: 0 })}>⤢</button>}
        </div>
      )}
      <div className="mapattr">© Natural Earth · GeoNames</div>
    </div>
  );
}

const Labels = memo(function Labels({ placed, k, S }: { placed: { it: LabelItem; side: 1 | -1 }[]; k: number; S: number }) {
  return <g>{placed.map(({ it, side }) => {
    const common = { fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif' } as const;
    const halo = { stroke: C.halo, strokeWidth: 3.2, paintOrder: 'stroke', strokeLinejoin: 'round' } as const;
    const tf = `translate(${it.x},${it.y}) scale(${S / k})`;
    switch (it.kind) {
      case 'city': case 'peak': {
        const peak = it.kind === 'peak';
        return <g key={it.id} transform={tf} {...common} pointerEvents="none">
          {peak ? <path d="M-4 3 L0 -4 L4 3Z" fill={C.peak_t} stroke="#fff" strokeWidth={0.8} /> : <circle r={it.dot ?? 3} fill={it.bold ? '#3a3a46' : '#555566'} stroke="#fff" strokeWidth={1.2} />}
          <text x={side * 6} y={4} textAnchor={side === 1 ? 'start' : 'end'} fontSize={it.fs} fontWeight={it.bold ? 700 : 500} fill={peak ? C.peak_t : C.text} {...halo}>{it.text}</text>
        </g>;
      }
      case 'sea': return <g key={it.id} transform={tf} {...common} pointerEvents="none"><text textAnchor="middle" fontSize={it.fs} fontStyle="italic" letterSpacing={2} fill={C.sea_t} opacity={0.9}>{it.text}</text></g>;
      case 'country': return <g key={it.id} transform={tf} {...common} pointerEvents="none"><text textAnchor="middle" fontSize={it.fs} fontWeight={700} letterSpacing={1.5} fill={C.country_t} {...halo}>{it.text.toUpperCase()}</text></g>;
      case 'state': return <g key={it.id} transform={tf} {...common} pointerEvents="none"><text textAnchor="middle" fontSize={it.fs} fontWeight={600} letterSpacing={1} fill={C.state_t} {...halo}>{it.text.toUpperCase()}</text></g>;
      case 'river': return <g key={it.id} transform={`${tf} rotate(${it.angle ?? 0})`} {...common} pointerEvents="none"><text textAnchor="middle" y={-3} fontSize={it.fs} fontStyle="italic" fill={C.river_t} stroke={C.halo} strokeWidth={2.6} paintOrder="stroke">{it.text}</text></g>;
      case 'lake': return <g key={it.id} transform={tf} {...common} pointerEvents="none"><text textAnchor="middle" fontSize={it.fs} fontStyle="italic" fill={C.river_t} stroke={C.halo} strokeWidth={2.6} paintOrder="stroke">{it.text}</text></g>;
      case 'island': return <g key={it.id} transform={tf} {...common} pointerEvents="none"><text textAnchor="middle" fontSize={it.fs} fontStyle="italic" fontWeight={600} fill={C.text} {...halo}>{it.text}</text></g>;
      case 'region': return <g key={it.id} transform={tf} {...common} pointerEvents="none"><text textAnchor="middle" fontSize={it.fs} fontStyle="italic" letterSpacing={1.2} fill={C.region_t} {...halo}>{it.text}</text></g>;
    }
  })}</g>;
});

// ---------------------------------------------------------------- Auswahl: Vektorkarte (MapLibre) oder SVG-Notkarte
export interface TileStatus { available: boolean; minzoom: number; maxzoom: number; source: string }
let statusP: Promise<TileStatus | null> | null = null;
function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
export function useTileStatus() {
  const [st, setSt] = useState<TileStatus | null | undefined>(undefined);
  useEffect(() => {
    statusP ??= fetch('/api/maptiles/status').then(r => (r.ok ? r.json() : null)).catch(() => null);
    statusP.then(s => setSt(s && s.available && webglOk() ? s : null));
  }, []);
  return st;
}
const MapGL = lazy(() => import('./MapGL'));
const ASPECT: Record<MapKind, string> = { germany: '4 / 4.3', europe: '10 / 9', world: '2 / 1.1' };

export function MapView(props: Props) {
  const st = useTileStatus();
  const [failed, setFailed] = useState(false);
  const holder = (txt: string) => <div className={`mapwrap gl ${props.className ?? ''}`} style={{ aspectRatio: ASPECT[props.kind] }}><div className="maploading">{txt}</div></div>;
  if (st === undefined) return holder('Karte lädt …');
  if (!st || failed) return <MapViewSvg {...props} />;
  return <Suspense fallback={holder('Karte lädt …')}><MapGL {...props} maxzoom={st.maxzoom} aspect={ASPECT[props.kind]} onFail={() => setFailed(true)} /></Suspense>;
}
