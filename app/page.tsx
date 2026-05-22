'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { VENUES } from '@/src/data/venues'
import { analyzeAllMatches, type MatchAnalysis } from '@/lib/modelAdapter'
import { toBerlinTime, fmtDate } from '@/lib/utils'

const GROUPS = ['Alle', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function ProbBar({ probA, probDraw, probB, nameA, nameB }: {
  probA: number; probDraw: number; probB: number; nameA: string; nameB: string
}) {
  const pA = Math.round(probA * 100)
  const pD = Math.round(probDraw * 100)
  const pB = Math.round(probB * 100)
  return (
    <div className="w-full">
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        <div className="bg-emerald-500 rounded-l-full" style={{ width: `${pA}%` }} />
        <div className="bg-gray-600" style={{ width: `${pD}%` }} />
        <div className="bg-blue-500 rounded-r-full" style={{ width: `${pB}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>{pA}%</span>
        <span className="text-gray-600">{pD}%</span>
        <span>{pB}%</span>
      </div>
    </div>
  )
}

function MatchCard({ analysis }: { analysis: MatchAnalysis }) {
  const match = GROUP_SCHEDULE.find(m => m.id === analysis.matchId)!
  const berlinTime = toBerlinTime(match.kickoffUTC)
  const venue = VENUES[match.venueId]

  const confLabel = {
    'very_high': { label: 'Sehr sicher', color: 'text-emerald-400' },
    'high': { label: 'Sicher', color: 'text-blue-400' },
    'medium': { label: 'Offen', color: 'text-yellow-400' },
    'low': { label: 'Sehr offen', color: 'text-gray-500' },
  }[analysis.confidence]

  const tipLabel = analysis.suggestedTip === '1'
    ? `${analysis.teamA.flag} ${analysis.teamA.name}`
    : analysis.suggestedTip === '2'
    ? `${analysis.teamB.flag} ${analysis.teamB.name}`
    : 'Unentschieden'

  return (
    <Link href={`/matches/${match.id}`} className="block group">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-emerald-800 hover:bg-gray-900/80 transition-all">
        {/* Meta */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-emerald-500 font-mono font-bold">Gr. {match.group}</span>
            <span>·</span>
            <span>{fmtDate(match.date)}</span>
            <span className="font-mono font-bold text-white">{berlinTime}</span>
            <span className="text-gray-600">MESZ</span>
          </div>
          <span className="text-xs text-gray-600">{venue?.city ?? match.venueId}</span>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-3">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-sm font-medium text-gray-200 text-right hidden sm:block truncate">
              {analysis.teamA.name}
            </span>
            <span className="text-2xl">{analysis.teamA.flag}</span>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 font-mono">vs</div>
            <div className="text-xs text-gray-700 mt-0.5">
              {analysis.expectedGoalsA.toFixed(1)} : {analysis.expectedGoalsB.toFixed(1)} xG
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{analysis.teamB.flag}</span>
            <span className="text-sm font-medium text-gray-200 hidden sm:block truncate">
              {analysis.teamB.name}
            </span>
          </div>
        </div>

        {/* Probability bar */}
        <ProbBar
          probA={analysis.winProbA}
          probDraw={analysis.drawProb}
          probB={analysis.winProbB}
          nameA={analysis.teamA.name}
          nameB={analysis.teamB.name}
        />

        {/* Tip + Confidence */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            Tipp: <span className="text-white font-medium">{tipLabel}</span>
          </div>
          <span className={`text-xs font-medium ${confLabel.color}`}>
            {confLabel.label}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const [activeGroup, setActiveGroup] = useState('Alle')
  const [matchday, setMatchday] = useState(0)

  const analyses = useMemo(() => {
    const all = analyzeAllMatches()
    return all
      .filter(a => {
        const match = GROUP_SCHEDULE.find(m => m.id === a.matchId)!
        if (activeGroup !== 'Alle' && match.group !== activeGroup) return false
        if (matchday !== 0 && match.matchday !== matchday) return false
        return true
      })
      .sort((a, b) => {
        const ma = GROUP_SCHEDULE.find(m => m.id === a.matchId)!
        const mb = GROUP_SCHEDULE.find(m => m.id === b.matchId)!
        const d = ma.date.localeCompare(mb.date)
        return d !== 0 ? d : ma.kickoffUTC.localeCompare(mb.kickoffUTC)
      })
  }, [activeGroup, matchday])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Spielprognosen</h1>
        <p className="text-gray-500 text-sm mt-1">
          FIFA WM 2026 · {GROUP_SCHEDULE.length} Gruppenspiele · Zeiten in Berliner Zeit
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Groups */}
        <div className="flex gap-1 flex-wrap">
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeGroup === g
                  ? 'bg-emerald-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {g === 'Alle' ? 'Alle Gruppen' : `Gr. ${g}`}
            </button>
          ))}
        </div>

        {/* Matchday */}
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(d => (
            <button
              key={d}
              onClick={() => setMatchday(d)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                matchday === d
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-500 hover:text-white'
              }`}
            >
              {d === 0 ? 'Alle Spieltage' : `Spieltag ${d}`}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-600">{analyses.length} Spiele · klicken für vollständige Analyse</p>

      {/* Match list */}
      <div className="space-y-2">
        {analyses.map(a => (
          <MatchCard key={a.matchId} analysis={a} />
        ))}
        {analyses.length === 0 && (
          <div className="text-center text-gray-600 py-16 bg-gray-900 border border-gray-800 rounded-xl text-sm">
            Keine Spiele für diese Filterauswahl.
          </div>
        )}
      </div>
    </div>
  )
}
