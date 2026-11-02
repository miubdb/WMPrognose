// Apple Health: export.xml (aus dem entpackten Export-ZIP der Health-App). Streaming-fähig für sehr große Dateien.
import { localDateOf } from '../domain/dates';
import { round } from './common';
import type { ParsedActivity, WorkoutType } from './types';

export interface HealthWeight { date: string; weight_kg: number; body_fat_pct: number | null }
export interface HealthRestingHr { date: string; resting_hr: number }
export interface HealthResult { weights: HealthWeight[]; restingHr: HealthRestingHr[]; workouts: ParsedActivity[] }

function attrs(tag: string): Record<string, string> {
  const o: Record<string, string> = {};
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) o[m[1]] = m[2];
  return o;
}
/** "2026-11-02 07:12:00 +0100" → ISO */
function appleTime(s: string): Date {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(s);
  return new Date(m ? `${m[1]}T${m[2]}${m[3]}:${m[4]}` : s);
}
const WORKOUT_TYPES: Record<string, WorkoutType> = {
  HKWorkoutActivityTypeCycling: 'rad', HKWorkoutActivityTypeRunning: 'lauf', HKWorkoutActivityTypeSoccer: 'fussball',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'kraft', HKWorkoutActivityTypeFunctionalStrengthTraining: 'kraft',
  HKWorkoutActivityTypeYoga: 'mobilitaet', HKWorkoutActivityTypeFlexibility: 'mobilitaet',
};

export class AppleHealthParser {
  private buf = '';
  private weightByDay = new Map<string, { t: number; kg: number }>();
  private fatByDay = new Map<string, { t: number; pct: number }>();
  private hrByDay = new Map<string, { t: number; v: number }>();
  private workouts: ParsedActivity[] = [];

  /** Chunk verarbeiten (beliebige Chunk-Grenzen erlaubt) */
  push(chunk: string): void {
    this.buf += chunk;
    const re = /<(Record|Workout)\b([^>]*?)(\/?)>/g;
    let lastEnd = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.buf))) {
      lastEnd = re.lastIndex;
      const a = attrs(m[2]);
      if (m[1] === 'Record') this.record(a);
      else this.workout(a);
    }
    // Rest ab dem letzten unvollständigen '<' behalten
    const tail = this.buf.slice(lastEnd);
    const lt = tail.lastIndexOf('<');
    this.buf = lt >= 0 ? tail.slice(lt) : '';
    if (this.buf.length > 100_000) this.buf = '';
  }

  private record(a: Record<string, string>) {
    const t = appleTime(a.startDate ?? '');
    if (Number.isNaN(t.getTime())) return;
    const date = localDateOf(t);
    const v = Number(a.value);
    if (!Number.isFinite(v)) return;
    switch (a.type) {
      case 'HKQuantityTypeIdentifierBodyMass': {
        const kg = a.unit === 'lb' ? v * 0.45359237 : a.unit === 'g' ? v / 1000 : v;
        const cur = this.weightByDay.get(date);
        if (!cur || t.getTime() >= cur.t) this.weightByDay.set(date, { t: t.getTime(), kg: round(kg, 2) });
        break;
      }
      case 'HKQuantityTypeIdentifierBodyFatPercentage': {
        const pct = v <= 1 ? v * 100 : v;
        const cur = this.fatByDay.get(date);
        if (!cur || t.getTime() >= cur.t) this.fatByDay.set(date, { t: t.getTime(), pct: round(pct, 1) });
        break;
      }
      case 'HKQuantityTypeIdentifierRestingHeartRate': {
        const cur = this.hrByDay.get(date);
        if (!cur || t.getTime() >= cur.t) this.hrByDay.set(date, { t: t.getTime(), v: Math.round(v) });
        break;
      }
    }
  }

  private workout(a: Record<string, string>) {
    const type = WORKOUT_TYPES[a.workoutActivityType];
    const start = appleTime(a.startDate ?? '');
    if (Number.isNaN(start.getTime())) return;
    let min = Number(a.duration);
    if (!Number.isFinite(min) || min <= 0) return;
    if (a.durationUnit === 'sec' || a.durationUnit === 's') min /= 60;
    else if (a.durationUnit === 'hr' || a.durationUnit === 'h') min *= 60;
    let km: number | null = null;
    if (a.totalDistance) {
      const d = Number(a.totalDistance);
      km = Number.isFinite(d) ? (a.totalDistanceUnit === 'mi' ? d * 1.609344 : a.totalDistanceUnit === 'm' ? d / 1000 : d) : null;
    }
    const kcal = a.totalEnergyBurned ? Number(a.totalEnergyBurned) : NaN;
    this.workouts.push({
      source: 'apple_health', startTime: start.toISOString(), date: localDateOf(start), durationMin: round(min, 1),
      distanceKm: km != null && km > 0 ? round(km, 2) : null, avgPowerW: null, normalizedPowerW: null, avgHr: null, maxHr: null, elevationM: null,
      kcal: Number.isFinite(kcal) && kcal > 0 ? Math.round(a.totalEnergyBurnedUnit === 'kJ' ? kcal / 4.184 : kcal) : null,
      type: type ?? 'sonstiges', title: `${a.workoutActivityType?.replace('HKWorkoutActivityType', '') ?? 'Workout'} (Apple Health)`,
      externalId: `apple:${start.toISOString()}:${Math.round(min * 60)}`,
    });
  }

  finish(): HealthResult {
    this.push('>'); // Puffer abschließen
    const weights = [...this.weightByDay.entries()].map(([date, w]) => ({ date, weight_kg: w.kg, body_fat_pct: this.fatByDay.get(date)?.pct ?? null })).sort((a, b) => a.date.localeCompare(b.date));
    const restingHr = [...this.hrByDay.entries()].map(([date, h]) => ({ date, resting_hr: h.v })).sort((a, b) => a.date.localeCompare(b.date));
    return { weights, restingHr, workouts: this.workouts };
  }
}

export function parseAppleHealth(xml: string): HealthResult {
  const p = new AppleHealthParser();
  p.push(xml);
  return p.finish();
}
