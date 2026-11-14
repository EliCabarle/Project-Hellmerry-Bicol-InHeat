// "Top hotspots" — the ten most extreme LGUs under the selected ordering, each
// with a jump to the map (Q1 contract: onShowOnMap(province-qualified joinKey)).
// Mobile: vertical card list — never a horizontal swipe. Desktop (≥md): table.
import { fmtInt, fmtP, fmtSlope, SigPill } from './DashboardTable.jsx'
import DualLabel from './DualLabel.jsx'
import CollapsibleSection from './CollapsibleSection.jsx'
import { LABELS } from '../labels.js'

export default function TopHotspots({ rows = [], mode = 'slope', onShowOnMap = null, onShowInFinder = null, note = null }) {
  if (rows.length === 0) return null
  const defaultNote = mode === 'danger' ? LABELS.hotspotsNoteDanger.plain : LABELS.hotspotsNoteSlope.plain

  return (
    <CollapsibleSection
      title={LABELS.hotspotsTitle.plain}
      tech={LABELS.hotspotsTitle.tech}
      ariaLabel="Top hotspots — most extreme municipalities"
      aside={<span className="text-xs text-slate-500">{note ?? defaultNote}</span>}
    >
      {/* Mobile: vertical card list — no horizontal scroll at any width. */}
      <ul role="list" aria-label="Top ten hotspots" className="md:hidden divide-y divide-white/10 p-2">
        {rows.map((m) => {
          const t = m?.trend ?? {}
          return (
            <li
              key={`${m?.id ?? m?.name ?? Math.random()}|${m?.province ?? ''}`}
              className="rounded-xl border border-white/10 bg-heat-surface/80 p-3 shadow-hud"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
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
                  <p className="truncate text-xs text-slate-500">{m?.province ?? ''}</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-1 text-xs leading-5">
                {mode === 'danger' ? (
                  <>
                    <dt className="font-semibold text-slate-500">{LABELS.hotspotsHeaderDanger.plain}</dt>
                    <dd className="font-mono text-slate-200">
                      {Number.isFinite(m?.total_danger_days_45y) ? fmtInt(m.total_danger_days_45y) : '—'}
                    </dd>
                  </>
                ) : (
                  <>
                    <dt className="font-semibold text-slate-500">{LABELS.hotspotsHeaderWarming.plain}</dt>
                    <dd className="font-mono text-slate-200">{fmtSlope(t?.slope_c_per_year)}</dd>
                  </>
                )}
              </dl>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <SigPill trend={t} />
                <span className="font-mono text-xs text-slate-500">{fmtP(t?.p_value)}</span>
              </div>

              <button
                type="button"
                onClick={() => onShowOnMap?.(m)}
                aria-label={`Show ${m?.name ?? 'municipality'} on the map`}
                className="mt-2 min-h-11 w-full sm:w-auto cursor-pointer rounded-md border border-heat-amber/50 bg-heat-amber/20 px-3 py-1.5 text-xs font-semibold text-heat-amber hover:bg-heat-amber/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                {LABELS.hotspotsHeaderShowMap.plain}
              </button>
            </li>
          )
        })}
      </ul>

      {/* Desktop (≥768px): table fits 640px content naturally; overflow-x-auto is a
          safety rail only — no min-width forcing a swipe. */}
      <div className="hidden overflow-x-auto md:block rounded-xl border border-white/10 bg-heat-surface/70 shadow-hud">
        <table className="w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">Ten most extreme municipalities, with a jump-to-map action per row</caption>
          <thead className="bg-heat-deep/95 text-left text-slate-500">
            <tr className="border-b border-white/10">
              <th scope="col" className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]">#</th>
              <th scope="col" className="px-3 py-2.5">
                <DualLabel
                  label={LABELS.thMunicipality.plain}
                  tech={LABELS.thMunicipality.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="px-3 py-2.5">
                <DualLabel
                  label={LABELS.thProvince.plain}
                  tech={LABELS.thProvince.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="px-3 py-2.5">
                <DualLabel
                  label={LABELS.hotspotsHeaderWarming.plain}
                  tech={LABELS.hotspotsHeaderWarming.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="px-3 py-2.5">
                <DualLabel
                  label={LABELS.hotspotsHeaderSignificance.plain}
                  tech={LABELS.hotspotsHeaderSignificance.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="px-3 py-2.5">
                <DualLabel
                  label={LABELS.hotspotsHeaderDanger.plain}
                  tech={LABELS.hotspotsHeaderDanger.tech}
                  className="text-xs"
                  techClassName="font-normal normal-case tracking-normal text-slate-400"
                />
              </th>
              <th scope="col" className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                <span className="sr-only">{LABELS.hotspotsHeaderShowMap.plain}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const t = m?.trend ?? {}
              return (
                <tr key={`${m?.id ?? m?.name}|${m?.province ?? ''}`} className="border-b border-white/5 last:border-0 hover:bg-white/[0.035]">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{m?.rank ?? '—'}</td>
                  <td className="px-3 py-2 font-medium text-slate-100 truncate">
                    <button
                      type="button"
                      onClick={() => onShowInFinder?.(m?.name, m?.province)}
                      aria-label={`Show ${m?.name ?? 'municipality'} in the municipality finder`}
                      className="block max-w-full cursor-pointer truncate text-left hover:text-heat-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
                    >
                      {m?.name ?? 'Unknown'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400 truncate">{m?.province ?? ''}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-200">{fmtSlope(t?.slope_c_per_year)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <SigPill trend={t} />
                      <span className="font-mono text-xs text-slate-500">{fmtP(t?.p_value)}</span>
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
    </CollapsibleSection>
  )
}
