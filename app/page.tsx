'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { VENUES } from '@/src/data/venues'
import { analyzeAllMatches, type MatchAnalysis, type SquadSummary, type MatchFactor } from '@/lib/modelAdapter'
import { toBerlinTime, fmtDate } from '@/lib/utils'

const GROUPS = ['Alle', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDateHeader(dateStr: string): string {
  const today = todayStr()
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (dateStr === today) return 'Heute'
  if (dateStr === tomorrow) return 'Morgen'
  const [, mm, dd] = dateStr.split('-')
  const weekday = new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'short' })
  return `${weekday}, ${dd}.${mm}.`
}

function TopFactorLine({ factors }: { factors: MatchFactor[] }) {
  const top = factors
    .filter(f => Math.abs(f.logEffectA - f.logEffectB) > 0.012)
    .sort((a, b) => Math.abs(b.logEffectA - b.logEffectB) - Math.abs(a.logEffectA - a.logEffectB))
    .slice(0, 2)
  if (top.length === 0) return <div className="text-[10px] text-gray-700 mt-1 text-center">Ausgeglichen</div>
  return (
    <div className="text-[10px] text-gray-600 mt-1 text-center truncate">
      {top.map(f => {
        const diff = f.logEffectA - f.logEffectB
        const pct  = Math.round(Math.abs(Math.exp(diff) - 1) * 100)
        return `${f.label.split(' ')[0]} ${diff > 0 ? '+' : '−'}${pct}%`
      }).join(' · ')}
    </div>
  )
}

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

interface MatchResult {
  goals_a: number
  goals_b: number
}

function MatchCard({
  analysis,
  result,
  onResultSaved,
}: {
  analysis: MatchAnalysis
  result?: MatchResult
  onResultSaved: (matchId: string, r: MatchResult) => void
}) {
  const match = GROUP_SCHEDULE.find(m => m.id === analysis.matchId)!
  const berlinTime = toBerlinTime(match.kickoffUTC)
  const venue = VENUES[match.venueId]

  const [showEntry, setShowEntry] = useState(false)
  const [goalsA, setGoalsA] = useState('')
  const [goalsB, setGoalsB] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const kickoff = new Date(`${match.date}T${match.kickoffUTC}:00Z`)
  const isPast = kickoff.getTime() + 110 * 60 * 1000 < Date.now() // ~110 min nach Anpfiff

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

  const missingSquad = !analysis.squadDataA || !analysis.squadDataB

  async function saveResult() {
    const gA = parseInt(goalsA)
    const gB = parseInt(goalsB)
    if (isNaN(gA) || isNaN(gB) || gA < 0 || gB < 0) {
      setSaveError('Ungültige Eingabe')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/results/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals_a: gA, goals_b: gB }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaveError(d.error ?? 'Fehler')
      } else {
        onResultSaved(match.id, { goals_a: gA, goals_b: gB })
        setShowEntry(false)
      }
    } catch (e) {
      setSaveError(String(e))
    }
    setSaving(false)
  }

  const winner =
    result && result.goals_a > result.goals_b
      ? analysis.teamA
      : result && result.goals_b > result.goals_a
      ? analysis.teamB
      : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-emerald-800 hover:bg-gray-900/80 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="text-emerald-500 font-mono font-bold">Gr. {match.group}</span>
          <span>·</span>
          <span>{fmtDate(match.date)}</span>
          <span className="font-mono font-bold text-white">{berlinTime}</span>
          <span className="text-gray-500">Uhr</span>
        </div>
        <div className="flex items-center gap-2">
          {missingSquad && !result && (
            <span className="text-[10px] text-amber-500/80 bg-amber-900/20 px-1.5 py-0.5 rounded">kein Kader</span>
          )}
          {result && (
            <span className="text-[10px] text-emerald-500/80 bg-emerald-900/20 px-1.5 py-0.5 rounded font-bold">Endstand</span>
          )}
          <span className="text-xs text-gray-600">{venue?.city ?? match.venueId}</span>
        </div>
      </div>

      {result ? (
        /* Completed match: show actual score */
        <Link href={`/matches/${match.id}`} className="block group">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-3">
            <div className="flex items-center gap-2 justify-end">
              <span className={`text-sm font-medium text-right hidden sm:block truncate ${winner?.id === analysis.teamA.id ? 'text-white font-bold' : 'text-gray-400'}`}>
                {analysis.teamA.name}
              </span>
              <span className="text-2xl">{analysis.teamA.flag}</span>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white font-mono">
                {result.goals_a} – {result.goals_b}
              </div>
              {winner && (
                <div className="text-[10px] text-emerald-400 mt-0.5">{winner.name} gewinnt</div>
              )}
              {!winner && (
                <div className="text-[10px] text-gray-500 mt-0.5">Unentschieden</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{analysis.teamB.flag}</span>
              <span className={`text-sm font-medium hidden sm:block truncate ${winner?.id === analysis.teamB.id ? 'text-white font-bold' : 'text-gray-400'}`}>
                {analysis.teamB.name}
              </span>
            </div>
          </div>
          {/* Show predicted probs small */}
          <div className="opacity-50">
            <ProbBar
              probA={analysis.winProbA}
              probDraw={analysis.drawProb}
              probB={analysis.winProbB}
              nameA={analysis.teamA.name}
              nameB={analysis.teamB.name}
            />
            <div className="text-[10px] text-gray-600 mt-1 text-center">
              Prognose: {Math.round(analysis.winProbA * 100)}% / {Math.round(analysis.drawProb * 100)}% / {Math.round(analysis.winProbB * 100)}%
            </div>
          </div>
        </Link>
      ) : (
        /* Future match: show prediction */
        <Link href={`/matches/${match.id}`} className="block group">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-3">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-sm font-medium text-gray-200 text-right hidden sm:block truncate">
                {analysis.teamA.name}
                {!analysis.squadDataA && <span className="text-amber-500 ml-1">⚠</span>}
              </span>
              <span className="text-2xl">{analysis.teamA.flag}</span>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 font-mono">vs</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{analysis.teamB.flag}</span>
              <span className="text-sm font-medium text-gray-200 hidden sm:block truncate">
                {!analysis.squadDataB && <span className="text-amber-500 mr-1">⚠</span>}
                {analysis.teamB.name}
              </span>
            </div>
          </div>

          <ProbBar
            probA={analysis.winProbA}
            probDraw={analysis.drawProb}
            probB={analysis.winProbB}
            nameA={analysis.teamA.name}
            nameB={analysis.teamB.name}
          />
          <TopFactorLine factors={analysis.factors} />

          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-500">
              Tipp: <span className="text-white font-medium">{tipLabel}</span>
            </div>
            <span className={`text-xs font-medium ${confLabel.color}`}>
              {confLabel.label}
            </span>
          </div>
        </Link>
      )}

      {/* Result entry / correction */}
      {isPast && (
        <div className="mt-3 border-t border-gray-800/60 pt-2">
          {!showEntry ? (
            <button
              onClick={() => {
                if (result) {
                  setGoalsA(String(result.goals_a))
                  setGoalsB(String(result.goals_b))
                } else {
                  setGoalsA('')
                  setGoalsB('')
                }
                setShowEntry(true)
              }}
              className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              {result ? '✎ Korrigieren' : 'Ergebnis eintragen'}
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">{analysis.teamA.flag}</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={goalsA}
                  onChange={e => setGoalsA(e.target.value)}
                  className="w-10 bg-gray-800 border border-gray-700 rounded text-center text-sm text-white focus:border-emerald-600 focus:outline-none"
                />
                <span className="text-gray-600">:</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={goalsB}
                  onChange={e => setGoalsB(e.target.value)}
                  className="w-10 bg-gray-800 border border-gray-700 rounded text-center text-sm text-white focus:border-emerald-600 focus:outline-none"
                />
                <span className="text-xs text-gray-500">{analysis.teamB.flag}</span>
              </div>
              <button
                onClick={saveResult}
                disabled={saving}
                className="px-2.5 py-0.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 text-white text-xs rounded transition-colors"
              >
                {saving ? '...' : 'Speichern'}
              </button>
              <button
                onClick={() => { setShowEntry(false); setSaveError(null) }}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Abbrechen
              </button>
              {saveError && <span className="text-xs text-red-400">{saveError}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [activeGroup, setActiveGroup] = useState('Alle')
  const [matchday, setMatchday] = useState(0)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [squadData, setSquadData] = useState<Record<string, SquadSummary>>({})
  const [eloOverrides, setEloOverrides] = useState<Record<string, number>>({})
  const [results, setResults] = useState<Record<string, MatchResult>>({})

  useEffect(() => {
    fetch('/api/match-context')
      .then(r => r.json())
      .then(data => {
        if (data.squadData) setSquadData(data.squadData)
        if (data.eloOverrides) setEloOverrides(data.eloOverrides)
        if (data.results) setResults(data.results)
      })
      .catch(() => {/* silently ignore */})
  }, [])

  const handleResultSaved = useCallback((matchId: string, r: MatchResult) => {
    setResults(prev => ({ ...prev, [matchId]: r }))
  }, [])

  const analyses = useMemo(() => {
    const all = analyzeAllMatches(squadData, eloOverrides)
    return all
      .filter(a => {
        const match = GROUP_SCHEDULE.find(m => m.id === a.matchId)!
        if (activeGroup !== 'Alle' && match.group !== activeGroup) return false
        if (matchday !== 0 && match.matchday !== matchday) return false
        if (filterDate && match.date !== filterDate) return false
        return true
      })
      .sort((a, b) => {
        const ma = GROUP_SCHEDULE.find(m => m.id === a.matchId)!
        const mb = GROUP_SCHEDULE.find(m => m.id === b.matchId)!
        const d = ma.date.localeCompare(mb.date)
        return d !== 0 ? d : ma.kickoffUTC.localeCompare(mb.kickoffUTC)
      })
  }, [activeGroup, matchday, filterDate, squadData, eloOverrides])

  // Group by date for display
  const byDate = useMemo(() => {
    const map: { date: string; items: typeof analyses }[] = []
    for (const a of analyses) {
      const match = GROUP_SCHEDULE.find(m => m.id === a.matchId)!
      const last = map[map.length - 1]
      if (last?.date === match.date) last.items.push(a)
      else map.push({ date: match.date, items: [a] })
    }
    return map
  }, [analyses])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spielprognosen</h1>
        <p className="text-gray-500 text-sm mt-1">
          FIFA WM 2026 · {GROUP_SCHEDULE.length} Gruppenspiele · Zeiten in Berliner Zeit
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => { setFilterDate(todayStr()); setMatchday(0); setActiveGroup('Alle') }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              filterDate === todayStr()
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-yellow-500/70 hover:text-yellow-400'
            }`}
          >
            Heute
          </button>
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => { setActiveGroup(g); setFilterDate(null) }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeGroup === g && !filterDate
                  ? 'bg-emerald-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {g === 'Alle' ? 'Alle Gruppen' : `Gr. ${g}`}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {[0, 1, 2, 3].map(d => (
            <button
              key={d}
              onClick={() => { setMatchday(d); setFilterDate(null) }}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                matchday === d && !filterDate
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-500 hover:text-white'
              }`}
            >
              {d === 0 ? 'Alle Spieltage' : `Spieltag ${d}`}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-600">{analyses.length} Spiele · klicken für vollständige Analyse</p>

      <div className="space-y-4">
        {byDate.map(({ date, items }) => (
          <div key={date}>
            <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
              date === todayStr() ? 'text-yellow-400' : 'text-gray-600'
            }`}>
              {fmtDateHeader(date)}
              <span className="text-gray-700 font-normal normal-case tracking-normal ml-2">
                {items.length} Spiel{items.length !== 1 ? 'e' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {items.map(a => (
                <MatchCard
                  key={a.matchId}
                  analysis={a}
                  result={results[a.matchId]}
                  onResultSaved={handleResultSaved}
                />
              ))}
            </div>
          </div>
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
