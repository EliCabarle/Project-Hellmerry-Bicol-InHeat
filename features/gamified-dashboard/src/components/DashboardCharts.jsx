// Dashboard charts (Recharts). Presentational only — data arrives pre-aggregated
// from ../chartData.js so nothing here computes a statistic. All animation is
// off: the campus/static PWA and prefers-reduced-motion see identical output.

import { createContext, useContext, useEffect, useState } from 'react'
import CollapsibleSection from './CollapsibleSection.jsx'
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

// Coarse pointer (touch) devices have no hover: tooltips are suppressed and the
// value is pinned into a readout slot inside the card instead. Detected once.
const matchCoarse = typeof matchMedia === 'function' ? matchMedia('(hover: none), (pointer: coarse)') : null
export const IS_COARSE = matchCoarse?.matches ?? false

const ReadoutContext = createContext(null)
export const useReadout = () => useContext(ReadoutContext)

function DarkTooltip({ active, payload, label, unitByDataKey = {}, coarse = false, setReadout = null }) {
  useEffect(() => {
    if (!coarse || !setReadout) return
    if (active && Array.isArray(payload) && payload.length > 0) {
      setReadout(
        `${label}: ${payload.map((e) => `${e.name}: ${fmtNum(e.value)}${unitByDataKey[e.dataKey] ?? ''}`).join(' · ')}`,
      )
    } else {
      setReadout(null)
    }
  }, [active, payload, label, unitByDataKey, coarse, setReadout])
  if (!active || !Array.isArray(payload) || payload.length === 0) return null
  if (coarse) return null
  return (
    <div
      role="presentation"
      className="rounded-lg border border-white/10 bg-heat-surface/95 px-2.5 py-1.5 text-xs leading-5 text-slate-200 shadow-hud"
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

export function ChartCard({ title, tech, yearNote, ariaLabel, children, table = null, footnote = null }) {
  const [readout, setReadout] = useState(null)
  return (
    <ReadoutContext.Provider value={{ readout, setReadout }}>
      <CollapsibleSection
        title={title}
        tech={tech}
        ariaLabel={ariaLabel}
        className=""
        aside={yearNote ? <span className="font-mono text-xs text-slate-500">{yearNote}</span> : null}
      >
        <p aria-live="polite" className="min-h-5 text-xs text-slate-300">
          {readout ?? ''}
        </p>
        {/* `overflow-hidden` clips the Recharts tooltip to the plot bounds — the
            footnote and expanded data table are siblings below this div, so they
            are never clipped. `isolate` keeps tooltip paint inside this card. */}
        <div className="relative isolate h-52 grow sm:h-60 overflow-hidden">{children}</div>
        {table}
        {footnote ? <p className="mt-2 text-xs leading-5 text-slate-500">{footnote}</p> : null}
      </CollapsibleSection>
    </ReadoutContext.Provider>
  )
}

// Yearly trend — dual axis: province-mean heat index (left, °C) and the count
// of LGUs with at least one danger day (right). One axis detail in the legend
// covers both units.
export function YearlyTrendChart({ data = [] }) {
  const { setReadout } = useReadout()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: AXIS_TICK, fontSize: 11, fontFamily: MONO_FONT }}
          tickLine={false}
          axisLine={{ stroke: GRID_LINE }}
          minTickGap={26}
        />
        <YAxis
          yAxisId="hi"
          domain={['auto', 'auto']}
          tick={{ fill: AXIS_TICK, fontSize: 11, fontFamily: MONO_FONT }}
          tickFormatter={(v) => v.toFixed(1)}
          tickLine={false}
          axisLine={false}
          width={44}
          label={{
            value: 'Mean heat index (°C)',
            angle: -90,
            position: 'insideLeft',
            fill: AXIS_TICK,
            fontSize: 11,
            offset: 10,
          }}
        />
        <YAxis
          yAxisId="days"
          orientation="right"
          domain={[0, 'auto']}
          allowDecimals={false}
          tick={{ fill: AXIS_TICK, fontSize: 11, fontFamily: MONO_FONT }}
          tickLine={false}
          axisLine={false}
          width={34}
          label={{
            value: 'LGUs with danger days',
            angle: 90,
            position: 'insideRight',
            fill: AXIS_TICK,
            fontSize: 11,
            offset: 4,
          }}
        />
        {/* Tooltip stays inside the plot (x-escape off): recharts clamps it at the
            edges. On coarse pointers the bubble is suppressed in favour of the
            card readout slot. */}
        <Tooltip
          content={<DarkTooltip unitByDataKey={{ meanHeatIndexC: ' °C' }} coarse={IS_COARSE} setReadout={setReadout} />}
          cursor={{ stroke: GRID_LINE, strokeDasharray: '3 3' }}
          isAnimationActive={false}
          allowEscapeViewBox={{ x: false, y: false }}
        />
        <Legend
          verticalAlign="top"
          height={20}
          iconSize={11}
          wrapperStyle={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}
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
  const { setReadout } = useReadout()
  const angleHeight = labelAngle ? 44 : 26
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={bins} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS_TICK, fontSize: 11, fontFamily: MONO_FONT }}
          interval={0}
          angle={labelAngle || 0}
          textAnchor={labelAngle ? 'end' : 'middle'}
          height={angleHeight}
          tickLine={false}
          axisLine={{ stroke: GRID_LINE }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: AXIS_TICK, fontSize: 11, fontFamily: MONO_FONT }}
          tickLine={false}
          axisLine={false}
          width={40}
          label={{ value: unit, angle: -90, position: 'insideLeft', fill: AXIS_TICK, fontSize: 11, offset: 8 }}
        />
        {/* Tooltip stays inside the plot (x-escape off): recharts clamps it at the
            edges. On coarse pointers the bubble is suppressed in favour of the
            card readout slot. */}
        <Tooltip
          content={<DarkTooltip unitByDataKey={{ count: '' }} coarse={IS_COARSE} setReadout={setReadout} />}
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          isAnimationActive={false}
          allowEscapeViewBox={{ x: false, y: false }}
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
  const { setReadout } = useReadout()
  const data = drivers.map((d) => ({ ...d, shortLabel: shortLabel(d?.label), pct: d.meanShare * 100 }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 14, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID_LINE} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${Math.round(v)}%`}
          tick={{ fill: AXIS_TICK, fontSize: 11, fontFamily: MONO_FONT }}
          tickLine={false}
          axisLine={{ stroke: GRID_LINE }}
        />
        <YAxis
          type="category"
          dataKey="shortLabel"
          width={lgusWidth(drivers)}
          tick={{ fill: AXIS_TICK, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        {/* Tooltip stays inside the plot (x-escape off): recharts clamps it at the
            edges. On coarse pointers the bubble is suppressed in favour of the
            card readout slot. */}
        <Tooltip
          content={<DriverTooltip coarse={IS_COARSE} setReadout={setReadout} />}
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          isAnimationActive={false}
          allowEscapeViewBox={{ x: false, y: false }}
        />
        <Bar
          dataKey="pct"
          name="Mean SHAP share"
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

function DriverTooltip({ active, payload, coarse = false, setReadout = null }) {
  useEffect(() => {
    if (!coarse || !setReadout) return
    if (active && Array.isArray(payload) && payload.length > 0) {
      const row = payload[0]?.payload ?? {}
      setReadout(
        `${row?.label ?? '—'}: ${Math.round((row?.meanShare ?? 0) * 100)}% · top driver for ${
          row?.lgus ?? '—'
        } LGUs`,
      )
    } else {
      setReadout(null)
    }
  }, [active, payload, coarse, setReadout])
  if (!active || !Array.isArray(payload) || payload.length === 0) return null
  if (coarse) return null
  const row = payload[0]?.payload ?? {}
  return (
    <div
      role="presentation"
      className="rounded-lg border border-white/10 bg-heat-surface/95 px-2.5 py-1.5 text-xs leading-5 text-slate-200 shadow-hud"
    >
      <div className="font-semibold text-slate-100">{row?.label ?? '—'}</div>
      <div className="mt-0.5 font-mono text-slate-300">Mean share {Math.round(row?.meanShare * 100)}%</div>
      <div className="mt-0.5 text-xs text-slate-500">Top driver for {row?.lgus ?? '—'} LGUs</div>
      <div className="mt-0.5 text-xs text-slate-500 italic">Association, not causation.</div>
    </div>
  )
}
