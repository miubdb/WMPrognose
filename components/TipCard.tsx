import Link from 'next/link'

export type Confidence = 'very_high' | 'high' | 'medium' | 'low'

interface TipCardProps {
  matchId: string
  teamAName: string
  teamBName: string
  teamAFlag: string
  teamBFlag: string
  suggestedTip: '1' | 'X' | '2'
  confidence: Confidence
  winProbA: number
  drawProb: number
  winProbB: number
  reasoning: string
  isValueBet: boolean
  expectedPoints: number
  group?: string
  date?: string
}

const CONFIDENCE_STYLES: Record<Confidence, { label: string; badge: string }> = {
  very_high: { label: 'Sehr sicher', badge: 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' },
  high: { label: 'Sicher', badge: 'bg-blue-900/50 text-blue-400 border border-blue-800' },
  medium: { label: 'Mittel', badge: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' },
  low: { label: 'Unsicher', badge: 'bg-gray-800 text-gray-400 border border-gray-700' },
}

export default function TipCard({
  matchId,
  teamAName,
  teamBName,
  teamAFlag,
  teamBFlag,
  suggestedTip,
  confidence,
  winProbA,
  drawProb,
  winProbB,
  reasoning,
  isValueBet,
  expectedPoints,
  group,
  date,
}: TipCardProps) {
  const cfg = CONFIDENCE_STYLES[confidence]
  const pA = Math.round(winProbA * 100)
  const pD = Math.round(drawProb * 100)
  const pB = Math.round(winProbB * 100)

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 ${isValueBet ? 'border-yellow-800' : 'border-gray-800'}`}>
      <div className="flex items-start gap-3">
        {/* Group/Date */}
        {(group || date) && (
          <div className="text-center w-12 flex-shrink-0">
            {group && <div className="text-xs font-bold text-emerald-400">Gr. {group}</div>}
            {date && <div className="text-xs text-gray-600">{date.slice(5)}</div>}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Teams */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-lg">{teamAFlag}</span>
            <span className="text-sm font-medium">{teamAName}</span>
            <span className="text-gray-600 text-xs">vs</span>
            <span className="text-sm font-medium">{teamBName}</span>
            <span className="text-lg">{teamBFlag}</span>
            {isValueBet && (
              <span className="text-xs bg-yellow-900/40 text-yellow-500 px-1.5 py-0.5 rounded">
                💰 Value
              </span>
            )}
          </div>

          {/* Prob Bar */}
          <div className="flex h-4 rounded overflow-hidden mb-2 text-xs">
            <div
              className="flex items-center justify-center bg-emerald-700 text-white"
              style={{ width: `${pA}%` }}
            >
              {pA > 10 ? `${pA}%` : ''}
            </div>
            <div
              className="flex items-center justify-center bg-gray-600 text-white"
              style={{ width: `${pD}%` }}
            >
              {pD > 10 ? `${pD}%` : ''}
            </div>
            <div
              className="flex items-center justify-center bg-blue-700 text-white"
              style={{ width: `${pB}%` }}
            >
              {pB > 10 ? `${pB}%` : ''}
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{reasoning}</p>
        </div>

        {/* Recommendation */}
        <div className="flex-shrink-0 text-center space-y-1">
          <div className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${cfg.badge}`}>
            {suggestedTip === '1' ? teamAFlag :
             suggestedTip === '2' ? teamBFlag : 'X'} {suggestedTip}
          </div>
          <div className="text-xs text-gray-500">{cfg.label}</div>
          <div className="text-xs font-mono text-emerald-400">~{expectedPoints.toFixed(1)} Pkt.</div>
          <Link href={`/matches/${matchId}`} className="text-xs text-gray-600 hover:text-gray-400 block">
            Details →
          </Link>
        </div>
      </div>
    </div>
  )
}
