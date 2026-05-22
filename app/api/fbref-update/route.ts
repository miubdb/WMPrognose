import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FBREF_LEAGUES = [
  { id: 'Big5',  url: 'https://fbref.com/en/comps/Big5/stats/players/Big-5-European-Leagues-Stats',  name: 'Big 5 Europe' },
  { id: 'MLS',   url: 'https://fbref.com/en/comps/22/stats/players/Major-League-Soccer-Stats',         name: 'MLS' },
  { id: 'JLEAG', url: 'https://fbref.com/en/comps/25/stats/players/J1-League-Stats',                   name: 'J1 League' },
  { id: 'SPL',   url: 'https://fbref.com/en/comps/70/stats/players/Saudi-Pro-League-Stats',            name: 'Saudi Pro League' },
  { id: 'ARG',   url: 'https://fbref.com/en/comps/21/stats/players/Primera-División-Stats',            name: 'Liga Argentina' },
  { id: 'BRA',   url: 'https://fbref.com/en/comps/24/stats/players/Serie-A-Stats',                    name: 'Brasileirão' },
  { id: 'MEX',   url: 'https://fbref.com/en/comps/31/stats/players/Liga-MX-Stats',                    name: 'Liga MX' },
]

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // remove accents
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

function parseFBrefStats(html: string): Map<string, { xg: number; xga: number; minutes: number; position: string }> {
  const players = new Map<string, { xg: number; xga: number; minutes: number; position: string }>()

  // Each player is a <tr> row. Extract rows from the stats_standard table.
  // Look for rows containing data-stat="player"
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g
  const rows = html.match(rowRegex) ?? []

  for (const row of rows) {
    // Skip header rows
    if (row.includes('class="thead"') || row.includes('<th ')) continue

    // Extract player name
    const nameMatch = row.match(/data-stat="player"[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/td>/)
    if (!nameMatch) continue
    const name = nameMatch[1].trim()
    if (!name || name === 'Player') continue

    // Extract position
    const posMatch = row.match(/data-stat="position"[^>]*>([^<]*)<\/td>/)
    const position = posMatch?.[1]?.trim() ?? ''

    // Extract minutes
    const minMatch = row.match(/data-stat="minutes"[^>]*>([0-9,]+)<\/td>/)
    const minutes = parseInt((minMatch?.[1] ?? '0').replace(/,/g, '')) || 0
    if (minutes < 90) continue  // Skip players with less than 90 min played

    // Extract xG (expected goals)
    const xgMatch = row.match(/data-stat="xg"[^>]*>([\d.]+)<\/td>/)
    const xg = parseFloat(xgMatch?.[1] ?? '0') || 0

    // Extract xGA (expected goals against — for GK/DEF context, labeled xg_against or xga on FBref)
    const xgaMatch = row.match(/data-stat="xg_against"[^>]*>([\d.]+)<\/td>/)
    const xga = parseFloat(xgaMatch?.[1] ?? '0') || 0

    // Compute per-90 values
    const xgPer90 = minutes > 0 ? (xg / minutes) * 90 : 0
    const xgaPer90 = minutes > 0 ? (xga / minutes) * 90 : 0

    players.set(normalizeName(name), { xg: xgPer90, xga: xgaPer90, minutes, position })
  }

  return players
}

export async function POST() {
  // 1. Fetch all our players from Supabase
  const { data: dbPlayers } = await adminSupabase
    .from('players')
    .select('id, name, position, xg_per90, xga_per90')

  if (!dbPlayers || dbPlayers.length === 0) {
    return NextResponse.json({ error: 'No players in DB' }, { status: 400 })
  }

  // 2. Fetch all FBref leagues in parallel
  const leagueResults = await Promise.allSettled(
    FBREF_LEAGUES.map(async (league) => {
      const res = await fetch(league.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${league.name}`)
      const html = await res.text()
      const stats = parseFBrefStats(html)
      return { league: league.name, stats }
    })
  )

  // 3. Merge all league stats into one map (later league = overwrite, so Big5 has priority)
  const allStats = new Map<string, { xg: number; xga: number; minutes: number; position: string }>()
  const leagueSummary: string[] = []
  for (const result of leagueResults) {
    if (result.status === 'fulfilled') {
      const { league, stats } = result.value
      leagueSummary.push(`${league}: ${stats.size} players`)
      for (const [name, data] of stats) {
        if (!allStats.has(name)) allStats.set(name, data)  // Big5 (first) wins
      }
    } else {
      leagueSummary.push(`FAILED: ${result.reason}`)
    }
  }

  // 4. Match DB players to FBref stats by name
  const updates: { id: string; xg_per90: number; xga_per90: number }[] = []
  let matched = 0
  let unmatched = 0

  for (const player of dbPlayers) {
    const normalized = normalizeName(player.name)
    let stats = allStats.get(normalized)

    // Fuzzy: try last name match
    if (!stats) {
      const lastName = normalized.split(' ').slice(-1)[0]
      if (lastName && lastName.length > 3) {
        for (const [key, val] of allStats) {
          if (key.endsWith(lastName) || key.includes(` ${lastName}`)) {
            stats = val
            break
          }
        }
      }
    }

    if (stats) {
      // For GK/DEF, xGA from FBref is more relevant
      // For FWD/MID, xG is more relevant
      // But we store both — the model will pick the right one
      updates.push({
        id: player.id,
        xg_per90: Math.round(stats.xg * 1000) / 1000,
        xga_per90: Math.round(stats.xga * 1000) / 1000,
      })
      matched++
    } else {
      unmatched++
    }
  }

  // 5. Batch update Supabase
  let dbUpdated = 0
  const batchSize = 50
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    for (const u of batch) {
      await adminSupabase
        .from('players')
        .update({ xg_per90: u.xg_per90, xga_per90: u.xga_per90 })
        .eq('id', u.id)
      dbUpdated++
    }
  }

  return NextResponse.json({
    ok: true,
    leagues: leagueSummary,
    fbrefPlayers: allStats.size,
    matched,
    unmatched,
    dbUpdated,
  })
}
