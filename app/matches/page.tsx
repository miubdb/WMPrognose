'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { GROUP_SCHEDULE, KO_SCHEDULE } from '@/src/data/schedule'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { VENUES } from '@/src/data/venues'
import { generateTipSuggestions } from '@/lib/modelAdapter'
import { toBerlinTime, fmtDate } from '@/lib/utils'

const ROUND_NAMES: Record<string, string> = {
  round_of_32: 'Achtelfinale (Runde der 32)',
  round_of_16: 'Runde der 16',
  quarterfinal: 'Viertelfinale',
  semifinal: 'Halbfinale',
  final: 'Finale',
}

function MatchesContent() {
  const searchParams = useSearchParams()
  const defaultGroup = searchParams.get('group') ?? 'all'

  const [tab, setTab] = useState<'group' | 'ko'>('group')
  const [activeGroup, setActiveGroup] = useState<string>(defaultGroup)
  const [matchday, setMatchday] = useState<number>(0)
  const [venueFilter, setVenueFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')

  const tipSuggestions = generateTipSuggestions()
  const tipMap = Object.fromEntries(tipSuggestions.map(t => [t.matchId, t]))

  // Chronologically sorted group matches
  const sortedGroupMatches = useMemo(() =>
    [...GROUP_SCHEDULE].sort((a, b) => {
      const dt = a.date.localeCompare(b.date)
      if (dt !== 0) return dt
      return a.kickoffUTC.localeCompare(b.kickoffUTC)
    }),
    []
  )

  const filteredGroupMatches = useMemo(() =>
    sortedGroupMatches.filter(m => {
      if (activeGroup !== 'all' && m.group !== activeGroup) return false
      if (matchday !== 0 && m.matchday !== matchday) return false
      if (venueFilter !== 'all' && m.venueId !== venueFilter) return false
      if (teamFilter !== 'all' && m.teamAId !== teamFilter && m.teamBId !== teamFilter) return false
      return true
    }),
    [sortedGroupMatches, activeGroup, matchday, venueFilter, teamFilter]
  )

  const groups = ['all', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  // Venue options used in group stage
  const venueOptions = useMemo(() => {
    const ids = [...new Set(GROUP_SCHEDULE.map(m => m.venueId))]
    return [{ id: 'all', label: 'Alle Spielorte' }, ...ids.map(id => ({
      id,
      label: VENUES[id]?.name ?? id,
    }))]
  }, [])

  // Team options (all teams in group stage)
  const teamOptions = useMemo(() => {
    const ids = [...new Set(GROUP_SCHEDULE.flatMap(m => [m.teamAId, m.teamBId]))]
    return [
      { id: 'all', label: 'Alle Teams' },
      ...ids
        .map(id => ({ id, label: TEAM_BY_ID[id]?.name ?? id, flag: TEAM_BY_ID[id]?.flag ?? '' }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ]
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spiele</h1>
        <p className="text-gray-400 text-sm mt-1">
          Alle Spiele der FIFA WM 2026 · Zeiten in Berliner Zeit (MESZ, UTC+2)
        </p>
      </div>

      {/* Phase Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('group')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'group' ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Gruppenphase (72)
        </button>
        <button
          onClick={() => setTab('ko')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'ko' ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          KO-Runde (31)
        </button>
      </div>

      {tab === 'group' && (
        <>
          {/* Group Filter */}
          <div className="flex gap-1.5 flex-wrap">
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeGroup === g
                    ? 'bg-emerald-500 text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {g === 'all' ? 'Alle Gruppen' : `Gr. ${g}`}
              </button>
            ))}
          </div>

          {/* Secondary Filters Row */}
          <div className="flex flex-wrap gap-2">
            {/* Matchday */}
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(d => (
                <button
                  key={d}
                  onClick={() => setMatchday(d)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    matchday === d
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {d === 0 ? 'Alle Spieltage' : `Spieltag ${d}`}
                </button>
              ))}
            </div>

            {/* Venue Filter */}
            <select
              value={venueFilter}
              onChange={e => setVenueFilter(e.target.value)}
              className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1 border-0 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {venueOptions.map(v => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>

            {/* Team Filter */}
            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1 border-0 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {teamOptions.map(t => (
                <option key={t.id} value={t.id}>
                  {'flag' in t ? `${t.flag} ` : ''}{t.label}
                </option>
              ))}
            </select>

            {/* Reset */}
            {(activeGroup !== 'all' || matchday !== 0 || venueFilter !== 'all' || teamFilter !== 'all') && (
              <button
                onClick={() => { setActiveGroup('all'); setMatchday(0); setVenueFilter('all'); setTeamFilter('all') }}
                className="px-2.5 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-300 bg-gray-800 transition-colors"
              >
                ✕ Filter zurücksetzen
              </button>
            )}
          </div>

          <div className="text-xs text-gray-600">
            {filteredGroupMatches.length} Spiele · chronologisch sortiert
          </div>

          {/* Matches */}
          <div className="space-y-1.5">
            {filteredGroupMatches.map(match => {
              const teamA = TEAM_BY_ID[match.teamAId]
              const teamB = TEAM_BY_ID[match.teamBId]
              const tip = tipMap[match.id]
              const venue = VENUES[match.venueId]
              const berlinTime = toBerlinTime(match.kickoffUTC)
              if (!teamA || !teamB) return null

              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="block bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-emerald-800 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* Date/Group */}
                    <div className="text-center w-16 flex-shrink-0">
                      <div className="text-[10px] font-bold text-emerald-400">Gr. {match.group} · MD{match.matchday}</div>
                      <div className="text-xs font-mono text-gray-300">{fmtDate(match.date)}</div>
                      <div className="text-xs font-mono text-white font-bold">{berlinTime}</div>
                      <div className="text-[9px] text-gray-600">MESZ</div>
                    </div>

                    {/* Teams */}
                    <div className="flex-1 grid grid-cols-3 items-center gap-2">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-xs font-medium text-right hidden sm:block truncate">{teamA.name}</span>
                        <span className="text-lg">{teamA.flag}</span>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 font-mono">vs</div>
                        <div className="text-[10px] text-gray-600 truncate">{venue?.city ?? match.venueId}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{teamB.flag}</span>
                        <span className="text-xs font-medium hidden sm:block truncate">{teamB.name}</span>
                      </div>
                    </div>

                    {/* Tip suggestion */}
                    {tip && (
                      <div className="text-right flex-shrink-0">
                        <div className={`text-xs font-bold px-2 py-0.5 rounded ${
                          tip.confidence === 'very_high' ? 'bg-emerald-900 text-emerald-300' :
                          tip.confidence === 'high' ? 'bg-blue-900 text-blue-300' :
                          tip.confidence === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {tip.suggestedTip === '1' ? teamA.flag :
                           tip.suggestedTip === '2' ? teamB.flag : 'X'}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {tip.suggestedTip === '1' ? `${Math.round(tip.winProbA * 100)}%` :
                           tip.suggestedTip === '2' ? `${Math.round(tip.winProbB * 100)}%` :
                           `${Math.round(tip.drawProb * 100)}%`}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}

            {filteredGroupMatches.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-12 bg-gray-900 border border-gray-800 rounded-xl">
                Keine Spiele für diese Filterauswahl.
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'ko' && (
        <div className="space-y-4">
          {(['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'] as const).map(round => {
            const matches = KO_SCHEDULE.filter(m => m.round === round)
            return (
              <div key={round}>
                <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  {ROUND_NAMES[round]}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {matches.map(match => {
                    const venue = VENUES[match.venueId]
                    const berlinTime = toBerlinTime(match.kickoffUTC)
                    return (
                      <div
                        key={match.id}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 font-mono">{match.date} · {berlinTime} MESZ</span>
                          <span className="text-xs text-gray-500">{venue?.city ?? match.venueId}</span>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-xs text-gray-300 font-medium text-right flex-1">{match.teamALabel}</span>
                          <span className="text-xs text-gray-600 px-2">vs</span>
                          <span className="text-xs text-gray-300 font-medium flex-1">{match.teamBLabel}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Lade Spiele...</div>}>
      <MatchesContent />
    </Suspense>
  )
}
