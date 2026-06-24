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
      fontSize: {
        'xs':   ['12px', { lineHeight: '1.5' }],
        'sm':   ['14px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.6' }],
        'md':   ['16px', { lineHeight: '1.6' }],
        'lg':   ['17px', { lineHeight: '1.5' }],
        'xl':   ['19px', { lineHeight: '1.4' }],
        '2xl':  ['24px', { lineHeight: '1.3' }],
        '3xl':  ['30px', { lineHeight: '1.2' }],
        '4xl':  ['36px', { lineHeight: '1.1' }],
      },
      width: { '220': '220px', '240': '240px' },
    },
  },
  plugins: [],
}
