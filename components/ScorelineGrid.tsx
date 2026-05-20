interface Scoreline {
  goalsA: number
  goalsB: number
  probability: number
}

interface ScorelineGridProps {
  scorelines: Scoreline[]
  teamAName: string
  teamBName: string
  maxGoals?: number
}

export default function ScorelineGrid({
  scorelines,
  teamAName,
  teamBName,
  maxGoals = 4,
}: ScorelineGridProps) {
  const maxProb = Math.max(...scorelines.map(s => s.probability))

  const getProb = (a: number, b: number): number => {
    return scorelines.find(s => s.goalsA === a && s.goalsB === b)?.probability ?? 0
  }

  const getColor = (prob: number): string => {
    if (maxProb === 0) return 'bg-gray-800 text-gray-600'
    const intensity = prob / maxProb
    if (intensity > 0.8) return 'bg-emerald-500 text-black font-bold'
    if (intensity > 0.5) return 'bg-emerald-700 text-white'
    if (intensity > 0.25) return 'bg-emerald-900 text-emerald-300'
    return 'bg-gray-800 text-gray-500'
  }

  const range = Array.from({ length: maxGoals + 1 }, (_, i) => i)

  return (
    <div className="overflow-x-auto">
      <table className="mx-auto text-xs border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="text-gray-600 text-right pr-2 pb-1 text-xs font-normal">
              {teamAName.slice(0, 6)} ↓ / {teamBName.slice(0, 6)} →
            </th>
            {range.map(b => (
              <th key={b} className="text-center w-10 text-gray-500 pb-1 font-normal">{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {range.map(a => (
            <tr key={a}>
              <td className="text-gray-500 text-right pr-2 py-0.5">{a}</td>
              {range.map(b => {
                const prob = getProb(a, b)
                return (
                  <td
                    key={b}
                    className={`w-10 h-8 text-center rounded text-xs transition-colors ${getColor(prob)}`}
                    title={`${a}:${b} = ${(prob * 100).toFixed(1)}%`}
                  >
                    {(prob * 100).toFixed(1)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-600 text-center mt-2">
        Werte in % · Reihen = {teamAName.slice(0, 3)} Tore · Spalten = {teamBName.slice(0, 3)} Tore
      </p>
    </div>
  )
}
