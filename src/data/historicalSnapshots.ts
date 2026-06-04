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

export interface HistoricalTeamSnapshot {
  teamName: string          // entspricht homeTeam/awayTeam in historicalResults
  tournament: TournamentId
  marketValueM?: number     // Kader-Marktwert zum Turnierbeginn (Schätzung)
  worldCupTitles?: number
  worldCupAppearances?: number
  avgAge?: number
  fifaRanking?: number
  sourceQuality: 'high' | 'medium' | 'low' | 'elo_only'
  notes?: string
}

// WM 2022 — Kader-Marktwerte (Schätzungen aus Transfermarkt-Archiv, November 2022)
// ELO-Werte kommen aus den Match-Records, nicht von hier
const WC2022_SNAPSHOTS: HistoricalTeamSnapshot[] = [
  { teamName: 'Brazil',       tournament: 'WC2022', marketValueM: 1200, worldCupTitles: 5, worldCupAppearances: 22, sourceQuality: 'medium' },
  { teamName: 'France',       tournament: 'WC2022', marketValueM: 1150, worldCupTitles: 2, worldCupAppearances: 16, sourceQuality: 'medium' },
  { teamName: 'England',      tournament: 'WC2022', marketValueM: 1050, worldCupTitles: 1, worldCupAppearances: 16, sourceQuality: 'medium' },
  { teamName: 'Belgium',      tournament: 'WC2022', marketValueM:  890, worldCupTitles: 0, worldCupAppearances: 14, sourceQuality: 'medium' },
  { teamName: 'Spain',        tournament: 'WC2022', marketValueM:  840, worldCupTitles: 1, worldCupAppearances: 16, sourceQuality: 'medium' },
  { teamName: 'Germany',      tournament: 'WC2022', marketValueM:  820, worldCupTitles: 4, worldCupAppearances: 20, sourceQuality: 'medium' },
  { teamName: 'Portugal',     tournament: 'WC2022', marketValueM:  800, worldCupTitles: 0, worldCupAppearances: 8,  sourceQuality: 'medium' },
  { teamName: 'Argentina',    tournament: 'WC2022', marketValueM:  760, worldCupTitles: 2, worldCupAppearances: 18, sourceQuality: 'medium' },
  { teamName: 'Netherlands',  tournament: 'WC2022', marketValueM:  700, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'medium' },
  { teamName: 'Denmark',      tournament: 'WC2022', marketValueM:  500, worldCupTitles: 0, worldCupAppearances: 6,  sourceQuality: 'medium' },
  { teamName: 'Switzerland',  tournament: 'WC2022', marketValueM:  450, worldCupTitles: 0, worldCupAppearances: 12, sourceQuality: 'medium' },
  { teamName: 'USA',          tournament: 'WC2022', marketValueM:  400, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'medium' },
  { teamName: 'Croatia',      tournament: 'WC2022', marketValueM:  360, worldCupTitles: 0, worldCupAppearances: 6,  sourceQuality: 'medium' },
  { teamName: 'Poland',       tournament: 'WC2022', marketValueM:  360, worldCupTitles: 0, worldCupAppearances: 9,  sourceQuality: 'medium' },
  { teamName: 'Serbia',       tournament: 'WC2022', marketValueM:  450, worldCupTitles: 0, worldCupAppearances: 13, sourceQuality: 'medium' },
  { teamName: 'Mexico',       tournament: 'WC2022', marketValueM:  350, worldCupTitles: 0, worldCupAppearances: 17, sourceQuality: 'medium' },
  { teamName: 'Morocco',      tournament: 'WC2022', marketValueM:  210, worldCupTitles: 0, worldCupAppearances: 6,  sourceQuality: 'medium' },
  { teamName: 'Senegal',      tournament: 'WC2022', marketValueM:  250, worldCupTitles: 0, worldCupAppearances: 3,  sourceQuality: 'medium' },
  { teamName: 'Canada',       tournament: 'WC2022', marketValueM:  250, worldCupTitles: 0, worldCupAppearances: 2,  sourceQuality: 'medium' },
  { teamName: 'Uruguay',      tournament: 'WC2022', marketValueM:  260, worldCupTitles: 2, worldCupAppearances: 14, sourceQuality: 'medium' },
  { teamName: 'Japan',        tournament: 'WC2022', marketValueM:  200, worldCupTitles: 0, worldCupAppearances: 7,  sourceQuality: 'medium' },
  { teamName: 'Australia',    tournament: 'WC2022', marketValueM:  200, worldCupTitles: 0, worldCupAppearances: 5,  sourceQuality: 'medium' },
  { teamName: 'South Korea',  tournament: 'WC2022', marketValueM:  150, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'medium' },
  { teamName: 'Cameroon',     tournament: 'WC2022', marketValueM:  150, worldCupTitles: 0, worldCupAppearances: 8,  sourceQuality: 'medium' },
  { teamName: 'Wales',        tournament: 'WC2022', marketValueM:  150, worldCupTitles: 0, worldCupAppearances: 2,  sourceQuality: 'medium' },
  { teamName: 'Ecuador',      tournament: 'WC2022', marketValueM:  150, worldCupTitles: 0, worldCupAppearances: 4,  sourceQuality: 'medium' },
  { teamName: 'Tunisia',      tournament: 'WC2022', marketValueM:  100, worldCupTitles: 0, worldCupAppearances: 6,  sourceQuality: 'medium' },
  { teamName: 'Ghana',        tournament: 'WC2022', marketValueM:  100, worldCupTitles: 0, worldCupAppearances: 4,  sourceQuality: 'medium' },
  { teamName: 'Iran',         tournament: 'WC2022', marketValueM:   80, worldCupTitles: 0, worldCupAppearances: 6,  sourceQuality: 'medium' },
  { teamName: 'Saudi Arabia', tournament: 'WC2022', marketValueM:   80, worldCupTitles: 0, worldCupAppearances: 6,  sourceQuality: 'medium' },
  { teamName: 'Costa Rica',   tournament: 'WC2022', marketValueM:   80, worldCupTitles: 0, worldCupAppearances: 5,  sourceQuality: 'medium' },
  { teamName: 'Qatar',        tournament: 'WC2022', marketValueM:   50, worldCupTitles: 0, worldCupAppearances: 1,  sourceQuality: 'medium' },
]

// WM 2018 — nur ELO aus Match-Records verlässlich; Marktwerte grob geschätzt
const WC2018_SNAPSHOTS: HistoricalTeamSnapshot[] = [
  { teamName: 'France',      tournament: 'WC2018', marketValueM:  980, worldCupTitles: 1, worldCupAppearances: 15, sourceQuality: 'low', notes: 'Marktwert geschätzt' },
  { teamName: 'Germany',     tournament: 'WC2018', marketValueM:  850, worldCupTitles: 4, worldCupAppearances: 19, sourceQuality: 'low' },
  { teamName: 'Brazil',      tournament: 'WC2018', marketValueM:  950, worldCupTitles: 5, worldCupAppearances: 21, sourceQuality: 'low' },
  { teamName: 'Spain',       tournament: 'WC2018', marketValueM:  780, worldCupTitles: 1, worldCupAppearances: 15, sourceQuality: 'low' },
  { teamName: 'England',     tournament: 'WC2018', marketValueM:  800, worldCupTitles: 1, worldCupAppearances: 15, sourceQuality: 'low' },
  { teamName: 'Belgium',     tournament: 'WC2018', marketValueM:  700, worldCupTitles: 0, worldCupAppearances: 13, sourceQuality: 'low' },
  { teamName: 'Argentina',   tournament: 'WC2018', marketValueM:  750, worldCupTitles: 2, worldCupAppearances: 17, sourceQuality: 'low' },
  { teamName: 'Portugal',    tournament: 'WC2018', marketValueM:  550, worldCupTitles: 0, worldCupAppearances: 7,  sourceQuality: 'low' },
  { teamName: 'Croatia',     tournament: 'WC2018', marketValueM:  200, worldCupTitles: 0, worldCupAppearances: 5,  sourceQuality: 'low' },
]

// EURO 2024 — ELO aus Match-Records, Marktwerte geschätzt (Juni 2024)
const EURO2024_SNAPSHOTS: HistoricalTeamSnapshot[] = [
  { teamName: 'France',       tournament: 'EURO2024', marketValueM:  950, worldCupTitles: 2, worldCupAppearances: 16, sourceQuality: 'medium' },
  { teamName: 'Spain',        tournament: 'EURO2024', marketValueM:  870, worldCupTitles: 1, worldCupAppearances: 16, sourceQuality: 'medium' },
  { teamName: 'England',      tournament: 'EURO2024', marketValueM:  980, worldCupTitles: 1, worldCupAppearances: 16, sourceQuality: 'medium' },
  { teamName: 'Germany',      tournament: 'EURO2024', marketValueM:  800, worldCupTitles: 4, worldCupAppearances: 20, sourceQuality: 'medium' },
  { teamName: 'Portugal',     tournament: 'EURO2024', marketValueM:  680, worldCupTitles: 0, worldCupAppearances: 8,  sourceQuality: 'medium' },
  { teamName: 'Netherlands',  tournament: 'EURO2024', marketValueM:  620, worldCupTitles: 0, worldCupAppearances: 11, sourceQuality: 'medium' },
  { teamName: 'Italy',        tournament: 'EURO2024', marketValueM:  550, worldCupTitles: 4, worldCupAppearances: 18, sourceQuality: 'medium' },
  { teamName: 'Belgium',      tournament: 'EURO2024', marketValueM:  780, worldCupTitles: 0, worldCupAppearances: 14, sourceQuality: 'medium' },
  { teamName: 'Croatia',      tournament: 'EURO2024', marketValueM:  280, worldCupTitles: 0, worldCupAppearances: 6,  sourceQuality: 'medium' },
  { teamName: 'Switzerland',  tournament: 'EURO2024', marketValueM:  380, worldCupTitles: 0, worldCupAppearances: 12, sourceQuality: 'medium' },
  { teamName: 'Denmark',      tournament: 'EURO2024', marketValueM:  390, worldCupTitles: 0, worldCupAppearances: 6,  sourceQuality: 'medium' },
  { teamName: 'Austria',      tournament: 'EURO2024', marketValueM:  270, worldCupTitles: 0, worldCupAppearances: 7,  sourceQuality: 'medium' },
  { teamName: 'Turkey',       tournament: 'EURO2024', marketValueM:  230, worldCupTitles: 0, worldCupAppearances: 2,  sourceQuality: 'medium' },
  { teamName: 'Serbia',       tournament: 'EURO2024', marketValueM:  360, worldCupTitles: 0, worldCupAppearances: 13, sourceQuality: 'medium' },
  { teamName: 'Scotland',     tournament: 'EURO2024', marketValueM:  210, worldCupTitles: 0, worldCupAppearances: 8,  sourceQuality: 'medium' },
  { teamName: 'Hungary',      tournament: 'EURO2024', marketValueM:   90, worldCupTitles: 0, worldCupAppearances: 9,  sourceQuality: 'low' },
  { teamName: 'Slovakia',     tournament: 'EURO2024', marketValueM:   95, worldCupTitles: 0, worldCupAppearances: 0,  sourceQuality: 'low' },
  { teamName: 'Slovenia',     tournament: 'EURO2024', marketValueM:   75, worldCupTitles: 0, worldCupAppearances: 1,  sourceQuality: 'low' },
  { teamName: 'Romania',      tournament: 'EURO2024', marketValueM:   80, worldCupTitles: 0, worldCupAppearances: 7,  sourceQuality: 'low' },
  { teamName: 'Ukraine',      tournament: 'EURO2024', marketValueM:  110, worldCupTitles: 0, worldCupAppearances: 3,  sourceQuality: 'low' },
  { teamName: 'Poland',       tournament: 'EURO2024', marketValueM:  220, worldCupTitles: 0, worldCupAppearances: 9,  sourceQuality: 'low' },
  { teamName: 'Czech Republic', tournament: 'EURO2024', marketValueM: 120, worldCupTitles: 0, worldCupAppearances: 9,  sourceQuality: 'low' },
  { teamName: 'Georgia',      tournament: 'EURO2024', marketValueM:   60, worldCupTitles: 0, worldCupAppearances: 0,  sourceQuality: 'low' },
  { teamName: 'Albania',      tournament: 'EURO2024', marketValueM:   55, worldCupTitles: 0, worldCupAppearances: 0,  sourceQuality: 'low' },
]

export const HISTORICAL_SNAPSHOTS: HistoricalTeamSnapshot[] = [
  ...WC2022_SNAPSHOTS,
  ...WC2018_SNAPSHOTS,
  ...EURO2024_SNAPSHOTS,
]

export function getHistoricalSnapshot(
  teamName: string,
  tournament: TournamentId
): HistoricalTeamSnapshot | null {
  return HISTORICAL_SNAPSHOTS.find(s => s.teamName === teamName && s.tournament === tournament) ?? null
}
