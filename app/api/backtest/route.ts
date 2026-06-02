import { NextResponse } from 'next/server'
import { evaluateModel } from '@/lib/evaluateModel'
import { HISTORICAL_MATCHES } from '@/src/data/historicalResults'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phase = searchParams.get('phase') // 'group', 'round16', 'quarter', 'semi', 'final', 'all'
  const tournament = searchParams.get('tournament') // 'WM2022', 'all'

  const filtered = HISTORICAL_MATCHES.filter(m => {
    if (tournament && tournament !== 'all' && m.tournament !== tournament) return false
    if (phase && phase !== 'all' && m.phase !== phase) return false
    return true
  })

  const result = evaluateModel(filtered)
  return NextResponse.json(result)
}
