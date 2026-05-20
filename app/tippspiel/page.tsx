'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { generateTipSuggestions, TipSuggestion } from '@/lib/modelAdapter'

const CONFIDENCE_CONFIG = {
  very_high: { label: 'Sehr sicher', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-800', dot: 'bg-emerald-500', stars: '●●●●' },
  high: { label: 'Sicher', color: 'bg-blue-500/20 text-blue-400 border-blue-800', dot: 'bg-blue-500', stars: '●●●○' },
  medium: { label: 'Mittel', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-800', dot: 'bg-yellow-500', stars: '●●○○' },
  low: { label: 'Unsicher', color: 'bg-gray-500/20 text-gray-400 border-gray-700', dot: 'bg-gray-500', stars: '●○○○' },
}

type UserTip = '1' | 'X' | '2'
type UserTips = Record<string, UserTip>

const STORAGE_KEY = 'wm2026_user_tips'

function loadUserTips(): UserTips {
  if (typeof window === 'undefined') return {}
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as UserTips) : {}
  } catch {
    return {}
  }
}

function saveUserTips(tips: UserTips) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tips)) } catch { /* ignore */ }
}

export default function TippspielPage() {
  const tips = useMemo(() => generateTipSuggestions(), [])

  const [filter, setFilter] = useState<'all' | 'very_high' | 'high' | 'medium' | 'low' | 'value'>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [copiedText, setCopiedText] = useState(false)
  const [pointsPerResult, setPointsPerResult] = useState(3)
  const [pointsPerExact, setPointsPerExact] = useState(5)
  const [userTips, setUserTips] = useState<UserTips>({})
  const [showTippzettel, setShowTippzettel] = useState(false)

  const groups = ['all', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  // Load from localStorage after mount
  useEffect(() => {
    setUserTips(loadUserTips())
  }, [])

  const setUserTip = useCallback((matchId: string, tip: UserTip | null) => {
    setUserTips(prev => {
      const next = { ...prev }
      if (tip === null) {
        delete next[matchId]
      } else {
        next[matchId] = tip
      }
      saveUserTips(next)
      return next
    })
  }, [])

  const filteredTips = tips.filter(tip => {
    if (groupFilter !== 'all' && tip.group !== groupFilter) return false
    if (filter === 'value') return tip.isValueBet
    if (filter !== 'all' && tip.confidence !== filter) return false
    return true
  })

  const totalExpectedPoints = filteredTips.reduce((s, t) => s + t.expectedPoints * (pointsPerResult / 3), 0)

  // Summary stats
  const filledCount = Object.keys(userTips).length
  const totalMatches = tips.length
  // Matches where user agrees with model
  const agreementCount = tips.filter(t => userTips[t.matchId] === t.suggestedTip).length
  const filledTips = tips.filter(t => userTips[t.matchId])

  // Expected points for user's tips
  const userExpectedPoints = filledTips.reduce((s, t) => {
    const myTip = userTips[t.matchId]
    const prob = myTip === '1' ? t.winProbA : myTip === '2' ? t.winProbB : t.drawProb
    return s + prob * pointsPerResult
  }, 0)

  const handleCopy = () => {
    const lines = [
      'Spiel\t1\tX\t2\tModell\tMein Tipp\tKonfidenz\tBegründung',
      ...filteredTips.map(t =>
        `${t.teamAName} vs ${t.teamBName}\t${Math.round(t.winProbA * 100)}%\t${Math.round(t.drawProb * 100)}%\t${Math.round(t.winProbB * 100)}%\t${t.suggestedTip}\t${userTips[t.matchId] ?? '–'}\t${CONFIDENCE_CONFIG[t.confidence].label}\t${t.reasoning}`
      )
    ].join('\n')

    navigator.clipboard.writeText(lines).then(() => {
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    })
  }

  const stats = {
    very_high: tips.filter(t => t.confidence === 'very_high').length,
    high: tips.filter(t => t.confidence === 'high').length,
    medium: tips.filter(t => t.confidence === 'medium').length,
    low: tips.filter(t => t.confidence === 'low').length,
    value: tips.filter(t => t.isValueBet).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🎯</span> Tippspiel-Optimizer
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Optimierte Tipp-Empfehlungen für alle 72 Gruppenspiele basierend auf dem Prognosemodell
        </p>
      </div>

      {/* Mein Tippzettel – Summary Banner */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <span>📝</span> Mein Tippzettel
          </h2>
          <button
            onClick={() => setShowTippzettel(v => !v)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showTippzettel ? '▲ Einklappen' : '▼ Ausklappen'}
          </button>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{filledCount}</div>
            <div className="text-xs text-gray-500">von {totalMatches} ausgefüllt</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-400">
              ~{userExpectedPoints.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">erw. Punkte</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-yellow-400">{agreementCount}</div>
            <div className="text-xs text-gray-500">Stimmen mit Modell überein</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-gray-300">
              {filledCount > 0 ? Math.round((filledCount / totalMatches) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500">Fortschritt</div>
            {/* Progress bar */}
            <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(filledCount / totalMatches) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tippzettel detail view */}
        {showTippzettel && filledCount > 0 && (
          <div className="mt-4 border-t border-gray-800 pt-4">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {tips.filter(t => userTips[t.matchId]).map(t => {
                const myTip = userTips[t.matchId]
                const differsFromModel = myTip !== t.suggestedTip
                return (
                  <div key={t.matchId} className={`flex items-center gap-3 text-xs px-2 py-1.5 rounded-lg ${differsFromModel ? 'bg-yellow-900/20' : 'bg-gray-800/40'}`}>
                    <span className="text-gray-500 w-12 flex-shrink-0">{t.date?.slice(5)}</span>
                    <span className="flex-1 text-gray-300 truncate">
                      {t.teamAFlag} {t.teamAName} vs {t.teamBName} {t.teamBFlag}
                    </span>
                    <span className="flex-shrink-0 text-gray-500">Modell: <span className="text-gray-300">{t.suggestedTip}</span></span>
                    <span className={`flex-shrink-0 font-bold px-2 py-0.5 rounded ${differsFromModel ? 'bg-yellow-800 text-yellow-300' : 'bg-emerald-900 text-emerald-300'}`}>
                      {myTip}
                    </span>
                    <button
                      onClick={() => setUserTip(t.matchId, null)}
                      className="text-gray-600 hover:text-rose-400 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showTippzettel && filledCount === 0 && (
          <p className="text-xs text-gray-500 mt-4 border-t border-gray-800 pt-4">
            Noch keine Tipps eingetragen. Trage unten bei jedem Spiel deinen Tipp ein.
          </p>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.entries(CONFIDENCE_CONFIG) as [TipSuggestion['confidence'], typeof CONFIDENCE_CONFIG.very_high][]).map(([key, cfg]) => (
          <div
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`bg-gray-900 border rounded-xl p-3 cursor-pointer transition-all ${
              filter === key ? cfg.color : 'border-gray-800 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-gray-400">{cfg.label}</span>
            </div>
            <div className="text-xl font-bold">{stats[key]}</div>
            <div className="text-xs text-gray-500">Spiele</div>
          </div>
        ))}
      </div>

      {/* Config */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Tippspiel-Regeln konfigurieren</h2>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Punkte richtiger Ausgang</label>
            <input
              type="number"
              min={1}
              max={10}
              value={pointsPerResult}
              onChange={e => setPointsPerResult(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-16 text-center"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Punkte exaktes Ergebnis</label>
            <input
              type="number"
              min={1}
              max={15}
              value={pointsPerExact}
              onChange={e => setPointsPerExact(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-16 text-center"
            />
          </div>
          <div className="self-end">
            <div className="text-xs text-gray-500">Erwartete Punkte (gefiltert)</div>
            <div className="text-lg font-mono font-bold text-emerald-400">
              ~{totalExpectedPoints.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1.5">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'very_high', label: '●●●● Sehr sicher' },
            { key: 'high', label: '●●●○ Sicher' },
            { key: 'medium', label: '●●○○ Mittel' },
            { key: 'value', label: '💰 Value Bets' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                filter === f.key
                  ? 'bg-emerald-500 text-black font-medium'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Group Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {groups.map(g => (
          <button
            key={g}
            onClick={() => setGroupFilter(g)}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
              groupFilter === g
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {g === 'all' ? 'Alle Gruppen' : `Gr. ${g}`}
          </button>
        ))}
      </div>

      {/* Export Button */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">{filteredTips.length} Spiele angezeigt</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {copiedText ? '✓ Kopiert!' : '📋 Tabelle kopieren'}
        </button>
      </div>

      {/* Tips List */}
      <div className="space-y-2">
        {filteredTips.map(tip => {
          const cfg = CONFIDENCE_CONFIG[tip.confidence]
          const myTip = userTips[tip.matchId] as UserTip | undefined
          const differsFromModel = myTip && myTip !== tip.suggestedTip

          return (
            <div
              key={tip.matchId}
              className={`bg-gray-900 border rounded-xl p-4 ${
                tip.isValueBet ? 'border-yellow-800' :
                differsFromModel ? 'border-yellow-700/50' :
                'border-gray-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Date/Group */}
                <div className="text-center w-14 flex-shrink-0">
                  <div className="text-xs font-bold text-emerald-400">Gr. {tip.group}</div>
                  <div className="text-xs text-gray-600">{tip.date?.slice(5)}</div>
                </div>

                {/* Teams & Probs */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{tip.teamAFlag}</span>
                    <span className="text-sm font-medium">{tip.teamAName}</span>
                    <span className="text-gray-600 text-xs">vs</span>
                    <span className="text-sm font-medium">{tip.teamBName}</span>
                    <span className="text-lg">{tip.teamBFlag}</span>
                    {tip.isValueBet && (
                      <span className="text-xs bg-yellow-900/50 text-yellow-400 px-1.5 py-0.5 rounded ml-1">
                        💰 Value
                      </span>
                    )}
                  </div>

                  {/* Probability bars */}
                  <div className="flex gap-1 h-5 rounded overflow-hidden mb-2">
                    <div
                      className="flex items-center justify-center text-xs text-white bg-emerald-700"
                      style={{ width: `${tip.winProbA * 100}%` }}
                    >
                      {Math.round(tip.winProbA * 100)}%
                    </div>
                    <div
                      className="flex items-center justify-center text-xs text-white bg-gray-600"
                      style={{ width: `${tip.drawProb * 100}%` }}
                    >
                      {Math.round(tip.drawProb * 100)}%
                    </div>
                    <div
                      className="flex items-center justify-center text-xs text-white bg-blue-700"
                      style={{ width: `${tip.winProbB * 100}%` }}
                    >
                      {Math.round(tip.winProbB * 100)}%
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">{tip.reasoning}</p>
                </div>

                {/* Recommendation + User Tip */}
                <div className="flex-shrink-0 text-center space-y-2">
                  {/* Model suggestion */}
                  <div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold ${cfg.color}`}>
                      <span>
                        {tip.suggestedTip === '1' ? tip.teamAFlag :
                         tip.suggestedTip === '2' ? tip.teamBFlag : 'X'}
                      </span>
                      <span>{tip.suggestedTip}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{cfg.label}</div>
                    <div className="text-xs font-mono text-emerald-400 mt-0.5">
                      ~{(tip.expectedPoints * (pointsPerResult / 3)).toFixed(1)} Pkt.
                    </div>
                  </div>

                  {/* User tip input */}
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Mein Tipp</div>
                    <div className="flex gap-1">
                      {(['1', 'X', '2'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setUserTip(tip.matchId, myTip === t ? null : t)}
                          className={`w-7 h-7 text-xs font-bold rounded transition-colors ${
                            myTip === t
                              ? t === '1' ? 'bg-emerald-600 text-white' :
                                t === '2' ? 'bg-blue-600 text-white' :
                                'bg-gray-500 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {differsFromModel && (
                      <div className="text-xs text-yellow-500 mt-0.5">≠ Modell</div>
                    )}
                    {myTip && !differsFromModel && (
                      <div className="text-xs text-emerald-600 mt-0.5">= Modell</div>
                    )}
                  </div>

                  <Link
                    href={`/matches/${tip.matchId}`}
                    className="text-xs text-gray-600 hover:text-gray-400 block mt-1"
                  >
                    Details →
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredTips.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Keine Spiele für diese Filter-Kombination gefunden.
        </div>
      )}
    </div>
  )
}
