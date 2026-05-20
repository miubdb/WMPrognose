import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MATCH_BY_ID, GROUP_SCHEDULE } from '@/src/data/schedule'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { getMatchPrediction } from '@/lib/modelAdapter'
import { VENUES } from '@/src/data/venues'
import MatchDetailTabs from '@/components/MatchDetailTabs'

export function generateStaticParams() {
  return GROUP_SCHEDULE.map(m => ({ id: m.id }))
}

interface Props {
  params: { id: string }
}

const VENUE_NAMES: Record<string, string> = {
  mexico_city: 'Estadio Azteca, Mexico City',
  guadalajara: 'Estadio Akron, Guadalajara',
  monterrey: 'Estadio BBVA, Monterrey',
  miami: 'Hard Rock Stadium, Miami',
  houston: 'NRG Stadium, Houston',
  dallas: 'AT&T Stadium, Dallas',
  new_york: 'MetLife Stadium, New York/NJ',
  los_angeles: 'SoFi Stadium, Los Angeles',
  toronto: 'BMO Field, Toronto',
  vancouver: 'BC Place, Vancouver',
}

export default async function MatchDetailPage({ params }: Props) {
  const match = MATCH_BY_ID[params.id]
  if (!match || match.teamAId === 'tbd') notFound()

  const teamA = TEAM_BY_ID[match.teamAId]
  const teamB = TEAM_BY_ID[match.teamBId]
  if (!teamA || !teamB) notFound()

  const prediction = await getMatchPrediction({
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    venueId: match.venueId,
  })

  const venue = VENUES[match.venueId]
  const venueName = VENUE_NAMES[match.venueId] ?? match.venueId

  return (
    <div className="space-y-4">
      <Link href="/matches" className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1">
        ← Alle Spiele
      </Link>

      <MatchDetailTabs
        matchId={params.id}
        teamA={teamA}
        teamB={teamB}
        prediction={prediction}
        venue={venue}
        venueName={venueName}
        matchGroup={match.group}
        matchday={match.matchday}
        matchDate={match.date}
        kickoffUTC={match.kickoffUTC}
      />
    </div>
  )
}
