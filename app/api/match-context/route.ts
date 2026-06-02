import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { SquadSummary } from '@/lib/modelAdapter'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { TEAM_BY_ID } from '@/src/data/allTeams'

// ELO-Bonus für das letzte Turnierergebnis (vorläufig, bis CSV-Import den echten Wert liefert)
const FORM_BONUS_ELO = 30

export async function GET() {
  const [squadRes, eloRes, resultsRes] = await Promise.all([
    supabase.from('players').select('team_id, market_value_m, position, xg_per90, xga_per90'),
    supabase.from('team_elo_ratings').select('team_id, elo_rating, elo_delta_1y'),
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

    if ((row.position === 'FWD' || row.position === 'MID') && row.xg_per90 != null && row.xg_per90 > 0) {
      if (!xgAttackSums[tid]) xgAttackSums[tid] = { sum: 0, count: 0 }
      xgAttackSums[tid].sum += row.xg_per90
      xgAttackSums[tid].count++
    }
    if ((row.position === 'DEF' || row.position === 'GK') && row.xga_per90 != null && row.xga_per90 > 0) {
      if (!xgaDefenseSums[tid]) xgaDefenseSums[tid] = { sum: 0, count: 0 }
      xgaDefenseSums[tid].sum += row.xga_per90
      xgaDefenseSums[tid].count++
    }
  }

  for (const tid of Object.keys(squadData)) {
    if (xgAttackSums[tid]?.count > 0)
      squadData[tid].avgXgPer90Attack = xgAttackSums[tid].sum / xgAttackSums[tid].count
    if (xgaDefenseSums[tid]?.count > 0)
      squadData[tid].avgXgaPer90Defense = xgaDefenseSums[tid].sum / xgaDefenseSums[tid].count
  }

  // Basis-ELO aus Supabase (z.B. täglicher CSV-Import), plus Form-Trend-Bonus
  const eloOverrides: Record<string, number> = {}
  for (const row of eloRes.data ?? []) {
    const delta = (row as { elo_delta_1y?: number | null }).elo_delta_1y ?? 0
    eloOverrides[row.team_id] = row.elo_rating + Math.round(delta * 0.2)
  }

  // Ergebnisse aus Supabase
  const resultMap: Record<string, { goals_a: number; goals_b: number }> = {}
  for (const row of resultsRes.data ?? []) {
    resultMap[row.match_id] = { goals_a: row.goals_a, goals_b: row.goals_b }
  }

  // Form-Bonus: letztes Turnierergebnis pro Team → ±30 ELO-Punkte
  // (vorläufiger Effekt bis der tägliche CSV-Import das echte ELO liefert)
  const teamLastResult: Record<string, 'W' | 'D' | 'L'> = {}
  const playedMatches = GROUP_SCHEDULE
    .filter(m => resultMap[m.id])
    .sort((a, b) => b.date.localeCompare(a.date) || b.kickoffUTC.localeCompare(a.kickoffUTC))

  for (const m of playedMatches) {
    const r = resultMap[m.id]
    if (!teamLastResult[m.teamAId]) {
      teamLastResult[m.teamAId] = r.goals_a > r.goals_b ? 'W' : r.goals_a === r.goals_b ? 'D' : 'L'
    }
    if (!teamLastResult[m.teamBId]) {
      teamLastResult[m.teamBId] = r.goals_a < r.goals_b ? 'W' : r.goals_a === r.goals_b ? 'D' : 'L'
    }
  }

  for (const [teamId, lastResult] of Object.entries(teamLastResult)) {
    const bonus = lastResult === 'W' ? FORM_BONUS_ELO : lastResult === 'L' ? -FORM_BONUS_ELO : 0
    if (bonus !== 0) {
      const base = eloOverrides[teamId] ?? (TEAM_BY_ID[teamId]?.eloRating ?? 1500)
      eloOverrides[teamId] = base + bonus
    }
  }

  const results: Record<string, { goals_a: number; goals_b: number }> = {}
  for (const [matchId, r] of Object.entries(resultMap)) results[matchId] = r

  return NextResponse.json({ squadData, eloOverrides, results })
}
