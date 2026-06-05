import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { ACTIVE_WM_TEAM_IDS } from '@/src/data/activeWmTeams'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const [playersRes, eloRes, wm2026Res] = await Promise.all([
      sb.from('players').select('team_id, market_value_m, is_in_starting_xi'),
      sb.from('team_elo_ratings').select('team_id, elo_rating, source, updated_at, elo_delta_1y'),
      sb.from('wm2026_teams').select('team_id, verified, notes').in('team_id', ACTIVE_WM_TEAM_IDS),
    ])

    // Aggregate squad stats per team from players table
    const squadStats = new Map<string, {
      playerCount: number
      playersWithMv: number
      zeroMvCount: number
      totalMvM: number
      starterCount: number
      starterMvM: number
    }>()

    for (const p of (playersRes.data ?? [])) {
      if (!ACTIVE_WM_TEAM_IDS.includes(p.team_id)) continue
      const s = squadStats.get(p.team_id) ?? {
        playerCount: 0, playersWithMv: 0, zeroMvCount: 0,
        totalMvM: 0, starterCount: 0, starterMvM: 0,
      }
      s.playerCount++
      const mv = p.market_value_m ?? 0
      if (mv > 0) { s.playersWithMv++; s.totalMvM += mv }
      else s.zeroMvCount++
      if (p.is_in_starting_xi) { s.starterCount++; s.starterMvM += mv }
      squadStats.set(p.team_id, s)
    }

    const eloMap  = new Map((eloRes.data  ?? []).map(e => [e.team_id, e]))
    const wm2026Map = new Map((wm2026Res.data ?? []).map(w => [w.team_id, w]))

    // Build response for exactly the 48 schedule teams
    const teams = ACTIVE_WM_TEAM_IDS.map(teamId => {
      const meta  = TEAM_BY_ID[teamId]
      const elo   = eloMap.get(teamId)
      const wm    = wm2026Map.get(teamId)
      const sq    = squadStats.get(teamId)
      return {
        team_id:         teamId,
        team_name:       meta?.name       ?? teamId,
        confederation:   meta?.confederation ?? 'UEFA',
        group:           meta?.group       ?? '?',
        verified:        wm?.verified      ?? false,
        notes:           wm?.notes         ?? null,
        elo_rating:      elo?.elo_rating   ?? null,
        elo_source:      elo?.source       ?? null,
        elo_updated:     elo?.updated_at   ?? null,
        elo_delta_1y:    elo?.elo_delta_1y ?? 0,
        player_count:    sq?.playerCount   ?? 0,
        players_with_mv: sq?.playersWithMv ?? 0,
        zero_mv_count:   sq?.zeroMvCount   ?? 0,
        total_mv_m:      sq ? Math.round(sq.totalMvM  * 10) / 10 : null,
        starter_count:   sq?.starterCount  ?? 0,
        starter_mv_m:    sq ? Math.round(sq.starterMvM * 10) / 10 : null,
      }
    }).sort((a, b) => a.confederation.localeCompare(b.confederation) || a.team_name.localeCompare(b.team_name))

    const missingElo       = teams.filter(t => !t.elo_rating).length
    const teamsWithoutSquad = teams.filter(t => t.player_count === 0).length
    const teamsWithZeroMv  = teams.filter(t => t.zero_mv_count > 0).length
    const unverified       = teams.filter(t => !t.verified).length

    return NextResponse.json({
      ok: true,
      teams,
      activeCount: ACTIVE_WM_TEAM_IDS.length,
      stats: { total: teams.length, missingElo, teamsWithoutSquad, teamsWithZeroMv, unverified },
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.action === 'reset-verified') {
    await sb.from('wm2026_teams').update({ verified: false }).in('team_id', ACTIVE_WM_TEAM_IDS)
    return NextResponse.json({ ok: true, action: 'reset-verified' })
  }
  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
