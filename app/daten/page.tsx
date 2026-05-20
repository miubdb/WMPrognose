'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ALL_TEAMS, TeamBasic } from '@/src/data/allTeams'
import { supabase, DBPlayer, isSupabaseConfigured } from '@/lib/supabase'

// Global data requirements
const GLOBAL_REQUIREMENTS = [
  { datenfeld: 'ELO Rating',              status: 'vorhanden',     prioritaet: 'Hoch',     auswirkung: 'Primärer Match-Outcome-Predictor'          },
  { datenfeld: 'Marktwert Kader (€M)',     status: 'vorhanden',     prioritaet: 'Hoch',     auswirkung: 'Log-normalisierter Squad-Stärke-Indikator'  },
  { datenfeld: 'Attack/Defense/MID/GK Ratings', status: 'vorhanden', prioritaet: 'Hoch',   auswirkung: 'Basis für Poisson xG-Berechnung'           },
  { datenfeld: 'Spieler-Kader (Alter)',    status: 'teilweise',     prioritaet: 'Mittel',   auswirkung: 'Peak-Age Kurve (Dendir 2016)'               },
  { datenfeld: 'xG per 90 (Spieler)',      status: 'teilweise',     prioritaet: 'Hoch',     auswirkung: 'Opponent-adjusted xG (Brechot 2020)'        },
  { datenfeld: 'Spielerverfügbarkeit',     status: 'fehlt',         prioritaet: 'Hoch',     auswirkung: 'Verletzungen / Sperren beeinflussen Stärke'  },
  { datenfeld: 'Letzte 10 Spiele',         status: 'fehlt',         prioritaet: 'Hoch',     auswirkung: 'Form-Modifier für aktuelle Leistungsfähigkeit' },
  { datenfeld: 'Trainer Amtszeit',         status: 'vorhanden',     prioritaet: 'Mittel',   auswirkung: 'U-Shape Tenure-Effekt (Audas 2006)'         },
  { datenfeld: 'Venue Höhe / WBGT',       status: 'vorhanden',     prioritaet: 'Hoch',     auswirkung: 'Kontext-Modifier (McSharry / Mohr)'         },
  { datenfeld: 'Reisedistanz / Zeitzone',  status: 'vorhanden',     prioritaet: 'Mittel',   auswirkung: 'Jetlag-Modifier (Reilly et al. 2007)'       },
]

type StatusColor = 'vorhanden' | 'teilweise' | 'fehlt'

const STATUS_COLORS: Record<StatusColor, { label: string; color: string; bg: string }> = {
  vorhanden: { label: 'Vorhanden',  color: 'text-emerald-400', bg: 'bg-emerald-900/40 border-emerald-700/50' },
  teilweise: { label: 'Teilweise',  color: 'text-yellow-400',  bg: 'bg-yellow-900/40 border-yellow-700/50'  },
  fehlt:     { label: 'Fehlt',      color: 'text-rose-400',    bg: 'bg-rose-900/40 border-rose-700/50'      },
}

interface TeamDataStatus {
  team: TeamBasic
  playerCount: number
  xgCount: number
  confidence: 'Hoch' | 'Mittel' | 'Niedrig'
  pctComplete: number
}

function calcConfidence(playerCount: number, xgCount: number): 'Hoch' | 'Mittel' | 'Niedrig' {
  let score = 0
  if (playerCount > 0) score += 2
  score += 2 // ELO always available
  score += 1 // Marktwert always available
  if (xgCount >= 5) score += 2
  if (score >= 7) return 'Hoch'
  if (score >= 4) return 'Mittel'
  return 'Niedrig'
}

export default function DatenPage() {
  const [teamStatuses, setTeamStatuses] = useState<TeamDataStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        if (!supabase) {
          setError('Supabase ist nicht konfiguriert – zeige Team-Level-Daten und Fallbacks')
          setTeamStatuses(ALL_TEAMS.map(team => ({
            team,
            playerCount: 0,
            xgCount: 0,
            confidence: calcConfidence(0, 0),
            pctComplete: 0,
          })))
          setLoading(false)
          return
        }

        const { data, error: sbError } = await supabase
          .from('players')
          .select('team_id, xg_per90')

        if (sbError) {
          // Fallback: use static data only
          const statuses = ALL_TEAMS.map(team => ({
            team,
            playerCount: 0,
            xgCount: 0,
            confidence: calcConfidence(0, 0),
            pctComplete: 0,
          }))
          setTeamStatuses(statuses)
          setError('Supabase nicht erreichbar – zeige Schätzwerte')
          setLoading(false)
          return
        }

        const players = (data as Pick<DBPlayer, 'team_id' | 'xg_per90'>[]) ?? []

        const statuses = ALL_TEAMS.map(team => {
          const teamPlayers = players.filter(p => p.team_id === team.id)
          const xgCount = teamPlayers.filter(p => p.xg_per90 != null && p.xg_per90 > 0).length
          const pctComplete = Math.round((teamPlayers.length / 26) * 100)
          return {
            team,
            playerCount: teamPlayers.length,
            xgCount,
            confidence: calcConfidence(teamPlayers.length, xgCount),
            pctComplete,
          }
        })

        setTeamStatuses(statuses)
      } catch {
        setError('Fehler beim Laden der Daten')
        setTeamStatuses(ALL_TEAMS.map(team => ({
          team,
          playerCount: 0,
          xgCount: 0,
          confidence: 'Niedrig',
          pctComplete: 0,
        })))
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [])

  const confColor = (c: 'Hoch' | 'Mittel' | 'Niedrig') =>
    c === 'Hoch' ? 'text-emerald-400' :
    c === 'Mittel' ? 'text-yellow-400' : 'text-rose-400'

  const playerStatusLabel = (count: number) =>
    count === 0 ? 'Keine Daten' :
    count < 16  ? 'Unvollständig' : 'Ausreichend'

  const playerStatusColor = (count: number) =>
    count === 0  ? 'text-rose-400' :
    count < 16   ? 'text-yellow-400' : 'text-emerald-400'

  const teamsHigh   = teamStatuses.filter(t => t.confidence === 'Hoch').length
  const teamsMittel = teamStatuses.filter(t => t.confidence === 'Mittel').length
  const teamsNiedrig = teamStatuses.filter(t => t.confidence === 'Niedrig').length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Datenqualität</h1>
        <p className="text-gray-400 text-sm mt-1">
          Welche Team- und Spieler-Daten sind vorhanden – und wie belastbar ist die Prognose?
        </p>
      </div>

      {error && (
        <div className="bg-yellow-950/40 border border-yellow-800/60 rounded-lg p-3 text-xs text-yellow-400">
          ⚠️ {error}
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="bg-blue-950/40 border border-blue-800/60 rounded-lg p-3 text-xs text-blue-300">
          Ohne Spieler-/Startelfdaten basiert die Prognose stärker auf Team-Level-Daten (ELO, Ratings, Marktwert, Kontext).
        </div>
      )}

      {/* Global Requirements */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="font-semibold text-sm">Globale Datenanforderungen</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Datenfeld</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Priorität</th>
                <th className="px-4 py-2 text-left hidden sm:table-cell">Auswirkung auf Modell</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {GLOBAL_REQUIREMENTS.map(r => {
                const s = STATUS_COLORS[r.status as StatusColor] ?? STATUS_COLORS.fehlt
                return (
                  <tr key={r.datenfeld} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-gray-200">{r.datenfeld}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${s.bg} ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-center font-medium ${
                      r.prioritaet === 'Hoch' ? 'text-rose-400' :
                      r.prioritaet === 'Mittel' ? 'text-yellow-400' : 'text-gray-500'
                    }`}>{r.prioritaet}</td>
                    <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{r.auswirkung}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team confidence summary */}
      {!loading && teamStatuses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{teamsHigh}</div>
            <div className="text-xs text-gray-400 mt-0.5">Teams: Hohe Konfidenz</div>
          </div>
          <div className="bg-yellow-950/40 border border-yellow-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{teamsMittel}</div>
            <div className="text-xs text-gray-400 mt-0.5">Teams: Mittlere Konfidenz</div>
          </div>
          <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-rose-400">{teamsNiedrig}</div>
            <div className="text-xs text-gray-400 mt-0.5">Teams: Niedrige Konfidenz</div>
          </div>
        </div>
      )}

      {/* Per-team table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Pro-Team Datenübersicht (48 Teams)</h2>
          {loading && <span className="text-xs text-gray-500 animate-pulse">Lade Daten…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-3 py-2 text-center">Spieler</th>
                <th className="px-3 py-2 text-center hidden sm:table-cell">% Vollst.</th>
                <th className="px-3 py-2 text-center hidden sm:table-cell">xG</th>
                <th className="px-3 py-2 text-center">Konfidenz</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-3 py-2">
                      <div className="h-4 bg-gray-800 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : (
                teamStatuses.map(({ team, playerCount, xgCount, confidence, pctComplete }) => (
                  <tr key={team.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2">
                      <Link href={`/teams/${team.id}`} className="flex items-center gap-2 hover:text-emerald-400 transition-colors">
                        <span>{team.flag}</span>
                        <span className="text-gray-200">{team.name}</span>
                      </Link>
                    </td>
                    <td className={`px-3 py-2 text-center font-mono ${playerStatusColor(playerCount)}`}>
                      {playerCount}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-400 hidden sm:table-cell">
                      {pctComplete > 0 ? `${pctComplete}%` : '–'}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-400 hidden sm:table-cell">
                      {xgCount > 0 ? xgCount : '–'}
                    </td>
                    <td className={`px-3 py-2 text-center font-medium ${confColor(confidence)}`}>
                      {confidence}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        playerCount === 0  ? 'bg-rose-900/40 text-rose-400' :
                        playerCount < 16   ? 'bg-yellow-900/40 text-yellow-400' :
                        'bg-emerald-900/40 text-emerald-400'
                      }`}>
                        {playerStatusLabel(playerCount)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Link to model docs */}
      <div className="text-center">
        <Link href="/modell" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          → Vollständige Modell-Dokumentation
        </Link>
      </div>
    </div>
  )
}
