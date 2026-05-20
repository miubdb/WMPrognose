import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TEAM_BY_ID, ALL_TEAMS } from '@/src/data/allTeams'
import { PLAYERS_BY_TEAM } from '@/src/data/players'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import TeamDetailTabs from '@/components/TeamDetailTabs'

export function generateStaticParams() {
  return ALL_TEAMS.map(team => ({ id: team.id }))
}

interface Props {
  params: { id: string }
}

export default function TeamDetailPage({ params }: Props) {
  const team = TEAM_BY_ID[params.id]
  if (!team) notFound()

  const players = PLAYERS_BY_TEAM[params.id] ?? []

  // Gruppenspiele dieses Teams
  const groupMatches = GROUP_SCHEDULE.filter(
    m => m.round === 'group' && (m.teamAId === params.id || m.teamBId === params.id)
  )

  // Gegner-Map aufbauen
  const opponentIds = groupMatches.map(m =>
    m.teamAId === params.id ? m.teamBId : m.teamAId
  )
  const opponentMap = Object.fromEntries(
    opponentIds.map(id => [id, TEAM_BY_ID[id]]).filter(([, t]) => !!t)
  )

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link href="/teams" className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1">
        ← Alle Teams
      </Link>

      <TeamDetailTabs
        team={team}
        players={players}
        groupMatches={groupMatches}
        opponentMap={opponentMap as Record<string, import('@/src/data/allTeams').TeamBasic>}
      />
    </div>
  )
}
