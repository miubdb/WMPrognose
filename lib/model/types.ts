// ─── Squad Rating ─────────────────────────────────────────────────────────────

export interface SquadRating {
  attackValue: number | null        // market-value-weighted avg xG/90 of FWD+MID (null = no data)
  midfieldValue: number             // attack/defense balance of MID (-1=defensive, +1=offensive)
  defenseValue: number | null       // market-value-weighted avg xGA/90 of DEF+GK (lower = better)
  goalkeeperValue: number           // GK quality score 0..100
  peakAgeScore: PeakAgeScore
  totalMarketValueM: number
  playerCount: number
  starterCount: number
}

export interface PeakAgeScore {
  avgAge: number
  logPenalty: number   // log-lambda penalty (≤0)
  label: string
}

// ─── Context Modifiers ────────────────────────────────────────────────────────

export interface VenueContext {
  altitudeMeters: number
  estimatedWBGT: number
  expectedTemperatureC: number
  expectedHumidity: number         // 0..1
  crowdAdvantageTeamId?: string
}

export interface TeamContext {
  isHostNation: boolean
  diasporaCrowdSupport: boolean
  homeRegion: 'europe' | 'south_america' | 'north_america' | 'africa' | 'asia' | 'oceania'
  accustomedAltitudeM: number
  heatAdaptation: number           // 0..1
  travelDistanceKm: number
  restDays: number
}

export interface ContextModifiers {
  altitudeLog: number
  heatLog: number
  travelLog: number
  restLog: number
  homeLog: number
  diasporaLog: number
  totalLog: number
}

// ─── Penalty Shootout ─────────────────────────────────────────────────────────

export interface PenaltySkills {
  goalkeeperSkill: number           // 0..100
  penaltyTakerQuality: number       // 0..100
  tournamentExperience: number      // 0..100
}

// ─── Coach & Heritage ─────────────────────────────────────────────────────────

export interface CoachData {
  name: string
  tenureYears: number
  majorTournamentExperience: number
  knockoutExperience: number
  tacticalStability: number         // 0..100
}

export interface CoachScore {
  tenureLog: number
  experienceLog: number
  stabilityLog: number
  totalLog: number
  label: string
}

// ─── Model Factor ─────────────────────────────────────────────────────────────

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
  score: number             // 0–100 ganzzahlig (für Anzeige: "87/100")
  badge: 'Hoch' | 'Mittel' | 'Niedrig'
  warnings: string[]        // Erklärungen für niedrige Scores
}
