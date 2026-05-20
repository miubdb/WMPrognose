import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MATCH_BY_ID, GROUP_SCHEDULE } from '@/src/data/schedule'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { getMatchPrediction } from '@/lib/modelAdapter'
import { VENUES } from '@/src/data/venues'

export function generateStaticParams() {
  return GROUP_SCHEDULE.map(m => ({ id: m.id }))
}

interface Props {
  params: { id: string }
}

const VENUE_NAMES: Record<string, string> = {
  mexico_city: 'Estadio Azteca, Mexico City',
  guadalajara: 'Estadio Akron, Guadalajara',
  monterrey: 'Estadio BBVA, Monterrey',
  miami: 'Hard Rock Stadium, Miami',
  houston: 'NRG Stadium, Houston',
  dallas: 'AT&T Stadium, Dallas',
  new_york: 'MetLife Stadium, New York/NJ',
  los_angeles: 'SoFi Stadium, Los Angeles',
  toronto: 'BMO Field, Toronto',
  vancouver: 'BC Place, Vancouver',
}

export default async function MatchDetailPage({ params }: Props) {
  const match = MATCH_BY_ID[params.id]
  if (!match || match.teamAId === 'tbd') notFound()

  const teamA = TEAM_BY_ID[match.teamAId]
  const teamB = TEAM_BY_ID[match.teamBId]
  if (!teamA || !teamB) notFound()

  const prediction = await getMatchPrediction({
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    venueId: match.venueId,
  })

  const venue = VENUES[match.venueId]
  const venueName = VENUE_NAMES[match.venueId] ?? match.venueId

  const winA = Math.round(prediction.winProbabilityTeamA * 100)
  const draw = Math.round(prediction.drawProbability * 100)
  const winB = Math.round(prediction.winProbabilityTeamB * 100)

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1">
        ← Alle Spiele
      </Link>

      {/* Match Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          {match.group && (
            <span className="text-xs text-emerald-400 font-medium">
              Gruppe {match.group} · Spieltag {match.matchday}
            </span>
          )}
          <span className="text-xs text-gray-500">{match.date} · {match.kickoffUTC} UTC</span>
        </div>

        <div className="flex items-center justify-center gap-6 my-6">
          <div className="text-center">
            <div className="text-5xl mb-2">{teamA.flag}</div>
            <Link href={`/teams/${teamA.id}`} className="font-bold hover:text-emerald-400 transition-colors">
              {teamA.name}
            </Link>
            <div className="text-xs text-gray-500 mt-1">ELO {teamA.eloRating}</div>
          </div>
          <div className="text-center px-4">
            <div className="text-gray-500 text-2xl font-bold">vs</div>
            <div className="text-xs text-gray-600 mt-1">{venueName}</div>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-2">{teamB.flag}</div>
            <Link href={`/teams/${teamB.id}`} className="font-bold hover:text-emerald-400 transition-colors">
              {teamB.name}
            </Link>
            <div className="text-xs text-gray-500 mt-1">ELO {teamB.eloRating}</div>
          </div>
        </div>

        {/* 1X2 Probabilities */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: '1 Sieg ' + teamA.name, prob: winA, color: 'bg-emerald-500' },
            { label: 'X Unentschieden', prob: draw, color: 'bg-gray-500' },
            { label: '2 Sieg ' + teamB.name, prob: winB, color: 'bg-blue-500' },
          ].map(({ label, prob, color }) => (
            <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
              <div className={`text-xl font-bold ${color.replace('bg-', 'text-')}`}>{prob}%</div>
              <div className="text-xs text-gray-400 mt-1 leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* Probability Bar */}
        <div className="mt-4">
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${winA}%` }} />
            <div className="bg-gray-500 h-full transition-all" style={{ width: `${draw}%` }} />
            <div className="bg-blue-500 h-full transition-all" style={{ width: `${winB}%` }} />
          </div>
        </div>
      </div>

      {/* Expected Goals */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-4">Expected Goals</h2>
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-emerald-400">
              {prediction.expectedGoalsTeamA.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{teamA.name}</div>
          </div>
          <div className="text-center text-gray-600 text-sm">xG</div>
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-blue-400">
              {prediction.expectedGoalsTeamB.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{teamB.name}</div>
          </div>
        </div>
      </div>

      {/* Top 5 Scorelines */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-4">Top 5 Ergebnisse</h2>
        <div className="space-y-2">
          {prediction.top5Scorelines.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-gray-600 text-sm w-5">{i + 1}.</span>
              <span className="font-mono font-bold text-white w-12">
                {s.goalsA}:{s.goalsB}
              </span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500/70 rounded-full"
                  style={{ width: `${Math.min(s.probability * 300, 100)}%` }}
                />
              </div>
              <span className="text-sm font-mono text-emerald-400 w-14 text-right">
                {(s.probability * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scoreline Heatmap */}
      <ScorelineGrid
        teamAName={teamA.name}
        teamBName={teamB.name}
        scorelines={prediction.top5Scorelines}
        xgA={prediction.expectedGoalsTeamA}
        xgB={prediction.expectedGoalsTeamB}
      />

      {/* Rating Comparison */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-4">Rating-Vergleich</h2>
        <div className="space-y-3">
          {[
            { label: 'ELO', valA: teamA.eloRating, valB: teamB.eloRating, max: 2200, minVal: 1300 },
            { label: 'Angriff', valA: teamA.attackRating, valB: teamB.attackRating, max: 100, minVal: 0 },
            { label: 'Mittelfeld', valA: teamA.midfieldRating, valB: teamB.midfieldRating, max: 100, minVal: 0 },
            { label: 'Abwehr', valA: teamA.defenseRating, valB: teamB.defenseRating, max: 100, minVal: 0 },
            { label: 'Torwart', valA: teamA.goalkeeperRating, valB: teamB.goalkeeperRating, max: 100, minVal: 0 },
            { label: 'Marktwert €M', valA: teamA.squadMarketValueM, valB: teamB.squadMarketValueM, max: 1400, minVal: 0 },
          ].map(({ label, valA, valB, max, minVal }) => {
            const range = max - minVal
            const pctA = ((valA - minVal) / range) * 100
            const pctB = ((valB - minVal) / range) * 100
            const winnerA = valA >= valB

            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-mono ${winnerA ? 'text-emerald-400' : 'text-gray-400'}`}>{valA}</span>
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-mono ${!winnerA ? 'text-blue-400' : 'text-gray-400'}`}>{valB}</span>
                </div>
                <div className="flex h-2 gap-0.5">
                  <div className="flex-1 h-full bg-gray-800 rounded-full overflow-hidden flex justify-end">
                    <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: `${pctA}%` }} />
                  </div>
                  <div className="flex-1 h-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-r-full" style={{ width: `${pctB}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-3 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"/> {teamA.name}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full inline-block"/> {teamB.name}</span>
        </div>
      </div>

      {/* Context */}
      {venue && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3">Kontext-Faktoren</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Austragungsort</div>
              <div>{venue.city}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Höhe</div>
              <div>{venue.altitudeMeters}m</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Kapazität</div>
              <div>{venue.capacity.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Temperatur (Juni)</div>
              <div>{venue.expectedTemperatureC}°C</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Luftfeuchtigkeit</div>
              <div>{venue.expectedHumidityPercent}%</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">WBGT</div>
              <div className={venue.estimatedWBGT > 28 ? 'text-rose-400' : 'text-emerald-400'}>
                {venue.estimatedWBGT}°C
              </div>
            </div>
          </div>

          {/* Context Modifiers */}
          {prediction.contextBreakdown && (
            <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 gap-2 text-xs">
              {[
                { label: `${teamA.name} Kontext`, val: (prediction.contextBreakdown as Record<string, unknown>).teamAContextModifier as number },
                { label: `${teamB.name} Kontext`, val: (prediction.contextBreakdown as Record<string, unknown>).teamBContextModifier as number },
              ].map(({ label, val }) => (
                <div key={label}>
                  <span className="text-gray-500">{label}: </span>
                  <span className={val >= 1 ? 'text-emerald-400' : 'text-rose-400'}>
                    ×{typeof val === 'number' ? val.toFixed(3) : '–'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Model Notes */}
      {prediction.modelNotes.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3 text-sm">Modell-Notizen</h2>
          <div className="space-y-1">
            {prediction.modelNotes.slice(0, 8).map((note, i) => (
              <p key={i} className="text-xs text-gray-500">{note}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Scoreline Heatmap (5x5)
function ScorelineGrid({
  teamAName,
  teamBName,
  xgA,
  xgB,
}: {
  teamAName: string
  teamBName: string
  scorelines: import('@/src/model/poisson').ScorelineProbability[]
  xgA: number
  xgB: number
}) {
  // Generiere 5x5 Heatmap aus Poisson-Verteilung
  function poissonPdf(k: number, lambda: number): number {
    let result = Math.exp(-lambda)
    for (let i = 1; i <= k; i++) result *= lambda / i
    return result
  }

  const grid: { goalsA: number; goalsB: number; prob: number }[] = []
  let maxProb = 0
  for (let a = 0; a <= 4; a++) {
    for (let b = 0; b <= 4; b++) {
      const prob = poissonPdf(a, xgA) * poissonPdf(b, xgB)
      grid.push({ goalsA: a, goalsB: b, prob })
      if (prob > maxProb) maxProb = prob
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h2 className="font-semibold mb-3">Ergebnis-Heatmap</h2>
      <p className="text-xs text-gray-500 mb-3">Wahrscheinlichkeit für jedes Ergebnis (Poisson-Modell)</p>

      <div className="overflow-x-auto">
        <table className="mx-auto text-xs">
          <thead>
            <tr>
              <th className="w-10 text-gray-600 text-right pr-2"></th>
              {[0, 1, 2, 3, 4].map(b => (
                <th key={b} className="w-12 text-center text-gray-500 pb-1">
                  {teamBName.slice(0, 3)} {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4].map(a => (
              <tr key={a}>
                <td className="text-gray-500 text-right pr-2 py-0.5 whitespace-nowrap">
                  {teamAName.slice(0, 3)} {a}
                </td>
                {[0, 1, 2, 3, 4].map(b => {
                  const cell = grid.find(g => g.goalsA === a && g.goalsB === b)
                  const prob = cell?.prob ?? 0
                  const intensity = maxProb > 0 ? prob / maxProb : 0
                  const bgClass = intensity > 0.8 ? 'bg-emerald-500 text-black' :
                    intensity > 0.5 ? 'bg-emerald-700 text-white' :
                    intensity > 0.25 ? 'bg-emerald-900 text-emerald-300' :
                    'bg-gray-800 text-gray-500'

                  return (
                    <td key={b} className={`w-12 h-8 text-center rounded ${bgClass}`}>
                      {(prob * 100).toFixed(1)}%
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
