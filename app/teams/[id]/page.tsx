import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TEAM_BY_ID, ALL_TEAMS } from '@/src/data/allTeams'
import { PLAYERS_BY_TEAM, type Player } from '@/src/data/players'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import TeamDetailTabs from '@/components/TeamDetailTabs'
import { supabase, type DBPlayer } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return ALL_TEAMS.map(team => ({ id: team.id }))
}

function mapDBPlayer(p: DBPlayer): Player {
  return {
    id: p.id,
    teamId: p.team_id,
    name: p.name,
    position: p.position,
    age: p.age,
    marketValueM: p.market_value_m,
    clubTeam: p.club_team ?? undefined,
    xGPer90: p.xg_per90 ?? undefined,
    xGAPer90: p.xga_per90 ?? undefined,
    isInStartingXI: p.is_in_starting_xi,
    jerseyNumber: p.jersey_number ?? undefined,
    rating: p.rating,
  }
}

interface Props {
  params: { id: string }
}

export default async function TeamDetailPage({ params }: Props) {
  const team = TEAM_BY_ID[params.id]
  if (!team) notFound()

  // Prefer Supabase data, fall back to static data for teams not yet entered
  const { data: dbPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', params.id)
    .order('is_in_starting_xi', { ascending: false })
    .order('rating', { ascending: false })

  const players: Player[] = dbPlayers && dbPlayers.length > 0
    ? dbPlayers.map(mapDBPlayer)
    : (PLAYERS_BY_TEAM[params.id] ?? [])

  const groupMatches = GROUP_SCHEDULE.filter(
    m => m.round === 'group' && (m.teamAId === params.id || m.teamBId === params.id)
  )

  const opponentIds = groupMatches.map(m =>
    m.teamAId === params.id ? m.teamBId : m.teamAId
  )
  const opponentMap = Object.fromEntries(
    opponentIds.map(id => [id, TEAM_BY_ID[id]]).filter(([, t]) => !!t)
  ) as Record<string, import('@/src/data/allTeams').TeamBasic>

  return (
    <div className="space-y-4">
      <Link href="/teams" className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1">
        ← Alle Teams
      </Link>

      <TeamDetailTabs
        team={team}
        players={players}
        groupMatches={groupMatches}
        opponentMap={opponentMap}
      />
    </div>
  )
}
