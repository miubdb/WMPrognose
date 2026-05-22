import Link from 'next/link'

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

const R32_BRACKET = [
  // Path 1 → leads to QF1
  { match: 'R32-01', teamA: '1. Gruppe A', teamB: '2. Gruppe B', date: '27. Juni' },
  { match: 'R32-02', teamA: '1. Gruppe C', teamB: '3. Platz (Gr. D/E/F)', date: '27. Juni' },
  // Path 2 → leads to QF1
  { match: 'R32-03', teamA: '1. Gruppe B', teamB: '2. Gruppe A', date: '28. Juni' },
  { match: 'R32-04', teamA: '1. Gruppe D', teamB: '3. Platz (Gr. A/B/C)', date: '28. Juni' },
  // Path 3 → leads to QF2
  { match: 'R32-05', teamA: '1. Gruppe E', teamB: '2. Gruppe F', date: '29. Juni' },
  { match: 'R32-06', teamA: '1. Gruppe G', teamB: '3. Platz (Gr. H/I/J)', date: '29. Juni' },
  // Path 4 → leads to QF2
  { match: 'R32-07', teamA: '1. Gruppe F', teamB: '2. Gruppe E', date: '30. Juni' },
  { match: 'R32-08', teamA: '1. Gruppe H', teamB: '3. Platz (Gr. G/K/L)', date: '30. Juni' },
  // Path 5 → leads to QF3
  { match: 'R32-09', teamA: '1. Gruppe I', teamB: '2. Gruppe J', date: '1. Juli' },
  { match: 'R32-10', teamA: '1. Gruppe K', teamB: '3. Platz (Gr. A/D/E)', date: '1. Juli' },
  // Path 6 → leads to QF3
  { match: 'R32-11', teamA: '1. Gruppe J', teamB: '2. Gruppe I', date: '2. Juli' },
  { match: 'R32-12', teamA: '1. Gruppe L', teamB: '3. Platz (Gr. B/C/F)', date: '2. Juli' },
  // Path 7 → leads to QF4
  { match: 'R32-13', teamA: '2. Gruppe K', teamB: '2. Gruppe L', date: '3. Juli' },
  { match: 'R32-14', teamA: '2. Gruppe C', teamB: '2. Gruppe D', date: '3. Juli' },
  // Path 8 → leads to QF4
  { match: 'R32-15', teamA: '2. Gruppe G', teamB: '2. Gruppe H', date: '4. Juli' },
  { match: 'R32-16', teamA: '3. Platz (Gr. I/J/K/L)', teamB: '3. Platz (restlich)', date: '4. Juli' },
]

const R16_BRACKET = [
  { match: 'R16-01', teamA: 'Sieger R32-01', teamB: 'Sieger R32-02', date: '5./6. Juli' },
  { match: 'R16-02', teamA: 'Sieger R32-03', teamB: 'Sieger R32-04', date: '5./6. Juli' },
  { match: 'R16-03', teamA: 'Sieger R32-05', teamB: 'Sieger R32-06', date: '5./6. Juli' },
  { match: 'R16-04', teamA: 'Sieger R32-07', teamB: 'Sieger R32-08', date: '5./6. Juli' },
  { match: 'R16-05', teamA: 'Sieger R32-09', teamB: 'Sieger R32-10', date: '7./8. Juli' },
  { match: 'R16-06', teamA: 'Sieger R32-11', teamB: 'Sieger R32-12', date: '7./8. Juli' },
  { match: 'R16-07', teamA: 'Sieger R32-13', teamB: 'Sieger R32-14', date: '7./8. Juli' },
  { match: 'R16-08', teamA: 'Sieger R32-15', teamB: 'Sieger R32-16', date: '7./8. Juli' },
]

const QF_BRACKET = [
  { match: 'VF-01', teamA: 'Sieger R16-01', teamB: 'Sieger R16-02', date: '9./10. Juli' },
  { match: 'VF-02', teamA: 'Sieger R16-03', teamB: 'Sieger R16-04', date: '9./10. Juli' },
  { match: 'VF-03', teamA: 'Sieger R16-05', teamB: 'Sieger R16-06', date: '11./12. Juli' },
  { match: 'VF-04', teamA: 'Sieger R16-07', teamB: 'Sieger R16-08', date: '11./12. Juli' },
]

const SF_BRACKET = [
  { match: 'HF-01', teamA: 'Sieger VF-01', teamB: 'Sieger VF-02', date: '14. Juli' },
  { match: 'HF-02', teamA: 'Sieger VF-03', teamB: 'Sieger VF-04', date: '15. Juli' },
]

function MatchSlot({
  match,
  teamA,
  teamB,
  date,
  accent = false,
}: {
  match: string
  teamA: string
  teamB: string
  date: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-xs ${
        accent
          ? 'border-emerald-700/50 bg-emerald-900/10'
          : 'border-gray-800 bg-gray-900'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-gray-600">{match}</span>
        <span className="text-[10px] text-gray-600">{date}</span>
      </div>
      <div className="space-y-1">
        <div className="text-gray-300 truncate">{teamA}</div>
        <div className="text-gray-600 text-[10px] font-mono">vs</div>
        <div className="text-gray-300 truncate">{teamB}</div>
      </div>
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

      {/* Accuracy note */}
      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-xs text-amber-400">
        <strong>⚠ Hinweis:</strong> Diese Paarungen basieren auf der offiziellen FIFA-Klammer. Bitte mit dem offiziellen FIFA-Spielplan vergleichen, da die genaue Klammer für Drittplatzierten-Paarungen noch nicht vollständig veröffentlicht wurde.
      </div>

      {/* Group Stage */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Gruppenphase · 12 Gruppen · je 4 Teams
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {GROUPS.map(g => (
            <div key={g} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="text-xs font-bold text-emerald-500 mb-2">Gruppe {g}</div>
              <div className="space-y-1">
                {[1, 2, 3, 4].map(slot => (
                  <div key={slot} className="text-[10px] text-gray-600 font-mono bg-gray-800/50 rounded px-2 py-1">
                    Platz {slot}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Top 2 jeder Gruppe + beste 8 Drittplatzierten qualifizieren sich → 32 Teams in der K.O.-Runde
        </p>
      </section>

      {/* Round of 32 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Achtelfinale (Runde der letzten 32)
        </h2>
        <p className="text-xs text-gray-600 mb-4">27. Juni – 4. Juli 2026 · 16 Spiele</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {R32_BRACKET.map(b => (
            <MatchSlot key={b.match} {...b} />
          ))}
        </div>
      </section>

      {/* Round of 16 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Viertelfinale (Runde der letzten 16)
        </h2>
        <p className="text-xs text-gray-600 mb-4">5. – 8. Juli 2026 · 8 Spiele</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {R16_BRACKET.map(b => (
            <MatchSlot key={b.match} {...b} />
          ))}
        </div>
      </section>

      {/* Quarterfinals */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Viertelfinale
        </h2>
        <p className="text-xs text-gray-600 mb-4">9. – 12. Juli 2026 · 4 Spiele</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QF_BRACKET.map(b => (
            <MatchSlot key={b.match} {...b} />
          ))}
        </div>
      </section>

      {/* Semifinals */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Halbfinale
        </h2>
        <p className="text-xs text-gray-600 mb-4">14. – 15. Juli 2026 · 2 Spiele</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          {SF_BRACKET.map(b => (
            <MatchSlot key={b.match} {...b} />
          ))}
        </div>
      </section>

      {/* Final */}
      <section>
        <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          Finale
        </h2>
        <p className="text-xs text-gray-600 mb-4">19. Juli 2026 · MetLife Stadium, New York/New Jersey</p>
        <div className="max-w-xs">
          <MatchSlot
            match="FINALE"
            teamA="Sieger HF-01"
            teamB="Sieger HF-02"
            date="19. Juli"
            accent
          />
        </div>
      </section>

      {/* Third place */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Spiel um Platz 3
        </h2>
        <p className="text-xs text-gray-600 mb-4">18. Juli 2026</p>
        <div className="max-w-xs">
          <MatchSlot
            match="3. PLATZ"
            teamA="Verlierer HF-01"
            teamB="Verlierer HF-02"
            date="18. Juli"
          />
        </div>
      </section>

      <p className="text-xs text-gray-700 text-center pb-4">
        Turnierbaum basiert auf offizieller FIFA-Klammer · Drittplatzierten-Paarungen vorläufig
      </p>
    </div>
  )
}
