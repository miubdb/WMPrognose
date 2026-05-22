import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export interface SquadSummary {
  count: number
  totalMarketValueM: number
}

export async function GET() {
  const { data } = await supabase
    .from('players')
    .select('team_id, market_value_m')

  const result: Record<string, SquadSummary> = {}
  for (const row of data ?? []) {
    if (!result[row.team_id]) result[row.team_id] = { count: 0, totalMarketValueM: 0 }
    result[row.team_id].count++
    result[row.team_id].totalMarketValueM += row.market_value_m ?? 0
  }
  return NextResponse.json(result)
}
