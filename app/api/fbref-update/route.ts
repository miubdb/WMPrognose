import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Understat leagues for 2024/25 season
const UNDERSTAT_LEAGUES = [
  { id: 'EPL',        url: 'https://understat.com/league/EPL/2024',        name: 'Premier League' },
  { id: 'La_liga',    url: 'https://understat.com/league/La_liga/2024',    name: 'La Liga' },
  { id: 'Bundesliga', url: 'https://understat.com/league/Bundesliga/2024', name: 'Bundesliga' },
  { id: 'Serie_A',    url: 'https://understat.com/league/Serie_A/2024',    name: 'Serie A' },
  { id: 'Ligue_1',    url: 'https://understat.com/league/Ligue_1/2024',    name: 'Ligue 1' },
]

interface UnderstatPlayer {
  id: string
  player_name: string
  games: string
  time: string       // minutes played
  goals: string
  xG: string         // expected goals (total)
  assists: string
  xA: string         // expected assists (total)
  shots: string
  key_passes: string
  yellow_cards: string
  red_cards: string
  position: string
  team_title: string
  npg: string
  npxG: string
  xGChain: string
  xGBuildup: string
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // remove accents
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Parse the embedded playersData JSON from an understat league page.
 * Understat embeds data as:
 *   var playersData = JSON.parse('...')
 * The inner string uses JSON with unicode escapes (\uXXXX) and escaped single quotes.
 */
function parseUnderstatPlayers(html: string): Map<string, { xg: number; xga: number; minutes: number; position: string }> {
  const players = new Map<string, { xg: number; xga: number; minutes: number; position: string }>()

  // Match the playersData JSON.parse call - handle both single and double quote delimiters
  const match = html.match(/var\s+playersData\s*=\s*JSON\.parse\('([\s\S]*?)'\)/)
    ?? html.match(/var\s+playersData\s*=\s*JSON\.parse\("([\s\S]*?)"\)/)

  if (!match) {
    console.warn('understat: playersData not found in page')
    return players
  }

  // Unescape the string: understat uses \' for single quotes inside the JSON string,
  // and unicode escapes like Т for non-ASCII characters
  let jsonStr = match[1]
    .replace(/\\'/g, "'")      // unescape single quotes
    .replace(/\\"/g, '"')      // unescape double quotes (if any)

  let rawPlayers: UnderstatPlayer[]
  try {
    rawPlayers = JSON.parse(jsonStr)
  } catch (e) {
    console.warn('understat: JSON.parse failed:', e)
    return players
  }

  if (!Array.isArray(rawPlayers)) return players

  for (const p of rawPlayers) {
    const minutes = parseInt(p.time ?? '0') || 0
    if (minutes < 90) continue   // skip players with < 90 min

    const xg = parseFloat(p.xG ?? '0') || 0
    // xA used as proxy for xGA (assists/creativity metric — stored in xga_per90 field)
    const xa = parseFloat(p.xA ?? '0') || 0

    const xgPer90 = minutes > 0 ? (xg / minutes) * 90 : 0
    const xaPer90 = minutes > 0 ? (xa / minutes) * 90 : 0

    const normalizedName = normalizeName(p.player_name ?? '')
    if (!normalizedName) continue

    // Keep first occurrence (EPL first, etc.) — earlier leagues win
    if (!players.has(normalizedName)) {
      players.set(normalizedName, {
        xg: xgPer90,
        xga: xaPer90,
        minutes,
        position: p.position ?? '',
      })
    }
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

  // 2. Fetch all understat leagues sequentially with delay to avoid rate limiting
  const allStats = new Map<string, { xg: number; xga: number; minutes: number; position: string }>()
  const leagueSummary: string[] = []

  for (const league of UNDERSTAT_LEAGUES) {
    try {
      const res = await fetch(league.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Referer': 'https://understat.com/',
        },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${league.name}`)
      const html = await res.text()
      const stats = parseUnderstatPlayers(html)
      leagueSummary.push(`${league.name}: ${stats.size} players`)

      // Merge — first league (EPL) wins for duplicate players
      for (const [name, data] of stats) {
        if (!allStats.has(name)) allStats.set(name, data)
      }
    } catch (err) {
      leagueSummary.push(`FAILED ${league.name}: ${err}`)
    }
    // 2s delay between requests
    await new Promise(r => setTimeout(r, 2000))
  }

  // 3. Match DB players to understat stats by normalized name
  const updates: { id: string; xg_per90: number; xga_per90: number }[] = []
  let matched = 0
  let unmatched = 0

  for (const player of dbPlayers) {
    const normalized = normalizeName(player.name)
    let stats = allStats.get(normalized)

    // Fuzzy: try last name match if full name not found
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

  // 4. Batch update Supabase
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
