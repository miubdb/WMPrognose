import Link from 'next/link'
import { ALL_TEAMS } from '@/src/data/allTeams'

export default function TeamsPage() {
  const groups = [...new Set(ALL_TEAMS.map(t => t.group))].sort()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-gray-500 text-sm mt-1">Alle 48 WM 2026 Teams</p>
      </div>
      {groups.map(group => {
        const teams = ALL_TEAMS.filter(t => t.group === group)
        return (
          <div key={group}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gruppe {group}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {teams.map(team => (
                <Link key={team.id} href={`/teams/${team.id}`}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-emerald-800 transition-colors flex items-center gap-3">
                  <span className="text-2xl">{team.flag}</span>
                  <div>
                    <div className="text-sm font-medium text-white leading-tight">{team.name}</div>
                    <div className="text-xs text-gray-500">ELO {team.eloRating}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
