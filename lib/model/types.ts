export interface ModelFactor {
  key: string
  label: string
  category: 'elo' | 'squad' | 'form' | 'context' | 'experience' | 'availability'
  source: string
  valueA: string
  valueB: string
  // Legacy linear % (für UI-Anzeige: "+5%" etc.) — berechnet aus logEffect
  effectA: number
  effectB: number
  // NEU: Beitrag zu log(lambda) — mathematisch korrekte Darstellung
  logEffectA: number
  logEffectB: number
  // Datenqualität & Kalibrierung
  confidence: number    // 0..1: wie verlässlich sind die Eingabedaten für diesen Faktor?
  isCalibrated: boolean // wurde dieser Koeffizient gegen historische Daten validiert?
  explanation: string
  dataFreshness?: string // z.B. "Wikipedia Apr 2025", "Understat Jan 2025"
}

export interface DataQualityScore {
  completeness: number      // 0..1: Anteil Spieler mit vollständigen Daten
  xgCoverage: number        // 0..1: Anteil Spieler mit xG-Daten
  eloFreshness: number      // 0..1: Aktualität der ELO-Ratings
  lineupSet: boolean        // Startelf eingetragen?
  overall: number           // Gewichteter Gesamtscore 0..1
  warnings: string[]        // Erklärungen für niedrige Scores
}
