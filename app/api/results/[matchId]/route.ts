import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { TEAM_BY_ID } from '@/src/data/allTeams'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const K_WC = 60  // FIFA WM = höchste K-Stufe

/**
 * Berechnet das Live-ELO für alle Teams neu, basierend auf:
 * 1. Basis-ELO aus team_elo_ratings (Wikipedia/Manual) oder allTeams.ts
 * 2. Alle bisher eingetragenen Ergebnisse in chronologischer Reihenfolge
 *
 * Korrekturen werden dadurch automatisch korrekt behandelt.
 */
async function recomputeLiveElo(): Promise<Record<string, number>> {
  const [eloRes, resultsRes] = await Promise.all([
    adminSupabase.from('team_elo_ratings').select('team_id, elo_rating, source'),
    adminSupabase.from('match_results').select('match_id, goals_a, goals_b'),
  ])

  // Basis-ELO: allTeams.ts als Fallback, überschrieben durch Wikipedia/Manual
  const liveElo: Record<string, number> = {}
  for (const team of Object.values(TEAM_BY_ID)) {
    liveElo[team.id] = team.eloRating ?? 1500
  }
  for (const row of eloRes.data ?? []) {
    // 'tournament-result' Einträge ignorieren — nur statische Basis verwenden
    if (row.source !== 'tournament-result') {
      liveElo[row.team_id] = row.elo_rating
    }
  }

  const results = resultsRes.data ?? []
  if (results.length === 0) return liveElo

  // Ergebnis-Lookup
  const resultMap: Record<string, { goals_a: number; goals_b: number }> = {}
  for (const r of results) resultMap[r.match_id] = r

  // Matches mit eingetragenen Ergebnissen chronologisch sortieren
  const played = GROUP_SCHEDULE
    .filter(m => resultMap[m.id])
    .sort((a, b) => a.date.localeCompare(b.date) || a.kickoffUTC.localeCompare(b.kickoffUTC))

  // ELO-Formel (Standard Elo, K=60) für jedes Ergebnis in Reihenfolge anwenden
  for (const match of played) {
    const result = resultMap[match.id]
    const eloA = liveElo[match.teamAId] ?? 1500
    const eloB = liveElo[match.teamBId] ?? 1500

    const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
    const scoreA = result.goals_a > result.goals_b ? 1 : result.goals_a === result.goals_b ? 0.5 : 0
    const deltaA = Math.round(K_WC * (scoreA - expectedA))

    liveElo[match.teamAId] = eloA + deltaA
    liveElo[match.teamBId] = eloB - deltaA
  }

  return liveElo
}

export async function PUT(req: Request, { params }: { params: { matchId: string } }) {
  const { goals_a, goals_b } = await req.json()
  if (typeof goals_a !== 'number' || typeof goals_b !== 'number' || goals_a < 0 || goals_b < 0) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  const { error } = await adminSupabase
    .from('match_results')
    .upsert({ match_id: params.matchId, goals_a, goals_b, updated_at: new Date().toISOString() },
             { onConflict: 'match_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ELO für alle Teams neu berechnen und in Supabase speichern
  const updatedElo = await recomputeLiveElo()
  const now = new Date().toISOString()
  const upsertData = Object.entries(updatedElo)
    .filter(([teamId]) => GROUP_SCHEDULE.some(m => m.teamAId === teamId || m.teamBId === teamId))
    .map(([team_id, elo_rating]) => ({
      team_id,
      elo_rating: Math.round(elo_rating),
      source: 'tournament-result',
      updated_at: now,
    }))

  if (upsertData.length > 0) {
    await adminSupabase.from('team_elo_ratings').upsert(upsertData, { onConflict: 'team_id' })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { matchId: string } }) {
  await adminSupabase.from('match_results').delete().eq('match_id', params.matchId)

  // ELO nach Löschung ebenfalls neu berechnen
  const updatedElo = await recomputeLiveElo()
  const now = new Date().toISOString()
  const upsertData = Object.entries(updatedElo)
    .filter(([teamId]) => GROUP_SCHEDULE.some(m => m.teamAId === teamId || m.teamBId === teamId))
    .map(([team_id, elo_rating]) => ({
      team_id,
      elo_rating: Math.round(elo_rating),
      source: 'tournament-result',
      updated_at: now,
    }))

  if (upsertData.length > 0) {
    await adminSupabase.from('team_elo_ratings').upsert(upsertData, { onConflict: 'team_id' })
  }

  return NextResponse.json({ ok: true })
}
