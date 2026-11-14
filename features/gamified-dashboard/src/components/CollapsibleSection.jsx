// Native <details> accordion shell. The chevron is the only control: the panel
// is controlled so a click anywhere else in the header cannot collapse it.
// `open` is React state (not just an initial attribute) because the header click
// is cancelled — native toggling would otherwise fight the button.
//
// Two shapes: named (title + tech on the left) and "bare" (title == null), used
// to group two sibling cards under one chevron with their own titles intact.
import { useEffect, useId, useState } from 'react'
import DualLabel from './DualLabel.jsx'

const CHEVRON =
  'grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-white/15 bg-black/20 text-xs text-slate-400 transition-transform duration-200 group-open:rotate-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber'

export default function CollapsibleSection({
  title = null,
  tech = '',
  aside = null,
  ariaLabel,
  bareLabel = '',
  openSignal = 0,
  className = 'mt-4',
  bodyClassName = 'px-3 pb-3',
  children,
}) {
  const [open, setOpen] = useState(true)
  const bodyId = useId()
  const bare = !title

  // A list/hotspot click asks this section to reveal itself.
  useEffect(() => {
    if (openSignal) setOpen(true)
  }, [openSignal])

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className={`group rounded-xl border border-white/10 bg-heat-surface/70 shadow-hud ${className}`}
    >
      <summary
        // Keyboard users tab to the chevron button instead; the summary stays
        // focusable programmatically for assistive tech that targets it.
        tabIndex={-1}
        onClick={(e) => {
          // Pointer clicks anywhere but the arrow must not toggle. Keyboard
          // activation (detail === 0) is left alone.
          const onChevron = e.target instanceof Element && e.target.closest('[data-chevron]')
          if (e.detail !== 0 && !onChevron) e.preventDefault()
        }}
        className="flex min-h-11 cursor-default list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden"
      >
        <span className="min-w-0">
          {bare ? (
            <span className="block truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
              {bareLabel}
            </span>
          ) : (
            <DualLabel label={title} tech={tech} className="text-slate-400" />
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {aside}
          <button
            type="button"
            data-chevron
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={`Toggle ${ariaLabel ?? (typeof title === 'string' ? title : bareLabel || 'section')}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            className={CHEVRON}
          >
            ▾
          </button>
        </span>
      </summary>
      <div id={bodyId} className={bodyClassName}>
        {children}
      </div>
    </details>
  )
}
