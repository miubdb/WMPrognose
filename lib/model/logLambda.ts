import { MODEL_META } from './config'

// Konvertiert linearen Effekt (z.B. +0.05 = +5%) zu log-space
export function linearToLogEffect(linearEffect: number): number {
  return Math.log(1 + linearEffect)
}

// Konvertiert log-Effekt zurück zu linearem Prozent (für UI-Anzeige)
export function logEffectToLinear(logEffect: number): number {
  return Math.exp(logEffect) - 1
}

// Clampt einen log-lambda Beitrag auf sinnvollen Bereich
export function clampLogEffect(logEffect: number, maxAbs = 0.18): number {
  return Math.max(-maxAbs, Math.min(maxAbs, logEffect))
}

// Berechnet lambda aus Basis + alle log-Beiträge
export function computeLambda(
  baseGoalRate: number,
  logEffects: number[]
): number {
  const logLambda = Math.log(baseGoalRate) + logEffects.reduce((s, e) => s + e, 0)
  const clamped = Math.max(MODEL_META.logLambdaMin, Math.min(MODEL_META.logLambdaMax, logLambda))
  return Math.exp(clamped)
}
