// Dashboard charts (Recharts). Presentational only — data arrives pre-aggregated
// from ../chartData.js so nothing here computes a statistic. All animation is
// off: the campus/static PWA and prefers-reduced-motion see identical output.

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AXIS_TICK, GRID_LINE, HEAT_AMBER, HEAT_COOL, MONO_FONT } from '../chartColors.js'

const fmtNum = (v) => (v == null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(2))

function DarkTooltip({ active, payload, label, unitByDataKey = {} }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null
  return (
    <div
      role="presentation"
      className="rounded-lg border border-white/10 bg-heat-surface/95 px-2.5 py-1.5 text-[10px] leading-4 text-slate-200 shadow-hud"
    >
      <div className="font-mono font-semibold text-slate-100">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey ?? entry.name} className="mt-0.5 flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm" style={{ background: entry.color || entry.fill }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-mono text-slate-100">
            {fmtNum(entry.value)}
            {unitByDataKey[entry.dataKey] ?? ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ChartCard({ title, yearNote, ariaLabel, children, table = null, footnote = null }) {
  return (
    <section
      aria-label={ariaLabel ?? title}
      className="flex flex-col rounded-xl border border-white/10 bg-heat-surface/70 p-3 shadow-hud"
    >
      <header className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</h2>
        {yearNote ? <span className="font-mono text-[10px] text-slate-500">{yearNote}</span> : null}
      </header>
      <div className="h-52 grow sm:h-60">{children}</div>
      {table}
      {footnote ? <p className="mt-2 text-[10px] leading-4 text-slate-500">{footnote}</p> : null}
    </section>
  )
}

// Yearly trend — dual axis: province-mean heat index (left, °C) and the count
// of LGUs with at least one danger day (right). One axis detail in the legend
// covers both units.
export function YearlyTrendChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: AXIS_TICK, fontSize: 10, fontFamily: MONO_FONT }}
          tickLine={false}
          axisLine={{ stroke: GRID_LINE }}
          minTickGap={26}
        />
        <YAxis
          yAxisId="hi"
          domain={['auto', 'auto']}
          tick={{ fill: AXIS_TICK, fontSize: 10, fontFamily: MONO_FONT }}
          tickFormatter={(v) => v.toFixed(1)}
          tickLine={false}
          axisLine={false}
          width={44}
          label={{
            value: '°C mean heat index',
            angle: -90,
            position: 'insideLeft',
            fill: AXIS_TICK,
            fontSize: 10,
            offset: 10,
          }}
        />
        <YAxis
          yAxisId="days"
          orientation="right"
          domain={[0, 'auto']}
          allowDecimals={false}
          tick={{ fill: AXIS_TICK, fontSize: 10, fontFamily: MONO_FONT }}
          tickLine={false}
          axisLine={false}
          width={34}
          label={{
            value: 'LGUs in danger',
            angle: 90,
            position: 'insideRight',
            fill: AXIS_TICK,
            fontSize: 10,
            offset: 4,
          }}
        />
        {/* Tooltip stabilisation: isAnimationActive=false removes the default
            transform 400ms ease (swim), allowEscapeViewBox x=true removes the
            edge flip, position pins the axis recharts would otherwise follow
            with the raw pointer — x stays snapped to the hovered year. */}
        <Tooltip
          content={<DarkTooltip unitByDataKey={{ meanHeatIndexC: ' °C' }} />}
          cursor={{ stroke: GRID_LINE, strokeDasharray: '3 3' }}
          isAnimationActive={false}
          allowEscapeViewBox={{ x: true, y: false }}
          position={{ y: 30 }}
        />
        <Legend
          verticalAlign="top"
          height={20}
          iconSize={9}
          wrapperStyle={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}
        />
        <Area
          yAxisId="hi"
          dataKey="meanHeatIndexC"
          name="Mean heat index"
          stroke={HEAT_AMBER}
          fill="rgba(251, 191, 36, 0.16)"
          strokeWidth={2}
          type="monotone"
          isAnimationActive={false}
          activeDot={false}
        />
        <Line
          yAxisId="days"
          dataKey="dangerDayLgus"
          name="LGUs with ≥1 danger day"
          stroke={HEAT_COOL}
          strokeWidth={2}
          dot={false}
          type="monotone"
          isAnimationActive={false}
          activeDot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// Binned bar chart used for the heat-index and warming-rate distributions and
// the danger-day bands. Bin fills arrive pre-wired (map ramp colours).
export function BinBarChart({ bins = [], unit = 'LGUs', colorFn = null, labelAngle = 0 }) {
  const angleHeight = labelAngle ? 44 : 26
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={bins} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS_TICK, fontSize: 9, fontFamily: MONO_FONT }}
          interval={0}
          angle={labelAngle || 0}
          textAnchor={labelAngle ? 'end' : 'middle'}
          height={angleHeight}
          tickLine={false}
          axisLine={{ stroke: GRID_LINE }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: AXIS_TICK, fontSize: 10, fontFamily: MONO_FONT }}
          tickLine={false}
          axisLine={false}
          width={40}
          label={{ value: unit, angle: -90, position: 'insideLeft', fill: AXIS_TICK, fontSize: 10, offset: 8 }}
        />
        {/* Same stabilisation trio; y pinned to the plot top so the box hugs the
            hovered bar instead of riding the pointer. */}
        <Tooltip
          content={<DarkTooltip unitByDataKey={{ count: '' }} />}
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          isAnimationActive={false}
          allowEscapeViewBox={{ x: true, y: false }}
          position={{ y: 6 }}
        />
        <Bar dataKey="count" name={unit} radius={[3, 3, 0, 0]} maxBarSize={48} isAnimationActive={false}>
          {bins.map((bin, i) => (
            <Cell key={bin.label ?? i} fill={colorFn ? colorFn(bin, i) : HEAT_AMBER} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Aggregate RF/SHAP driver ranking — horizontal bars, one series (mean share).
const SHORT_LABEL_MAX = 26
function shortLabel(label = '') {
  const trimmed = String(label).trim()
  return trimmed.length > SHORT_LABEL_MAX ? `${trimmed.slice(0, SHORT_LABEL_MAX - 1)}…` : trimmed
}

export function DriverBarChart({ drivers = [] }) {
  const data = drivers.map((d) => ({ ...d, shortLabel: shortLabel(d?.label), pct: d.meanShare * 100 }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 14, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${Math.round(v)}%`}
          tick={{ fill: AXIS_TICK, fontSize: 9, fontFamily: MONO_FONT }}
          tickLine={false}
          axisLine={{ stroke: GRID_LINE }}
        />
        <YAxis
          type="category"
          dataKey="shortLabel"
          width={lgusWidth(drivers)}
          tick={{ fill: AXIS_TICK, fontSize: 9 }}
          tickLine={false}
          axisLine={false}
        />
        {/* layout="vertical": x is the raw pointer axis — pin it just right of the
            YAxis label block (same width the axis uses) so there is no horizontal
            jitter; y stays snapped to the hovered bar. */}
        <Tooltip
          content={<DriverTooltip drivers={drivers} />}
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          isAnimationActive={false}
          allowEscapeViewBox={{ x: true, y: false }}
          position={{ x: lgusWidth(drivers) + 8 }}
        />
        <Bar
          dataKey="pct"
          name="Mean share"
          fill={HEAT_COOL}
          fillOpacity={0.85}
          radius={[0, 3, 3, 0]}
          barSize={14}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

function lgusWidth(drivers) {
  const longest = drivers.reduce((max, d) => Math.max(max, String(d?.shortLabel ?? d?.label ?? '').length), 0)
  return Math.min(200, Math.max(110, longest * 5.2))
}

function DriverTooltip({ active, payload }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null
  const row = payload[0]?.payload ?? {}
  return (
    <div
      role="presentation"
      className="rounded-lg border border-white/10 bg-heat-surface/95 px-2.5 py-1.5 text-[10px] leading-4 text-slate-200 shadow-hud"
    >
      <div className="font-semibold text-slate-100">{row?.label ?? '—'}</div>
      <div className="mt-0.5 font-mono text-slate-300">Mean share {Math.round(row?.meanShare * 100)}%</div>
      <div className="text-slate-500">
        Top driver for {Number.isInteger(row?.lgus) ? row.lgus : '—'} LGUs (association, not causation)
      </div>
    </div>
  )
}
