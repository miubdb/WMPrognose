'use client';
import { diffDays, formatDe } from '@/domain/dates';

export interface Series { name: string; color: string; points: { x: string; y: number }[]; dashed?: boolean; dots?: boolean }

/** Schlankes SVG-Liniendiagramm über Datumsachse. */
export function LineChart({ series, height = 180, hlines = [], unit = '', ariaLabel }: { series: Series[]; height?: number; hlines?: { y: number; label: string; color?: string }[]; unit?: string; ariaLabel: string }) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return <p className="p-4 text-center text-sm text-slate-500">Noch keine Daten für dieses Diagramm.</p>;
  const xs = all.map((p) => p.x).sort();
  const x0 = xs[0], x1 = xs[xs.length - 1];
  const span = Math.max(1, diffDays(x1, x0));
  const ys = [...all.map((p) => p.y), ...hlines.map((h) => h.y)];
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
  const W = 340, H = height, L = 36, R = 8, T = 8, B = 22;
  const X = (d: string) => L + ((W - L - R) * diffDays(d, x0)) / span;
  const Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="#e2e8f0" />
            <text x={L - 4} y={Y(t) + 3} fontSize="9" textAnchor="end" fill="#64748b">{Math.round(t * 10) / 10}</text>
          </g>
        ))}
        {hlines.map((h) => (
          <g key={h.label}>
            <line x1={L} x2={W - R} y1={Y(h.y)} y2={Y(h.y)} stroke={h.color ?? '#f59e0b'} strokeDasharray="4 3" />
            <text x={W - R} y={Y(h.y) - 3} fontSize="9" textAnchor="end" fill={h.color ?? '#b45309'}>{h.label}</text>
          </g>
        ))}
        <text x={L} y={H - 6} fontSize="9" fill="#64748b">{formatDe(x0).slice(0, 5)}</text>
        <text x={W - R} y={H - 6} fontSize="9" textAnchor="end" fill="#64748b">{formatDe(x1).slice(0, 5)}</text>
        {series.map((s) => (
          <g key={s.name}>
            <polyline fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '4 3' : undefined} points={s.points.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} />
            {(s.dots ?? s.points.length < 40) && s.points.map((p) => <circle key={p.x} cx={X(p.x)} cy={Y(p.y)} r="2.5" fill={s.color} />)}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {series.map((s) => <span key={s.name} className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded" style={{ background: s.color }} />{s.name}{unit && ` (${unit})`}</span>)}
      </div>
    </div>
  );
}
