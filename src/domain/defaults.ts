/**
 * Vorbelegung des Onboardings mit den vereinbarten Zielen. Dies sind KEINE gespeicherten Daten:
 * Erst die Bestätigung im Onboarding legt Profil, Start-Gewicht und Start-FTP in der Datenbank an.
 */
export const ONBOARDING_DEFAULTS = {
  start_date: '2026-11-02',
  first_friendly_date: '2027-02-06',
  main_goal_date: '2027-03-07',
  start_weight_kg: 91.45,
  target_weight_kg: 86,
  start_ftp_w: 236,
} as const;
