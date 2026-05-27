import type { DataQualityScore } from './types'

export interface PlayerDataRow {
  market_value_m: number | null
  xg_per90: number | null
  is_in_starting_xi: boolean | null
  age: number | null
  rating: number | null
}

export function computeDataQuality(
  players: PlayerDataRow[],
  eloSource: string | null,
  eloUpdatedAt?: string
): DataQualityScore {
  if (players.length === 0) {
    return { completeness: 0, xgCoverage: 0, eloFreshness: 0.3, lineupSet: false, overall: 0.2, warnings: ['Keine Kaderdaten vorhanden'] }
  }

  const startingXI = players.filter(p => p.is_in_starting_xi)
  const effectivePlayers = startingXI.length >= 11 ? startingXI : players

  const completeness = effectivePlayers.filter(p =>
    (p.market_value_m ?? 0) > 0 && (p.age ?? 0) > 0
  ).length / effectivePlayers.length

  const xgCoverage = effectivePlayers.filter(p => (p.xg_per90 ?? 0) > 0).length / effectivePlayers.length

  const lineupSet = startingXI.length >= 11

  // ELO-Frische: eloratings.net = 0.90, wikipedia = 0.85, manual = 0.65, fallback = 0.55, unbekannt = 0.30
  const eloFreshness = eloSource?.startsWith('eloratings.net') ? 0.90
    : eloSource === 'wikipedia-elo' ? 0.85
    : eloSource === 'manual-text' ? 0.65
    : eloSource === 'fallback-apr2025' ? 0.55
    : 0.30

  const overall = completeness * 0.3 + xgCoverage * 0.3 + eloFreshness * 0.2 + (lineupSet ? 0.2 : 0.0)

  const warnings: string[] = []
  if (!lineupSet) warnings.push('Startelf noch nicht eingetragen — Gesamtkader wird verwendet')
  if (xgCoverage < 0.3) warnings.push(`Nur ${Math.round(xgCoverage * 100)}% der Spieler haben xG-Daten`)
  if (xgCoverage === 0) warnings.push('Keine xG-Statistiken — Saisonform-Faktor entfällt')
  if (eloFreshness < 0.6) warnings.push('ELO-Ratings veraltet oder nicht vorhanden')

  return { completeness, xgCoverage, eloFreshness, lineupSet, overall, warnings }
}
