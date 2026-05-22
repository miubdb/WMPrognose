import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ALL_TEAMS } from '@/src/data/allTeams'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ELO_NAME_MAP: Record<string, string> = {
  germany: 'Germany', france: 'France', spain: 'Spain', england: 'England',
  brazil: 'Brazil', argentina: 'Argentina', portugal: 'Portugal', netherlands: 'Netherlands',
  belgium: 'Belgium', croatia: 'Croatia', denmark: 'Denmark', switzerland: 'Switzerland',
  senegal: 'Senegal', morocco: 'Morocco', japan: 'Japan', south_korea: 'Korea Republic',
  usa: 'United States', mexico: 'Mexico', canada: 'Canada', australia: 'Australia',
  austria: 'Austria', sweden: 'Sweden', poland: 'Poland', ukraine: 'Ukraine',
  serbia: 'Serbia', nigeria: 'Nigeria', cameroon: 'Cameroon', ghana: 'Ghana',
  ecuador: 'Ecuador', uruguay: 'Uruguay', chile: 'Chile', colombia: 'Colombia',
  iran: 'IR Iran', saudi_arabia: 'Saudi Arabia', qatar: 'Qatar', egypt: 'Egypt',
  tunisia: 'Tunisia', ivory_coast: "Côte d'Ivoire", mali: 'Mali', algeria: 'Algeria',
  new_zealand: 'New Zealand', scotland: 'Scotland', turkey: 'Türkiye', czech: 'Czech Republic',
  hungary: 'Hungary', venezuela: 'Venezuela', haiti: 'Haiti', cape_verde: 'Cape Verde',
  curacao: 'Curaçao', congo_dr: 'DR Congo', panama: 'Panama', bosnia: 'Bosnia-Herzegovina',
  thailand: 'Thailand', paraguay: 'Paraguay',
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
}

function parseElo(html: string): Record<string, number> {
  const found: Record<string, number> = {}

  // Strategy A: JSON in <script> tag
  const jsonMatches = [...html.matchAll(/"name"\s*:\s*"([^"]+)"[^}]*"elo"\s*:\s*(\d{3,4})/g)]
  if (jsonMatches.length >= 10) {
    for (const m of jsonMatches) {
      const elo = parseInt(m[2])
      if (elo > 1000 && elo < 2500) found[m[1].trim()] = elo
    }
    if (Object.keys(found).length >= 10) return found
  }

  // Strategy B: Data array
  Object.keys(found).forEach(k => delete found[k])
  const dataMatches = [...html.matchAll(/\["([A-Za-z ]+)",\s*\d+,\s*(\d{3,4})/g)]
  if (dataMatches.length >= 10) {
    for (const m of dataMatches) {
      const elo = parseInt(m[2])
      if (elo > 1000 && elo < 2500) found[m[1].trim()] = elo
    }
    if (Object.keys(found).length >= 10) return found
  }

  // Strategy C: Table rows multi-line
  Object.keys(found).forEach(k => delete found[k])
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  for (const rowMatch of html.matchAll(rowRegex)) {
    const rowText = stripTags(rowMatch[1])
    const eloMatch = rowText.match(/([A-Za-zÀ-ÿ\s'()-]+)\D+(\b1[0-9]{3}\b|\b2[0-3][0-9]{2}\b)/)
    if (eloMatch) {
      const name = eloMatch[1].trim()
      const elo = parseInt(eloMatch[2])
      if (name && elo > 1000 && elo < 2500) found[name] = elo
    }
  }
  if (Object.keys(found).length >= 10) return found

  // Strategy D: Script data
  Object.keys(found).forEach(k => delete found[k])
  const scriptMatches = [...html.matchAll(/'([A-Za-z ]+)',\s*(\d{3,4})/g)]
  for (const m of scriptMatches) {
    const elo = parseInt(m[2])
    if (elo > 1000 && elo < 2500) found[m[1].trim()] = elo
  }
  if (Object.keys(found).length >= 10) return found

  return found
}

export async function POST() {
  try {
    const res = await fetch('https://eloratings.net/World', {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15000),
    })
    const html = await res.text()

    const found = parseElo(html)

    if (Object.keys(found).length < 10) {
      return NextResponse.json(
        {
          error: 'Alle Parse-Strategien fehlgeschlagen – eloratings.net hat die Struktur geändert',
          found: Object.keys(found).length,
          htmlSnippet: html.slice(0, 500),
        },
        { status: 422 }
      )
    }

    const updates: { team_id: string; elo_rating: number; source: string; updated_at: string }[] = []
    for (const team of ALL_TEAMS) {
      const eloName = ELO_NAME_MAP[team.id]
      if (!eloName) continue
      const elo = found[eloName]
      if (elo) updates.push({ team_id: team.id, elo_rating: elo, source: 'eloratings.net', updated_at: new Date().toISOString() })
    }

    if (updates.length > 0) {
      await adminSupabase.from('team_elo_ratings').upsert(updates, { onConflict: 'team_id' })
    }

    return NextResponse.json({ ok: true, updated: updates.length, parsed: Object.keys(found).length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
