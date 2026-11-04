import { useMemo, useState } from 'react'
import { rankMunicipalities } from './ranking.js'
import RankingTable from './components/RankingTable.jsx'

const META_FALLBACK = 'Annual mean peak heat index · Theil-Sen + Mann-Kendall · α = 0.05 · Danger > 42 °C'

export default function RankingScreen({
  status = 'idle',
  error = null,
  reload,
  narratives = null,
  coverage = { withData: 0, total: 0 },
}) {
  const [mode, setMode] = useState('slope')
  const rows = useMemo(() => rankMunicipalities(narratives?.municipalities ?? [], mode), [narratives, mode])
  const period = narratives?.meta?.period
  const periodLine = period?.start?.slice(0, 4) && period?.end?.slice(0, 4)
    ? ` · ${period.start.slice(0, 4)}–${period.end.slice(0, 4)}`
    : ''
  const threshold = Number.isFinite(narratives?.meta?.danger_threshold_c)
    ? ` · Danger > ${narratives.meta.danger_threshold_c} °C`
    : ' · Danger > 42 °C'

  return (
    <div className="h-full overflow-y-auto bg-heat-bg px-4 py-4 text-slate-100">
      <h1 className="text-lg font-semibold">Municipality ranking</h1>
      <p className="mt-0.5 text-xs text-slate-400">
        {META_FALLBACK.replace('1981–2025 · ', '')}{periodLine}{threshold}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        Trend data available for <span className="font-semibold text-slate-200">{coverage.withData}</span> of{' '}
        <span className="font-semibold text-slate-200">{coverage.total}</span> municipalities.
        {coverage.total > coverage.withData && ' The remaining ones appear as soon as data arrives.'}
      </p>
      <div role="group" aria-label="Order ranking by" className="mt-3 flex gap-2">
        <button
          type="button"
          aria-pressed={mode === 'slope'}
          onClick={() => setMode('slope')}
          className={`cursor-pointer rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
            mode === 'slope' ? 'bg-heat-hot font-semibold text-white' : 'bg-heat-dark text-slate-300 hover:bg-slate-700'
          }`}
        >
          Warming rate
        </button>
        <button
          type="button"
          aria-pressed={mode === 'danger'}
          onClick={() => setMode('danger')}
          className={`cursor-pointer rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
            mode === 'danger' ? 'bg-heat-hot font-semibold text-white' : 'bg-heat-dark text-slate-300 hover:bg-slate-700'
          }`}
        >
          Danger days (45y)
        </button>
      </div>

      {status === 'loading' && (
        <div aria-busy="true" className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-heat-dark/70" />
          ))}
        </div>
      )}
      {status === 'error' && (
        <div role="alert" className="mt-4 rounded border border-heat-hot bg-heat-dark px-3 py-2 text-sm">
          <div className="font-semibold">Could not load trend data</div>
          <div className="mb-2 text-slate-400">{error}</div>
          <button
            type="button"
            onClick={() => reload?.()}
            className="cursor-pointer rounded bg-heat-hot px-2 py-1 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            Try again
          </button>
        </div>
      )}
      {status === 'ready' && rows.length === 0 && (
        <div className="mt-4 rounded border border-slate-700 bg-heat-dark px-3 py-2 text-sm text-slate-300">
          No trend data yet — check back soon.
        </div>
      )}
      {status === 'ready' && rows.length > 0 && (
        <div className="mt-4">
          <RankingTable rows={rows} mode={mode} />
          {narratives?.meta?.disclaimer && (
            <p className="mt-3 text-[11px] leading-4 text-slate-500">{narratives.meta.disclaimer}</p>
          )}
        </div>
      )}
    </div>
  )
}
