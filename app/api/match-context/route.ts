import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const [squadRes, eloRes, resultsRes] = await Promise.all([
    supabase.from('players').select('team_id, market_value_m'),
    supabase.from('team_elo_ratings').select('team_id, elo_rating'),
    supabase.from('match_results').select('match_id, goals_a, goals_b'),
  ])

  const squadData: Record<string, { count: number; totalMarketValueM: number }> = {}
  for (const row of squadRes.data ?? []) {
    if (!squadData[row.team_id]) squadData[row.team_id] = { count: 0, totalMarketValueM: 0 }
    squadData[row.team_id].count++
    squadData[row.team_id].totalMarketValueM += row.market_value_m ?? 0
  }

  const eloOverrides: Record<string, number> = {}
  for (const row of eloRes.data ?? []) eloOverrides[row.team_id] = row.elo_rating

  const results: Record<string, { goals_a: number; goals_b: number }> = {}
  for (const row of resultsRes.data ?? []) results[row.match_id] = { goals_a: row.goals_a, goals_b: row.goals_b }

  return NextResponse.json({ squadData, eloOverrides, results })
}
