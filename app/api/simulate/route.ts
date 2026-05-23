import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSimulation, MatchPrecomputed } from '@/lib/simulation'
import { analyzeMatch } from '@/lib/modelAdapter'
import { GROUP_SCHEDULE } from '@/src/data/schedule'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { n?: number }
    const n = Math.min(Math.max(body.n ?? 10000, 100), 50000)

    // ELO-Ratings aus DB laden (Fallback auf allTeams-Daten)
    const eloRatings: Record<string, number> = {}

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data: eloData } = await supabase
          .from('team_elo_ratings')
          .select('team_id, elo_rating')

        for (const row of eloData ?? []) {
          eloRatings[row.team_id] = row.elo_rating
        }
      }
    } catch {
      // Fallback: allTeams-Ratings werden in runSimulation automatisch verwendet
    }

    // Match-Wahrscheinlichkeiten für alle Gruppenspiele vorberechnen (analyzeMatch)
    const precomputed: MatchPrecomputed[] = GROUP_SCHEDULE
      .filter(m => m.group)
      .map(match => {
        const analysis = analyzeMatch(match, undefined, undefined, eloRatings)
        return {
          matchId: match.id,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          group: match.group!,
          winA: analysis.winProbA,
          draw: analysis.drawProb,
          winB: analysis.winProbB,
          xgA: analysis.expectedGoalsA,
          xgB: analysis.expectedGoalsB,
        }
      })

    const results = runSimulation(n, eloRatings, precomputed)

    return NextResponse.json({ ok: true, n, results })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Simulationsfehler' },
      { status: 500 }
    )
  }
}
