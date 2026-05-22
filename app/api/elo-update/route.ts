import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ALL_TEAMS } from '@/src/data/allTeams'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Maps team IDs to country names as they appear on Wikipedia ELO ratings page
const ELO_NAME_MAP: Record<string, string> = {
  germany: 'Germany', france: 'France', spain: 'Spain', england: 'England',
  brazil: 'Brazil', argentina: 'Argentina', portugal: 'Portugal', netherlands: 'Netherlands',
  belgium: 'Belgium', croatia: 'Croatia', denmark: 'Denmark', switzerland: 'Switzerland',
  senegal: 'Senegal', morocco: 'Morocco', japan: 'Japan', south_korea: 'South Korea',
  usa: 'United States', mexico: 'Mexico', canada: 'Canada', australia: 'Australia',
  austria: 'Austria', sweden: 'Sweden', poland: 'Poland', ukraine: 'Ukraine',
  serbia: 'Serbia', nigeria: 'Nigeria', cameroon: 'Cameroon', ghana: 'Ghana',
  ecuador: 'Ecuador', uruguay: 'Uruguay', chile: 'Chile', colombia: 'Colombia',
  iran: 'Iran', saudi_arabia: 'Saudi Arabia', qatar: 'Qatar', egypt: 'Egypt',
  tunisia: 'Tunisia', ivory_coast: 'Ivory Coast', mali: 'Mali', algeria: 'Algeria',
  new_zealand: 'New Zealand', scotland: 'Scotland', turkey: 'Turkey', czech: 'Czech Republic',
  hungary: 'Hungary', venezuela: 'Venezuela', haiti: 'Haiti', cape_verde: 'Cape Verde',
  curacao: 'Curaçao', congo_dr: 'DR Congo', panama: 'Panama', bosnia: 'Bosnia and Herzegovina',
  thailand: 'Thailand', paraguay: 'Paraguay',
}

// Also maintain alternate name variants for fuzzy matching
const ELO_ALTERNATE_NAMES: Record<string, string[]> = {
  south_korea: ['Korea Republic', 'Korea, Republic of', 'Republic of Korea'],
  iran: ['IR Iran', 'Islamic Republic of Iran'],
  ivory_coast: ["Côte d'Ivoire", 'Cote d\'Ivoire'],
  turkey: ['Türkiye', 'Turkiye'],
  bosnia: ['Bosnia-Herzegovina', 'Bosnia & Herzegovina'],
  congo_dr: ['DR Congo', 'Democratic Republic of the Congo', 'Congo DR'],
  usa: ['USA', 'United States of America'],
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
}

/**
 * Parse ELO ratings from the Wikipedia "World Football Elo Ratings" page.
 * The page has a wikitable with columns: Rank | (flag) | Team | Points | ...
 * We look for table rows where a cell contains a 4-digit ELO number (1000–2300).
 */
function parseWikipediaElo(html: string): Record<string, number> {
  const found: Record<string, number> = {}

  // Extract all <tr> rows from the page
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#160;/g, ' ').replace(/&nbsp;/g, ' ').trim()

  for (const rowMatch of html.matchAll(rowRegex)) {
    const rowHtml = rowMatch[1]

    // Extract all <td> cells in this row
    const cells: string[] = []
    for (const tdMatch of rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)) {
      cells.push(stripHtml(tdMatch[1]).trim())
    }

    if (cells.length < 2) continue

    // Find a cell that looks like a 4-digit ELO (1000-2300)
    let eloValue = 0
    let nameCandidate = ''

    for (const cell of cells) {
      const numMatch = cell.match(/^(\d{4})$/)
      if (numMatch) {
        const n = parseInt(numMatch[1])
        if (n >= 1000 && n <= 2400) {
          eloValue = n
          continue
        }
      }
      // Country name: letters, spaces, hyphens, apostrophes
      if (/^[A-ZÀ-ÿ][A-Za-zÀ-ÿ\s'\-()]+$/.test(cell) && cell.length > 2 && cell.length < 50) {
        nameCandidate = cell
      }
    }

    if (nameCandidate && eloValue > 0) {
      found[nameCandidate] = eloValue
    }
  }

  return found
}

/**
 * Build a reverse lookup map: normalized name -> team_id, using all name variants
 */
function buildNameLookup(): Map<string, string> {
  const lookup = new Map<string, string>()
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim()

  for (const [teamId, primaryName] of Object.entries(ELO_NAME_MAP)) {
    lookup.set(norm(primaryName), teamId)
    // Also add alternates
    const alts = ELO_ALTERNATE_NAMES[teamId] ?? []
    for (const alt of alts) {
      lookup.set(norm(alt), teamId)
    }
  }

  return lookup
}

export async function POST() {
  try {
    // Fetch from Wikipedia (static HTML, no JS rendering needed)
    const wikiUrl = 'https://en.wikipedia.org/wiki/World_Football_Elo_Ratings'
    const res = await fetch(wikiUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Wikipedia returned HTTP ${res.status}` },
        { status: 502 }
      )
    }

    const html = await res.text()
    const found = parseWikipediaElo(html)

    if (Object.keys(found).length < 10) {
      return NextResponse.json(
        {
          error: 'Wikipedia parse failed – fewer than 10 ELO ratings found',
          found: Object.keys(found).length,
          htmlSnippet: html.slice(0, 800),
        },
        { status: 422 }
      )
    }

    // Build name -> teamId reverse lookup (handles all variants)
    const nameLookup = buildNameLookup()
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim()

    // Also build a direct name->elo map for lookup
    const eloByNormName = new Map<string, number>()
    for (const [name, elo] of Object.entries(found)) {
      eloByNormName.set(norm(name), elo)
    }

    const updates: { team_id: string; elo_rating: number; source: string; updated_at: string }[] = []
    for (const team of ALL_TEAMS) {
      const primaryName = ELO_NAME_MAP[team.id]
      if (!primaryName) continue

      // Try primary name first, then alternates
      let elo = eloByNormName.get(norm(primaryName))
      if (!elo) {
        const alts = ELO_ALTERNATE_NAMES[team.id] ?? []
        for (const alt of alts) {
          elo = eloByNormName.get(norm(alt))
          if (elo) break
        }
      }

      // Fallback: check if any found name maps back to this team
      if (!elo) {
        for (const [foundName, foundElo] of eloByNormName) {
          const mappedId = nameLookup.get(foundName)
          if (mappedId === team.id) {
            elo = foundElo
            break
          }
        }
      }

      if (elo) {
        updates.push({
          team_id: team.id,
          elo_rating: elo,
          source: 'wikipedia-elo',
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (updates.length > 0) {
      await adminSupabase.from('team_elo_ratings').upsert(updates, { onConflict: 'team_id' })
    }

    return NextResponse.json({
      ok: true,
      updated: updates.length,
      parsed: Object.keys(found).length,
      source: 'Wikipedia World Football Elo Ratings',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
