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
    return {
      completeness: 0, xgCoverage: 0, eloFreshness: 0.3, lineupSet: false,
      overall: 0.2, score: 20, badge: 'Niedrig',
      warnings: ['Keine Kaderdaten vorhanden'],
    }
  }

  const startingXI = players.filter(p => p.is_in_starting_xi)
  const effectivePlayers = startingXI.length >= 11 ? startingXI : players

  // Vollständigkeit: Marktwert + Alter vorhanden
  const completeness = effectivePlayers.filter(p =>
    (p.market_value_m ?? 0) > 0 && (p.age ?? 0) > 0
  ).length / effectivePlayers.length

  // xG-Abdeckung
  const xgCoverage = effectivePlayers.filter(p => (p.xg_per90 ?? 0) > 0).length / effectivePlayers.length

  // Marktwert-Abdeckung (eigener Faktor für Genauigkeit)
  const marketCoverage = effectivePlayers.filter(p => (p.market_value_m ?? 0) > 0).length / effectivePlayers.length

  const lineupSet = startingXI.length >= 11

  // ELO-Frische: eloratings.net = 0.90, wikipedia = 0.85, manual = 0.65, fallback = 0.55, unbekannt = 0.30
  const eloFreshness = eloSource?.startsWith('eloratings.net') ? 0.90
    : eloSource === 'wikipedia-elo' ? 0.85
    : eloSource === 'manual-text' ? 0.65
    : eloSource === 'fallback-apr2025' ? 0.55
    : 0.30

  // Kaderbreite: Penalty für zu kleine Kader
  const squadBonus = players.length >= 20 ? 1.0 : players.length >= 11 ? 0.7 : 0.4

  // Gewichtung: ELO (25%), xG (25%), Marktwert (15%), Startelf (20%), Vollständigkeit (15%)
  const overall = (
    eloFreshness * 0.25 +
    xgCoverage   * 0.25 +
    marketCoverage * 0.15 +
    (lineupSet ? 1 : 0) * 0.20 +
    completeness * 0.15
  ) * squadBonus

  const score = Math.round(Math.min(1, overall) * 100)
  const badge: DataQualityScore['badge'] = score >= 70 ? 'Hoch' : score >= 45 ? 'Mittel' : 'Niedrig'

  const warnings: string[] = []
  if (!lineupSet) warnings.push('Startelf noch nicht eingetragen — Gesamtkader wird verwendet')
  if (xgCoverage < 0.3) warnings.push(`Nur ${Math.round(xgCoverage * 100)}% der Spieler haben xG-Daten`)
  if (xgCoverage === 0) warnings.push('Keine xG-Statistiken — Saisonform-Faktor entfällt')
  if (eloFreshness < 0.6) warnings.push('ELO-Ratings veraltet oder nicht vorhanden')
  if (players.length < 11) warnings.push('Zu wenige Spieler im Kader — Prognose unzuverlässig')

  return { completeness, xgCoverage, eloFreshness, lineupSet, overall, score, badge, warnings }
}
