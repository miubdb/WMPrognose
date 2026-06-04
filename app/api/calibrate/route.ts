import { NextResponse } from 'next/server'
import { runGridSearch, runWalkForwardCalibration } from '@/lib/calibration'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'grid'

  try {
    if (mode === 'walkforward') {
      const result = runWalkForwardCalibration()
      return NextResponse.json({ ok: true, result })
    }

    const summary = runGridSearch()
    return NextResponse.json({
      ok: true,
      summary,
      meta: {
        gridSize: 7 * 6 * 5,
        matchesEvaluated: summary.best.matchesEvaluated,
        optimizationMetric: 'RPS (minimiert)',
        dataset: 'WM 2022 Gruppenphase (Teams in WM 2026)',
      },
    })
  } catch (err) {
    console.error('[calibrate] fehlgeschlagen:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
