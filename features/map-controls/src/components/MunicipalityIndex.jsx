import { useMemo, useState } from 'react'
import { featureKey } from '../gis/engine.js'
import { formatTrend } from '../gis/yearRamp.js'
import { IconSearch, IconX } from './Icons.jsx'

const arrow = (dir) => (dir === 'increasing' ? '▲' : dir === 'decreasing' ? '▼' : '■')

export default function MunicipalityIndex({ features = [], selectedKey = null, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return features
      .filter((f) => {
        if (!q) return true
        const p = f.properties ?? {}
        return `${p.adm3_en ?? ''} ${p.province ?? ''}`.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const ap = a.properties ?? {}
        const bp = b.properties ?? {}
        return `${ap.adm3_en ?? ''}|${ap.province ?? ''}`.localeCompare(`${bp.adm3_en ?? ''}|${bp.province ?? ''}`)
      })
  }, [features, query])

  return (
    <>
      <button
        type="button"
        aria-label="Close municipality list"
        onClick={onClose}
        className="absolute inset-0 z-[755] cursor-default bg-slate-950/40 md:hidden"
      />
      <section
        aria-label="Municipality list"
        className="absolute inset-x-3 bottom-28 top-3 z-[760] flex flex-col overflow-hidden rounded-xl border border-white/10 bg-heat-surface/95 text-slate-100 shadow-hud backdrop-blur-md md:inset-x-auto md:bottom-24 md:left-3 md:top-24 md:w-[21rem]"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
          <h2 className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Municipalities
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close municipality list"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-white/10 p-2.5">
          <label htmlFor="municipality-search" className="sr-only">
            Search municipalities
          </label>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="municipality-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or province"
              className="w-full rounded-md border border-white/10 bg-black/25 py-1.5 pl-8 pr-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
            />
          </div>
        </div>

        <ul className="bih-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
          {rows.map((feature) => {
            const p = feature.properties ?? {}
            const n = p.narrative
            const key = featureKey(feature)
            const selected = key === selectedKey
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect?.(key)
                    onClose?.()
                  }}
                  aria-current={selected ? 'true' : undefined}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
                    selected ? 'bg-heat-amber/20 text-white' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{p.adm3_en ?? 'Unknown'}</span>
                    <span className="block truncate text-[10px] text-slate-500">{p.province ?? ''}</span>
                  </span>
                  {n ? (
                    <span className="shrink-0 font-mono text-[10px] text-slate-400">
                      {arrow(n.trend?.direction)} {formatTrend(n.trend?.slope_c_per_year)}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] text-slate-600">pending</span>
                  )}
                </button>
              </li>
            )
          })}
          {rows.length === 0 && <li className="px-2 py-4 text-xs text-slate-500">No municipality matches that search.</li>}
        </ul>

        <div className="border-t border-white/10 px-3 py-2 font-mono text-[10px] text-slate-500">
          {rows.length} of {features.length}
        </div>
      </section>
    </>
  )
}
