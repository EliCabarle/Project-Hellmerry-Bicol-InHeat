import { recordForYear, formatTrend } from '../gis/yearRamp.js'
import { IconThermometer, IconTrend, IconX } from './Icons.jsx'

const fmtInt = (n) => new Intl.NumberFormat('en-US').format(n)
const fmtP = (p) => (p == null ? '—' : p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`)

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold text-slate-100">{value}</div>
      {hint ? <div className="mt-0.5 text-[10px] leading-[0.875rem] text-slate-500">{hint}</div> : null}
    </div>
  )
}

export default function MunicipalityInfoCard({ feature, year = null, onClose }) {
  if (!feature) return null
  const p = feature.properties ?? {}
  const n = p.narrative
  const name = p.adm3_en ?? 'Unknown municipality'
  const province = p.province ?? ''
  const isCity = p.geo_level === 'City'
  const trend = n?.trend ?? {}
  const row = year == null ? n?.latest : recordForYear(n?.series, year) ?? n?.latest
  const rowYear = row?.year ?? year ?? '—'
  const heat = Number.isFinite(row?.mean_heat_index_c) ? `${row.mean_heat_index_c.toFixed(1)} °C` : '—'
  const danger = Number.isFinite(row?.danger_days) ? fmtInt(row.danger_days) : '—'
  const significant = Boolean(trend.is_significant)

  return (
    <aside
      aria-label={`Details for ${name}`}
      className="pointer-events-auto absolute inset-x-3 bottom-28 z-[760] max-h-[46vh] overflow-y-auto rounded-xl border border-white/10 bg-heat-surface/95 p-3.5 text-slate-100 shadow-hud backdrop-blur-md bih-scroll md:inset-x-auto md:bottom-auto md:right-3 md:top-[5.25rem] md:max-h-[calc(100%-7rem)] md:w-[21.5rem]"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {province} · {isCity ? 'City' : 'Municipality'}
          </div>
          <h2 className="mt-0.5 truncate text-base font-semibold tracking-tight text-white" aria-live="polite">
            {name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close details for ${name}`}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      {!n ? (
        <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
          Trend data pending — arriving soon.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label={`${rowYear} mean HI`} value={heat} hint={year == null ? 'latest year' : 'selected year'} />
            <Metric
              label="Warming rate"
              value={formatTrend(trend.slope_c_per_year)}
              hint={significant ? fmtP(trend.p_value) : 'not significant'}
            />
            <Metric label={`${rowYear} danger days`} value={danger} hint="> 42 °C" />
            <Metric
              label="45-year danger days"
              value={Number.isFinite(n.total_danger_days_45y) ? fmtInt(n.total_danger_days_45y) : '—'}
              hint="total exceedances"
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                significant ? 'bg-heat-sig text-white' : 'border border-slate-500 text-slate-300'
              }`}
            >
              <IconTrend className="h-3 w-3" />
              {significant ? 'Significant trend' : 'Not significant'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              <IconThermometer className="h-3 w-3" />
              {row?.danger_band ?? '—'}
            </span>
          </div>

          <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2 text-[11px] leading-4 text-slate-400">
            <div>
              Sample: <span className="font-mono text-slate-200">{fmtInt(n.sample?.n_days ?? 0)}</span> days ·{' '}
              <span className="font-mono text-slate-200">{fmtInt(n.sample?.n_years ?? 0)}</span> years
            </div>
            <div className="text-[10px] leading-4 text-slate-500">
              Association, not causation. POWER ~55 km grid; municipality is the smallest unit.
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
