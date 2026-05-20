export interface ModelCapability {
  bereich: string
  quelle: string
  beschreibung: string
  status: 'implemented' | 'partial' | 'missing' | 'prepared'
  benoetigteDaten: string
  prioritaet: 'hoch' | 'mittel' | 'niedrig'
  auswirkung?: string
}

export const MODEL_CAPABILITIES: ModelCapability[] = [
  // ── Tor-Modell ──────────────────────────────────────────────────────────────
  { bereich: 'Tor-Modell', quelle: 'Maher (1982)', beschreibung: 'Poisson-Prozess mit Attack/Defense-Stärken', status: 'implemented', benoetigteDaten: 'Team-Ratings', prioritaet: 'hoch', auswirkung: 'Grundlage aller Torprognosen' },
  { bereich: 'Tor-Modell', quelle: 'Dixon & Coles (1997)', beschreibung: 'Low-Score-Korrektur (0:0, 1:0, 0:1, 1:1)', status: 'implemented', benoetigteDaten: '–', prioritaet: 'hoch', auswirkung: 'Präzisere Scoreline-Wahrscheinlichkeiten' },
  { bereich: 'Tor-Modell', quelle: 'Karlis & Ntzoufras (2003)', beschreibung: 'Bivariate Poisson / Goal-Korrelation zw. Teams', status: 'prepared', benoetigteDaten: 'Korrelation von Team-Toren / gemeinsame Spielverteilung', prioritaet: 'mittel', auswirkung: 'Verbesserte gemeinsame Torverteilung' },
  { bereich: 'Tor-Modell', quelle: 'Hvattum & Arntzen (2010)', beschreibung: 'ELO als Basis-Predictor', status: 'implemented', benoetigteDaten: 'ELO-Ratings', prioritaet: 'hoch', auswirkung: 'Relative Teamstärke als Prognose-Basis' },
  { bereich: 'Tor-Modell', quelle: 'Constantinou & Fenton (2012)', beschreibung: 'RPS Evaluationsmetrik', status: 'implemented', benoetigteDaten: '–', prioritaet: 'mittel', auswirkung: 'Kalibrierung & Qualitätssicherung' },

  // ── Squad-Signale ───────────────────────────────────────────────────────────
  { bereich: 'Squad-Signale', quelle: 'Peeters (2018)', beschreibung: 'Log-normalisierter Marktwert', status: 'implemented', benoetigteDaten: 'Marktwerte je Spieler', prioritaet: 'hoch', auswirkung: 'Kaderqualität im Modell' },
  { bereich: 'Squad-Signale', quelle: 'Dendir (2016)', beschreibung: 'Peak-Age-Kurve 27–29', status: 'implemented', benoetigteDaten: 'Alter je Spieler', prioritaet: 'mittel', auswirkung: 'Erfahrungs-/Leistungskorridor' },
  { bereich: 'Squad-Signale', quelle: 'Brechot & Flepp (2020)', beschreibung: 'Opponent-adjusted xG', status: 'partial', benoetigteDaten: 'xG for/against je Spieler', prioritaet: 'hoch', auswirkung: 'Realistischere Angriffseffizienz' },
  { bereich: 'Squad-Signale', quelle: 'McHale & Holmes (2023)', beschreibung: 'Positionsabhängige Spielerbewertung', status: 'partial', benoetigteDaten: 'xG/xGA je Position', prioritaet: 'mittel', auswirkung: 'Differenziertere Kaderanalyse' },
  { bereich: 'Squad-Signale', quelle: 'Power et al. (2018)', beschreibung: 'Set-piece Threat', status: 'implemented', benoetigteDaten: 'Set-piece Rating', prioritaet: 'mittel', auswirkung: 'Standard-Gefährlichkeit' },
  { bereich: 'Squad-Signale', quelle: '–', beschreibung: 'Spielerverfügbarkeit / Sperren', status: 'missing', benoetigteDaten: 'Injury/Suspension Status je Spieler', prioritaet: 'hoch', auswirkung: 'Ausfälle verändern Prognose stark' },
  { bereich: 'Squad-Signale', quelle: '–', beschreibung: 'Letzte 10 Spiele / Teamform', status: 'missing', benoetigteDaten: 'Ergebnisse der letzten 10 Länderspiele', prioritaet: 'hoch', auswirkung: 'Aktuelle Form statt Langzeitwerte' },

  // ── Kontext ─────────────────────────────────────────────────────────────────
  { bereich: 'Kontext', quelle: 'McSharry (2007)', beschreibung: 'Höhenmodifier', status: 'implemented', benoetigteDaten: 'Venue-Höhe', prioritaet: 'hoch', auswirkung: 'Akklimatisierungsnachteil' },
  { bereich: 'Kontext', quelle: 'Mohr et al. (2012)', beschreibung: 'WBGT/Hitze-Modifier', status: 'implemented', benoetigteDaten: 'Temperatur/Luftfeuchtigkeit', prioritaet: 'hoch', auswirkung: 'Hitzebelastung → weniger Tore' },
  { bereich: 'Kontext', quelle: 'Reilly et al. (2007)', beschreibung: 'Reise/Jetlag-Modifier', status: 'implemented', benoetigteDaten: 'Reisedistanz, Zeitzonen', prioritaet: 'mittel', auswirkung: 'Jet-Lag bei großen Zeitzonenwechseln' },
  { bereich: 'Kontext', quelle: 'Field et al. (2022)', beschreibung: 'Rest-Days-Modifier', status: 'implemented', benoetigteDaten: 'Spielplan', prioritaet: 'mittel', auswirkung: 'Regeneration & Frische' },
  { bereich: 'Kontext', quelle: 'Pollard (1986)', beschreibung: 'Home Advantage / Diaspora-Faktor', status: 'partial', benoetigteDaten: 'Host Nation, Crowd-Zusammensetzung je Spielort', prioritaet: 'niedrig', auswirkung: 'Heimvorteil USA/MEX/CAN + lokale Fans' },

  // ── Penalty/KO ──────────────────────────────────────────────────────────────
  { bereich: 'Penalty/KO', quelle: 'Csató & Petróczy (2026)', beschreibung: 'Shootout Skill-Edge [42–58%]', status: 'implemented', benoetigteDaten: 'GK-Rating, Penalty-Qualität', prioritaet: 'mittel', auswirkung: 'Elfmeter-Schießen im KO' },

  // ── Coach ────────────────────────────────────────────────────────────────────
  { bereich: 'Coach', quelle: 'Audas et al. (2006)', beschreibung: 'U-Shape Tenure-Effekt', status: 'implemented', benoetigteDaten: 'Trainer-Amtszeit', prioritaet: 'mittel', auswirkung: 'Eingespieltes Team bei mittlerer Amtszeit' },
  { bereich: 'Coach', quelle: 'Forrest et al. (2005)', beschreibung: 'Heritage-Premium', status: 'implemented', benoetigteDaten: 'WM-Titel, Turnierhistorie', prioritaet: 'niedrig', auswirkung: 'Turniermentalität großer Nationen' },
]

export const DATA_NEEDS = [
  { kategorie: 'Spielplan', beschreibung: 'Vollständiger WM-Spielplan als strukturierte Datenquelle', status: 'partial' as const, prioritaet: 'hoch' as const, auswirkung: 'Reihenfolge, Ruhetage, Spielortzuweisung' },
  { kategorie: 'Spielorte', beschreibung: 'Alle 16 Spielorte mit Klimadaten', status: 'implemented' as const, prioritaet: 'hoch' as const, auswirkung: 'Kontext-Modifier Höhe, Hitze, Zeitzone' },
  { kategorie: 'Kader', beschreibung: 'Vollständige 26er-Kader je Nation (alle 48 Teams)', status: 'partial' as const, prioritaet: 'hoch' as const, auswirkung: 'Marktwert, Alter, xG-Profil des Teams' },
  { kategorie: 'Startelf', beschreibung: 'Wahrscheinliche Startelf je Spiel', status: 'partial' as const, prioritaet: 'hoch' as const, auswirkung: 'Reale Spielerqualität statt Kaderschnitt' },
  { kategorie: 'xG/xGA', beschreibung: 'xG for/against je Spieler', status: 'partial' as const, prioritaet: 'hoch' as const, auswirkung: 'Opponent-adjusted Effizienz (Brechot & Flepp)' },
  { kategorie: 'Team-xG', beschreibung: 'Aggregierte Team-xG for/against aus Länderspielen', status: 'missing' as const, prioritaet: 'hoch' as const, auswirkung: 'Kalibrierung der Poisson-Parameter' },
  { kategorie: 'Form', beschreibung: 'Letzte 10 Länderspiele je Nation mit Ergebnis', status: 'missing' as const, prioritaet: 'hoch' as const, auswirkung: 'Aktuelle Form als Kurzzeit-Prädiktor' },
  { kategorie: 'Verletzungen', beschreibung: 'Verletzungs-/Sperrstatus je Spieler vor jedem Spiel', status: 'missing' as const, prioritaet: 'hoch' as const, auswirkung: 'Ausfälle von Topspielern stark prognose-relevant' },
  { kategorie: 'FIFA-Ranking', beschreibung: 'Aktuelles FIFA-Ranking als zusätzliches Rating-Signal', status: 'missing' as const, prioritaet: 'mittel' as const, auswirkung: 'Ergänzung zu ELO' },
  { kategorie: 'Crowd/Diaspora', beschreibung: 'Fan-Zusammensetzung je Spielort (Diaspora-Faktor)', status: 'partial' as const, prioritaet: 'niedrig' as const, auswirkung: 'Lokaler Heimvorteil-Modifier' },
  { kategorie: 'Reise', beschreibung: 'Tatsächliche Reisestrecken Team→Spielort', status: 'partial' as const, prioritaet: 'mittel' as const, auswirkung: 'Jet-Lag/Reisebelastung (Reilly et al.)' },
]
