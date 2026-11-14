import { useState } from 'react'
import { recordForYear, formatTrend, dayBand } from '../gis/yearRamp.js'
import { spelledDate } from '../state/dateModel.js'
import { IconThermometer, IconTrend, IconX } from './Icons.jsx'

const fmtInt = (n) => new Intl.NumberFormat('en-US').format(n)

// Narration language is a reading preference, not app locale: UI chrome stays
// English, only the pre-written explanation switches (CONCEPT: UI EN, narration EN + fil).
const LANG_KEY = 'bih:narration-lang'

function readNarrationLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'fil' ? 'fil' : 'en'
  } catch {
    return 'en'
  }
}

function SigPill({ significant }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
        significant ? 'bg-heat-sig text-white' : 'border border-slate-500 text-slate-300'
      }`}
    >
      <IconTrend className="h-2.5 w-2.5" />
      {significant ? 'Significant' : 'Not significant'}
    </span>
  )
}

function BandPill({ label }) {
  return (
    <span className="inline-flex max-w-[10rem] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
      <IconThermometer className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  )
}

// Inline stat: tiny label and mono value share one baseline so the whole card
// body sits on a single aligned line (no stacked label-over-value columns).
function Stat({ label, value, highlight = false }) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span
        className={`font-mono font-semibold ${
          highlight ? 'text-base text-heat-amber' : 'text-xs text-slate-100'
        }`}
      >
        {value}
      </span>
    </span>
  )
}

export default function MunicipalityInfoCard({
  feature,
  year = null,
  viewMode = 'trend',
  date = null,
  dayValues = null,
  // Measured overlay height (px). The card sits just above the timeline panel —
  // no hard-coded bottom offset, so a taller Day panel can't be covered.
  bottomOffset = 172,
  onClose,
}) {
  // Hook must run before the !feature early return.
  const [lang, setLang] = useState(readNarrationLang)
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
  const significant = Boolean(trend.is_significant)
  // Pre-written explanation from the narrative bank: the numbers are already in
  // the sentence, so nothing is computed or fetched here. FIL falls back to EN.
  const narration = n?.narration ?? null
  const hasFil = Boolean(narration?.fil)
  const narrLang = lang === 'fil' && hasFil ? 'fil' : 'en'
  const narrText = narration?.[narrLang] ?? null
  const chooseLang = (next) => {
    setLang(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // private mode: the choice just doesn't persist
    }
  }

  const isDay = viewMode === 'day'
  const dayValue = isDay && n && dayValues instanceof Map ? dayValues.get(n.id) : undefined
  const dayOk = Number.isFinite(dayValue)
  const band = dayOk ? dayBand(dayValue) : null
  // Day mode: date rides inline with the province tag, keeping the body to one line.
  const tag = [province, isCity ? 'City' : null, isDay && date ? spelledDate(date) : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <aside
      aria-label={`Details for ${name}`}
      style={{ '--bih-card-bottom': `${bottomOffset}px` }}
      className="pointer-events-auto absolute left-3 right-16 bottom-[var(--bih-card-bottom)] z-[760] rounded-2xl border border-white/10 bg-heat-surface/80 p-3 text-slate-100 shadow-hud backdrop-blur-md md:inset-x-0 md:top-auto md:mx-auto md:w-full md:max-w-2xl"
    >
      {!n ? (
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-clay-text-heading" aria-live="polite">
            {name}
          </h2>
          <p className="shrink-0 text-[11px] text-slate-400">Trend data pending — arriving soon.</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close details for ${name}`}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* One aligned line: name + tag, stats, pills, close. Wraps (never
              clips) on narrow screens; single line from md up. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <h2 className="min-w-0 truncate text-sm font-semibold tracking-tight text-clay-text-heading" aria-live="polite">
                {name}
              </h2>
              <span className="shrink-0 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {tag}
              </span>
            </span>
            {isDay ? (
              <>
                <Stat highlight label="Peak" value={dayOk ? `${dayValue.toFixed(1)} °C` : 'No data'} />
                <Stat label="Warming" value={formatTrend(trend.slope_c_per_year)} />
                <SigPill significant={significant} />
                <BandPill label={band ?? 'No data for this day'} />
              </>
            ) : (
              <>
                <Stat highlight label={`${rowYear} mean HI`} value={heat} />
                <Stat label="Warming" value={formatTrend(trend.slope_c_per_year)} />
                <SigPill significant={significant} />
                <BandPill label={row?.danger_band ?? '—'} />
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close details for ${name}`}
              className="ml-auto inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>

          {!isDay && narrText ? (
            <div className="mt-1.5 flex items-start gap-2">
              {(() => {
                // lang matters: Filipino text without it is a WCAG 3.1.2 failure.
                const long = narrText.length > 140
                return (
                  <p
                    lang={narrLang}
                    className={`min-w-0 flex-1 text-[11px] leading-4 text-slate-300 ${long ? 'line-clamp-2' : ''}`}
                  >
                    {narrText}
                  </p>
                )
              })()}
              {hasFil ? (
                <div role="group" aria-label="Narration language" className="flex shrink-0 items-center gap-0.5 rounded border border-white/10 bg-black/30 p-0.5">
                  {[['en', 'EN'], ['fil', 'Fil']].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => chooseLang(id)}
                      aria-pressed={narrLang === id}
                      className={`cursor-pointer rounded px-1 py-0.5 text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
                        narrLang === id
                          ? 'bg-heat-amber text-slate-950'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : !isDay ? (
            <p className="mt-1.5 text-[11px] text-slate-500">Explanation pending for this area.</p>
          ) : null}

          <p className="mt-1 text-[9px] leading-3 text-slate-500">
            {isDay ? (
              <>
                Sample: <span className="font-mono">1</span> day · association, not causation
              </>
            ) : (
              <>
                <span className="font-mono">{fmtInt(n.sample?.n_days ?? 0)}</span> days ·{' '}
                <span className="font-mono">{fmtInt(n.sample?.n_years ?? 0)}</span> years · POWER ~55
                km grid · association, not causation
              </>
            )}
          </p>
        </>
      )}
    </aside>
  )
}
