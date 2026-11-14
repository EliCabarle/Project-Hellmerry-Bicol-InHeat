/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', '../../features/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Feature slices read these tokens; remapped to the clay world so every
        // existing component inherits the light surface without JSX rewrites.
        heat: {
          bg: '#F5F3FF',
          deep: '#EFE9FE',
          surface: '#FFFFFF',
          panel: '#FFFFFF',
          line: '#E2E8F0',
          dark: '#CBD5E1',
          darkline: '#94A3B8',
          hot: '#BE123C',
          hotline: '#FDA4AF',
          sig: '#BE123C',
          amber: '#FCD34D',
          eco: '#059669',
          orange: '#FB923C',
          cool: '#5EEAD4',
          ink: '#1E1B4B',
          muted: '#64748B',
        },
        // Slate flips from light-on-dark to ink-on-clay (text usages).
        slate: {
          50: '#F8F7FF',
          100: '#1E1B4B',
          200: '#312E81',
          300: '#4A4984',
          400: '#6B7393',
          500: '#64748B',
          600: '#94A3B8',
          700: '#CBD5E1',
          800: '#E2E8F0',
          900: '#EDE9FE',
          950: '#1E1B4B',
        },
        clay: {
          bg: '#F5F3FF',
          'bg-blue-white': '#EFF6FF',
          'bg-green-white': '#F0FDF4',
          'bg-peach': '#FFF7ED',
          blue: '#60A5FA',
          'blue-shadow': '#1D4ED8',
          green: '#34D399',
          'green-shadow': '#059669',
          yellow: '#FCD34D',
          'yellow-shadow': '#B45309',
          coral: '#FB7185',
          'coral-shadow': '#BE123C',
          purple: '#A78BFA',
          'purple-shadow': '#6D28D9',
          teal: '#2DD4BF',
          'teal-shadow': '#0F766E',
          orange: '#FB923C',
          'orange-shadow': '#C2410C',
          white: '#FFFFFF',
          'white-shadow': '#CBD5E1',
          'text-heading': '#1E1B4B',
          'text-body': '#312E81',
          'text-muted': '#64748B',
          'text-white': '#FFFFFF',
        },
      },
      fontFamily: {
        clay: ['Nunito', 'system-ui', 'sans-serif'],
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        // Was a dark drop shadow; now the clay card depth every feature card
        // already applies via `shadow-hud`.
        hud: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 0 0 #CBD5E1, 0 12px 24px rgba(30,27,75,0.10)',
      },
      borderRadius: {
        md: '12px',
        lg: '14px',
        xl: '20px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
}
