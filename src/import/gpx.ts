import { localDateOf } from '../domain/dates';
import { elevationGain, haversineKm, npFromSamples, round, type Sample } from './common';
import type { ParsedActivity, WorkoutType } from './types';

const first = (s: string, re: RegExp) => re.exec(s)?.[1];
const numOf = (s: string | undefined) => (s != null && s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : null);

export function parseGpx(xml: string): ParsedActivity {
  if (!/<gpx[\s>]/.test(xml)) throw new Error('Die Datei ist keine gültige GPX-Datei.');
  const pts = [...xml.matchAll(/<trkpt\s+([^>]*)>([\s\S]*?)<\/trkpt>/g)];
  if (pts.length < 2) throw new Error('Die GPX-Datei enthält zu wenige Trackpunkte.');
  const samples: Sample[] = [];
  const alts: number[] = [];
  const hrs: number[] = [];
  let dist = 0;
  let prev: { lat: number; lon: number } | null = null;
  for (const [, attrs, body] of pts) {
    const lat = numOf(first(attrs, /lat="([^"]+)"/));
    const lon = numOf(first(attrs, /lon="([^"]+)"/));
    const time = first(body, /<time>([^<]+)</);
    if (lat == null || lon == null || !time) continue;
    if (prev) dist += haversineKm(prev.lat, prev.lon, lat, lon);
    prev = { lat, lon };
    const ele = numOf(first(body, /<ele>([^<]+)</));
    const hr = numOf(first(body, /<(?:\w+:)?hr>([^<]+)</));
    const w = numOf(first(body, /<(?:\w+:)?(?:power|PowerInWatts|watts)>([^<]+)</i));
    samples.push({ t: new Date(time).getTime() / 1000, w, hr, alt: ele });
    if (ele != null) alts.push(ele);
    if (hr != null) hrs.push(hr);
  }
  if (samples.length < 2) throw new Error('Die GPX-Datei enthält keine Zeitstempel.');
  const startT = samples[0].t, endT = samples[samples.length - 1].t;
  const durationSec = endT - startT;
  if (!(durationSec > 0)) throw new Error('Die Dauer der Aktivität konnte nicht bestimmt werden.');
  const typeText = (first(xml, /<type>([^<]+)</) ?? '').toLowerCase();
  const type: WorkoutType = /cycl|bik|ride/.test(typeText) ? 'rad' : /run|jog/.test(typeText) ? 'lauf' : 'sonstiges';
  const { np, avg } = npFromSamples(samples);
  const start = new Date(startT * 1000);
  return {
    source: 'gpx', startTime: start.toISOString(), date: localDateOf(start),
    durationMin: round(durationSec / 60, 1), distanceKm: dist > 0 ? round(dist, 2) : null,
    avgPowerW: avg, normalizedPowerW: np,
    avgHr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
    maxHr: hrs.length ? Math.max(...hrs) : null,
    elevationM: elevationGain(alts), kcal: null,
    type, title: type === 'rad' ? 'Radfahren (GPX-Import)' : type === 'lauf' ? 'Laufen (GPX-Import)' : 'Aktivität (GPX-Import)',
    externalId: `gpx:${start.toISOString()}:${Math.round(durationSec)}`,
  };
}
