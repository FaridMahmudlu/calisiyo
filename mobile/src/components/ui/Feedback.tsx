import { AlertCircle, Inbox, RefreshCw, type LucideIcon } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export function EmptyState({ icon: Icon = Inbox, title, description, action, onAction, compact }: {
  icon?: LucideIcon; title: string; description?: string; action?: string; onAction?: () => void; compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, compact && { paddingVertical: space.xl }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Icon size={24} color={colors.primary} /></View>
      <Text variant="subheading" align="center">{title}</Text>
      {description ? <Text variant="caption" color="textMuted" align="center" style={{ maxWidth: 300 }}>{description}</Text> : null}
      {action ? <Button title={action} size="sm" variant="soft" onPress={onAction} style={{ marginTop: space.sm }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: colors.dangerSoft }]} accessibilityRole="alert">
      <AlertCircle size={18} color={colors.danger} />
      <Text variant="caption" color="danger" style={{ flex: 1 }}>{message}</Text>
      {onRetry ? <Button icon={RefreshCw} title="Tekrar dene" size="sm" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

export function Notice({ children, tone = 'info', icon: Icon }: { children: ReactNode; tone?: 'info' | 'warning' | 'success'; icon?: LucideIcon }) {
  const { colors } = useTheme();
  const palette = {
    info: [colors.infoSoft, colors.info],
    warning: [colors.warningSoft, colors.warning],
    success: [colors.primarySoft, colors.primaryPressed],
  }[tone];
  return (
    <View style={[styles.error, { backgroundColor: palette[0] }]}>
      {Icon ? <Icon size={18} color={palette[1]} /> : null}
      <Text variant="caption" color={palette[1]} style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

export function Skeleton({ width = '100%', height = 16, style, rounded = radius.xs }: { width?: DimensionValue; height?: number; style?: StyleProp<ViewStyle>; rounded?: number }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.55);
  useEffect(() => { opacity.value = withRepeat(withTiming(1, { duration: 750 }), -1, true); }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius: rounded, backgroundColor: colors.skeleton }, animated, style]} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: space.md }} accessibilityLabel="Yükleniyor">
      {Array.from({ length: count }, (_, index) => <Skeleton key={index} height={84} rounded={radius.md} />)}
    </View>
  );
}

export function ProgressBar({ value, color, height = 8, track }: { value: number; color?: string; height?: number; track?: string }) {
  const { colors } = useTheme();
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track || colors.surfaceSunken, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(safe) }}>
      <View style={{ width: `${safe}%`, height: '100%', borderRadius: height, backgroundColor: color || colors.primary }} />
    </View>
  );
}

export function ProgressRing({ value, size = 120, stroke = 10, color, track, children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track || colors.surfaceSunken} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color || colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - safe / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'warning' | 'danger' | 'muted' | 'info' | 'gold' }) {
  const { colors } = useTheme();
  const palette = {
    primary: [colors.primarySoft, colors.primaryPressed],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    muted: [colors.surfaceSunken, colors.textMuted],
    info: [colors.infoSoft, colors.info],
    gold: [colors.goldSoft, colors.gold],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette[0] }]}>
      <Text variant="captionStrong" color={palette[1]} style={{ fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 40, color }: { name?: string | null; size?: number; color?: string }) {
  const { colors, scheme } = useTheme();
  const initial = String(name || 'Ö').trim().charAt(0).toLocaleUpperCase('tr-TR') || 'Ö';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: color || (scheme === 'dark' ? colors.primarySoft : '#1C1D21') }}>
      <Text variant="subheading" color={color ? '#FFFFFF' : scheme === 'dark' ? colors.primary : '#FFFFFF'} style={{ fontSize: size * 0.4, lineHeight: size * 0.5 }}>{initial}</Text>
    </View>
  );
}

export function StatTile({ label, value, hint, icon: Icon, color }: { label: string; value: string | number; hint?: string; icon?: LucideIcon; color?: string }) {
  const { colors } = useTheme();
  const tint = color || colors.primary;
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {Icon ? <View style={[styles.statIcon, { backgroundColor: `${tint}1A` }]}><Icon size={17} color={tint} /></View> : null}
      <Text variant="number" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text variant="captionStrong" color="textMuted" numberOfLines={1}>{label}</Text>
      {hint ? <Text variant="caption" color="textSubtle" numberOfLines={2}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.lg, gap: space.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.sm },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  stat: { flex: 1, minWidth: 140, padding: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, gap: 2 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
});
