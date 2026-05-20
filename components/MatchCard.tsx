import Link from 'next/link'

interface MatchCardProps {
  matchId: string
  group?: string
  matchday?: number
  teamAFlag: string
  teamBFlag: string
  teamAName: string
  teamBName: string
  date: string
  kickoffUTC: string
  venueCity?: string
  winProbA?: number
  drawProb?: number
  winProbB?: number
}

export default function MatchCard({
  matchId,
  group,
  matchday,
  teamAFlag,
  teamBFlag,
  teamAName,
  teamBName,
  date,
  kickoffUTC,
  venueCity,
  winProbA,
  drawProb,
  winProbB,
}: MatchCardProps) {
  return (
    <Link
      href={`/matches/${matchId}`}
      className="block bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-emerald-800 hover:bg-gray-900/80 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <span>{group ? `Gruppe ${group}${matchday ? ` · MD${matchday}` : ''}` : 'KO-Runde'}</span>
        <span>{date}</span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <span className="text-xs font-medium truncate">{teamAName}</span>
          <span className="text-xl">{teamAFlag}</span>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          {kickoffUTC}
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xl">{teamBFlag}</span>
          <span className="text-xs font-medium truncate">{teamBName}</span>
        </div>
      </div>

      {/* Venue */}
      {venueCity && (
        <div className="text-center text-xs text-gray-600 mb-2">{venueCity}</div>
      )}

      {/* Probabilities */}
      {winProbA !== undefined && drawProb !== undefined && winProbB !== undefined && (
        <div className="flex h-1.5 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full" style={{ width: `${winProbA * 100}%` }} />
          <div className="bg-gray-500 h-full" style={{ width: `${drawProb * 100}%` }} />
          <div className="bg-blue-500 h-full" style={{ width: `${winProbB * 100}%` }} />
        </div>
      )}
    </Link>
  )
}
