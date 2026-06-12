/**
 * Zentrale Squad-Berechnungsfunktion — Single Source of Truth.
 * Wird verwendet von:
 *   - app/api/match-context/route.ts  (alle Teams, API)
 *   - app/matches/[id]/page.tsx       (2 Teams, SSR, Starting-XI-Filter vor dem Aufruf)
 *   - app/api/simulate/route.ts       (alle Teams, Simulation)
 */
import type { SquadSummary } from '@/lib/modelAdapter'

export type PlayerForSquad = {
  position: string | null
  market_value_m: number | null
  xg_per90?: number | null
  xa_per90?: number | null
  xga_per90?: number | null
  tackles_per90?: number | null
  clearances_per90?: number | null
  goals_conceded_per90?: number | null
  age?: number | null
  sofascore_rating?: number | null  // Sofascore match rating 1–10 (separate from legacy 0-100 rating)
  goals?: number | null             // Turniertore (WM 2026)
}

function norm100(v: number, min: number, max: number, invert = false): number {
  const ratio = Math.max(0, Math.min(1, (v - min) / (max - min)))
  return (invert ? 1 - ratio : ratio) * 100
}

function playerDefScore(
  pos: string,
  xga: number | null,
  tackles: number | null,
  clearances: number | null,
  gc: number | null,
): number | null {
  let score = 0, w = 0
  // xGA niedrig = besser (für DEF und GK)
  if ((xga ?? 0) > 0) { score += norm100(xga!, 0.5, 2.5, true) * 0.5; w += 0.5 }
  if (pos === 'DEF') {
    if ((tackles ?? 0) > 0)    { score += norm100(tackles!, 0.5, 4.0) * 0.3; w += 0.3 }
    if ((clearances ?? 0) > 0) { score += norm100(clearances!, 1.0, 9.0) * 0.2; w += 0.2 }
  }
  // GK: GC niedrig = besser
  if (pos === 'GK' && (gc ?? 0) > 0) { score += norm100(gc!, 0.3, 2.0, true) * 0.5; w += 0.5 }
  return w >= 0.4 ? score / w : null
}

/**
 * Berechnet SquadSummary aus einem Spieler-Array.
 * Alle Aggregationen sind market-value-gewichtet.
 * dataQuality wird NICHT berechnet (Aufgabe des Aufrufers, wenn ELO-Quelle bekannt ist).
 *
 * Positionslogik:
 *   FWD / MID (offensiv) → xG/90, xA/90
 *   DEF / GK             → xGA/90, Composite-Defensiv-Score (Tackles, Clearances, GC)
 */
export function computeSquadSummary(players: PlayerForSquad[]): Omit<SquadSummary, 'dataQuality'> {
  const summary: Omit<SquadSummary, 'dataQuality'> = {
    count: players.length,
    totalMarketValueM: players.reduce((s, p) => s + (p.market_value_m ?? 0), 0),
  }

  type WSum = { vw: number; w: number }
  const atk: { xg: WSum; xa: WSum } = { xg: { vw: 0, w: 0 }, xa: { vw: 0, w: 0 } }
  const def: WSum  = { vw: 0, w: 0 }
  const defSc: WSum = { vw: 0, w: 0 }

  for (const p of players) {
    const mv  = Math.max(0.1, p.market_value_m ?? 0.1)
    const pos = p.position ?? ''

    if (pos === 'FWD' || pos === 'MID') {
      if ((p.xg_per90 ?? 0) > 0) { atk.xg.vw += p.xg_per90! * mv; atk.xg.w += mv }
      if ((p.xa_per90 ?? 0) > 0) { atk.xa.vw += p.xa_per90! * mv; atk.xa.w += mv }
    }

    if (pos === 'DEF' || pos === 'GK') {
      if ((p.xga_per90 ?? 0) > 0) { def.vw += p.xga_per90! * mv; def.w += mv }
      const ds = playerDefScore(
        pos,
        p.xga_per90 ?? null,
        p.tackles_per90 ?? null,
        p.clearances_per90 ?? null,
        p.goals_conceded_per90 ?? null,
      )
      if (ds !== null) { defSc.vw += ds * mv; defSc.w += mv }
    }
  }

  if (atk.xg.w > 0) summary.avgXgPer90Attack   = atk.xg.vw / atk.xg.w
  if (atk.xa.w > 0) summary.avgXaPer90Attack   = atk.xa.vw / atk.xa.w
  if (def.w     > 0) summary.avgXgaPer90Defense = def.vw     / def.w
  if (defSc.w   > 0) summary.avgDefenseScore    = defSc.vw   / defSc.w

  const aged = players.filter(p => (p.age ?? 0) > 0)
  if (aged.length > 0) summary.avgAge = aged.reduce((s, p) => s + p.age!, 0) / aged.length

  // Sofascore match rating — simple average of players with a rating (> 0)
  const rated = players.filter(p => (p.sofascore_rating ?? 0) > 0)
  if (rated.length >= 5) summary.avgMatchRating = rated.reduce((s, p) => s + p.sofascore_rating!, 0) / rated.length

  // Turniertore der effektiven Spieler — Torschützen-in-Form-Signal
  summary.tournamentGoals = players.reduce((s, p) => s + (p.goals ?? 0), 0)

  return summary
}
