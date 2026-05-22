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
  curacao: 'Curaçao', dr_congo: 'DR Congo', panama: 'Panama', bosnia: 'Bosnia-Herzegovina',
  thailand: 'Thailand', paraguay: 'Paraguay',
}

export async function POST() {
  try {
    const res = await fetch('https://eloratings.net/World', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()

    // Parse ELO values from HTML — eloratings.net embeds data as JS array or table
    const found: Record<string, number> = {}

    // Try table row pattern
    const rows = html.matchAll(/<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>(\d{3,4})<\/td>/gs)
    for (const row of rows) {
      const name = row[1].trim()
      const elo = parseInt(row[2])
      if (elo > 1000 && elo < 2500) found[name] = elo
    }

    if (Object.keys(found).length < 10) {
      // Parsing failed — return error but don't crash
      return NextResponse.json(
        { error: 'Parsing fehlgeschlagen – eloratings.net hat die Struktur geändert', found: Object.keys(found).length },
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
