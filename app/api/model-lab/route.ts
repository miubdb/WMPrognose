import { NextResponse } from 'next/server'
import { evaluateModel } from '@/lib/evaluateModel'
import { ALL_HISTORICAL_MATCHES } from '@/src/data/historicalResults'
import { bootstrapDelta } from '@/lib/bootstrap'
import { runAblation } from '@/lib/ablation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tournament      = searchParams.get('tournament') ?? 'all'
  const withAblation    = searchParams.get('ablation') === '1'

  const matchset = tournament === 'all'
    ? ALL_HISTORICAL_MATCHES
    : ALL_HISTORICAL_MATCHES.filter(m => m.tournament === tournament)

  if (matchset.length === 0) {
    return NextResponse.json({ ok: false, error: 'No matches for selected tournament' }, { status: 400 })
  }

  try {
    const eloOnly        = evaluateModel(matchset, 'eloOnly',        false)
    const historicalFull = evaluateModel(matchset, 'historicalFull', false)
    const leakage        = evaluateModel(matchset, 'currentLeakage', false)
    const withEnsemble   = evaluateModel(matchset, 'historicalFull', true)

    // Bootstrap: is Historical Full reliably better than ELO-only?
    const bootFullVsElo  = bootstrapDelta(historicalFull.rpsPairs)

    // Ablation — slower, only on demand
    const ablation = withAblation ? runAblation(matchset) : null

    return NextResponse.json({
      ok: true,
      tournament,
      matchCount: matchset.length,
      baselineRPS: historicalFull.baselineRPS,
      modes: {
        eloOnly: {
          rps: eloOnly.avgRPS, logLoss: eloOnly.avgLogLoss, brier: eloOnly.avgBrier,
          ece: eloOnly.ece, skillScore: eloOnly.skillScore,
          correctTendency: eloOnly.correctTendency,
          drawRate: eloOnly.drawRate, drawPredAvg: eloOnly.drawPredictionAvg,
          baselineRPS: eloOnly.baselineRPS,
        },
        historicalFull: {
          rps: historicalFull.avgRPS, logLoss: historicalFull.avgLogLoss, brier: historicalFull.avgBrier,
          ece: historicalFull.ece, skillScore: historicalFull.skillScore,
          correctTendency: historicalFull.correctTendency,
          drawRate: historicalFull.drawRate, drawPredAvg: historicalFull.drawPredictionAvg,
          baselineRPS: historicalFull.baselineRPS,
        },
        currentLeakage: {
          rps: leakage.avgRPS, logLoss: leakage.avgLogLoss, brier: leakage.avgBrier,
          ece: leakage.ece, skillScore: leakage.skillScore,
          correctTendency: leakage.correctTendency,
          drawRate: leakage.drawRate, drawPredAvg: leakage.drawPredictionAvg,
          baselineRPS: leakage.baselineRPS,
          leakageWarning: true,
        },
      },
      ensembles: withEnsemble.ensembleComparison ?? [],
      tournamentBreakdown: {
        eloOnly:        eloOnly.tournamentBreakdown,
        historicalFull: historicalFull.tournamentBreakdown,
        currentLeakage: leakage.tournamentBreakdown,
      },
      bootstrap: { fullVsElo: bootFullVsElo },
      ablation: ablation ? ablation.map(r => ({
        label:           r.config.label,
        description:     r.config.description,
        rps:             r.rps,
        deltaRps:        r.deltaRps,
        logLoss:         r.logLoss,
        brier:           r.brier,
        ece:             r.ece,
        correctTendency: r.correctTendency,
        skillScore:      r.skillScore,
        baselineRPS:     r.baselineRPS,
        perTournamentRps: r.perTournamentRps,
        stabilityFlag:   r.stabilityFlag,
        bootstrap:       r.bootstrap,
        recommendation:  r.recommendation,
      })) : null,
    })
  } catch (err) {
    console.error('[model-lab]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
