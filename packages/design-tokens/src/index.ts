/**
 * @ricton/design-tokens — shared semantic design system.
 *
 * Single source of truth for brand + UI semantics across web (Next.js) and
 * mobile (React Native). Pages must consume these tokens (via CSS variables
 * on web, via `tokens` on native) instead of hard-coding hex/Tailwind combos.
 *
 * Conventions:
 * - `color.*` holds every brand/surface/semantic value. No other hex codes
 *   should appear in product UI outside this file.
 * - `type.*` sets the readable floor: routine clinical UI must never render
 *   below 12px (`type.minBodyPx`). Uppercase eyebrow labels may use 11px
 *   with wide tracking; 9–10px labels are prohibited.
 * - `cssVariables` maps each token to a `--ricton-*` custom property so
 *   `apps/web/src/app/globals.css` stays token-driven by construction.
 */

export const tokens = {
  color: {
    navy: '#0A192F',
    navyDeep: '#060F1E',
    action: '#1877F2',
    actionDark: '#1565C0',
    actionSoft: '#E8F1FE',
    /** Primary action for auth screens (login/register). */
    authAction: '#1877F2',
    authActionDark: '#1565C0',
    success: '#059669',
    successSoft: '#D1FAE5',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    danger: '#E11D48',
    dangerSoft: '#FFE4E6',
    info: '#0284C7',
    infoSoft: '#E0F2FE',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F7FC',
    surfaceSunken: '#E9EEF6',
    border: '#E2E8F0',
    ink: '#0F172A',
    inkMuted: '#475569',
    inkFaint: '#94A3B8',
    onDark: '#FFFFFF',
    onDarkMuted: '#CBD5E1',
  },
  type: {
    /** Hard floor for routine UI text (px). Enforced by globals.css. */
    minBodyPx: 12,
    /** Smallest allowed uppercase eyebrow label (px, tracking-wide required). */
    minEyebrowPx: 11,
    family: {
      sans: "var(--font-sans, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)",
    },
    size: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      display: 32,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.65,
    },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  shadow: {
    xs: '0 1px 2px rgb(10 25 47 / 0.06)',
    sm: '0 2px 8px rgb(10 25 47 / 0.08)',
    md: '0 8px 24px rgb(10 25 47 / 0.12)',
  },
  focusRing: '0 0 0 3px rgb(24 119 242 / 0.35)',
  minTouchTarget: 44,
  shell: {
    sidebarWidthPx: 256,
    headerHeightPx: 80,
  },
} as const;

export type Tokens = typeof tokens;

type CssVariableMap = Record<string, string>;

/** Maps every token to its `--ricton-*` CSS custom property. */
export const cssVariables: CssVariableMap = {
  '--ricton-navy': tokens.color.navy,
  '--ricton-navy-deep': tokens.color.navyDeep,
  '--ricton-action': tokens.color.action,
  '--ricton-action-dark': tokens.color.actionDark,
  '--ricton-action-soft': tokens.color.actionSoft,
  '--ricton-auth-action': tokens.color.authAction,
  '--ricton-auth-action-dark': tokens.color.authActionDark,
  '--ricton-success': tokens.color.success,
  '--ricton-success-soft': tokens.color.successSoft,
  '--ricton-warning': tokens.color.warning,
  '--ricton-warning-soft': tokens.color.warningSoft,
  '--ricton-danger': tokens.color.danger,
  '--ricton-danger-soft': tokens.color.dangerSoft,
  '--ricton-info': tokens.color.info,
  '--ricton-info-soft': tokens.color.infoSoft,
  '--ricton-surface': tokens.color.surface,
  '--ricton-surface-muted': tokens.color.surfaceMuted,
  '--ricton-surface-sunken': tokens.color.surfaceSunken,
  '--ricton-border': tokens.color.border,
  '--ricton-ink': tokens.color.ink,
  '--ricton-ink-muted': tokens.color.inkMuted,
  '--ricton-ink-faint': tokens.color.inkFaint,
  '--ricton-on-dark': tokens.color.onDark,
  '--ricton-on-dark-muted': tokens.color.onDarkMuted,
  '--ricton-text-xs-px': String(tokens.type.size.xs),
  '--ricton-text-min-px': String(tokens.type.minBodyPx),
  '--ricton-radius-sm': `${tokens.radius.sm}px`,
  '--ricton-radius-md': `${tokens.radius.md}px`,
  '--ricton-radius-lg': `${tokens.radius.lg}px`,
  '--ricton-radius-xl': `${tokens.radius.xl}px`,
  '--ricton-focus-ring': tokens.focusRing,
  '--ricton-touch-target': `${tokens.minTouchTarget}px`,
  '--ricton-sidebar-width': `${tokens.shell.sidebarWidthPx}px`,
  '--ricton-header-height': `${tokens.shell.headerHeightPx}px`,
};

/** Renders the `:root { … }` declaration block consumed by web globals.css. */
export function buildCssDeclarations(): string {
  return Object.entries(cssVariables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
}

/** Status → semantic color pair for badges, dots, and banners. */
export const statusTone: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: tokens.color.successSoft, fg: tokens.color.success },
  CONFIRMED: { bg: tokens.color.successSoft, fg: tokens.color.success },
  SIGNED: { bg: tokens.color.successSoft, fg: tokens.color.success },
  DELIVERED: { bg: tokens.color.successSoft, fg: tokens.color.success },
  CREATED: { bg: tokens.color.infoSoft, fg: tokens.color.info },
  PENDING: { bg: tokens.color.warningSoft, fg: tokens.color.warning },
  PREPARING: { bg: tokens.color.warningSoft, fg: tokens.color.warning },
  CANCELLED: { bg: tokens.color.dangerSoft, fg: tokens.color.danger },
  ENDED: { bg: tokens.color.surfaceSunken, fg: tokens.color.inkMuted },
  FAILED: { bg: tokens.color.dangerSoft, fg: tokens.color.danger },
};

export function toneForStatus(status: string): { bg: string; fg: string } {
  return (
    statusTone[status?.toUpperCase()] ?? {
      bg: tokens.color.surfaceSunken,
      fg: tokens.color.inkMuted,
    }
  );
}
