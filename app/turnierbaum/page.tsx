import Link from 'next/link'
import { ALL_MATCHES } from '@/src/data/schedule'
import { VENUES } from '@/src/data/venues'
import { toBerlinTime, fmtDate } from '@/lib/utils'

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

const r32 = ALL_MATCHES.filter(m => m.round === 'round_of_32')
const r16 = ALL_MATCHES.filter(m => m.round === 'round_of_16')
const qf  = ALL_MATCHES.filter(m => m.round === 'quarterfinal')
const sf  = ALL_MATCHES.filter(m => m.round === 'semifinal')
const fin = ALL_MATCHES.filter(m => m.round === 'final')

function MatchSlot({
  id, teamALabel, teamBLabel, date, venueId, accent = false,
}: {
  id: string
  teamALabel?: string
  teamBLabel?: string
  date: string
  venueId: string
  kickoffUTC: string
  accent?: boolean
}) {
  const venue = VENUES[venueId]
  const label = id.replace('R32_', 'S').replace('R16_', 'VR16-').replace('QF', 'VF-').replace('SF', 'HF-')
  return (
    <div
      className={`rounded-lg border p-3 text-xs ${
        accent
          ? 'border-emerald-700/50 bg-emerald-900/10'
          : 'border-gray-800 bg-gray-900'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-gray-600">{id}</span>
        <span className="text-[10px] text-gray-600">{fmtDate(date)}</span>
      </div>
      <div className="space-y-1">
        <div className="text-gray-300 truncate">{teamALabel ?? '?'}</div>
        <div className="text-gray-600 text-[10px] font-mono">vs</div>
        <div className="text-gray-300 truncate">{teamBLabel ?? '?'}</div>
      </div>
      <div className="mt-2 text-[10px] text-gray-600 truncate">{venue?.city ?? venueId}</div>
    </div>
  )
}

export default function TurnierbaumPage() {
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
            <MatchSlot key={m.id} {...m} />
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
            <MatchSlot key={m.id} {...m} />
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
            <MatchSlot key={m.id} {...m} />
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
            <MatchSlot key={m.id} {...m} />
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
            <MatchSlot key={m.id} {...m} accent />
          ))}
        </div>
      </section>

      <p className="text-xs text-gray-700 text-center pb-4">
        Turnierbaum basiert auf dem offiziellen FIFA-Spielplan
      </p>
    </div>
  )
}
