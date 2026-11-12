// Dual-label renderer: plain-language headline + always-visible technical line.
// No hover/tap gating — both audiences read both lines at a glance.
export default function DualLabel({
  label,
  tech = '',
  className = '',
  techClassName = '',
}) {
  return (
    <span className={`block ${className}`}>
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-200">
        {label}
      </span>
      {tech ? (
        <span className={`block text-xs font-mono text-slate-500 mt-0.5 ${techClassName}`}>
          {tech}
        </span>
      ) : null}
    </span>
  )
}
