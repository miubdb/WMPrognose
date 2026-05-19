/**
 * FIFA WM 2026 - Prognosemodell
 * Einstiegspunkt: Demo-Berechnungen mit Konsolenausgabe
 *
 * Wissenschaftliche Grundlage:
 * - Maher (1982): Poisson-Modell
 * - Dixon & Coles (1997): Low-Score-Korrektur
 * - Hvattum & Arntzen (2010): ELO-Ratings
 * - Peeters (2018): Marktwerte
 * - McSharry (2007): Höheneffekte
 * - Mohr et al. (2012): Hitze/WBGT
 * - Pollard (1986): Heimvorteil
 * - Csató & Petróczy (2026): Elfmeterschießen
 * - Constantinou & Fenton (2012): RPS-Evaluation
 */

import { TEAMS } from './data/teams';
import { VENUES } from './data/venues';
import { EXAMPLE_MATCHES } from './data/matches';
import { predictMatch, predictKnockoutMatch } from './model/predictMatch';
import { evaluatePrediction } from './model/evaluation';

// ─── Konsolenformatierung ─────────────────────────────────────────────────────

const SEPARATOR = '═'.repeat(70);
const LINE = '─'.repeat(70);

function pct(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

function fmt(value: number, decimals = 3): string {
  return value.toFixed(decimals);
}

function header(text: string): void {
  console.log('\n' + SEPARATOR);
  console.log(`  ${text}`);
  console.log(SEPARATOR);
}

function section(text: string): void {
  console.log('\n' + LINE);
  console.log(`  ${text}`);
  console.log(LINE);
}

/**
 * Gibt eine vollständige Match-Prognose lesbar aus.
 */
function printMatchPrediction(
  teamAId: string,
  teamBId: string,
  venueId: string,
  matchContextId: keyof typeof EXAMPLE_MATCHES
): void {
  const teamA = TEAMS[teamAId];
  const teamB = TEAMS[teamBId];
  const venue = VENUES[venueId];
  const matchCtx = EXAMPLE_MATCHES[matchContextId];

  if (!teamA || !teamB || !venue || !matchCtx) {
    console.error('Unbekanntes Team, Venue oder Match-Kontext');
    return;
  }

  header(`${teamA.name.toUpperCase()} vs. ${teamB.name.toUpperCase()}`);
  console.log(`  Spielort:   ${venue.city} | ${venue.stadium}`);
  console.log(`  Runde:      ${matchCtx.round.toUpperCase()}`);
  console.log(`  Höhe:       ${venue.altitudeMeters}m ü.M.`);
  console.log(`  WBGT:       ${venue.estimatedWBGT}°C`);

  const result = predictMatch(teamA, teamB, venue, matchCtx);

  section('PROGNOSE');
  console.log(`\n  Expected Goals:`);
  console.log(`    ${teamA.name.padEnd(16)} ${fmt(result.expectedGoalsTeamA, 2)} xG`);
  console.log(`    ${teamB.name.padEnd(16)} ${fmt(result.expectedGoalsTeamB, 2)} xG`);

  console.log(`\n  Wahrscheinlichkeiten (1X2):`);
  const barWidth = 30;
  const barA = Math.round(result.winProbabilityTeamA * barWidth);
  const barD = Math.round(result.drawProbability * barWidth);
  const barB = barWidth - barA - barD;

  console.log(`    ${teamA.name.padEnd(16)} ${pct(result.winProbabilityTeamA).padStart(6)}  ${'█'.repeat(Math.max(0,barA))}${'░'.repeat(Math.max(0,barD))}${'▒'.repeat(Math.max(0,barB))}`);
  console.log(`    ${'Remis'.padEnd(16)} ${pct(result.drawProbability).padStart(6)}`);
  console.log(`    ${teamB.name.padEnd(16)} ${pct(result.winProbabilityTeamB).padStart(6)}`);

  section('TOP 5 SCORELINES');
  result.top5Scorelines.forEach((s, i) => {
    const label = `${s.goalsA}:${s.goalsB}`;
    const bar = '█'.repeat(Math.round(s.probability * 100));
    console.log(`  ${(i + 1)}. ${label.padEnd(6)} ${pct(s.probability).padStart(6)}  ${bar}`);
  });

  section('KONTEXT-MODIFIER');
  const ctx = result.contextBreakdown as Record<string, unknown>;
  console.log(`  Venue:      ${ctx['venue']}`);
  console.log(`  Höhe:       ${ctx['altitude']}`);
  console.log(`  Hitze:      ${ctx['heat']}`);
  console.log(`  Heimvorteil: ${ctx['homeAdvantage']}`);
  console.log(`\n  ${teamA.name} Kontext-Modifier gesamt: ×${fmt(ctx['teamAContextModifier'] as number)}`);
  const mA = ctx['teamAModifiers'] as Record<string, number>;
  console.log(`    Altitude: ×${fmt(mA['altitude'])} | Hitze: ×${fmt(mA['heat'])} | Reise: ×${fmt(mA['travel'])} | Rest: ×${fmt(mA['rest'])} | Heim: ×${fmt(mA['home'])}`);
  console.log(`\n  ${teamB.name} Kontext-Modifier gesamt: ×${fmt(ctx['teamBContextModifier'] as number)}`);
  const mB = ctx['teamBModifiers'] as Record<string, number>;
  console.log(`    Altitude: ×${fmt(mB['altitude'])} | Hitze: ×${fmt(mB['heat'])} | Reise: ×${fmt(mB['travel'])} | Rest: ×${fmt(mB['rest'])} | Heim: ×${fmt(mB['home'])}`);

  section('RATING-AUFSCHLÜSSELUNG');
  const rA = result.ratingBreakdown.teamA as Record<string, number>;
  const rB = result.ratingBreakdown.teamB as Record<string, number>;
  console.log(`  ${'Faktor'.padEnd(22)} ${teamA.name.padEnd(16)} ${teamB.name}`);
  console.log(`  ${'-'.repeat(55)}`);

  const rows: [string, string, string][] = [
    ['ELO', String(TEAMS[teamAId].eloRating), String(TEAMS[teamBId].eloRating)],
    ['ELO-Modifier', `×${fmt(rA['eloModifier'])}`, `×${fmt(rB['eloModifier'])}`],
    ['Angriffsstärke', `×${fmt(rA['attack'])}`, `×${fmt(rB['attack'])}`],
    ['Abwehrstärke', `×${fmt(rA['defense'])}`, `×${fmt(rB['defense'])}`],
    ['Mittelfeld', `×${fmt(rA['midfield'])}`, `×${fmt(rB['midfield'])}`],
    ['Squad-Wert', `×${fmt(rA['squadValue'])}`, `×${fmt(rB['squadValue'])}`],
    ['Set-Pieces', `×${fmt(rA['setPiece'])}`, `×${fmt(rB['setPiece'])}`],
    ['Coach', `×${fmt(rA['coachModifier'])}`, `×${fmt(rB['coachModifier'])}`],
    ['xG-Form', `×${fmt(rA['xgFormModifier'])}`, `×${fmt(rB['xgFormModifier'])}`],
    ['Peak-Age', `×${fmt(rA['peakAge'])}`, `×${fmt(rB['peakAge'])}`],
    ['→ Expected Goals', `${fmt(rA['expectedGoals'], 2)} xG`, `${fmt(rB['expectedGoals'], 2)} xG`],
  ];

  for (const [label, valA, valB] of rows) {
    console.log(`  ${label.padEnd(22)} ${valA.padEnd(16)} ${valB}`);
  }

  if (result.modelNotes.length > 0) {
    section('MODELL-NOTIZEN');
    result.modelNotes.forEach(n => console.log(`  • ${n}`));
  }
}

/**
 * Gibt eine K.-o.-Prognose lesbar aus.
 */
function printKnockoutPrediction(
  teamAId: string,
  teamBId: string,
  venueId: string,
  matchContextId: keyof typeof EXAMPLE_MATCHES
): void {
  const teamA = TEAMS[teamAId];
  const teamB = TEAMS[teamBId];
  const venue = VENUES[venueId];
  const matchCtx = EXAMPLE_MATCHES[matchContextId];

  if (!teamA || !teamB || !venue || !matchCtx) {
    console.error('Unbekanntes Team, Venue oder Match-Kontext');
    return;
  }

  header(`K.-O. | ${teamA.name.toUpperCase()} vs. ${teamB.name.toUpperCase()} | ${matchCtx.round.toUpperCase()}`);
  console.log(`  Spielort: ${venue.city} | ${venue.stadium}`);

  const result = predictKnockoutMatch(teamA, teamB, venue, matchCtx);
  const ko = result.knockout;

  section('WEITERKOMMEN-WAHRSCHEINLICHKEITEN');
  console.log(`\n  ${teamA.name.padEnd(20)} ${'█'.repeat(Math.round(ko.probabilityTeamAAdvances * 40))} ${pct(ko.probabilityTeamAAdvances)}`);
  console.log(`  ${teamB.name.padEnd(20)} ${'█'.repeat(Math.round(ko.probabilityTeamBAdvances * 40))} ${pct(ko.probabilityTeamBAdvances)}`);

  section('PHASEN-AUFSCHLÜSSELUNG');
  console.log(`\n  Sieg nach 90 Minuten:`);
  console.log(`    ${teamA.name.padEnd(16)} ${pct(ko.probabilityTeamAWinsIn90)}`);
  console.log(`    ${teamB.name.padEnd(16)} ${pct(ko.probabilityTeamBWinsIn90)}`);
  console.log(`\n  Verlängerung:           ${pct(ko.probabilityExtraTime)}`);
  console.log(`    ${teamA.name.padEnd(16)} ${pct(ko.probabilityTeamAWinsInET)} in Verlängerung`);
  console.log(`    ${teamB.name.padEnd(16)} ${pct(ko.probabilityTeamBWinsInET)} in Verlängerung`);
  console.log(`\n  Elfmeterschießen:       ${pct(ko.probabilityPenaltyShootout)}`);
  console.log(`    ${teamA.name.padEnd(16)} ${pct(ko.probabilityTeamAWinsOnPenalties)} auf Elfmeter`);
  console.log(`    ${teamB.name.padEnd(16)} ${pct(ko.probabilityTeamBWinsOnPenalties)} auf Elfmeter`);

  section('ELFMETER-ANALYSE');
  const pen = result.penalty;
  console.log(`  Basis (Münzwurf):        50.0% / 50.0%`);
  console.log(`  Torwart-Edge:            ${pen.breakdown.goalkeeperEdge > 0 ? '+' : ''}${(pen.breakdown.goalkeeperEdge * 100).toFixed(2)}% für ${teamA.name}`);
  console.log(`  Schützen-Qualität:       ${pen.breakdown.takerQualityEdge > 0 ? '+' : ''}${(pen.breakdown.takerQualityEdge * 100).toFixed(2)}% für ${teamA.name}`);
  console.log(`  Erfahrungs-Edge:         ${pen.breakdown.experienceEdge > 0 ? '+' : ''}${(pen.breakdown.experienceEdge * 100).toFixed(2)}% für ${teamA.name}`);
  console.log(`  → Elfmeter gesamt:       ${pct(pen.probabilityTeamAWins)} (${teamA.name}) / ${pct(pen.probabilityTeamBWins)} (${teamB.name})`);

  section('MODELL-NOTIZEN');
  result.modelNotes.forEach(n => console.log(`  • ${n}`));
}

/**
 * Demo: Evaluation einer hypothetischen Prognose
 */
function printEvaluationDemo(): void {
  header('EVALUATIONS-DEMO (RPS nach Constantinou & Fenton 2012)');

  console.log('\n  Hypothetisches Szenario: Argentinien vs. Deutschland');
  console.log('  Prognose: 65% Argentinien | 15% Remis | 20% Deutschland');
  console.log('  Ergebnis: Argentinien gewinnt\n');

  const prediction = {
    winProbabilityA: 0.65,
    drawProbability: 0.15,
    winProbabilityB: 0.20,
  };

  const evalResult = evaluatePrediction(prediction, 'A');
  console.log(`  RPS (Ranked Probability Score): ${fmt(evalResult.rps, 4)}`);
  console.log(`  Brier Score:                   ${fmt(evalResult.brierScore, 4)}`);
  console.log(`  Prognose korrekt:               ${evalResult.wasCorrect ? 'JA ✓' : 'NEIN ✗'}`);
  evalResult.notes.forEach(n => console.log(`  • ${n}`));

  console.log('\n  Szenario 2: Gleiche Prognose, aber Deutschland gewinnt');
  const evalResult2 = evaluatePrediction(prediction, 'B');
  console.log(`  RPS:         ${fmt(evalResult2.rps, 4)}`);
  console.log(`  Brier Score: ${fmt(evalResult2.brierScore, 4)}`);
  console.log(`  Korrekt:     ${evalResult2.wasCorrect ? 'JA ✓' : 'NEIN ✗'}`);
}

// ─── HAUPT-DEMO ───────────────────────────────────────────────────────────────

console.log('\n');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + '  FIFA WM 2026 PROGNOSEMODELL  v1.0'.padStart(51).padEnd(68) + '║');
console.log('║' + '  Wissenschaftlich fundiertes hybrides Fußball-Prediction-Modell'.padEnd(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');

// ── DEMO 1: Deutschland vs Frankreich in Mexico City ─────────────────────────
printMatchPrediction('germany', 'france', 'mexico_city', 'germany_france_mexico_city');

// ── DEMO 2: Argentinien vs USA in Miami ──────────────────────────────────────
printMatchPrediction('argentina', 'usa', 'miami', 'argentina_usa_miami');

// ── DEMO 3: Marokko vs Mexiko in Guadalajara ─────────────────────────────────
printMatchPrediction('morocco', 'mexico', 'guadalajara', 'morocco_mexico_guadalajara');

// ── DEMO 4: K.-o. Spanien vs England in New York ──────────────────────────────
printKnockoutPrediction('spain', 'england', 'new_york', 'spain_england_knockout');

// ── DEMO 5: RPS Evaluation ────────────────────────────────────────────────────
printEvaluationDemo();

console.log('\n' + '═'.repeat(70));
console.log('  Modell-Info:');
console.log('  - Alle Gewichte in: src/config/modelConfig.ts');
console.log('  - Team-Daten in:    src/data/teams.ts  (DUMMY-Daten!)');
console.log('  - Venue-Daten in:   src/data/venues.ts (DUMMY-Daten!)');
console.log('  - Modell starten:   npm run dev');
console.log('═'.repeat(70) + '\n');
