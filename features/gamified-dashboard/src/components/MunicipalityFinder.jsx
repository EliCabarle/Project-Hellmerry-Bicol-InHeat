// Municipality Finder — Option B coverflow carousel + P1 placement.
// Province dropdown is derived from the data (never hardcoded); the stage is a
// fixed-height, non-scrolling coverflow: the spotlight card is fully
// interactive and flips front↔back (D-full), neighbours are decorative
// previews. One bounded stage — this section adds no scroll container.

import { useEffect, useMemo, useState } from 'react'
import { joinCards, countByProvince, provincesOf } from '../finderData.js'
import FinderCard from './FinderCard.jsx'

// Offsets are wrapper-relative: neighbours lean away and recede in Z so the
// spotlight card reads as front-of-stack.
const OFFSET_STYLES = {
  '-1': 'translateX(-64%) translateZ(-130px) rotateY(32deg) scale(0.82)',
  '0': 'translateX(0px) translateZ(0px) rotateY(0deg) scale(1)',
  '1': 'translateX(64%) translateZ(-130px) rotateY(-32deg) scale(0.82)',
}
const OPACITIES = { '-1': 'opacity-45', '0': 'opacity-100', '1': 'opacity-45' }

const clampIndex = (i, n) => Math.max(0, Math.min(i, Math.max(0, n - 1)))

export default function MunicipalityFinder({ geojson = null, narratives = null, onShowOnMap = null }) {
  const municipalities = narratives?.municipalities ?? []
  const provinces = useMemo(() => provincesOf(municipalities), [municipalities])
  const counts = useMemo(() => countByProvince(municipalities), [municipalities])

  const [province, setProvince] = useState('All')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const cards = useMemo(() => joinCards(geojson, narratives, province), [geojson, narratives, province])

  // A new filter is a new browse position — reset the spotlight and any flip.
  useEffect(() => {
    setIndex(0)
    setFlipped(false)
  }, [province])

  const current = cards.length > 0 ? cards[clampIndex(index, cards.length)] : null
  const go = (delta) => {
    setFlipped(false)
    setIndex((i) => clampIndex(i + delta, cards.length))
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

  if (!geojson) return null

  const step = (i) => {
    const offset = i - clampIndex(index, cards.length)
    return Math.abs(offset) > 1 ? null : String(offset)
  }

  return (
    <section aria-label="Municipality finder" className="mt-4 rounded-xl border border-white/10 bg-heat-surface/50 p-3 shadow-hud">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Municipality finder</h2>
          <p className="text-[10px] text-slate-500">
            Browse every LGU&rsquo;s outline — flip a card for its trend, sample and why it heats.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="finder-province" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Province
          </label>
          <select
            id="finder-province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="cursor-pointer rounded-lg border border-white/10 bg-heat-deep/90 px-2 py-1.5 font-mono text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
          >
            <option value="All">All ({municipalities.length})</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p} ({counts.get(p) ?? 0})
              </option>
            ))}
          </select>
        </div>
      </header>

      {cards.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500">No municipalities for this filter.</p>
      ) : (
        <>
          {/* Stage: fixed height, no scroll. Center card is the only interactive one. */}
          <div
            role="group"
            aria-label="Municipality card carousel — use left and right arrow keys to browse"
            tabIndex={0}
            onKeyDown={onKeyDown}
            className="relative mx-auto mt-2 h-[21rem] max-w-3xl [perspective:1200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber/60"
          >
            {cards.map((card, i) => {
              const offset = step(i)
              if (offset === null) return null
              const isCenter = offset === '0'
              return (
                <div
                  key={card.key}
                  aria-hidden={!isCenter || undefined}
                  className={`absolute left-1/2 top-0 h-[19rem] w-[17rem] -translate-x-1/2 transition-opacity duration-500 ${
                    isCenter ? 'z-20' : 'z-10 pointer-events-none'
                  } ${OPACITIES[offset]}`}
                >
                  {/* Coverflow transform lives on an inner div so it cannot clash
                      with the Tailwind centering translate on the wrapper. */}
                  <div
                    className="h-full transition-transform duration-500 [transform-style:preserve-3d]"
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

          <div className="mt-1 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={clampIndex(index, cards.length) === 0}
              aria-label={`Previous municipality (${cards.length > 0 ? cards[clampIndex(index, cards.length)]?.name ?? '' : ''})`}
              className="cursor-pointer rounded-md border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <p aria-live="polite" className="min-w-40 text-center font-mono text-[10px] text-slate-400">
              {current ? `${current.name} — ${clampIndex(index, cards.length) + 1} of ${cards.length}` : '—'}
            </p>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={clampIndex(index, cards.length) >= cards.length - 1}
              aria-label={`Next municipality (${cards.length > 0 ? cards[clampIndex(index, cards.length) + 1]?.name ?? '' : ''})`}
              className="cursor-pointer rounded-md border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </section>
  )
}
