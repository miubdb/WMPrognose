import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PUT(req: Request, { params }: { params: { matchId: string } }) {
  const { goals_a, goals_b, penalty_a, penalty_b } = await req.json()
  if (typeof goals_a !== 'number' || typeof goals_b !== 'number' || goals_a < 0 || goals_b < 0) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }
  const hasPenalties = typeof penalty_a === 'number' && typeof penalty_b === 'number'
  if ((penalty_a != null || penalty_b != null) && !hasPenalties) {
    return NextResponse.json({ error: 'Invalid penalty score' }, { status: 400 })
  }
  const { error } = await adminSupabase
    .from('match_results')
    .upsert({
      match_id: params.matchId,
      goals_a,
      goals_b,
      penalty_a: hasPenalties ? penalty_a : null,
      penalty_b: hasPenalties ? penalty_b : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'match_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { matchId: string } }) {
  await adminSupabase.from('match_results').delete().eq('match_id', params.matchId)
  return NextResponse.json({ ok: true })
}
