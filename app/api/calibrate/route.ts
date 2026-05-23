import { NextResponse } from 'next/server'
import { runGridSearch } from '@/lib/calibration'

export const dynamic = 'force-dynamic'

/**
 * GET /api/calibrate
 *
 * Führt einen Grid Search über 210 Parameterkombinationen durch
 * (baseGoalRate × eloWeight × dixonColesRho) und gibt die besten
 * Konfigurationen zurück.
 *
 * Optimierungsmetrik: RPS (Ranked Probability Score, minimieren)
 * Datenbasis: WM 2022 Gruppenspiele (nur Teams in WM 2026)
 */
export async function GET() {
  try {
    const summary = runGridSearch()

    return NextResponse.json({
      ok: true,
      summary,
      meta: {
        gridSize: 7 * 6 * 5,  // 210 Kombinationen
        matchesEvaluated: summary.best.matchesEvaluated,
        optimizationMetric: 'RPS (minimiert)',
        dataset: 'WM 2022 Gruppenphase (Teams in WM 2026)',
      },
    })
  } catch (err) {
    console.error('[calibrate] Grid Search fehlgeschlagen:', err)
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
