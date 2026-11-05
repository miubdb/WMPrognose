import { useEffect, useMemo, useRef, useState } from 'react';
import { geoPath, geoNaturalEarth1, geoConicConformal, geoMercator, type GeoProjection } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { MapKind, Avatar as AvatarT } from '../../../shared/types';
import { Avatar } from './Avatar';

export interface LL { lat: number; lon: number }
const W = 1000;
const HEIGHTS: Record<MapKind, number> = { world: 540, europe: 700, germany: 800 };

const BOUNDS: Record<MapKind, [number, number][]> = {
  world: [[-180, -58], [180, 84]],
  europe: [[-24, 33], [46, 72]],
  germany: [[5.4, 47], [15.8, 55.4]],
};
const CITIES: Record<MapKind, { n: string; lat: number; lon: number }[]> = {
  world: [],
  europe: [
    { n: 'London', lat: 51.51, lon: -0.13 }, { n: 'Paris', lat: 48.86, lon: 2.35 }, { n: 'Madrid', lat: 40.42, lon: -3.7 }, { n: 'Rom', lat: 41.9, lon: 12.5 },
    { n: 'Berlin', lat: 52.52, lon: 13.4 }, { n: 'Wien', lat: 48.21, lon: 16.37 }, { n: 'Warschau', lat: 52.23, lon: 21.01 }, { n: 'Stockholm', lat: 59.33, lon: 18.07 },
    { n: 'Athen', lat: 37.98, lon: 23.73 }, { n: 'Istanbul', lat: 41.01, lon: 28.98 }, { n: 'Moskau', lat: 55.75, lon: 37.62 }, { n: 'Reykjavik', lat: 64.15, lon: -21.94 },
  ],
  germany: [
    { n: 'Hamburg', lat: 53.55, lon: 9.99 }, { n: 'Berlin', lat: 52.52, lon: 13.4 }, { n: 'Köln', lat: 50.94, lon: 6.96 }, { n: 'Frankfurt', lat: 50.11, lon: 8.68 },
    { n: 'München', lat: 48.14, lon: 11.58 }, { n: 'Stuttgart', lat: 48.78, lon: 9.18 }, { n: 'Dresden', lat: 51.05, lon: 13.74 }, { n: 'Hannover', lat: 52.37, lon: 9.73 },
    { n: 'Leipzig', lat: 51.34, lon: 12.37 }, { n: 'Nürnberg', lat: 49.45, lon: 11.08 }, { n: 'Rostock', lat: 54.09, lon: 12.14 }, { n: 'Freiburg', lat: 47.99, lon: 7.85 },
  ],
};

function makeProjection(kind: MapKind): GeoProjection {
  const [[x0, y0], [x1, y1]] = BOUNDS[kind];
  const H = HEIGHTS[kind];
  const poly: any = { type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [(x0 + x1) / 2, y1], [(x0 + x1) / 2, y0], [x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2]] } };
  const proj = kind === 'world' ? geoNaturalEarth1() : kind === 'europe' ? geoConicConformal().rotate([-12, 0]).parallels([40, 62]) : geoMercator();
  return proj.fitExtent([[10, 10], [W - 10, H - 10]], poly);
}

interface WorldData { land: any; borders: string; }
const worldCache = new Map<string, Promise<any>>();
function loadTopo() {
  if (!worldCache.has('t')) worldCache.set('t', import('world-atlas/countries-50m.json').then(m => (m as any).default ?? m));
  return worldCache.get('t')!;
}
const pathCache = new Map<MapKind, { land: string; borders: string }>();

export function useMapGeometry(kind: MapKind) {
  const [data, setData] = useState<{ land: string; borders: string } | null>(pathCache.get(kind) ?? null);
  const projection = useMemo(() => makeProjection(kind), [kind]);
  useEffect(() => {
    let dead = false;
    if (pathCache.has(kind)) { setData(pathCache.get(kind)!); return; }
    loadTopo().then((topo: any) => {
      const path = geoPath(projection);
      const land = path(feature(topo, topo.objects.land) as any) ?? '';
      const borders = path(mesh(topo, topo.objects.countries, (a: any, b: any) => a !== b) as any) ?? '';
      pathCache.set(kind, { land, borders });
      if (!dead) setData({ land, borders });
    });
    return () => { dead = true; };
  }, [kind, projection]);
  return { projection, data, H: HEIGHTS[kind] };
}

export interface MapPin { id: string; ll: LL; avatar?: AvatarT; label?: string; color?: string; delay?: number }
interface Props {
  kind: MapKind;
  /** pick: Antippen setzt Pin. show: nur Anzeige. */
  mode: 'pick' | 'show';
  pin?: LL | null;
  onPin?: (ll: LL) => void;
  pins?: MapPin[];
  answer?: LL & { label?: string };
  fit?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MapView({ kind, mode, pin, onPin, pins = [], answer, fit, disabled, className }: Props) {
  const { projection, data, H } = useMapGeometry(kind);
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const tRef = useRef(t); tRef.current = t;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; startDist: number; startK: number; startX: number; startY: number; mid: { x: number; y: number }; downAt: number } | null>(null);

  const toSvg = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
  };
  const clamp = (k: number, x: number, y: number) => {
    k = Math.max(1, Math.min(14, k));
    x = Math.min(0, Math.max(W - W * k, x));
    y = Math.min(0, Math.max(H - H * k, y));
    return { k, x, y };
  };
  const zoomAt = (p: { x: number; y: number }, factor: number) => {
    const cur = tRef.current;
    const k = Math.max(1, Math.min(14, cur.k * factor));
    const f = k / cur.k;
    setT(clamp(k, p.x - (p.x - cur.x) * f, p.y - (p.y - cur.y) * f));
  };

  // Auto-Ausschnitt für die Auflösung
  useEffect(() => {
    if (!fit) { return; }
    const pts: [number, number][] = [];
    for (const p of pins) { const q = projection([p.ll.lon, p.ll.lat]); if (q) pts.push(q as [number, number]); }
    if (answer) { const q = projection([answer.lon, answer.lat]); if (q) pts.push(q as [number, number]); }
    if (!pts.length) return;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const bw = Math.max(80, Math.max(...xs) - Math.min(...xs)), bh = Math.max(80, Math.max(...ys) - Math.min(...ys));
    const k = Math.max(1, Math.min(8, 0.72 * Math.min(W / bw, H / bh)));
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    setT(clamp(k, W / 2 - cx * k, H / 2 - cy * k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, pins.length, answer?.lat, answer?.lon, projection]);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const cur = tRef.current;
    if (pts.length === 1) gesture.current = { moved: false, startDist: 0, startK: cur.k, startX: cur.x, startY: cur.y, mid: toSvg(e.clientX, e.clientY), downAt: Date.now() };
    else if (pts.length === 2 && gesture.current) {
      gesture.current.moved = true;
      gesture.current.startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      gesture.current.startK = cur.k; gesture.current.startX = cur.x; gesture.current.startY = cur.y;
      gesture.current.mid = toSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    const r = svgRef.current!.getBoundingClientRect();
    if (pts.length === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      const total = Math.hypot(e.clientX - (g.mid.x / W) * r.width - r.left, e.clientY - (g.mid.y / H) * r.height - r.top);
      if (total > 8) g.moved = true;
      if (g.moved) { const cur = tRef.current; setT(clamp(cur.k, cur.x + (dx / r.width) * W, cur.y + (dy / r.height) * H)); }
    } else if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const k = Math.max(1, Math.min(14, g.startK * (dist / (g.startDist || dist))));
      const f = k / g.startK;
      setT(clamp(k, g.mid.x - (g.mid.x - g.startX) * f, g.mid.y - (g.mid.y - g.startY) * f));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0 && g) {
      if (!g.moved && mode === 'pick' && !disabled && Date.now() - g.downAt < 600) {
        const p = toSvg(e.clientX, e.clientY);
        const cur = tRef.current;
        const ll = projection.invert?.([(p.x - cur.x) / cur.k, (p.y - cur.y) / cur.k]);
        if (ll && Number.isFinite(ll[0]) && Number.isFinite(ll[1]) && Math.abs(ll[1]) <= 90) onPin?.({ lon: ll[0], lat: ll[1] });
      }
      gesture.current = null;
    }
  };
  const onWheel = (e: React.WheelEvent) => { zoomAt(toSvg(e.clientX, e.clientY), e.deltaY < 0 ? 1.25 : 0.8); };

  const pt = (ll: LL) => projection([ll.lon, ll.lat]) as [number, number] | null;
  const pinXY = pin ? pt(pin) : null;
  const ansXY = answer ? pt(answer) : null;
  const k = t.k;

  return (
    <div className={`mapwrap ${className ?? ''}`}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="mapsvg" preserveAspectRatio="xMidYMid meet"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} style={{ touchAction: 'none' }}>
        <defs>
          <radialGradient id="seaGrad" cx="50%" cy="40%" r="80%"><stop offset="0" stopColor="#1b2a6b" /><stop offset="1" stopColor="#0d1238" /></radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#seaGrad)" />
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {data && <>
            <path d={data.land} fill="#26396f" stroke="none" />
            <path d={data.borders} fill="none" stroke="#5f76c4" strokeWidth={0.6 / k} strokeLinejoin="round" />
            <path d={data.land} fill="none" stroke="#8aa0ee" strokeWidth={1 / k} />
          </>}
          {CITIES[kind].map(c => { const q = pt(c); return q ? (
            <g key={c.n} transform={`translate(${q[0]},${q[1]}) scale(${1 / k})`} opacity={0.85}>
              <circle r={3} fill="#cdd6ff" /><text x={6} y={4} fontSize={13} fill="#cdd6ff" stroke="#0d1238" strokeWidth={3} paintOrder="stroke" fontWeight={600}>{c.n}</text>
            </g>) : null; })}
          {/* Linien vom Ziel zu den Tipps */}
          {ansXY && pins.map(p => { const q = pt(p.ll); return q ? (
            <line key={'l' + p.id} x1={ansXY[0]} y1={ansXY[1]} x2={q[0]} y2={q[1]} stroke={p.color ?? '#f5b82e'} strokeWidth={2 / k} strokeDasharray={`${6 / k} ${5 / k}`} opacity={0.75}
              className="maplink" style={{ animationDelay: `${(p.delay ?? 0) + 0.2}s` }} />) : null; })}
          {pins.map(p => { const q = pt(p.ll); return q ? (
            <g key={p.id} transform={`translate(${q[0]},${q[1]}) scale(${1 / k})`}>
              <g className="mappin" style={{ animationDelay: `${p.delay ?? 0}s` }}>
                <circle r={20} fill={p.color ?? '#8b5cf6'} stroke="#fff" strokeWidth={3} />
                {p.avatar ? <foreignObject x={-17} y={-17} width={34} height={34}><div style={{ width: 34, height: 34 }}><Avatar a={p.avatar} size={34} /></div></foreignObject> : null}
                {p.label ? <text y={38} textAnchor="middle" fontSize={16} fontWeight={800} fill="#fff" stroke="#0d1238" strokeWidth={4} paintOrder="stroke">{p.label}</text> : null}
              </g>
            </g>) : null; })}
          {ansXY && (
            <g transform={`translate(${ansXY[0]},${ansXY[1]}) scale(${1 / k})`}>
              <g className="mapanswer">
                <circle r={30} fill="rgba(245,184,46,0.25)" className="pulse" />
                <path d="M0 -22 L6.5 -7 L22 -6 L10 4 L14 20 L0 11 L-14 20 L-10 4 L-22 -6 L-6.5 -7Z" fill="#f5b82e" stroke="#fff" strokeWidth={2.5} />
                {answer?.label ? <text y={44} textAnchor="middle" fontSize={20} fontWeight={800} fill="#ffe08a" stroke="#0d1238" strokeWidth={5} paintOrder="stroke">{answer.label}</text> : null}
              </g>
            </g>
          )}
          {pinXY && (
            <g transform={`translate(${pinXY[0]},${pinXY[1]}) scale(${1 / k})`}>
              <g className="mypin">
                <path d="M0 0 C-14 -18 -18 -26 -18 -34 A18 18 0 1 1 18 -34 C18 -26 14 -18 0 0Z" fill="#14d9c0" stroke="#fff" strokeWidth={3} />
                <circle cy={-34} r={6.5} fill="#0a0820" />
              </g>
            </g>
          )}
        </g>
      </svg>
      {mode === 'pick' && (
        <div className="mapctl">
          <button type="button" aria-label="Vergrößern" onClick={() => zoomAt({ x: W / 2, y: H / 2 }, 1.6)}>+</button>
          <button type="button" aria-label="Verkleinern" onClick={() => zoomAt({ x: W / 2, y: H / 2 }, 0.62)}>−</button>
        </div>
      )}
    </div>
  );
}
