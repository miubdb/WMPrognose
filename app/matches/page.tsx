'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { GROUP_SCHEDULE, KO_SCHEDULE } from '@/src/data/schedule'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { generateTipSuggestions } from '@/lib/modelAdapter'

const VENUE_NAMES: Record<string, string> = {
  mexico_city: 'Mexico City',
  guadalajara: 'Guadalajara',
  monterrey: 'Monterrey',
  miami: 'Miami',
  houston: 'Houston',
  dallas: 'Dallas',
  new_york: 'New York/NJ',
  los_angeles: 'Los Angeles',
  toronto: 'Toronto',
  vancouver: 'Vancouver',
}

function MatchesContent() {
  const searchParams = useSearchParams()
  const defaultGroup = searchParams.get('group') ?? 'all'

  const [tab, setTab] = useState<'group' | 'ko'>('group')
  const [activeGroup, setActiveGroup] = useState<string>(defaultGroup)
  const [matchday, setMatchday] = useState<number>(0)

  const groups = ['all', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  const tipSuggestions = generateTipSuggestions()
  const tipMap = Object.fromEntries(tipSuggestions.map(t => [t.matchId, t]))

  const filteredGroupMatches = GROUP_SCHEDULE.filter(m => {
    if (activeGroup !== 'all' && m.group !== activeGroup) return false
    if (matchday !== 0 && m.matchday !== matchday) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spiele</h1>
        <p className="text-gray-400 text-sm mt-1">Alle Spiele der FIFA WM 2026 mit Prognosen</p>
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
                {g === 'all' ? 'Alle' : `Gr. ${g}`}
              </button>
            ))}
          </div>

          {/* Matchday Filter */}
          <div className="flex gap-1.5">
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

          {/* Matches */}
          <div className="space-y-2">
            {filteredGroupMatches.map(match => {
              const teamA = TEAM_BY_ID[match.teamAId]
              const teamB = TEAM_BY_ID[match.teamBId]
              const tip = tipMap[match.id]
              if (!teamA || !teamB) return null

              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="block bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-emerald-800 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* Group/Date */}
                    <div className="text-center w-14 flex-shrink-0">
                      <div className="text-xs font-bold text-emerald-400">Gr. {match.group}</div>
                      <div className="text-xs text-gray-500">MD{match.matchday}</div>
                      <div className="text-xs text-gray-600">{match.date.slice(5)}</div>
                    </div>

                    {/* Teams */}
                    <div className="flex-1 grid grid-cols-3 items-center gap-2">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs font-medium text-right hidden sm:block truncate">{teamA.name}</span>
                        <span className="text-lg">{teamA.flag}</span>
                      </div>
                      <div className="text-center text-xs text-gray-500 font-mono">
                        {match.kickoffUTC}
                        <div className="text-gray-700">{VENUE_NAMES[match.venueId] ?? match.venueId}</div>
                      </div>
                      <div className="flex items-center gap-2">
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
          </div>
        </>
      )}

      {tab === 'ko' && (
        <div className="space-y-4">
          {(['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'] as const).map(round => {
            const matches = KO_SCHEDULE.filter(m => m.round === round)
            const roundNames: Record<string, string> = {
              round_of_32: 'Achtelfinale (Round of 32)',
              round_of_16: 'Runde der letzten 16',
              quarterfinal: 'Viertelfinale',
              semifinal: 'Halbfinale',
              final: 'Finale',
            }
            return (
              <div key={round}>
                <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  {roundNames[round]}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {matches.map(match => (
                    <div
                      key={match.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">{match.date}</span>
                        <span className="text-xs text-gray-500">{VENUE_NAMES[match.venueId]}</span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-xs text-gray-300 font-medium text-right flex-1">{match.teamALabel}</span>
                        <span className="text-xs text-gray-600 px-2">vs</span>
                        <span className="text-xs text-gray-300 font-medium flex-1">{match.teamBLabel}</span>
                      </div>
                    </div>
                  ))}
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
