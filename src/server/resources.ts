// Registry der CRUD-Ressourcen. Jede Ressource gehört einem Nutzer (user_id) – alle Abfragen sind darauf gescoped.
import { z, type ZodType } from 'zod';
import { dateStr, GK_CATEGORIES, int, MEALS, num, optInt, optNum, optText, PLAN_TYPES, text, uuid, WORKOUT_TYPES } from './schemas';

export interface Resource {
  table: string;
  /** Zod-Objekt mit allen schreibbaren Feldern */
  schema: z.ZodObject;
  /** Pflichtfelder bei Create werden durch das Schema bestimmt; Update nutzt .partial() */
  jsonb?: string[];
  order: string;
  dateColumn?: string;
  label: string;
  /** Felder, die nur serverseitig gesetzt werden dürfen (nicht im Schema) */
  conflictMessage?: string;
}

const ev = z.strictObject({
  kind: z.enum(['friendly', 'main_goal', 'match', 'test', 'other']),
  title: text(120, 1),
  date: dateStr,
  notes: optText(2000),
});

const ftp = z.strictObject({
  date: dateStr,
  ftp_w: int(50, 600),
  method: z.enum(['initial', '20min', 'ramp', 'manual']),
  test_value_w: optInt(50, 1000),
  notes: optText(1000),
});

const weight = z.strictObject({
  date: dateStr,
  weight_kg: num(30, 300),
  body_fat_pct: optNum(3, 60),
  notes: optText(1000),
});

const planSession = z.strictObject({
  date: dateStr,
  type: z.enum(PLAN_TYPES),
  title: text(160, 1),
  duration_min: int(0, 600),
  intensity: int(1, 3),
  description: optText(4000),
  status: z.enum(['planned', 'done', 'skipped']),
});

export const workoutSchema = z.strictObject({
  date: dateStr,
  type: z.enum(WORKOUT_TYPES),
  title: text(160, 1),
  duration_min: num(0.5, 1440),
  distance_km: optNum(0, 5000),
  avg_power_w: optInt(0, 2000),
  normalized_power_w: optInt(0, 2500),
  avg_hr: optInt(30, 230),
  max_hr: optInt(30, 250),
  elevation_m: optInt(0, 20000),
  rpe: optInt(1, 10),
  kcal: optInt(0, 20000),
  notes: optText(4000),
  plan_session_id: uuid.nullish(),
});

const readiness = z.strictObject({
  date: dateStr,
  sleep_hours: optNum(0, 16),
  sleep_quality: optInt(1, 5),
  soreness: optInt(1, 5),
  energy: optInt(1, 5),
  mood: optInt(1, 5),
  stress: optInt(1, 5),
  resting_hr: optInt(25, 150),
  hrv_ms: optInt(5, 300),
  notes: optText(1000),
});

const food = z.strictObject({
  name: text(160, 1),
  kcal_100g: num(0, 1000),
  protein_100g: num(0, 100).default(0),
  carbs_100g: num(0, 100).default(0),
  fat_100g: num(0, 100).default(0),
  serving_g: optNum(0.1, 5000),
  barcode: optText(40),
});

export const foodEntrySchema = z.strictObject({
  date: dateStr,
  meal: z.enum(MEALS),
  name: text(160, 1),
  amount_g: optNum(0.1, 20000),
  kcal: num(0, 20000),
  protein_g: num(0, 2000).default(0),
  carbs_g: num(0, 2000).default(0),
  fat_g: num(0, 2000).default(0),
  food_id: uuid.nullish(),
  source: z.enum(['manual', 'food', 'ai_estimate']).default('manual'),
  is_estimate: z.boolean().default(false),
});

const gkExercise = z.strictObject({
  name: text(120, 1),
  category: z.enum(GK_CATEGORIES),
  description: optText(4000),
  default_sets: optInt(1, 50),
  default_reps: optInt(1, 500),
  default_duration_min: optInt(1, 240),
});

const gkItem = z.strictObject({
  exercise_id: uuid.nullish(),
  name: text(120, 1),
  sets: optInt(1, 50),
  reps: optInt(1, 500),
  duration_min: optInt(1, 240),
  notes: optText(500),
});

const gkSession = z.strictObject({
  date: dateStr,
  title: text(160, 1),
  duration_min: int(1, 600),
  rpe: optInt(1, 10),
  focus: optText(200),
  items: z.array(gkItem).max(40).default([]),
  notes: optText(4000),
});

const goalNote = z.strictObject({ minute: optInt(0, 150), description: text(500, 1), avoidable: z.boolean().default(false) });

const matchAnalysis = z.strictObject({
  date: dateStr,
  opponent: text(120, 1),
  competition: optText(120),
  goals_for: int(0, 99).default(0),
  goals_against: int(0, 99).default(0),
  minutes_played: int(0, 150).default(90),
  shots_faced: int(0, 99).default(0),
  saves: int(0, 99).default(0),
  crosses_claimed: int(0, 99).default(0),
  crosses_faced: int(0, 99).default(0),
  passes_completed: int(0, 300).default(0),
  passes_attempted: int(0, 300).default(0),
  errors_leading_to_goal: int(0, 20).default(0),
  rating: optInt(1, 10),
  strengths: optText(4000),
  weaknesses: optText(4000),
  goals_against_notes: z.array(goalNote).max(30).default([]),
  training_goals: optText(4000),
}).superRefine((v, ctx) => {
  if (v.saves > v.shots_faced) ctx.addIssue({ code: 'custom', path: ['saves'], message: 'Paraden können nicht höher sein als die Schüsse aufs Tor.' });
  if (v.crosses_claimed > v.crosses_faced) ctx.addIssue({ code: 'custom', path: ['crosses_claimed'], message: 'Abgefangene Flanken können nicht höher sein als die Flanken insgesamt.' });
  if (v.passes_completed > v.passes_attempted) ctx.addIssue({ code: 'custom', path: ['passes_completed'], message: 'Angekommene Pässe können nicht höher sein als die Versuche.' });
}) as unknown as z.ZodObject;

const exception = z.strictObject({ date: dateStr, available_minutes: int(0, 600), reason: optText(300) });

export const RESOURCES: Record<string, Resource> = {
  events: { table: 'events', schema: ev, order: 'date ASC', dateColumn: 'date', label: 'Termin' },
  'ftp-tests': { table: 'ftp_tests', schema: ftp, order: 'date DESC', dateColumn: 'date', label: 'FTP-Eintrag' },
  weights: { table: 'weight_entries', schema: weight, order: 'date DESC', dateColumn: 'date', label: 'Gewichtseintrag', conflictMessage: 'Für dieses Datum existiert bereits ein Gewichtseintrag. Bitte den vorhandenen bearbeiten.' },
  'plan-sessions': { table: 'plan_sessions', schema: planSession.partial({ status: true }) as unknown as z.ZodObject, order: 'date ASC, created_at ASC', dateColumn: 'date', label: 'Trainingseinheit' },
  workouts: { table: 'workouts', schema: workoutSchema, order: 'date DESC, created_at DESC', dateColumn: 'date', label: 'Training' },
  readiness: { table: 'readiness_checkins', schema: readiness, order: 'date DESC', dateColumn: 'date', label: 'Check-in', conflictMessage: 'Für dieses Datum existiert bereits ein Check-in. Bitte den vorhandenen bearbeiten.' },
  foods: { table: 'foods', schema: food, order: 'name ASC', label: 'Lebensmittel' },
  'food-entries': { table: 'food_entries', schema: foodEntrySchema, order: 'date DESC, created_at ASC', dateColumn: 'date', label: 'Mahlzeit' },
  'gk-exercises': { table: 'gk_exercises', schema: gkExercise, order: 'name ASC', label: 'Übung' },
  'gk-sessions': { table: 'gk_sessions', schema: gkSession, jsonb: ['items'], order: 'date DESC, created_at DESC', dateColumn: 'date', label: 'Torwarttraining' },
  'match-analyses': { table: 'match_analyses', schema: matchAnalysis, jsonb: ['goals_against_notes'], order: 'date DESC', dateColumn: 'date', label: 'Spielanalyse' },
  exceptions: { table: 'availability_exceptions', schema: exception, order: 'date ASC', dateColumn: 'date', label: 'Ausnahme', conflictMessage: 'Für dieses Datum existiert bereits eine Ausnahme.' },
};

export type { ZodType };
