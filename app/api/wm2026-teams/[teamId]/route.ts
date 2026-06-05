import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PATCH(
  req: Request,
  { params }: { params: { teamId: string } }
) {
  const teamId = params.teamId
  const body = await req.json().catch(() => ({}))

  try {
    // Separate ELO fields from team data fields
    const { elo_rating, ...teamFields } = body
    const errors: string[] = []

    if (Object.keys(teamFields).length > 0) {
      const { error } = await sb
        .from('wm2026_teams')
        .update({ ...teamFields, updated_at: new Date().toISOString() })
        .eq('team_id', teamId)
      if (error) errors.push(`wm2026_teams: ${error.message}`)
    }

    if (elo_rating !== undefined) {
      const { error } = await sb
        .from('team_elo_ratings')
        .upsert({ team_id: teamId, elo_rating: Number(elo_rating), source: 'manual-datenmodell', updated_at: new Date().toISOString() }, { onConflict: 'team_id' })
      if (error) errors.push(`team_elo_ratings: ${error.message}`)
    }

    if (errors.length > 0) return NextResponse.json({ ok: false, errors }, { status: 500 })
    return NextResponse.json({ ok: true, teamId })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
