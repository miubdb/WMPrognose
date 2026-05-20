interface TeamStrengthBarsProps {
  attackRating: number
  midfieldRating: number
  defenseRating: number
  goalkeeperRating: number
  setPieceRating?: number
  compact?: boolean
}

const RATINGS = [
  { key: 'attackRating', label: 'Angriff', color: 'bg-rose-500' },
  { key: 'midfieldRating', label: 'Mittelfeld', color: 'bg-blue-500' },
  { key: 'defenseRating', label: 'Abwehr', color: 'bg-emerald-500' },
  { key: 'goalkeeperRating', label: 'Torwart', color: 'bg-yellow-500' },
  { key: 'setPieceRating', label: 'Standards', color: 'bg-purple-500' },
] as const

export default function TeamStrengthBars({
  attackRating,
  midfieldRating,
  defenseRating,
  goalkeeperRating,
  setPieceRating,
  compact = false,
}: TeamStrengthBarsProps) {
  const values: Record<string, number> = {
    attackRating,
    midfieldRating,
    defenseRating,
    goalkeeperRating,
    ...(setPieceRating !== undefined ? { setPieceRating } : {}),
  }

  const ratings = RATINGS.filter(r => values[r.key] !== undefined)

  return (
    <div className={`space-y-${compact ? '1.5' : '2.5'}`}>
      {ratings.map(({ key, label, color }) => {
        const val = values[key]
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">{label}</span>
              <span className="font-mono text-gray-300">{val}<span className="text-gray-600">/100</span></span>
            </div>
            <div className={`${compact ? 'h-1.5' : 'h-2'} bg-gray-800 rounded-full overflow-hidden`}>
              <div
                className={`h-full ${color} rounded-full`}
                style={{ width: `${val}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
