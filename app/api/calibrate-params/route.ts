import { NextResponse } from 'next/server'
import { ALL_HISTORICAL_MATCHES } from '@/src/data/historicalResults'
import {
  sweepMarketValueWeight,
  sweepHeritageScale,
  sweepRho,
  combinedGridSearch,
  walkForwardEval,
  bootstrapTopConfigs,
  recommendRobustConfig,
  type ParamPoint,
} from '@/lib/calibrateParams'
import { MODEL_WEIGHTS, MODEL_META } from '@/lib/model/config'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'grid'
  const tournament = searchParams.get('tournament') ?? 'all'

  const matchset = tournament === 'all'
    ? ALL_HISTORICAL_MATCHES
    : ALL_HISTORICAL_MATCHES.filter(m => m.tournament === tournament)

  if (matchset.length === 0) {
    return NextResponse.json({ ok: false, error: 'No matches for selected tournament' }, { status: 400 })
  }

  const currentConfig: ParamPoint = {
    marketValueWeight: MODEL_WEIGHTS.marketValueLog,
    heritageScale: 1.0,
    rho: MODEL_META.dixonColesRho,
  }

  try {
    if (mode === 'sweep-mv') {
      const result = sweepMarketValueWeight(matchset, 0.0, currentConfig.rho)
      return NextResponse.json({ ok: true, mode, tournament, matchCount: matchset.length, ...result })
    }

    if (mode === 'sweep-heritage') {
      const result = sweepHeritageScale(matchset, currentConfig.marketValueWeight, currentConfig.rho)
      return NextResponse.json({ ok: true, mode, tournament, matchCount: matchset.length, ...result })
    }

    if (mode === 'sweep-rho') {
      const result = sweepRho(matchset, currentConfig.marketValueWeight, 0.0)
      return NextResponse.json({ ok: true, mode, tournament, matchCount: matchset.length, ...result })
    }

    if (mode === 'grid') {
      const result = combinedGridSearch(matchset, 10)

      // Walk-forward for top 5 by RPS
      const top5 = result.topByRPS.slice(0, 5)
      const walkForwardResults = top5.map(p => walkForwardEval(p))

      // Delta vs current (in-sample)
      const deltaVsCurrent = result.topByRPS.slice(0, 10).map(p => ({
        ...p,
        deltaRps: p.rps - result.current.rps,
        deltaEce: p.ece - result.current.ece,
      }))

      return NextResponse.json({
        ok: true, mode, tournament,
        matchCount: matchset.length,
        gridSize: result.grid.length,
        topByRPS: deltaVsCurrent,
        topByECE: result.topByECE.slice(0, 10).map(p => ({
          ...p,
          deltaRps: p.rps - result.current.rps,
          deltaEce: p.ece - result.current.ece,
        })),
        current: result.current,
        walkForward: walkForwardResults,
      })
    }

    if (mode === 'recommend') {
      const gridResult = combinedGridSearch(matchset, 20)
      const recommendation = recommendRobustConfig(matchset, gridResult.topByRPS)

      // Bootstrap top-5 vs ELO-only
      const eloBaseline: ParamPoint = { marketValueWeight: 0, heritageScale: 0, rho: 0 }
      const top5BootstrapResults = bootstrapTopConfigs(
        matchset,
        gridResult.topByRPS.slice(0, 5),
        eloBaseline,
        2000
      )

      return NextResponse.json({
        ok: true, mode, tournament,
        matchCount: matchset.length,
        recommendation,
        current: gridResult.current,
        top5Bootstrap: top5BootstrapResults,
        configSnippet: [
          `// lib/model/config.ts — empfohlene Werte`,
          `marketValueLog: ${recommendation.marketValueWeight.toFixed(2)},  // war: ${MODEL_WEIGHTS.marketValueLog.toFixed(2)}`,
          `// heritageScale (in corePredict): ${recommendation.heritageScale.toFixed(2)}`,
          `dixonColesRho: ${recommendation.rho.toFixed(2)},  // war: ${MODEL_META.dixonColesRho.toFixed(2)}`,
        ].join('\n'),
      })
    }

    return NextResponse.json({ ok: false, error: `Unknown mode: ${mode}` }, { status: 400 })
  } catch (err) {
    console.error('[calibrate-params]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
