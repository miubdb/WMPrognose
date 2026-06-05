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
  checkBoundary,
  type ParamPoint,
} from '@/lib/calibrateParams'
import { MODEL_WEIGHTS, MODEL_META } from '@/lib/model/config'

export const dynamic = 'force-dynamic'

// Match sets for each calibration mode
const CALIB_MODE_TOURNAMENTS: Record<string, string[]> = {
  recentEstimated: ['WM2022', 'EURO2024'],
  allSnapshots:    ['WM2014', 'WM2018', 'WM2022', 'EURO2024'],
}

function getMatchSet(calibMode: string, tournamentFilter: string) {
  const allowed = CALIB_MODE_TOURNAMENTS[calibMode] ?? CALIB_MODE_TOURNAMENTS.allSnapshots
  let matches = ALL_HISTORICAL_MATCHES.filter(m => allowed.includes(m.tournament))
  if (tournamentFilter !== 'all') matches = matches.filter(m => m.tournament === tournamentFilter)
  return matches
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode       = searchParams.get('mode') ?? 'grid'
  const tournament = searchParams.get('tournament') ?? 'all'
  const calibMode  = searchParams.get('calibMode') ?? 'allSnapshots'

  // verifiedOnly is disabled until verified archive values exist
  if (calibMode === 'verifiedOnly') {
    return NextResponse.json({
      ok: false,
      error: 'verifiedOnly ist deaktiviert — keine verifizierten Archivmarktwerte verfügbar.',
      disabled: true,
    }, { status: 422 })
  }

  const currentConfig: ParamPoint = {
    marketValueWeight: MODEL_WEIGHTS.marketValueLog,
    heritageScale: 1.0,
    rho: MODEL_META.dixonColesRho,
  }

  try {
    // ── Compare mode: run recommend for each active calibration mode ──────────
    if (mode === 'compare') {
      const activeModes = ['recentEstimated', 'allSnapshots']
      const rows = await Promise.all(activeModes.map(async cm => {
        const matchset = getMatchSet(cm, tournament)
        if (matchset.length < 10) {
          return { calibMode: cm, error: `Zu wenig Spiele (${matchset.length})` }
        }
        const gridResult   = combinedGridSearch(matchset, 30)
        const recommendation = recommendRobustConfig(matchset, gridResult.topByRPS)
        return {
          calibMode: cm,
          matchCount: matchset.length,
          marketValueWeight: recommendation.marketValueWeight,
          heritageScale:     recommendation.heritageScale,
          rho:               recommendation.rho,
          inSampleRPS:       recommendation.inSampleRPS,
          oosRPS:            recommendation.oosRPS,
          avgOverfit:        recommendation.avgOverfit,
          bootstrapP:        recommendation.bootstrap.pBetter,
          stabilityStd:      recommendation.stabilityStd,
          boundaryWarning:   recommendation.boundaryWarning,
        }
      }))
      return NextResponse.json({ ok: true, mode: 'compare', tournament, rows })
    }

    const matchset = getMatchSet(calibMode, tournament)
    if (matchset.length === 0) {
      return NextResponse.json({ ok: false, error: 'No matches for selected filter' }, { status: 400 })
    }

    if (mode === 'sweep-mv') {
      const result = sweepMarketValueWeight(matchset, 0.0, currentConfig.rho)
      return NextResponse.json({ ok: true, mode, tournament, calibMode, matchCount: matchset.length, ...result })
    }

    if (mode === 'sweep-heritage') {
      const result = sweepHeritageScale(matchset, currentConfig.marketValueWeight, currentConfig.rho)
      return NextResponse.json({ ok: true, mode, tournament, calibMode, matchCount: matchset.length, ...result })
    }

    if (mode === 'sweep-rho') {
      const result = sweepRho(matchset, currentConfig.marketValueWeight, 0.0)
      return NextResponse.json({ ok: true, mode, tournament, calibMode, matchCount: matchset.length, ...result })
    }

    if (mode === 'grid') {
      const result = combinedGridSearch(matchset, 10)
      const top5   = result.topByRPS.slice(0, 5)
      const walkForwardResults = top5.map(p => walkForwardEval(p))
      const deltaVsCurrent = result.topByRPS.slice(0, 10).map(p => ({
        ...p, deltaRps: p.rps - result.current.rps, deltaEce: p.ece - result.current.ece,
      }))
      return NextResponse.json({
        ok: true, mode, tournament, calibMode,
        matchCount: matchset.length,
        gridSize: result.grid.length,
        topByRPS: deltaVsCurrent,
        topByECE: result.topByECE.slice(0, 10).map(p => ({
          ...p, deltaRps: p.rps - result.current.rps, deltaEce: p.ece - result.current.ece,
        })),
        current: result.current,
        walkForward: walkForwardResults,
      })
    }

    if (mode === 'recommend') {
      const gridResult     = combinedGridSearch(matchset, 30)
      const recommendation = recommendRobustConfig(matchset, gridResult.topByRPS)
      const eloBaseline: ParamPoint = { marketValueWeight: 0, heritageScale: 0, rho: 0 }
      const top5BootstrapResults = bootstrapTopConfigs(
        matchset, gridResult.topByRPS.slice(0, 5), eloBaseline, 2000
      )

      // Dixon-Coles comparison: best config with rho=0 vs best config with best rho
      const noRhoConfig: ParamPoint = { ...recommendation, rho: 0 }
      const evalWithRho  = gridResult.topByRPS.find(c => c.rho === recommendation.rho && c.marketValueWeight === recommendation.marketValueWeight) ?? gridResult.topByRPS[0]
      const evalNoRho    = gridResult.grid.find(c => c.rho === 0 && Math.abs(c.marketValueWeight - recommendation.marketValueWeight) < 0.001 && Math.abs(c.heritageScale - recommendation.heritageScale) < 0.001) ?? gridResult.topByRPS[0]

      return NextResponse.json({
        ok: true, mode, tournament, calibMode,
        matchCount: matchset.length,
        gridSize: gridResult.grid.length,
        recommendation,
        current: gridResult.current,
        top5Bootstrap: top5BootstrapResults,
        dixonColesComparison: {
          withRho:  { rho: recommendation.rho,     rps: evalWithRho?.rps,  ece: evalWithRho?.ece,  drawCalibration: evalWithRho?.drawCalibration },
          withoutRho: { rho: 0,                    rps: evalNoRho?.rps,    ece: evalNoRho?.ece,    drawCalibration: evalNoRho?.drawCalibration },
          removeDCRecommended: (recommendation.rho === 0 || (evalNoRho && evalWithRho && Math.abs(evalNoRho.rps - evalWithRho.rps) < 0.0005)),
        },
        configSnippet: [
          `// lib/model/config.ts — empfohlene Werte (${calibMode})`,
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
