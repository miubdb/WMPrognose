import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('players').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
