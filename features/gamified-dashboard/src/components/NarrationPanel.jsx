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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function ConditionTile({ label, value, unit, note, tone = 'neutral' }) {
  const toneClass =
    tone === 'hot' ? 'text-[#C0392B]' : tone === 'good' ? 'text-[#1E8449]' : 'text-[#2D2D2D]'
  return (
    <div className="rounded-[1.25rem] border-none bg-[#FAF7F2] px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C847A]">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold tracking-tight ${toneClass}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-bold text-[#8C847A]">{unit}</span>}
      </p>
      {note && <p className="mt-0.5 text-[10px] leading-4 text-[#A79C90]">{note}</p>}
    </div>
  )
}

// Danger days by year — small bar chart showing how often this LGU hit the
// 42 °C Danger threshold. Keeps the "how much" visible alongside the "why".
function DangerDaysChart({ series = [], title = 'Danger days per year' }) {
  const data = series
    .filter((s) => s.danger_days != null && s.danger_days > 0)
    .map((s) => ({ year: String(s.year), count: s.danger_days }))
  if (data.length === 0) return null
  const maxCount = Math.max(...data.map((d) => d.count))
  return (
    <div className="mt-6 rounded-[1.25rem] border-none bg-[#FAF7F2] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C847A] mb-2">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 28, left: 8 }}
          layout="vertical"
        >
          <CartesianGrid stroke="#F3EFE9" vertical={false} />
          <YAxis
            type="category"
            dataKey="year"
            width={36}
            tick={{ fill: '#8C847A', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <XAxis
            type="number"
            domain={[0, maxCount]}
            tick={{ fill: '#8C847A', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null
              const entry = payload[0]
              return (
                <div className="rounded-lg border border-white/10 bg-[#FAF7F2]/95 px-2 py-1 text-xs text-[#2D2D2D]">
                  {entry.payload.year}: {entry.value} danger days
                </div>
              )
            }}
          />
          <Bar dataKey="count" fill="#D96C4D" radius={[0, 3, 3, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
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
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none p-6 flex-1 min-h-[320px] relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xs font-bold text-[#8C847A] uppercase tracking-wider">Why It Heats</h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#A79C90]">
            Regional summary
          </p>

        {headline && (
          <p className="mt-3 text-[#2D2D2D] leading-relaxed">{headline}</p>
        )}

        {regionalDrivers.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C847A]">
              Top regional drivers
            </p>
            <div className="mt-2 space-y-2">
              {regionalDrivers.slice(0, 3).map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-xs text-[#8C847A]" title={d.label}>
                    {plainDriverLabel(d.label)}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#F3EFE9]">
                    <span
                      className="block h-full rounded-full bg-[#D96C4D]"
                      style={{ width: `${Math.round(d.meanShare * 100)}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono text-xs text-[#2D2D2D]">
                    {Math.round(d.meanShare * 100)}%
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[#A79C90] italic">
              Association, not causation. The model&rsquo;s strongest signal is wind and location.
            </p>
          </div>
        )}

        <div className="mt-4 rounded-[1.25rem] border-none bg-[#FFF9F0] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C]">
            ✦ Where to act first
          </p>
          <p className="mt-1.5 text-xs leading-5 text-[#5D4037]">
            {exposure && exposure.exposedCount > 0
              ? `${exposure.exposedCount} municipalities hold ${(exposure.exposedPopulation / 1e6).toFixed(2)}M people and have crossed the 42 °C Danger threshold. Start there — every intervention reaches more people.`
              : 'No municipality has crossed the 42 °C Danger threshold yet. Keep monitoring and protect the tree canopy.'}
          </p>
        </div>
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

  // Why this specific municipality heats — connect top driver to geography.
  const topDriver = drivers[0]
  const driverWhy =
    topDriver && topDriver.label
      ? {
          'Wind (north-south, V10M)': {
            en: 'Prevailing winds push warm, moist air inland — coastal location traps it.',
            fil: 'Ang hanghing patagos ay nagdadala ng mainit at malamig na hangin — ang baybayin ay itinuturing itong puwersa.',
          },
          'Wind (east-west, U10M)': {
            en: 'East-west airflow moves heat across the plain — valleys channel it faster.',
            fil: 'Ang hanghing timog-kanluran ay nag-alis ng init sa patag — mas mabilis ito sa lambak.',
          },
          'Longitude': {
            en: 'Farther inland means less sea-breeze cooling — the municipality heats faster.',
            fil: 'Mas malayo sa dagat, mas kaunting hangin-galibot — kaya mas mainit.',
          },
          'Latitude': {
            en: 'Closer to the equator means more direct sun — stronger heating year-round.',
            fil: 'Mas malapit sa ekwador, mas direktas ang araw — mas mainit buong taon.',
          },
          default: {
            en: 'Local geography and land use shape how heat builds up here.',
            fil: 'Ang lokal na pisikal na anyo at paggamit ng lupa ang nag-aangkon ng init dito.',
          },
        }[topDriver.label] || {
          en: 'Local geography and land use shape how heat builds up here.',
          fil: 'Ang lokal na pisikal na anyo at paggamit ng lupa ang nag-aangkon ng init dito.',
        }
      : null

  return (
    <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none p-6 flex-1 min-h-[320px]">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold text-[#8C847A] uppercase tracking-wider">Why It Heats</h3>
        <span className="truncate text-xs font-mono text-[#8C847A]">
          {muni.name}, {muni.province}
        </span>
      </div>

      {narration && <p className="mt-3 text-[#2D2D2D] leading-relaxed">{narration}</p>}

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

      {/* Why this municipality — connects top driver to geography. */}
      {driverWhy && (
        <div className="mt-4 rounded-[1.25rem] border-none bg-[#FFF9F0] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C]">
            ✦ Why {muni.name} heats
          </p>
          <p className="mt-1.5 text-xs leading-5 text-[#5D4037]">
            {isAnalyst ? driverWhy.en : driverWhy.en}
            {topDriver && ` (top driver: ${plainDriverLabel(topDriver.label)}, ${Math.round((topDriver.share ?? 0) * 100)}% share)`}
          </p>
        </div>
      )}

      {/* Danger days graph — second visualization showing when danger hits. */}
      <DangerDaysChart
        series={muni.series ?? []}
        title="Danger days per year (42 °C+)"
      />

      {isAnalyst && drivers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#F3EFE9]/80">
          <div className="flex items-center gap-1.5 mb-3">
            <h4 className="text-xs font-bold text-[#8C847A] uppercase tracking-wider">
              Top Drivers · SHAP share
            </h4>
            <span className="inline-flex items-center rounded-full bg-[#F2C94C]/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#5D4037]">
              Analyst
            </span>
          </div>
          <div className="space-y-2">
            {drivers.slice(0, 4).map((d) => {
              const pct = Math.round((d?.share ?? 0) * 100)
              return (
                <div key={d?.feature ?? d?.label} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-xs text-[#8C847A]" title={d?.label}>
                    {plainDriverLabel(d?.label)}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#F3EFE9]">
                    <span
                      className="block h-full rounded-full bg-[#D96C4D] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono text-xs text-[#2D2D2D]">
                    {pct}%
                  </span>
                </div>
              )
            })}
            <p className="mt-2 text-xs text-[#8C847A] italic">Association, not causation.</p>
          </div>
        </div>
      )}

      {/* The action box — the point of the whole panel. */}
      <div className="mt-4 rounded-[1.25rem] border-none bg-[#FFF9F0] p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C]">
          ✦ Recommended action
        </p>
        <ul className="mt-2 space-y-2">
          {actions.map((a) => (
            <li key={a.id}>
              <p className="text-xs font-bold text-[#2D2D2D]">→ {a.label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-[#5D4037]">{a.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
