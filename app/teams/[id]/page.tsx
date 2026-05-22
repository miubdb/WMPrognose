import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { supabase } from '@/lib/supabase'
import { DeleteButton } from './DeleteButton'

export const dynamic = 'force-dynamic'

const POS_LABELS: Record<string, string> = { GK: 'Tor', DEF: 'Abwehr', MID: 'Mittelfeld', FWD: 'Sturm' }
const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD']

export default async function TeamPage({ params }: { params: { id: string } }) {
  const team = TEAM_BY_ID[params.id]
  if (!team) notFound()

  const { data: players } = await supabase
    .from('players')
    .select('id, name, position, jersey_number, age, club_team, market_value_m, rating, xg_per90, xga_per90')
    .eq('team_id', params.id)
    .order('position')
    .order('market_value_m', { ascending: false })

  const byPos = POS_ORDER.reduce((acc, pos) => {
    acc[pos] = (players ?? []).filter(p => p.position === pos)
    return acc
  }, {} as Record<string, typeof players extends null ? never[] : NonNullable<typeof players>>)

  const totalValue = (players ?? []).reduce((s, p) => s + (p.market_value_m ?? 0), 0)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/teams" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
        ← Alle Teams
      </Link>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-5">
        <span className="text-6xl">{team.flag}</span>
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-400">
            <span>Gruppe {team.group}</span>
            <span>·</span>
            <span>ELO {team.eloRating}</span>
            <span>·</span>
            <span>{team.confederation}</span>
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Kader-Marktwert: {Math.round(totalValue)}M€ · {players?.length ?? 0} Spieler
          </div>
        </div>
      </div>

      {/* Too many players warning */}
      {(players?.length ?? 0) > 26 && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-sm text-amber-400">
          ⚠ {players!.length} Spieler – der finale Kader hat 26 Plätze. Bitte entfernen bis 26 verbleiben.
        </div>
      )}

      {/* Squad */}
      {players && players.length > 0 ? (
        <div className="space-y-4">
          {POS_ORDER.map(pos => {
            const group = byPos[pos] ?? []
            if (group.length === 0) return null
            return (
              <div key={pos} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-800/40 border-b border-gray-800">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{POS_LABELS[pos]}</span>
                  <span className="text-xs text-gray-600 ml-2">{group.length} Spieler</span>
                </div>
                <div className="divide-y divide-gray-800/60">
                  {group.map((p: { id: string; jersey_number: number | null; name: string; age: number; club_team: string | null; market_value_m: number; rating: number; xg_per90: number | null; xga_per90: number | null }) => (
                    <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-xs text-gray-600 font-mono w-5 text-right">
                        {p.jersey_number ?? '–'}
                      </span>
                      <span className="flex-1 text-sm text-gray-200">{p.name}</span>
                      <span className="text-xs text-gray-500">{p.age} J.</span>
                      <span className="text-xs text-gray-600 hidden sm:block truncate max-w-[140px]">{p.club_team}</span>
                      <span className="text-xs text-gray-500 font-mono">
                        {p.market_value_m >= 1
                          ? `${p.market_value_m.toFixed(1)}M€`
                          : `${Math.round(p.market_value_m * 1000)}T€`}
                      </span>
                      {(p.xg_per90 ?? 0) > 0 && (
                        <span className="text-[10px] text-blue-400 font-mono hidden md:block" title="xG/90 Saison 2024/25">
                          {p.xg_per90!.toFixed(2)} xG
                        </span>
                      )}
                      <DeleteButton playerId={p.id} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center text-gray-600 py-16 bg-gray-900 border border-gray-800 rounded-xl text-sm">
          Kein Kader eingetragen.
        </div>
      )}
    </div>
  )
}
