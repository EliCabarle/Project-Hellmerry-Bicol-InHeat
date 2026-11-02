import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@features': path.resolve(here, '..', '..', 'features'),
      '@core': path.resolve(here, '..', '..', 'core'),
      // features/ lives outside apps/web: map bare deps into the web-owned node_modules
      react: path.resolve(here, 'node_modules', 'react'),
      'react-dom': path.resolve(here, 'node_modules', 'react-dom'),
      'react-leaflet': path.resolve(here, 'node_modules', 'react-leaflet'),
      leaflet: path.resolve(here, 'node_modules', 'leaflet'),
    },
  },
})
