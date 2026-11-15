// Finder flip card — one municipality, two faces (Option B spotlight).
// Front: real boundary outline + name; back (D-full): the heat data and the
// static "why" narration. Faces are absolutely stacked with backface-visibility
// so the rotateY flip is a single transform; the global prefers-reduced-motion
// rule in apps/web/src/index.css makes it instant for reduced-motion users.
// The flip control lives ON the active face, so hidden-face buttons never enter
// the tab order.

import { useEffect, useRef, useState } from 'react'
import { outlineStroke } from '../finderData.js'
import { LABELS } from '../labels.js'
import { fmtInt, fmtP, fmtSlope, SigPill } from './DashboardTable.jsx'
import { HEAT_COOL } from '../chartColors.js'
import { joinKey } from '../../../map-controls/src/gis/engine.js'
import { publicNarration } from '../viewMode.js'

const FACE =
  'absolute inset-0 flex flex-col rounded-xl border border-white/10 bg-heat-surface/80 p-3 shadow-hud [backface-visibility:hidden]'

// Hovering the flip control previews the back-face numbers after this long. Long
// enough that a passing pointer never pops a panel the reader did not aim at.
const HOVER_PREVIEW_MS = 1500

export default function FinderCard({ card, flipped = false, interactive = true, onFlip = null, onShowOnMap = null, isAnalyst = false }) {
  const stroke = outlineStroke(card.trend)
  const band = card.latest?.danger_band
  const hoverTimer = useRef(0)
  const [preview, setPreview] = useState(false)
  const clearHover = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = 0
    }
    setPreview(false)
  }
  useEffect(() => clearHover, [])

  return (
    <div className="relative h-[19rem] w-full [perspective:1000px]">
      <div
        className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        {/* front — outline + identity */}
        <div aria-hidden={flipped || undefined} className={FACE}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-clay-text-heading">{card.name}</h3>
            <span className="shrink-0 font-mono text-xs text-slate-500">
              {card.isCity ? 'City' : 'Mun'} · {card.province}
            </span>
          </div>

          <svg
            viewBox={card.outline?.viewBox ?? '0 0 100 100'}
            preserveAspectRatio="xMidYMid meet"
            className="my-1 min-h-0 w-full flex-1"
            role="img"
            aria-label={`Boundary outline of ${card.name}, ${card.province}`}
          >
            <path
              d={card.outline?.d ?? ''}
              fill="rgba(251, 191, 36, 0.10)"
              fillRule={card.outline?.fillRule ?? 'evenodd'}
              stroke={stroke}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
          </svg>

          <div className="flex flex-wrap items-center gap-1.5">
            {card.trend ? (
              <>
                <span className="whitespace-nowrap font-mono text-xs text-slate-200">{fmtSlope(card.trend.slope_c_per_year)}</span>
                <SigPill trend={card.trend} />
              </>
            ) : (
              <span className="text-xs text-slate-500">No trend data yet</span>
            )}
          </div>

          {interactive && !flipped && (
            <button
              type="button"
              onClick={() => onFlip?.(true)}
              onPointerEnter={() => {
                clearHover()
                hoverTimer.current = setTimeout(() => setPreview(true), HOVER_PREVIEW_MS)
              }}
              onPointerLeave={clearHover}
              onPointerCancel={clearHover}
              onPointerDown={clearHover}
              onBlur={clearHover}
              aria-describedby={preview ? `${card.key}-preview` : undefined}
              className="mt-1.5 min-h-11 cursor-pointer rounded-md bg-heat-amber px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-950 hover:bg-heat-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
            >
              Why it heats →
            </button>
          )}

          {/* Hover preview: the back-face numbers without leaving the front.
              Pointer-transparent so it can cover the control it was triggered by. */}
          {preview && !flipped && (
            <div
              id={`${card.key}-preview`}
              role="status"
              className="pointer-events-none absolute inset-x-2 bottom-2 z-30 rounded-lg border border-heat-amber/40 bg-heat-surface/95 p-2 text-[10px] leading-4 text-slate-300 shadow-hud backdrop-blur"
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-slate-100">
                  Mean HI {card.latest?.year ?? '—'}:{' '}
                  <span className="font-mono">{card.latest?.mean_heat_index_c?.toFixed?.(1) ?? '—'} °C</span>
                </span>
                {band ? <span className="font-mono font-semibold text-heat-amber">{band}</span> : null}
              </div>
              <div className="flex flex-wrap gap-x-2 font-mono text-slate-400">
                <span>{fmtSlope(card.trend?.slope_c_per_year)}</span>
                {isAnalyst && <span>{card.trend ? fmtP(card.trend.p_value) : '—'}</span>}
                <span>{Number.isFinite(card.totalDangerDays) ? `${fmtInt(card.totalDangerDays)} danger days` : 'danger —'}</span>
              </div>
              {isAnalyst && card.drivers.length > 0 && (
                <div className="mt-0.5 truncate">
                  <span className="text-slate-500">Top driver: </span>
                  <span className="font-mono text-slate-200">
                    {card.drivers[0]?.label ?? '—'} {Math.round((card.drivers[0]?.share ?? 0) * 100)}%
                  </span>
                </div>
              )}
              {card.narrationEn ? (
                <p className="mt-0.5 line-clamp-2 italic text-slate-400">{publicNarration(card.narrationEn)}</p>
              ) : null}
            </div>
          )}
        </div>

        {/* back — the data and the why */}
        <div aria-hidden={!flipped || undefined} className={`${FACE} [transform:rotateY(180deg)] overflow-y-auto`}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-clay-text-heading">{card.name}</h3>
            <span className="shrink-0 font-mono text-xs text-slate-500">
              {card.province}
            </span>
          </div>

          {card.latest ? (
            <div className="mt-1 grid grid-cols-2 gap-1 text-xs leading-5">
              <div className="text-slate-500">
                <span className="font-semibold">{`Mean HI ${card.latest.year}:`}</span>{' '}
                <span className="font-mono text-slate-100">{card.latest.mean_heat_index_c?.toFixed?.(1) ?? '—'} °C</span>
              </div>
              <div className="text-slate-500">
                {band ? <span className="font-mono font-semibold text-heat-amber">{band}</span> : 'band —'}
              </div>
              <div className="text-slate-500">
                <span className="font-semibold">{LABELS.finderBackP.plain}:</span>{' '}
                {isAnalyst ? (
                  <>
                    <span className="font-mono text-slate-300">{card.trend ? fmtP(card.trend.p_value) : '—'}</span>
                    <span className="block text-xs font-mono text-slate-400">{LABELS.finderBackP.tech}</span>
                  </>
                ) : (
                  <span className="font-semibold text-slate-300">
                    {card.trend?.is_significant ? 'Statistically significant' : 'Not significant'}
                  </span>
                )}
              </div>
              <div className="text-slate-500">
                <span className="font-semibold">{LABELS.finderBackSample.plain}:</span>{' '}
                <span className="font-mono text-slate-300">{card.sample?.n_days != null ? `${fmtInt(card.sample.n_days)} d · ${fmtInt(card.sample.n_years ?? 0)} y` : '—'}</span>
                <span className="block text-xs font-mono text-slate-400">{LABELS.finderBackSample.tech}</span>
              </div>
              <div className="col-span-2 text-slate-500">
                <span className="font-semibold">{LABELS.hotspotsHeaderDanger.plain}:</span>{' '}
                <span className="font-mono text-slate-100">{Number.isFinite(card.totalDangerDays) ? fmtInt(card.totalDangerDays) : '—'}</span>
                <span className="block text-xs font-mono text-slate-400">{LABELS.hotspotsHeaderDanger.tech}</span>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">No trend data yet</p>
          )}

          {card.narrationEn ? (
            <p className="mt-1.5 line-clamp-4 text-[10px] leading-4 text-slate-300">
              {isAnalyst ? card.narrationEn : publicNarration(card.narrationEn)}
            </p>
          ) : null}

          {isAnalyst && card.drivers.length > 0 && (
            <div className="mt-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{LABELS.finderBackDrivers.plain}</div>
              <div className="text-xs font-mono text-slate-400">{LABELS.finderBackDrivers.tech}</div>
              <ul className="mt-1 space-y-1">
                {card.drivers.map((d) => (
                  <li key={d.feature ?? d.label} className="flex items-center gap-1.5 text-[9px]">
                    <span className="w-[7.5rem] shrink-0 truncate text-xs text-slate-400">{d.label}</span>
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full" style={{ width: `${Math.round((d.share ?? 0) * 100)}%`, background: HEAT_COOL }} />
                    </span>
                    <span className="w-7 shrink-0 text-right font-mono text-slate-400">{Math.round((d.share ?? 0) * 100)}%</span>
                  </li>
                ))}
              </ul>
              <p className="mt-0.5 text-xs text-slate-500">{LABELS.finderBackCausation.plain} — {LABELS.finderBackCausation.tech}</p>
            </div>
          )}

          {interactive && flipped && (
            <div className="mt-auto flex items-center gap-1.5 pt-1.5">
              <button
                type="button"
                onClick={() => onShowOnMap?.(joinKey(card.name, card.province))}
                className="min-h-11 cursor-pointer rounded-md bg-heat-amber px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-950 hover:bg-heat-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                Show on map
              </button>
              <button
                type="button"
                onClick={() => onFlip?.(false)}
                className="min-h-11 cursor-pointer rounded-md border border-white/10 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                ← Outline
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
