import { useState, useEffect, useRef, useCallback } from "react"
import { usePrefersReducedMotion } from "../components/MapControlsOverlay.jsx"
import {
  HUD_COLLAPSE_MS,
  LEAVE_DEBOUNCE_MS,
  PIN_BY_DEFAULT,
  resolveExpanded,
} from "./hudReveal.js"

export function HoverRevealHud({
  children,
  renderPill,
  renderExpanded,
  pinned: controlledPinned,
  onPinChange,
  className = "",
  style = {},
  "aria-label": ariaLabel,
  "aria-controls": ariaControls,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [internalPinned, setInternalPinned] = useState(PIN_BY_DEFAULT)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const leaveTimerRef = useRef(null)

  const pinned = controlledPinned ?? internalPinned
  const setPinned = controlledPinned == null ? setInternalPinned : onPinChange
  const expanded = resolveExpanded({ pinned, hovered, focused })

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])

  const handlePointerEnter = useCallback(
    (event) => {
      // Touch / pen: let the click toggle handle it
      if (event.pointerType !== "mouse") return
      clearLeaveTimer()
      setHovered(true)
    },
    [clearLeaveTimer],
  )

  const handlePointerLeave = useCallback(
    (event) => {
      if (event.pointerType !== "mouse") return
      const related = event.relatedTarget
      if (related && event.currentTarget.contains(related)) return
      clearLeaveTimer()
      leaveTimerRef.current = setTimeout(() => setHovered(false), LEAVE_DEBOUNCE_MS)
    },
    [clearLeaveTimer],
  )

  const handleFocus = useCallback(() => setFocused(true), [])
  const handleBlur = useCallback(
    (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
    },
    [],
  )

  const handleClick = useCallback(
    (event) => {
      // On coarse pointers the pill itself is the toggle; on fine pointers
      // click pins/unpins. Either way we toggle the pinned state.
      if (event.pointerType === "mouse") {
        event.preventDefault()
      }
      setPinned(!pinned)
    },
    [pinned, setPinned],
  )

  // Cleanup timer on unmount
  useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer])

  const transitionDuration = prefersReducedMotion ? "0ms" : `${HUD_COLLAPSE_MS}ms`
  const sharedStyle = {
    ...style,
    transition: `opacity ${transitionDuration} ease, transform ${transitionDuration} ease, visibility ${transitionDuration} step-end`,
    opacity: expanded ? 1 : 0,
    transform: expanded ? "translateY(0)" : "translateY(4px)",
    visibility: expanded ? "visible" : "hidden",
    pointerEvents: expanded ? "auto" : "none",
  }

  const pill = renderPill({
    expanded,
    pinned,
    onClick: handleClick,
    "aria-expanded": expanded,
    "aria-controls": ariaControls,
    "aria-label": ariaLabel,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    tabIndex: 0,
  })

  const body = renderExpanded
    ? (
        <div
          id={ariaControls}
          role="region"
          aria-label={ariaLabel}
          style={sharedStyle}
          className="overflow-hidden"
        >
          {renderExpanded({ expanded, pinned })}
        </div>
      )
    : null

  return (
    <div
      className={`pointer-events-none ${className}`}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div className="pointer-events-auto">{pill}</div>
      {body}
    </div>
  )
}