// Offline = last-viewed content only (CONCEPT): the shell + build assets are
// precached at install; data JSON is cached as it is viewed.
// shortcut: old hashed assets linger in the cache until CACHE is renamed, so it
// grows slowly across deploys. Upgrade to vite-plugin-pwa (workbox) when that matters.
const CACHE = 'bih-v2'
const SHELL = ['/', '/index.html']
const OFFLINE_FALLBACK = '/offline.html'

// Precache the build's hashed JS/CSS too, otherwise the app installs but cannot
// boot offline until the user has loaded it a second time.
async function precache() {
  const cache = await caches.open(CACHE)
  await cache.addAll(SHELL)
  const html = await (await cache.match('/index.html')).text()
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
  // Per-asset: one 404 must not fail the whole install and leave no worker.
  await Promise.all(assets.map((url) => cache.add(url).catch(() => {})))
}

// Navigation preload: lets the network request start in parallel with SW boot,
// so navigations feel instant even on slow connections.
async function enableNavigationPreload() {
  if ('navigationPreload' in self.registration) {
    await self.registration.navigationPreload.enable()
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        ),
      enableNavigationPreload(),
      self.clients.claim(),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Basemap tiles are cross-origin and huge: network only.
  if (url.origin !== self.location.origin) return

  // Navigations: network first, cache fallback, offline page as last resort.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      }).catch(() =>
        caches.match(request).then(
          (hit) =>
            hit ||
            caches.match('/index.html').then((shellHit) =>
              shellHit || caches.match(OFFLINE_FALLBACK)
            ),
        ),
    )
    return
  }

  // Data JSON (/data/): network first, cache fallback, error otherwise.
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      }).catch(() =>
        caches.match(request).then((hit) => hit || Response.error()),
      ),
    )
    return
  }

  // Static build output is content-hashed, so cache-first is safe.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
