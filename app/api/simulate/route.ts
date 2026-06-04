import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSimulation, MatchPrecomputed } from '@/lib/simulation'
import { analyzeMatch } from '@/lib/modelAdapter'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { ALL_TEAMS, TEAM_BY_ID } from '@/src/data/allTeams'
import type { CoreTeamData } from '@/lib/model/corePredict'

export interface TopScorer {
  id: string
  name: string
  teamId: string
  teamName: string
  teamFlag: string
  position: string
  xgPer90: number
  expectedGoals: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { n?: number }
    const n = Math.min(Math.max(body.n ?? 10000, 100), 50000)

    const eloRatings: Record<string, number> = {}
    let playerRows: { id: string; name: string; team_id: string; position: string; xg_per90: number | null }[] = []

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const [eloRes, playerRes] = await Promise.all([
          supabase.from('team_elo_ratings').select('team_id, elo_rating, elo_delta_1y'),
          supabase.from('players').select('id, name, team_id, position, xg_per90').in('position', ['FWD', 'MID']),
        ])

        for (const row of eloRes.data ?? []) {
          const delta = (row as { elo_delta_1y?: number | null }).elo_delta_1y ?? 0
          eloRatings[row.team_id] = row.elo_rating + Math.round(delta * 0.2)
        }

        playerRows = (playerRes.data ?? []) as typeof playerRows
      }
    } catch {
      // Fallback: allTeams-Ratings werden in runSimulation automatisch verwendet
    }

    // TeamData-Map für corePredictFull in KO-Runden
    const teamDataMap: Record<string, CoreTeamData> = {}
    for (const team of ALL_TEAMS) {
      teamDataMap[team.id] = {
        eloRating:          eloRatings[team.id] ?? team.eloRating,
        squadMarketValueM:  team.squadMarketValueM,
        worldCupTitles:     team.worldCupTitles,
        worldCupAppearances: team.worldCupAppearances,
        attackRating:       team.attackRating,
        defenseRating:      team.defenseRating,
        setPieceRating:     team.setPieceRating,
        confederation:      team.confederation,
      }
    }

    // Gruppenspiele vorberechnen (gleicher Algorithmus wie UI)
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

    const results = runSimulation(n, teamDataMap, precomputed)

    // ── Torschützenkönig ──────────────────────────────────────────────────────
    // Anteil je Spieler = xg_per90 / Summe aller FWD+MID xg_per90 des Teams
    const teamXgSum: Record<string, number> = {}
    for (const p of playerRows) {
      if (p.xg_per90 && p.xg_per90 > 0) {
        teamXgSum[p.team_id] = (teamXgSum[p.team_id] ?? 0) + p.xg_per90
      }
    }

    const teamGoals: Record<string, number> = {}
    for (const r of results) teamGoals[r.teamId] = r.avgGoalsFor

    const topScorers: TopScorer[] = playerRows
      .filter(p => p.xg_per90 && p.xg_per90 > 0 && teamXgSum[p.team_id] > 0 && teamGoals[p.team_id] != null)
      .map(p => {
        const share = p.xg_per90! / teamXgSum[p.team_id]
        const expectedGoals = teamGoals[p.team_id] * share
        const team = TEAM_BY_ID[p.team_id]
        return {
          id: p.id,
          name: p.name,
          teamId: p.team_id,
          teamName: team?.name ?? p.team_id,
          teamFlag: team?.flag ?? '',
          position: p.position,
          xgPer90: p.xg_per90!,
          expectedGoals,
        }
      })
      .sort((a, b) => b.expectedGoals - a.expectedGoals)
      .slice(0, 30)

    return NextResponse.json({ ok: true, n, results, topScorers })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Simulationsfehler' },
      { status: 500 }
    )
  }
}
