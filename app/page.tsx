import Link from 'next/link'
import { TEAMS_BY_GROUP, ALL_TEAMS } from '@/src/data/allTeams'
import { GROUP_SCHEDULE } from '@/src/data/schedule'

function getCountdown(): { days: number; hours: number; minutes: number } {
  const now = new Date()
  const final = new Date('2026-07-19T22:00:00Z')
  const diff = final.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return { days, hours, minutes }
}

// Titelkandidaten basierend auf ELO
const TOP_TITLE_CONTENDERS = [
  { id: 'spain', prob: 18.4 },
  { id: 'argentina', prob: 16.2 },
  { id: 'france', prob: 15.8 },
  { id: 'england', prob: 12.5 },
  { id: 'brazil', prob: 11.3 },
  { id: 'germany', prob: 8.9 },
]

export default function HomePage() {
  const countdown = getCountdown()
  const groups = Object.keys(TEAMS_BY_GROUP).sort()

  // Nächste Spiele (erste 6 Gruppenspiele als Beispiel)
  const nextMatches = GROUP_SCHEDULE.slice(0, 6)

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
          FIFA WM 2026
          <span className="block text-emerald-400 text-2xl sm:text-3xl mt-1">Prognosemodell</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
          Wissenschaftliche Spielprognosen mit Poisson-Modell, Dixon-Coles-Korrektur,
          ELO-Ratings und Kontext-Modifiern für alle 48 Teams und 104 Spiele
        </p>

        {/* Countdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md mx-auto mt-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Finale · MetLife Stadium · 19. Juli 2026</p>
          <div className="flex justify-center gap-6">
            {[
              { val: countdown.days, label: 'Tage' },
              { val: countdown.hours, label: 'Stunden' },
              { val: countdown.minutes, label: 'Minuten' },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-mono font-bold text-emerald-400">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Titelkandidaten */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🥇</span> Titelkandidaten
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          {TOP_TITLE_CONTENDERS.map((c, i) => {
            const team = ALL_TEAMS.find(t => t.id === c.id)
            if (!team) return null
            return (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-5 text-right">{i + 1}.</span>
                <span className="text-xl">{team.flag}</span>
                <Link href={`/teams/${team.id}`} className="text-sm font-medium hover:text-emerald-400 transition-colors flex-1">
                  {team.name}
                </Link>
                <span className="text-xs text-gray-500 mr-2">ELO {team.eloRating}</span>
                <div className="flex items-center gap-2 w-40">
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${c.prob}%` }}
                    />
                  </div>
                  <span className="text-xs text-emerald-400 w-10 text-right">{c.prob}%</span>
                </div>
              </div>
            )
          })}
          <div className="pt-2 border-t border-gray-800">
            <Link href="/tournament" className="text-xs text-emerald-400 hover:text-emerald-300">
              Monte Carlo Simulation starten →
            </Link>
          </div>
        </div>
      </section>

      {/* Gruppen-Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📊</span> Gruppen
          </h2>
          <Link href="/teams" className="text-sm text-emerald-400 hover:text-emerald-300">
            Alle 48 Teams →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {groups.map(group => {
            const teams = TEAMS_BY_GROUP[group]
            return (
              <div key={group} className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-emerald-400">Gruppe {group}</h3>
                  <Link href={`/matches?group=${group}`} className="text-xs text-gray-500 hover:text-gray-300">
                    Spiele →
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {teams?.map(team => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="flex items-center gap-2 hover:bg-gray-800 rounded-lg px-2 py-1 transition-colors"
                    >
                      <span className="text-base">{team.flag}</span>
                      <span className="text-xs flex-1 truncate">{team.name}</span>
                      <span className="text-xs text-gray-500">{team.eloRating}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Nächste Spiele */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📅</span> Erste Spieltage
          </h2>
          <Link href="/matches" className="text-sm text-emerald-400 hover:text-emerald-300">
            Alle Spiele →
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {nextMatches.map(match => {
            const teamA = ALL_TEAMS.find(t => t.id === match.teamAId)
            const teamB = ALL_TEAMS.find(t => t.id === match.teamBId)
            if (!teamA || !teamB) return null
            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-emerald-800 hover:bg-gray-900/80 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Gruppe {match.group} · MD{match.matchday}</span>
                  <span className="text-xs text-gray-500">{match.date}</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <span className="text-xs font-medium truncate">{teamA.name}</span>
                    <span className="text-lg">{teamA.flag}</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono px-1">vs</div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-lg">{teamB.flag}</span>
                    <span className="text-xs font-medium truncate">{teamB.name}</span>
                  </div>
                </div>
                <div className="flex justify-center mt-1.5 gap-1">
                  <span className="text-xs text-emerald-400">{match.kickoffUTC} UTC</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Teams', value: '48', icon: '🏟' },
          { label: 'Gruppenspiele', value: '72', icon: '⚽' },
          { label: 'KO-Spiele', value: '31', icon: '🏆' },
          { label: 'Spielorte', value: '10', icon: '🗺' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </section>
    </div>
  )
}
