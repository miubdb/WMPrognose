import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { computeSquadSummary } from '@/lib/model/squadComputation'
import { computeDataQuality } from '@/lib/model/dataQuality'
import type { SquadSummary } from '@/lib/modelAdapter'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [squadRes, eloRes, resultsRes] = await Promise.all([
    // limit=2000 — alle 1248 Spieler laden (Supabase-Standard-Limit: 1000)
    supabase.from('players')
      .select('team_id, market_value_m, position, age, xg_per90, xa_per90, xga_per90, tackles_per90, clearances_per90, goals_conceded_per90, is_in_starting_xi, rating')
      .limit(2000),
    supabase.from('team_elo_ratings').select('team_id, elo_rating, elo_delta_1y, source'),
    supabase.from('match_results').select('match_id, goals_a, goals_b'),
  ])

  type RawPlayerRow = {
    team_id: string
    market_value_m: number | null
    position: string | null
    age: number | null
    rating: number | null
    xg_per90: number | null
    xa_per90: number | null
    xga_per90: number | null
    tackles_per90: number | null
    clearances_per90: number | null
    goals_conceded_per90: number | null
    is_in_starting_xi: boolean | null
  }

  // Spieler nach Team gruppieren
  const playersByTeam: Record<string, RawPlayerRow[]> = {}
  for (const row of (squadRes.data ?? []) as RawPlayerRow[]) {
    if (!playersByTeam[row.team_id]) playersByTeam[row.team_id] = []
    playersByTeam[row.team_id].push(row)
  }

  // ELO-Quelle pro Team (für DataQuality)
  const eloSourceByTeam: Record<string, string | null> = {}
  for (const row of eloRes.data ?? []) {
    eloSourceByTeam[row.team_id] = (row as { source?: string | null }).source ?? null
  }

  // SquadSummary + DataQuality zentral berechnen — identisch mit detail page
  const squadData: Record<string, SquadSummary> = {}
  for (const [tid, players] of Object.entries(playersByTeam)) {
    const starters = players.filter(p => p.is_in_starting_xi)
    const effective = starters.length >= 11 ? starters : players
    const base = computeSquadSummary(effective)
    const dq = computeDataQuality(players, eloSourceByTeam[tid] ?? null)
    squadData[tid] = { ...base, dataQuality: dq }
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

  const eloSources: Record<string, string> = {}
  for (const row of eloRes.data ?? []) {
    const src = (row as { source?: string | null }).source
    if (src) eloSources[row.team_id] = src
  }

  return NextResponse.json(
    { squadData, eloOverrides, results, eloSources },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
