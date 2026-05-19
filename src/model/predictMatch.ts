/**
 * Hauptfunktion: predictMatch und predictKnockoutMatch
 *
 * Orchestriert alle Modell-Komponenten zu einer vollständigen Spielprognose.
 *
 * Expected-Goals-Formel:
 *   xG_A = base × attackStrength_A × defenseWeakness_B × squadAttack_A
 *          × xGForm_A × setPiece_A × contextModifier_A × coachModifier_A
 *          × eloModifier × squadValue_A
 *
 * Maher (1982): attack/defense-Stärken
 * FiveThirtyEight SPI: Trennung der Stärken
 */

import { TeamData } from '../data/teams';
import { VenueData } from '../data/venues';
import { MatchContext } from '../data/matches';
import { MODEL_CONFIG } from '../config/modelConfig';

import { computeTeamRatings, formatRatingBreakdown } from './ratings';
import { computeSquadSignals } from './squadSignals';
import { computeCoachSignals } from './coachExperience';
import { computeContextModifiers } from './contextModifiers';
import { computeScorelineMatrix } from './poisson';
import { applyDixonColesCorrection, aggregateOutcomeProbabilities } from './dixonColes';
import { computePenaltyShootout } from './penalties';
import { computeKnockoutResult } from './knockout';
import { clamp } from '../utils/math';
import { ScorelineProbability } from './poisson';
import { KnockoutResult } from './knockout';
import { PenaltyShootoutResult } from './penalties';

export interface MatchPredictionResult {
  // Kernergebnisse
  expectedGoalsTeamA: number;
  expectedGoalsTeamB: number;
  winProbabilityTeamA: number;
  drawProbability: number;
  winProbabilityTeamB: number;

  // Top-5-Scorelines
  top5Scorelines: ScorelineProbability[];

  // Aufschlüsselungen
  contextBreakdown: Record<string, unknown>;
  ratingBreakdown: {
    teamA: Record<string, number | string>;
    teamB: Record<string, number | string>;
  };

  // Modell-Notizen
  modelNotes: string[];
}

export interface KnockoutPredictionResult extends MatchPredictionResult {
  knockout: KnockoutResult;
  penalty: PenaltyShootoutResult;
}

/**
 * Berechnet die Expected Goals für ein Team basierend auf allen Modell-Komponenten.
 *
 * Formel:
 *   xG = base
 *       × attackStrength           (eigene Angriffsstärke, Maher 1982)
 *       × (2 - defenseStrength_B)  (gegnerische Defensivschwäche)
 *       × midfieldStrength         (Mittelfeld-Einfluss, FiveThirtyEight SPI)
 *       × squadAttackModifier      (Squad-Signale, Peeters 2018)
 *       × setPieceModifier         (Standard-Gefahr, StatsBomb 2018)
 *       × eloModifier              (ELO-Rating, Hvattum & Arntzen 2010)
 *       × squadValueModifier       (Marktwert, Peeters 2018)
 *       × contextModifier          (Altitude, Hitze, Reise, Pollard 1986)
 *       × coachModifier            (Trainer-Qualität, Bridgewater 2010)
 */
function computeExpectedGoals(
  attackStrength: number,
  opposingDefenseStrength: number,
  midfieldStrength: number,
  squadAttackModifier: number,
  setPieceModifier: number,
  eloModifier: number,
  squadValueModifier: number,
  contextModifier: number,
  coachModifier: number
): number {
  const base = MODEL_CONFIG.poisson.baseExpectedGoals;

  // defenseWeakness: Je stärker die Defensive des Gegners, desto weniger xG
  // opposingDefenseStrength > 1 = starke Defensive → weniger Tore
  // Umkehren: 1 / opposingDefenseStrength → je stärker, desto kleiner
  const defenseWeakness = 1 / opposingDefenseStrength;

  const xg = base
    * attackStrength
    * defenseWeakness
    * midfieldStrength        // Mittelfeld beeinflusst Spielkontrolle
    * squadAttackModifier     // xG-Form, Peak-Age, Set-Piece
    * setPieceModifier        // separater Standard-Bonus
    * eloModifier             // ELO-basiertes Stärkeverhältnis
    * squadValueModifier      // Marktwert-Signal
    * contextModifier         // Altitude, Hitze, Reise, Heimvorteil
    * coachModifier;          // Trainer-Qualität

  return clamp(xg, MODEL_CONFIG.limits.minExpectedGoals, MODEL_CONFIG.limits.maxExpectedGoals);
}

/**
 * predictMatch: Hauptprognose-Funktion für ein Spiel.
 */
export function predictMatch(
  teamA: TeamData,
  teamB: TeamData,
  venue: VenueData,
  matchCtx: MatchContext
): MatchPredictionResult {
  const modelNotes: string[] = [];

  // ─── Ratings berechnen ────────────────────────────────────────────────────────
  const ratingsA = computeTeamRatings(teamA);
  const ratingsB = computeTeamRatings(teamB);

  // ─── Squad-Signale berechnen ──────────────────────────────────────────────────
  const squadA = computeSquadSignals(teamA);
  const squadB = computeSquadSignals(teamB);

  // ─── Coach-Signale berechnen ──────────────────────────────────────────────────
  const coachA = computeCoachSignals(teamA);
  const coachB = computeCoachSignals(teamB);

  // ─── Kontext-Modifier berechnen ───────────────────────────────────────────────
  const context = computeContextModifiers(teamA, teamB, venue, matchCtx);

  // ─── Expected Goals berechnen ─────────────────────────────────────────────────
  const xgA = computeExpectedGoals(
    ratingsA.attackStrength,
    ratingsB.defenseStrength,    // Gegnerische Defensive schwächt Angriff A
    ratingsA.midfieldStrength,
    squadA.squadAttackModifier,
    ratingsA.setPieceModifier,
    ratingsA.eloModifier,
    ratingsA.squadValueModifier,
    context.teamAModifiers.totalContextModifier,
    coachA.totalCoachModifier
  );

  const xgB = computeExpectedGoals(
    ratingsB.attackStrength,
    ratingsA.defenseStrength,    // Gegnerische Defensive schwächt Angriff B
    ratingsB.midfieldStrength,
    squadB.squadAttackModifier,
    ratingsB.setPieceModifier,
    ratingsB.eloModifier,
    ratingsB.squadValueModifier,
    context.teamBModifiers.totalContextModifier,
    coachB.totalCoachModifier
  );

  // ─── Poisson-Scoreline-Matrix mit Dixon-Coles-Korrektur ───────────────────────
  const rawMatrix = computeScorelineMatrix(xgA, xgB);
  const correctedMatrix = applyDixonColesCorrection(rawMatrix, xgA, xgB);
  const { winA, draw, winB } = aggregateOutcomeProbabilities(correctedMatrix);

  // Top-5-Scorelines aus korrigierter Matrix
  const allScorelines: ScorelineProbability[] = [];
  for (let a = 0; a < correctedMatrix.length; a++) {
    for (let b = 0; b < correctedMatrix[a].length; b++) {
      allScorelines.push(correctedMatrix[a][b]);
    }
  }
  const top5 = allScorelines
    .sort((x, y) => y.probability - x.probability)
    .slice(0, 5);

  // ─── Notizen sammeln ──────────────────────────────────────────────────────────
  modelNotes.push(...squadA.notes.map(n => `[${teamA.name}] ${n}`));
  modelNotes.push(...squadB.notes.map(n => `[${teamB.name}] ${n}`));
  modelNotes.push(...coachA.notes.map(n => `[${teamA.name}] ${n}`));
  modelNotes.push(...coachB.notes.map(n => `[${teamB.name}] ${n}`));
  modelNotes.push(...context.contextBreakdown.notes);

  // ─── Aufschlüsselungen ────────────────────────────────────────────────────────
  const contextBreakdown = {
    venue: context.contextBreakdown.venueDescription,
    altitude: context.contextBreakdown.altitudeEffect,
    heat: context.contextBreakdown.heatEffect,
    teamATravel: context.contextBreakdown.teamATravel,
    teamBTravel: context.contextBreakdown.teamBTravel,
    homeAdvantage: context.contextBreakdown.homeAdvantage,
    teamAContextModifier: context.teamAModifiers.totalContextModifier,
    teamBContextModifier: context.teamBModifiers.totalContextModifier,
    teamAModifiers: {
      altitude: context.teamAModifiers.altitudeModifier,
      heat: context.teamAModifiers.heatModifier,
      travel: context.teamAModifiers.travelFatigueModifier,
      rest: context.teamAModifiers.restDaysModifier,
      home: context.teamAModifiers.homeAdvantageModifier,
    },
    teamBModifiers: {
      altitude: context.teamBModifiers.altitudeModifier,
      heat: context.teamBModifiers.heatModifier,
      travel: context.teamBModifiers.travelFatigueModifier,
      rest: context.teamBModifiers.restDaysModifier,
      home: context.teamBModifiers.homeAdvantageModifier,
    },
  };

  const ratingBreakdown = {
    teamA: {
      elo: teamA.eloRating,
      eloModifier: ratingsA.eloModifier,
      attack: ratingsA.attackStrength,
      defense: ratingsA.defenseStrength,
      midfield: ratingsA.midfieldStrength,
      squadValue: ratingsA.squadValueModifier,
      setPiece: ratingsA.setPieceModifier,
      coachModifier: coachA.totalCoachModifier,
      squadAttack: squadA.squadAttackModifier,
      xgFormModifier: squadA.xgFormModifier,
      peakAge: squadA.peakAgeModifier,
      expectedGoals: xgA,
    } as Record<string, number | string>,
    teamB: {
      elo: teamB.eloRating,
      eloModifier: ratingsB.eloModifier,
      attack: ratingsB.attackStrength,
      defense: ratingsB.defenseStrength,
      midfield: ratingsB.midfieldStrength,
      squadValue: ratingsB.squadValueModifier,
      setPiece: ratingsB.setPieceModifier,
      coachModifier: coachB.totalCoachModifier,
      squadAttack: squadB.squadAttackModifier,
      xgFormModifier: squadB.xgFormModifier,
      peakAge: squadB.peakAgeModifier,
      expectedGoals: xgB,
    } as Record<string, number | string>,
  };

  return {
    expectedGoalsTeamA: xgA,
    expectedGoalsTeamB: xgB,
    winProbabilityTeamA: clamp(winA, MODEL_CONFIG.limits.minWinProbability, MODEL_CONFIG.limits.maxWinProbability),
    drawProbability: clamp(draw, MODEL_CONFIG.limits.minWinProbability, MODEL_CONFIG.limits.maxWinProbability),
    winProbabilityTeamB: clamp(winB, MODEL_CONFIG.limits.minWinProbability, MODEL_CONFIG.limits.maxWinProbability),
    top5Scorelines: top5,
    contextBreakdown,
    ratingBreakdown,
    modelNotes,
  };
}

/**
 * predictKnockoutMatch: K.-o.-Prognose mit Verlängerungs- und Elfmeter-Logik.
 */
export function predictKnockoutMatch(
  teamA: TeamData,
  teamB: TeamData,
  venue: VenueData,
  matchCtx: MatchContext
): KnockoutPredictionResult {
  // Basis-Prognose (90 Minuten)
  const baseResult = predictMatch(teamA, teamB, venue, { ...matchCtx, isKnockout: true });

  // Elfmeter-Wahrscheinlichkeiten
  const penaltyResult = computePenaltyShootout(teamA, teamB);

  // K.-o.-Logik
  const poissonForKnockout = {
    expectedGoalsA: baseResult.expectedGoalsTeamA,
    expectedGoalsB: baseResult.expectedGoalsTeamB,
    winProbabilityA: baseResult.winProbabilityTeamA,
    drawProbability: baseResult.drawProbability,
    winProbabilityB: baseResult.winProbabilityTeamB,
    scorelineMatrix: [],
    topScorelines: baseResult.top5Scorelines,
  };

  const knockoutResult = computeKnockoutResult(
    poissonForKnockout,
    penaltyResult,
    teamA.name,
    teamB.name
  );

  return {
    ...baseResult,
    knockout: knockoutResult,
    penalty: penaltyResult,
    modelNotes: [
      ...baseResult.modelNotes,
      ...knockoutResult.notes,
    ],
  };
}
