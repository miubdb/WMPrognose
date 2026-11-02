// FIT-Import über das offizielle Garmin FIT JavaScript SDK (@garmin/fitsdk).
import { Decoder, Stream } from '@garmin/fitsdk';
import { localDateOf } from '../domain/dates';
import { npFromSamples, round, type Sample } from './common';
import type { ParsedActivity, WorkoutType } from './types';

type Msg = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function mapSport(sport: unknown, sub: unknown): WorkoutType {
  const s = String(sport ?? '');
  const sub_ = String(sub ?? '');
  if (s === 'cycling') return 'rad';
  if (s === 'running') return 'lauf';
  if (s === 'soccer') return 'fussball';
  if (sub_ === 'strengthTraining') return 'kraft';
  if (s === 'training' && sub_ === 'strengthTraining') return 'kraft';
  return 'sonstiges';
}

export function parseFit(bytes: Uint8Array): ParsedActivity {
  const stream = Stream.fromByteArray(Array.from(bytes));
  if (!Decoder.isFIT(stream)) throw new Error('Die Datei ist keine gültige FIT-Datei.');
  const decoder = new Decoder(stream);
  if (!decoder.checkIntegrity()) throw new Error('Die FIT-Datei ist beschädigt (Prüfsumme/Länge stimmt nicht).');
  const { messages, errors } = decoder.read();
  if (errors?.length) throw new Error(`FIT-Datei konnte nicht vollständig gelesen werden: ${String(errors[0])}`);
  const sessions = (messages.sessionMesgs ?? []) as Msg[];
  const records = (messages.recordMesgs ?? []) as Msg[];
  if (!sessions.length && !records.length) throw new Error('Die FIT-Datei enthält keine Aktivitätsdaten.');

  const s0 = sessions[0] ?? {};
  const start = (s0.startTime ?? records[0]?.timestamp) as Date | undefined;
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) throw new Error('Die FIT-Datei enthält keinen Startzeitpunkt.');

  const samples: Sample[] = records.map((r) => ({
    t: (r.timestamp as Date).getTime() / 1000,
    w: num(r.power), hr: num(r.heartRate), alt: num(r.enhancedAltitude) ?? num(r.altitude),
  }));
  const { np, avg } = npFromSamples(samples);

  const sumOf = (k: string) => sessions.reduce((a, s) => a + (num(s[k]) ?? 0), 0);
  const timer = sumOf('totalTimerTime') || sumOf('totalElapsedTime');
  let durationSec = timer;
  if (!durationSec && records.length > 1) durationSec = (samples[samples.length - 1].t - samples[0].t);
  if (!(durationSec > 0)) throw new Error('Die Dauer der Aktivität konnte nicht bestimmt werden.');

  const distM = sumOf('totalDistance') || (num(records[records.length - 1]?.distance) ?? 0);
  const hrs = samples.map((s) => s.hr).filter((x): x is number => x != null);
  const avgPower = num(s0.avgPower) ?? avg;
  const sport = s0.sport;
  const type = mapSport(sport, s0.subSport);
  const normalized = num(s0.normalizedPower) ?? np;
  const avgHr = num(s0.avgHeartRate) ?? (hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null);
  const maxHr = num(s0.maxHeartRate) ?? (hrs.length ? Math.max(...hrs) : null);

  return {
    source: 'fit',
    startTime: start.toISOString(),
    date: localDateOf(start),
    durationMin: round(durationSec / 60, 1),
    distanceKm: distM > 0 ? round(distM / 1000, 2) : null,
    avgPowerW: avgPower != null ? Math.round(avgPower) : null,
    normalizedPowerW: normalized != null ? Math.round(normalized) : null,
    avgHr, maxHr,
    elevationM: num(s0.totalAscent) != null ? Math.round(num(s0.totalAscent) as number) : null,
    kcal: sumOf('totalCalories') || null,
    type,
    title: type === 'rad' ? 'Radfahren (FIT-Import)' : type === 'lauf' ? 'Laufen (FIT-Import)' : 'Aktivität (FIT-Import)',
    externalId: `fit:${start.toISOString()}:${Math.round(durationSec)}`,
  };
}
