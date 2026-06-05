import { NextResponse } from 'next/server'
import { HISTORICAL_SNAPSHOTS, type TournamentId } from '@/src/data/historicalSnapshots'

export const dynamic = 'force-dynamic'

const TOURNAMENT_LABELS: Record<TournamentId, string> = {
  WC2014: 'WM 2014', WC2018: 'WM 2018', WC2022: 'WM 2022', EURO2024: 'EM 2024',
}

const EXPECTED_TEAM_COUNT: Record<TournamentId, number> = {
  WC2014: 32, WC2018: 32, WC2022: 32, EURO2024: 24,
}

export async function GET() {
  const tournaments: TournamentId[] = ['WC2014', 'WC2018', 'WC2022', 'EURO2024']

  const summary = tournaments.map(t => {
    const snaps       = HISTORICAL_SNAPSHOTS.filter(s => s.tournament === t)
    const expected    = EXPECTED_TEAM_COUNT[t]
    const withMv      = snaps.filter(s => s.marketValueM != null)
    const estimated   = snaps.filter(s => s.marketValueEstimated === true)
    const real        = withMv.filter(s => !s.marketValueEstimated)
    const missing     = snaps.filter(s => s.marketValueM == null)
    const fallbacks   = expected - snaps.length   // teams in match data not covered by snapshots
    const qualities   = snaps.map(s => s.sourceQuality)
    const hasHigh     = qualities.some(q => q === 'high')
    const allLow      = qualities.every(q => q === 'low')

    const overallQuality: 'gut' | 'mittel' | 'schlecht' =
      hasHigh ? 'gut' : allLow ? 'schlecht' : 'mittel'

    const missingTeams   = missing.map(s => s.teamName)
    const estimatedTeams = estimated.map(s => s.teamName)

    return {
      tournamentId:      t,
      label:             TOURNAMENT_LABELS[t],
      expectedTeamCount: expected,
      teamCount:         snaps.length,
      withMvCount:       withMv.length,
      realMvCount:       real.length,
      estimatedCount:    estimated.length,
      missingCount:      missing.length,
      fallbackCount:     Math.max(0, fallbacks),
      overallQuality,
      missingTeams,
      estimatedTeams,
    }
  })

  // recentEstimated = tournaments fully covered with medium+ quality
  const recentEstimatedTournaments = summary.filter(
    s => s.teamCount >= s.expectedTeamCount && s.overallQuality !== 'schlecht'
  ).map(s => s.label)

  const recommendedMode = recentEstimatedTournaments.length >= 2 ? 'recentEstimated' : 'allSnapshots'

  return NextResponse.json({
    ok: true,
    summary,
    calibration: {
      recommendedMode,
      recentEstimatedTournaments,
      note: 'Alle Marktwerte sind Schätzungen (Transfermarkt-Archiv) — nicht manuell verifiziert. verifiedOnly ist leer.',
      dataQualityWarning: 'Parameterempfehlung basiert auf historischen Marktwert-Schätzungen. Vorläufig nutzbar, aber nicht final validiert.',
    },
  })
}
