import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TEAM_BY_ID, ALL_TEAMS } from '@/src/data/allTeams'
import { PLAYERS_BY_TEAM } from '@/src/data/players'
import SquadEditor from '@/components/SquadEditor'

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

  const ratings = [
    { label: 'Angriff', value: team.attackRating, color: 'bg-rose-500' },
    { label: 'Mittelfeld', value: team.midfieldRating, color: 'bg-blue-500' },
    { label: 'Abwehr', value: team.defenseRating, color: 'bg-emerald-500' },
    { label: 'Torwart', value: team.goalkeeperRating, color: 'bg-yellow-500' },
    { label: 'Standards', value: team.setPieceRating, color: 'bg-purple-500' },
  ]

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

      {/* Squad Editor (interactive client component) */}
      {players.length > 0 ? (
        <SquadEditor players={players} teamId={params.id} />
      ) : (
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
