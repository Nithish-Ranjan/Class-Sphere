/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F7FB',
        'canvas-deep': '#E9EFF7',
        'surface-deep': '#FFFFFF',
        'surface-raised': '#F1F5F9',
        'surface-frosted': 'rgba(255, 255, 255, 0.86)',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        'text-muted': '#5B6B7C',
        teal: {
          DEFAULT: '#0D6B63',
          hover: '#0A5A53',
          dim: 'rgba(13, 148, 136, 0.10)',
          glow: 'rgba(13, 148, 136, 0.20)',
          bright: '#14B8A6',
        },
        'glass-border': 'rgba(15, 23, 42, 0.09)',
        'input-border': 'rgba(15, 23, 42, 0.16)',
        semantic: {
          success: '#15803D',
          'success-bg': 'rgba(21, 128, 61, 0.10)',
          warning: '#B45309',
          'warning-bg': 'rgba(180, 83, 9, 0.10)',
          danger: '#DC2626',
          'danger-bg': 'rgba(220, 38, 38, 0.10)',
          info: '#0369A1',
          'info-bg': 'rgba(3, 105, 161, 0.10)',
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glass-card':
          '0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 18px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.04)',
        'glass-dropdown':
          '0 16px 40px -14px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(15, 23, 42, 0.07)',
        'nav-rail':
          '0 10px 28px -14px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06)',
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
};
