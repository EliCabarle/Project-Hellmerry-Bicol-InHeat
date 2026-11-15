// Narration panel — "Why It Heats". The LGU-facing explanation layer.
//
// Default state (no municipality selected): the regional summary — how many
// people are exposed, and which drivers dominate the region.
//
// Clicked state: that municipality's own conditions (ground temperature,
// vegetation cover) and the concrete actions those conditions imply.
//
// Data shape (verified against narratives.json): a raw municipality row carries
// `narration.en` (nested) and `top_drivers` — NOT `narrationEn`/`drivers`.
// finderData.js flattens the nesting for finder cards only, so rows that come
// straight from `narratives.municipalities` must be read in the raw shape.
import { publicNarration } from '../viewMode.js'
import { lguActions, regionalHeadline, plainDriverLabel } from '../lguAction.js'

function ConditionTile({ label, value, unit, note, tone = 'neutral' }) {
  const toneClass =
    tone === 'hot' ? 'text-heat-hot' : tone === 'good' ? 'text-heat-cool' : 'text-clay-text-heading'
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-heat-surface/70 px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-clay-text-muted">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold tracking-tight ${toneClass}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-bold text-clay-text-muted">{unit}</span>}
      </p>
      {note && <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{note}</p>}
    </div>
  )
}

export default function NarrationPanel({
  selectedMunicipality = null,
  narratives = null,
  isAnalyst = false,
  exposure = null,
  regionalDrivers = [],
  ndviMedian = null,
  lstMedian = null,
}) {
  const muni = selectedMunicipality
  const narration = isAnalyst
    ? (muni?.narration?.en ?? null)
    : publicNarration(muni?.narration?.en ?? null) || null
  const drivers = muni?.top_drivers ?? []

  // ---- Default state: the regional story ----
  if (!muni) {
    const headline = regionalHeadline(exposure)
    return (
      <div className="bg-white rounded-[2rem] border border-white/10 shadow-card p-6 flex-1 min-h-[320px]">
        <h3 className="text-xs font-bold text-clay-text-muted uppercase tracking-wider">Why It Heats</h3>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Regional summary
        </p>

        {headline && (
          <p className="mt-3 text-clay-text-heading leading-relaxed">{headline}</p>
        )}

        {regionalDrivers.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-clay-text-muted">
              Top regional drivers
            </p>
            <div className="mt-2 space-y-2">
              {regionalDrivers.slice(0, 3).map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-xs text-clay-text-muted" title={d.label}>
                    {plainDriverLabel(d.label)}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-heat-surface/70">
                    <span
                      className="block h-full rounded-full bg-heat-orange"
                      style={{ width: `${Math.round(d.meanShare * 100)}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono text-xs text-clay-text-heading">
                    {Math.round(d.meanShare * 100)}%
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-400 italic">
              Association, not causation. The model&rsquo;s strongest signal is wind and location.
            </p>
          </div>
        )}

        <div className="mt-4 rounded-[1.25rem] border border-heat-orange/20 bg-heat-surface/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-heat-orange">
            ✦ Where to act first
          </p>
          <p className="mt-1.5 text-xs leading-5 text-clay-text-body">
            {exposure && exposure.exposedCount > 0
              ? `${exposure.exposedCount} municipalities hold ${(exposure.exposedPopulation / 1e6).toFixed(2)}M people and have crossed the 42 °C Danger threshold. Start there — every intervention reaches more people.`
              : 'No municipality has crossed the 42 °C Danger threshold yet. Keep monitoring and protect the tree canopy.'}
          </p>
        </div>
      </div>
    )
  }

  // ---- Clicked state: this municipality ----
  const actions = lguActions(muni, { ndviMedian, lstMedian })
  const lst = muni.lst_mean_c
  const ndvi = muni.ndvi_mean
  const lstNote =
    lst != null && lstMedian != null
      ? lst >= lstMedian
        ? 'hotter than the regional median'
        : 'cooler than the regional median'
      : null
  const ndviNote =
    ndvi != null && ndviMedian != null
      ? ndvi < ndviMedian
        ? 'below the regional median'
        : 'above the regional median'
      : null

  return (
    <div className="bg-white rounded-[2rem] border border-white/10 shadow-card p-6 flex-1 min-h-[320px]">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold text-clay-text-muted uppercase tracking-wider">Why It Heats</h3>
        <span className="truncate text-xs font-mono text-clay-text-muted">
          {muni.name}, {muni.province}
        </span>
      </div>

      {narration && <p className="mt-3 text-clay-text-heading leading-relaxed">{narration}</p>}

      {/* The two conditions an LGU can actually change. */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ConditionTile
          label="Ground temp"
          value={lst != null ? lst.toFixed(1) : '—'}
          unit={lst != null ? ' °C' : ''}
          note={lstNote}
          tone={lst != null && lst >= 30 ? 'hot' : 'neutral'}
        />
        <ConditionTile
          label="Vegetation"
          value={ndvi != null ? ndvi.toFixed(2) : '—'}
          unit={ndvi != null ? ' NDVI' : ''}
          note={ndviNote}
          tone={ndvi != null && ndvi < 0.65 ? 'hot' : 'good'}
        />
      </div>

      {isAnalyst && drivers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 mb-3">
            <h4 className="text-xs font-bold text-clay-text-muted uppercase tracking-wider">
              Top Drivers · SHAP share
            </h4>
            <span className="inline-flex items-center rounded-full bg-heat-amber/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-clay-text-body">
              Analyst
            </span>
          </div>
          <div className="space-y-2">
            {drivers.slice(0, 4).map((d) => {
              const pct = Math.round((d?.share ?? 0) * 100)
              return (
                <div key={d?.feature ?? d?.label} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-xs text-clay-text-muted" title={d?.label}>
                    {plainDriverLabel(d?.label)}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-heat-surface/70">
                    <span
                      className="block h-full rounded-full bg-heat-orange"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono text-xs text-clay-text-heading">
                    {pct}%
                  </span>
                </div>
              )
            })}
            <p className="mt-2 text-xs text-clay-text-muted italic">Association, not causation.</p>
          </div>
        </div>
      )}

      {/* The action box — the point of the whole panel. */}
      <div className="mt-4 rounded-[1.25rem] border border-heat-orange/20 bg-heat-surface/70 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-heat-orange">
          ✦ Recommended action
        </p>
        <ul className="mt-2 space-y-2">
          {actions.map((a) => (
            <li key={a.id}>
              <p className="text-xs font-bold text-clay-text-heading">→ {a.label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-clay-text-body">{a.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
