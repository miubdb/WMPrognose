// Showpaket „Reus 65 Mio“ (Version 2, nach Praxistest 2): gleiche Fragen wie show-2, aber
//  • Proberunden ohne „So funktioniert’s“-Nachtext (die Regelkarte erklärt vorab), Flagge-Probe mit vollständiger Antwortliste,
//  • BLIND RANK standardmäßig „alle Begriffe sehen und sortieren“ (je 50 Punkte pro richtiger Position),
//  • SETZ AUF MICH: Einsätze 0/50/100 + 150 Punkte Bonus für die beste Schätzung,
//  • persönliche Kickbase-Note (Titelzeile, „Marktwert-Update“ als Zwischenstand, Siegerzeile).
// Ältere Installationen behalten „show-2“ unverändert; show-3 wird nur ergänzt (Admin → Daten → Installieren).
import type { ShowStep } from '../shared/types';
import { COLORS as C, RB, type PoolQuestion } from './show';
import type { SeedShow } from '../server/content';
import { POOL2, SHOW2_ROUNDS } from './show2';

export const SHOW3_PACK = {
  id: 'show-3',
  name: 'Reus 65 Mio',
  description: 'Der feste Showablauf mit Proberunden, Sortier-Variante bei BLIND RANK und fairerer SETZ-AUF-MICH-Wertung. Sieger: Reus65Mio-Champion.',
  rules: {
    showTitle: 'Reus 65 Mio', winnerTitle: 'Reus65Mio-Champion', tasksPerMode: 4, rankVariant: 'sort' as const, estimateBets: [0, 50, 100], estimateBonus: 150,
    tagline: 'Dein persönlicher Kickbase-Abend', winnerLine: 'Marktwert: unbezahlbar – die 65 Mio. sind verdient', boardTitle: 'Marktwert-Update',
  },
};

const FACTUAL: Record<string, string> = {
  geo: 'Die Allianz Arena steht im Münchner Norden (Fröttmaning).',
  match: 'Hund bellt, Katze miaut, Kuh muht, Schaf mäht, Frosch quakt, Hahn kräht.',
  rank: 'Merkur (58 Mio. km), Venus (108), Erde (150), Mars (228), Jupiter (778 Mio. km).',
  estimate: 'Deutschland hat 16 Bundesländer.',
  glitch: 'Es fehlte ein Spieler, und der Ball lag an einer anderen Stelle.',
  unique: 'Schwarz, Rot, Gold – nur diese drei sind gültig. „Blau“ gehört nicht zur Flagge.',
  link: 'Gesucht war der Mond.',
};
const probes: PoolQuestion[] = POOL2.filter(q => q.id.startsWith('s4-probe-')).map(q => {
  const t: any = JSON.parse(JSON.stringify(q.task)); t.explain = FACTUAL[t.mode];
  if (t.mode === 'unique') { t.closed = true; t.valid = [{ name: 'Schwarz', variants: [] }, { name: 'Rot', variants: [] }, { name: 'Gold', variants: ['Gelb'] }]; }
  return { id: q.id.replace('s4-probe-', 's5-probe-'), topic: q.topic, task: t };
});
export const POOL3: PoolQuestion[] = probes;

const rename = (id: string) => id.replace('s4-probe-', 's5-probe-');
const BLURB: Record<string, string> = {
  's4-sur': 'Nenne eine gültige Antwort – aber bloß keine, die auch ein anderer nennt! Nur einzigartige Antworten bringen Punkte, doppelte zählen 0.',
  's4-r3': 'Alle fünf Begriffe sind sichtbar. Bringe sie auf dem Handy in die richtige Reihenfolge – je Begriff auf der exakt richtigen Position gibt es 50 Punkte.',
  's4-r5': 'Erst schätzt jeder geheim eine Zahl. Dann setzt du 0, 50 oder 100 Punkte auf die Schätzung, der du vertraust – die beste Schätzung bringt zusätzlich 150 Bonuspunkte.',
  's4-r1': 'Setze deinen Pin auf der Karte – du kannst zoomen und ihn verschieben. Je näher dein Pin, desto mehr Punkte.',
};
export const SHOW3_ROUNDS: SeedShow['rounds'] = SHOW2_ROUNDS.map(r => ({ ...r, id: r.id.replace('s4-', 's5-'), blurb: BLURB[r.id] ?? r.blurb, taskIds: r.taskIds.map(rename) }));
const SPECIAL = { rank: 's5-r3', est: 's5-r5' };
void SPECIAL; void C; void RB;

export const SHOW3_STEPS: ShowStep[] = [
  { k: 'round', cat: 's5-r1' }, { k: 'board' }, { k: 'round', cat: 's5-r2' }, { k: 'round', cat: 's5-r3' }, { k: 'board' },
  { k: 'surprise', cat: 's5-sur' },
  { k: 'round', cat: 's5-r4' }, { k: 'round', cat: 's5-r5' }, { k: 'round', cat: 's5-r6' }, { k: 'board' },
  { k: 'final', cat: 's3-final' },
];

export const SEED_SHOW3: SeedShow = { pack: SHOW3_PACK, pool: POOL3, rounds: SHOW3_ROUNDS, steps: SHOW3_STEPS };

// ---------------------------------------------------------------- Variante mit Abschlussmodus KICKBASE-KONSENS (statt FINAL LOCK)
// Eigenes Paket (id „show-2k“), damit das bewährte FINAL LOCK (show-3) der Standard und Fallback bleibt. Wird erst nach Test bewusst gewählt.
const vote = (id: string, prompt: string, explain: string): PoolQuestion => ({ id, topic: 'Gruppenfrage', task: { mode: 'vote', prompt, seconds: 45, points: 600, explain } });
export const POOL4: PoolQuestion[] = [
  vote('s5-kk-1', 'Wer von uns würde 65 Millionen für Marco Reus ausgeben?', 'Der Konsens zeigt, wem die Gruppe die größte Kaufwut zutraut.'),
  vote('s5-kk-2', 'Wer von uns würde im Kickbase-Spiel zuerst sein ganzes Budget auf einen einzigen Spieler setzen?', 'Mut zum Risiko – oder einfach Übermut?'),
  vote('s5-kk-3', 'Wer von uns würde einen Spieler nur deshalb kaufen, weil ihm der Name gefällt?', 'Fachwissen ist nicht nötig – nur Menschenkenntnis.'),
];
export const SHOW4_ROUNDS: SeedShow['rounds'] = [
  { id: 's5-final-kk', title: 'KICKBASE-KONSENS', topic: 'Das große Finale', icon: '🤝', color: C.GR, kind: 'final', football: false,
    blurb: 'Drei Gruppenfragen, 1.800 Punkte, die Rangliste bleibt verborgen. Wähle geheim einen Mitspieler – Punkte gibt es für die Wahl mit den meisten Stimmen.',
    taskIds: ['s5-kk-1', 's5-kk-2', 's5-kk-3'] },
];
export const SHOW4_STEPS: ShowStep[] = SHOW3_STEPS.map(s => (s.k === 'final' ? { k: 'final' as const, cat: 's5-final-kk' } : s));
export const SEED_SHOW4: SeedShow = {
  pack: { id: 'show-2k', name: 'Reus 65 Mio · Finale KICKBASE-KONSENS', description: 'Wie „Reus 65 Mio“, aber mit dem Gruppenspiel KICKBASE-KONSENS als Finale (statt FINAL LOCK). Optional – FINAL LOCK bleibt der bewährte Standard.', rules: SHOW3_PACK.rules },
  pool: POOL4, rounds: SHOW4_ROUNDS, steps: SHOW4_STEPS,
};
