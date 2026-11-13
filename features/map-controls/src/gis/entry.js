// Shared stagger constants + delay schedule for the entry wave.
// One formula keeps the 3D height wave and the 2D opacity reveal in sync.
//
// Stagger: areas rise/fade into place in sequence, ordered centroid
// north-to-south (top-down). Clamp delay, not count — the last area still
// starts by STAGGER_CAP - ENTRY_DURATION_MS no matter how many areas exist.
export const STAGGER_MS = 18; // per-area delay (ms)
export const STAGGER_CAP = 400; // total ms for the whole sequence
export const ENTRY_DURATION_MS = 300; // ms for one area to ease from ENTRY_FROM to full
export const ENTRY_FROM = 0; // start value as a fraction of full depth/opacity

// Per-area delays, indexed by position in the centroid north-to-south order.
// `reduced` forces all delays to 0 (no animation under prefers-reduced-motion).
export function entryDelays(n, { reduced = false } = {}) {
  if (n <= 1) return [0];
  const maxDelay = (n - 1) * STAGGER_MS;
  const maxStart = reduced ? 0 : STAGGER_CAP - ENTRY_DURATION_MS;
  let scale = 1;
  if (maxDelay > maxStart && n > 1) scale = maxStart / maxDelay;
  return Array.from({ length: n }, (_, i) => i * STAGGER_MS * scale);
}
