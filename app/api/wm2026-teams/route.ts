import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WM2026_MARKET_VALUES } from '@/src/data/wm2026MarketValues'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NAME_TO_ID: Record<string, string> = {
  'Germany': 'germany', 'France': 'france', 'Spain': 'spain', 'England': 'england',
  'Portugal': 'portugal', 'Netherlands': 'netherlands', 'Belgium': 'belgium',
  'Italy': 'italy', 'Switzerland': 'switzerland', 'Denmark': 'denmark',
  'Croatia': 'croatia', 'Austria': 'austria', 'Serbia': 'serbia',
  'Türkiye': 'turkey', 'Scotland': 'scotland', 'Hungary': 'hungary',
  'Brazil': 'brazil', 'Argentina': 'argentina', 'Colombia': 'colombia',
  'Uruguay': 'uruguay', 'Ecuador': 'ecuador', 'Paraguay': 'paraguay',
  'USA': 'usa', 'Mexico': 'mexico', 'Canada': 'canada',
  'Honduras': 'honduras', 'Costa Rica': 'costa_rica', 'Panama': 'panama',
  'Morocco': 'morocco', 'Senegal': 'senegal', 'Nigeria': 'nigeria',
  'Egypt': 'egypt', 'Ivory Coast': 'ivory_coast', 'Mali': 'mali',
  'South Africa': 'south_africa', 'Cameroon': 'cameroon', 'Algeria': 'algeria',
  'Japan': 'japan', 'South Korea': 'south_korea', 'Saudi Arabia': 'saudi_arabia',
  'Iran': 'iran', 'Australia': 'australia', 'Qatar': 'qatar',
  'Jordan': 'jordan', 'Uzbekistan': 'uzbekistan', 'New Zealand': 'new_zealand',
}

async function seedFromStatic() {
  const rows = WM2026_MARKET_VALUES.map(t => ({
    team_id:            NAME_TO_ID[t.teamName] ?? t.teamName.toLowerCase().replace(/\s+/g, '_'),
    team_name:          t.teamName,
    confederation:      t.confederation,
    market_value_m:     t.marketValueM,
    market_value_source: t.source,
    market_value_date:  t.snapshotDate,
    verified:           t.manuallyVerified,
    notes:              t.notes ?? null,
  }))
  await sb.from('wm2026_teams').upsert(rows, { onConflict: 'team_id' })
}

export async function GET() {
  try {
    // Auto-seed if empty
    const { count } = await sb.from('wm2026_teams').select('*', { count: 'exact', head: true })
    if ((count ?? 0) === 0) await seedFromStatic()

    const [teamsRes, eloRes, playersRes] = await Promise.all([
      sb.from('wm2026_teams').select('*').order('confederation').order('team_name'),
      sb.from('team_elo_ratings').select('team_id, elo_rating, source, updated_at, elo_delta_1y'),
      sb.from('players').select('team_id, market_value_m, is_in_starting_xi'),
    ])

    if (teamsRes.error) throw teamsRes.error

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

    const eloMap = new Map((eloRes.data ?? []).map(e => [e.team_id, e]))

    const teams = (teamsRes.data ?? []).map(t => {
      const elo  = eloMap.get(t.team_id)
      const sq   = squadStats.get(t.team_id)
      return {
        ...t,
        elo_rating:      elo?.elo_rating ?? null,
        elo_source:      elo?.source ?? null,
        elo_updated:     elo?.updated_at ?? null,
        elo_delta_1y:    elo?.elo_delta_1y ?? 0,
        player_count:    sq?.playerCount   ?? 0,
        players_with_mv: sq?.playersWithMv ?? 0,
        zero_mv_count:   sq?.zeroMvCount   ?? 0,
        total_mv_m:      sq ? Math.round(sq.totalMvM * 10) / 10 : null,
        starter_count:   sq?.starterCount  ?? 0,
        starter_mv_m:    sq ? Math.round(sq.starterMvM * 10) / 10 : null,
      }
    })

    const missingElo      = teams.filter(t => !t.elo_rating).length
    const teamsWithZeroMv = teams.filter(t => t.zero_mv_count > 0).length
    const unverified      = teams.filter(t => !t.verified).length

    return NextResponse.json({
      ok: true,
      teams,
      stats: { total: teams.length, missingElo, teamsWithZeroMv, unverified },
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.action === 'seed') {
    await seedFromStatic()
    return NextResponse.json({ ok: true, action: 'seeded' })
  }
  if (body.action === 'reset') {
    await sb.from('wm2026_teams').delete().neq('team_id', '__never__')
    await seedFromStatic()
    return NextResponse.json({ ok: true, action: 'reset' })
  }
  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
