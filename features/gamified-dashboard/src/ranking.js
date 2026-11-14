// Pure ranking for the gamified-dashboard feature. No React here.
// Significance is a flag, not a filter — non-significant entries stay in the list.

const slopeOf = (r) => r?.trend?.slope_c_per_year ?? 0
const pOf = (r) => r?.trend?.p_value ?? 1
const dangerOf = (r) => r?.total_danger_days_45y ?? 0
const peakOf = (r) => r?.peak_danger_days?.days ?? 0

const byName = (a, b) =>
  String(a?.name ?? '').localeCompare(String(b?.name ?? '')) ||
  String(a?.province ?? '').localeCompare(String(b?.province ?? ''))

// 'slope' is the extreme-first ordering (|slope| desc) used by Top hotspots.
// The list uses the directional modes below.
export function rankMunicipalities(list = [], mode = 'slope') {
  const rows = [...list]

  if (mode === 'name-asc') return rows.sort(byName)
  if (mode === 'name-desc') return rows.sort((a, b) => byName(b, a))

  if (mode === 'danger' || mode === 'danger-desc') {
    return rows.sort((a, b) => dangerOf(b) - dangerOf(a) || peakOf(b) - peakOf(a) || byName(a, b))
  }
  if (mode === 'danger-asc') {
    return rows.sort((a, b) => dangerOf(a) - dangerOf(b) || peakOf(a) - peakOf(b) || byName(a, b))
  }

  // Signed slope: fastest warming first, cooling last.
  if (mode === 'slope-desc') {
    return rows.sort((a, b) => slopeOf(b) - slopeOf(a) || pOf(a) - pOf(b) || byName(a, b))
  }
  if (mode === 'slope-asc') {
    return rows.sort((a, b) => slopeOf(a) - slopeOf(b) || pOf(a) - pOf(b) || byName(a, b))
  }

  return rows.sort(
    (a, b) => Math.abs(slopeOf(b)) - Math.abs(slopeOf(a)) || pOf(a) - pOf(b) || byName(a, b),
  )
}
