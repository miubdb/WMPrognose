import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// All WM 2026 teams with their German and English names for matching
const TEAM_NAME_ALIASES: Record<string, string[]> = {
  germany:      ['Germany', 'Deutschland', 'GER'],
  france:       ['France', 'Frankreich', 'FRA'],
  spain:        ['Spain', 'Spanien', 'ESP'],
  england:      ['England', 'ENG'],
  brazil:       ['Brazil', 'Brasil', 'Brasilien', 'BRA'],
  argentina:    ['Argentina', 'Argentinien', 'ARG'],
  portugal:     ['Portugal', 'POR'],
  netherlands:  ['Netherlands', 'Holland', 'Niederlande', 'NED'],
  belgium:      ['Belgium', 'Belgien', 'BEL'],
  croatia:      ['Croatia', 'Kroatien', 'CRO'],
  switzerland:  ['Switzerland', 'Schweiz', 'SUI'],
  denmark:      ['Denmark', 'Dänemark', 'DEN'],
  austria:      ['Austria', 'Österreich', 'AUT'],
  turkey:       ['Turkey', 'Türkei', 'Türkiye', 'TUR'],
  ukraine:      ['Ukraine', 'UKR'],
  serbia:       ['Serbia', 'Serbien', 'SRB'],
  morocco:      ['Morocco', 'Marokko', 'MAR'],
  senegal:      ['Senegal', 'SEN'],
  ivory_coast:  ['Ivory Coast', "Côte d'Ivoire", 'Elfenbeinküste', 'CIV'],
  nigeria:      ['Nigeria', 'NGA'],
  japan:        ['Japan', 'JPN'],
  south_korea:  ['South Korea', 'Korea', 'Korea Republic', 'Südkorea', 'KOR'],
  iran:         ['Iran', 'IR Iran', 'IRN'],
  australia:    ['Australia', 'Australien', 'AUS'],
  saudi_arabia: ['Saudi Arabia', 'Saudi-Arabien', 'KSA', 'SAU'],
  usa:          ['USA', 'United States', 'United States of America', 'US'],
  mexico:       ['Mexico', 'Mexiko', 'MEX'],
  canada:       ['Canada', 'Kanada', 'CAN'],
  ecuador:      ['Ecuador', 'ECU'],
  colombia:     ['Colombia', 'Kolumbien', 'COL'],
  uruguay:      ['Uruguay', 'URU'],
  chile:        ['Chile', 'CHI'],
  venezuela:    ['Venezuela', 'VEN'],
  paraguay:     ['Paraguay', 'PAR'],
  egypt:        ['Egypt', 'Ägypten', 'EGY'],
  ghana:        ['Ghana', 'GHA'],
  cameroon:     ['Cameroon', 'Kamerun', 'CMR'],
  algeria:      ['Algeria', 'Algerien', 'ALG'],
  mali:         ['Mali', 'MLI'],
  tunisia:      ['Tunisia', 'Tunesien', 'TUN'],
  cape_verde:   ['Cape Verde', 'Cabo Verde', 'Kapverdische Inseln', 'CPV'],
  congo_dr:     ['DR Congo', 'Congo DR', 'DR Kongo', 'Kongo', 'COD'],
  sweden:       ['Sweden', 'Schweden', 'SWE'],
  poland:       ['Poland', 'Polen', 'POL'],
  czech:        ['Czech Republic', 'Czechia', 'Tschechien', 'CZE'],
  hungary:      ['Hungary', 'Ungarn', 'HUN'],
  scotland:     ['Scotland', 'Schottland', 'SCO'],
  new_zealand:  ['New Zealand', 'Neuseeland', 'NZL'],
  qatar:        ['Qatar', 'Katar', 'QAT'],
  panama:       ['Panama', 'PAN'],
  haiti:        ['Haiti', 'HAI'],
  curacao:      ['Curaçao', 'Curacao', 'CUW'],
  bosnia:       ['Bosnia', 'Bosnia and Herzegovina', 'Bosnien', 'BIH'],
  thailand:     ['Thailand', 'THA'],
  norway:       ['Norway', 'Norwegen', 'NOR'],
  uzbekistan:   ['Uzbekistan', 'Usbekistan', 'UZB'],
  jordan:       ['Jordan', 'Jordanien', 'JOR'],
  iraq:         ['Iraq', 'Irak', 'IRQ'],
  south_africa: ['South Africa', 'Südafrika', 'RSA', 'SAF'],
}

// Build reverse lookup: normalized name → team_id
function buildLookup(): Map<string, string> {
  const m = new Map<string, string>()
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const [id, aliases] of Object.entries(TEAM_NAME_ALIASES)) {
    for (const alias of aliases) m.set(norm(alias), id)
  }
  return m
}

// Hardcoded fallback values (eloratings.net, April 2025)
const ELO_FALLBACK: Record<string, number> = {
  argentina: 2057, spain: 2048, france: 2025, brazil: 2013, england: 1987,
  portugal: 1970, netherlands: 1961, germany: 1944, belgium: 1898, croatia: 1882,
  switzerland: 1875, denmark: 1853, austria: 1780, turkey: 1762, ukraine: 1770,
  serbia: 1778, morocco: 1796, senegal: 1775, ivory_coast: 1728, nigeria: 1714,
  japan: 1758, south_korea: 1740, iran: 1720, australia: 1706, saudi_arabia: 1688,
  usa: 1750, mexico: 1748, canada: 1714, ecuador: 1718, colombia: 1732,
  uruguay: 1722, chile: 1688, venezuela: 1648, paraguay: 1652,
  egypt: 1677, ghana: 1694, cameroon: 1700, algeria: 1670, mali: 1674,
  tunisia: 1658, cape_verde: 1625, congo_dr: 1652, sweden: 1740, poland: 1748,
  czech: 1742, hungary: 1718, scotland: 1736, new_zealand: 1638, qatar: 1677,
  panama: 1644, haiti: 1598, curacao: 1582, bosnia: 1700, thailand: 1582,
}

/**
 * POST /api/elo-manual
 * Body: { mode: 'fallback' } — load hardcoded values for all 48 teams
 *    OR { mode: 'text', text: '...' } — parse "Team 1234" lines
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const mode = body.mode ?? 'fallback'

  const updates: { team_id: string; elo_rating: number; source: string; updated_at: string }[] = []
  const now = new Date().toISOString()
  const skipped: string[] = []

  if (mode === 'fallback') {
    for (const [teamId, elo] of Object.entries(ELO_FALLBACK)) {
      updates.push({ team_id: teamId, elo_rating: elo, source: 'manual-fallback', updated_at: now })
    }
  } else if (mode === 'text') {
    const text: string = body.text ?? ''
    const lookup = buildLookup()
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      // Expect format: "Germany 1944" or "Germany: 1944" or "Germany\t1944"
      const match = line.match(/^(.+?)[\s:,\t]+(\d{3,4})\s*$/)
      if (!match) { skipped.push(line); continue }

      const name = match[1].trim()
      const elo = parseInt(match[2])
      if (elo < 500 || elo > 2500) { skipped.push(line); continue }

      const teamId = lookup.get(norm(name))
      if (!teamId) { skipped.push(`Unbekannt: ${name}`); continue }

      updates.push({ team_id: teamId, elo_rating: elo, source: 'manual-text', updated_at: now })
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Keine gültigen Werte', skipped }, { status: 400 })
  }

  const { error } = await adminSupabase
    .from('team_elo_ratings')
    .upsert(updates, { onConflict: 'team_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: updates.length, skipped, mode })
}
