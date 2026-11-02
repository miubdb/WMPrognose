import { localDateOf } from '../domain/dates';
import { elevationGain, npFromSamples, round, type Sample } from './common';
import type { ParsedActivity, WorkoutType } from './types';

const first = (s: string, re: RegExp) => re.exec(s)?.[1];
const numOf = (s: string | undefined) => (s != null && s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : null);

/** TCX (Garmin Training Center XML) – tolerant per Regex, da im Browser und in Node identisch nutzbar. */
export function parseTcx(xml: string): ParsedActivity {
  if (!/<TrainingCenterDatabase[\s>]/.test(xml) || !/<Activity[\s>]/.test(xml)) throw new Error('Die Datei ist keine gültige TCX-Aktivität.');
  const sport = first(xml, /<Activity\s+[^>]*Sport="([^"]+)"/) ?? '';
  const laps = [...xml.matchAll(/<Lap\s+StartTime="([^"]+)"[^>]*>([\s\S]*?)<\/Lap>/g)];
  if (!laps.length) throw new Error('Die TCX-Datei enthält keine Runden (Laps).');
  const start = new Date(laps[0][1]);
  if (Number.isNaN(start.getTime())) throw new Error('Ungültiger Startzeitpunkt in der TCX-Datei.');
  let totalSec = 0, dist = 0, kcal = 0;
  let maxHr: number | null = null;
  for (const [, , body] of laps) {
    totalSec += numOf(first(body, /<TotalTimeSeconds>([^<]+)</)) ?? 0;
    dist += numOf(first(body, /<DistanceMeters>([^<]+)</)) ?? 0;
    kcal += numOf(first(body, /<Calories>([^<]+)</)) ?? 0;
    const m = numOf(first(body, /<MaximumHeartRateBpm[^>]*>\s*<Value>([^<]+)</));
    if (m != null) maxHr = Math.max(maxHr ?? 0, m);
  }
  const samples: Sample[] = [];
  const alts: number[] = [];
  const hrs: number[] = [];
  for (const m of xml.matchAll(/<Trackpoint>([\s\S]*?)<\/Trackpoint>/g)) {
    const b = m[1];
    const time = first(b, /<Time>([^<]+)</);
    if (!time) continue;
    const t = new Date(time).getTime() / 1000;
    const w = numOf(first(b, /<(?:\w+:)?Watts>([^<]+)</));
    const hr = numOf(first(b, /<HeartRateBpm[^>]*>\s*<Value>([^<]+)</));
    const alt = numOf(first(b, /<AltitudeMeters>([^<]+)</));
    samples.push({ t, w, hr, alt });
    if (alt != null) alts.push(alt);
    if (hr != null) hrs.push(hr);
  }
  if (!(totalSec > 0)) {
    if (samples.length > 1) totalSec = samples[samples.length - 1].t - samples[0].t;
    if (!(totalSec > 0)) throw new Error('Die Dauer der Aktivität konnte nicht bestimmt werden.');
  }
  const { np, avg } = npFromSamples(samples);
  const lapAvgHr = laps.map((l) => numOf(first(l[2], /<AverageHeartRateBpm[^>]*>\s*<Value>([^<]+)</))).filter((x): x is number => x != null);
  const type: WorkoutType = /bik/i.test(sport) ? 'rad' : /run/i.test(sport) ? 'lauf' : 'sonstiges';
  return {
    source: 'tcx', startTime: start.toISOString(), date: localDateOf(start),
    durationMin: round(totalSec / 60, 1),
    distanceKm: dist > 0 ? round(dist / 1000, 2) : null,
    avgPowerW: avg, normalizedPowerW: np,
    avgHr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : lapAvgHr.length ? Math.round(lapAvgHr.reduce((a, b) => a + b, 0) / lapAvgHr.length) : null,
    maxHr: maxHr ?? (hrs.length ? Math.max(...hrs) : null),
    elevationM: elevationGain(alts),
    kcal: kcal > 0 ? kcal : null,
    type, title: type === 'rad' ? 'Radfahren (TCX-Import)' : type === 'lauf' ? 'Laufen (TCX-Import)' : 'Aktivität (TCX-Import)',
    externalId: `tcx:${start.toISOString()}:${Math.round(totalSec)}`,
  };
}
