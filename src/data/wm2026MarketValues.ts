/**
 * WM 2026 Team Market Values
 *
 * Tracking structure for squad market values at tournament time.
 * Source: Transfermarkt (https://www.transfermarkt.de)
 *
 * WICHTIG: Werte müssen vor dem Turnier (Mai/Juni 2026) aktualisiert werden.
 * Aktueller Stand: Schätzungen basierend auf Transfermarkt-Daten 2025.
 *
 * Confederation slots WM 2026: UEFA 16, CONMEBOL 6, CONCACAF 6, CAF 9, AFC 8, OFC 1, Playoff 2
 */

export interface WM2026MarketValue {
  teamName: string
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'
  marketValueM: number        // EUR millions — Kader-Gesamtmarktwert
  source: string              // z.B. "Transfermarkt"
  snapshotDate: string        // ISO YYYY-MM — wann der Wert erfasst wurde
  manuallyVerified: boolean   // true = aus Quelle direkt entnommen, false = Schätzung
  notes?: string
}

// ─── UEFA ──────────────────────────────────────────────────────────────────────

const UEFA_TEAMS: WM2026MarketValue[] = [
  { teamName: 'England',      confederation: 'UEFA',     marketValueM: 1100, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'France',       confederation: 'UEFA',     marketValueM: 1050, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Spain',        confederation: 'UEFA',     marketValueM:  980, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Germany',      confederation: 'UEFA',     marketValueM:  870, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Portugal',     confederation: 'UEFA',     marketValueM:  720, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Netherlands',  confederation: 'UEFA',     marketValueM:  680, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Belgium',      confederation: 'UEFA',     marketValueM:  620, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Italy',        confederation: 'UEFA',     marketValueM:  560, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Switzerland',  confederation: 'UEFA',     marketValueM:  420, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Denmark',      confederation: 'UEFA',     marketValueM:  400, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Croatia',      confederation: 'UEFA',     marketValueM:  310, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Austria',      confederation: 'UEFA',     marketValueM:  290, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Serbia',       confederation: 'UEFA',     marketValueM:  380, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Türkiye',      confederation: 'UEFA',     marketValueM:  300, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Scotland',     confederation: 'UEFA',     marketValueM:  220, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Hungary',      confederation: 'UEFA',     marketValueM:  130, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── CONMEBOL ─────────────────────────────────────────────────────────────────

const CONMEBOL_TEAMS: WM2026MarketValue[] = [
  { teamName: 'Brazil',       confederation: 'CONMEBOL', marketValueM: 1100, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Argentina',    confederation: 'CONMEBOL', marketValueM:  850, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Colombia',     confederation: 'CONMEBOL', marketValueM:  380, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Uruguay',      confederation: 'CONMEBOL', marketValueM:  320, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Ecuador',      confederation: 'CONMEBOL', marketValueM:  220, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Paraguay',     confederation: 'CONMEBOL', marketValueM:  160, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── CONCACAF ─────────────────────────────────────────────────────────────────

const CONCACAF_TEAMS: WM2026MarketValue[] = [
  { teamName: 'USA',          confederation: 'CONCACAF', marketValueM:  700, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false, notes: 'Co-host' },
  { teamName: 'Mexico',       confederation: 'CONCACAF', marketValueM:  380, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false, notes: 'Co-host' },
  { teamName: 'Canada',       confederation: 'CONCACAF', marketValueM:  320, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false, notes: 'Co-host' },
  { teamName: 'Honduras',     confederation: 'CONCACAF', marketValueM:   55, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Costa Rica',   confederation: 'CONCACAF', marketValueM:   70, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Panama',       confederation: 'CONCACAF', marketValueM:   60, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── CAF ──────────────────────────────────────────────────────────────────────

const CAF_TEAMS: WM2026MarketValue[] = [
  { teamName: 'Morocco',      confederation: 'CAF',      marketValueM:  280, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Senegal',      confederation: 'CAF',      marketValueM:  260, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Nigeria',      confederation: 'CAF',      marketValueM:  210, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Egypt',        confederation: 'CAF',      marketValueM:  160, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Ivory Coast',  confederation: 'CAF',      marketValueM:  200, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Mali',         confederation: 'CAF',      marketValueM:  130, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'South Africa', confederation: 'CAF',      marketValueM:   90, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Cameroon',     confederation: 'CAF',      marketValueM:  120, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Algeria',      confederation: 'CAF',      marketValueM:  110, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── AFC ──────────────────────────────────────────────────────────────────────

const AFC_TEAMS: WM2026MarketValue[] = [
  { teamName: 'Japan',        confederation: 'AFC',      marketValueM:  300, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'South Korea',  confederation: 'AFC',      marketValueM:  220, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Saudi Arabia', confederation: 'AFC',      marketValueM:  160, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Iran',         confederation: 'AFC',      marketValueM:  100, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Australia',    confederation: 'AFC',      marketValueM:  150, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Qatar',        confederation: 'AFC',      marketValueM:   60, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Jordan',       confederation: 'AFC',      marketValueM:   45, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
  { teamName: 'Uzbekistan',   confederation: 'AFC',      marketValueM:   50, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
]

// ─── OFC ──────────────────────────────────────────────────────────────────────

const OFC_TEAMS: WM2026MarketValue[] = [
  { teamName: 'New Zealand',  confederation: 'OFC',      marketValueM:   55, source: 'Transfermarkt', snapshotDate: '2025-03', manuallyVerified: false },
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

export function getWM2026MarketValue(teamName: string): WM2026MarketValue | null {
  return WM2026_MARKET_VALUES.find(t => t.teamName === teamName) ?? null
}

export function getWM2026MarketValueM(teamName: string, fallback = 200): number {
  return getWM2026MarketValue(teamName)?.marketValueM ?? fallback
}
