import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { tokens as sharedTokens } from '@ricton/design-tokens';

export const shared = sharedTokens;

export const colors = {
  navy950: '#07182E',
  navy900: '#0B2345',
  navy800: '#12345E',
  blue700: '#0967D8',
  blue600: '#1478F2',
  blue100: '#DCEEFF',
  blue50: '#F0F7FF',
  white: '#FFFFFF',
  canvas: '#F5F8FC',
  slate900: '#172033',
  slate700: '#41506A',
  slate600: '#5D6B82',
  slate400: '#97A4B7',
  slate300: '#CBD3DF',
  slate200: '#E1E7EF',
  slate100: '#EDF1F6',
  emerald700: '#047857',
  emerald100: '#D1FAE5',
  amber700: '#A15C00',
  amber100: '#FEF3C7',
  rose700: '#BE123C',
  rose100: '#FFE4E6',
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  round: 999,
} as const;

export const typography: Record<string, TextStyle> = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 33, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
};

export const cardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: colors.navy950,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  android: { elevation: 2 },
  default: {},
});

export const minimumTouchTarget = 44;
