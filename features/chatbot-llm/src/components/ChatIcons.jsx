// Hand-rolled glyphs for the chatbot, matching the repo's SVG contract:
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

export function IconRobot(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2h-4v2h4ZM8 9h8v11H8Z" />
      <path d="M10 10h1v1h-1ZM13 10h1v1h-1ZM10 14h1v1h-1ZM13 14h1v1h-1Z" />
    </svg>
  )
}

export function IconSend(props) {
  return <svg {...base} {...props}><path d="M2 2l20 12-20 12Z" /></svg>
}

export function IconClose(props) {
  return <svg {...base} {...props}><path d="M18 6 6 18M6 6l12 12" /></svg>
}
