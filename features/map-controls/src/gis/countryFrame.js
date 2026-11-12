// Single source of truth for the camera frame (country/study frame).
// Bicol region bounds with padding beyond coastline.
const PAD = 0.15

const RAW_BOUNDS = [
  [11.5, 121.5],
  [15.2, 125.8],
]

// Pad: expand bounds by PAD degrees in all directions
export const COUNTRY_BOUNDS = [
  [RAW_BOUNDS[0][0] - PAD, RAW_BOUNDS[0][1] - PAD],
  [RAW_BOUNDS[1][0] + PAD, RAW_BOUNDS[1][1] + PAD],
]

// Study region bounds (reset target) - tighter, no extra padding beyond what's needed for fit
export const STUDY_REGION_BOUNDS = RAW_BOUNDS

// Floor zoom that fits the country box with padding; safe ±0.5
export const FLOOR_ZOOM = 7.0
export const MIN_ZOOM = FLOOR_ZOOM
export const MAX_ZOOM = 18

// Viscosity for maxBounds resistance (0.4-0.85)
export const BOUNDS_VISCOSITY = 0.6
