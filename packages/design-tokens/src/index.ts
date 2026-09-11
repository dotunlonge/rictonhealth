/** @ricton/design-tokens — semantic seed (navy/blue/slate + semantics). */
export const tokens = {
  color: {
    navy: '#0A192F',
    action: '#1877F2',
    actionDark: '#1565C0',
    success: '#059669',
    warning: '#D97706',
    danger: '#E11D48',
    info: '#0284C7',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
  radius: { sm: 8, md: 12, lg: 16 },
  minTouchTarget: 44,
} as const;

export type Tokens = typeof tokens;
