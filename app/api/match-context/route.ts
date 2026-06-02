import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { SquadSummary } from '@/lib/modelAdapter'

export async function GET() {
  const [squadRes, eloRes, resultsRes] = await Promise.all([
    supabase.from('players').select('team_id, market_value_m, position, xg_per90, xga_per90'),
    supabase.from('team_elo_ratings').select('team_id, elo_rating, elo_delta_1y, source'),
    supabase.from('match_results').select('match_id, goals_a, goals_b'),
  ])

  const squadData: Record<string, SquadSummary> = {}
  const xgAttackSums: Record<string, { sum: number; count: number }> = {}
  const xgaDefenseSums: Record<string, { sum: number; count: number }> = {}

  for (const row of squadRes.data ?? []) {
    const tid = row.team_id
    if (!squadData[tid]) squadData[tid] = { count: 0, totalMarketValueM: 0 }
    squadData[tid].count++
    squadData[tid].totalMarketValueM += row.market_value_m ?? 0

    // xG attack (FWD + MID)
    if ((row.position === 'FWD' || row.position === 'MID') && row.xg_per90 != null && row.xg_per90 > 0) {
      if (!xgAttackSums[tid]) xgAttackSums[tid] = { sum: 0, count: 0 }
      xgAttackSums[tid].sum += row.xg_per90
      xgAttackSums[tid].count++
    }

    // xGA defense (DEF + GK)
    if ((row.position === 'DEF' || row.position === 'GK') && row.xga_per90 != null && row.xga_per90 > 0) {
      if (!xgaDefenseSums[tid]) xgaDefenseSums[tid] = { sum: 0, count: 0 }
      xgaDefenseSums[tid].sum += row.xga_per90
      xgaDefenseSums[tid].count++
    }
  }

  // Attach averages
  for (const tid of Object.keys(squadData)) {
    if (xgAttackSums[tid]?.count > 0) {
      squadData[tid].avgXgPer90Attack = xgAttackSums[tid].sum / xgAttackSums[tid].count
    }
    if (xgaDefenseSums[tid]?.count > 0) {
      squadData[tid].avgXgaPer90Defense = xgaDefenseSums[tid].sum / xgaDefenseSums[tid].count
    }
  }

  const eloOverrides: Record<string, number> = {}
  for (const row of eloRes.data ?? []) {
    // Bei Live-Turnier-ELO keinen Form-Bonus addieren — das ELO spiegelt bereits reale Ergebnisse wider
    const formBonus = row.source === 'tournament-result'
      ? 0
      : Math.round(((row as { elo_delta_1y?: number | null }).elo_delta_1y ?? 0) * 0.2)
    eloOverrides[row.team_id] = row.elo_rating + formBonus
  }

  const results: Record<string, { goals_a: number; goals_b: number }> = {}
  for (const row of resultsRes.data ?? []) results[row.match_id] = { goals_a: row.goals_a, goals_b: row.goals_b }

  return NextResponse.json({ squadData, eloOverrides, results })
}
