// Sortierbare Liste per Ziehen (Maus & Touch über Pointer-Events, nur am Ziehgriff – Scrollen bleibt unberührt)
// plus Tastatur-Alternative: Griff fokussieren, Leertaste greift, Pfeiltasten verschieben, Leertaste/Enter legt ab, Esc bricht ab.
import { useEffect, useRef, useState } from 'react';

export interface SortRenderState { dragging: boolean; dropBefore: boolean; dropAfter: boolean; index: number; grabbed: boolean }

export function Sortable<T>({ items, keyOf, onMove, render, locked, label = 'Eintrag', className }: {
  items: T[]; keyOf: (t: T) => string; onMove: (from: number, to: number) => void;
  render: (item: T, handle: React.ReactNode, st: SortRenderState) => React.ReactNode;
  /** Einträge, die nicht verschoben werden dürfen und ihre Position behalten (z. B. das Finale am Ende) */
  locked?: (t: T, i: number) => boolean; label?: string; className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ from: number; dy: number; to: number } | null>(null);
  const [grab, setGrab] = useState<number | null>(null); const [live, setLive] = useState('');
  const start = useRef(0); const raf = useRef(0); const lastY = useRef(0);
  const firstLocked = () => { const i = items.findIndex((t, k) => locked?.(t, k)); return i < 0 ? items.length : i; };
  const clampTo = (to: number) => Math.max(0, Math.min(to, firstLocked() - 1));

  const target = (y: number, from: number) => {
    const els = Array.from(box.current?.querySelectorAll<HTMLElement>(':scope > [data-sortitem]') ?? []);
    let to = 0; els.forEach((el, i) => { if (i === from) return; const r = el.getBoundingClientRect(); if (y > r.top + r.height / 2) to = i < from ? i + 1 : i; });
    return clampTo(to);
  };
  const onDown = (e: React.PointerEvent, i: number) => {
    if (e.button !== undefined && e.button > 0) return; if (locked?.(items[i], i)) return;
    e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); start.current = e.clientY; lastY.current = e.clientY; setDrag({ from: i, dy: 0, to: i });
    const tick = () => { const y = lastY.current; if (y < 70) window.scrollBy(0, -14); else if (y > window.innerHeight - 70) window.scrollBy(0, 14); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
  };
  const onMoveP = (e: React.PointerEvent) => { if (!drag) return; lastY.current = e.clientY; setDrag({ from: drag.from, dy: e.clientY - start.current, to: target(e.clientY, drag.from) }); };
  const finish = (commit: boolean) => { cancelAnimationFrame(raf.current); if (drag && commit && drag.to !== drag.from) onMove(drag.from, drag.to); setDrag(null); };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (locked?.(items[i], i)) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (grab === i) { setGrab(null); setLive(`${label} abgelegt, Position ${i + 1} von ${items.length}`); } else { setGrab(i); setLive(`${label} ${i + 1} gegriffen. Mit Pfeil nach oben oder unten verschieben, Leertaste zum Ablegen.`); } return; }
    if (e.key === 'Escape' && grab !== null) { setGrab(null); setLive('Verschieben abgebrochen'); return; }
    if ((grab === i || e.altKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault(); const to = clampTo(i + (e.key === 'ArrowUp' ? -1 : 1)); if (to === i) return;
      onMove(i, to); setGrab(grab === null ? null : to); setLive(`${label} verschoben, Position ${to + 1} von ${items.length}`);
      requestAnimationFrame(() => box.current?.querySelectorAll<HTMLElement>('[data-handle]')[to]?.focus());
    }
  };
  // Einfügeposition: Linie vor dem Eintrag, der nach dem Ablegen hinter dem gezogenen stünde
  const dropIdx = (i: number) => { if (!drag || drag.to === drag.from) return null; const to = drag.to; return { before: i === to && to < drag.from, after: i === to && to > drag.from }; };
  return (
    <div className={`sortable ${className ?? ''}`} ref={box} role="list">
      <div className="srsr" aria-live="polite">{live}</div>
      {items.map((t, i) => {
        const isLocked = !!locked?.(t, i); const d = dropIdx(i); const dragging = drag?.from === i;
        const handle = isLocked ? <span className="draghandle off" aria-hidden title="Bleibt am Ende">🔒</span> : (
          <button type="button" data-handle className={`draghandle ${grab === i ? 'grab' : ''}`} aria-label={`${label} ${i + 1} verschieben – Leertaste greift, Pfeiltasten verschieben`} title="Zum Verschieben ziehen"
            onPointerDown={e => onDown(e, i)} onPointerMove={onMoveP} onPointerUp={() => finish(true)} onPointerCancel={() => finish(false)} onKeyDown={e => onKey(e, i)}>⠿</button>);
        return (
          <div key={keyOf(t)} data-sortitem role="listitem" className={`sortitem ${dragging ? 'dragging' : ''} ${d?.before ? 'drop-before' : ''} ${d?.after ? 'drop-after' : ''} ${grab === i ? 'grabbed' : ''}`} style={dragging ? { transform: `translateY(${drag!.dy}px)` } : undefined}>
            {render(t, handle, { dragging, dropBefore: !!d?.before, dropAfter: !!d?.after, index: i, grabbed: grab === i })}
          </div>);
      })}
    </div>
  );
}
