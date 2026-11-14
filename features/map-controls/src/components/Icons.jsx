const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function IconChevronDown(props) {
  return <svg {...base} {...props}><path d="m6 9 6 6 6-6" /></svg>
}

export function IconChevronLeft(props) {
  return <svg {...base} {...props}><path d="m15 18-6-6 6-6" /></svg>
}

export function IconChevronRight(props) {
  return <svg {...base} {...props}><path d="m9 18 6-6-6-6" /></svg>
}

export function IconPlus(props) {
  return <svg {...base} {...props}><path d="M12 5v14M5 12h14" /></svg>
}

export function IconMinus(props) {
  return <svg {...base} {...props}><path d="M5 12h14" /></svg>
}

export function IconReset(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

export function IconLayers(props) {
  return <svg {...base} {...props}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /><path d="m3 18 9 5 9-5" /></svg>
}

export function IconX(props) {
  return <svg {...base} {...props}><path d="M18 6 6 18M6 6l12 12" /></svg>
}

export function IconPlay(props) {
  return <svg {...base} {...props}><path d="m8 5 11 7-11 7V5Z" /></svg>
}

export function IconPause(props) {
  return <svg {...base} {...props}><path d="M8 5v14M16 5v14" /></svg>
}

export function IconSearch(props) {
  return <svg {...base} {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
}

export function IconMap(props) {
  return <svg {...base} {...props}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></svg>
}

export function IconList(props) {
  return <svg {...base} {...props}><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></svg>
}

export function IconTrend(props) {
  return <svg {...base} {...props}><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
}

export function IconThermometer(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z" />
      <path d="M12 9v6" />
    </svg>
  )
}

export function IconCheck(props) {
  return <svg {...base} {...props}><path d="M20 6 9 17l-5-5" /></svg>
}

export function IconRobot(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2h-4v2h4ZM8 9h8v11H8Z" />
      <path d="M10 10h1v1h-1ZM13 10h1v1h-1ZM10 14h1v1h-1ZM13 14h1v1h-1Z" />
    </svg>
  )
}
