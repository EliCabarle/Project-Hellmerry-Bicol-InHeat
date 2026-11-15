// Municipality ranking table — one rendering shared by desktop (table) and
// mobile (card list). The card/clip wrapper now lives in the province
// <section> rendered by DashboardScreen; this component emits table + list only.
import { savedKey } from '../savedStore.js'
import DualLabel from './DualLabel.jsx'
import { LABELS } from '../labels.js'

export const fmtInt = (n) => new Intl.NumberFormat('en-US').format(n)
export const fmtP = (p) => (p == null ? '—' : p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`)
export const arrow = (dir) => (dir === 'increasing' ? '▲' : dir === 'decreasing' ? '▼' : '■')
export const fmtSlope = (slope) => (Number.isFinite(slope) ? `${slope >= 0 ? '+' : ''}${slope.toFixed(3)} °C/yr` : '—')

// Theil-Sen slope 95% confidence interval, as it arrives on the trend record.
export const fmtCI = (t) =>
  Number.isFinite(t?.slope_ci_low) && Number.isFinite(t?.slope_ci_high)
    ? `[${t.slope_ci_low.toFixed(3)}, ${t.slope_ci_high.toFixed(3)}]`
    : '—'

export function SigPill({ trend }) {
  const significant = Boolean(trend?.is_significant)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
        significant ? 'bg-heat-sig text-white' : 'border border-slate-500 text-slate-300'
      }`}
    >
      {significant ? 'Significant' : 'Not significant'}
    </span>
  )
}

export function TrendValue({ trend }) {
  return (
    <span className="whitespace-nowrap font-mono text-xs text-slate-200">
      <span aria-hidden="true" className="mr-1 text-slate-400">{arrow(trend?.direction)}</span>
      {fmtSlope(trend?.slope_c_per_year)}
    </span>
  )
}

function SaveButton({ row, isSaved, canSave, onToggleSave }) {
  const label = `${isSaved ? 'Remove saved place' : 'Save place'}: ${row?.name ?? 'municipality'}`
  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={canSave ? label : 'Sign in to save places'}
      title={canSave ? label : 'Sign in to save places'}
      disabled={!canSave}
      onClick={() => onToggleSave?.(row)}
      className={`inline-flex cursor-pointer items-center gap-1 min-h-11 rounded-md border px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
        isSaved
          ? 'border-heat-amber/50 bg-heat-amber/20 text-heat-amber'
          : canSave
            ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white'
            : 'cursor-not-allowed border-white/5 text-slate-600'
      }`}
    >
      {isSaved ? 'Saved' : 'Save'}
    </button>
  )
}

export default function DashboardTable({
  rows = [],
  mode = 'slope',
  savedKeys = new Set(),
  onToggleSave = null,
  canSave = false,
  onShowInFinder = null,
  isAnalyst = false,
}) {
  const dangerLabel = String(mode).startsWith('danger') ? 'font-semibold text-heat-amber' : 'text-slate-200'

  return (
    <>
      {/* Desktop table — clipped by the province <section>, never its own scroller. */}
      <div className="hidden overflow-clip md:block">
        <table className="w-full lg:min-w-[44rem] border-collapse text-sm tabular-nums table-fixed">
          <caption className="sr-only">Municipality list, sorted by the selected order</caption>
          <thead className="sticky top-0 z-10 bg-heat-deep/95 text-left text-slate-500 backdrop-blur">
            <tr className="border-b border-white/10">
              <th scope="col" className="px-3 py-3 w-[64px]">Save</th>
              <th scope="col" className="px-3 py-3 w-[32px]">
                <DualLabel
                  label={LABELS.thRank.plain}
                  tech={LABELS.thRank.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="px-3 py-3 w-[140px]">
                <DualLabel
                  label={LABELS.thMunicipality.plain}
                  tech={LABELS.thMunicipality.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="px-3 py-3 w-[120px]">
                <DualLabel
                  label={LABELS.thProvince.plain}
                  tech={LABELS.thProvince.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="px-3 py-3 w-[96px]">
                <DualLabel
                  label={LABELS.thTrend.plain}
                  tech={LABELS.thTrend.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="px-3 py-3 w-[128px]">
                <DualLabel
                  label={LABELS.thSignificance.plain}
                  tech={isAnalyst ? LABELS.thSignificance.tech : ''}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="hidden px-3 py-3 w-[120px] lg:table-cell">
                <DualLabel
                  label={LABELS.thSample.plain}
                  tech={LABELS.thSample.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className={`px-3 py-3 w-[96px] ${dangerLabel}`}>
                <DualLabel
                  label={LABELS.thDangerDays.plain}
                  tech={LABELS.thDangerDays.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const t = m?.trend ?? {}
              const isSaved = savedKeys.has(savedKey(m?.name, m?.province))
              return (
                <tr
                  key={`${m?.id ?? m?.name ?? ''}|${m?.province ?? ''}`}
                  className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.035]"
                >
                  <td className="px-3 py-2 w-[64px]">
                    <SaveButton row={m} isSaved={isSaved} canSave={canSave} onToggleSave={onToggleSave} />
                  </td>
                  <td className="px-3 py-2 w-[32px] font-mono text-xs font-semibold text-slate-400">
                    {m?.rank ?? '—'}
                  </td>
                  <td className="px-3 py-2 w-[140px]">
                    <button
                      type="button"
                      onClick={() => onShowInFinder?.(m?.name, m?.province)}
                      aria-label={`Show ${m?.name ?? 'municipality'} in the municipality finder`}
                      className="block max-w-full cursor-pointer truncate text-left font-medium text-slate-100 hover:text-heat-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
                    >
                      {m?.name ?? 'Unknown'}
                    </button>
                  </td>
                  <td className="px-3 py-2 w-[120px] text-slate-400 truncate">{m?.province ?? ''}</td>
                  <td className="px-3 py-2 w-[96px]"><TrendValue trend={t} /></td>
                  <td className="px-3 py-2 w-[128px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SigPill trend={t} />
                      {isAnalyst && (
                        <>
                          <span className="font-mono text-xs text-slate-500">{fmtP(t.p_value)}</span>
                          <span className="font-mono text-[10px] text-slate-400">CI {fmtCI(t)}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 w-[120px] text-xs text-slate-400 lg:table-cell">
                    {m?.sample?.n_days != null ? `${fmtInt(m.sample.n_days)} d · ${fmtInt(m.sample.n_years ?? 0)} y` : '—'}
                  </td>
                  <td className={`px-3 py-2 w-[96px] font-mono text-xs ${dangerLabel}`}>
                    {Number.isFinite(m?.total_danger_days_45y) ? fmtInt(m.total_danger_days_45y) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list — province line lives on the sticky section header above. */}
      <ul aria-label="Municipality heat dashboard" className="space-y-2 md:hidden">
        {rows.map((m) => {
          const t = m?.trend ?? {}
          const isSaved = savedKeys.has(savedKey(m?.name, m?.province))
          return (
            <li
              key={`${m?.id ?? m?.name ?? ''}|${m?.province ?? ''}`}
              className="rounded-xl border border-white/10 bg-heat-surface/70 p-3 shadow-hud"
            >
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/25 font-mono text-xs font-bold text-slate-400">
                  {m?.rank ?? '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-slate-100">
                    <button
                      type="button"
                      onClick={() => onShowInFinder?.(m?.name, m?.province)}
                      aria-label={`Show ${m?.name ?? 'municipality'} in the municipality finder`}
                      className="block max-w-full cursor-pointer truncate text-left hover:text-heat-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
                    >
                      {m?.name ?? 'Unknown'}
                    </button>
                  </h3>
                </div>
                <SaveButton row={m} isSaved={isSaved} canSave={canSave} onToggleSave={onToggleSave} />
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-2.5">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trend</div>
                  <div className="mt-0.5 min-w-0"><TrendValue trend={t} /></div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Danger days</div>
                  <div className={`mt-0.5 font-mono text-xs min-w-0 ${dangerLabel}`}>
                    {Number.isFinite(m?.total_danger_days_45y) ? fmtInt(m.total_danger_days_45y) : '—'}
                  </div>
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2">
                  <SigPill trend={t} />
                  {isAnalyst && (
                    <>
                      <span className="font-mono text-xs text-slate-500">{fmtP(t.p_value)}</span>
                      <span className="font-mono text-[10px] text-slate-400">CI {fmtCI(t)}</span>
                    </>
                  )}
                  <span className="ml-auto font-mono text-xs text-slate-500">
                    {m?.sample?.n_days != null ? `${fmtInt(m.sample.n_days)} d · ${fmtInt(m.sample.n_years ?? 0)} y` : '—'}
                  </span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
