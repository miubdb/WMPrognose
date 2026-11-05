// Vollwertige Vektorkarte (MapLibre GL) auf OpenStreetMap-Basis. Kacheln kommen vom eigenen Server (offline: MBTiles-Datei).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as maplibregl from 'maplibre-gl';
import type { LngLatBoundsLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { layers, LIGHT } from '@protomaps/basemaps';
import type { MapKind } from '../../../shared/types';
import { Avatar } from './Avatar';
import type { LL, MapPin } from './MapView';

interface Props {
  kind: MapKind; mode: 'pick' | 'show'; pin?: LL | null; onPin?: (ll: LL) => void; pins?: MapPin[]; answer?: LL & { label?: string };
  fit?: boolean; disabled?: boolean; className?: string; uiScale?: number; maxzoom: number; aspect: string; onFail: () => void;
}
const BOUNDS: Record<MapKind, LngLatBoundsLike> = { germany: [[5.6, 47.0], [15.6, 55.3]], europe: [[-12, 34], [42, 71.5]], world: [[-170, -58], [180, 78]] };
const MAXB: Partial<Record<MapKind, LngLatBoundsLike>> = { germany: [[2.5, 44.5], [18.7, 57.8]], europe: [[-40, 25], [65, 78]] };

// OSM-nahe, gut lesbare Farben
const FLAVOR = { ...LIGHT, background: '#f2efe9', earth: '#f2efe9', water: '#aad3df', water_outline: '#aad3df', park_a: '#c8facc', park_b: '#c8facc', wood_a: '#add19e', wood_b: '#add19e', scrub_a: '#c8d7ab', scrub_b: '#c8d7ab', glacier: '#ffffff', residential: '#e0dfdf', industrial: '#ebdbe8', cemetery: '#aacbaf', boundaries: '#8f7aa8', city_label: '#1d1d24', subplace_label: '#4a4a55', state_label: '#7a6f6a', country_label: '#6a6575' } as typeof LIGHT;

function pinSvg() {
  return '<svg width="34" height="46" viewBox="-17 -40 34 46"><path d="M0 0 C-10 -14 -15 -22 -15 -30 A15 15 0 1 1 15 -30 C15 -22 10 -14 0 0Z" fill="#14d9c0" stroke="#fff" stroke-width="2.5"/><circle cy="-30" r="5.5" fill="#0a0820"/></svg>';
}

export default function MapGL({ kind, mode, pin, onPin, pins = [], answer, fit, disabled, className, uiScale = 1, maxzoom, aspect, onFail }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const myPin = useRef<maplibregl.Marker | null>(null);
  const cb = useRef({ onPin, disabled, mode }); cb.current = { onPin, disabled, mode };
  const [pinEls, setPinEls] = useState<{ id: string; el: HTMLElement; pin?: MapPin; answer?: boolean }[]>([]);

  useEffect(() => {
    if (!box.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: box.current,
        style: {
          version: 8,
          glyphs: `${location.origin}/mapfonts/{fontstack}/{range}.pbf`,
          sources: { protomaps: { type: 'vector', tiles: [`${location.origin}/api/maptiles/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: maxzoom, attribution: '© OpenStreetMap-Mitwirkende' } },
          layers: layers('protomaps', FLAVOR, { lang: 'de' }) as any,
        },
        bounds: BOUNDS[kind], fitBoundsOptions: { padding: 6 }, maxBounds: MAXB[kind], maxZoom: 17.5,
        attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, renderWorldCopies: false, fadeDuration: 150, cooperativeGestures: false,
      });
    } catch { onFail(); return; }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation(); map.keyboard.disableRotation?.();
    let failures = 0;
    map.on('error', e => { if (!map.isStyleLoaded() && ++failures > 3) onFail(); void e; });
    map.on('load', () => {
      map.setMinZoom(Math.max(0, map.getZoom() - 0.4));
      map.addSource('links', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'links', type: 'line', source: 'links', paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 1.5], 'line-opacity': 0.9 } });
      setReady(true);
    });
    map.on('click', e => {
      const c = cb.current; if (c.mode !== 'pick' || c.disabled) return;
      if ((e.originalEvent.target as HTMLElement)?.closest?.('.maplibregl-marker')) return;
      c.onPin?.({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    });
    return () => { setReady(false); myPin.current?.remove(); myPin.current = null; map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, maxzoom]);

  // eigener (verschiebbarer) Pin
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    if (mode !== 'pick' || !pin) { myPin.current?.remove(); myPin.current = null; return; }
    if (!myPin.current) {
      const el = document.createElement('div'); el.className = 'glpin'; el.innerHTML = pinSvg();
      const m = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true }).setLngLat([pin.lon, pin.lat]).addTo(map);
      m.on('dragend', () => { const p = m.getLngLat(); cb.current.onPin?.({ lat: p.lat, lon: p.lng }); });
      myPin.current = m;
    } else myPin.current.setLngLat([pin.lon, pin.lat]);
    myPin.current.setDraggable(!disabled);
  }, [ready, pin?.lat, pin?.lon, mode, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tipps + Ziel (Fernseher/Auflösung)
  const sig = JSON.stringify([pins.map(p => [p.id, p.ll.lat, p.ll.lon, p.color]), answer && [answer.lat, answer.lon, answer.label]]);
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    const made: maplibregl.Marker[] = []; const els: { id: string; el: HTMLElement; pin?: MapPin; answer?: boolean }[] = [];
    for (const p of pins) { const el = document.createElement('div'); el.className = 'glpinwrap'; made.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([p.ll.lon, p.ll.lat]).addTo(map)); els.push({ id: p.id, el, pin: p }); }
    if (answer) { const el = document.createElement('div'); el.className = 'glpinwrap'; made.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([answer.lon, answer.lat]).addTo(map)); els.push({ id: 'answer', el, answer: true }); }
    setPinEls(els);
    const src = map.getSource('links') as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features: answer ? pins.map(p => ({ type: 'Feature', properties: { color: p.color ?? '#e0551d' }, geometry: { type: 'LineString', coordinates: [[answer.lon, answer.lat], [p.ll.lon, p.ll.lat]] } })) : [] } as any);
    if (fit && (pins.length || answer)) {
      const b = new maplibregl.LngLatBounds(); pins.forEach(p => b.extend([p.ll.lon, p.ll.lat])); if (answer) b.extend([answer.lon, answer.lat]);
      map.fitBounds(b, { padding: Math.round(70 * uiScale), maxZoom: 10.5, duration: 700 });
    }
    return () => { made.forEach(m => m.remove()); setPinEls([]); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sig, fit]);

  const reset = () => mapRef.current?.fitBounds(BOUNDS[kind], { padding: 6, duration: 400 });
  return (
    <div className={`mapwrap gl ${className ?? ''}`} style={{ aspectRatio: aspect, ['--ui' as any]: uiScale }}>
      <div ref={box} className="glcanvas" />
      {mode === 'pick' && <div className="mapctl">
        <button type="button" aria-label="Vergrößern" onClick={() => mapRef.current?.zoomIn()}>+</button>
        <button type="button" aria-label="Verkleinern" onClick={() => mapRef.current?.zoomOut()}>−</button>
        <button type="button" aria-label="Ganze Karte" className="small" onClick={reset}>⤢</button>
      </div>}
      <div className="mapattr">© OpenStreetMap-Mitwirkende</div>
      {pinEls.map(({ id, el, pin: p, answer: isAns }) => createPortal(isAns
        ? <div className="glans"><div className="glans-pulse" /><svg viewBox="-24 -24 48 48" width="44" height="44"><path d="M0 -22 L6.5 -7 L22 -6 L10 4 L14 20 L0 11 L-14 20 L-10 4 L-22 -6 L-6.5 -7Z" fill="#f5b82e" stroke="#fff" strokeWidth="2.5" /></svg>{answer?.label && <span className="gllabel ans">{answer.label}</span>}</div>
        : <div className="glav" style={{ animationDelay: `${p?.delay ?? 0}s`, ['--pc' as any]: p?.color ?? '#8b5cf6' }}>{p?.avatar ? <Avatar a={p.avatar} size={34} /> : null}{p?.label && <span className="gllabel">{p.label}</span>}</div>, el, id))}
    </div>
  );
}
