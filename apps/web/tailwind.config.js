/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', '../../features/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        heat: {
          bg: '#070a0f',
          deep: '#0a1018',
          surface: '#0d141e',
          panel: '#111a26',
          line: '#223044',
          dark: '#1f2937',
          darkline: '#475569',
          hot: '#ef4444',
          hotline: '#fca5a5',
          sig: '#b91c1c',
          amber: '#fbbf24',
          eco: '#22c55e',
          orange: '#fb923c',
          cool: '#67e8f9',
          ink: '#e6edf5',
          muted: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        hud: '0 18px 50px -24px rgba(0, 0, 0, 0.9)',
      },
    },
  },
  plugins: [],
}
