const fmtInt = (n) => new Intl.NumberFormat('en-US').format(n)
const fmtP = (p) => (p == null ? '—' : p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`)
const arrow = (dir) => (dir === 'increasing' ? '▲' : dir === 'decreasing' ? '▼' : '■')

export default function RankingTable({ rows = [], mode = 'slope' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wide text-slate-400">
            <th scope="col" className="px-2 py-1.5">Rank</th>
            <th scope="col" className="px-2 py-1.5">Municipality</th>
            <th scope="col" className="hidden px-2 py-1.5 md:table-cell">Province</th>
            <th scope="col" className="px-2 py-1.5">Trend ({mode === 'danger' ? 'order' : '°C/yr'})</th>
            <th scope="col" className="px-2 py-1.5">Significance</th>
            <th scope="col" className="hidden px-2 py-1.5 md:table-cell">Sample</th>
            <th scope="col" className="px-2 py-1.5">Danger days (45y)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => {
            const t = m?.trend ?? {}
            const slope = typeof t.slope_c_per_year === 'number' ? t.slope_c_per_year : null
            return (
              <tr key={m?.id ?? m?.name ?? i} className="border-b border-slate-800 transition-colors duration-200 hover:bg-slate-800/60">
                <td className="px-2 py-1.5 font-semibold text-slate-300">{i + 1}</td>
                <td className="px-2 py-1.5">
                  <div className="font-medium text-slate-100">{m?.name ?? 'Unknown'}</div>
                  <div className="text-xs text-slate-400 md:hidden">{m?.province ?? ''}</div>
                </td>
                <td className="hidden px-2 py-1.5 text-slate-300 md:table-cell">{m?.province ?? ''}</td>
                <td className="px-2 py-1.5 text-slate-100">
                  {slope === null
                    ? '—'
                    : mode === 'danger'
                      ? `${arrow(t.direction)} ${t.direction ?? ''}`
                      : `${arrow(t.direction)} ${slope >= 0 ? '+' : ''}${slope.toFixed(3)} °C/yr`}
                </td>
                <td className="px-2 py-1.5">
                  {t.is_significant ? (
                    <>
                      <span className="inline-block rounded-full bg-heat-hot px-2 py-0 text-[10px] font-semibold leading-4 text-white">Significant</span>
                      <span className="ml-2 text-xs text-slate-400">{fmtP(t.p_value)}</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-block rounded-full border border-slate-500 px-2 py-0 text-[10px] font-semibold leading-4 text-slate-300">Not significant</span>
                      <span className="ml-2 text-xs text-slate-400">{fmtP(t.p_value)}</span>
                    </>
                  )}
                </td>
                <td className="hidden px-2 py-1.5 text-slate-300 md:table-cell">
                  {m?.sample?.n_days != null ? `${fmtInt(m.sample.n_days)} d · ${fmtInt(m.sample.n_years ?? 0)} y` : '—'}
                </td>
                <td className="px-2 py-1.5 text-slate-100">{Number.isFinite(m?.total_danger_days_45y) ? fmtInt(m.total_danger_days_45y) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
