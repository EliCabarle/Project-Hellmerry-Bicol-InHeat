// Native <details> accordion shell. The summary is the minimize control:
// keyboard handling, aria-expanded and the open/closed state come free from the
// platform, matching the <details> already used by ChartDataTable. `open` is an
// initial value only — React does not rewrite it after mount, so a chart that
// re-renders on hover cannot re-open a section the user collapsed.
//
// Two shapes: named (title + tech on the left) and "bare" (title == null), used
// to group sibling cards behind one chevron without inventing a title for them.
import DualLabel from './DualLabel.jsx'

const SUMMARY_BASE =
  'flex cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber [&::-webkit-details-marker]:hidden'
const CHEVRON =
  'grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/15 bg-black/20 text-xs text-slate-400 transition-transform duration-200 group-open:rotate-180'

export default function CollapsibleSection({
  title = null,
  tech = '',
  aside = null,
  ariaLabel,
  collapsedLabel = '',
  className = 'mt-4',
  bodyClassName = 'px-3 pb-3',
  children,
}) {
  const bare = !title
  return (
    <details
      open
      aria-label={bare ? undefined : ariaLabel}
      className={`group ${bare ? '' : 'rounded-xl border border-white/10 bg-heat-surface/70 shadow-hud'} ${className}`}
    >
      <summary
        aria-label={bare ? ariaLabel : undefined}
        className={
          bare
            ? `${SUMMARY_BASE} h-8 items-center justify-end`
            : `${SUMMARY_BASE} min-h-11 items-center justify-between gap-2 px-3 py-2.5`
        }
      >
        {bare ? (
          // Visible only while collapsed — expanded, the cards carry their own titles.
          <span className="mr-auto min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-slate-500 group-open:hidden">
            {collapsedLabel}
          </span>
        ) : (
          <DualLabel label={title} tech={tech} className="text-slate-400" />
        )}
        <span className="flex shrink-0 items-center gap-2">
          {aside}
          <span aria-hidden="true" className={CHEVRON}>
            ▾
          </span>
        </span>
      </summary>
      <div className={bodyClassName}>{children}</div>
    </details>
  )
}