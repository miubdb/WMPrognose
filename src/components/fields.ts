import type { FieldDef } from './ui';

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

export const PROFILE_FIELDS: FieldDef[] = [
  { name: 'display_name', label: 'Name (optional)', type: 'text' },
  { name: 'sex', label: 'Geschlecht (für Kalorienberechnung)', type: 'select', options: opts({ m: 'männlich', f: 'weiblich' }) },
  { name: 'birth_year', label: 'Geburtsjahr', type: 'int', min: 1920, max: 2020 },
  { name: 'height_cm', label: 'Körpergröße', type: 'number', unit: 'cm', min: 100, max: 250 },
  { name: 'activity_level', label: 'Alltagsaktivität (ohne Training)', type: 'select', required: true, options: opts({ low: 'niedrig (überwiegend sitzend)', moderate: 'mittel', high: 'hoch (viel auf den Beinen)' }) },
  { name: 'start_date', label: 'Beginn der Vorbereitung', type: 'date', required: true },
  { name: 'first_friendly_date', label: 'Erstes Freundschaftsspiel', type: 'date', required: true },
  { name: 'main_goal_date', label: 'Hauptziel der Vorbereitung', type: 'date', required: true },
  { name: 'start_weight_kg', label: 'Ausgangsgewicht', type: 'number', unit: 'kg', required: true, step: 0.05 },
  { name: 'target_weight_kg', label: 'Zielgewicht (flexible Orientierung)', type: 'number', unit: 'kg', required: true, step: 0.05 },
  { name: 'start_ftp_w', label: 'Ausgangs-FTP', type: 'int', unit: 'W', required: true },
];

export const WORKOUT_TYPE_OPTS = opts({ rad: 'Rad', kraft: 'Kraft', lauf: 'Lauf', fussball: 'Fußball (spezifisch)', torwart: 'Torwarttraining', mannschaft: 'Mannschaftstraining', mobilitaet: 'Mobilität', test: 'Test', spiel: 'Spiel', sonstiges: 'Sonstiges' });
export const PLAN_TYPE_OPTS = opts({ rad: 'Rad', kraft: 'Kraft', lauf: 'Lauf', fussball: 'Fußball (spezifisch)', torwart: 'Torwarttraining', mannschaft: 'Mannschaftstraining', mobilitaet: 'Mobilität', test: 'Test', spiel: 'Spiel', ruhe: 'Ruhe' });

export const WORKOUT_FIELDS: FieldDef[] = [
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'type', label: 'Art', type: 'select', required: true, options: WORKOUT_TYPE_OPTS },
  { name: 'title', label: 'Titel', type: 'text', required: true },
  { name: 'duration_min', label: 'Dauer', type: 'number', unit: 'min', required: true, step: 0.5 },
  { name: 'rpe', label: 'Anstrengung (RPE 1–10)', type: 'int', min: 1, max: 10, help: 'Ohne Leistungsdaten wird die Belastung (TSS) aus Dauer und RPE geschätzt.' },
  { name: 'distance_km', label: 'Distanz', type: 'number', unit: 'km' },
  { name: 'avg_power_w', label: 'Ø Leistung', type: 'int', unit: 'W' },
  { name: 'normalized_power_w', label: 'Normalized Power', type: 'int', unit: 'W', help: 'Mit NP und FTP wird der TSS exakt berechnet.' },
  { name: 'avg_hr', label: 'Ø Puls', type: 'int', unit: 'bpm' },
  { name: 'max_hr', label: 'Max. Puls', type: 'int', unit: 'bpm' },
  { name: 'elevation_m', label: 'Höhenmeter', type: 'int', unit: 'm' },
  { name: 'kcal', label: 'Kalorien (gemessen)', type: 'int', unit: 'kcal' },
  { name: 'notes', label: 'Notizen', type: 'textarea' },
];

export const PLAN_FIELDS: FieldDef[] = [
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'type', label: 'Art', type: 'select', required: true, options: PLAN_TYPE_OPTS },
  { name: 'title', label: 'Titel', type: 'text', required: true },
  { name: 'duration_min', label: 'Dauer', type: 'int', unit: 'min', required: true },
  { name: 'intensity', label: 'Intensität', type: 'select', required: true, options: opts({ '1': 'locker', '2': 'mittel', '3': 'hart' }) },
  { name: 'description', label: 'Beschreibung', type: 'textarea' },
  { name: 'status', label: 'Status', type: 'select', required: true, options: opts({ planned: 'geplant', done: 'erledigt', skipped: 'übersprungen' }) },
];
/** intensity kommt als Select-String; für die API in eine Zahl wandeln */
export const planPayload = (p: Record<string, any>) => (p.intensity != null ? { ...p, intensity: Number(p.intensity) } : p);
