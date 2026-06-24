/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'space':       '#070711',
        'panel':       '#0e0e1f',
        'panel-light': '#13132b',
        'border':      '#1f1f42',
        'blue':        '#2563eb',
        'blue-glow':   '#3b82f6',
        'blue-dim':    '#1d4ed8',
        'red-alert':   '#ef4444',
        'orange-warn': '#f97316',
        'yellow-note': '#eab308',
        'green-ok':    '#22c55e',
        'text-muted':  '#6b7280',
        'text-dim':    '#374151',
      },
      boxShadow: {
        'glow-blue':  '0 0 20px rgba(59,130,246,0.4)',
        'glow-red':   '0 0 20px rgba(239,68,68,0.4)',
        'glow-green': '0 0 20px rgba(34,197,94,0.3)',
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up':   'slide-up 0.25s ease-out',
        'fade-in':    'fade-in 0.2s ease-out',
        'countdown':  'countdown 1s linear infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0.6)' },
          '50%':      { boxShadow: '0 0 0 12px rgba(59,130,246,0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
