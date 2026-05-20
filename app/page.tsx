import Link from 'next/link'
import { TEAMS_BY_GROUP, ALL_TEAMS } from '@/src/data/allTeams'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { supabase } from '@/lib/supabase'

async function getNominationCounts(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('players')
    .select('team_id')
  if (!data) return {}
  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.team_id] = (counts[row.team_id] ?? 0) + 1
  }
  return counts
}

function getCountdown() {
  const now = new Date()
  const kickoff = new Date('2026-06-11T20:00:00Z')
  const final = new Date('2026-07-19T22:00:00Z')
  const target = now < kickoff ? kickoff : final
  const label = now < kickoff ? 'bis Eröffnung · 11. Juni 2026' : 'bis Finale · 19. Juli 2026'
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, label }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    label,
  }
}

const TOP_CONTENDERS = [
  { id: 'spain',     prob: 18.4, color: 'bg-yellow-500' },
  { id: 'argentina', prob: 16.2, color: 'bg-sky-400' },
  { id: 'france',    prob: 15.8, color: 'bg-blue-500' },
  { id: 'england',   prob: 12.5, color: 'bg-red-400' },
  { id: 'brazil',    prob: 11.3, color: 'bg-green-500' },
  { id: 'germany',   prob:  8.9, color: 'bg-gray-400' },
]

const FEATURES = [
  {
    href: '/matches',
    icon: '⚽',
    title: 'Spiel-Prognosen',
    desc: 'Alle 72 Gruppenspiele mit Sieg/Remis/Niederlage-Wahrscheinlichkeiten, xG und Scoreline-Heatmap.',
    cta: 'Spiele ansehen →',
    accent: 'emerald',
  },
  {
    href: '/tippspiel',
    icon: '🎯',
    title: 'Tippspiel-Optimizer',
    desc: 'Optimierte Tipp-Empfehlungen mit Konfidenz-Bewertung und Value-Bet-Erkennung für dein Tippspiel.',
    cta: 'Tipps generieren →',
    accent: 'yellow',
  },
  {
    href: '/tournament',
    icon: '🏆',
    title: 'Turnier-Simulator',
    desc: 'Monte-Carlo-Simulation mit bis zu 10.000 Durchläufen — wer gewinnt die WM 2026?',
    cta: 'Simulation starten →',
    accent: 'purple',
  },
  {
    href: '/teams',
    icon: '🌍',
    title: 'Alle 48 Teams',
    desc: 'ELO-Ratings, Marktwerte, Kader und Stärke-Profile für alle Teilnehmer.',
    cta: 'Teams erkunden →',
    accent: 'blue',
  },
]

export default async function HomePage() {
  const countdown = getCountdown()
  const groups = Object.keys(TEAMS_BY_GROUP).sort()
  const nextMatches = GROUP_SCHEDULE.slice(0, 6)
  const nominationCounts = await getNominationCounts()
  const teamsWithData = ALL_TEAMS.filter(t => (nominationCounts[t.id] ?? 0) >= 10).length
  const totalTeams = ALL_TEAMS.length

  return (
    <div className="space-y-14">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="text-center pt-6 pb-2 space-y-6">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Wissenschaftliches Prognosemodell · Poisson · Dixon-Coles · ELO
        </div>

        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
            FIFA WM 2026
          </h1>
          <p className="text-xl sm:text-2xl text-emerald-400 font-semibold mt-1">Prognosemodell</p>
        </div>

        <p className="text-gray-400 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
          48 Teams · 104 Spiele · 3 Länder · 10 Stadien —<br />
          alle Prognosen basierend auf ELO-Ratings, Marktwerten,
          Kontext-Modifiern und statistischen Modellen.
        </p>

        {/* Countdown */}
        <div className="inline-flex flex-col items-center bg-gray-900 border border-gray-800 rounded-2xl px-8 py-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">{countdown.label}</p>
          <div className="flex gap-8">
            {[
              { val: countdown.days, label: 'Tage' },
              { val: countdown.hours, label: 'Std' },
              { val: countdown.minutes, label: 'Min' },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-4xl sm:text-5xl font-mono font-bold text-emerald-400 tabular-nums">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nominierungsstatus ───────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h2 className="text-sm font-bold text-gray-300">Kader-Datenstand</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-emerald-400">{teamsWithData}</span>
            <span className="text-xs text-gray-500">/ {totalTeams} Teams nominiert</span>
            <Link href="/kader" className="text-xs text-emerald-400 hover:text-emerald-300 ml-2">Kader bearbeiten →</Link>
          </div>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(teamsWithData / totalTeams) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-1.5">
          {ALL_TEAMS.map(team => {
            const count = nominationCounts[team.id] ?? 0
            const hasData = count >= 10
            return (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                title={`${team.name}: ${hasData ? count + ' Spieler' : 'Keine Daten'}`}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
                  hasData
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
                    : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50'
                }`}
              >
                <span className="text-lg leading-none">{team.flag}</span>
                <span className={`text-[9px] font-mono leading-none ${hasData ? 'text-emerald-400' : 'text-gray-600'}`}>
                  {hasData ? count : '–'}
                </span>
              </Link>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-600 mt-2">
          Grün = Kaderdaten verfügbar · Grau = noch keine Daten eingetragen
        </p>
      </section>

      {/* ── Feature Cards ─────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Was kannst du hier machen?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <Link
              key={f.href}
              href={f.href}
              className="group bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-white text-sm mb-2 group-hover:text-emerald-400 transition-colors">
                {f.title}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">{f.desc}</p>
              <span className="text-xs text-emerald-400 font-medium">{f.cta}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Titelkandidaten ───────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>🥇</span> WM-Titelkandidaten
          </h2>
          <Link href="/tournament" className="text-xs text-emerald-400 hover:text-emerald-300">
            Volle Simulation →
          </Link>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          {TOP_CONTENDERS.map((c, i) => {
            const team = ALL_TEAMS.find(t => t.id === c.id)
            if (!team) return null
            return (
              <Link
                key={c.id}
                href={`/teams/${team.id}`}
                className="flex items-center gap-3 group"
              >
                <span className="text-gray-600 font-mono text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-xl flex-shrink-0">{team.flag}</span>
                <span className="text-sm font-medium flex-1 group-hover:text-emerald-400 transition-colors">
                  {team.name}
                </span>
                <span className="text-xs text-gray-600 flex-shrink-0 hidden sm:block">ELO {team.eloRating}</span>
                <div className="flex items-center gap-2 flex-shrink-0 w-32 sm:w-44">
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.color}`}
                      style={{ width: `${(c.prob / 18.4) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-300 font-mono w-10 text-right">{c.prob}%</span>
                </div>
              </Link>
            )
          })}
          <p className="text-xs text-gray-600 pt-1 border-t border-gray-800">
            Wahrscheinlichkeiten basieren auf ELO-Ratings · Monte Carlo 10.000×
          </p>
        </div>
      </section>

      {/* ── Quick Stats + Gruppen ─────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Stats */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><span>📊</span> Eckdaten</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Teams', value: '48', icon: '🌍' },
              { label: 'Gruppenspiele', value: '72', icon: '⚽' },
              { label: 'KO-Runden', value: '5', icon: '🏆' },
              { label: 'Spielorte', value: '10', icon: '🏟' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Nächste Spiele */}
          <h2 className="text-lg font-bold flex items-center gap-2 pt-2"><span>📅</span> Erste Spiele</h2>
          <div className="space-y-2">
            {nextMatches.slice(0, 4).map(match => {
              const teamA = ALL_TEAMS.find(t => t.id === match.teamAId)
              const teamB = ALL_TEAMS.find(t => t.id === match.teamBId)
              if (!teamA || !teamB) return null
              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 hover:border-emerald-800 transition-colors"
                >
                  <span className="text-xs text-gray-500 w-12 flex-shrink-0">Gr.{match.group}</span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-base">{teamA.flag}</span>
                    <span className="text-xs text-gray-300 truncate">{teamA.name}</span>
                    <span className="text-xs text-gray-600 mx-1">–</span>
                    <span className="text-xs text-gray-300 truncate">{teamB.name}</span>
                    <span className="text-base">{teamB.flag}</span>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">{match.date.slice(5)}</span>
                </Link>
              )
            })}
            <Link href="/matches" className="block text-center text-xs text-emerald-400 hover:text-emerald-300 pt-1">
              Alle 72 Spiele →
            </Link>
          </div>
        </div>

        {/* Gruppen-Grid */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><span>🗂</span> Gruppen A – L</h2>
            <Link href="/teams" className="text-xs text-emerald-400 hover:text-emerald-300">Alle Teams →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {groups.map(group => {
              const teams = TEAMS_BY_GROUP[group]
              return (
                <div key={group} className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Gruppe {group}</span>
                    <Link href={`/matches?group=${group}`} className="text-[10px] text-gray-600 hover:text-gray-400">
                      Spiele →
                    </Link>
                  </div>
                  <div className="space-y-1">
                    {teams?.map(team => {
                      const hasData = (nominationCounts[team.id] ?? 0) >= 10
                      return (
                      <Link
                        key={team.id}
                        href={`/teams/${team.id}`}
                        className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-gray-800 transition-colors"
                      >
                        <span className="text-sm flex-shrink-0">{team.flag}</span>
                        <span className="text-xs flex-1 truncate text-gray-200">{team.name}</span>
                        {hasData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Kaderdaten vorhanden" />}
                        <span className="text-[10px] text-gray-600 flex-shrink-0 font-mono">{team.eloRating}</span>
                      </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Methodik-Banner ───────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold mb-3 text-gray-300">Wie funktioniert das Modell?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-gray-400">
          {[
            { icon: '📐', title: 'Poisson-Modell', desc: 'Scoreline-Wahrscheinlichkeiten nach Maher (1982) und Dixon-Coles (1997) mit Low-Score-Korrektur' },
            { icon: '📈', title: 'ELO-Ratings', desc: 'ELO nach eloratings.net (Stand 2025) als Basisstärke beider Teams' },
            { icon: '🏟', title: 'Kontext-Faktoren', desc: 'Höhenlage, Hitze (WBGT), Reisebelastung, Heimvorteil, Ruhetage' },
            { icon: '💰', title: 'Marktwert & Kader', desc: 'Log-normalisierte Transfermarkt-Werte, Kaderalter, Trainer-Tenure' },
          ].map(item => (
            <div key={item.title} className="flex gap-3">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <div className="font-semibold text-gray-300 mb-0.5">{item.title}</div>
                <div className="leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
