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
      ? 'bg-[#C0392B]/10 text-[#C0392B]'
      : deltaTone === 'cooling'
        ? 'bg-[#1E8449]/10 text-[#1E8449]'
        : 'bg-[#F3EFE9] text-[#8C847A]'

  return (
    <div
      className={`rounded-[1.75rem] border-none p-5 transition-shadow duration-200 ${
        hero
          ? 'bg-gradient-to-br from-[#FFF6EA] to-[#FFFDF9] shadow-[5px_5px_14px_rgba(154,52,18,0.13),-5px_-5px_14px_rgba(255,255,255,0.95)]'
          : 'bg-white shadow-[5px_5px_14px_rgba(154,52,18,0.13),-5px_-5px_14px_rgba(255,255,255,0.95)] hover:shadow-[7px_7px_18px_rgba(154,52,18,0.16),-7px_-7px_18px_rgba(255,255,255,0.95)]'
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C847A]">{title}</p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={`${hero ? 'text-5xl' : 'text-4xl'} font-black tracking-tight text-[#2D2D2D]`}>
          {value}
        </span>
        {unit && <span className="text-base font-bold text-[#8C847A]">{unit}</span>}
      </div>
      {delta != null && (
        <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${deltaClass}`}>
          {delta}
        </p>
      )}
    </div>
  )
}
