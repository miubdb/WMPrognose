import Link from 'next/link'
import { resolveBracket, MatchResultRow, ScheduledMatch } from '@/src/data/schedule'
import { VENUES } from '@/src/data/venues'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { fmtDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function MatchSlot({
  match,
  result,
  accent = false,
}: {
  match: ScheduledMatch
  result?: MatchResultRow
  accent?: boolean
}) {
  const venue = VENUES[match.venueId]
  const teamA = match.teamAId !== 'tbd' ? TEAM_BY_ID[match.teamAId] : null
  const teamB = match.teamBId !== 'tbd' ? TEAM_BY_ID[match.teamBId] : null
  const wonOnPenalties = !!result && result.goals_a === result.goals_b && result.penalty_a != null && result.penalty_b != null
  const winnerIsA = !!result && (wonOnPenalties ? result.penalty_a! > result.penalty_b! : result.goals_a > result.goals_b)
  const winnerIsB = !!result && (wonOnPenalties ? result.penalty_b! > result.penalty_a! : result.goals_b > result.goals_a)

  return (
    <div
      className={`rounded-lg border p-3 text-xs ${
        accent
          ? 'border-emerald-700/50 bg-emerald-900/10'
          : 'border-gray-800 bg-gray-900'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-gray-600">{match.id}</span>
        <span className="text-[10px] text-gray-600">{fmtDate(match.date)}</span>
      </div>
      <div className="space-y-1">
        <div className={`flex items-center justify-between gap-1 truncate ${winnerIsA ? 'text-white font-bold' : 'text-gray-300'}`}>
          <span className="truncate">{teamA ? `${teamA.flag} ${teamA.name}` : (match.teamALabel ?? '?')}</span>
          {result && <span className="font-mono shrink-0">{result.goals_a}</span>}
        </div>
        <div className="text-gray-600 text-[10px] font-mono">vs</div>
        <div className={`flex items-center justify-between gap-1 truncate ${winnerIsB ? 'text-white font-bold' : 'text-gray-300'}`}>
          <span className="truncate">{teamB ? `${teamB.flag} ${teamB.name}` : (match.teamBLabel ?? '?')}</span>
          {result && <span className="font-mono shrink-0">{result.goals_b}</span>}
        </div>
      </div>
      {wonOnPenalties && (
        <div className="mt-1 text-[10px] text-emerald-500">n. Elfmeterschießen ({result!.penalty_a}:{result!.penalty_b})</div>
      )}
      <div className="mt-2 text-[10px] text-gray-600 truncate">{venue?.city ?? match.venueId}</div>
    </div>
  )
}

export default async function TurnierbaumPage() {
  const { data: resultRows } = await supabase
    .from('match_results')
    .select('match_id, goals_a, goals_b, penalty_a, penalty_b')

  const results: Record<string, MatchResultRow> = {}
  for (const r of resultRows ?? []) {
    results[r.match_id] = { goals_a: r.goals_a, goals_b: r.goals_b, penalty_a: r.penalty_a, penalty_b: r.penalty_b }
  }

  const resolved = resolveBracket(results)
  const r32 = resolved.filter(m => m.round === 'round_of_32')
  const r16 = resolved.filter(m => m.round === 'round_of_16')
  const qf  = resolved.filter(m => m.round === 'quarterfinal')
  const sf  = resolved.filter(m => m.round === 'semifinal')
  const fin = resolved.filter(m => m.round === 'final')

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-4">
          ← Zurück
        </Link>
        <h1 className="text-2xl font-bold">WM 2026 Turnierbaum</h1>
        <p className="text-gray-500 text-sm mt-1">
          FIFA Fussball-Weltmeisterschaft 2026 · USA, Kanada, Mexiko · 48 Teams in 12 Gruppen
        </p>
      </div>

      {/* Group Stage overview */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Gruppenphase · 12 Gruppen · je 4 Teams
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {GROUPS.map(g => (
            <Link
              key={g}
              href={`/gruppen`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-emerald-800 transition-colors"
            >
              <div className="text-xs font-bold text-emerald-500 mb-2">Gruppe {g}</div>
              <div className="space-y-1">
                {[1, 2, 3, 4].map(slot => (
                  <div key={slot} className="text-[10px] text-gray-600 font-mono bg-gray-800/50 rounded px-2 py-1">
                    Platz {slot}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Top 2 jeder Gruppe + beste 8 Drittplatzierten qualifizieren sich → 32 Teams im Achtelfinale
        </p>
      </section>

      {/* Round of 32 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Achtelfinale · Runde der letzten 32
        </h2>
        <p className="text-xs text-gray-600 mb-4">29. Juni – 6. Juli 2026 · 16 Spiele</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {r32.map(m => (
            <MatchSlot key={m.id} match={m} result={results[m.id]} />
          ))}
        </div>
      </section>

      {/* Round of 16 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Viertelfinale · Runde der letzten 16
        </h2>
        <p className="text-xs text-gray-600 mb-4">8. – 11. Juli 2026 · 8 Spiele</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {r16.map(m => (
            <MatchSlot key={m.id} match={m} result={results[m.id]} />
          ))}
        </div>
      </section>

      {/* Quarterfinals */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Viertelfinale
        </h2>
        <p className="text-xs text-gray-600 mb-4">14. – 15. Juli 2026 · 4 Spiele</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {qf.map(m => (
            <MatchSlot key={m.id} match={m} result={results[m.id]} />
          ))}
        </div>
      </section>

      {/* Semifinals */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Halbfinale
        </h2>
        <p className="text-xs text-gray-600 mb-4">17. – 18. Juli 2026 · 2 Spiele</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          {sf.map(m => (
            <MatchSlot key={m.id} match={m} result={results[m.id]} />
          ))}
        </div>
      </section>

      {/* Third place */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Spiel um Platz 3
        </h2>
        <p className="text-xs text-gray-600 mb-4">18. Juli 2026</p>
        <div className="max-w-xs">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-gray-600">PLATZ 3</span>
              <span className="text-[10px] text-gray-600">18. Juli</span>
            </div>
            <div className="space-y-1">
              <div className="text-gray-400">Verlierer HF-1</div>
              <div className="text-gray-600 text-[10px] font-mono">vs</div>
              <div className="text-gray-400">Verlierer HF-2</div>
            </div>
            <div className="mt-2 text-[10px] text-gray-600">Miami Gardens, Florida</div>
          </div>
        </div>
      </section>

      {/* Final */}
      <section>
        <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          Finale
        </h2>
        <p className="text-xs text-gray-600 mb-4">19. Juli 2026 · MetLife Stadium, New York/New Jersey</p>
        <div className="max-w-xs">
          {fin.map(m => (
            <MatchSlot key={m.id} match={m} result={results[m.id]} accent />
          ))}
        </div>
      </section>

      <p className="text-xs text-gray-700 text-center pb-4">
        Turnierbaum basiert auf dem offiziellen FIFA-Spielplan
      </p>
    </div>
  )
}
