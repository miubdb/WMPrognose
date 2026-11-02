export type WorkoutType = 'rad' | 'kraft' | 'lauf' | 'fussball' | 'torwart' | 'mannschaft' | 'mobilitaet' | 'test' | 'spiel' | 'sonstiges';

export interface ParsedActivity {
  source: 'fit' | 'tcx' | 'gpx' | 'apple_health';
  startTime: string; // ISO
  date: string; // lokales Datum YYYY-MM-DD
  durationMin: number;
  distanceKm: number | null;
  avgPowerW: number | null;
  normalizedPowerW: number | null;
  avgHr: number | null;
  maxHr: number | null;
  elevationM: number | null;
  kcal: number | null;
  type: WorkoutType;
  title: string;
  externalId: string;
}
