export const motionTokens = {
  duration: {
    fast: 0.16,
    normal: 0.32,
    slow: 0.5,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  distance: {
    small: 8,
    medium: 18,
  },
} as const;
