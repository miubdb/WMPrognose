interface ProbabilityBarProps {
  winProbA: number
  drawProb: number
  winProbB: number
  teamAName: string
  teamBName: string
  teamAFlag?: string
  teamBFlag?: string
  showLabels?: boolean
}

export default function ProbabilityBar({
  winProbA,
  drawProb,
  winProbB,
  teamAName,
  teamBName,
  teamAFlag,
  teamBFlag,
  showLabels = true,
}: ProbabilityBarProps) {
  const pA = Math.round(winProbA * 100)
  const pD = Math.round(drawProb * 100)
  const pB = Math.round(winProbB * 100)

  return (
    <div className="space-y-1.5">
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            {teamAFlag && <span>{teamAFlag}</span>}
            {teamAName}
          </span>
          <span>Unentschieden</span>
          <span className="flex items-center gap-1">
            {teamBName}
            {teamBFlag && <span>{teamBFlag}</span>}
          </span>
        </div>
      )}
      <div className="flex h-3 rounded-full overflow-hidden">
        <div
          className="bg-emerald-500 h-full flex items-center justify-center text-xs text-black font-bold transition-all"
          style={{ width: `${pA}%` }}
        >
          {pA > 8 ? `${pA}%` : ''}
        </div>
        <div
          className="bg-gray-500 h-full flex items-center justify-center text-xs text-white transition-all"
          style={{ width: `${pD}%` }}
        >
          {pD > 8 ? `${pD}%` : ''}
        </div>
        <div
          className="bg-blue-500 h-full flex items-center justify-center text-xs text-white font-bold transition-all"
          style={{ width: `${pB}%` }}
        >
          {pB > 8 ? `${pB}%` : ''}
        </div>
      </div>
    </div>
  )
}
