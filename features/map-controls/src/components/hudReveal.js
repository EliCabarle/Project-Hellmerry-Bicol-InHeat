// HUD collapse/expand tokens — safe ranges enforced by test_hud.mjs
export const HUD_COLLAPSE_MS = 180
export const LEAVE_DEBOUNCE_MS = 120
export const PIN_BY_DEFAULT = false
export const COLLAPSED_LEGEND_WIDTH = 180

// Centralised expansion logic so the wrapper and tests share the same truth table.
export function resolveExpanded({ pinned = false, hovered = false, focused = false }) {
  return pinned || hovered || focused
}