// Pure ranking for the gamified-dashboard feature. No React here.
// Significance is a flag, not a filter — non-significant entries stay in the list.

export function rankMunicipalities(list = [], mode = 'slope') {
  const rows = [...list]
  if (mode === 'danger') {
    return rows.sort(
      (a, b) =>
        (b?.total_danger_days_45y ?? 0) - (a?.total_danger_days_45y ?? 0) ||
        (b?.peak_danger_days?.days ?? 0) - (a?.peak_danger_days?.days ?? 0) ||
        Math.abs(b?.trend?.slope_c_per_year ?? 0) - Math.abs(a?.trend?.slope_c_per_year ?? 0),
    )
  }
  return rows.sort(
    (a, b) =>
      Math.abs(b?.trend?.slope_c_per_year ?? 0) - Math.abs(a?.trend?.slope_c_per_year ?? 0) ||
      (a?.trend?.p_value ?? 1) - (b?.trend?.p_value ?? 1) ||
      String(a?.name ?? '').localeCompare(String(b?.name ?? '')),
  )
}
