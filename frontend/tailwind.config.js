/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Slate Professional — blue accent on light slate/white
        primary:        '#1e293b',   // dark slate — body text & headings
        accent:         '#2563eb',   // blue-600 — primary accent
        'accent-light': '#eff6ff',   // blue-50  — tints, icon backgrounds
        'accent-border':'#bfdbfe',   // blue-200
        'accent-text':  '#1d4ed8',   // blue-700 — text on tints
        'accent-hover': '#1d4ed8',   // blue-700 — button hover
        border:         '#e2e8f0',   // slate-200
        surface:        '#f8fafc',   // slate-50 — page background
        muted:          '#64748b',   // slate-500 — secondary text
        subtle:         '#f1f5f9',   // slate-100 — hover surfaces
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
