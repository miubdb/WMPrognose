/**
 * Bookmaker Odds Structure
 *
 * Typ-Definitionen für Buchmacher-Quoten als Benchmark.
 * Odds im Dezimalformat (europäisch): 1.X
 *
 * Verwendung: Vergleich Modellwahrscheinlichkeiten vs. implizierte Buchmacherwahrscheinlichkeiten
 * → wenn Modell besser als Buchmacher → positiver Erwartungswert
 * → Calibration Check: |implied - modelProb| < 0.03 = gut kalibriert
 */

// ─── Typen ───────────────────────────────────────────────────────────────────

export interface MatchOdds {
  matchId: string        // z.B. "WM2026-A1-GER-FRA" (freiformat, muss zu Match passen)
  tournament: string     // z.B. "WM2026", "WM2022"
  homeTeam: string
  awayTeam: string
  matchDate: string      // ISO YYYY-MM-DD

  // Beste verfügbare Quoten (Dezimalformat, z.B. 2.40)
  oddsHome: number
  oddsDraw: number
  oddsAway: number

  // Implizierte Wahrscheinlichkeiten nach Margenbereinigung
  impliedHome?: number
  impliedDraw?: number
  impliedAway?: number

  bookmaker: string      // z.B. "Pinnacle", "bet365", "Betway"
  source: string         // z.B. "oddsportal.com", "manuell"
  capturedAt?: string    // ISO YYYY-MM-DD wann erfasst
  notes?: string
}

/** Für Ensemble-/Modell-Vergleich: Modellprobs + Buchmacherprobs nebeneinander */
export interface OddsComparison {
  odds: MatchOdds
  modelProbHome: number
  modelProbDraw: number
  modelProbAway: number
  edgeHome: number  // modelProb - impliedProb (positiv = Modell überschätzt, negativ = Value)
  edgeDraw: number
  edgeAway: number
  bestBet: 'home' | 'draw' | 'away' | 'none'  // größte negative Edge
  maxEdge: number  // Absolutbetrag der stärksten Edge
}

// ─── Margenbereinigung ────────────────────────────────────────────────────────

/** Einfache Normalisierung (Marge wird proportional verteilt) */
export function removeMarginSimple(oddsHome: number, oddsDraw: number, oddsAway: number): {
  home: number; draw: number; away: number
} {
  const rawHome = 1 / oddsHome
  const rawDraw = 1 / oddsDraw
  const rawAway = 1 / oddsAway
  const sum = rawHome + rawDraw + rawAway
  return {
    home: rawHome / sum,
    draw: rawDraw / sum,
    away: rawAway / sum,
  }
}

/** Berechne implizierte Wahrscheinlichkeiten und füge sie dem Objekt hinzu */
export function withImplied(odds: MatchOdds): MatchOdds {
  const imp = removeMarginSimple(odds.oddsHome, odds.oddsDraw, odds.oddsAway)
  return {
    ...odds,
    impliedHome: imp.home,
    impliedDraw: imp.draw,
    impliedAway: imp.away,
  }
}

/** Margin (Overround) in Prozent */
export function computeMargin(oddsHome: number, oddsDraw: number, oddsAway: number): number {
  return (1 / oddsHome + 1 / oddsDraw + 1 / oddsAway - 1) * 100
}

// ─── Vergleich ────────────────────────────────────────────────────────────────

export function compareOdds(
  odds: MatchOdds,
  modelProbHome: number,
  modelProbDraw: number,
  modelProbAway: number
): OddsComparison {
  const o = withImplied(odds)
  const iH = o.impliedHome ?? 1 / 3
  const iD = o.impliedDraw ?? 1 / 3
  const iA = o.impliedAway ?? 1 / 3

  const edgeHome = modelProbHome - iH
  const edgeDraw = modelProbDraw - iD
  const edgeAway = modelProbAway - iA

  // Value-Bet: Modell deutlich unter Buchmacher (Modell schätzt Ereignis seltener → Wett-Value)
  const edges = [
    { side: 'home' as const, e: -edgeHome },
    { side: 'draw' as const, e: -edgeDraw },
    { side: 'away' as const, e: -edgeAway },
  ]
  const best = edges.sort((a, b) => b.e - a.e)[0]
  const bestBet = best.e > 0.03 ? best.side : 'none'

  return {
    odds: o,
    modelProbHome, modelProbDraw, modelProbAway,
    edgeHome, edgeDraw, edgeAway,
    bestBet,
    maxEdge: Math.max(Math.abs(edgeHome), Math.abs(edgeDraw), Math.abs(edgeAway)),
  }
}

// ─── Historische Quoten (leer — als Vorlage) ──────────────────────────────────

/**
 * Hier historische Buchmacherquoten eintragen wenn verfügbar.
 * Reihenfolge: neueste Turniere zuerst.
 * Format: matchId = "{TOURNAMENT}-{HOMEABBR}-{AWAYABBR}"
 */
export const HISTORICAL_ODDS: MatchOdds[] = [
  // Beispiel — zum Befüllen:
  // {
  //   matchId: 'WM2022-ARG-FRA',
  //   tournament: 'WM2022',
  //   homeTeam: 'Argentina',
  //   awayTeam: 'France',
  //   matchDate: '2022-12-18',
  //   oddsHome: 2.35,
  //   oddsDraw: 3.40,
  //   oddsAway: 2.90,
  //   bookmaker: 'Pinnacle',
  //   source: 'oddsportal.com',
  //   capturedAt: '2022-12-17',
  // },
]

export const WM2026_ODDS: MatchOdds[] = [
  // Wird während des Turniers befüllt
]
