export const DESIGN_TOKENS = {
  colors: {
    canvas: '#0B1117',
    surfaceDeep: '#121D26',
    surfaceRaised: '#1A2933',
    surfaceFrosted: 'rgba(24, 39, 49, 0.76)',
    textPrimary: '#F2F6F7',
    textSecondary: '#A7B6BD',
    textMuted: '#71838C',
    teal: '#36B5A5',
    tealHover: '#2da091',
    tealDim: 'rgba(54, 181, 165, 0.14)',
    glassBorder: 'rgba(207, 225, 231, 0.14)',
    inputBorder: 'rgba(207, 225, 231, 0.20)',
    semantic: {
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#38BDF8',
    },
  },
  typography: {
    fontSans: 'Geist, system-ui, -apple-system, sans-serif',
    fontMono: 'Geist Mono, monospace',
  },
  animation: {
    durationFast: 180,
    durationNormal: 260,
    durationSlow: 340,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;
