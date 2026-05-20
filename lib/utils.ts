/**
 * WM 2026 läuft Juni–Juli 2026: Deutschland ist in MESZ (UTC+2).
 * Daher: Berlin-Zeit = UTC + 2h
 */
export function toBerlinTime(kickoffUTC: string): string {
  const [h, m] = kickoffUTC.split(':').map(Number)
  const totalMins = h * 60 + m + 120   // UTC+2
  const bh = Math.floor(totalMins / 60) % 24
  const bm = totalMins % 60
  return `${String(bh).padStart(2, '0')}:${String(bm).padStart(2, '0')}`
}

/** Format 'YYYY-MM-DD' → 'DD.MM.' */
export function fmtDate(date: string): string {
  const [, mm, dd] = date.split('-')
  return `${dd}.${mm}.`
}

/** Format 'YYYY-MM-DD' → 'DD.MM.YYYY' */
export function fmtDateLong(date: string): string {
  const [yyyy, mm, dd] = date.split('-')
  return `${dd}.${mm}.${yyyy}`
}
