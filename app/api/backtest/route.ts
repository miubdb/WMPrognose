import { NextResponse } from 'next/server'
import { evaluateModel, type EvalMode } from '@/lib/evaluateModel'
import { ALL_HISTORICAL_MATCHES } from '@/src/data/historicalResults'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phase      = searchParams.get('phase')
  const tournament = searchParams.get('tournament')
  const modeParam  = searchParams.get('mode') ?? 'currentLeakage'
  const ensemble   = searchParams.get('ensemble') === '1'

  const mode = (['eloOnly', 'historicalFull', 'currentLeakage'].includes(modeParam)
    ? modeParam : 'currentLeakage') as EvalMode

  const filtered = ALL_HISTORICAL_MATCHES.filter(m => {
    if (tournament && tournament !== 'all' && m.tournament !== tournament) return false
    if (phase && phase !== 'all' && m.phase !== phase) return false
    return true
  })

  const result = evaluateModel(filtered, mode, ensemble)
  return NextResponse.json(result)
}
