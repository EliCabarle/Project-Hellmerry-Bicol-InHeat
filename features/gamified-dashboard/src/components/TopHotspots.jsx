// "Most people at risk" — the LGU-facing exposure table.
//
// Ordered by person-days of danger (population x days above 42 °C), not by
// warming rate: a slope is a climate statistic an LGU cannot act on, while
// exposure is the number a mayor can put in a memo.
//
// Columns come from the COLUMNS descriptor below, so the header row and the
// body always agree on how many columns exist. Adding or removing a column is
// a one-line array edit — no header/body drift, no :nth-child CSS.
import { fmtInt, fmtP, fmtCI, fmtSlope, arrow } from './DashboardTable.jsx'
import DualLabel from './DualLabel.jsx'
import CollapsibleSection from './CollapsibleSection.jsx'
import { LABELS } from '../labels.js'

const fmtCompact = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${Math.round(v / 1e3)}k`
  return String(Math.round(v))
}

// One descriptor per column. `render` owns the cell body, so the same array
// drives the desktop table and the mobile card list.
const COLUMNS = [
  {
    key: 'rank',
    header: '#',
    width: 'w-[52px]',
    render: (m) => (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#F3EFE9] text-xs font-bold text-[#8C847A]">
        {m?.rank ?? '—'}
      </span>
    ),
  },
  {
    key: 'name',
    header: LABELS.thMunicipality.plain,
    tech: LABELS.thMunicipality.tech,
    width: 'w-[28%]',
    render: (m, { onSelect }) => (
      <div className="min-w-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            // Selecting is the primary action here: the row explains WHY this
            // place is exposed. Jumping to the finder card is the secondary
            // action, offered in the action column instead.
            onSelect?.(m)
          }}
          aria-label={`Explain why ${m?.name ?? 'municipality'} is at risk`}
          className="block max-w-full cursor-pointer truncate text-left font-semibold text-[#2D2D2D] hover:text-[#D96C4D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96C4D]"
        >
          {m?.name ?? 'Unknown'}
        </button>
        <span className="block truncate text-xs text-[#8C847A]">{m?.province ?? ''}</span>
      </div>
    ),
  },
  {
    key: 'population',
    header: 'Population',
    tech: 'SEDAC GPW 2020',
    width: 'w-[13%]',
    align: 'right',
    render: (m) => (
      <span className="font-mono text-xs text-[#2D2D2D]">
        {Number.isFinite(m?.population_2020) ? fmtInt(m.population_2020) : '—'}
      </span>
    ),
  },
  {
    // The headline metric: people x days above the danger threshold, with the
    // arithmetic shown so the number explains itself, and an in-cell bar for
    // magnitude (the value is always present — colour never carries it alone).
    key: 'personDays',
    header: 'Person-Days of Danger',
    tech: 'population × days above 42 °C',
    width: 'w-[30%]',
    render: (m, { maxPersonDays }) => {
      const pd = Number.isFinite(m?.person_days_danger) ? m.person_days_danger : 0
      const days = Number.isFinite(m?.total_danger_days_45y) ? m.total_danger_days_45y : 0
      const pop = Number.isFinite(m?.population_2020) ? m.population_2020 : 0
      const pct = maxPersonDays > 0 ? Math.round((pd / maxPersonDays) * 100) : 0
      return (
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold tracking-tight text-[#2D2D2D]">
              {fmtCompact(pd)}
            </span>
            <span
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#F3EFE9]"
              aria-hidden="true"
            >
              <span className="block h-full rounded-full bg-[#D96C4D]" style={{ width: `${pct}%` }} />
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-[#A79C90]">
            {days} {days === 1 ? 'day' : 'days'} × {pop.toLocaleString()} people
          </p>
        </div>
      )
    },
  },
  {
    // Significance, its p-value and its CI are analyst-only: the whole column
    // appears in one mode or the other, so the header and the body can never
    // disagree on how many columns exist.
    key: 'sig',
    header: LABELS.hotspotsHeaderSignificance.plain,
    tech: LABELS.hotspotsHeaderSignificance.tech,
    width: 'w-[20%]',
    analystOnly: true,
    render: (m) => {
      const t = m?.trend ?? {}
      const significant = Boolean(t?.is_significant)
      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold ${
              significant ? 'bg-[#D96C4D]/10 text-[#D96C4D]' : 'border border-[#D96C4D]/30 text-[#8C847A]'
            }`}
          >
            {significant ? 'Significant' : 'Not significant'}
          </span>
          <span className="font-mono text-[11px] text-[#8C847A]">
            {fmtP(t?.p_value)} · CI {fmtCI(t)}
          </span>
        </div>
      )
    },
  },
  {
    key: 'slope',
    header: LABELS.hotspotsHeaderWarming.plain,
    tech: LABELS.hotspotsHeaderWarming.tech,
    width: 'w-[14%]',
    align: 'right',
    analystOnly: true,
    render: (m) => {
      const t = m?.trend ?? {}
      const warming = t?.direction !== 'decreasing'
      return (
        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-xs font-bold ${
            warming ? 'bg-[#C0392B]/10 text-[#C0392B]' : 'bg-[#1E8449]/10 text-[#1E8449]'
          }`}
        >
          <span aria-hidden="true">{arrow(t?.direction)}</span>
          {fmtSlope(t?.slope_c_per_year)}
        </span>
      )
    },
  },
  {
    key: 'action',
    header: '',
    width: 'w-[128px]',
    align: 'right',
    render: (m, { onShowOnMap, onShowInFinder }) => (
      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onShowInFinder?.(m?.name, m?.province)
          }}
          aria-label={`Open the ${m?.name ?? 'municipality'} card in the finder`}
          className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C847A] hover:text-[#C2410C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]"
        >
          Card →
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onShowOnMap?.(m)
          }}
          aria-label={`Show ${m?.name ?? 'municipality'} on the map`}
          className="cursor-pointer whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-[#C2410C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]"
        >
          Map
        </button>
      </div>
    ),
  },
]

export default function TopHotspots({
  rows = [],
  mode = 'person-days',
  onShowOnMap = null,
  onShowInFinder = null,
  onSelect = null,
  isAnalyst = false,
  note = null,
  maxPersonDays = 0,
}) {
  if (rows.length === 0) return null
  const ctx = { isAnalyst, onShowOnMap, onSelect, onShowInFinder, maxPersonDays }
  // Analyst-only columns (significance, p-value, CI, warming rate) drop out
  // entirely in public view — one filter, so header and body stay in lockstep.
  const visible = COLUMNS.filter((c) => !c.analystOnly || isAnalyst)

  return (
    <CollapsibleSection
      title="Most people at risk"
      ariaLabel="Municipalities ranked by people exposed to extreme heat"
      aside={<span className="text-xs text-[#8C847A]">{note ?? 'Ranked by people exposed · jump to the map'}</span>}
      className="mt-4"
    >
      {/* Mobile: vertical card list — no horizontal scroll at any width. */}
      <ul role="list" aria-label="Municipalities with the most people exposed" className="md:hidden divide-y divide-[#F3EFE9]/70 p-2">
        {rows.map((m) => {
          const t = m?.trend ?? {}
          const pd = Number.isFinite(m?.person_days_danger) ? m.person_days_danger : 0
          const days = Number.isFinite(m?.total_danger_days_45y) ? m.total_danger_days_45y : 0
          const pop = Number.isFinite(m?.population_2020) ? m.population_2020 : 0
          const pct = maxPersonDays > 0 ? Math.round((pd / maxPersonDays) * 100) : 0
          return (
            <li
              key={`${m?.id ?? m?.name ?? Math.random()}|${m?.province ?? ''}`}
              className="rounded-[1.25rem] p-4 border-none bg-white shadow-[0_4px_12px_rgb(0,0,0,0.03)]"
            >
              <div
                className="flex items-start gap-3"
                onClick={() => onSelect?.(m)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect?.(m)
                  }
                }}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F3EFE9] font-mono text-xs font-bold text-[#8C847A]">
                  {m?.rank ?? '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-[#2D2D2D]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect?.(m)
                      }}
                      aria-label={`Explain why ${m?.name ?? 'municipality'} is at risk`}
                      className="block max-w-full cursor-pointer truncate text-left hover:text-[#D96C4D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96C4D]"
                    >
                      {m?.name ?? 'Unknown'}
                    </button>
                  </h3>
                  <p className="truncate text-xs text-[#8C847A]">{m?.province ?? ''}</p>
                </div>
              </div>

              {/* The headline number comes first on mobile too. */}
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold tracking-tight text-[#2D2D2D]">
                    {fmtCompact(pd)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C847A]">
                    person-days
                  </span>
                </div>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#F3EFE9]">
                  <span className="block h-full rounded-full bg-[#D96C4D]" style={{ width: `${pct}%` }} />
                </span>
                <p className="mt-1 font-mono text-[10px] text-[#A79C90]">
                  {days} {days === 1 ? 'day' : 'days'} × {pop.toLocaleString()} people
                </p>
              </div>

              <dl className="mt-2.5 grid grid-cols-2 gap-2 text-xs leading-5">
                <div>
                  <dt className="font-semibold text-[#8C847A]">Population</dt>
                  <dd className="font-mono text-[#2D2D2D]">
                    {Number.isFinite(m?.population_2020) ? fmtInt(m.population_2020) : '—'}
                  </dd>
                </div>
                <div className="text-right">
                  <dt className="font-semibold text-[#8C847A]">Warming rate</dt>
                  <dd className="font-mono text-[#2D2D2D]">{fmtSlope(t?.slope_c_per_year)}</dd>
                </div>
              </dl>

              {isAnalyst && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                      t?.is_significant ? 'bg-[#D96C4D]/10 text-[#D96C4D]' : 'border border-[#D96C4D]/30 text-[#8C847A]'
                    }`}
                  >
                    {t?.is_significant ? 'Significant' : 'Not significant'}
                  </span>
                  <span className="font-mono text-[11px] text-[#8C847A]">
                    {fmtP(t?.p_value)} · CI {fmtCI(t)}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onShowInFinder?.(m?.name, m?.province)
                }}
                aria-label={`Open the ${m?.name ?? 'municipality'} card in the finder`}
                className="mt-3 mr-2 min-h-11 cursor-pointer rounded-md border border-[#8C847A]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#8C847A] hover:bg-[#F3EFE9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]"
              >
                Open card →
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onShowOnMap?.(m)
                }}
                aria-label={`Show ${m?.name ?? 'municipality'} on the map`}
                className="mt-3 min-h-11 cursor-pointer rounded-md border border-[#FB923C]/50 bg-[#FB923C]/20 px-3 py-1.5 text-xs font-semibold text-[#C2410C] hover:bg-[#FB923C]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]"
              >
                Show on map
              </button>
            </li>
          )
        })}
      </ul>

      {/* Desktop (≥768px): the table renders straight from COLUMNS, so the header
          row and the body can never disagree on column count. */}
      <div className="hidden overflow-x-auto md:block rounded-[2rem] border-none bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <table className="w-full border-collapse text-sm tabular-nums table-fixed">
          <caption className="sr-only">Municipalities ranked by people exposed to extreme heat, with a jump-to-map action per row</caption>
          <thead className="bg-[#FAF7F2] text-[#8C847A] text-xs font-bold uppercase">
            <tr>
              {visible.map((col) => (
                <th key={col.key} scope="col" className={`px-4 py-3 ${col.width} ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {col.header ? (
                    <DualLabel
                      label={col.header}
                      tech={isAnalyst ? (col.tech ?? '') : ''}
                      className="text-xs"
                      techClassName="font-normal normal-case tracking-normal text-[#8C847A]"
                    />
                  ) : (
                    <span className="sr-only">Map</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr
                key={`${m?.id ?? m?.name}|${m?.province ?? ''}`}
                className="border-b-0 border-l-2 border-transparent transition-colors duration-150 hover:border-l-[#D96C4D] hover:bg-[#FFF9F0] cursor-pointer"
                onClick={() => onSelect?.(m)}
              >
                {visible.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {col.render(m, ctx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  )
}
