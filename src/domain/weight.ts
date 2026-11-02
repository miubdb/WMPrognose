import { diffDays, type DateStr } from './dates';

export interface WeightPoint { date: DateStr; weight_kg: number }

/** Exponentiell geglätteter Trend (Zeitkonstante in Tagen); berücksichtigt unterschiedliche Abstände der Messungen. */
export function trendSeries(points: WeightPoint[], tauDays = 7): { date: DateStr; weight_kg: number; trend: number }[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const out: { date: DateStr; weight_kg: number; trend: number }[] = [];
  let trend = 0;
  sorted.forEach((p, i) => {
    if (i === 0) trend = p.weight_kg;
    else {
      const dt = Math.max(1, diffDays(p.date, sorted[i - 1].date));
      const alpha = 1 - Math.exp(-dt / tauDays);
      trend = trend + alpha * (p.weight_kg - trend);
    }
    out.push({ date: p.date, weight_kg: p.weight_kg, trend: Math.round(trend * 100) / 100 });
  });
  return out;
}

/** Lineare Regression über die letzten `windowDays` Tage (bis zum letzten Messpunkt) in kg pro Woche. Null bei < 3 Punkten oder < 7 Tagen Spanne. */
export function weeklyRate(points: WeightPoint[], windowDays = 28): number | null {
  if (points.length < 3) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1].date;
  const win = sorted.filter((p) => diffDays(last, p.date) <= windowDays);
  if (win.length < 3) return null;
  const x = win.map((p) => diffDays(p.date, win[0].date));
  if (Math.max(...x) < 7) return null;
  const n = win.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = win.reduce((a, p) => a + p.weight_kg, 0) / n;
  let num = 0, den = 0;
  win.forEach((p, i) => { num += (x[i] - mx) * (p.weight_kg - my); den += (x[i] - mx) ** 2; });
  if (den === 0) return null;
  return Math.round((num / den) * 7 * 100) / 100;
}

export interface GoalProgress {
  startKg: number;
  currentKg: number;
  targetKg: number;
  lostKg: number;
  remainingKg: number;
  percent: number;
  requiredWeeklyKg: number | null; // kg/Woche, die bis zum Zieldatum nötig wären (negativ = Abnahme)
  projectedKgAtGoal: number | null; // bei aktuellem Trend
}

export function goalProgress(startKg: number, currentKg: number, targetKg: number, today: DateStr, goalDate: DateStr, rate: number | null): GoalProgress {
  const totalToLose = startKg - targetKg;
  const lost = startKg - currentKg;
  const percent = totalToLose === 0 ? 100 : Math.max(0, Math.min(100, Math.round((lost / totalToLose) * 1000) / 10));
  const daysLeft = diffDays(goalDate, today);
  const weeksLeft = daysLeft / 7;
  return {
    startKg, currentKg, targetKg,
    lostKg: Math.round(lost * 100) / 100,
    remainingKg: Math.round((currentKg - targetKg) * 100) / 100,
    percent,
    requiredWeeklyKg: weeksLeft > 0 ? Math.round(((targetKg - currentKg) / weeksLeft) * 100) / 100 : null,
    projectedKgAtGoal: rate != null && weeksLeft > 0 ? Math.round((currentKg + rate * weeksLeft) * 10) / 10 : null,
  };
}
