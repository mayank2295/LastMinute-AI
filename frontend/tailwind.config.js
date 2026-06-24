/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:        '#111111',
        accent:         '#16a34a',
        'accent-light': '#f0fdf4',
        'accent-border':'#bbf7d0',
        'accent-text':  '#166534',
        'accent-hover': '#15803d',
        border:         '#e5e7eb',
        surface:        '#fafafa',
        muted:          '#6b7280',
        subtle:         '#f9fafb',
      },
    },
  },
  plugins: [],
}
