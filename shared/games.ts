/** Die Spiele (Modi), die in OUTPLAY heute wirklich funktionieren – eine Quelle für Admin-Startseite und Doku (docs/SPIELE.md). */
export interface GameInfo { mode: string; name: string; icon: string; kind: 'Spiel' | 'Finale'; short: string; points: string; time: string }

export const GAMES: GameInfo[] = [
  { mode: 'geo', name: 'WO ZUR HÖLLE?', icon: '🧭', kind: 'Spiel', short: 'Pin auf der Karte setzen – je näher, desto mehr Punkte.', points: 'bis 250', time: '60 s' },
  { mode: 'match', name: 'MATCHMAKER', icon: '🧲', kind: 'Spiel', short: 'Sechs Paare verbinden.', points: '50 je Paar (max. 300)', time: '60 s' },
  { mode: 'rank', name: 'SORTIER’S!', icon: '↕️', kind: 'Spiel', short: 'Fünf Karten in die richtige Reihenfolge bringen.', points: '50 je richtigem Platz', time: '60 s' },
  { mode: 'unique', name: 'EINZIGARTIG', icon: '✨', kind: 'Spiel', short: 'Eine gültige Antwort nennen, die kein anderer nennt. Der Showmaster kann jede Antwort korrigieren.', points: '300 (doppelt = 0)', time: '45 s' },
  { mode: 'glitch', name: 'GLITCH', icon: '👁️', kind: 'Spiel', short: 'Bild merken, dann die veränderte Stelle antippen.', points: 'bis 250', time: '~30 s' },
  { mode: 'estimate', name: 'SETZ AUF MICH', icon: '🎯', kind: 'Spiel', short: 'Zahl schätzen, dann bis zu 50 % der eigenen Punkte auf einen Tipp setzen.', points: 'Rang + Einsatz', time: '~90 s' },
  { mode: 'link', name: 'DIE VERBINDUNG', icon: '🔗', kind: 'Spiel', short: 'Vier Hinweise, je früher richtig, desto mehr Punkte.', points: '300 / 225 / 150 / 75', time: '4 × 20 s' },
  { mode: 'bluff', name: 'LÜGEN HABEN KURZE BEINE', icon: '😈', kind: 'Spiel', short: 'Falsche Antworten erfinden, dann die echte finden. Punkte fürs Erkennen und fürs Täuschen.', points: '200 + 100 je Hereingefallenem', time: '45 s + 30 s' },
  { mode: 'corridor', name: 'SCHÄTZKORRIDOR', icon: '↔️', kind: 'Spiel', short: 'Einen Zahlenbereich angeben – je enger er die Lösung trifft, desto mehr Punkte.', points: 'bis 300 (daneben 0)', time: '45 s' },
  { mode: 'twist', name: 'VERDREHTE WELT', icon: '🔄', kind: 'Spiel', short: 'Ein ins Gegenteil verdrehter Filmtitel – das Original eintippen, je schneller desto mehr Punkte.', points: '150–300', time: '40 s' },
  { mode: 'vote', name: 'KICKBASE-KONSENS', icon: '🤝', kind: 'Finale', short: 'Geheim eine Person wählen (auch sich selbst oder Michael). Die meistgewählte Person bringt 100 Punkte.', points: '5 × 100 (max. 500)', time: '5 × 45 s' },
  { mode: 'final-lock', name: 'FINAL LOCK', icon: '🔒', kind: 'Finale', short: 'Vier Abschlussaufgaben (Karte, Verbindung, Sortieren, Schätzen) – Rangliste verborgen.', points: 'bis 1.450', time: '~8 min' },
];
/** Noch nicht gebaut (Ideenliste, braucht Bilder/Audio oder ein Spieldesign) – siehe docs/SPIELE.md. */
export const PLANNED_GAMES = [
  { name: 'PIXELPANIK', note: 'Verpixeltes Bild wird schärfer – braucht Bilddateien.' },
  { name: 'TONSPUR', note: 'Geräusche und Audio erkennen – braucht Audiodateien.' },
  { name: 'DUELL DER DEPPEN', note: 'Zwei duellieren sich, die anderen wetten – Duellformat noch festzulegen.' },
  { name: 'DIE ARENA', note: 'Inszenierte TV-Duellrunde – Spielprinzip noch offen.' },
  { name: 'ZEITSPRUNG', note: 'Ereignisse auf einer Zeitachse einordnen.' },
  { name: 'PANIK / HOT WIRE', note: 'Unter Zeitdruck im richtigen Moment reagieren.' },
];
/** Nicht mehr im Spiel (bleiben in alten Daten erhalten). */
export const INACTIVE_GAMES = [
  { name: 'CODEBREAK', note: 'Rätsel mit Hinweisen – nicht mehr in neuen Paketen auswählbar.' },
  { name: 'Klassischer Modus (Kategorienwand)', note: 'Läuft technisch, ist aber nicht der Showablauf. Für den Spieleabend nicht empfohlen.' },
];
