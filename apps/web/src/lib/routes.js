// Route grammar — the single source of truth for mapping a URL hash to app
// state on page load. Exact-match token table (no prefix matching beyond the
// legacy '#muni=' branch), so a near-miss (#mapx), a foreign fragment
// (#access_token=... from Supabase's implicit OAuth flow) or the skip-link
// target (#main) is never mistaken for a route — those return null and the
// shell falls back to the first-visit Landing screen (lead ruling 2026-11-14).

const MUNI_PREFIX = '#muni='

// '#token' → { screen, tab }. The four dashboard sub-tab tokens imply the
// dashboard screen (D-03): '#quests' is both the tab id and the hash token.
const ROUTES = {
  '#map': { screen: 'map', tab: null },
  '#dashboard': { screen: 'dashboard', tab: 'dashboard' },
  '#quests': { screen: 'dashboard', tab: 'quests' },
  '#history': { screen: 'dashboard', tab: 'history' },
  '#leaderboard': { screen: 'dashboard', tab: 'leaderboard' },
  '#account': { screen: 'account', tab: null },
  '#settings': { screen: 'settings', tab: null },
  '#landing': { screen: 'landing', tab: null },
}

/**
 * Parse a location.hash value into { screen, tab, muniKey }.
 * - '' (first visit, no hash) → Landing — the empty entry is a real route.
 * - '#muni=<encoded joinKey>' → map with that municipality selected; the
 *   decode is guarded exactly like the original parseMuniHash, so malformed
 *   percent-encoding yields null instead of throwing.
 * - one of the eight screen tokens → that screen (sub-tab tokens → dashboard).
 * - anything else → null (caller falls back to Landing).
 */
export function parseRoute(hash) {
  const raw = typeof hash === 'string' ? hash : ''
  if (raw === '') return { screen: 'landing', tab: null, muniKey: null }
  if (raw.startsWith(MUNI_PREFIX)) {
    try {
      const key = decodeURIComponent(raw.slice(MUNI_PREFIX.length))
      return key ? { screen: 'map', tab: null, muniKey: key } : null
    } catch {
      return null
    }
  }
  const route = ROUTES[raw]
  return route ? { screen: route.screen, tab: route.tab, muniKey: null } : null
}

/**
 * Render the canonical hash for a navigation target. A map target with a
 * municipality key renders the legacy '#muni=' deep link (shareable, and the
 * only encoding the parser accepts back); every other target is '#<target>'.
 */
export function hashFor(target, muniKey = null) {
  if (target === 'map' && muniKey) return MUNI_PREFIX + encodeURIComponent(muniKey)
  return `#${target}`
}
