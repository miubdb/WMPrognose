'use client'

import { useState, useEffect, useCallback } from 'react'
import { ALL_TEAMS } from '@/src/data/allTeams'
import { supabase, DBPlayer } from '@/lib/supabase'

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'] as const
type Pos = typeof POSITIONS[number]

const POS_LABEL: Record<Pos, string> = { GK: 'Torwart', DEF: 'Abwehr', MID: 'Mittelfeld', FWD: 'Sturm' }
const POS_COLOR: Record<Pos, string> = {
  GK: 'bg-yellow-500/20 text-yellow-400',
  DEF: 'bg-emerald-500/20 text-emerald-400',
  MID: 'bg-blue-500/20 text-blue-400',
  FWD: 'bg-rose-500/20 text-rose-400',
}

const EMPTY_FORM = {
  name: '',
  position: 'MID' as Pos,
  jersey_number: '',
  age: '',
  club_team: '',
  market_value_m: '',
  rating: '75',
  xg_per90: '',
  is_in_starting_xi: false,
}

type FormState = typeof EMPTY_FORM

export default function KaderPage() {
  const [teamId, setTeamId] = useState(ALL_TEAMS[0].id)
  const [players, setPlayers] = useState<DBPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const team = ALL_TEAMS.find(t => t.id === teamId)!
  const starters = players.filter(p => p.is_in_starting_xi)
  const bench = players.filter(p => !p.is_in_starting_xi)

  const load = useCallback(async () => {
    if (!supabase) {
      setPlayers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('is_in_starting_xi', { ascending: false })
      .order('position')
      .order('jersey_number')
    setPlayers((data as DBPlayer[]) ?? [])
    setLoading(false)
  }, [teamId])

  useEffect(() => { load() }, [load])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const handleSave = async () => {
    if (!supabase) {
      flash('⚠️ Supabase nicht konfiguriert')
      return
    }
    if (!form.name.trim() || !form.age || !form.market_value_m) {
      flash('⚠️ Name, Alter und Marktwert sind Pflichtfelder')
      return
    }
    setSaving(true)
    const payload = {
      team_id: teamId,
      name: form.name.trim(),
      position: form.position,
      jersey_number: form.jersey_number ? parseInt(form.jersey_number) : null,
      age: parseInt(form.age),
      club_team: form.club_team.trim() || null,
      market_value_m: parseFloat(form.market_value_m),
      rating: parseInt(form.rating),
      xg_per90: form.xg_per90 ? parseFloat(form.xg_per90) : null,
      xga_per90: null,
      is_in_starting_xi: form.is_in_starting_xi,
    }
    if (editId) {
      await supabase.from('players').update(payload).eq('id', editId)
      flash('✓ Gespeichert')
    } else {
      await supabase.from('players').insert(payload)
      flash('✓ Spieler hinzugefügt')
    }
    setForm(EMPTY_FORM)
    setEditId(null)
    setSaving(false)
    load()
  }

  const handleEdit = (p: DBPlayer) => {
    setEditId(p.id)
    setForm({
      name: p.name,
      position: p.position,
      jersey_number: p.jersey_number?.toString() ?? '',
      age: p.age.toString(),
      club_team: p.club_team ?? '',
      market_value_m: p.market_value_m.toString(),
      rating: p.rating.toString(),
      xg_per90: p.xg_per90?.toString() ?? '',
      is_in_starting_xi: p.is_in_starting_xi,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!supabase) return
    await supabase.from('players').delete().eq('id', id)
    flash('Spieler entfernt')
    load()
  }

  const toggleXI = async (p: DBPlayer) => {
    if (!supabase) return
    if (!p.is_in_starting_xi && starters.length >= 11) {
      flash('⚠️ Startelf bereits voll (11/11)')
      return
    }
    await supabase.from('players').update({ is_in_starting_xi: !p.is_in_starting_xi }).eq('id', p.id)
    load()
  }

  const f = (k: keyof FormState, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>📋</span> Kader-Editor
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Spielerdaten eintragen — werden direkt für das Prognosemodell verwendet
        </p>
      </div>

      {/* Team-Auswahl */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <label className="text-xs text-gray-500 block mb-2 uppercase tracking-wide">Team</label>
        <select
          value={teamId}
          onChange={e => { setTeamId(e.target.value); setForm(EMPTY_FORM); setEditId(null) }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
        >
          {ALL_TEAMS.map(t => (
            <option key={t.id} value={t.id}>
              {t.flag} {t.name} (Gruppe {t.group})
            </option>
          ))}
        </select>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span>{players.length} Spieler eingetragen</span>
          <span className={starters.length === 11 ? 'text-emerald-400' : 'text-yellow-400'}>
            {starters.length}/11 Startelf
          </span>
        </div>
      </div>

      {/* Formular */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
        <h2 className="font-semibold text-sm">
          {editId ? '✏️ Spieler bearbeiten' : '➕ Neuer Spieler'}
        </h2>

        {/* Zeile 1: Name + Position + Nummer */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-6">
            <label className="text-xs text-gray-500 block mb-1">Name *</label>
            <input
              type="text"
              placeholder="Spielername"
              value={form.name}
              onChange={e => f('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="col-span-6 sm:col-span-3">
            <label className="text-xs text-gray-500 block mb-1">Position *</label>
            <select
              value={form.position}
              onChange={e => f('position', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              {POSITIONS.map(p => (
                <option key={p} value={p}>{p} – {POS_LABEL[p]}</option>
              ))}
            </select>
          </div>
          <div className="col-span-6 sm:col-span-3">
            <label className="text-xs text-gray-500 block mb-1">Trikotnr.</label>
            <input
              type="number"
              placeholder="z.B. 10"
              min={1} max={99}
              value={form.jersey_number}
              onChange={e => f('jersey_number', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Zeile 2: Alter + Verein + Marktwert */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4 sm:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Alter *</label>
            <input
              type="number"
              placeholder="27"
              min={15} max={45}
              value={form.age}
              onChange={e => f('age', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="col-span-8 sm:col-span-6">
            <label className="text-xs text-gray-500 block mb-1">Verein</label>
            <input
              type="text"
              placeholder="z.B. FC Bayern München"
              value={form.club_team}
              onChange={e => f('club_team', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="col-span-6 sm:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Marktwert €M *</label>
            <input
              type="number"
              placeholder="25"
              min={0} step={0.5}
              value={form.market_value_m}
              onChange={e => f('market_value_m', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="col-span-6 sm:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Rating (1–100)</label>
            <input
              type="number"
              min={1} max={100}
              value={form.rating}
              onChange={e => f('rating', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Zeile 3: xG + Startelf */}
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-6 sm:col-span-3">
            <label className="text-xs text-gray-500 block mb-1">xG/90 (optional)</label>
            <input
              type="number"
              placeholder="0.25"
              min={0} max={2} step={0.01}
              value={form.xg_per90}
              onChange={e => f('xg_per90', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="col-span-6 sm:col-span-4 flex items-center gap-2 pb-2">
            <input
              id="s11"
              type="checkbox"
              checked={form.is_in_starting_xi}
              onChange={e => f('is_in_starting_xi', e.target.checked)}
              className="w-4 h-4 accent-emerald-500"
            />
            <label htmlFor="s11" className="text-sm text-gray-300 cursor-pointer">
              In der Startelf
              <span className="text-xs text-gray-500 ml-1">({starters.length}/11)</span>
            </label>
          </div>
          <div className="col-span-12 sm:col-span-5 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {saving ? 'Speichern…' : editId ? '✓ Aktualisieren' : '+ Hinzufügen'}
            </button>
            {editId && (
              <button
                onClick={() => { setForm(EMPTY_FORM); setEditId(null) }}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className="text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-2">
            {msg}
          </div>
        )}
      </div>

      {/* Spielerliste */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 text-sm">Lade…</div>
      ) : players.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm bg-gray-900 border border-gray-800 rounded-xl">
          Noch keine Spieler für {team.flag} {team.name} eingetragen.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Startelf */}
          {starters.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-emerald-900/20 border-b border-gray-800">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Startelf · {starters.length}/11
                </span>
              </div>
              <PlayerList players={starters} onEdit={handleEdit} onDelete={handleDelete} onToggleXI={toggleXI} />
            </div>
          )}
          {/* Bank */}
          {bench.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-800">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Kader · {bench.length} Spieler
                </span>
              </div>
              <PlayerList players={bench} onEdit={handleEdit} onDelete={handleDelete} onToggleXI={toggleXI} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerList({ players, onEdit, onDelete, onToggleXI }: {
  players: DBPlayer[]
  onEdit: (p: DBPlayer) => void
  onDelete: (id: string) => void
  onToggleXI: (p: DBPlayer) => void
}) {
  return (
    <div className="divide-y divide-gray-800">
      {players.map(p => (
        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/40 transition-colors">
          <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0">
            {p.jersey_number ?? '–'}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${POS_COLOR[p.position]}`}>
            {p.position}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{p.name}</div>
            {p.club_team && <div className="text-xs text-gray-500 truncate">{p.club_team}</div>}
          </div>
          <div className="text-right flex-shrink-0 hidden sm:block">
            <div className="text-xs text-gray-400">{p.age} J.</div>
            <div className="text-xs text-gray-500">€{p.market_value_m}M</div>
          </div>
          <div className={`text-xs font-mono font-bold flex-shrink-0 w-7 text-center
            ${p.rating >= 85 ? 'text-emerald-400' : p.rating >= 75 ? 'text-blue-400' : 'text-gray-400'}`}>
            {p.rating}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onToggleXI(p)}
              title={p.is_in_starting_xi ? 'Aus Startelf entfernen' : 'In Startelf'}
              className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                p.is_in_starting_xi
                  ? 'bg-emerald-600 text-white hover:bg-red-600'
                  : 'bg-gray-700 text-gray-400 hover:bg-emerald-700 hover:text-white'
              }`}
            >
              {p.is_in_starting_xi ? '✓' : '+'}
            </button>
            <button
              onClick={() => onEdit(p)}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-blue-700 text-gray-400 hover:text-white text-xs transition-colors"
            >
              ✏
            </button>
            <button
              onClick={() => onDelete(p.id)}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-red-800 text-gray-400 hover:text-white text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
