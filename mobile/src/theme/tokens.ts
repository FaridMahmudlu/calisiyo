// Mirrors the web design system (app/globals.css + app/dashboard/study.css).
export const brand = {
  green: '#00A870',
  greenDark: '#07875F',
  greenDeep: '#0B3B2E',
  mint: '#45C99C',
};

export const lightColors = {
  background: '#FBFCFD',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F8F7',
  surfaceSunken: '#EEF3F1',
  border: '#E4E9EF',
  borderStrong: '#D3DCE4',
  text: '#0D1830',
  textMuted: '#66738F',
  textSubtle: '#9AA5B7',
  primary: brand.green,
  primaryPressed: brand.greenDark,
  primarySoft: '#EAF8F2',
  primaryBorder: '#CFE7DD',
  onPrimary: '#FFFFFF',
  danger: '#D93A30',
  dangerSoft: '#FFF1F0',
  warning: '#D97706',
  warningSoft: '#FFF7E6',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  streak: '#F26B49',
  streakSoft: '#FFF0EB',
  gold: '#A36B08',
  goldSoft: '#FFF6E0',
  violet: '#7C3AED',
  violetSoft: '#F3EEFF',
  overlay: 'rgba(12, 24, 39, 0.48)',
  shadow: '#0D1830',
  skeleton: '#EDF1F4',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  background: '#0C1211',
  surface: '#121A19',
  surfaceMuted: '#17211F',
  surfaceSunken: '#0F1716',
  border: '#293734',
  borderStrong: '#34453F',
  text: '#EDF4F1',
  textMuted: '#9AA9B4',
  textSubtle: '#84938E',
  primary: '#19B97F',
  primaryPressed: '#0E9E6B',
  primarySoft: '#14241F',
  primaryBorder: '#24443A',
  onPrimary: '#FFFFFF',
  danger: '#F06A60',
  dangerSoft: '#2A1715',
  warning: '#F5A524',
  warningSoft: '#2A2111',
  info: '#60A5FA',
  infoSoft: '#132036',
  streak: '#FF8A6A',
  streakSoft: '#2C1A14',
  gold: '#E3B046',
  goldSoft: '#2A2311',
  violet: '#A78BFA',
  violetSoft: '#211A33',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  skeleton: '#1B2523',
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
export const radius = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, full: 999 } as const;

export const fonts = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  heavy: 'NunitoSans_800ExtraBold',
  mono: 'JetBrainsMono_600SemiBold',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.heavy, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: 'uppercase' as const },
  number: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
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
