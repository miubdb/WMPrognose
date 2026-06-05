import { NextResponse } from 'next/server'
import { HISTORICAL_SNAPSHOTS, type TournamentId } from '@/src/data/historicalSnapshots'

export const dynamic = 'force-dynamic'

const TOURNAMENT_LABELS: Record<TournamentId, string> = {
  WC2014: 'WM 2014', WC2018: 'WM 2018', WC2022: 'WM 2022', EURO2024: 'EM 2024',
}

export async function GET() {
  const tournaments: TournamentId[] = ['WC2014', 'WC2018', 'WC2022', 'EURO2024']

  const summary = tournaments.map(t => {
    const snaps = HISTORICAL_SNAPSHOTS.filter(s => s.tournament === t)
    const withMv    = snaps.filter(s => s.marketValueM != null)
    const estimated = snaps.filter(s => s.marketValueEstimated === true)
    const real      = withMv.filter(s => !s.marketValueEstimated)
    const missing   = snaps.filter(s => s.marketValueM == null)
    const qualities = snaps.map(s => s.sourceQuality)
    const hasHigh   = qualities.some(q => q === 'high')
    const allLow    = qualities.every(q => q === 'low')

    const overallQuality: 'gut' | 'mittel' | 'schlecht' =
      hasHigh ? 'gut' : allLow ? 'schlecht' : 'mittel'

    const missingTeams   = missing.map(s => s.teamName)
    const estimatedTeams = estimated.map(s => s.teamName)

    return {
      tournamentId: t,
      label:        TOURNAMENT_LABELS[t],
      teamCount:    snaps.length,
      withMvCount:  withMv.length,
      realMvCount:  real.length,
      estimatedCount: estimated.length,
      missingCount: missing.length,
      overallQuality,
      missingTeams,
      estimatedTeams,
    }
  })

  return NextResponse.json({ ok: true, summary })
}
