'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ALL_TEAMS, TEAMS_BY_GROUP } from '@/src/data/allTeams'

export default function TeamsPage() {
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const groups = ['all', ...Object.keys(TEAMS_BY_GROUP).sort()]

  const displayTeams = activeGroup === 'all'
    ? ALL_TEAMS
    : (TEAMS_BY_GROUP[activeGroup] ?? [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-gray-400 text-sm mt-1">Alle 48 Teilnehmer der FIFA WM 2026</p>
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
        {displayTeams.map(team => (
          <Link
            key={team.id}
            href={`/teams/${team.id}`}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-emerald-800 hover:bg-gray-900/80 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{team.flag}</span>
              <div className="text-right">
                <div className="text-xs text-gray-500">Gruppe {team.group}</div>
                <div className="text-xs text-gray-400 mt-0.5">{team.confederation}</div>
              </div>
            </div>

            <h3 className="font-semibold text-sm group-hover:text-emerald-400 transition-colors">
              {team.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{team.coach}</p>

            <div className="mt-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">ELO</span>
                <span className="text-xs font-mono text-emerald-400">{team.eloRating}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Marktwert</span>
                <span className="text-xs font-mono">€{team.squadMarketValueM}M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">WM-Titel</span>
                <span className="text-xs">
                  {team.worldCupTitles > 0
                    ? '🏆'.repeat(Math.min(team.worldCupTitles, 5))
                    : <span className="text-gray-600">–</span>
                  }
                </span>
              </div>
            </div>

            {/* Rating Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Overall</span>
                <span>{team.overallRating}/100</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${team.overallRating}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
