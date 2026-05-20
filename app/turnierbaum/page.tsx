import Link from 'next/link'
import { ALL_TEAMS } from '@/src/data/allTeams'

export const metadata = {
  title: 'Turnierbaum · WM 2026',
  description: 'KO-Bracket und Gruppenübersicht der FIFA Weltmeisterschaft 2026',
}

// Group teams by group letter
function getGroupTeams() {
  const groups: Record<string, typeof ALL_TEAMS> = {}
  for (const team of ALL_TEAMS) {
    if (!groups[team.group]) groups[team.group] = []
    groups[team.group].push(team)
  }
  return groups
}

// KO-Bracket matchup labels: Runde der 32 (16 Spiele)
const ROUND32_MATCHUPS = [
  { id: 'R32_1',  labelA: 'Sieger A',   labelB: 'Sieger B'   },
  { id: 'R32_2',  labelA: '2. Gruppe C', labelB: '2. Gruppe D' },
  { id: 'R32_3',  labelA: 'Sieger E',   labelB: 'Sieger F'   },
  { id: 'R32_4',  labelA: '2. Gruppe G', labelB: '2. Gruppe H' },
  { id: 'R32_5',  labelA: 'Sieger I',   labelB: 'Sieger J'   },
  { id: 'R32_6',  labelA: '2. Gruppe K', labelB: '2. Gruppe L' },
  { id: 'R32_7',  labelA: 'Sieger C',   labelB: 'Sieger D'   },
  { id: 'R32_8',  labelA: '2. Gruppe A', labelB: '2. Gruppe B' },
  { id: 'R32_9',  labelA: 'Sieger G',   labelB: 'Sieger H'   },
  { id: 'R32_10', labelA: '2. Gruppe E', labelB: '2. Gruppe F' },
  { id: 'R32_11', labelA: 'Sieger K',   labelB: 'Sieger L'   },
  { id: 'R32_12', labelA: '3. Platz (1)', labelB: '3. Platz (2)' },
  { id: 'R32_13', labelA: '3. Platz (3)', labelB: '3. Platz (4)' },
  { id: 'R32_14', labelA: '3. Platz (5)', labelB: '3. Platz (6)' },
  { id: 'R32_15', labelA: '3. Platz (7)', labelB: '3. Platz (8)' },
  { id: 'R32_16', labelA: '3. Platz (9)', labelB: '3. Platz (10)' },
]

const LATER_ROUNDS = [
  { round: 'Achtelfinale (R16)',   matches: 8  },
  { round: 'Viertelfinale (QF)',   matches: 4  },
  { round: 'Halbfinale (SF)',      matches: 2  },
  { round: 'Finale',              matches: 1  },
]

function TBDMatchCard({ labelA, labelB }: { labelA: string; labelB: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs min-w-[140px]">
      <div className="flex items-center gap-1.5 py-1">
        <span className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-600 text-[10px]">?</span>
        <span className="text-gray-400 truncate">{labelA}</span>
      </div>
      <div className="border-t border-gray-800 my-0.5" />
      <div className="flex items-center gap-1.5 py-1">
        <span className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-600 text-[10px]">?</span>
        <span className="text-gray-400 truncate">{labelB}</span>
      </div>
    </div>
  )
}

export default function TurnierbaumPage() {
  const groupTeams = getGroupTeams()
  const groupLetters = Object.keys(groupTeams).sort()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Turnierbaum</h1>
        <p className="text-gray-400 text-sm mt-1">KO-Bracket · FIFA WM 2026</p>
      </div>

      {/* Notice */}
      <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-4 flex items-start gap-3">
        <span className="text-xl mt-0.5">ℹ️</span>
        <div>
          <p className="text-sm text-blue-300 font-medium">Bracket noch nicht befüllt</p>
          <p className="text-xs text-blue-400/80 mt-1">
            Platzierungen werden nach der Gruppenphase (22.–26. Juni 2026) bekannt sein.
            Starte die Monte Carlo Simulation für Wahrscheinlichkeitsprognosen.
          </p>
          <Link
            href="/tournament"
            className="inline-block mt-2 text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Monte Carlo Simulation starten →
          </Link>
        </div>
      </div>

      {/* Groups */}
      <div>
        <h2 className="font-semibold mb-4 text-gray-300">Gruppenphase – 12 Gruppen</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {groupLetters.map(letter => {
            const teams = groupTeams[letter]
            return (
              <div key={letter} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-800">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Gruppe {letter}</span>
                </div>
                <div className="divide-y divide-gray-800">
                  {teams.map((team, i) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800/40 transition-colors group"
                    >
                      <span className="text-xs text-gray-600 w-3">{i + 1}</span>
                      <span className="text-sm">{team.flag}</span>
                      <span className="text-xs text-gray-300 group-hover:text-white truncate flex-1 transition-colors">
                        {team.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Runde der 32 */}
      <div>
        <h2 className="font-semibold mb-2 text-gray-300">Runde der 32 (16 Spiele)</h2>
        <p className="text-xs text-gray-600 mb-4">Qualifikation: Top 2 jeder Gruppe + beste 8 Drittplatzierten</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ROUND32_MATCHUPS.map(m => (
            <TBDMatchCard key={m.id} labelA={m.labelA} labelB={m.labelB} />
          ))}
        </div>
      </div>

      {/* Later rounds */}
      <div className="space-y-4">
        {LATER_ROUNDS.map(({ round, matches }) => (
          <div key={round}>
            <h2 className="font-semibold mb-2 text-gray-300">{round}</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: matches }).map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs min-w-[130px]">
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-4 h-4 rounded bg-gray-800 flex items-center justify-center text-gray-600 text-[8px]">?</span>
                    <span className="text-gray-600">Gewinner {2 * i + 1}</span>
                  </div>
                  <div className="border-t border-gray-800 my-0.5" />
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-4 h-4 rounded bg-gray-800 flex items-center justify-center text-gray-600 text-[8px]">?</span>
                    <span className="text-gray-600">Gewinner {2 * i + 2}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
        <p className="text-sm text-gray-400 mb-3">
          Wer gewinnt die WM 2026? Die Monte Carlo Simulation berechnet Titelwahrscheinlichkeiten für alle 48 Teams.
        </p>
        <Link
          href="/tournament"
          className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          Simulation starten →
        </Link>
      </div>
    </div>
  )
}
