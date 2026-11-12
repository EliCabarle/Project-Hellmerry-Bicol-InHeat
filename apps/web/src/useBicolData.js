import { useCallback, useEffect, useState } from 'react'

const URLS = ['/data/bicol-municipalities.geojson', '/data/narratives.json']

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.json()
}

export default function useBicolData() {
  const [state, setState] = useState({
    status: 'loading',
    error: null,
    geojson: null,
    narratives: null,
    coverage: { withData: 0, total: 0 },
  })
  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    Promise.all(URLS.map(fetchJson))
      .then(([geojson, narratives]) =>
        setState({
          status: 'ready',
          error: null,
          geojson,
          narratives,
          coverage: {
            withData: narratives?.municipalities?.length ?? 0,
            total: geojson?.features?.length ?? 0,
          },
        }),
      )
      .catch((e) => setState((s) => ({ ...s, status: 'error', error: e.message })))
  }, [])
  useEffect(load, [load])
  return { ...state, reload: load }
}
