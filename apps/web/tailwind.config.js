/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', '../../features/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Feature slices read these tokens; remapped to the clay world so every
        // existing component inherits the light surface without JSX rewrites.
        heat: {
          bg: '#FDF3E7',
          deep: '#EFE9FE',
          surface: '#FFFFFF',
          panel: '#FFFFFF',
          line: '#FED7AA',
          dark: '#CBD5E1',
          darkline: '#94A3B8',
          hot: '#BE123C',
          hotline: '#FDA4AF',
          sig: '#BE123C',
          amber: '#F97316',
          eco: '#059669',
          orange: '#FB923C',
          cool: '#5EEAD4',
          ink: '#9A3412',
          muted: '#64748B',
        },
        // Slate flips from light-on-dark to ink-on-clay (text usages).
        // In light mode slate-100/200 are the primary/secondary ink, now the
        // landing's burnt-orange so text reads as one scheme across the site.
        // Dark mode overrides all slate text to light (dark-theme.css).
        slate: {
          50: '#F8F7FF',
          100: '#9A3412',
          200: '#9A3412',
          300: '#4A4984',
          400: '#6B7393',
          500: '#64748B',
          600: '#94A3B8',
          700: '#CBD5E1',
          800: '#E2E8F0',
          900: '#EDE9FE',
          950: '#1E1B4B',
        },
        // One `clay` key: the app palette plus the landing-only additions
        // (UI-SPEC Token Block). The app's bg/white/text-* stay authoritative;
        // landing consumes primary/onprimary/ink/border/accent/card.
        clay: {
          bg: '#FDF3E7',
          'bg-blue-white': '#EFF6FF',
          'bg-green-white': '#F0FDF4',
          'bg-peach': '#FDF3E7',
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
          'text-heading': '#9A3412',
          'text-body': '#9A3412',
          'text-muted': '#64748B',
          'text-white': '#FFFFFF',
          // Landing-only keys.
          card: '#FFFFFF',
          border: '#FED7AA',
          ink: '#9A3412',
          primary: '#F97316',
          onprimary: '#0F172A',
          accent: '#2563EB',
        },
      },
      fontFamily: {
        clay: ['Nunito', 'system-ui', 'sans-serif'],
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
        display: ['Fredoka', '"Segoe UI Rounded"', 'system-ui', 'sans-serif'],
        body: ['Nunito', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Clay card depth every feature card already applies via `shadow-hud`.
        hud: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 0 0 #CBD5E1, 0 12px 24px rgba(30,27,75,0.10)',
        // Landing clay shadows (UI-SPEC Token Block).
        'clay-outer': '4px 4px 8px rgba(154, 52, 18, 0.14)',
        'clay-outer-hover': '6px 6px 14px rgba(154, 52, 18, 0.18)',
        'clay-primary': '4px 4px 8px rgba(15, 23, 42, 0.20)',
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
