import { NextResponse } from 'next/server'
import { evaluateModel, PRESET_ENSEMBLES, type EvalMode } from '@/lib/evaluateModel'
import { ALL_HISTORICAL_MATCHES, HISTORICAL_MATCHES } from '@/src/data/historicalResults'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tournament = searchParams.get('tournament') ?? 'all'

  // Run all three modes + ensemble on the requested dataset
  const matchset = (() => {
    const base = tournament === 'all' ? ALL_HISTORICAL_MATCHES : ALL_HISTORICAL_MATCHES.filter(m => m.tournament === tournament)
    return base
  })()

  if (matchset.length === 0) {
    return NextResponse.json({ ok: false, error: 'No matches for selected tournament' }, { status: 400 })
  }

  try {
    const eloOnly        = evaluateModel(matchset, 'eloOnly',        false)
    const historicalFull = evaluateModel(matchset, 'historicalFull', false)
    const leakage        = evaluateModel(matchset, 'currentLeakage', false)
    // Full ensemble comparison using historicalFull mode as base
    const withEnsemble   = evaluateModel(matchset, 'historicalFull', true)

    return NextResponse.json({
      ok: true,
      tournament,
      matchCount: matchset.length,
      modes: {
        eloOnly: {
          rps: eloOnly.avgRPS, logLoss: eloOnly.avgLogLoss, brier: eloOnly.avgBrier,
          ece: eloOnly.ece, skillScore: eloOnly.skillScore,
          correctTendency: eloOnly.correctTendency,
          drawRate: eloOnly.drawRate, drawPredAvg: eloOnly.drawPredictionAvg,
        },
        historicalFull: {
          rps: historicalFull.avgRPS, logLoss: historicalFull.avgLogLoss, brier: historicalFull.avgBrier,
          ece: historicalFull.ece, skillScore: historicalFull.skillScore,
          correctTendency: historicalFull.correctTendency,
          drawRate: historicalFull.drawRate, drawPredAvg: historicalFull.drawPredictionAvg,
        },
        currentLeakage: {
          rps: leakage.avgRPS, logLoss: leakage.avgLogLoss, brier: leakage.avgBrier,
          ece: leakage.ece, skillScore: leakage.skillScore,
          correctTendency: leakage.correctTendency,
          drawRate: leakage.drawRate, drawPredAvg: leakage.drawPredictionAvg,
          leakageWarning: true,
        },
      },
      ensembles: withEnsemble.ensembleComparison ?? [],
      baselineRPS: eloOnly.baselineRPS,
    })
  } catch (err) {
    console.error('[model-lab]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
