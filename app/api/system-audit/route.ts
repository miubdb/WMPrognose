import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { ACTIVE_WM_TEAM_IDS } from '@/src/data/activeWmTeams'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { MODEL_META, MODEL_WEIGHTS } from '@/lib/model/config'

export const dynamic = 'force-dynamic'

interface AuditCheck {
  name: string
  ok: boolean
  detail: string
  critical: boolean
}

export async function GET() {
  const checks: AuditCheck[] = []

  // ── 1. Schedule integrity ────────────────────────────────────────────────────
  const groupMatches = GROUP_SCHEDULE.filter(m => m.round === 'group')
  checks.push({
    name: 'Gruppenspiele: 72 Matches',
    ok: groupMatches.length === 72,
    detail: `${groupMatches.length}/72 Gruppenspiele`,
    critical: true,
  })

  checks.push({
    name: 'WM-Teams: 48 eindeutige IDs',
    ok: ACTIVE_WM_TEAM_IDS.length === 48,
    detail: `${ACTIVE_WM_TEAM_IDS.length}/48 Teams aus GROUP_SCHEDULE`,
    critical: true,
  })

  // Each team plays exactly 3 group matches
  const matchesPerTeam: Record<string, number> = {}
  for (const m of groupMatches) {
    matchesPerTeam[m.teamAId] = (matchesPerTeam[m.teamAId] ?? 0) + 1
    matchesPerTeam[m.teamBId] = (matchesPerTeam[m.teamBId] ?? 0) + 1
  }
  const teamsNot3 = Object.entries(matchesPerTeam).filter(([, n]) => n !== 3).map(([id]) => id)
  checks.push({
    name: 'Jedes Team: genau 3 Gruppenspiele',
    ok: teamsNot3.length === 0,
    detail: teamsNot3.length === 0 ? 'Alle 48 Teams haben 3 Spiele' : `Fehler: ${teamsNot3.join(', ')}`,
    critical: true,
  })

  // All schedule team IDs have static metadata in TEAM_BY_ID
  const missingStatic = ACTIVE_WM_TEAM_IDS.filter(id => !TEAM_BY_ID[id])
  checks.push({
    name: 'Alle Team-IDs in allTeams.ts',
    ok: missingStatic.length === 0,
    detail: missingStatic.length === 0 ? 'Alle 48 IDs in TEAM_BY_ID' : `Fehlen: ${missingStatic.join(', ')}`,
    critical: true,
  })

  // ── 2. ELO coverage ─────────────────────────────────────────────────────────
  const { data: eloRows, error: eloError } = await supabase
    .from('team_elo_ratings')
    .select('team_id, elo_rating')

  if (eloError) {
    checks.push({ name: 'ELO-Daten DB', ok: false, detail: `DB-Fehler: ${eloError.message}`, critical: true })
  } else {
    const eloMap = new Map((eloRows ?? []).map(r => [r.team_id, r.elo_rating]))
    const teamsWithElo = ACTIVE_WM_TEAM_IDS.filter(id => eloMap.has(id))
    const teamsMissingElo = ACTIVE_WM_TEAM_IDS.filter(id => !eloMap.has(id))
    checks.push({
      name: 'ELO-Ratings: alle 48 Teams',
      ok: teamsWithElo.length === 48,
      detail: teamsWithElo.length === 48
        ? 'ELO für alle 48 Teams in DB'
        : `${teamsWithElo.length}/48. Fehlen: ${teamsMissingElo.join(', ')}`,
      critical: true,
    })
  }

  // ── 3. Squad coverage ───────────────────────────────────────────────────────
  const { data: playerRows, error: playerError } = await supabase
    .from('players')
    .select('team_id, market_value_m, is_in_starting_xi')

  if (playerError) {
    checks.push({ name: 'Spieler-DB', ok: false, detail: `DB-Fehler: ${playerError.message}`, critical: true })
  } else {
    const allPlayers = playerRows ?? []

    // Players per team
    const playersByTeam: Record<string, typeof allPlayers> = {}
    for (const p of allPlayers) {
      if (!playersByTeam[p.team_id]) playersByTeam[p.team_id] = []
      playersByTeam[p.team_id].push(p)
    }

    const teamsEmpty     = ACTIVE_WM_TEAM_IDS.filter(id => !playersByTeam[id] || playersByTeam[id].length === 0)
    const teamsPartial   = ACTIVE_WM_TEAM_IDS.filter(id => {
      const n = playersByTeam[id]?.length ?? 0
      return n > 0 && n < 23
    })
    const teamsComplete  = ACTIVE_WM_TEAM_IDS.filter(id => (playersByTeam[id]?.length ?? 0) >= 23)

    checks.push({
      name: 'Kader: alle 48 Teams ≥23 Spieler',
      ok: teamsComplete.length === 48,
      detail: `${teamsComplete.length}/48 vollständig, ${teamsPartial.length} teilweise, ${teamsEmpty.length} leer`,
      critical: false,
    })

    // Teams with 0-MV players
    const teamsWithZeroMV = ACTIVE_WM_TEAM_IDS.filter(id => {
      const ps = playersByTeam[id] ?? []
      return ps.length > 0 && ps.some(p => (p.market_value_m ?? 0) === 0)
    })
    checks.push({
      name: 'Keine Spieler mit Marktwert=0',
      ok: teamsWithZeroMV.length === 0,
      detail: teamsWithZeroMV.length === 0
        ? 'Alle Spieler haben Marktwert > 0'
        : `${teamsWithZeroMV.length} Teams mit Spielern ohne Marktwert: ${teamsWithZeroMV.slice(0, 5).join(', ')}${teamsWithZeroMV.length > 5 ? '…' : ''}`,
      critical: false,
    })

    // Starting XI completeness
    const teamsWithout11 = ACTIVE_WM_TEAM_IDS.filter(id => {
      const starters = (playersByTeam[id] ?? []).filter(p => p.is_in_starting_xi).length
      return starters !== 11
    })
    checks.push({
      name: 'Startelf: genau 11 Starter pro Team',
      ok: teamsWithout11.length === 0,
      detail: teamsWithout11.length === 0
        ? 'Alle 48 Teams haben 11 Starter'
        : `${teamsWithout11.length} Teams ohne 11 Starter: ${teamsWithout11.slice(0, 5).join(', ')}${teamsWithout11.length > 5 ? '…' : ''}`,
      critical: false,
    })

    // Total market value sanity
    const totalMV = allPlayers.reduce((s, p) => s + (p.market_value_m ?? 0), 0)
    checks.push({
      name: 'Gesamtmarktwert plausibel',
      ok: totalMV > 5000,
      detail: `Gesamtmarktwert aller Spieler: ${Math.round(totalMV).toLocaleString('de-DE')} M€`,
      critical: false,
    })
  }

  // ── 4. Model config sanity ───────────────────────────────────────────────────
  checks.push({
    name: 'Modellversion: v3.3-final',
    ok: MODEL_META.version === 'v3.3-final',
    detail: `version = "${MODEL_META.version}"`,
    critical: false,
  })

  checks.push({
    name: 'Dixon-Coles rho konfiguriert',
    ok: MODEL_META.dixonColesRho !== undefined,
    detail: `dixonColesRho = ${MODEL_META.dixonColesRho}`,
    critical: false,
  })

  checks.push({
    name: 'MV-Gewicht kalibriert (0.25)',
    ok: MODEL_WEIGHTS.marketValueLog === 0.25,
    detail: `marketValueLog = ${MODEL_WEIGHTS.marketValueLog}`,
    critical: false,
  })

  checks.push({
    name: 'avgRating-Faktor deaktiviert (Doppelzählung)',
    ok: MODEL_WEIGHTS.avgRating === 0,
    detail: `avgRating = ${MODEL_WEIGHTS.avgRating} (soll 0 sein)`,
    critical: false,
  })

  // ── 5. Spielerdaten-Qualität ─────────────────────────────────────────────────
  if (!playerError && playerRows) {
    const allPlayers = playerRows ?? []
    const playersByTeam: Record<string, typeof allPlayers> = {}
    for (const p of allPlayers) {
      if (!playersByTeam[p.team_id]) playersByTeam[p.team_id] = []
      playersByTeam[p.team_id].push(p)
    }

    // xG coverage: how many teams have FotMob xG data
    const { data: xgRows } = await supabase
      .from('players')
      .select('team_id, xg_per90, xa_per90, xga_per90')
      .in('position', ['FWD', 'MID', 'DEF', 'GK'])
      .not('xg_per90', 'is', null)

    const teamsWithXg = new Set((xgRows ?? []).map(r => r.team_id))
    checks.push({
      name: 'FotMob xG-Daten: Teams mit Spielerdaten',
      ok: teamsWithXg.size >= 40,
      detail: `${teamsWithXg.size}/48 Teams haben FotMob-xG-Daten`,
      critical: false,
    })

    // Teams with exactly 26 players
    const teamsWith26 = ACTIVE_WM_TEAM_IDS.filter(id => (playersByTeam[id]?.length ?? 0) === 26)
    checks.push({
      name: 'Kader: Teams mit exakt 26 Spielern',
      ok: teamsWith26.length >= 44,
      detail: `${teamsWith26.length}/48 Teams mit genau 26 Spielern`,
      critical: false,
    })
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const criticalChecks = checks.filter(c => c.critical)
  const allCriticalOk = criticalChecks.every(c => c.ok)
  const allOk = checks.every(c => c.ok)
  const failedCritical = criticalChecks.filter(c => !c.ok).map(c => c.name)
  const failedNonCritical = checks.filter(c => !c.critical && !c.ok).map(c => c.name)

  const status = allCriticalOk
    ? allOk ? 'bereit' : 'bereit-mit-warnungen'
    : 'fehler'

  return NextResponse.json({
    ok: allCriticalOk,
    status,
    statusLabel: allCriticalOk
      ? allOk ? 'Systemstatus: bereit ✓' : 'Systemstatus: bereit (Warnungen)'
      : 'Systemstatus: FEHLER',
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(c => c.ok).length,
      failed: checks.filter(c => !c.ok).length,
      failedCritical,
      failedNonCritical,
    },
  })
}
