import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await adminSupabase.from('players').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { is_in_starting_xi } = body
  if (typeof is_in_starting_xi !== 'boolean') {
    return NextResponse.json({ error: 'is_in_starting_xi must be boolean' }, { status: 400 })
  }
  const { error } = await adminSupabase
    .from('players')
    .update({ is_in_starting_xi })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
