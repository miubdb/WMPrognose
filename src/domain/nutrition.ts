// Ernährungsberechnungen: Mifflin-St-Jeor, Kaloriendefizit, Makros.
import { diffDays, type DateStr } from './dates';

export interface BodyInfo { sex: 'm' | 'f'; heightCm: number; weightKg: number; age: number }

export function bmr(b: BodyInfo): number {
  return Math.round(10 * b.weightKg + 6.25 * b.heightCm - 5 * b.age + (b.sex === 'm' ? 5 : -161));
}

/** Alltagsaktivität OHNE Training; Trainingskalorien werden separat addiert. */
export const NEAT_FACTOR = { low: 1.2, moderate: 1.3, high: 1.4 } as const;
export type ActivityLevel = keyof typeof NEAT_FACTOR;

export const KCAL_PER_KG_FAT = 7700;

export interface TargetInput {
  body: BodyInfo;
  activity: ActivityLevel;
  targetWeightKg: number;
  today: DateStr;
  goalDate: DateStr;
  trainingKcal: number; // erwartete/tatsächliche Trainingskalorien für den Tag
}

export interface NutritionTarget {
  bmr: number;
  maintenanceKcal: number; // BMR × NEAT + Training
  deficitKcal: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  warnings: string[];
}

export function dailyTarget(i: TargetInput): NutritionTarget {
  const warnings: string[] = [];
  const base = bmr(i.body);
  const maintenance = Math.round(base * NEAT_FACTOR[i.activity] + i.trainingKcal);
  const daysLeft = diffDays(i.goalDate, i.today);
  let deficit = 0;
  const toLose = i.body.weightKg - i.targetWeightKg;
  if (toLose > 0) {
    if (daysLeft <= 0) {
      warnings.push('Das Zieldatum ist erreicht oder vorbei – es wird kein Defizit mehr berechnet.');
    } else {
      const needed = (toLose * KCAL_PER_KG_FAT) / daysLeft;
      const cap = Math.min(750, Math.round(maintenance * 0.25));
      deficit = Math.round(Math.min(needed, cap));
      if (needed > cap) warnings.push(`Das Zielgewicht bis zum Zieldatum würde ein Defizit von ca. ${Math.round(needed)} kcal/Tag erfordern. Begrenzt auf ${cap} kcal/Tag – das Ziel ist als flexible Orientierung zu verstehen.`);
    }
  } else if (toLose < 0) {
    warnings.push('Das Zielgewicht liegt über dem aktuellen Gewicht – es wird kein Überschuss berechnet.');
  }
  let kcal = maintenance - deficit;
  const floor = base; // nie unter Grundumsatz
  if (kcal < floor) { kcal = floor; warnings.push('Das Kalorienziel wurde auf den Grundumsatz begrenzt.'); }
  const proteinG = Math.round(i.body.weightKg * (deficit > 0 ? 2.0 : 1.8));
  const fatG = Math.round(Math.max(i.body.weightKg * 0.8, (kcal * 0.25) / 9));
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  return { bmr: base, maintenanceKcal: maintenance, deficitKcal: deficit, kcal: Math.round(kcal), proteinG, fatG, carbsG, warnings };
}

export interface FoodEntryLike { kcal: number; protein_g: number; carbs_g: number; fat_g: number; is_estimate?: boolean }

export function totals(entries: FoodEntryLike[]) {
  const t = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, estimateCount: 0, count: entries.length };
  for (const e of entries) {
    t.kcal += Number(e.kcal); t.protein_g += Number(e.protein_g); t.carbs_g += Number(e.carbs_g); t.fat_g += Number(e.fat_g);
    if (e.is_estimate) t.estimateCount++;
  }
  const r = (x: number) => Math.round(x * 10) / 10;
  return { ...t, kcal: r(t.kcal), protein_g: r(t.protein_g), carbs_g: r(t.carbs_g), fat_g: r(t.fat_g) };
}

export interface Per100 { kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number }
export function scaleFood(f: Per100, grams: number) {
  const k = grams / 100;
  const r = (x: number) => Math.round(x * k * 10) / 10;
  return { amount_g: grams, kcal: r(f.kcal_100g), protein_g: r(f.protein_100g), carbs_g: r(f.carbs_100g), fat_g: r(f.fat_100g) };
}

/** Plausibilität: Atwater-Abgleich (4/4/9). Abweichung > 25 % deutet auf Eingabefehler hin. */
export function macroConsistency(e: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }): { ok: boolean; computedKcal: number } {
  const c = e.protein_g * 4 + e.carbs_g * 4 + e.fat_g * 9;
  if (e.kcal === 0 && c === 0) return { ok: true, computedKcal: 0 };
  const ok = Math.abs(c - e.kcal) <= Math.max(25, e.kcal * 0.25);
  return { ok, computedKcal: Math.round(c) };
}
