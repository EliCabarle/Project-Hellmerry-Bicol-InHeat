import { useState } from 'react'
import { dayLegend, trendLegend, yearLegend } from '../gis/yearRamp.js'
import { spelledDate } from '../state/dateModel.js'
import { IconChevronDown } from './Icons.jsx'

const swatch = (color) => (
  <span
    aria-hidden="true"
    className="inline-block h-2.5 w-5 shrink-0 rounded-sm border border-black/20"
    style={{ background: color }}
  />
)

function LegendRow({ color, label, children }) {
  return (
    <div className="flex items-center gap-2">
      {swatch(color)}
      <span className="min-w-0 flex-1 text-slate-300">{label}</span>
      {children}
    </div>
  )
}

export default function MunicipalityLegend({
  coverage = { withData: 0, total: 0 },
  viewMode = 'trend',
  year = null,
  date = null,
}) {
  // Always start collapsed on every viewport; opening overlaps the map
  // (absolute positioning) rather than pushing content aside. Top offset
  // clears the shell's fixed floating navbar.
  const [open, setOpen] = useState(false)
  const bins =
    viewMode === 'day'
      ? dayLegend()
      : viewMode === 'year'
        ? yearLegend()
        : trendLegend()
  const title =
    viewMode === 'day'
      ? `Daily peak heat index · ${date ? spelledDate(date) : '—'}`
      : viewMode === 'year'
        ? `Mean heat index · ${year ?? 'latest'}`
        : 'Warming rate · °C/yr'

  return (
    <div className="pointer-events-auto absolute left-3 top-[calc(4.75rem+env(safe-area-inset-top))] lg:top-[calc(0.75rem+env(safe-area-inset-top))] z-[600] w-[15rem] max-w-[calc(100vw-1.5rem)]">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-heat-surface/90 text-[11px] text-slate-300 shadow-hud backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-heat-amber"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-heat-amber/20 text-heat-amber">
            <span aria-hidden="true" className="text-[10px] font-black">V</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Bicol · Region V
            </span>
            <span className="block truncate text-xs font-semibold text-slate-100">
              {coverage.withData} municipalities · 1981–2025
            </span>
          </span>
          <IconChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="border-t border-white/10 px-3 py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {title}
              </span>
              <span className="font-mono text-[10px] text-slate-500">°C</span>
            </div>
            <div className="space-y-1">
              {bins.map((bin) => (
                <LegendRow key={bin.label} color={bin.color} label={bin.label} />
              ))}
            </div>

            <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
              {viewMode !== 'day' && (
                <LegendRow color="#3b82f6" label="Decreasing trend" />
              )}
              <LegendRow color="#1f2937" label="Data pending" />
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-5 rounded-sm border-2 border-heat-hotline"
                />
                <span>Significant (α = 0.05)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-5 rounded-sm border-2 border-dashed border-heat-hotline"
                />
                <span>Not significant — still ranked</span>
              </div>
            </div>

            <div className="mt-2.5 border-t border-white/10 pt-2 text-[10px] leading-4 text-slate-500">
              {coverage.withData} of {coverage.total} LGUs joined. POWER 0.5° grid · municipality resolution.
              {viewMode === 'day' ? ' Daily value shown for this day; neighbours share one grid cell.' : ''}
            </div>

            <div className="mt-2 text-[9px] leading-[0.875rem] text-slate-600">
              Imagery © Esri, Maxar, Earthstar Geographics · Boundaries: geoBoundaries (CC BY 4.0) · Data: NASA POWER
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
