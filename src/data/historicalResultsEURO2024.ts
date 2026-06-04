/**
 * EURO 2024 Match-Ergebnisse (Deutschland, Juni–Juli 2024)
 *
 * Knockout-Runden: vollständig und verifiziert.
 * Gruppenphase: verifizierte Spiele markiert, Restliche TODO.
 *
 * ELO-Werte: Schätzungen aus eloratings.net (~Mai 2024).
 * Quelle für Ergebnisse: UEFA / Wikipedia.
 *
 * TODO: Fehlende Gruppenspiele ergänzen und Ergebnisse verifizieren.
 * Spiele mit homeGoals/awayGoals = -1 sind Platzhalter und werden
 * im Backtest gefiltert (nur homeGoals >= 0 werden ausgewertet).
 */

import type { HistoricalMatch } from './historicalResults'

// Approximate ELO values (eloratings.net, Mai 2024)
const ELO = {
  France:        2023,
  Spain:         2011,
  England:       1989,
  Germany:       1977,
  Portugal:      1974,
  Netherlands:   1962,
  Italy:         1958,
  Belgium:       1930,
  Croatia:       1921,
  Denmark:       1896,
  Switzerland:   1900,
  Austria:       1836,
  Serbia:        1835,
  Scotland:      1849,
  Turkey:        1812,
  Ukraine:       1818,
  Poland:        1819,
  Czech_Republic: 1815,
  Slovenia:      1787,
  Slovakia:      1759,
  Romania:       1764,
  Hungary:       1765,
  Georgia:       1695,
  Albania:       1707,
}

// Helper type alias for cleaner inline use
type M = HistoricalMatch

export const EURO2024_MATCHES: M[] = [
  // ── Gruppenphase ────────────────────────────────────────────────────────────

  // Gruppe A: Deutschland, Schottland, Ungarn, Schweiz
  { homeTeam: 'Germany',      awayTeam: 'Scotland',       homeGoals: 5, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'A', homeElo: ELO.Germany,     awayElo: ELO.Scotland },
  { homeTeam: 'Hungary',      awayTeam: 'Switzerland',    homeGoals: 1, awayGoals: 3, tournament: 'EURO2024', phase: 'group', group: 'A', homeElo: ELO.Hungary,     awayElo: ELO.Switzerland },
  { homeTeam: 'Germany',      awayTeam: 'Hungary',        homeGoals: 2, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'A', homeElo: ELO.Germany,     awayElo: ELO.Hungary },
  { homeTeam: 'Scotland',     awayTeam: 'Switzerland',    homeGoals: 1, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'A', homeElo: ELO.Scotland,    awayElo: ELO.Switzerland },
  { homeTeam: 'Switzerland',  awayTeam: 'Germany',        homeGoals: 1, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'A', homeElo: ELO.Switzerland, awayElo: ELO.Germany },
  { homeTeam: 'Scotland',     awayTeam: 'Hungary',        homeGoals: 0, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'A', homeElo: ELO.Scotland,    awayElo: ELO.Hungary },

  // Gruppe B: Spanien, Kroatien, Italien, Albanien
  { homeTeam: 'Spain',        awayTeam: 'Croatia',        homeGoals: 3, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'B', homeElo: ELO.Spain,       awayElo: ELO.Croatia },
  { homeTeam: 'Italy',        awayTeam: 'Albania',        homeGoals: 2, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'B', homeElo: ELO.Italy,       awayElo: ELO.Albania },
  { homeTeam: 'Croatia',      awayTeam: 'Albania',        homeGoals: 2, awayGoals: 2, tournament: 'EURO2024', phase: 'group', group: 'B', homeElo: ELO.Croatia,     awayElo: ELO.Albania },
  { homeTeam: 'Spain',        awayTeam: 'Italy',          homeGoals: 1, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'B', homeElo: ELO.Spain,       awayElo: ELO.Italy },
  { homeTeam: 'Croatia',      awayTeam: 'Italy',          homeGoals: 1, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'B', homeElo: ELO.Croatia,     awayElo: ELO.Italy },
  { homeTeam: 'Albania',      awayTeam: 'Spain',          homeGoals: 0, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'B', homeElo: ELO.Albania,     awayElo: ELO.Spain },

  // Gruppe C: Slowenien, Dänemark, Serbien, England
  { homeTeam: 'Slovenia',     awayTeam: 'Denmark',        homeGoals: 1, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'C', homeElo: ELO.Slovenia,    awayElo: ELO.Denmark },
  { homeTeam: 'Serbia',       awayTeam: 'England',        homeGoals: 0, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'C', homeElo: ELO.Serbia,      awayElo: ELO.England },
  { homeTeam: 'Slovenia',     awayTeam: 'Serbia',         homeGoals: 1, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'C', homeElo: ELO.Slovenia,    awayElo: ELO.Serbia },
  { homeTeam: 'Denmark',      awayTeam: 'England',        homeGoals: 1, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'C', homeElo: ELO.Denmark,     awayElo: ELO.England },
  { homeTeam: 'England',      awayTeam: 'Slovenia',       homeGoals: 0, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'C', homeElo: ELO.England,     awayElo: ELO.Slovenia },
  { homeTeam: 'Denmark',      awayTeam: 'Serbia',         homeGoals: 0, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'C', homeElo: ELO.Denmark,     awayElo: ELO.Serbia },

  // Gruppe D: Polen, Niederlande, Österreich, Frankreich
  { homeTeam: 'Poland',       awayTeam: 'Netherlands',    homeGoals: 1, awayGoals: 2, tournament: 'EURO2024', phase: 'group', group: 'D', homeElo: ELO.Poland,      awayElo: ELO.Netherlands },
  { homeTeam: 'Austria',      awayTeam: 'France',         homeGoals: 0, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'D', homeElo: ELO.Austria,     awayElo: ELO.France },
  { homeTeam: 'Poland',       awayTeam: 'Austria',        homeGoals: 1, awayGoals: 3, tournament: 'EURO2024', phase: 'group', group: 'D', homeElo: ELO.Poland,      awayElo: ELO.Austria },
  { homeTeam: 'Netherlands',  awayTeam: 'France',         homeGoals: 0, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'D', homeElo: ELO.Netherlands, awayElo: ELO.France },
  { homeTeam: 'Netherlands',  awayTeam: 'Austria',        homeGoals: 2, awayGoals: 3, tournament: 'EURO2024', phase: 'group', group: 'D', homeElo: ELO.Netherlands, awayElo: ELO.Austria },
  { homeTeam: 'France',       awayTeam: 'Poland',         homeGoals: 1, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'D', homeElo: ELO.France,      awayElo: ELO.Poland },

  // Gruppe E: Belgien, Slowakei, Rumänien, Ukraine
  { homeTeam: 'Romania',      awayTeam: 'Ukraine',        homeGoals: 3, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'E', homeElo: ELO.Romania,     awayElo: ELO.Ukraine },
  { homeTeam: 'Belgium',      awayTeam: 'Slovakia',       homeGoals: 0, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'E', homeElo: ELO.Belgium,     awayElo: ELO.Slovakia },
  { homeTeam: 'Slovakia',     awayTeam: 'Ukraine',        homeGoals: 1, awayGoals: 2, tournament: 'EURO2024', phase: 'group', group: 'E', homeElo: ELO.Slovakia,    awayElo: ELO.Ukraine },
  { homeTeam: 'Belgium',      awayTeam: 'Romania',        homeGoals: 2, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'E', homeElo: ELO.Belgium,     awayElo: ELO.Romania },
  { homeTeam: 'Slovakia',     awayTeam: 'Romania',        homeGoals: 1, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'E', homeElo: ELO.Slovakia,    awayElo: ELO.Romania },
  { homeTeam: 'Ukraine',      awayTeam: 'Belgium',        homeGoals: 0, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'E', homeElo: ELO.Ukraine,     awayElo: ELO.Belgium },

  // Gruppe F: Türkei, Georgien, Portugal, Tschechien
  { homeTeam: 'Turkey',         awayTeam: 'Georgia',        homeGoals: 3, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'F', homeElo: ELO.Turkey,          awayElo: ELO.Georgia },
  { homeTeam: 'Portugal',       awayTeam: 'Czech Republic', homeGoals: 2, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'F', homeElo: ELO.Portugal,        awayElo: ELO.Czech_Republic },
  { homeTeam: 'Georgia',        awayTeam: 'Czech Republic', homeGoals: 1, awayGoals: 1, tournament: 'EURO2024', phase: 'group', group: 'F', homeElo: ELO.Georgia,         awayElo: ELO.Czech_Republic },
  { homeTeam: 'Turkey',         awayTeam: 'Portugal',       homeGoals: 0, awayGoals: 3, tournament: 'EURO2024', phase: 'group', group: 'F', homeElo: ELO.Turkey,          awayElo: ELO.Portugal },
  { homeTeam: 'Czech Republic', awayTeam: 'Turkey',         homeGoals: 1, awayGoals: 2, tournament: 'EURO2024', phase: 'group', group: 'F', homeElo: ELO.Czech_Republic,  awayElo: ELO.Turkey },
  { homeTeam: 'Georgia',        awayTeam: 'Portugal',       homeGoals: 2, awayGoals: 0, tournament: 'EURO2024', phase: 'group', group: 'F', homeElo: ELO.Georgia,         awayElo: ELO.Portugal },

  // ── Achtelfinale (Round of 16) ───────────────────────────────────────────────

  { homeTeam: 'Switzerland',  awayTeam: 'Italy',        homeGoals: 2, awayGoals: 0, tournament: 'EURO2024', phase: 'round16', homeElo: ELO.Switzerland, awayElo: ELO.Italy },
  { homeTeam: 'Germany',      awayTeam: 'Denmark',      homeGoals: 2, awayGoals: 0, tournament: 'EURO2024', phase: 'round16', homeElo: ELO.Germany,     awayElo: ELO.Denmark },
  { homeTeam: 'Spain',        awayTeam: 'Georgia',      homeGoals: 4, awayGoals: 1, tournament: 'EURO2024', phase: 'round16', homeElo: ELO.Spain,       awayElo: ELO.Georgia },
  { homeTeam: 'France',       awayTeam: 'Belgium',      homeGoals: 1, awayGoals: 0, tournament: 'EURO2024', phase: 'round16', homeElo: ELO.France,      awayElo: ELO.Belgium },
  { homeTeam: 'Portugal',     awayTeam: 'Slovenia',     homeGoals: 0, awayGoals: 0, penaltyWinner: 'home', tournament: 'EURO2024', phase: 'round16', homeElo: ELO.Portugal,    awayElo: ELO.Slovenia },
  { homeTeam: 'England',      awayTeam: 'Slovakia',     homeGoals: 2, awayGoals: 1, tournament: 'EURO2024', phase: 'round16', homeElo: ELO.England,     awayElo: ELO.Slovakia },
  { homeTeam: 'Austria',      awayTeam: 'Turkey',       homeGoals: 1, awayGoals: 2, tournament: 'EURO2024', phase: 'round16', homeElo: ELO.Austria,     awayElo: ELO.Turkey },
  { homeTeam: 'Netherlands',  awayTeam: 'Romania',      homeGoals: 3, awayGoals: 0, tournament: 'EURO2024', phase: 'round16', homeElo: ELO.Netherlands, awayElo: ELO.Romania },

  // ── Viertelfinale ────────────────────────────────────────────────────────────

  { homeTeam: 'Spain',        awayTeam: 'Germany',      homeGoals: 2, awayGoals: 1, tournament: 'EURO2024', phase: 'quarter', homeElo: ELO.Spain,       awayElo: ELO.Germany },
  { homeTeam: 'Portugal',     awayTeam: 'France',       homeGoals: 0, awayGoals: 0, penaltyWinner: 'away', tournament: 'EURO2024', phase: 'quarter', homeElo: ELO.Portugal,    awayElo: ELO.France },
  { homeTeam: 'England',      awayTeam: 'Switzerland',  homeGoals: 1, awayGoals: 1, penaltyWinner: 'home', tournament: 'EURO2024', phase: 'quarter', homeElo: ELO.England,     awayElo: ELO.Switzerland },
  { homeTeam: 'Netherlands',  awayTeam: 'Turkey',       homeGoals: 2, awayGoals: 1, tournament: 'EURO2024', phase: 'quarter', homeElo: ELO.Netherlands, awayElo: ELO.Turkey },

  // ── Halbfinale ───────────────────────────────────────────────────────────────

  { homeTeam: 'Spain',        awayTeam: 'France',       homeGoals: 2, awayGoals: 1, tournament: 'EURO2024', phase: 'semi', homeElo: ELO.Spain,       awayElo: ELO.France },
  { homeTeam: 'Netherlands',  awayTeam: 'England',      homeGoals: 1, awayGoals: 2, tournament: 'EURO2024', phase: 'semi', homeElo: ELO.Netherlands, awayElo: ELO.England },

  // ── Finale ───────────────────────────────────────────────────────────────────

  { homeTeam: 'Spain',        awayTeam: 'England',      homeGoals: 2, awayGoals: 1, tournament: 'EURO2024', phase: 'final', homeElo: ELO.Spain,       awayElo: ELO.England },
]
