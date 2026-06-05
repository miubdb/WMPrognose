/**
 * WM 2026 Team Market Values — statische Schätzwerte
 *
 * Quelle: Transfermarkt (Schätzungen Stand 2025-03)
 * WICHTIG: Werden NICHT für die Live-Prognose verwendet.
 * Live-Marktwerte kommen aus sum(players.market_value_m) in der DB.
 * Diese Datei dient nur noch als Fallback / Seed für die wm2026_teams-Tabelle.
 *
 * Teilnehmer: exakt die 48 Teams aus dem Gruppenspielplan (schedule.ts)
 */

export interface WM2026MarketValue {
  teamName: string
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'
  marketValueM: number
  source: string
  snapshotDate: string
  manuallyVerified: boolean
  notes?: string
}

// ─── UEFA (16 Teams) ──────────────────────────────────────────────────────────

const UEFA_TEAMS: WM2026MarketValue[] = [
  { teamName: 'England',                confederation: 'UEFA', marketValueM: 1100, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'France',                 confederation: 'UEFA', marketValueM: 1050, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Spain',                  confederation: 'UEFA', marketValueM:  980, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Germany',                confederation: 'UEFA', marketValueM:  870, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Portugal',               confederation: 'UEFA', marketValueM:  720, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Netherlands',            confederation: 'UEFA', marketValueM:  680, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Belgium',                confederation: 'UEFA', marketValueM:  620, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Switzerland',            confederation: 'UEFA', marketValueM:  420, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Norway',                 confederation: 'UEFA', marketValueM:  230, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Croatia',                confederation: 'UEFA', marketValueM:  220, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Sweden',                 confederation: 'UEFA', marketValueM:  200, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Czechia',                confederation: 'UEFA', marketValueM:  200, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Austria',                confederation: 'UEFA', marketValueM:  290, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Scotland',               confederation: 'UEFA', marketValueM:  180, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Bosnia',                 confederation: 'UEFA', marketValueM:  120, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Turkey',                 confederation: 'UEFA', marketValueM:  300, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── CONMEBOL (6 Teams) ───────────────────────────────────────────────────────

const CONMEBOL_TEAMS: WM2026MarketValue[] = [
  { teamName: 'Brazil',                 confederation: 'CONMEBOL', marketValueM: 1100, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Argentina',              confederation: 'CONMEBOL', marketValueM:  850, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Colombia',               confederation: 'CONMEBOL', marketValueM:  380, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Uruguay',                confederation: 'CONMEBOL', marketValueM:  320, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Ecuador',                confederation: 'CONMEBOL', marketValueM:  220, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Paraguay',               confederation: 'CONMEBOL', marketValueM:  160, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── CONCACAF (6 Teams) ───────────────────────────────────────────────────────

const CONCACAF_TEAMS: WM2026MarketValue[] = [
  { teamName: 'USA',                    confederation: 'CONCACAF', marketValueM:  700, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false, notes: 'Co-host' },
  { teamName: 'Mexico',                 confederation: 'CONCACAF', marketValueM:  380, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false, notes: 'Co-host' },
  { teamName: 'Canada',                 confederation: 'CONCACAF', marketValueM:  320, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false, notes: 'Co-host' },
  { teamName: 'Panama',                 confederation: 'CONCACAF', marketValueM:   60, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Haiti',                  confederation: 'CONCACAF', marketValueM:   15, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Curacao',                confederation: 'CONCACAF', marketValueM:   18, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── CAF (9 Teams) ────────────────────────────────────────────────────────────

const CAF_TEAMS: WM2026MarketValue[] = [
  { teamName: 'Morocco',                confederation: 'CAF', marketValueM:  280, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Senegal',                confederation: 'CAF', marketValueM:  260, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Egypt',                  confederation: 'CAF', marketValueM:  160, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Ivory Coast',            confederation: 'CAF', marketValueM:  200, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Algeria',                confederation: 'CAF', marketValueM:  110, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Ghana',                  confederation: 'CAF', marketValueM:   80, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'South Africa',           confederation: 'CAF', marketValueM:   90, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Tunisia',                confederation: 'CAF', marketValueM:   90, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Cape Verde',             confederation: 'CAF', marketValueM:   22, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Congo DR',               confederation: 'CAF', marketValueM:   35, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── AFC (8 Teams) ────────────────────────────────────────────────────────────

const AFC_TEAMS: WM2026MarketValue[] = [
  { teamName: 'Japan',                  confederation: 'AFC', marketValueM:  300, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'South Korea',            confederation: 'AFC', marketValueM:  220, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Saudi Arabia',           confederation: 'AFC', marketValueM:  160, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Iran',                   confederation: 'AFC', marketValueM:  100, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Australia',              confederation: 'AFC', marketValueM:  150, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Qatar',                  confederation: 'AFC', marketValueM:   60, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Jordan',                 confederation: 'AFC', marketValueM:   45, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Uzbekistan',             confederation: 'AFC', marketValueM:   50, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Iraq',                   confederation: 'AFC', marketValueM:   42, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── OFC (1 Team) ─────────────────────────────────────────────────────────────

const OFC_TEAMS: WM2026MarketValue[] = [
  { teamName: 'New Zealand',            confederation: 'OFC', marketValueM:   55, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── Exports ──────────────────────────────────────────────────────────────────

export const WM2026_MARKET_VALUES: WM2026MarketValue[] = [
  ...UEFA_TEAMS,
  ...CONMEBOL_TEAMS,
  ...CONCACAF_TEAMS,
  ...CAF_TEAMS,
  ...AFC_TEAMS,
  ...OFC_TEAMS,
]

// Totals: UEFA 16 + CONMEBOL 6 + CONCACAF 6 + CAF 10 + AFC 9 + OFC 1 = 48

export function getWM2026MarketValue(teamName: string): WM2026MarketValue | null {
  return WM2026_MARKET_VALUES.find(t => t.teamName === teamName) ?? null
}

export function getWM2026MarketValueM(teamName: string, fallback = 200): number {
  return getWM2026MarketValue(teamName)?.marketValueM ?? fallback
}
