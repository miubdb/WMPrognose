import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TEAM_BY_ID, ALL_TEAMS } from '@/src/data/allTeams'
import { PLAYERS_BY_TEAM } from '@/src/data/players'

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
  const starters = players.filter(p => p.isInStartingXI)
  const bench = players.filter(p => !p.isInStartingXI)

  const ratings = [
    { label: 'Angriff', value: team.attackRating, color: 'bg-rose-500' },
    { label: 'Mittelfeld', value: team.midfieldRating, color: 'bg-blue-500' },
    { label: 'Abwehr', value: team.defenseRating, color: 'bg-emerald-500' },
    { label: 'Torwart', value: team.goalkeeperRating, color: 'bg-yellow-500' },
    { label: 'Standards', value: team.setPieceRating, color: 'bg-purple-500' },
  ]

  const positionOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 }
  const sortedPlayers = [...players].sort((a, b) => positionOrder[a.position] - positionOrder[b.position])

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/teams" className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1">
        ← Alle Teams
      </Link>

      {/* Team Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <span className="text-5xl">{team.flag}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-400">
              <span>Gruppe {team.group}</span>
              <span>·</span>
              <span>{team.confederation}</span>
              <span>·</span>
              <span>{team.coach}</span>
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <div>
                <span className="text-xs text-gray-500">ELO Rating</span>
                <div className="font-mono text-emerald-400 font-bold">{team.eloRating}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Marktwert</span>
                <div className="font-mono">€{team.squadMarketValueM}M</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Ø Alter</span>
                <div className="font-mono">{team.squadAvgAge}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">WM-Titel</span>
                <div>{team.worldCupTitles > 0 ? '🏆'.repeat(team.worldCupTitles) : '–'}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">WM-Teilnahmen</span>
                <div>{team.worldCupAppearances}×</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ratings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-4">Stärke-Ratings</h2>
        <div className="space-y-3">
          {ratings.map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{label}</span>
                <span className="font-mono">{value}<span className="text-gray-600">/100</span></span>
              </div>
              <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Squad */}
      {players.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold">Kader ({players.length} Spieler)</h2>
          </div>

          {/* Starters */}
          {starters.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-800/50">
                <h3 className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Startelf</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {[...starters].sort((a, b) => positionOrder[a.position] - positionOrder[b.position]).map(player => (
                  <PlayerRow key={player.id} player={player} />
                ))}
              </div>
            </div>
          )}

          {/* Bench */}
          {bench.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-800/50">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Weiterer Kader</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {[...bench].sort((a, b) => positionOrder[a.position] - positionOrder[b.position]).map(player => (
                  <PlayerRow key={player.id} player={player} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Player Data */}
      {players.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">Detaillierte Kader-Daten für {team.name} noch nicht verfügbar.</p>
          <p className="text-gray-600 text-xs mt-2">Nur für die 12 Hauptteams sind vollständige Spielerdaten vorhanden.</p>
        </div>
      )}

      {/* Matches Link */}
      <div className="flex gap-3">
        <Link
          href={`/matches?group=${team.group}`}
          className="flex-1 text-center bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          Gruppenspiele ansehen
        </Link>
        <Link
          href="/tippspiel"
          className="flex-1 text-center bg-gray-800 hover:bg-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          Tipp-Empfehlungen
        </Link>
      </div>
    </div>
  )
}

function PlayerRow({ player }: { player: import('@/src/data/players').Player }) {
  const posColors: Record<string, string> = {
    GK: 'bg-yellow-500/20 text-yellow-400',
    DEF: 'bg-emerald-500/20 text-emerald-400',
    MID: 'bg-blue-500/20 text-blue-400',
    FWD: 'bg-rose-500/20 text-rose-400',
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/50 transition-colors">
      {player.jerseyNumber && (
        <span className="text-xs text-gray-600 w-5 text-right">{player.jerseyNumber}</span>
      )}
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${posColors[player.position]}`}>
        {player.position}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{player.name}</div>
        {player.clubTeam && (
          <div className="text-xs text-gray-500 truncate">{player.clubTeam}</div>
        )}
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-400">{player.age} J.</div>
        <div className="text-xs text-gray-500">€{player.marketValueM}M</div>
      </div>
      <div className="text-right">
        <div className="text-xs font-mono">
          <span className={player.rating >= 85 ? 'text-emerald-400' : player.rating >= 75 ? 'text-blue-400' : 'text-gray-400'}>
            {player.rating}
          </span>
        </div>
      </div>
    </div>
  )
}
