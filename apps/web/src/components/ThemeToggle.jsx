// Light/dark toggle for the whole UI. Owns no state: app.jsx holds the theme
// (so the no-flash script, the navbar and the persisted choice stay in sync)
// and passes the current value + a setter here.
import { IconMoon, IconSun } from './Icons.jsx'

export default function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={dark}
      title={label}
      className="bih-btn inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-white/20 bg-white text-clay-text-heading font-clay font-bold hover:bg-clay-bg-blue-white hover:text-clay-text-heading"
    >
      {dark ? (
        <IconSun className="h-5 w-5 text-clay-text-heading" />
      ) : (
        <IconMoon className="h-5 w-5 text-clay-text-heading" />
      )}
    </button>
  )
}
