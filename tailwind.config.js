export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rig: {
          bg: '#0a0e1a',
          surface: '#111827',
          panel: '#1f2937',
          accent: '#fb923c',
          ok: '#10b981',
          critical: '#ef4444',
          text: '#e5e7eb',
          dim: '#6b7280',
          night: '#7f1d1d'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SF Mono', 'monospace'],
        display: ['system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}