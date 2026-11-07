import { savedKey } from '../savedStore.js'

const fmtInt = (n) => new Intl.NumberFormat('en-US').format(n)
const fmtP = (p) => (p == null ? '—' : p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`)
const arrow = (dir) => (dir === 'increasing' ? '▲' : dir === 'decreasing' ? '▼' : '■')
const fmtSlope = (slope) => (Number.isFinite(slope) ? `${slope >= 0 ? '+' : ''}${slope.toFixed(3)} °C/yr` : '—')

function SigPill({ trend }) {
  const significant = Boolean(trend?.is_significant)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
        significant ? 'bg-heat-sig text-white' : 'border border-slate-500 text-slate-300'
      }`}
    >
      {significant ? 'Significant' : 'Not significant'}
    </span>
  )
}

function TrendValue({ trend }) {
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
      className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
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

export default function RankingTable({
  rows = [],
  mode = 'slope',
  savedKeys = new Set(),
  onToggleSave = null,
  canSave = false,
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-white/10 bg-heat-surface/70 shadow-hud md:block">
        <div className="bih-scroll max-h-[calc(100vh-21rem)] overflow-auto">
          <table className="w-full min-w-[48rem] border-collapse text-sm tabular-nums">
            <thead className="sticky top-0 z-10 bg-heat-deep/95 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 backdrop-blur">
              <tr className="border-b border-white/10">
                <th scope="col" className="px-3 py-2.5">Save</th>
                <th scope="col" className="px-3 py-2.5">Rank</th>
                <th scope="col" className="px-3 py-2.5">Municipality</th>
                <th scope="col" className="px-3 py-2.5">Province</th>
                <th scope="col" className="px-3 py-2.5">Trend</th>
                <th scope="col" className="px-3 py-2.5">Significance</th>
                <th scope="col" className="px-3 py-2.5">Sample</th>
                <th scope="col" className={`px-3 py-2.5 ${mode === 'danger' ? 'text-heat-amber' : ''}`}>
                  Danger days (45y)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => {
                const t = m?.trend ?? {}
                const isSaved = savedKeys.has(savedKey(m?.name, m?.province))
                return (
                  <tr
                    key={`${m?.id ?? m?.name ?? i}|${m?.province ?? ''}`}
                    className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.035]"
                  >
                    <td className="px-3 py-2">
                      <SaveButton row={m} isSaved={isSaved} canSave={canSave} onToggleSave={onToggleSave} />
                    </td>
                    {/* rank comes from the unfiltered order, so the saved view keeps true positions */}
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-400">{m?.rank ?? i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-100">{m?.name ?? 'Unknown'}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-400">{m?.province ?? ''}</td>
                    <td className="px-3 py-2"><TrendValue trend={t} /></td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <SigPill trend={t} />
                        <span className="font-mono text-[10px] text-slate-500">{fmtP(t.p_value)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {m?.sample?.n_days != null ? `${fmtInt(m.sample.n_days)} d · ${fmtInt(m.sample.n_years ?? 0)} y` : '—'}
                    </td>
                    <td className={`px-3 py-2 font-mono text-xs ${mode === 'danger' ? 'font-semibold text-heat-amber' : 'text-slate-200'}`}>
                      {Number.isFinite(m?.total_danger_days_45y) ? fmtInt(m.total_danger_days_45y) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="space-y-2 md:hidden">
        {rows.map((m, i) => {
          const t = m?.trend ?? {}
          const isSaved = savedKeys.has(savedKey(m?.name, m?.province))
          return (
            <li
              key={`${m?.id ?? m?.name ?? i}|${m?.province ?? ''}`}
              className="rounded-xl border border-white/10 bg-heat-surface/70 p-3 shadow-hud"
            >
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/25 font-mono text-xs font-bold text-slate-400">
                  {m?.rank ?? i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-slate-100">{m?.name ?? 'Unknown'}</h3>
                  <p className="truncate text-[11px] text-slate-500">{m?.province ?? ''}</p>
                </div>
                <SaveButton row={m} isSaved={isSaved} canSave={canSave} onToggleSave={onToggleSave} />
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-2.5">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Trend</div>
                  <div className="mt-0.5"><TrendValue trend={t} /></div>
                </div>
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Danger days</div>
                  <div className={`mt-0.5 font-mono text-xs ${mode === 'danger' ? 'font-semibold text-heat-amber' : 'text-slate-200'}`}>
                    {Number.isFinite(m?.total_danger_days_45y) ? fmtInt(m.total_danger_days_45y) : '—'}
                  </div>
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2">
                  <SigPill trend={t} />
                  <span className="font-mono text-[10px] text-slate-500">{fmtP(t.p_value)}</span>
                  <span className="ml-auto font-mono text-[10px] text-slate-500">
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
