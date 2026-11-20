/** Die Spiele (Modi), die in JANIQUIZITION heute wirklich funktionieren – eine Quelle für Admin-Startseite und Doku (docs/SPIELE.md). */
export interface GameInfo { mode: string; name: string; icon: string; kind: 'Spiel' | 'Finale'; short: string; points: string; time: string; /** Welche Fragen/Aufgaben man dafür anlegt (Admin-Kurzinfo) */ ask?: string }

export const GAMES: GameInfo[] = [
  { mode: 'geo', ask: 'Ein Ort auf der Karte (Koordinaten + Ortsname).', name: 'WO ZUR HÖLLE?', icon: '🧭', kind: 'Spiel', short: 'Pin auf der Karte setzen – je näher, desto mehr Punkte.', points: 'bis 250', time: '60 s' },
  { mode: 'match', ask: 'Sechs Paare, die zusammengehören (z. B. Star ↔ Verein).', name: 'MATCHMAKER', icon: '🧲', kind: 'Spiel', short: 'Sechs Paare verbinden.', points: '50 je Paar (max. 300)', time: '60 s' },
  { mode: 'rank', ask: 'Fünf Begriffe mit Wert, die in die richtige Reihenfolge gehören.', name: 'SORTIER’S!', icon: '↕️', kind: 'Spiel', short: 'Fünf Karten in die richtige Reihenfolge bringen.', points: '50 je richtigem Platz', time: '60 s' },
  { mode: 'unique', ask: 'Eine offene Frage mit mehreren richtigen Antworten – die seltenste gewinnt.', name: 'EINZIGARTIG', icon: '✨', kind: 'Spiel', short: 'Eine gültige Antwort nennen, die kein anderer nennt. Der Showmaster kann jede Antwort korrigieren.', points: '300 (doppelt = 0)', time: '45 s' },
  { mode: 'glitch', ask: 'Ein Bild (Szene), in dem sich etwas ändert.', name: 'GLITCH', icon: '👁️', kind: 'Spiel', short: 'Bild merken, dann die veränderte Stelle antippen.', points: 'bis 250', time: '~30 s' },
  { mode: 'estimate', ask: 'Eine Frage mit einer Zahl als Lösung.', name: 'SETZ AUF MICH', icon: '🎯', kind: 'Spiel', short: 'Zahl schätzen, dann bis zu 50 % der eigenen Punkte auf einen Tipp setzen.', points: 'Rang + Einsatz', time: '~90 s' },
  { mode: 'link', ask: 'Vier Hinweise von schwer nach leicht zu einer gemeinsamen Lösung.', name: 'DIE VERBINDUNG', icon: '🔗', kind: 'Spiel', short: 'Vier Hinweise, je früher richtig, desto mehr Punkte.', points: '300 / 225 / 150 / 75', time: '4 × 20 s' },
  { mode: 'bluff', ask: 'Eine Frage mit kurzer, überraschender Antwort, die man nicht erraten kann.', name: 'LÜGEN HABEN KURZE BEINE', icon: '😈', kind: 'Spiel', short: 'Falsche Antworten erfinden, dann die echte finden. Punkte fürs Erkennen und fürs Täuschen.', points: '200 + 100 je Hereingefallenem', time: '45 s + 30 s' },
  { mode: 'corridor', ask: 'Eine Zahlenfrage, bei der man einen Bereich eingrenzen kann.', name: 'SCHÄTZKORRIDOR', icon: '↔️', kind: 'Spiel', short: 'Einen Zahlenbereich angeben – je enger er die Lösung trifft, desto mehr Punkte.', points: 'bis 300 (daneben 0)', time: '45 s' },
  { mode: 'twist', ask: 'Ein bekannter Titel, ins Gegenteil verdreht.', name: 'VERDREHTE WELT', icon: '🔄', kind: 'Spiel', short: 'Ein ins Gegenteil verdrehter Filmtitel – das Original eintippen, je schneller desto mehr Punkte.', points: '150–300', time: '40 s' },
  { mode: 'pixel', ask: 'Ein Motiv, das man erkennen kann (Bild hochladen – die Stufen entstehen automatisch).', name: 'PIXELPANIK', icon: '🟪', kind: 'Spiel', short: 'Ein Bild wird Stufe für Stufe schärfer – je früher erkannt, desto mehr Punkte.', points: '300 / 240 / 180 / 120 / 60', time: '5 × 6 s' },
  { mode: 'duel', ask: 'Drei Multiple-Choice-Fragen auf einem Thema.', name: 'DUELL DER DEPPEN', icon: '⚔️', kind: 'Spiel', short: 'Zwei Spieler duellieren sich in drei Fragen, die anderen tippen auf den Sieger.', points: 'Sieg 250 · Tipp 100 · Remis 75', time: '~2 min' },
  { mode: 'arena', ask: 'Drei Multiple-Choice-Fragen, die immer schwerer werden.', name: 'DIE ARENA', icon: '🏟️', kind: 'Spiel', short: 'Drei Fragen, alle gleichzeitig – wer falsch liegt, scheidet aus.', points: '3 × 50 + 150 Bonus', time: '3 × 20 s' },
  { mode: 'sound', ask: 'Ein erkennbares Geräusch als Audiodatei (lizenzfrei!).', name: 'TONSPUR', icon: '🎧', kind: 'Spiel', short: 'Ein Geräusch erkennen – erstes Hören, zweites Hören, dann Hinweis.', points: '300 / 200 / 100', time: '3 × 15 s' },
  { mode: 'timeline', ask: 'Ein Ereignis mit Jahr plus vier Ankerereignisse als Orientierung.', name: 'ZEITSPRUNG', icon: '⏳', kind: 'Spiel', short: 'Ein Ereignis zwischen vier feste Ankerereignisse einer Zeitleiste einordnen.', points: '250 (Nachbarfeld 100)', time: '40 s' },
  { mode: 'panic', ask: 'Ein dreistelliger Code und Hinweise, die nur zusammen die Lösung ergeben.', name: 'PANIK', icon: '🚨', kind: 'Spiel', short: 'Teamspiel: Hinweise sind verteilt, der Entschärfer gibt den Code ein.', points: '200 für alle (+50 schnell)', time: '90 s' },
  { mode: 'impostor', ask: 'Ein Thema und ein geheimes Wort dazu.', name: 'HOCHSTAPLER', icon: '🕵️', kind: 'Spiel', short: 'Alle kennen das Wort bis auf einen: Hinweise geben, Hochstapler enttarnen.', points: '300 · erkannt 100', time: '40 s + 45 s' },
  { mode: 'vote', ask: 'Eine Gruppenfrage „Wer von uns …?“.', name: 'KICKBASE-KONSENS', icon: '🤝', kind: 'Finale', short: 'Geheim eine Person wählen (auch sich selbst oder Michael). Die meistgewählte Person bringt 100 Punkte.', points: '5 × 100 (max. 500)', time: '5 × 45 s' },
  { mode: 'final-lock', ask: 'Vier Abschlussaufgaben (Karte, Verbindung, Sortieren, Schätzen).', name: 'FINAL LOCK', icon: '🔒', kind: 'Finale', short: 'Vier Abschlussaufgaben (Karte, Verbindung, Sortieren, Schätzen) – Rangliste verborgen.', points: 'bis 1.450', time: '~8 min' },
];
/** Noch nicht gebaut (Ideen) – siehe docs/SPIELE.md. */
export const PLANNED_GAMES: { name: string; note: string }[] = [];
/** Nicht mehr im Spiel (bleiben in alten Daten erhalten). */
export const INACTIVE_GAMES = [
  { name: 'CODEBREAK', note: 'Rätsel mit Hinweisen – nicht mehr in neuen Paketen auswählbar.' },
  { name: 'Klassischer Modus (Kategorienwand)', note: 'Läuft technisch, ist aber nicht der Showablauf. Für den Spieleabend nicht empfohlen.' },
];
