import { supabase } from '@/lib/supabase'
import { computeGroupStandings } from '@/lib/standings'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function GruppenPage() {
  const { data: resultsData } = await supabase.from('match_results').select('match_id, goals_a, goals_b')

  const results: Record<string, { goals_a: number; goals_b: number }> = {}
  for (const r of resultsData ?? []) results[r.match_id] = { goals_a: r.goals_a, goals_b: r.goals_b }

  const standings = computeGroupStandings(results)
  const groups = Object.keys(standings).sort()

  // Count played/total matches per group
  const matchCountByGroup: Record<string, { played: number; total: number }> = {}
  for (const m of GROUP_SCHEDULE) {
    if (!m.group) continue
    if (!matchCountByGroup[m.group]) matchCountByGroup[m.group] = { played: 0, total: 0 }
    matchCountByGroup[m.group].total++
    if (results[m.id]) matchCountByGroup[m.group].played++
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gruppen</h1>
        <p className="text-gray-500 text-sm mt-1">Live-Tabellen · {Object.values(results).length} Spiele eingetragen</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => {
          const table = standings[group]
          const mc = matchCountByGroup[group] ?? { played: 0, total: 6 }
          const groupComplete = mc.played === mc.total
          const statusLabel = groupComplete
            ? 'Gruppe beendet'
            : mc.played === 0
            ? 'Noch keine Spiele'
            : `${mc.played}/${mc.total} Spiele`

          return (
            <div key={group} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-800/40 border-b border-gray-800 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-400">Gruppe {group}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    groupComplete ? 'bg-gray-700 text-gray-400' : 'bg-emerald-900/30 text-emerald-500'
                  }`}>
                    {statusLabel}
                  </span>
                  <Link href={`/?group=${group}`} className="text-xs text-gray-600 hover:text-gray-400">Spiele →</Link>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-600 text-[10px]">
                    <th className="px-3 py-1.5 text-left font-normal w-5">#</th>
                    <th className="px-1 py-1.5 text-left font-normal">Team</th>
                    <th className="px-1 py-1.5 text-center font-normal w-6">Sp</th>
                    <th className="px-1 py-1.5 text-center font-normal w-6">S</th>
                    <th className="px-1 py-1.5 text-center font-normal w-6">U</th>
                    <th className="px-1 py-1.5 text-center font-normal w-6">N</th>
                    <th className="px-1 py-1.5 text-center font-normal w-10">Tore</th>
                    <th className="px-1 py-1.5 text-center font-normal w-8">TD</th>
                    <th className="px-1 py-1.5 text-center font-normal w-6">Pkt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {table.map((t, i) => {
                    const team = TEAM_BY_ID[t.teamId]
                    const rowBg = t.qualified
                      ? 'bg-emerald-900/10'
                      : t.thirdCanQualify
                      ? 'bg-blue-900/10'
                      : t.eliminated
                      ? 'bg-red-900/10 opacity-60'
                      : ''
                    const qualBorder = i === 1 && !groupComplete ? 'border-b border-emerald-800/40' : ''
                    return (
                      <tr key={t.teamId} className={`${rowBg} ${qualBorder}`}>
                        <td className="px-3 py-2 text-gray-600">{i + 1}</td>
                        <td className="px-1 py-2">
                          <Link href={`/teams/${t.teamId}`} className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                            <span>{team?.flag}</span>
                            <span className="text-gray-200 font-medium truncate max-w-[80px]">{team?.name}</span>
                            {t.qualified && <span className="text-[9px] text-emerald-500 font-bold ml-0.5">✓</span>}
                            {t.eliminated && <span className="text-[9px] text-red-500 font-bold ml-0.5">✗</span>}
                            {t.thirdCanQualify && !t.qualified && !t.eliminated && (
                              <span className="text-[9px] text-blue-400 font-bold ml-0.5">3?</span>
                            )}
                          </Link>
                        </td>
                        <td className="px-1 py-2 text-center text-gray-500">{t.played}</td>
                        <td className="px-1 py-2 text-center text-gray-400">{t.won}</td>
                        <td className="px-1 py-2 text-center text-gray-400">{t.drawn}</td>
                        <td className="px-1 py-2 text-center text-gray-400">{t.lost}</td>
                        <td className="px-1 py-2 text-center text-gray-500">{t.gf}:{t.ga}</td>
                        <td className={`px-1 py-2 text-center font-mono ${t.gd > 0 ? 'text-emerald-400' : t.gd < 0 ? 'text-rose-400' : 'text-gray-600'}`}>
                          {t.gd > 0 ? `+${t.gd}` : t.gd}
                        </td>
                        <td className="px-1 py-2 text-center font-bold text-white">{t.pts}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {/* Legend */}
              {!groupComplete && (
                <div className="px-3 py-1.5 border-t border-gray-800/60 flex items-center gap-3 text-[10px] text-gray-700">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-900/30 inline-block" /> Quali</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-900/20 inline-block" /> 3. Platz</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
