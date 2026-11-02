/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        heat: {
          bg: '#0b0f1a',
          dark: '#1f2937',
          darkline: '#475569',
          hot: '#ef4444',
          hotline: '#fca5a5',
        },
      },
    },
  },
  plugins: [],
}
