import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

const API_PROXY = {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
  '/health': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  // Split vendors so the map's first paint doesn't wait on the chart library
  // (recharts) or vice versa. All three chunks still share one react instance
  // via the aliases above.
  build: {
    rollupOptions: {
      output: {
        // Function form (matches by resolved module id, works with the aliases
        // above): charts + map libs split out; everything vendored stays put.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts')) return 'charts'
          if (id.includes('leaflet')) return 'maps'
          if (id.includes('react') || id.includes('supabase')) return 'vendor'
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@features': path.resolve(here, '..', '..', 'features'),
      '@core': path.resolve(here, '..', '..', 'core'),
      // features/ lives outside apps/web: map bare deps into the web-owned node_modules
      react: path.resolve(here, 'node_modules', 'react'),
      'react-dom': path.resolve(here, 'node_modules', 'react-dom'),
      'react-leaflet': path.resolve(here, 'node_modules', 'react-leaflet'),
      leaflet: path.resolve(here, 'node_modules', 'leaflet'),
      'maplibre-gl': path.resolve(here, 'node_modules', 'maplibre-gl'),
      recharts: path.resolve(here, 'node_modules', 'recharts'),
    },
  },
  // Dev + preview: the frontend calls /api/qa and Vite forwards to FastAPI on
  // 8000. Preview needs its own copy — `server.proxy` does not apply to it.
  server: {
    proxy: API_PROXY,
  },
  preview: {
    proxy: API_PROXY,
  },
})
