/**
 * Historische Team-Snapshots pro Turnier.
 *
 * Diese Daten werden für methodisch saubere Backtests genutzt —
 * KEINE aktuellen WM2026-Daten für historische Spiele.
 *
 * ELO kommt aus den Match-Records (homeElo/awayElo) — hier nur Ergänzungsdaten.
 * sourceQuality markiert wie verlässlich die Daten sind.
 */

export type TournamentId = 'WC2014' | 'WC2018' | 'WC2022' | 'EURO2024'

/**
 * verifiedOnly   — only teams with genuinely verified market values (none currently; future use)
 * reliableRecent — WC2022 + EURO2024: complete coverage, Transfermarkt-archive quality
 * allSnapshots   — all four tournaments including rough WC2014/WC2018 estimates; comparison only
 */
export type CalibrationMode = 'verifiedOnly' | 'reliableRecent' | 'allSnapshots'

export const CALIBRATION_TOURNAMENT_MAP: Record<CalibrationMode, TournamentId[]> = {
  verifiedOnly:    [],
  reliableRecent:  ['WC2022', 'EURO2024'],
  allSnapshots:    ['WC2014', 'WC2018', 'WC2022', 'EURO2024'],
}

export interface HistoricalTeamSnapshot {
  teamName: string          // entspricht homeTeam/awayTeam in historicalResults
  tournament: TournamentId
  marketValueM?: number     // Kader-Marktwert zum Turnierbeginn (Schätzung)
  worldCupTitles?: number
  worldCupAppearances?: number
  avgAge?: number
  fifaRanking?: number
  sourceQuality: 'high' | 'medium' | 'low' | 'elo_only'
  marketValueSource?: string       // z.B. "Transfermarkt archive"
  marketValueSnapshotDate?: string // z.B. "2022-11" (YYYY-MM)
  marketValueEstimated?: boolean   // true = Schätzung, nicht verifiziert
  notes?: string
}

// WM 2014 — Kader-Marktwerte grob geschätzt (keine verlässliche Archivquelle verfügbar)
// worldCupTitles/Appearances: Stand vor WM 2014
const WC2014_SNAPSHOTS: HistoricalTeamSnapshot[] = [
  { teamName: 'Germany',          tournament: 'WC2014', marketValueM:  560, worldCupTitles: 3, worldCupAppearances: 18, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Brazil',           tournament: 'WC2014', marketValueM:  600, worldCupTitles: 5, worldCupAppearances: 20, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Spain',            tournament: 'WC2014', marketValueM:  650, worldCupTitles: 1, worldCupAppearances: 14, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'France',           tournament: 'WC2014', marketValueM:  480, worldCupTitles: 1, worldCupAppearances: 14, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Argentina',        tournament: 'WC2014', marketValueM:  480, worldCupTitles: 2, worldCupAppearances: 16, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'England',          tournament: 'WC2014', marketValueM:  600, worldCupTitles: 1, worldCupAppearances: 14, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Netherlands',      tournament: 'WC2014', marketValueM:  450, worldCupTitles: 0, worldCupAppearances: 10, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Belgium',          tournament: 'WC2014', marketValueM:  380, worldCupTitles: 0, worldCupAppearances: 12, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Italy',            tournament: 'WC2014', marketValueM:  350, worldCupTitles: 4, worldCupAppearances: 18, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Portugal',         tournament: 'WC2014', marketValueM:  320, worldCupTitles: 0, worldCupAppearances:  7, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Switzerland',      tournament: 'WC2014', marketValueM:  200, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Colombia',         tournament: 'WC2014', marketValueM:  140, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Uruguay',          tournament: 'WC2014', marketValueM:  160, worldCupTitles: 2, worldCupAppearances: 13, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Chile',            tournament: 'WC2014', marketValueM:  110, worldCupTitles: 0, worldCupAppearances:  9, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Croatia',          tournament: 'WC2014', marketValueM:  140, worldCupTitles: 0, worldCupAppearances:  4, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Mexico',           tournament: 'WC2014', marketValueM:  180, worldCupTitles: 0, worldCupAppearances: 15, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'USA',              tournament: 'WC2014', marketValueM:  150, worldCupTitles: 0, worldCupAppearances: 10, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Russia',           tournament: 'WC2014', marketValueM:  170, worldCupTitles: 0, worldCupAppearances: 10, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Bosnia',             tournament: 'WC2014', marketValueM:  90, worldCupTitles: 0, worldCupAppearances:  1, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Ivory Coast',      tournament: 'WC2014', marketValueM:  120, worldCupTitles: 0, worldCupAppearances:  3, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Nigeria',          tournament: 'WC2014', marketValueM:   90, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Algeria',          tournament: 'WC2014', marketValueM:   80, worldCupTitles: 0, worldCupAppearances:  4, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Ghana',            tournament: 'WC2014', marketValueM:   80, worldCupTitles: 0, worldCupAppearances:  3, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Japan',            tournament: 'WC2014', marketValueM:   80, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'South Korea',      tournament: 'WC2014', marketValueM:   80, worldCupTitles: 0, worldCupAppearances: 10, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Ecuador',          tournament: 'WC2014', marketValueM:   60, worldCupTitles: 0, worldCupAppearances:  3, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Greece',           tournament: 'WC2014', marketValueM:   80, worldCupTitles: 0, worldCupAppearances:  4, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Australia',        tournament: 'WC2014', marketValueM:   80, worldCupTitles: 0, worldCupAppearances:  4, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Cameroon',         tournament: 'WC2014', marketValueM:   70, worldCupTitles: 0, worldCupAppearances:  7, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Iran',             tournament: 'WC2014', marketValueM:   40, worldCupTitles: 0, worldCupAppearances:  4, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Costa Rica',       tournament: 'WC2014', marketValueM:   40, worldCupTitles: 0, worldCupAppearances:  4, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
  { teamName: 'Honduras',         tournament: 'WC2014', marketValueM:   30, worldCupTitles: 0, worldCupAppearances:  3, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2014-06' },
]

// WM 2022 — Kader-Marktwerte (Schätzungen aus Transfermarkt-Archiv, November 2022)
// ELO-Werte kommen aus den Match-Records, nicht von hier
const WC2022_SNAPSHOTS: HistoricalTeamSnapshot[] = [
  { teamName: 'Brazil',       tournament: 'WC2022', marketValueM: 1200, worldCupTitles: 5, worldCupAppearances: 22, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'France',       tournament: 'WC2022', marketValueM: 1150, worldCupTitles: 2, worldCupAppearances: 16, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'England',      tournament: 'WC2022', marketValueM: 1050, worldCupTitles: 1, worldCupAppearances: 16, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Belgium',      tournament: 'WC2022', marketValueM:  890, worldCupTitles: 0, worldCupAppearances: 14, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Spain',        tournament: 'WC2022', marketValueM:  840, worldCupTitles: 1, worldCupAppearances: 16, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Germany',      tournament: 'WC2022', marketValueM:  820, worldCupTitles: 4, worldCupAppearances: 20, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Portugal',     tournament: 'WC2022', marketValueM:  800, worldCupTitles: 0, worldCupAppearances:  8, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Argentina',    tournament: 'WC2022', marketValueM:  760, worldCupTitles: 2, worldCupAppearances: 18, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Netherlands',  tournament: 'WC2022', marketValueM:  700, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Denmark',      tournament: 'WC2022', marketValueM:  500, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Switzerland',  tournament: 'WC2022', marketValueM:  450, worldCupTitles: 0, worldCupAppearances: 12, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'USA',          tournament: 'WC2022', marketValueM:  400, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Croatia',      tournament: 'WC2022', marketValueM:  360, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Poland',       tournament: 'WC2022', marketValueM:  360, worldCupTitles: 0, worldCupAppearances:  9, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Serbia',       tournament: 'WC2022', marketValueM:  450, worldCupTitles: 0, worldCupAppearances: 13, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Mexico',       tournament: 'WC2022', marketValueM:  350, worldCupTitles: 0, worldCupAppearances: 17, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Morocco',      tournament: 'WC2022', marketValueM:  210, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Senegal',      tournament: 'WC2022', marketValueM:  250, worldCupTitles: 0, worldCupAppearances:  3, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Canada',       tournament: 'WC2022', marketValueM:  250, worldCupTitles: 0, worldCupAppearances:  2, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Uruguay',      tournament: 'WC2022', marketValueM:  260, worldCupTitles: 2, worldCupAppearances: 14, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Japan',        tournament: 'WC2022', marketValueM:  200, worldCupTitles: 0, worldCupAppearances:  7, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Australia',    tournament: 'WC2022', marketValueM:  200, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'South Korea',  tournament: 'WC2022', marketValueM:  150, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Cameroon',     tournament: 'WC2022', marketValueM:  150, worldCupTitles: 0, worldCupAppearances:  8, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Wales',        tournament: 'WC2022', marketValueM:  150, worldCupTitles: 0, worldCupAppearances:  2, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Ecuador',      tournament: 'WC2022', marketValueM:  150, worldCupTitles: 0, worldCupAppearances:  4, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Tunisia',      tournament: 'WC2022', marketValueM:  100, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Ghana',        tournament: 'WC2022', marketValueM:  100, worldCupTitles: 0, worldCupAppearances:  4, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Iran',         tournament: 'WC2022', marketValueM:   80, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Saudi Arabia', tournament: 'WC2022', marketValueM:   80, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Costa Rica',   tournament: 'WC2022', marketValueM:   80, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
  { teamName: 'Qatar',        tournament: 'WC2022', marketValueM:   50, worldCupTitles: 0, worldCupAppearances:  1, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2022-11' },
]

// WM 2018 — alle 32 Teilnehmer; Marktwerte geschätzt (Transfermarkt-Schätzungen, Stand 2018-06)
// ELO-Werte kommen aus den Match-Records, nicht von hier
const WC2018_SNAPSHOTS: HistoricalTeamSnapshot[] = [
  // Gruppe A
  { teamName: 'Russia',       tournament: 'WC2018', marketValueM:  140, worldCupTitles: 0, worldCupAppearances: 10, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Saudi Arabia', tournament: 'WC2018', marketValueM:   55, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Egypt',        tournament: 'WC2018', marketValueM:  100, worldCupTitles: 0, worldCupAppearances:  3, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Uruguay',      tournament: 'WC2018', marketValueM:  280, worldCupTitles: 2, worldCupAppearances: 13, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  // Gruppe B
  { teamName: 'Portugal',     tournament: 'WC2018', marketValueM:  550, worldCupTitles: 0, worldCupAppearances:  7, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Spain',        tournament: 'WC2018', marketValueM:  780, worldCupTitles: 1, worldCupAppearances: 15, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Morocco',      tournament: 'WC2018', marketValueM:   75, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Iran',         tournament: 'WC2018', marketValueM:   45, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  // Gruppe C
  { teamName: 'France',       tournament: 'WC2018', marketValueM:  980, worldCupTitles: 1, worldCupAppearances: 15, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Australia',    tournament: 'WC2018', marketValueM:   85, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Peru',         tournament: 'WC2018', marketValueM:  100, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Denmark',      tournament: 'WC2018', marketValueM:  230, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  // Gruppe D
  { teamName: 'Argentina',    tournament: 'WC2018', marketValueM:  750, worldCupTitles: 2, worldCupAppearances: 17, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Iceland',      tournament: 'WC2018', marketValueM:   65, worldCupTitles: 0, worldCupAppearances:  1, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Croatia',      tournament: 'WC2018', marketValueM:  200, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Nigeria',      tournament: 'WC2018', marketValueM:  120, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  // Gruppe E
  { teamName: 'Brazil',       tournament: 'WC2018', marketValueM:  950, worldCupTitles: 5, worldCupAppearances: 21, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Switzerland',  tournament: 'WC2018', marketValueM:  340, worldCupTitles: 0, worldCupAppearances: 12, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Costa Rica',   tournament: 'WC2018', marketValueM:   55, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Serbia',       tournament: 'WC2018', marketValueM:  180, worldCupTitles: 0, worldCupAppearances: 13, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  // Gruppe F
  { teamName: 'Germany',      tournament: 'WC2018', marketValueM:  850, worldCupTitles: 4, worldCupAppearances: 19, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Mexico',       tournament: 'WC2018', marketValueM:  250, worldCupTitles: 0, worldCupAppearances: 16, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Sweden',       tournament: 'WC2018', marketValueM:  175, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'South Korea',  tournament: 'WC2018', marketValueM:  110, worldCupTitles: 0, worldCupAppearances: 10, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  // Gruppe G
  { teamName: 'Belgium',      tournament: 'WC2018', marketValueM:  700, worldCupTitles: 0, worldCupAppearances: 13, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Panama',       tournament: 'WC2018', marketValueM:   30, worldCupTitles: 0, worldCupAppearances:  1, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Tunisia',      tournament: 'WC2018', marketValueM:   65, worldCupTitles: 0, worldCupAppearances:  5, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'England',      tournament: 'WC2018', marketValueM:  800, worldCupTitles: 1, worldCupAppearances: 15, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  // Gruppe H
  { teamName: 'Poland',       tournament: 'WC2018', marketValueM:  285, worldCupTitles: 0, worldCupAppearances:  9, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Senegal',      tournament: 'WC2018', marketValueM:  150, worldCupTitles: 0, worldCupAppearances:  2, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Colombia',     tournament: 'WC2018', marketValueM:  270, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
  { teamName: 'Japan',        tournament: 'WC2018', marketValueM:  145, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'low', marketValueEstimated: true, marketValueSnapshotDate: '2018-06' },
]

// EURO 2024 — ELO aus Match-Records, Marktwerte geschätzt (Transfermarkt-Archiv, Juni 2024)
const EURO2024_SNAPSHOTS: HistoricalTeamSnapshot[] = [
  { teamName: 'France',         tournament: 'EURO2024', marketValueM:  950, worldCupTitles: 2, worldCupAppearances: 16, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Spain',          tournament: 'EURO2024', marketValueM:  870, worldCupTitles: 1, worldCupAppearances: 16, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'England',        tournament: 'EURO2024', marketValueM:  980, worldCupTitles: 1, worldCupAppearances: 16, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Germany',        tournament: 'EURO2024', marketValueM:  800, worldCupTitles: 4, worldCupAppearances: 20, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Portugal',       tournament: 'EURO2024', marketValueM:  680, worldCupTitles: 0, worldCupAppearances:  8, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Netherlands',    tournament: 'EURO2024', marketValueM:  620, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Italy',          tournament: 'EURO2024', marketValueM:  550, worldCupTitles: 4, worldCupAppearances: 18, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Belgium',        tournament: 'EURO2024', marketValueM:  780, worldCupTitles: 0, worldCupAppearances: 14, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Croatia',        tournament: 'EURO2024', marketValueM:  280, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Switzerland',    tournament: 'EURO2024', marketValueM:  380, worldCupTitles: 0, worldCupAppearances: 12, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Denmark',        tournament: 'EURO2024', marketValueM:  390, worldCupTitles: 0, worldCupAppearances:  6, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Austria',        tournament: 'EURO2024', marketValueM:  270, worldCupTitles: 0, worldCupAppearances:  7, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Turkey',         tournament: 'EURO2024', marketValueM:  230, worldCupTitles: 0, worldCupAppearances:  2, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Serbia',         tournament: 'EURO2024', marketValueM:  360, worldCupTitles: 0, worldCupAppearances: 13, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Scotland',       tournament: 'EURO2024', marketValueM:  210, worldCupTitles: 0, worldCupAppearances:  8, sourceQuality: 'medium', marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Hungary',        tournament: 'EURO2024', marketValueM:   90, worldCupTitles: 0, worldCupAppearances:  9, sourceQuality: 'low',    marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Slovakia',       tournament: 'EURO2024', marketValueM:   95, worldCupTitles: 0, worldCupAppearances:  0, sourceQuality: 'low',    marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Slovenia',       tournament: 'EURO2024', marketValueM:   75, worldCupTitles: 0, worldCupAppearances:  1, sourceQuality: 'low',    marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Romania',        tournament: 'EURO2024', marketValueM:   80, worldCupTitles: 0, worldCupAppearances:  7, sourceQuality: 'low',    marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Ukraine',        tournament: 'EURO2024', marketValueM:  110, worldCupTitles: 0, worldCupAppearances:  3, sourceQuality: 'low',    marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Poland',         tournament: 'EURO2024', marketValueM:  220, worldCupTitles: 0, worldCupAppearances:  9, sourceQuality: 'low',    marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Czech Republic', tournament: 'EURO2024', marketValueM:  120, worldCupTitles: 0, worldCupAppearances:  9, sourceQuality: 'low',    marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Georgia',        tournament: 'EURO2024', marketValueM:   60, worldCupTitles: 0, worldCupAppearances:  0, sourceQuality: 'low',    marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
  { teamName: 'Albania',        tournament: 'EURO2024', marketValueM:   55, worldCupTitles: 0, worldCupAppearances:  0, sourceQuality: 'low',    marketValueEstimated: true, marketValueSource: 'Transfermarkt (estimate)', marketValueSnapshotDate: '2024-06' },
]

export const HISTORICAL_SNAPSHOTS: HistoricalTeamSnapshot[] = [
  ...WC2014_SNAPSHOTS,
  ...WC2018_SNAPSHOTS,
  ...WC2022_SNAPSHOTS,
  ...EURO2024_SNAPSHOTS,
]

export function getHistoricalSnapshot(
  teamName: string,
  tournament: TournamentId
): HistoricalTeamSnapshot | null {
  return HISTORICAL_SNAPSHOTS.find(s => s.teamName === teamName && s.tournament === tournament) ?? null
}
