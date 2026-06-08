import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { computeSquadSummary } from '@/lib/model/squadComputation'
import type { SquadSummary } from '@/lib/modelAdapter'

export async function GET() {
  const [squadRes, eloRes, resultsRes] = await Promise.all([
    // limit=2000 — alle 1248 Spieler laden (Supabase-Standard-Limit: 1000)
    supabase.from('players')
      .select('team_id, market_value_m, position, age, xg_per90, xa_per90, xga_per90, tackles_per90, clearances_per90, goals_conceded_per90, is_in_starting_xi')
      .limit(2000),
    supabase.from('team_elo_ratings').select('team_id, elo_rating, elo_delta_1y'),
    supabase.from('match_results').select('match_id, goals_a, goals_b'),
  ])

  // Spieler nach Team gruppieren
  const playersByTeam: Record<string, Parameters<typeof computeSquadSummary>[0]> = {}
  for (const row of squadRes.data ?? []) {
    if (!playersByTeam[row.team_id]) playersByTeam[row.team_id] = []
    playersByTeam[row.team_id].push(row)
  }

  // SquadSummary zentral berechnen — wenn ≥11 Starter gesetzt: nur Startelf nutzen
  const squadData: Record<string, SquadSummary> = {}
  for (const [tid, players] of Object.entries(playersByTeam)) {
    const starters = players.filter(p => (p as { is_in_starting_xi?: boolean }).is_in_starting_xi)
    const effective = starters.length >= 11 ? starters : players
    squadData[tid] = computeSquadSummary(effective)
  }

  // ELO aus Supabase + langfristiger Trend-Bonus (20% von elo_delta_1y)
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
