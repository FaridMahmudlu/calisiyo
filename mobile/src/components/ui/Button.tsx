import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title?: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  accessibilityLabel?: string;
};

const HEIGHT: Record<Size, number> = { sm: 36, md: 46, lg: 54 };

export function Button({
  title, onPress, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight,
  loading, disabled, fullWidth, haptic = true, style, children, accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, border: 'transparent' },
    secondary: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.dangerSoft, pressed: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
    soft: { bg: colors.primarySoft, pressed: colors.primaryBorder, fg: colors.primaryPressed, border: 'transparent' },
  }[variant];
  const inactive = disabled || loading;
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        if (haptic) Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: size === 'sm' ? 12 : 18,
          backgroundColor: pressed ? palette.pressed : palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : (
        <View style={styles.content}>
          {Icon ? <Icon size={iconSize} color={palette.fg} strokeWidth={2.2} /> : null}
          {title ? <Text variant={size === 'sm' ? 'captionStrong' : 'subheading'} color={palette.fg}>{title}</Text> : null}
          {children}
          {IconRight ? <IconRight size={iconSize} color={palette.fg} strokeWidth={2.2} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ icon: Icon, onPress, label, tone = 'default', size = 40, badge }: {
  icon: LucideIcon; onPress?: () => void; label: string; tone?: 'default' | 'primary' | 'danger'; size?: number; badge?: number;
}) {
  const { colors } = useTheme();
  const fg = tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress?.(); }}
      style={({ pressed }) => [styles.icon, { width: size, height: size, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}
    >
      <Icon size={20} color={fg} strokeWidth={2.1} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
          <Text variant="label" color="#FFFFFF" style={{ letterSpacing: 0 }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fullWidth: { alignSelf: 'stretch' },
  icon: { borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
