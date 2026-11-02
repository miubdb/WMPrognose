import { describe, expect, it } from 'vitest';
import { goalProgress, trendSeries, weeklyRate } from '@/domain/weight';
import { bmr, dailyTarget, macroConsistency, scaleFood, totals } from '@/domain/nutrition';
import { readiness, type Checkin } from '@/domain/readiness';
import { matchTotals } from '@/domain/gk';

describe('Gewicht', () => {
  const pts = Array.from({ length: 29 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`.replace('2026-11-29', '2026-11-29'), weight_kg: 91.45 - i * 0.05 }));
  it('Wochenrate (lineare Regression)', () => {
    expect(weeklyRate(pts)).toBeCloseTo(-0.35, 2);
  });
  it('Rate nur mit genug Daten', () => {
    expect(weeklyRate(pts.slice(0, 2))).toBeNull();
    expect(weeklyRate([{ date: '2026-11-01', weight_kg: 90 }, { date: '2026-11-02', weight_kg: 90 }, { date: '2026-11-03', weight_kg: 90 }])).toBeNull();
    // 10 Tage Spanne ist noch zu kurz für einen belastbaren Trend
    expect(weeklyRate([{ date: '2026-11-01', weight_kg: 91 }, { date: '2026-11-05', weight_kg: 90.5 }, { date: '2026-11-11', weight_kg: 90 }])).toBeNull();
  });
  it('Trend glättet Ausreißer', () => {
    const t = trendSeries([{ date: '2026-11-01', weight_kg: 90 }, { date: '2026-11-02', weight_kg: 90 }, { date: '2026-11-03', weight_kg: 93 }]);
    expect(t[2].trend).toBeLessThan(91);
    expect(t[2].trend).toBeGreaterThan(90);
  });
  it('Zielfortschritt', () => {
    const g = goalProgress(91.45, 89.45, 86, '2026-12-01', '2027-03-07', -0.4);
    expect(g.lostKg).toBe(2);
    expect(g.remainingKg).toBe(3.45);
    expect(g.percent).toBeCloseTo(36.7, 1);
    expect(g.requiredWeeklyKg).toBeLessThan(0);
    expect(g.projectedKgAtGoal).toBeLessThan(89.45);
  });
});

describe('Ernährung', () => {
  const body = { sex: 'm' as const, heightCm: 185, weightKg: 91.45, age: 35 };
  it('Mifflin-St-Jeor', () => expect(bmr(body)).toBe(Math.round(10 * 91.45 + 6.25 * 185 - 5 * 35 + 5)));
  it('Defizit passend zum Ziel 86 kg bis 07.03.2027', () => {
    const t = dailyTarget({ body, activity: 'moderate', targetWeightKg: 86, today: '2026-11-02', goalDate: '2027-03-07', trainingKcal: 400 });
    // 5,45 kg × 7700 / 125 Tage ≈ 336 kcal
    expect(t.deficitKcal).toBeGreaterThan(320);
    expect(t.deficitKcal).toBeLessThan(350);
    expect(t.kcal).toBe(t.maintenanceKcal - t.deficitKcal);
    expect(t.proteinG).toBe(183);
    expect(t.carbsG).toBeGreaterThan(0);
    // Makros ergeben ≈ Kalorienziel
    expect(Math.abs(t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9 - t.kcal)).toBeLessThan(15);
  });
  it('begrenzt Defizit und warnt', () => {
    const t = dailyTarget({ body, activity: 'low', targetWeightKg: 70, today: '2027-02-28', goalDate: '2027-03-07', trainingKcal: 0 });
    expect(t.deficitKcal).toBeLessThanOrEqual(750);
    expect(t.warnings.length).toBeGreaterThan(0);
    expect(t.kcal).toBeGreaterThanOrEqual(t.bmr);
  });
  it('kein Defizit bei Zielgewicht erreicht', () => {
    const t = dailyTarget({ body: { ...body, weightKg: 85 }, activity: 'moderate', targetWeightKg: 86, today: '2026-12-01', goalDate: '2027-03-07', trainingKcal: 0 });
    expect(t.deficitKcal).toBe(0);
  });
  it('Summen und Schätzungs-Zähler', () => {
    const s = totals([{ kcal: 100.5, protein_g: 10, carbs_g: 5, fat_g: 2, is_estimate: true }, { kcal: 200, protein_g: 5, carbs_g: 30, fat_g: 1 }]);
    expect(s).toMatchObject({ kcal: 300.5, protein_g: 15, carbs_g: 35, fat_g: 3, estimateCount: 1, count: 2 });
  });
  it('Skalierung pro 100 g', () => {
    expect(scaleFood({ kcal_100g: 350, protein_100g: 12, carbs_100g: 70, fat_100g: 2 }, 80)).toEqual({ amount_g: 80, kcal: 280, protein_g: 9.6, carbs_g: 56, fat_g: 1.6 });
  });
  it('Makro-Plausibilität (Atwater)', () => {
    expect(macroConsistency({ kcal: 400, protein_g: 20, carbs_g: 50, fat_g: 13 }).ok).toBe(true);
    expect(macroConsistency({ kcal: 100, protein_g: 50, carbs_g: 50, fat_g: 50 }).ok).toBe(false);
  });
});

const ci = (o: Partial<Checkin> = {}): Checkin => ({ date: '2026-11-10', sleep_hours: 8, sleep_quality: 5, soreness: 1, energy: 5, mood: 5, stress: 1, resting_hr: null, hrv_ms: null, ...o });
describe('Tagesform', () => {
  it('Bestwerte → 100, grün', () => expect(readiness(ci())).toMatchObject({ score: 100, level: 'gruen' }));
  it('Schlechte Werte → rot', () => expect(readiness(ci({ sleep_hours: 4, sleep_quality: 1, soreness: 5, energy: 1, mood: 1, stress: 5 }))).toMatchObject({ score: 0, level: 'rot' }));
  it('Mittelwerte → gelb', () => expect(readiness(ci({ sleep_hours: 6, sleep_quality: 3, soreness: 3, energy: 3, mood: 3, stress: 3 })).level).toBe('gelb'));
  it('weniger als 3 Faktoren → kein Score', () => {
    expect(readiness(ci({ sleep_hours: null, sleep_quality: null, soreness: null, energy: null, mood: null, stress: 3 })).score).toBeNull();
  });
  it('Ruhepuls über Baseline senkt den Score', () => {
    const hist = Array.from({ length: 7 }, (_, i) => ci({ date: `2026-11-0${i + 1}`, resting_hr: 55 }));
    const normal = readiness(ci({ resting_hr: 55 }), hist).score!;
    const high = readiness(ci({ resting_hr: 65 }), hist).score!;
    expect(high).toBeLessThan(normal);
  });
  it('HRV unter Baseline senkt den Score', () => {
    const hist = Array.from({ length: 7 }, (_, i) => ci({ date: `2026-11-0${i + 1}`, hrv_ms: 60 }));
    expect(readiness(ci({ hrv_ms: 45 }), hist).score!).toBeLessThan(readiness(ci({ hrv_ms: 60 }), hist).score!);
  });
});

describe('Torwart-Statistik', () => {
  const row = (o: Record<string, number | string | null> = {}) => ({ date: '2027-02-06', goals_for: 1, goals_against: 2, minutes_played: 90, shots_faced: 8, saves: 6, crosses_claimed: 3, crosses_faced: 4, passes_completed: 20, passes_attempted: 25, errors_leading_to_goal: 1, rating: 6, ...o }) as never;
  it('berechnet Quoten', () => {
    const t = matchTotals([row(), row({ goals_against: 0, saves: 4, shots_faced: 4, rating: 8 })]);
    expect(t.matches).toBe(2);
    expect(t.savePct).toBe(83.3);
    expect(t.cleanSheets).toBe(1);
    expect(t.goalsAgainstPer90).toBe(1);
    expect(t.avgRating).toBe(7);
    expect(t.crossClaimPct).toBe(75);
    expect(t.wins + t.draws + t.losses).toBe(2);
  });
  it('liefert null statt Division durch 0', () => {
    const t = matchTotals([row({ shots_faced: 0, saves: 0, crosses_faced: 0, crosses_claimed: 0, passes_attempted: 0, passes_completed: 0, rating: null })]);
    expect(t.savePct).toBeNull();
    expect(t.crossClaimPct).toBeNull();
    expect(t.passPct).toBeNull();
    expect(t.avgRating).toBeNull();
  });
});
