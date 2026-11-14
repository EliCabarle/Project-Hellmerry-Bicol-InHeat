// Hand-rolled glyphs for the web shell, matching the repo's SVG contract:
// viewBox 24, stroke currentColor, strokeWidth 1.8, round caps/joins, aria-hidden.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function IconMenu(props) {
  return <svg {...base} {...props}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
}

export function IconSun(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

export function IconMoon(props) {
  return <svg {...base} {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
}

export function IconChevronDown(props) {
  return <svg {...base} {...props}><path d="m6 9 6 6 6-6" /></svg>
}

export function IconUser(props) {
  return (
    <svg {...base} {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function IconTrophy(props) {
  return (
    <svg {...base} {...props}>
      <path d="M13 7h-2l-1 9L6 20v2h12v-2l-1-9-1-9H13Z" />
      <path d="M9 14h6" />
    </svg>
  )
}

export function IconGrid(props) {
  return <svg {...base} {...props}><path d="M3 6h3M3 12h3M3 18h3M18 6h3M18 12h3M18 18h3M6 3v3M12 3v3M18 3v3M6 18v3M12 18v3M18 18v3" /></svg>
}

export function IconGear(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1a1.65 1.65 0 0 0-1-1.51z" />
    </svg>
  )
}

export function IconSignOut(props) {
  return <svg {...base} {...props}><path d="M21 12h-9M17 6l5 5-5 5M21 12V3" /></svg>
}

export function IconMap(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

export function IconCheck(props) {
  return <svg {...base} {...props}><path d="m5 13 4 4L19 7" /></svg>
}

export function IconPlus(props) {
  return <svg {...base} {...props}><path d="M12 5v14M5 12h14" /></svg>
}

export function IconMinus(props) {
  return <svg {...base} {...props}><path d="M5 12h14" /></svg>
}
