// Mirrors the web design system (app/globals.css + app/dashboard/study.css).
// 'Canlı motivasiya': vivid brand green + warm amber accents, tactile 3D buttons,
// soft tinted backgrounds so white cards stand out.
export const brand = {
  green: '#00A870',
  greenDark: '#008F5F',
  greenEdge: '#00744D',
  greenDeep: '#00704F',
  greenBright: '#14C784',
  mint: '#45C99C',
  amber: '#FFC247',
};

export const lightColors = {
  background: '#F3F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F8F6',
  surfaceSunken: '#E9F0ED',
  border: '#E1E9E5',
  borderStrong: '#CBD7D1',
  text: '#0D1B2A',
  textMuted: '#5D6B7C',
  textSubtle: '#94A1AF',
  primary: brand.green,
  primaryPressed: brand.greenDark,
  primaryEdge: brand.greenEdge,
  primarySoft: '#E3F7EE',
  primaryBorder: '#BFE9D5',
  onPrimary: '#FFFFFF',
  heroStart: '#12C383',
  heroEnd: '#00825A',
  accent: '#FFB020',
  accentSoft: '#FFF3D6',
  danger: '#E5484D',
  dangerEdge: '#BB2E33',
  dangerSoft: '#FFEDEE',
  warning: '#D97706',
  warningSoft: '#FFF5E1',
  info: '#2F7CF6',
  infoSoft: '#EAF2FF',
  streak: '#FF6A3D',
  streakSoft: '#FFEDE5',
  gold: '#B7790A',
  goldSoft: '#FFF4D9',
  violet: '#7C5CFF',
  violetSoft: '#F0ECFF',
  inverseSurface: '#13202E',
  inverseText: '#FFFFFF',
  overlay: 'rgba(10, 22, 32, 0.5)',
  shadow: '#0D1B2A',
  skeleton: '#E6EEEA',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  background: '#0A1110',
  surface: '#121B19',
  surfaceMuted: '#17221F',
  surfaceSunken: '#0E1715',
  border: '#24332F',
  borderStrong: '#33463F',
  text: '#EEF5F2',
  textMuted: '#9DADB6',
  textSubtle: '#7D8F89',
  primary: '#1BC184',
  primaryPressed: '#12A771',
  primaryEdge: '#0B7A52',
  primarySoft: '#12261F',
  primaryBorder: '#22473A',
  onPrimary: '#FFFFFF',
  heroStart: '#109E6C',
  heroEnd: '#075C42',
  accent: '#FFC247',
  accentSoft: '#2C2410',
  danger: '#FF6B6E',
  dangerEdge: '#B83A3E',
  dangerSoft: '#2D1617',
  warning: '#F5A524',
  warningSoft: '#2A2111',
  info: '#6AA7FF',
  infoSoft: '#132036',
  streak: '#FF8A62',
  streakSoft: '#2E1A12',
  gold: '#E8B54A',
  goldSoft: '#2A2311',
  violet: '#A795FF',
  violetSoft: '#221B38',
  inverseSurface: '#EEF5F2',
  inverseText: '#0D1B2A',
  overlay: 'rgba(0, 0, 0, 0.62)',
  shadow: '#000000',
  skeleton: '#1A2522',
};

export const subjectColors: Record<string, string> = {
  matematik: '#8B5CF6',
  geometri: '#6366F1',
  turkce: '#10B981',
  edebiyat: '#14B8A6',
  fizik: '#3B82F6',
  kimya: '#F97316',
  biyoloji: '#22C55E',
  tarih: '#F59E0B',
  cografya: '#0EA5E9',
  felsefe: '#EC4899',
  din: '#A855F7',
  ingilizce: '#EF4444',
};

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { xs: 10, sm: 14, md: 18, lg: 22, xl: 28, full: 999 } as const;

export const fonts = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  heavy: 'NunitoSans_800ExtraBold',
  mono: 'JetBrainsMono_600SemiBold',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.heavy, fontSize: 32, lineHeight: 38, letterSpacing: -0.7 },
  title: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.heavy, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: 'uppercase' as const },
  number: { fontFamily: fonts.heavy, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  mono: { fontFamily: fonts.monoBold, fontSize: 56, lineHeight: 64, letterSpacing: -1 },
} as const;

export type TypographyVariant = keyof typeof typography;

export function subjectColor(name?: string | null) {
  const key = String(name || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
  const match = Object.keys(subjectColors).find((subject) => key.includes(subject));
  return match ? subjectColors[match] : brand.green;
}
