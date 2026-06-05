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
    // Use server-side aggregation (RPC) to avoid the 1000-row PostgREST default limit
    // when fetching 48×26=1248 player rows individually.
    const [squadRes, eloRes, wm2026Res] = await Promise.all([
      sb.rpc('get_squad_stats'),
      sb.from('team_elo_ratings').select('team_id, elo_rating, source, updated_at, elo_delta_1y'),
      sb.from('wm2026_teams').select('team_id, verified, notes').in('team_id', ACTIVE_WM_TEAM_IDS),
    ])

    type SquadRow = { team_id: string; player_count: number; players_with_mv: number; zero_mv_count: number; total_mv_m: number; starter_count: number; starter_mv_m: number }
    const squadStats = new Map<string, SquadRow>(
      ((squadRes.data ?? []) as SquadRow[]).map(r => [r.team_id, r])
    )

    const eloMap    = new Map((eloRes.data    ?? []).map(e => [e.team_id, e]))
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
        player_count:    sq ? Number(sq.player_count)    : 0,
        players_with_mv: sq ? Number(sq.players_with_mv) : 0,
        zero_mv_count:   sq ? Number(sq.zero_mv_count)   : 0,
        total_mv_m:      sq ? Math.round(Number(sq.total_mv_m)   * 10) / 10 : null,
        starter_count:   sq ? Number(sq.starter_count)   : 0,
        starter_mv_m:    sq ? Math.round(Number(sq.starter_mv_m) * 10) / 10 : null,
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

  if (body.action === 'bulk-verify') {
    const teamIds: string[] = body.teamIds ?? []
    if (teamIds.length === 0) return NextResponse.json({ ok: true, updated: 0 })
    const rows = teamIds.map(id => {
      const meta = TEAM_BY_ID[id]
      return {
        team_id:       id,
        team_name:     meta?.name          ?? id,
        confederation: meta?.confederation ?? 'UEFA',
        verified:      true,
        updated_at:    new Date().toISOString(),
      }
    })
    const { error } = await sb.from('wm2026_teams').upsert(rows, { onConflict: 'team_id' })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'bulk-verify', updated: rows.length })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
