// Unique provinces present in a row list, sorted A→Z.
// Feeds the province selector on the ranking table; does not reorder rows —
// rank order (1–114 under the active sort mode) is preserved by ranking.js.
export function provinceList(rows = []) {
  const set = new Set()
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return
    const p = String(row?.province ?? '').trim()
    if (p) set.add(p)
  })
  return [...set].sort((a, b) => String(a).localeCompare(String(b)))
}
