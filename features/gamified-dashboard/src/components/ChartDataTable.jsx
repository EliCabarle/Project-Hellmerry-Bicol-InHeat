// Collapsible "DATA TABLE" under a chart — the non-colour encoding that makes
// each chart readable for screen readers, for exact numbers, and on slow
// renderers. Rows always mirror what the chart draws; nothing is re-computed.

export default function ChartDataTable({ caption, columns = [], rows = [], empty = 'No rows to show' }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <details className="mt-2 border-t border-white/5 pt-2">
        <summary className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber">
          ▶ Data table
        </summary>
        <p className="mt-2 text-xs text-slate-500">{empty}</p>
      </details>
    )
  }
  return (
    <details className="mt-2 border-t border-white/5 pt-2">
      <summary className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber">
        ▶ Data table
      </summary>
      <div className="mt-2 max-h-56 overflow-y-auto bih-scroll">
        <table className="w-full border-collapse text-xs tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-white/10 text-left text-[9px] uppercase tracking-[0.14em] text-slate-500">
              {columns.map((col) => (
                <th key={col.key} scope="col" className="px-2 py-1 font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 last:border-0">
                {columns.map((col) => {
                  const raw = row?.[col.key]
                  const shown = typeof col.format === 'function' ? col.format(raw, row) : raw
                  return (
                    <td key={col.key} className={`px-2 py-1 ${col.numeric === false ? 'text-slate-300' : 'text-right font-mono text-slate-300'}`}>
                      {shown}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
