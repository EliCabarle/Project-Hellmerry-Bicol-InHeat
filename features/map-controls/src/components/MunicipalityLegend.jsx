import { useState } from 'react'
import { dayLegend, trendLegend, yearLegend } from '../gis/yearRamp.js'
import { spelledDate } from '../state/dateModel.js'
import { MISSING_TINT, RAMP } from '../gis/metric.js'
import { IconChevronDown, IconList } from './Icons.jsx'

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

// Format a value for the legend: one decimal for heat-index values, three for
// warming rates, matching the tooltip's precision.
const fmt = (v, units) => {
  if (v == null || !Number.isFinite(v)) return '—'
  const n = units === '°C/yr' ? v.toFixed(3) : v.toFixed(1)
  return `${n} ${units}`
}

export default function MunicipalityLegend({
  coverage = { withData: 0, total: 0 },
  viewMode = 'trend',
  year = null,
  date = null,
  onBrowse,
  // Data-driven metric layer (trend / year). When absent, the fixed band
  // legends (day / trend / year) are used instead.
  ramp = null,
  noDataCount = 0,
  valueMin = null,
  valueMax = null,
  method = 'quantile',
  metricLabel = 'Metric',
  metricUnits = '°C',
}) {
  const [open, setOpen] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches,
  )
  const bins =
    ramp && ramp.length > 0
      ? ramp.map((stop, i, all) => {
          const next = all[i + 1]
          const label =
            i === all.length - 1
              ? `≥${fmt(stop.value, metricUnits)}`
              : next
                ? `${fmt(stop.value, metricUnits)}–${fmt(next.value, metricUnits)}`
                : fmt(stop.value, metricUnits)
          return { color: stop.color, label }
        })
      : viewMode === 'day'
        ? dayLegend()
        : viewMode === 'year'
          ? yearLegend()
          : trendLegend()

  const title =
    viewMode === 'day'
      ? `Daily peak heat index · ${date ? spelledDate(date) : '—'}`
      : ramp
        ? `${metricLabel} · ${metricUnits}`
        : viewMode === 'year'
          ? `Mean heat index · ${year ?? 'latest'}`
          : 'Warming rate · °C/yr'

  const valueRange =
    ramp && valueMin != null && valueMax != null
      ? `${fmt(valueMin, metricUnits)} – ${fmt(valueMax, metricUnits)}`
      : null

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-[600] w-[17.5rem] max-w-[calc(100vw-1.5rem)]">
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
          <IconChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="border-t border-white/10 px-3 py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {title}
              </span>
              <span className="font-mono text-[10px] text-slate-500">{metricUnits}</span>
            </div>
            <div className="space-y-1">
              {bins.map((bin) => (
                <LegendRow key={bin.label} color={bin.color} label={bin.label} />
              ))}
            </div>

            {ramp && ramp.length > 0 && (
              <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
                <div className="flex items-baseline gap-2 text-[10px]">
                  <span className="font-semibold text-slate-100">Range</span>
                  <span className="text-slate-400">{valueRange}</span>
                </div>
                <div className="flex items-baseline gap-2 text-[10px]">
                  <span className="font-semibold text-slate-100">No data</span>
                  <span className="text-slate-400">{noDataCount} of {coverage.total} areas</span>
                </div>
                <div className="flex items-baseline gap-2 text-[10px]">
                  <span className="font-semibold text-slate-100">Scale</span>
                  <span className="text-slate-400 capitalize">{method}</span>
                </div>
                <LegendRow color={MISSING_TINT} label="No usable value" />
              </div>
            )}

            <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
              {viewMode !== 'day' && <LegendRow color="#3b82f6" label="Decreasing trend" />}
              <LegendRow color="#1f2937" label="Data pending" />
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-2.5 w-5 rounded-sm border-2 border-heat-hotline" />
                <span>Significant (α = 0.05)</span>
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-2.5 w-5 rounded-sm border-2 border-dashed border-heat-hotline" />
                <span>Not significant — still ranked</span>
              </div>
            </div>

            <div className="mt-2.5 border-t border-white/10 pt-2 text-[10px] leading-4 text-slate-500">
              {coverage.withData} of {coverage.total} LGUs joined. POWER 0.5° grid · municipality resolution.
              {viewMode === 'day' ? ' Daily value shown for this day; neighbours share one grid cell.' : ''}
            </div>

            {onBrowse && (
              <button
                type="button"
                onClick={onBrowse}
                className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                <IconList className="h-3.5 w-3.5" />
                Browse municipalities
              </button>
            )}

            <div className="mt-2 text-[9px] leading-[0.875rem] text-slate-600">
              Imagery © Esri, Maxar, Earthstar Geographics · Boundaries: geoBoundaries (CC BY 4.0) · Data: NASA POWER
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
