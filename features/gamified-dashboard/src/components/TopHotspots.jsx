// "Top hotspots" — the ten most extreme LGUs under the selected ordering, each
// with a jump to the map (Q1 contract: onShowOnMap(province-qualified joinKey)).
import { fmtInt, fmtP, fmtSlope, SigPill } from './DashboardTable.jsx'

export default function TopHotspots({ rows = [], onShowOnMap = null, note = null }) {
  if (rows.length === 0) return null
  return (
    <section
      aria-label="Top hotspots — most extreme municipalities"
      className="rounded-xl border border-white/10 bg-heat-surface/70 shadow-hud"
    >
      <header className="flex items-baseline justify-between gap-2 px-3 py-2.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Top hotspots</h2>
        <span className="text-[10px] text-slate-500">{note ?? 'Highest under the selected ordering'}</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm tabular-nums">
          <caption className="sr-only">Ten most extreme municipalities, with a jump-to-map action per row</caption>
          <thead className="bg-heat-deep/95 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500">
            <tr className="border-b border-white/10">
              <th scope="col" className="px-3 py-2">#</th>
              <th scope="col" className="px-3 py-2">Municipality</th>
              <th scope="col" className="px-3 py-2">Province</th>
              <th scope="col" className="px-3 py-2">Warming rate</th>
              <th scope="col" className="px-3 py-2">Significance</th>
              <th scope="col" className="px-3 py-2">Danger days (45y)</th>
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Show on map</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const t = m?.trend ?? {}
              return (
                <tr key={`${m?.id ?? m?.name ?? i}|${m?.province ?? ''}`} className="border-b border-white/5 last:border-0 hover:bg-white/[0.035]">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-100">{m?.name ?? 'Unknown'}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{m?.province ?? ''}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-200">{fmtSlope(t?.slope_c_per_year)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <SigPill trend={t} />
                      <span className="font-mono text-[10px] text-slate-500">{fmtP(t?.p_value)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-200">
                    {Number.isFinite(m?.total_danger_days_45y) ? fmtInt(m.total_danger_days_45y) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onShowOnMap?.(m)}
                      aria-label={`Show ${m?.name ?? 'municipality'} on the map`}
                      className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.12em] text-heat-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
                    >
                      Show on map
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
