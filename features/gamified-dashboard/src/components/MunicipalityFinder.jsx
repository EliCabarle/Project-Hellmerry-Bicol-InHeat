// Municipality Finder — Option B coverflow carousel + P1 placement.
// Province dropdown is derived from the data (never hardcoded); the stage is a
// fixed-height, non-scrolling coverflow: the spotlight card is fully
// interactive and flips front↔back (D-full), neighbours are decorative
// previews. One bounded stage — this section adds no scroll container.
//
// Mobile: swipe left/right advances one card (Prev/Next buttons and arrow keys
// kept). A stationary tap still flips the card — a claimed drag can't fire a
// tap action.
import { useEffect, useMemo, useRef, useState } from 'react'
import { joinCards, countByProvince, provincesOf, matchCards } from '../finderData.js'
import FinderCard from './FinderCard.jsx'
import CollapsibleSection from './CollapsibleSection.jsx'

// Offsets are wrapper-relative: neighbours lean away and recede in Z so the
// spotlight card reads as front-of-stack.
const OFFSET_STYLES = {
  '-1': 'translateX(-64%) translateZ(-130px) rotateY(32deg) scale(0.82)',
  '0': 'translateX(0px) translateZ(0px) rotateY(0deg) scale(1)',
  '1': 'translateX(64%) translateZ(-130px) rotateY(-32deg) scale(0.82)',
}
const OPACITIES = { '-1': 'opacity-45', '0': 'opacity-100', '1': 'opacity-45' }

const clampIndex = (i, n) => Math.max(0, Math.min(i, Math.max(0, n - 1)))

// Swipe thresholds
const SWIPE_DX_PX = 40
const SWIPE_LOCK_DX_PX = 10
const CLICK_SUPPRESS_MS = 300
const SWIPE_VELOCITY_PX_PER_MS = 0.5

export default function MunicipalityFinder({ geojson = null, narratives = null, onShowOnMap = null }) {
  const municipalities = narratives?.municipalities ?? []
  const provinces = useMemo(() => provincesOf(municipalities), [municipalities])
  const counts = useMemo(() => countByProvince(municipalities), [municipalities])

  const [province, setProvince] = useState('All')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)

  const cards = useMemo(() => joinCards(geojson, narratives, province), [geojson, narratives, province])
  const matches = useMemo(() => matchCards(cards, search), [cards, search])

  // Scan timer: one timeout at a time, cleared on unmount so a scan can never
  // outlive the component.
  const scanTimerRef = useRef(0)
  const stopScan = () => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current)
      scanTimerRef.current = 0
    }
    setScanning(false)
  }
  useEffect(() => () => clearTimeout(scanTimerRef.current), [])

  // A new filter is a new browse position — reset the spotlight and any flip.
  useEffect(() => {
    stopScan()
    setIndex(0)
    setFlipped(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province])

  const current = cards.length > 0 ? cards[clampIndex(index, cards.length)] : null
  const go = (delta) => {
    stopScan()
    setFlipped(false)
    setIndex((i) => clampIndex(i + delta, cards.length))
  }

  // Animate to a matched card one step at a time so a search reads as the
  // carousel scrolling through the municipalities, then landing on the match.
  const scanTo = (target) => {
    stopScan()
    setFlipped(false)
    const start = clampIndex(index, cards.length)
    const distance = Math.abs(target - start)
    if (distance === 0) {
      setIndex(target)
      return
    }
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || distance === 1) {
      setIndex(target)
      return
    }
    const dir = target > start ? 1 : -1
    // Step through each municipality when close, or take a stride when far, so a
    // 110-card search still reads as a scroll (~0.8s) instead of a 4s crawl.
    const stride = Math.max(1, Math.ceil(distance / 24))
    const frames = Math.ceil(distance / stride)
    const stepMs = Math.max(35, Math.min(90, Math.round(800 / frames)))
    let i = start
    setScanning(true)
    const tick = () => {
      i = dir > 0 ? Math.min(target, i + stride) : Math.max(target, i - stride)
      setIndex(i)
      if (i === target) {
        setScanning(false)
        scanTimerRef.current = 0
        return
      }
      scanTimerRef.current = setTimeout(tick, stepMs)
    }
    scanTimerRef.current = setTimeout(tick, stepMs)
  }

  const onSubmitSearch = (e) => {
    e.preventDefault()
    if (matches.length === 0) return
    const currentIdx = clampIndex(index, cards.length)
    // Enter again advances to the next match, wrapping back to the first.
    const next = matches.find((m) => m.index > currentIdx) ?? matches[0]
    scanTo(next.index)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    }
  }

  // Swipe state (pointer events, no library). Ref-based so a drag never forces
  // a re-render; the card swap is a discrete state change on release only.
  const pointerStartRef = useRef(null) // { x, y, t }
  const lockedRef = useRef(null) // 'x' | 'abort' | null
  const activePointersRef = useRef(0)
  const swipedAtRef = useRef(0)

  const onPointerDown = (e) => {
    if (activePointersRef.current > 0) return // ignore pinch/multi-touch
    activePointersRef.current = 1
    pointerStartRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    lockedRef.current = null
  }

  const onPointerMove = (e) => {
    const s = pointerStartRef.current
    if (!s || lockedRef.current === 'abort') return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (lockedRef.current === 'x') {
      e.preventDefault() // claimed the gesture — block page scroll
      return
    }
    if (Math.abs(dx) > SWIPE_LOCK_DX_PX && Math.abs(dx) > Math.abs(dy)) {
      lockedRef.current = 'x'
      e.target.setPointerCapture(e.pointerId)
      return
    }
    if (Math.abs(dy) > SWIPE_LOCK_DX_PX && Math.abs(dy) >= Math.abs(dx)) {
      lockedRef.current = 'abort' // vertical page scroll owns this
      return
    }
  }

  const onPointerUp = (e) => {
    const s = pointerStartRef.current
    if (!s) { lockedRef.current = null; return }
    if (lockedRef.current === 'x') {
      const dx = e.clientX - s.x
      const dt = performance.now() - s.t
      const velocity = Math.abs(dx) / Math.max(dt, 1)
      const advanced =
        Math.abs(dx) >= SWIPE_DX_PX || (Math.abs(dx) >= SWIPE_LOCK_DX_PX && velocity >= SWIPE_VELOCITY_PX_PER_MS)
      if (advanced) {
        go(dx < 0 ? 1 : -1) // left = next, right = previous
        swipedAtRef.current = performance.now()
      }
      e.target.releasePointerCapture(e.pointerId)
    }
    pointerStartRef.current = null
    lockedRef.current = null
    activePointersRef.current = 0
  }

  const onPointerCancel = () => {
    pointerStartRef.current = null
    lockedRef.current = null
    activePointersRef.current = 0
  }

  // A drag-release must not fire the flip / Show-on-map button; a stationary
  // tap (no lock claimed) passes straight through.
  const onClickCapture = (e) => {
    if (performance.now() - swipedAtRef.current < CLICK_SUPPRESS_MS) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  if (!geojson) return null

  const step = (i) => {
    const offset = i - clampIndex(index, cards.length)
    return Math.abs(offset) > 1 ? null : String(offset)
  }

  return (
    <CollapsibleSection title="Municipality finder" ariaLabel="Municipality finder" className="mt-4">
      <p className="text-xs text-slate-500">
        Browse every LGU&rsquo;s outline — flip a card for its trend, sample and why it heats.
      </p>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="finder-province" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Province
          </label>
          <select
            id="finder-province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="cursor-pointer min-h-11 rounded-lg border border-white/10 bg-heat-deep/90 px-2 py-1.5 font-mono text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
          >
            <option value="All">All ({municipalities.length})</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p} ({counts.get(p) ?? 0})
              </option>
            ))}
          </select>
        </div>

        <form role="search" onSubmit={onSubmitSearch} className="flex min-w-0 flex-1 items-center gap-2">
          <label htmlFor="finder-search" className="sr-only">
            Search municipality or province
          </label>
          <input
            id="finder-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search municipality or province — press Enter"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-heat-deep/90 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
          />
          <button
            type="submit"
            disabled={matches.length === 0}
            className="cursor-pointer min-h-11 shrink-0 rounded-md border border-heat-amber/50 bg-heat-amber/20 px-3 py-1.5 text-xs font-semibold text-heat-amber hover:bg-heat-amber/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber disabled:cursor-not-allowed disabled:opacity-40"
          >
            Find
          </button>
        </form>
      </div>

      <p aria-live="polite" className="mt-1 text-xs text-slate-500">
        {search.trim()
          ? matches.length === 0
            ? 'No match'
            : `${matches.length} match${matches.length === 1 ? '' : 'es'} — Enter to jump`
          : ''}
      </p>

      {cards.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500">No municipalities for this filter.</p>
      ) : (
        <>
          {/* Stage: fixed height, no scroll. `overflow-clip` keeps neighbour spill
              inside the section on narrow viewports; `touch-pan-y` lets the page
              scroll vertically when the gesture isn't claimed. */}
          <div
            role="group"
            aria-label="Municipality card carousel — swipe left or right, or use the arrow keys"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClickCapture={onClickCapture}
            className="relative mx-auto mt-2 h-[21rem] max-w-3xl overflow-clip touch-pan-y [perspective:1200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber/60"
          >
            {cards.map((card, i) => {
              const offset = step(i)
              if (offset === null) return null
              const isCenter = offset === '0'
              return (
                <div
                  key={card.key}
                  aria-hidden={!isCenter || undefined}
                  className={`absolute left-1/2 top-0 h-[19rem] w-[clamp(13rem,72vw,17rem)] -translate-x-1/2 transition-opacity ${
                    scanning ? 'duration-75' : 'duration-500'
                  } ${isCenter ? 'z-20' : 'z-10 pointer-events-none'} ${OPACITIES[offset]}`}
                >
                  {/* Coverflow transform lives on an inner div so it cannot clash
                      with the Tailwind centering translate on the wrapper. */}
                  <div
                    className={`h-full transition-transform [transform-style:preserve-3d] ${
                      scanning ? 'duration-75' : 'duration-500'
                    }`}
                    style={{ transform: OFFSET_STYLES[offset] }}
                  >
                    <FinderCard
                      card={card}
                      flipped={isCenter ? flipped : false}
                      interactive={isCenter}
                      onFlip={setFlipped}
                      onShowOnMap={onShowOnMap}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={clampIndex(index, cards.length) === 0}
              aria-label={`Previous municipality (${cards.length > 0 ? cards[clampIndex(index, cards.length)]?.name ?? '' : ''})`}
              className="cursor-pointer min-h-11 shrink-0 rounded-md border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <p
              aria-live={scanning ? 'off' : 'polite'}
              className="order-last w-full min-w-0 truncate text-center font-mono text-xs text-slate-400 sm:order-none sm:w-auto sm:min-w-40"
            >
              {current ? `${current.name} — ${clampIndex(index, cards.length) + 1} of ${cards.length}` : '—'}
            </p>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={clampIndex(index, cards.length) >= cards.length - 1}
              aria-label={`Next municipality (${cards.length > 0 ? cards[clampIndex(index, cards.length) + 1]?.name ?? '' : ''})`}
              className="cursor-pointer min-h-11 shrink-0 rounded-md border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </CollapsibleSection>
  )
}
