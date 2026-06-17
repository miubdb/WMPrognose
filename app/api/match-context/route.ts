import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { computeSquadSummary } from '@/lib/model/squadComputation'
import { computeDataQuality } from '@/lib/model/dataQuality'
import { analyzeAllMatches } from '@/lib/modelAdapter'
import type { SquadSummary } from '@/lib/modelAdapter'

export const dynamic = 'force-dynamic'

const PLAYER_SELECT = 'team_id, market_value_m, position, age, xg_per90, xa_per90, xga_per90, tackles_per90, clearances_per90, goals_conceded_per90, is_in_starting_xi, sofascore_rating, suspended, suspended_until_date, goals, assists'

export async function GET() {
  // Fetch players in two batches — Supabase PostgREST caps at max_rows=1000
  // With 1248+ players, a single .limit(2000) only returns 1000
  const [batch1, batch2, eloRes, resultsRes] = await Promise.all([
    supabase.from('players').select(PLAYER_SELECT).order('team_id').range(0, 999),
    supabase.from('players').select(PLAYER_SELECT).order('team_id').range(1000, 1999),
    supabase.from('team_elo_ratings').select('team_id, elo_rating, elo_delta_1y, source'),
    supabase.from('match_results').select('match_id, goals_a, goals_b'),
  ])

  type RawPlayerRow = {
    team_id: string
    market_value_m: number | null
    position: string | null
    age: number | null
    sofascore_rating: number | null
    xg_per90: number | null
    xa_per90: number | null
    xga_per90: number | null
    tackles_per90: number | null
    clearances_per90: number | null
    goals_conceded_per90: number | null
    is_in_starting_xi: boolean | null
    suspended: boolean | null
    suspended_until_date: string | null
    goals: number | null
    assists: number | null
  }

  const allPlayers = [...(batch1.data ?? []), ...(batch2.data ?? [])] as RawPlayerRow[]

  // Group players by team
  const playersByTeam: Record<string, RawPlayerRow[]> = {}
  for (const row of allPlayers) {
    if (!playersByTeam[row.team_id]) playersByTeam[row.team_id] = []
    playersByTeam[row.team_id].push(row)
  }

  // Per-team ELO source — use 'fallback-apr2025' when source is null but row exists
  // This prevents "ELO nicht vorhanden" warning for teams that DO have ELO data
  const eloSourceByTeam: Record<string, string> = {}
  for (const row of eloRes.data ?? []) {
    eloSourceByTeam[row.team_id] = (row as { source?: string | null }).source ?? 'fallback-apr2025'
  }

  // Today's date for suspension filtering
  const today = new Date().toISOString().slice(0, 10)

  // SquadSummary + DataQuality — suspended players excluded from effective squad
  const squadData: Record<string, SquadSummary> = {}
  for (const [tid, players] of Object.entries(playersByTeam)) {
    const active = players.filter(p =>
      !p.suspended || !p.suspended_until_date || p.suspended_until_date < today
    )
    const starters = active.filter(p => p.is_in_starting_xi)
    const effective = starters.length >= 11 ? starters : active
    const base = computeSquadSummary(effective)
    const dq = computeDataQuality(players, eloSourceByTeam[tid] ?? null)
    squadData[tid] = { ...base, dataQuality: dq }
  }

  // ELO overrides with 20% long-term trend bonus
  const eloOverrides: Record<string, number> = {}
  for (const row of eloRes.data ?? []) {
    const delta = (row as { elo_delta_1y?: number | null }).elo_delta_1y ?? 0
    eloOverrides[row.team_id] = row.elo_rating + Math.round(delta * 0.2)
  }

  // ELO sources for analyzeMatch factor confidence display (non-null only)
  const eloSources: Record<string, string> = {}
  for (const row of eloRes.data ?? []) {
    const src = (row as { source?: string | null }).source
    if (src) eloSources[row.team_id] = src
  }

  // Match results
  const results: Record<string, { goals_a: number; goals_b: number }> = {}
  for (const row of resultsRes.data ?? []) {
    results[row.match_id] = { goals_a: row.goals_a, goals_b: row.goals_b }
  }

  // Compute ALL match analyses server-side — single source of truth.
  // The homepage consumes these directly so it always matches the detail page
  // (which also runs analyzeMatch server-side with the same DB data).
  const matchAnalyses = analyzeAllMatches(squadData, eloOverrides, eloSources, results)

  return NextResponse.json(
    { squadData, eloOverrides, results, eloSources, matchAnalyses },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
