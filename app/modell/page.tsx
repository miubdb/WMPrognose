import { MODEL_CAPABILITIES, DATA_NEEDS, type ModelCapability } from '@/lib/modelCapabilities'

export const metadata = {
  title: 'Modell-Status · WM 2026 Prognosemodell',
  description: 'Transparenz-Übersicht aller verwendeten wissenschaftlichen Modell-Komponenten',
}

const STATUS_CONFIG: Record<ModelCapability['status'], { label: string; color: string; bg: string }> = {
  implemented: { label: 'Umgesetzt',    color: 'text-emerald-400', bg: 'bg-emerald-900/40 border-emerald-700/50' },
  partial:     { label: 'Teilweise',   color: 'text-yellow-400',  bg: 'bg-yellow-900/40 border-yellow-700/50'  },
  missing:     { label: 'Fehlt',       color: 'text-rose-400',    bg: 'bg-rose-900/40 border-rose-700/50'      },
  prepared:    { label: 'Vorbereitet', color: 'text-blue-400',    bg: 'bg-blue-900/40 border-blue-700/50'      },
}

const PRIO_CONFIG: Record<ModelCapability['prioritaet'], { label: string; color: string }> = {
  hoch:     { label: 'Hoch',     color: 'text-rose-400'    },
  mittel:   { label: 'Mittel',   color: 'text-yellow-400'  },
  niedrig:  { label: 'Niedrig',  color: 'text-gray-500'    },
}

export default function ModelAuditPage() {
  const implemented = MODEL_CAPABILITIES.filter(c => c.status === 'implemented').length
  const partial     = MODEL_CAPABILITIES.filter(c => c.status === 'partial').length
  const missing     = MODEL_CAPABILITIES.filter(c => c.status === 'missing').length
  const prepared    = MODEL_CAPABILITIES.filter(c => c.status === 'prepared').length

  const bereiche = [...new Set(MODEL_CAPABILITIES.map(c => c.bereich))]

  const missingHigh = MODEL_CAPABILITIES.filter(
    c => (c.status === 'missing' || c.status === 'partial') && c.prioritaet === 'hoch'
  )

  const dataNeedsHigh = DATA_NEEDS.filter(d => d.prioritaet === 'hoch')
  const dataNeeds = {
    implemented: DATA_NEEDS.filter(d => d.status === 'implemented').length,
    partial: DATA_NEEDS.filter(d => d.status === 'partial').length,
    missing: DATA_NEEDS.filter(d => d.status === 'missing').length,
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Modell-Status & Transparenz</h1>
        <p className="text-gray-400 text-sm mt-1">
          Wissenschaftliche Grundlagen, Implementierungsstand und fehlende Daten des WM 2026 Prognosemodells
        </p>
      </div>

      {/* ── Modell-Komponenten Summary ── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Modell-Komponenten</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { count: implemented, label: 'Umgesetzt',    color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800' },
            { count: partial,     label: 'Teilweise',   color: 'text-yellow-400',  bg: 'bg-yellow-950/40 border-yellow-800'  },
            { count: missing,     label: 'Fehlen',      color: 'text-rose-400',    bg: 'bg-rose-950/40 border-rose-800'      },
            { count: prepared,    label: 'Vorbereitet', color: 'text-blue-400',    bg: 'bg-blue-950/40 border-blue-800'      },
          ].map(({ count, label, color, bg }) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${bg}`}>
              <div className={`text-3xl font-bold ${color}`}>{count}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modell-Tabelle by Bereich ── */}
      {bereiche.map(bereich => {
        const items = MODEL_CAPABILITIES.filter(c => c.bereich === bereich)
        return (
          <div key={bereich} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/40">
              <h2 className="font-semibold text-sm">{bereich}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2 text-left">Quelle</th>
                    <th className="px-4 py-2 text-left">Beschreibung</th>
                    <th className="px-4 py-2 text-left hidden md:table-cell">Benötigte Daten</th>
                    <th className="px-4 py-2 text-left hidden lg:table-cell">Auswirkung</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-center">Prio.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {items.map((cap, i) => {
                    const s = STATUS_CONFIG[cap.status]
                    const p = PRIO_CONFIG[cap.prioritaet]
                    return (
                      <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-gray-300 whitespace-nowrap text-[10px]">{cap.quelle}</td>
                        <td className="px-4 py-2.5 text-gray-300">{cap.beschreibung}</td>
                        <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{cap.benoetigteDaten}</td>
                        <td className="px-4 py-2.5 text-gray-600 hidden lg:table-cell">{cap.auswirkung ?? '–'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${s.bg} ${s.color}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-center text-[10px] font-medium ${p.color}`}>{p.label}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* ── Wichtigste fehlende Modell-Komponenten ── */}
      {missingHigh.length > 0 && (
        <div className="bg-gray-900 border border-rose-900/40 rounded-xl p-4">
          <h2 className="font-semibold text-sm text-rose-400 mb-3">
            Fehlende / unvollständige Modell-Komponenten (Priorität: Hoch)
          </h2>
          <div className="space-y-2">
            {missingHigh.map((c, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className={`mt-0.5 text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[c.status].bg} ${STATUS_CONFIG[c.status].color} whitespace-nowrap flex-shrink-0`}>
                  {STATUS_CONFIG[c.status].label}
                </span>
                <div>
                  <span className="text-gray-200">{c.beschreibung}</span>
                  {c.auswirkung && <span className="text-gray-500 ml-2 text-xs">→ {c.auswirkung}</span>}
                  <span className="text-gray-600 ml-2 text-xs block sm:inline">Benötigt: {c.benoetigteDaten}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Datenstatus ── */}
      <section>
        <h2 className="text-lg font-bold mb-1">Datenstatus</h2>
        <p className="text-gray-400 text-sm mb-4">Welche Daten sind verfügbar, welche fehlen noch?</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { count: dataNeeds.implemented, label: 'Vorhanden',  color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800' },
            { count: dataNeeds.partial,     label: 'Teilweise',  color: 'text-yellow-400',  bg: 'bg-yellow-950/40 border-yellow-800'  },
            { count: dataNeeds.missing,     label: 'Fehlen',     color: 'text-rose-400',    bg: 'bg-rose-950/40 border-rose-800'      },
          ].map(({ count, label, color, bg }) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${bg}`}>
              <div className={`text-2xl font-bold ${color}`}>{count}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Datenkategorie</th>
                  <th className="px-4 py-2 text-left hidden sm:table-cell">Beschreibung</th>
                  <th className="px-4 py-2 text-left hidden md:table-cell">Auswirkung aufs Modell</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-center">Prio.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {DATA_NEEDS.map((d, i) => {
                  const s = STATUS_CONFIG[d.status]
                  const p = PRIO_CONFIG[d.prioritaet]
                  return (
                    <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-200">{d.kategorie}</td>
                      <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{d.beschreibung}</td>
                      <td className="px-4 py-2.5 text-gray-600 hidden md:table-cell">{d.auswirkung}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${s.bg} ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-center text-[10px] font-medium ${p.color}`}>{p.label}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Was du noch liefern könntest ── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-sm text-gray-300 mb-3">Was das Modell verbessern würde</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {dataNeedsHigh.filter(d => d.status !== 'implemented').map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                d.status === 'missing' ? 'bg-rose-500' : 'bg-yellow-500'
              }`} />
              <div>
                <span className="text-gray-200 font-medium">{d.kategorie}</span>
                <span className="text-gray-500 ml-1">– {d.auswirkung}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-gray-600 text-center pb-4">
        Modell-Version 1.0 · Poisson + Dixon-Coles + ELO + Kontext-Modifier · Alle Prognosen sind Wahrscheinlichkeitsschätzungen
      </p>
    </div>
  )
}
