// Datumshilfen auf Basis von 'YYYY-MM-DD'-Strings (kalendarisch, zeitzonenfrei, via UTC).
export type DateStr = string;
const MS = 86400_000;

export function parseDate(s: DateStr): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Ungültiges Datum: ${s}`);
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) throw new Error(`Ungültiges Datum: ${s}`);
  return t;
}
export function isDateStr(s: unknown): s is DateStr {
  if (typeof s !== 'string') return false;
  try { parseDate(s); return true; } catch { return false; }
}
export function fmt(t: number): DateStr {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
export const addDays = (s: DateStr, n: number): DateStr => fmt(parseDate(s) + n * MS);
export const diffDays = (a: DateStr, b: DateStr): number => Math.round((parseDate(a) - parseDate(b)) / MS);
/** ISO-Wochentag: 1 = Montag … 7 = Sonntag */
export function weekday(s: DateStr): number {
  const d = new Date(parseDate(s)).getUTCDay();
  return d === 0 ? 7 : d;
}
export const startOfWeek = (s: DateStr): DateStr => addDays(s, -(weekday(s) - 1));
export function eachDay(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
export function todayIn(tz = 'Europe/Berlin', now: Date = new Date()): DateStr {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parts; // en-CA => YYYY-MM-DD
}
/** Lokales Datum (Europe/Berlin) eines ISO-Zeitstempels */
export function localDateOf(iso: string | Date, tz = 'Europe/Berlin'): DateStr {
  return todayIn(tz, typeof iso === 'string' ? new Date(iso) : iso);
}
export const WEEKDAYS_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export function formatDe(s: DateStr, withWeekday = false): string {
  const [y, m, d] = s.split('-');
  return `${withWeekday ? WEEKDAYS_SHORT[weekday(s) - 1] + ', ' : ''}${d}.${m}.${y}`;
}
