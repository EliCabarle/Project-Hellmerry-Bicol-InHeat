import { useEffect, useMemo, useState } from 'react'
import { featureKey } from '../gis/engine.js'
import { dayBand, formatTrend } from '../gis/yearRamp.js'
import { spelledDate } from '../state/dateModel.js'
import { IconChevronLeft, IconChevronRight, IconX } from './Icons.jsx'

// Two-step picker, not a searchable list: the search FAB opens this panel to
// the LEFT of the FAB column (right-16), the user first picks a province
// filter, and only then a paginated LGU list appears. No scrollbars — the
// list is a fixed slice (10 per page on ≥sm viewports, 5 below) with
// prev/next arrow navigation.
const PAGE_DESKTOP = 10
const PAGE_MOBILE = 5
const SM_QUERY = '(min-width: 640px)'

function usePageSize() {
  const [size, setSize] = useState(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(SM_QUERY).matches
      ? PAGE_DESKTOP
      : PAGE_MOBILE,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia(SM_QUERY)
    const onChange = () => setSize(mq.matches ? PAGE_DESKTOP : PAGE_MOBILE)
    onChange()
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])
  return size
}

const arrow = (dir) => (dir === 'increasing' ? '▲' : dir === 'decreasing' ? '▼' : '■')

export default function MunicipalityIndex({
  features = [],
  selectedKey = null,
  viewMode = 'trend',
  date = null,
  dayValues = null,
  onSelect,
  onClose,
}) {
  // null = province step; string = province name, '' = all Region V.
  const [province, setProvince] = useState(null)
  const [page, setPage] = useState(0)
  const pageSize = usePageSize()

  const provinces = useMemo(() => {
    const counts = new Map()
    for (const f of features) {
      const p = f.properties ?? {}
      if (!p.province) continue
      counts.set(p.province, (counts.get(p.province) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [features])

  const rows = useMemo(() => {
    const list = features.filter((f) => {
      if (province === null) return false
      if (province === '') return true
      return (f.properties ?? {}).province === province
    })
    return list.sort((a, b) => {
      const ap = a.properties ?? {}
      const bp = b.properties ?? {}
      return `${ap.adm3_en ?? ''}|${ap.province ?? ''}`.localeCompare(`${bp.adm3_en ?? ''}|${bp.province ?? ''}`)
    })
  }, [features, province])

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const slice = rows.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const chooseProvince = (name) => {
    setProvince(name)
    setPage(0)
  }

  useEffect(() => {
    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        // stopPropagation: the map's window Escape handler must not also fire.
        event.stopPropagation()
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKeydown)
    return () => document.removeEventListener('keydown', onKeydown)
  }, [onClose])

  useEffect(() => {
    // Data or page size changed: keep the current page in range.
    setPage((p) => Math.min(p, Math.max(1, Math.ceil(rows.length / pageSize)) - 1))
  }, [pageSize, rows.length])

  const heading =
    viewMode === 'day' && date
      ? `Find a municipality · ${spelledDate(date)}`
      : 'Find a municipality'

  return (
    <>
      <button
        type="button"
        aria-label="Close municipality search"
        onClick={onClose}
        className="absolute inset-0 z-[755] cursor-default bg-slate-950/40 md:hidden"
      />
      <section
        role="dialog"
        aria-label="Municipality search"
        className="absolute right-16 top-[var(--bih-nav-clear,calc(5.25rem+env(safe-area-inset-top)))] z-[760] flex w-[15rem] max-w-[calc(100vw-4.75rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-heat-surface/95 text-slate-100 shadow-hud backdrop-blur-md"
      >
        {province === null ? (
          <>
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
              <h2 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                {heading}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close municipality search"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <p className="px-3 pt-2.5 text-[10px] text-slate-500">
              Choose a province to list its municipalities.
            </p>
            <div className="flex flex-col p-1.5">
              <button
                type="button"
                autoFocus
                onClick={() => chooseProvince('')}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                <span className="truncate text-xs font-medium">All · Region V</span>
                <span className="shrink-0 font-mono text-[10px] text-slate-500">{features.length}</span>
              </button>
              {provinces.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => chooseProvince(name)}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
                >
                  <span className="truncate text-xs font-medium">{name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">{count}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-2">
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setProvince(null)
                  setPage(0)
                }}
                aria-label="Change province"
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-100">
                  {province === '' ? 'Region V' : province}
                </span>
                <span className="block font-mono text-[10px] text-slate-500">
                  {rows.length} LGU{rows.length === 1 ? '' : 's'}
                </span>
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close municipality search"
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <ul className="flex flex-col p-1.5">
              {slice.map((feature) => {
                const p = feature.properties ?? {}
                const n = p.narrative
                const key = featureKey(feature)
                const selected = key === selectedKey
                const dv = n && dayValues instanceof Map ? dayValues.get(n.id) : undefined
                const dayOk = Number.isFinite(dv)
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect?.(key)
                        onClose?.()
                      }}
                      aria-current={selected ? 'true' : undefined}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
                        selected ? 'bg-heat-amber/20 text-clay-text-heading' : 'hover:bg-white/5'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{p.adm3_en ?? 'Unknown'}</span>
                        {province === '' ? (
                          <span className="block truncate text-[10px] text-slate-500">{p.province ?? ''}</span>
                        ) : null}
                      </span>
                      {n ? (
                        viewMode === 'day' ? (
                          <span className="shrink-0 text-right">
                            <span className="block font-mono text-[10px] text-slate-300">
                              {dayOk ? `${dv.toFixed(1)} °C` : '—'}
                            </span>
                            <span className="block text-[9px] text-slate-500">
                              {dayOk ? dayBand(dv) : 'No data'}
                            </span>
                          </span>
                        ) : (
                          <span className="shrink-0 font-mono text-[10px] text-slate-400">
                            {arrow(n.trend?.direction)} {formatTrend(n.trend?.slope_c_per_year)}
                          </span>
                        )
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-600">pending</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="flex items-center justify-between gap-2 border-t border-white/10 px-2 py-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-[10px] text-slate-500" aria-live="polite">
                Page {safePage + 1} of {pageCount} · {pageSize} per page
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </section>
    </>
  )
}
