import { addDays, eachDay, type DateStr } from './dates';

/** Intensitätsfaktor-Schätzung aus RPE (1–10) für Einheiten ohne Leistungsdaten (Näherung, keine Messung). */
export const RPE_IF: Record<number, number> = { 1: 0.4, 2: 0.5, 3: 0.6, 4: 0.68, 5: 0.75, 6: 0.82, 7: 0.88, 8: 0.95, 9: 1.02, 10: 1.1 };

export function tssFromRpe(durationMin: number, rpe: number): number {
  const f = RPE_IF[Math.round(rpe)];
  if (!f) throw new Error('RPE muss zwischen 1 und 10 liegen.');
  return Math.round((durationMin / 60) * f * f * 1000) / 10;
}

export interface LoadWorkout { date: DateStr; tss: number | null }

export function dailyTss(workouts: LoadWorkout[]): Map<DateStr, number> {
  const m = new Map<DateStr, number>();
  for (const w of workouts) if (w.tss != null) m.set(w.date, (m.get(w.date) ?? 0) + w.tss);
  return m;
}

export interface PmcPoint { date: DateStr; tss: number; ctl: number; atl: number; tsb: number }

/**
 * Performance-Management-Chart: CTL (42 Tage), ATL (7 Tage), TSB = CTL − ATL.
 * Startwert 0 am ersten Tag des Bereichs (keine Vorgeschichte angenommen).
 */
export function pmc(daily: Map<DateStr, number>, from: DateStr, to: DateStr): PmcPoint[] {
  const out: PmcPoint[] = [];
  let ctl = 0, atl = 0;
  for (const d of eachDay(from, to)) {
    const t = daily.get(d) ?? 0;
    ctl += (t - ctl) / 42;
    atl += (t - atl) / 7;
    out.push({ date: d, tss: t, ctl: round1(ctl), atl: round1(atl), tsb: round1(ctl - atl) });
  }
  return out;
}

export const round1 = (x: number) => Math.round(x * 10) / 10;

export interface WeekSummary { weekStart: DateStr; sessions: number; minutes: number; tss: number }

export function weeklySummary(workouts: { date: DateStr; duration_min: number; tss: number | null }[], weekStarts: DateStr[]): WeekSummary[] {
  return weekStarts.map((ws) => {
    const end = addDays(ws, 6);
    const inWeek = workouts.filter((w) => w.date >= ws && w.date <= end);
    return {
      weekStart: ws,
      sessions: inWeek.length,
      minutes: Math.round(inWeek.reduce((a, w) => a + w.duration_min, 0)),
      tss: round1(inWeek.reduce((a, w) => a + (w.tss ?? 0), 0)),
    };
  });
}

/** Trainingskilokalorien (Netto über Grundumsatz): gemessen > Leistung > MET-Schätzung */
const MET: Record<string, number> = { rad: 6.8, kraft: 5, lauf: 9.8, fussball: 7, torwart: 5, mannschaft: 7, mobilitaet: 2.5, test: 8, spiel: 8, sonstiges: 4, ruhe: 1 };
export function exerciseKcal(w: { type: string; duration_min: number; avg_power_w?: number | null; kcal?: number | null }, weightKg: number): number {
  if (w.kcal != null) return Math.round(w.kcal);
  if (w.avg_power_w != null && w.avg_power_w > 0) {
    // Mechanische Arbeit in kJ ≈ umgesetzte kcal (Wirkungsgrad ≈ 24 % und 4,184 kJ/kcal heben sich nahezu auf)
    return Math.round((w.avg_power_w * w.duration_min * 60) / 1000);
  }
  const met = MET[w.type] ?? 4;
  return Math.round(Math.max(0, met - 1) * weightKg * (w.duration_min / 60));
}
