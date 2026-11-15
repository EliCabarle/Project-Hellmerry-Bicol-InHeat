// Clay-styled stat bubble for the Dashboard overhaul.
// Soft rounded card, no borders, dual shadow (warm brown below-right, white
// above-left) so it reads as a raised clay pebble rather than a flat panel.
export default function StatCard({
  title,
  value,
  unit = '',
  delta = null,
  deltaTone = 'neutral', // 'warming' | 'cooling' | 'neutral'
  hero = false,
}) {
  const deltaClass =
    deltaTone === 'warming'
      ? 'bg-heat-hot/10 text-heat-hot'
      : deltaTone === 'cooling'
        ? 'bg-heat-cool/10 text-heat-cool'
        : 'bg-heat-surface/70 text-clay-text-muted'

  return (
    <div
      className={`rounded-[1.75rem] border border-white/10 p-5 transition-shadow duration-200 ${
        hero
          ? 'bg-heat-surface/95 ring-1 ring-heat-amber/30 shadow-card'
          : 'bg-white shadow-card hover:shadow-hud'
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-clay-text-muted">{title}</p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={`${hero ? 'text-5xl' : 'text-4xl'} font-black tracking-tight text-clay-text-heading`}>
          {value}
        </span>
        {unit && <span className="text-base font-bold text-clay-text-muted">{unit}</span>}
      </div>
      {delta != null && (
        <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${deltaClass}`}>
          {delta}
        </p>
      )}
    </div>
  )
}
