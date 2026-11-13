// Native <details> accordion shell. The summary is the minimize control:
// keyboard handling, aria-expanded and the open/closed state come free from the
// platform, matching the <details> already used by ChartDataTable. `open` is an
// initial value only — React does not rewrite it after mount, so a chart that
// re-renders on hover cannot re-open a section the user collapsed.
import DualLabel from './DualLabel.jsx'

export default function CollapsibleSection({
  title,
  tech = '',
  aside = null,
  ariaLabel,
  className = 'mt-4',
  bodyClassName = 'px-3 pb-3',
  children,
}) {
  return (
    <details
      open
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
      className={`group rounded-xl border border-white/10 bg-heat-surface/70 shadow-hud ${className}`}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber [&::-webkit-details-marker]:hidden">
        <DualLabel label={title} tech={tech} className="text-slate-400" />
        <span className="flex shrink-0 items-center gap-2">
          {aside}
          <span
            aria-hidden="true"
            className="text-slate-500 transition-transform duration-200 group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className={bodyClassName}>{children}</div>
    </details>
  )
}
