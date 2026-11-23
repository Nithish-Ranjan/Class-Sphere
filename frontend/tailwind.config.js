/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0B1117',
        'surface-deep': '#121D26',
        'surface-raised': '#1A2933',
        'surface-frosted': 'rgba(24, 39, 49, 0.76)',
        'text-primary': '#F2F6F7',
        'text-secondary': '#A7B6BD',
        'text-muted': '#71838C',
        teal: {
          DEFAULT: '#36B5A5',
          hover: '#2da091',
          dim: 'rgba(54, 181, 165, 0.14)',
          glow: 'rgba(54, 181, 165, 0.25)',
        },
        'glass-border': 'rgba(207, 225, 231, 0.14)',
        'input-border': 'rgba(207, 225, 231, 0.20)',
        semantic: {
          success: '#22C55E',
          'success-bg': 'rgba(34, 197, 94, 0.12)',
          warning: '#F59E0B',
          'warning-bg': 'rgba(245, 158, 11, 0.12)',
          danger: '#EF4444',
          'danger-bg': 'rgba(239, 68, 68, 0.12)',
          info: '#38BDF8',
          'info-bg': 'rgba(56, 189, 248, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glass-card': '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(207, 225, 231, 0.10)',
        'glass-dropdown': '0 12px 32px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(207, 225, 231, 0.14)',
        'nav-rail': '0 8px 32px 0 rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(207, 225, 231, 0.14)',
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
};
