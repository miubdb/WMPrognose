import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { SquadSummary } from '@/lib/modelAdapter'

// Normalisiert einen Wert auf 0–100. invert=true: niedrigerer Wert = besser.
function norm100(v: number, min: number, max: number, invert = false): number {
  const ratio = Math.max(0, Math.min(1, (v - min) / (max - min)))
  return (invert ? 1 - ratio : ratio) * 100
}

// Composite-Defensiv-Score für einen DEF- oder GK-Spieler (0–100)
// Gibt null zurück wenn nicht genug Daten vorhanden (< 40% Gewicht befüllt)
function playerDefScore(
  pos: string,
  xga: number | null,
  tackles: number | null,
  clearances: number | null,
  gc: number | null,
): number | null {
  let score = 0, w = 0
  if ((xga ?? 0) > 0) {
    score += norm100(xga!, 0.5, 2.5, true) * 0.5   // xGA niedrig = gut
    w += 0.5
  }
  if (pos === 'DEF') {
    if ((tackles ?? 0) > 0)    { score += norm100(tackles!, 0.5, 4.0) * 0.3; w += 0.3 }
    if ((clearances ?? 0) > 0) { score += norm100(clearances!, 1.0, 9.0) * 0.2; w += 0.2 }
  }
  if (pos === 'GK' && (gc ?? 0) > 0) {
    score += norm100(gc!, 0.3, 2.0, true) * 0.5     // GK: GC niedrig = gut
    w += 0.5
  }
  return w >= 0.4 ? score / w : null
}

export async function GET() {
  // Supabase-JS limit=2000 damit alle 1248 Spieler geladen werden (Standard-Limit: 1000)
  const [squadRes, eloRes, resultsRes] = await Promise.all([
    supabase.from('players')
      .select('team_id, market_value_m, position, xg_per90, xa_per90, xga_per90, tackles_per90, clearances_per90, goals_conceded_per90')
      .limit(2000),
    supabase.from('team_elo_ratings').select('team_id, elo_rating, elo_delta_1y'),
    supabase.from('match_results').select('match_id, goals_a, goals_b'),
  ])

  const squadData: Record<string, SquadSummary> = {}

  // Akkumulatoren — market-value-gewichtet
  type WSum = { vw: number; w: number }
  const atk:  Record<string, { xg: WSum; xa: WSum }> = {}
  const def:  Record<string, WSum> = {}
  const defSc:Record<string, WSum> = {}

  for (const row of squadRes.data ?? []) {
    const tid = row.team_id
    const mv  = Math.max(0.1, row.market_value_m ?? 0.1)
    if (!squadData[tid]) squadData[tid] = { count: 0, totalMarketValueM: 0 }
    squadData[tid].count++
    squadData[tid].totalMarketValueM += row.market_value_m ?? 0

    if (row.position === 'FWD' || row.position === 'MID') {
      if (!atk[tid]) atk[tid] = { xg: { vw: 0, w: 0 }, xa: { vw: 0, w: 0 } }
      if ((row.xg_per90 ?? 0) > 0) { atk[tid].xg.vw += row.xg_per90! * mv; atk[tid].xg.w += mv }
      if ((row.xa_per90 ?? 0) > 0) { atk[tid].xa.vw += row.xa_per90! * mv; atk[tid].xa.w += mv }
    }

    if (row.position === 'DEF' || row.position === 'GK') {
      if ((row.xga_per90 ?? 0) > 0) {
        if (!def[tid]) def[tid] = { vw: 0, w: 0 }
        def[tid].vw += row.xga_per90! * mv; def[tid].w += mv
      }
      const ds = playerDefScore(row.position, row.xga_per90, row.tackles_per90, row.clearances_per90, row.goals_conceded_per90)
      if (ds !== null) {
        if (!defSc[tid]) defSc[tid] = { vw: 0, w: 0 }
        defSc[tid].vw += ds * mv; defSc[tid].w += mv
      }
    }
  }

  for (const tid of Object.keys(squadData)) {
    if (atk[tid]?.xg.w  > 0) squadData[tid].avgXgPer90Attack   = atk[tid].xg.vw  / atk[tid].xg.w
    if (atk[tid]?.xa.w  > 0) squadData[tid].avgXaPer90Attack   = atk[tid].xa.vw  / atk[tid].xa.w
    if (def[tid]?.w      > 0) squadData[tid].avgXgaPer90Defense = def[tid].vw     / def[tid].w
    if (defSc[tid]?.w    > 0) squadData[tid].avgDefenseScore    = defSc[tid].vw   / defSc[tid].w
  }

  // ELO aus Supabase (täglicher CSV-Import) + langfristiger Trend-Bonus (20% von elo_delta_1y)
  // Kein temporärer Form-Bonus: der tagesaktuelle ELO-Import enthält Spielergebnisse bereits
  const eloOverrides: Record<string, number> = {}
  for (const row of eloRes.data ?? []) {
    const delta = (row as { elo_delta_1y?: number | null }).elo_delta_1y ?? 0
    eloOverrides[row.team_id] = row.elo_rating + Math.round(delta * 0.2)
  }

  const results: Record<string, { goals_a: number; goals_b: number }> = {}
  for (const row of resultsRes.data ?? []) {
    results[row.match_id] = { goals_a: row.goals_a, goals_b: row.goals_b }
  }

  return NextResponse.json({ squadData, eloOverrides, results })
}
