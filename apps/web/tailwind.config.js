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
        /* Landing clay palette (UI-SPEC Token Block). Consumed only inside the
           landing screen; the dark heat.* palette above stays the app theme. */
        clay: {
          bg: '#FFF7ED',
          card: '#FFFFFF',
          border: '#FED7AA',
          ink: '#9A3412',
          primary: '#F97316',
          onprimary: '#0F172A',
          accent: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
        display: ['Fredoka', '"Segoe UI Rounded"', 'system-ui', 'sans-serif'],
        body: ['Nunito', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hud: '0 18px 50px -24px rgba(0, 0, 0, 0.9)',
        'clay-outer': '4px 4px 8px rgba(154, 52, 18, 0.14)',
        'clay-outer-hover': '6px 6px 14px rgba(154, 52, 18, 0.18)',
        'clay-primary': '4px 4px 8px rgba(15, 23, 42, 0.20)',
      },
    },
  },
  plugins: [],
}
