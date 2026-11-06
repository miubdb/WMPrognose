import type { GlitchZone } from '../../../shared/types';
import { variantItems, type Item, type Scene } from '../../../shared/scenes';
import { Avatar } from './Avatar';
import type { Avatar as AvatarT } from '../../../shared/types';

export interface Tap { x: number; y: number; avatar?: AvatarT; id?: string; hit?: boolean }

export interface SceneData { id: string; title: string; bg: string; items: Item[] }
/** Szene für Vorschau/Admin: komplette Definition (mit Änderungen) -> Anzeige-Daten einer Variante. */
export const sceneVariant = (s: Scene, v: 'a' | 'b'): SceneData => ({ id: s.id, title: s.title, bg: s.bg, items: variantItems(s, v) });

export function SceneView({ scene, onTap, marker, zones, taps, className, disabled }: {
  scene: SceneData | null; onTap?: (x: number, y: number) => void; marker?: { x: number; y: number } | null;
  zones?: GlitchZone[]; taps?: Tap[]; className?: string; disabled?: boolean;
}) {
  const s = scene;
  if (!s) return <div className="muted">Szene fehlt</div>;
  const items = s.items;
  const handle = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onTap || disabled) return;
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    // viewBox 1000x600 mit "meet": tatsächliche Zeichenfläche bestimmen
    const scale = Math.min(r.width / 1000, r.height / 600);
    const ox = (r.width - 1000 * scale) / 2, oy = (r.height - 600 * scale) / 2;
    const x = (e.clientX - r.left - ox) / scale, y = (e.clientY - r.top - oy) / scale;
    if (x < 0 || x > 1000 || y < 0 || y > 600) return;
    onTap(Math.round(x), Math.round(y));
  };
  return (
    <svg viewBox="0 0 1000 600" className={`scene ${className ?? ''}`} preserveAspectRatio="xMidYMid meet" onPointerDown={handle} style={{ touchAction: 'manipulation' }}>
      <rect width="1000" height="600" fill={s.bg} />
      {items.map(it => <ItemEl key={it.id} it={it} />)}
      {zones?.map((z, i) => (
        <g key={'z' + i} className="zone">{z.hw !== undefined && z.hh !== undefined ? <rect x={z.x - z.hw - 6} y={z.y - z.hh - 6} width={2 * z.hw + 12} height={2 * z.hh + 12} rx={14} fill="rgba(20,217,192,0.14)" stroke="#14d9c0" strokeWidth={4} strokeDasharray="12 7" /> : <circle cx={z.x} cy={z.y} r={z.r} fill="rgba(20,217,192,0.18)" stroke="#14d9c0" strokeWidth={5} strokeDasharray="14 8" />}</g>
      ))}
      {taps?.map((t, i) => (
        <g key={'t' + i} transform={`translate(${t.x},${t.y})`} className="mappin" style={{ animationDelay: `${i * 0.18}s` }}>
          <circle r={26} fill={t.hit ? '#22c55e' : '#ef4444'} stroke="#fff" strokeWidth={4} />
          {t.avatar && <foreignObject x={-21} y={-21} width={42} height={42}><div style={{ width: 42, height: 42 }}><Avatar a={t.avatar} size={42} /></div></foreignObject>}
        </g>
      ))}
      {marker && (
        <g transform={`translate(${marker.x},${marker.y})`} className="mypin">
          <circle r={30} fill="none" stroke="#14d9c0" strokeWidth={6} /><circle r={7} fill="#14d9c0" />
          <path d="M-46 0 H-34 M34 0 H46 M0 -46 V-34 M0 34 V46" stroke="#14d9c0" strokeWidth={6} strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

function ItemEl({ it }: { it: Item }) {
  switch (it.t) {
    case 'rect': return <rect x={it.x} y={it.y} width={it.w} height={it.h} rx={it.rx} fill={it.fill} stroke={it.stroke} strokeWidth={it.stroke ? 3 : 0} />;
    case 'circle': return <circle cx={it.x} cy={it.y} r={it.r} fill={it.fill} stroke={it.stroke} strokeWidth={it.stroke ? 3 : 0} />;
    case 'line': return <line x1={it.x} y1={it.y} x2={it.x2} y2={it.y2} stroke={it.stroke} strokeWidth={it.sw ?? 3} />;
    case 'text': return <text x={it.x} y={it.y} fontSize={it.size} fill={it.fill} textAnchor={it.anchor ?? 'start'} fontWeight={it.weight ?? 400}
      fontFamily={it.mono ? 'ui-monospace, Menlo, Consolas, monospace' : 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'}>{it.text}</text>;
  }
}
