'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WM2026Team {
  team_id: string
  team_name: string
  confederation: string
  verified: boolean
  notes: string | null
  elo_rating: number | null
  elo_source: string | null
  elo_updated: string | null
  elo_delta_1y: number
  // Squad stats computed from players table
  player_count: number
  players_with_mv: number
  zero_mv_count: number
  total_mv_m: number | null
  starter_count: number
  starter_mv_m: number | null
}

interface TeamStats { total: number; missingElo: number; teamsWithoutSquad: number; teamsWithZeroMv: number; unverified: number }

interface HistQualRow {
  tournamentId: string; label: string; expectedTeamCount: number; teamCount: number
  realMvCount: number; estimatedCount: number; missingCount: number; fallbackCount: number
  overallQuality: 'gut' | 'mittel' | 'schlecht'
  missingTeams: string[]; estimatedTeams: string[]
}

interface CalibrationInfo {
  recommendedMode: string
  recentEstimatedTournaments: string[]
  note: string
  dataQualityWarning?: string
}

interface ModelResult { rps?: number; ece?: number; recommendation?: string; error?: string; raw?: unknown }

type Tab = 'daten' | 'qualität' | 'modell' | 'live'
type Filter = 'alle' | 'fehlend_mv' | 'fehlend_elo' | 'kein_kader' | 'ungeprüft'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function QBadge({ q }: { q: 'gut' | 'mittel' | 'schlecht' }) {
  const cls = q === 'gut' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800'
    : q === 'mittel' ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800'
    : 'bg-red-900/40 text-red-400 border-red-800'
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${cls}`}>{q}</span>
}

function Light({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      <span className={ok ? 'text-gray-300' : 'text-amber-300'}>{label}</span>
    </div>
  )
}

// ─── Status Panel ─────────────────────────────────────────────────────────────

function Stat({ label, value, total, ok }: { label: string; value: number; total?: number; ok: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${ok ? 'border-gray-800 bg-gray-900/40' : 'border-amber-800/50 bg-amber-950/20'}`}>
      <span className={`text-xs ${ok ? 'text-gray-400' : 'text-amber-300'}`}>{label}</span>
      <span className={`text-xs font-mono font-bold ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>
        {total !== undefined ? `${total - value} / ${total}` : value === 0 ? '✓' : value}
      </span>
    </div>
  )
}

function StatusPanel({ stats, histLoaded, lastBacktest }: {
  stats: TeamStats | null
  histLoaded: boolean
  lastBacktest: string | null
}) {
  if (!stats) return <div className="text-gray-600 text-sm animate-pulse">Lade Status…</div>

  const eloOk    = stats.missingElo        === 0
  const squadOk  = stats.teamsWithoutSquad === 0
  const mvOk     = stats.teamsWithZeroMv   === 0
  const verOk    = stats.unverified        === 0
  const allOk    = eloOk && squadOk && mvOk

  let nextStep = ''
  if (!eloOk)   nextStep = `${stats.missingElo} Teams ohne ELO-Werte. Bitte ELO aktualisieren.`
  else if (!squadOk) nextStep = `${stats.teamsWithoutSquad} Teams ohne Kader in der DB. Spielerdaten importieren.`
  else if (!mvOk) nextStep = `${stats.teamsWithZeroMv} Teams haben Spieler mit 0-Marktwert. Spieler prüfen.`
  else if (!verOk) nextStep = `${stats.unverified} Teams noch ungeprüft. Als geprüft bestätigen.`
  else nextStep = 'Alle Daten vollständig. Backtest oder Parametersuche starten.'

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Aktive WM-Teams"        value={48 - stats.total}         total={48}         ok={stats.total === 48} />
        <Stat label="Teams ohne ELO"         value={stats.missingElo}                            ok={eloOk} />
        <Stat label="Teams ohne Kader"       value={stats.teamsWithoutSquad}                     ok={squadOk} />
        <Stat label="Teams mit 0-MW-Spielern" value={stats.teamsWithZeroMv}                     ok={mvOk} />
      </div>
      <div className={`text-xs rounded-lg px-4 py-2.5 border ${
        !eloOk || !squadOk || !mvOk ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
        : verOk ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
        : 'bg-gray-800/60 border-gray-700 text-gray-300'
      }`}>
        <span className="font-semibold">Nächster Schritt: </span>{nextStep}
      </div>
      <div className="flex gap-4 text-[10px] text-gray-600">
        <span><Light ok={histLoaded} label={histLoaded ? 'Hist. Snapshots geladen' : 'Hist. Daten noch nicht geladen'} /></span>
        <span><Light ok={!!lastBacktest} label={lastBacktest ? `Letzter Backtest: ${lastBacktest}` : 'Backtest: ausstehend'} /></span>
      </div>
    </div>
  )
}

// ─── Team Control Row (compact, read-only MV, editable ELO+Geprüft) ───────────

function TeamRow({ team, onSave }: {
  team: WM2026Team
  onSave: (id: string, fields: Record<string, unknown>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draftElo, setDraftElo] = useState<string>(team.elo_rating?.toString() ?? '')
  const [draftVerified, setDraftVerified] = useState(team.verified)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const changed: Record<string, unknown> = {}
    const eloNum = draftElo ? Number(draftElo) : null
    if (eloNum !== team.elo_rating) changed.elo_rating = eloNum
    if (draftVerified !== team.verified) changed.verified = draftVerified
    if (Object.keys(changed).length > 0) await onSave(team.team_id, changed)
    setEditing(false)
    setSaving(false)
  }

  function cancel() {
    setDraftElo(team.elo_rating?.toString() ?? '')
    setDraftVerified(team.verified)
    setEditing(false)
  }

  const hasZeroMv   = team.zero_mv_count > 0
  const missingElo  = !team.elo_rating
  const statusOk    = !hasZeroMv && !missingElo
  const statusWarn  = !missingElo && hasZeroMv

  const statusCell = statusOk
    ? <span className="text-emerald-400 text-sm" title="Vollständig">✓</span>
    : statusWarn
    ? <span className="text-amber-400 text-sm" title={`${team.zero_mv_count} Spieler ohne Marktwert`}>⚠</span>
    : <span className="text-red-400 text-sm" title="ELO fehlt">✗</span>

  const rowCls = missingElo || hasZeroMv
    ? 'border-t border-amber-900/30 bg-amber-950/10'
    : 'border-t border-gray-800/60'

  const starterMv = team.starter_count > 0 ? team.starter_mv_m : null

  if (editing) {
    return (
      <tr className="border-t border-blue-800/60 bg-blue-950/20">
        <td className="px-3 py-2 text-xs font-medium text-white">{team.team_name}</td>
        <td className="px-3 py-2 text-[10px] text-gray-500">{team.confederation}</td>
        <td className="px-3 py-2 text-xs text-gray-400 text-right">{team.player_count}</td>
        <td className="px-3 py-2 text-xs text-gray-400 text-right">{team.players_with_mv}</td>
        <td className="px-3 py-2 text-xs font-mono text-gray-300 text-right">
          {team.total_mv_m != null ? `${team.total_mv_m}M` : '—'}
        </td>
        <td className="px-3 py-2 text-xs font-mono text-gray-400 text-right">
          {starterMv != null ? `${starterMv}M` : '—'}
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            value={draftElo}
            onChange={e => setDraftElo(e.target.value)}
            className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
          />
        </td>
        <td className="px-3 py-2 text-center">
          <input
            type="checkbox"
            checked={draftVerified}
            onChange={e => setDraftVerified(e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
          />
        </td>
        <td className="px-3 py-2 text-center">—</td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button onClick={save} disabled={saving}
              className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-semibold disabled:opacity-50">
              {saving ? '…' : 'OK'}
            </button>
            <button onClick={cancel}
              className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-[10px]">
              ✕
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`${rowCls} hover:bg-gray-800/30 transition-colors`}>
      <td className="px-3 py-2 text-xs font-medium text-white">{team.team_name}</td>
      <td className="px-3 py-2 text-[10px] text-gray-500">{team.confederation}</td>
      <td className="px-3 py-2 text-xs text-gray-400 text-right">{team.player_count}</td>
      <td className={`px-3 py-2 text-xs text-right font-mono ${hasZeroMv ? 'text-amber-400' : 'text-gray-400'}`}>
        {team.players_with_mv}
        {hasZeroMv && <span className="text-[9px] ml-1 text-amber-500">({team.zero_mv_count}×0)</span>}
      </td>
      <td className="px-3 py-2 text-xs font-mono text-gray-300 text-right">
        {team.total_mv_m != null ? `${team.total_mv_m}M` : <span className="text-gray-600">—</span>}
      </td>
      <td className="px-3 py-2 text-xs font-mono text-gray-500 text-right">
        {starterMv != null ? `${starterMv}M` : <span className="text-gray-700">—</span>}
      </td>
      <td className={`px-3 py-2 font-mono text-xs text-right ${missingElo ? 'text-amber-400 font-bold' : 'text-gray-300'}`}>
        {team.elo_rating ?? <span className="text-amber-500">— fehlt</span>}
        {(team.elo_delta_1y ?? 0) !== 0 && (
          <span className={`ml-1 text-[10px] ${team.elo_delta_1y > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {team.elo_delta_1y > 0 ? '+' : ''}{team.elo_delta_1y}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {team.verified
          ? <span className="text-emerald-400 text-xs">✓</span>
          : <span className="text-gray-600 text-xs">○</span>}
      </td>
      <td className="px-3 py-2 text-center">{statusCell}</td>
      <td className="px-3 py-2">
        <button onClick={() => setEditing(true)}
          className="text-[10px] px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors">
          Bearbeiten
        </button>
      </td>
    </tr>
  )
}

// ─── Team Data Tab (B) ────────────────────────────────────────────────────────

function TeamDataTab({ teams, stats, loading, onRefresh }: {
  teams: WM2026Team[]
  stats: TeamStats | null
  loading: boolean
  onRefresh: () => void
}) {
  const [filter, setFilter] = useState<Filter>('alle')
  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)
  const [bulkVerifyLoading, setBulkVerifyLoading] = useState(false)
  const [bulkVerifyResult, setBulkVerifyResult] = useState<string | null>(null)

  const filtered = teams.filter(t => {
    if (filter === 'fehlend_mv')  return t.zero_mv_count > 0
    if (filter === 'fehlend_elo') return !t.elo_rating
    if (filter === 'kein_kader')  return t.player_count === 0
    if (filter === 'ungeprüft')   return !t.verified
    return true
  })

  async function handleSave(teamId: string, fields: Record<string, unknown>) {
    setSaving(teamId)
    setSaveError(null)
    const res = await fetch(`/api/wm2026-teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSaveError(`Speichern fehlgeschlagen: ${data.error ?? data.errors?.join(', ') ?? res.status}`)
    }
    setSaving(null)
    onRefresh()
  }

  async function handleBulkVerify() {
    const eligible = teams.filter(
      t => t.player_count > 0 && t.zero_mv_count === 0 && t.elo_rating !== null && !t.verified
    )
    if (eligible.length === 0) {
      setBulkVerifyResult('Alle vollständigen Teams sind bereits geprüft.')
      return
    }
    setBulkVerifyLoading(true)
    setBulkVerifyResult(null)
    const res = await fetch('/api/wm2026-teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk-verify', teamIds: eligible.map(t => t.team_id) }),
    })
    const data = await res.json()
    setBulkVerifyResult(data.ok ? `✓ ${data.updated} Teams als geprüft markiert` : `Fehler: ${data.error}`)
    setBulkVerifyLoading(false)
    if (data.ok) onRefresh()
  }

  async function runBulkElo() {
    setBulkLoading(true)
    setBulkResult(null)
    const res = await fetch('/api/elo-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'text', text: bulkText }),
    })
    const data = await res.json()
    setBulkResult(data.ok ? `✓ ${data.updated} ELO-Werte aktualisiert` : `Fehler: ${data.error}`)
    setBulkLoading(false)
    if (data.ok) onRefresh()
  }

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'alle',        label: 'Alle 48 Teams',   count: teams.length },
    { key: 'fehlend_elo', label: 'Fehlende ELO',    count: stats?.missingElo ?? 0 },
    { key: 'kein_kader',  label: 'Kein Kader',      count: stats?.teamsWithoutSquad ?? 0 },
    { key: 'fehlend_mv',  label: '0-MW-Spieler',    count: stats?.teamsWithZeroMv ?? 0 },
  ]

  return (
    <div className="space-y-4">
      {/* Filter + actions */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f.key ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${filter === f.key ? 'bg-amber-500' : 'bg-gray-700'}`}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={handleBulkVerify} disabled={bulkVerifyLoading}
            className="text-xs px-3 py-1 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-emerald-200 rounded-lg transition-colors">
            {bulkVerifyLoading ? '…' : 'Alle vollständigen Teams geprüft markieren'}
          </button>
          <button onClick={() => setBulkOpen(b => !b)}
            className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors">
            ELO-Import
          </button>
          <button onClick={onRefresh} disabled={loading}
            className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50">
            {loading ? '…' : 'Neu laden'}
          </button>
        </div>
      </div>

      {/* Bulk verify / save feedback */}
      {(bulkVerifyResult || saveError) && (
        <div className="flex flex-wrap gap-3">
          {bulkVerifyResult && (
            <span className={`text-xs ${bulkVerifyResult.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{bulkVerifyResult}</span>
          )}
          {saveError && <span className="text-xs text-red-400">{saveError}</span>}
        </div>
      )}

      {/* Bulk ELO import */}
      {bulkOpen && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-white">ELO-Bulk-Import</div>
          <p className="text-xs text-gray-500">
            Format: eine Zeile pro Team — z.B.{' '}
            <code className="text-gray-300">Germany 1944</code> oder{' '}
            <code className="text-gray-300">ARG 2057</code>
          </p>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={8}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-amber-500 resize-y"
            placeholder={'Germany 1944\nFrance 2025\nBrazil 2013\n...'} />
          <div className="flex items-center gap-3">
            <button onClick={runBulkElo} disabled={bulkLoading || !bulkText.trim()}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold rounded-lg transition-colors">
              {bulkLoading ? 'Importiere…' : 'ELO importieren'}
            </button>
            {bulkResult && (
              <span className={`text-xs ${bulkResult.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{bulkResult}</span>
            )}
          </div>
        </div>
      )}

      {/* Compact control table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left">
          <thead className="bg-gray-900/80 text-[10px] text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2.5">Team</th>
              <th className="px-3 py-2.5">Konf.</th>
              <th className="px-3 py-2.5 text-right">Spieler</th>
              <th className="px-3 py-2.5 text-right">mit&nbsp;MW</th>
              <th className="px-3 py-2.5 text-right">Kader-MW</th>
              <th className="px-3 py-2.5 text-right">Startelf-MW</th>
              <th className="px-3 py-2.5 text-right">ELO</th>
              <th className="px-3 py-2.5 text-center">Geprüft</th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-gray-600 text-sm">
                  Keine Teams in diesem Filter
                </td>
              </tr>
            )}
            {filtered.map(t => (
              <TeamRow
                key={t.team_id}
                team={{ ...t, ...(saving === t.team_id ? {} : {}) }}
                onSave={handleSave}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{filtered.length} von {teams.length} Teams angezeigt</span>
        <span>Marktwerte werden automatisch aus der Spielerdatenbank berechnet (<a href="/teams" className="text-amber-500/80 hover:text-amber-400">Teams → Spieler bearbeiten</a>)</span>
      </div>
    </div>
  )
}

// ─── Historical Quality Tab (C) ───────────────────────────────────────────────

function HistoricalQualityTab() {
  const [data, setData] = useState<HistQualRow[] | null>(null)
  const [calibration, setCalibration] = useState<CalibrationInfo | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/historical-quality')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setData(d.summary)
          setCalibration(d.calibration)
        }
      })
  }, [])

  if (!data) return <div className="text-gray-600 text-sm animate-pulse">Lade Datenqualität…</div>

  return (
    <div className="space-y-4">
      {/* Calibration recommendation banner */}
      {calibration && (
        <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl px-4 py-3 space-y-1.5">
          <div className="text-xs font-semibold text-indigo-300">
            Für finale Parametersuche empfohlen:{' '}
            <span className="font-mono text-indigo-200">{calibration.recommendedMode}</span>
          </div>
          <div className="text-[11px] text-indigo-400/80">
            Enthält: {calibration.recentEstimatedTournaments.join(', ')} — vollständig abgedeckt, aber nicht verifiziert
          </div>
          {calibration.dataQualityWarning && (
            <div className="text-[11px] text-amber-400/80">
              Achtung: {calibration.dataQualityWarning}
            </div>
          )}
          <div className="text-[11px] text-gray-600">{calibration.note}</div>
        </div>
      )}

      {/* WC2014 warning */}
      {data.find(r => r.tournamentId === 'WC2014') && (() => {
        const wc14 = data.find(r => r.tournamentId === 'WC2014')!
        return wc14.estimatedCount === wc14.teamCount ? (
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-2.5 text-[11px] text-amber-400">
            WM 2014 nicht für finale Marktwert-Kalibrierung geeignet: {wc14.estimatedCount}/{wc14.teamCount} Werte geschätzt — nur in <span className="font-mono">allSnapshots</span> verwenden
          </div>
        ) : null
      })()}

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left">
          <thead className="bg-gray-900/80 text-[10px] text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2.5">Turnier</th>
              <th className="px-3 py-2.5 text-right">Teilnehmer</th>
              <th className="px-3 py-2.5 text-right">Snapshots</th>
              <th className="px-3 py-2.5 text-right">Echte MW</th>
              <th className="px-3 py-2.5 text-right">Geschätzt</th>
              <th className="px-3 py-2.5 text-right">Fehlend</th>
              <th className="px-3 py-2.5 text-right">Fallbacks</th>
              <th className="px-3 py-2.5">Qualität</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <>
                <tr key={row.tournamentId} className="border-t border-gray-800 hover:bg-gray-800/30">
                  <td className="px-3 py-2.5 text-sm font-medium text-white">{row.label}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-500">{row.expectedTeamCount}</td>
                  <td className={`px-3 py-2.5 text-right font-mono text-xs ${row.teamCount < row.expectedTeamCount ? 'text-amber-400' : 'text-gray-400'}`}>
                    {row.teamCount}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-emerald-400">{row.realMvCount > 0 ? row.realMvCount : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-yellow-400">{row.estimatedCount > 0 ? row.estimatedCount : '—'}</td>
                  <td className={`px-3 py-2.5 text-right font-mono text-xs ${row.missingCount > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                    {row.missingCount > 0 ? row.missingCount : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono text-xs ${row.fallbackCount > 0 ? 'text-red-400 font-bold' : 'text-gray-600'}`}>
                    {row.fallbackCount > 0 ? `${row.fallbackCount} × 200M` : '—'}
                  </td>
                  <td className="px-3 py-2.5"><QBadge q={row.overallQuality} /></td>
                  <td className="px-3 py-2.5">
                    {(row.estimatedTeams.length > 0 || row.missingTeams.length > 0) && (
                      <button onClick={() => setExpanded(e => e === row.tournamentId ? null : row.tournamentId)}
                        className="text-[10px] text-gray-500 hover:text-white transition-colors">
                        {expanded === row.tournamentId ? '▲ schließen' : '▼ details'}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === row.tournamentId && (
                  <tr key={`${row.tournamentId}-detail`} className="border-t border-gray-800/50">
                    <td colSpan={9} className="px-4 py-3 bg-gray-900/40">
                      {row.estimatedTeams.length > 0 && (
                        <div className="mb-2">
                          <span className="text-[10px] text-yellow-500 font-semibold uppercase mr-2">Geschätzt ({row.estimatedTeams.length}):</span>
                          <span className="text-[10px] text-gray-400">{row.estimatedTeams.join(', ')}</span>
                        </div>
                      )}
                      {row.missingTeams.length > 0 && (
                        <div>
                          <span className="text-[10px] text-red-500 font-semibold uppercase mr-2">Kein Marktwert:</span>
                          <span className="text-[10px] text-gray-400">{row.missingTeams.join(', ')}</span>
                        </div>
                      )}
                      {row.fallbackCount > 0 && (
                        <div className="mt-1">
                          <span className="text-[10px] text-red-500 font-semibold uppercase mr-2">Fallback 200M verwendet:</span>
                          <span className="text-[10px] text-gray-400">{row.fallbackCount} Teams ohne Snapshot</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <div><span className="text-emerald-400">Echte MW</span> — direkt aus verifizierter Archivquelle</div>
        <div><span className="text-yellow-400">Geschätzt</span> — Transfermarkt-Schätzung, nicht manuell verifiziert</div>
        <div><span className="text-red-400">Fallbacks</span> — kein Snapshot vorhanden, Modell würde 200M verwenden</div>
      </div>
    </div>
  )
}

// ─── Param result panel ───────────────────────────────────────────────────────

function ParamResultPanel({ result, calibMode }: { result: ModelResult | null; calibMode: string }) {
  if (!result?.raw || result.error) return null
  const d = result.raw as Record<string, unknown>
  const rec = d.recommendation as Record<string, unknown> | undefined
  if (!rec) return null
  const boot     = rec.bootstrap as Record<string, unknown> | undefined
  const boundary = rec.boundaryWarning as Record<string, unknown> | undefined
  const dcComp   = d.dixonColesComparison as Record<string, unknown> | undefined
  const pBetter  = typeof boot?.pBetter === 'number' ? (boot.pBetter * 100).toFixed(1) + '%' : '—'
  const items = [
    { label: 'MV-Gewicht', val: (rec.marketValueWeight as number)?.toFixed(2), color: 'text-violet-300' },
    { label: 'Heritage',   val: (rec.heritageScale    as number)?.toFixed(2), color: 'text-blue-300'   },
    { label: 'ρ (DC)',     val: (rec.rho              as number)?.toFixed(2), color: 'text-cyan-300'   },
    { label: 'RPS (IS)',   val: (rec.inSampleRPS      as number)?.toFixed(4), color: 'text-amber-300'  },
    { label: 'RPS (OOS)',  val: (rec.oosRPS           as number)?.toFixed(4), color: 'text-amber-400'  },
    { label: 'Bootstrap p', val: pBetter,                                     color: 'text-emerald-300'},
  ]
  const boundaryWarnings = boundary?.warnings as string[] | undefined
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Empfohlene Konfiguration</div>
        <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{calibMode}</span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
        {items.map(item => (
          <div key={item.label} className="bg-gray-800 rounded-lg p-2.5">
            <div className="text-gray-500 mb-1">{item.label}</div>
            <div className={`font-mono font-bold ${item.color}`}>{item.val}</div>
          </div>
        ))}
      </div>
      {boundaryWarnings && boundaryWarnings.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg px-3 py-2 text-[11px] text-amber-400 space-y-0.5">
          <div className="font-semibold">Optimum liegt am Rand des Suchraums — Suchbereich erweitern oder vorsichtig interpretieren:</div>
          {boundaryWarnings.map((w, i) => <div key={i}>· {w}</div>)}
        </div>
      )}
      {dcComp && (() => {
        const withRho    = dcComp.withRho    as Record<string, number> | undefined
        const withoutRho = dcComp.withoutRho as Record<string, number> | undefined
        return (
          <div className="text-[11px] text-gray-500 space-y-0.5 border-t border-gray-800 pt-2">
            <div className="text-gray-400 font-semibold mb-1">Dixon-Coles Vergleich</div>
            <div>Mit DC (ρ={withRho?.rho?.toFixed(2)}): RPS={withRho?.rps?.toFixed(4)}, ECE={withRho?.ece?.toFixed(4)}</div>
            <div>Ohne DC (ρ=0): RPS={withoutRho?.rps?.toFixed(4)}, ECE={withoutRho?.ece?.toFixed(4)}</div>
            {dcComp.removeDCRecommended === true && (
              <div className="text-amber-400">Empfehlung: Dixon-Coles hat keinen messbaren Effekt → ρ=0 bevorzugen</div>
            )}
          </div>
        )
      })()}
      {typeof rec.version === 'string' && (
        <p className="text-[10px] text-gray-600">{rec.version}</p>
      )}
    </div>
  )
}

// ─── Model Test Tab (D) ───────────────────────────────────────────────────────

type CompareRow = {
  calibMode: string; matchCount?: number; error?: string
  marketValueWeight?: number; heritageScale?: number; rho?: number
  inSampleRPS?: number; oosRPS?: number; avgOverfit?: number
  bootstrapP?: number; stabilityStd?: number
  boundaryWarning?: { any: boolean; warnings: string[] }
}

function ModelTestTab({ stats }: { stats: TeamStats | null }) {
  const [backtestResult, setBacktestResult]   = useState<ModelResult | null>(null)
  const [backtestLoading, setBacktestLoading] = useState(false)
  const [paramsResult, setParamsResult]       = useState<ModelResult | null>(null)
  const [paramsLoading, setParamsLoading]     = useState(false)
  const [calibMode, setCalibMode]             = useState<'recentEstimated' | 'allSnapshots'>('recentEstimated')
  const [compareRows, setCompareRows]         = useState<CompareRow[] | null>(null)
  const [compareLoading, setCompareLoading]   = useState(false)
  const [qualResult, setQualResult]           = useState<string | null>(null)

  const missingData = stats && (stats.missingElo > 0 || stats.teamsWithoutSquad > 0 || stats.teamsWithZeroMv > 0)

  async function runBacktest() {
    setBacktestLoading(true)
    setBacktestResult(null)
    const res = await fetch('/api/model-lab')
    const data = await res.json()
    setBacktestLoading(false)
    if (!data.ok) { setBacktestResult({ error: data.error }); return }
    const hist = data.modes?.historicalFull
    setBacktestResult({
      rps: hist?.rps,
      ece: hist?.ece,
      recommendation: `Historical Full: RPS=${hist?.rps?.toFixed(4)} · ECE=${hist?.ece?.toFixed(4)} · Skill=${(hist?.skillScore * 100).toFixed(2)}%`,
      raw: data,
    })
  }

  async function runParamSearch() {
    setParamsLoading(true)
    setParamsResult(null)
    const res = await fetch(`/api/calibrate-params?mode=recommend&calibMode=${calibMode}`)
    const data = await res.json()
    setParamsLoading(false)
    if (!data.ok) { setParamsResult({ error: data.error }); return }
    const rec = data.recommendation
    setParamsResult({ rps: rec?.inSampleRPS, recommendation: rec?.recommendation, raw: data })
  }

  async function runCompare() {
    setCompareLoading(true)
    setCompareRows(null)
    const res = await fetch('/api/calibrate-params?mode=compare')
    const data = await res.json()
    setCompareLoading(false)
    if (data.ok) setCompareRows(data.rows)
  }

  function checkQuality() {
    if (!stats) return
    const issues = []
    if (stats.total !== 48)             issues.push(`Nur ${stats.total} Teams geladen (erwartet 48)`)
    if (stats.missingElo > 0)          issues.push(`${stats.missingElo} Teams ohne ELO`)
    if (stats.teamsWithoutSquad > 0)   issues.push(`${stats.teamsWithoutSquad} Teams ohne Kader`)
    if (stats.teamsWithZeroMv > 0)     issues.push(`${stats.teamsWithZeroMv} Teams mit 0-MW-Spielern`)
    if (stats.unverified > 0)          issues.push(`${stats.unverified} Teams ungeprüft`)
    setQualResult(issues.length === 0 ? '✓ Alle 48 WM-Teams vollständig und bereit.' : `Offene Punkte: ${issues.join(' · ')}`)
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        Führe Tests in dieser Reihenfolge aus. Fehlende Daten schränken die Aussagekraft ein.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Datenqualität */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider">1. Datenqualität prüfen</div>
          <p className="text-xs text-gray-400">Prüft ob alle Teams ELO-Werte haben und keine Spieler mit 0-Marktwert vorliegen.</p>
          <button onClick={checkQuality}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors">
            Prüfen
          </button>
          {qualResult && (
            <p className={`text-xs ${qualResult.startsWith('✓') ? 'text-emerald-400' : 'text-amber-400'}`}>{qualResult}</p>
          )}
        </div>

        {/* 2. Backtest */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider">2. Backtest starten</div>
          <p className="text-xs text-gray-400">Wertet das Modell auf historischen Daten (WM 2014–2022, EM 2024) aus.</p>
          <button onClick={runBacktest} disabled={backtestLoading}
            className="w-full px-4 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors">
            {backtestLoading ? 'Läuft (~5s)…' : 'Backtest starten'}
          </button>
          {backtestResult?.error && <p className="text-xs text-red-400">{backtestResult.error}</p>}
          {backtestResult?.recommendation && !backtestResult.error && (
            <p className="text-xs text-emerald-400">{backtestResult.recommendation}</p>
          )}
        </div>
      </div>

      {/* Parametersuche — hinter Details versteckt */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300 transition-colors select-none list-none flex items-center gap-2 py-1">
          <span className="group-open:hidden">▶</span>
          <span className="hidden group-open:inline">▼</span>
          Details: Parametersuche &amp; Kalibrierung
        </summary>
        <div className="mt-4 space-y-4">
          <div className={`bg-gray-900 border rounded-xl p-5 space-y-3 ${missingData ? 'border-gray-800 opacity-60' : 'border-gray-800'}`}>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Parametersuche</div>
            {!missingData && (
              <div className="flex gap-1">
                {(['recentEstimated', 'allSnapshots'] as const).map(m => (
                  <button key={m} onClick={() => setCalibMode(m)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${calibMode === m ? 'bg-violet-700 text-white' : 'bg-gray-800 text-gray-500 hover:text-white'}`}>
                    {m}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">
              {missingData
                ? `Deaktiviert: Daten unvollständig (${[
                    stats!.missingElo > 0 ? `${stats!.missingElo} ELO fehlend` : '',
                    stats!.teamsWithoutSquad > 0 ? `${stats!.teamsWithoutSquad} ohne Kader` : '',
                    stats!.teamsWithZeroMv > 0 ? `${stats!.teamsWithZeroMv} Teams mit 0-MW` : '',
                  ].filter(Boolean).join(', ')}).`
                : `Grid Search (936 Kombinationen) + Walk-Forward + Bootstrap · Modus: ${calibMode} · ~60s.`}
            </p>
            <div className="flex gap-2">
              <button onClick={runParamSearch} disabled={paramsLoading || !!missingData}
                className="flex-1 px-4 py-2 bg-violet-700 hover:bg-violet-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors">
                {paramsLoading ? 'Läuft (~60s)…' : 'Parametersuche starten'}
              </button>
              <button onClick={runCompare} disabled={compareLoading || !!missingData}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
                {compareLoading ? '…' : 'Vergleichen'}
              </button>
            </div>
            {paramsResult?.error && <p className="text-xs text-red-400">{paramsResult.error}</p>}
            {paramsResult?.recommendation && !paramsResult.error && (
              <p className="text-xs text-emerald-400">{paramsResult.recommendation}</p>
            )}
          </div>

          <ParamResultPanel result={paramsResult} calibMode={calibMode} />
        </div>
      </details>

      {/* Comparison table */}
      {compareRows && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="text-sm font-semibold text-white">Vergleich Kalibrierungsmodi</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-gray-500 uppercase">
                <tr>
                  <th className="pb-2 pr-4">Modus</th>
                  <th className="pb-2 pr-4 text-right">Spiele</th>
                  <th className="pb-2 pr-4 text-right">MV-W</th>
                  <th className="pb-2 pr-4 text-right">Heritage</th>
                  <th className="pb-2 pr-4 text-right">ρ</th>
                  <th className="pb-2 pr-4 text-right">IS-RPS</th>
                  <th className="pb-2 pr-4 text-right">OOS-RPS</th>
                  <th className="pb-2 pr-4 text-right">Bootstrap p</th>
                  <th className="pb-2">Hinweis</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(row => (
                  <tr key={row.calibMode} className="border-t border-gray-800">
                    <td className="py-2 pr-4 font-mono text-gray-300">{row.calibMode}</td>
                    <td className="py-2 pr-4 text-right text-gray-500">{row.error ? '—' : row.matchCount}</td>
                    <td className="py-2 pr-4 text-right font-mono text-violet-300">{row.marketValueWeight?.toFixed(2) ?? '—'}</td>
                    <td className="py-2 pr-4 text-right font-mono text-blue-300">{row.heritageScale?.toFixed(2) ?? '—'}</td>
                    <td className="py-2 pr-4 text-right font-mono text-cyan-300">{row.rho?.toFixed(2) ?? '—'}</td>
                    <td className="py-2 pr-4 text-right font-mono text-amber-300">{row.inSampleRPS?.toFixed(4) ?? '—'}</td>
                    <td className="py-2 pr-4 text-right font-mono text-amber-400">{row.oosRPS?.toFixed(4) ?? '—'}</td>
                    <td className="py-2 pr-4 text-right font-mono text-emerald-300">{row.bootstrapP != null ? (row.bootstrapP * 100).toFixed(1) + '%' : '—'}</td>
                    <td className="py-2 text-[10px]">
                      {row.error
                        ? <span className="text-red-400">{row.error}</span>
                        : row.boundaryWarning?.any
                        ? <span className="text-amber-400">Rand ⚠</span>
                        : <span className="text-gray-600">ok</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-gray-800 flex flex-wrap gap-3 text-xs text-gray-500">
        <span>Details auf:</span>
        <a href="/model-lab"  className="text-pink-400/80 hover:text-pink-300 transition-colors">Model Lab</a>
        <a href="/backtest"   className="text-indigo-400/80 hover:text-indigo-300 transition-colors">Backtest</a>
        <a href="/calibrate"  className="text-cyan-400/80 hover:text-cyan-300 transition-colors">Kalibrierung</a>
      </div>
    </div>
  )
}

// ─── Live Mode Tab (E) ────────────────────────────────────────────────────────

function LiveModeTab({ teams }: { teams: WM2026Team[] }) {
  const [mode, setMode] = useState<'daily' | 'frozen'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('elo_mode') as 'daily' | 'frozen') ?? 'daily'
    return 'daily'
  })

  function setModeAndSave(m: 'daily' | 'frozen') {
    setMode(m)
    localStorage.setItem('elo_mode', m)
  }

  const teamsWithDelta = teams
    .filter(t => t.elo_rating)
    .sort((a, b) => (b.elo_rating ?? 0) - (a.elo_rating ?? 0))

  return (
    <div className="space-y-5">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="text-sm font-semibold text-white">ELO-Modus</div>
        <div className="flex gap-3">
          <button onClick={() => setModeAndSave('daily')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border transition-all ${mode === 'daily' ? 'bg-emerald-700 border-emerald-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
            Daily ELO
            <p className="text-[10px] font-normal mt-1 text-current opacity-70">
              Täglich aktualisierte ELO-Werte. Empfohlen für Prognosen.
            </p>
          </button>
          <button onClick={() => setModeAndSave('frozen')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border transition-all ${mode === 'frozen' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
            Frozen Pre-Tournament
            <p className="text-[10px] font-normal mt-1 text-current opacity-70">
              ELO eingefroren bei Turnierbeginn. Nur für Vergleiche.
            </p>
          </button>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <p>Aktiv: <span className={`font-semibold ${mode === 'daily' ? 'text-emerald-400' : 'text-gray-400'}`}>{mode === 'daily' ? 'Daily ELO' : 'Frozen Pre-Tournament ELO'}</span></p>
          <p>Eingetragene Spielergebnisse aktualisieren Tabellen, Motivation und Turnierpfade automatisch.</p>
          <p>Kein Formbonus, kein Momentum-Bonus, kein automatisches Neulernen der Modellgewichte während des Turniers.</p>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-white mb-3">ELO-Übersicht ({teamsWithDelta.length} Teams)</div>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-left">
            <thead className="bg-gray-900/80 text-[10px] text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Team</th>
                <th className="px-3 py-2.5">Konf.</th>
                <th className="px-3 py-2.5 text-right">ELO aktuell</th>
                <th className="px-3 py-2.5 text-right">Δ 1 Jahr</th>
                <th className="px-3 py-2.5 text-xs normal-case text-gray-600">Stand</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithDelta.map((t, i) => (
                <tr key={t.team_id} className="border-t border-gray-800 hover:bg-gray-800/30">
                  <td className="px-3 py-2 text-xs text-gray-600">{i + 1}</td>
                  <td className="px-3 py-2 text-xs font-medium text-white">{t.team_name}</td>
                  <td className="px-3 py-2 text-[10px] text-gray-500">{t.confederation}</td>
                  <td className="px-3 py-2 text-right font-mono text-sm font-bold text-gray-200">{t.elo_rating}</td>
                  <td className={`px-3 py-2 text-right font-mono text-xs ${
                    t.elo_delta_1y > 20 ? 'text-emerald-400'
                    : t.elo_delta_1y < -20 ? 'text-red-400'
                    : 'text-gray-500'
                  }`}>
                    {t.elo_delta_1y > 0 ? '+' : ''}{t.elo_delta_1y || '—'}
                  </td>
                  <td className="px-3 py-2 text-[10px] font-mono text-gray-700">
                    {t.elo_updated ? t.elo_updated.slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">
          ELO aktualisieren: <a href="/admin" className="text-amber-500/80 hover:text-amber-400 transition-colors">Admin → ELO-Import</a>
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DatenModellPage() {
  const [tab, setTab]             = useState<Tab>('daten')
  const [teams, setTeams]         = useState<WM2026Team[]>([])
  const [stats, setStats]         = useState<TeamStats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [histLoaded, setHistLoaded] = useState(false)
  const [lastBacktest]            = useState<string | null>(null)

  const loadTeams = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/wm2026-teams')
    const data = await res.json()
    if (data.ok) { setTeams(data.teams); setStats(data.stats) }
    setLoading(false)
  }, [])

  useEffect(() => { loadTeams() }, [loadTeams])

  useEffect(() => {
    if (tab === 'qualität') {
      fetch('/api/historical-quality').then(r => r.json()).then(d => d.ok && setHistLoaded(true))
    }
  }, [tab])

  const TABS: { key: Tab; label: string }[] = [
    { key: 'daten',    label: 'WM-2026-Daten' },
    { key: 'qualität', label: 'Hist. Qualität' },
    { key: 'modell',   label: 'Modellstatus' },
    { key: 'live',     label: 'Live-Modus' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Daten & Modell</h1>
        <p className="mt-1 text-gray-500 text-sm">
          Zentrale Arbeitsoberfläche — Datenpflege, Qualitätskontrolle, Modelltest
        </p>
      </div>

      <StatusPanel stats={stats} histLoaded={histLoaded} lastBacktest={lastBacktest} />

      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {tab === 'daten'    && <TeamDataTab teams={teams} stats={stats} loading={loading} onRefresh={loadTeams} />}
        {tab === 'qualität' && <HistoricalQualityTab />}
        {tab === 'modell'   && <ModelTestTab stats={stats} />}
        {tab === 'live'     && <LiveModeTab teams={teams} />}
      </div>
    </div>
  )
}
