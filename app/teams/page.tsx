'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ALL_TEAMS, TEAMS_BY_GROUP } from '@/src/data/allTeams'
import { supabase } from '@/lib/supabase'

export default function TeamsPage() {
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const [squadCounts, setSquadCounts] = useState<Record<string, number>>({})
  const groups = ['all', ...Object.keys(TEAMS_BY_GROUP).sort()]

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('players')
      .select('team_id')
      .then(({ data }) => {
        if (!data) return
        const counts: Record<string, number> = {}
        for (const row of data) {
          counts[row.team_id] = (counts[row.team_id] ?? 0) + 1
        }
        setSquadCounts(counts)
      })
  }, [])

  const displayTeams = activeGroup === 'all'
    ? ALL_TEAMS
    : (TEAMS_BY_GROUP[activeGroup] ?? [])

  const totalWithData = ALL_TEAMS.filter(t => (squadCounts[t.id] ?? 0) >= 10).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-gray-400 text-sm mt-1">Alle 48 Teilnehmer der FIFA WM 2026</p>
        </div>
        <div className="text-xs text-gray-500 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
          <span className="text-emerald-400 font-bold">{totalWithData}</span>
          <span className="ml-1">/ 48 Teams mit Kaderdaten</span>
        </div>
      </div>

      {/* Group Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {groups.map(g => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeGroup === g
                ? 'bg-emerald-500 text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {g === 'all' ? 'Alle' : `Gruppe ${g}`}
          </button>
        ))}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {displayTeams.map(team => {
          const playerCount = squadCounts[team.id] ?? 0
          const hasFullData = playerCount >= 20
          const hasPartialData = playerCount >= 10 && !hasFullData
          const noData = playerCount < 10

          return (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-emerald-800 hover:bg-gray-900/80 transition-all group"
            >
              {/* Header: Flag + Group + Kader-Status */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{team.flag}</span>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-xs text-gray-500">Gruppe {team.group}</div>
                  <div className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    hasFullData  ? 'bg-emerald-900/50 text-emerald-400' :
                    hasPartialData ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-gray-800 text-gray-600'
                  }`}>
                    {hasFullData ? `✓ ${playerCount} Spieler` :
                     hasPartialData ? `~ ${playerCount} Spieler` :
                     'Keine Daten'}
                  </div>
                </div>
              </div>

              {/* Team name */}
              <h3 className="font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                {team.name}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{team.confederation} · {team.coach}</p>

              {/* Stats */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">ELO-Rating</span>
                  <span className="text-xs font-mono text-emerald-400">{team.eloRating}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Marktwert</span>
                  <span className="text-xs font-mono">€{team.squadMarketValueM}M</span>
                </div>
                {team.worldCupTitles > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">WM-Titel</span>
                    <span className="text-xs">
                      {'🏆'.repeat(Math.min(team.worldCupTitles, 5))}
                      <span className="text-gray-500 ml-1 font-mono">{team.worldCupTitles}×</span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Ø Alter</span>
                  <span className="text-xs font-mono text-gray-300">{team.squadAvgAge}</span>
                </div>
              </div>

              {/* Rating Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Overall-Rating</span>
                  <span>{team.overallRating}/100</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      team.overallRating >= 85 ? 'bg-emerald-500' :
                      team.overallRating >= 75 ? 'bg-blue-500' :
                      team.overallRating >= 65 ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}
                    style={{ width: `${team.overallRating}%` }}
                  />
                </div>
              </div>

              {/* Missing data hint */}
              {noData && (
                <div className="mt-2 text-[10px] text-gray-600 border-t border-gray-800 pt-2">
                  Kaderdaten fehlen noch
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
