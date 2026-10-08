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

const HEIGHT: Record<Size, number> = { sm: 40, md: 50, lg: 56 };
// Raised variants sit on a darker "edge" that compresses when pressed.
const EDGE: Record<Size, number> = { sm: 3, md: 4, lg: 4 };

export function Button({
  title, onPress, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight,
  loading, disabled, fullWidth, haptic = true, style, children, accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { face: colors.primary, edge: colors.primaryEdge, fg: colors.onPrimary, border: colors.primary },
    secondary: { face: colors.surface, edge: colors.borderStrong, fg: colors.text, border: colors.borderStrong },
    danger: { face: colors.danger, edge: colors.dangerEdge, fg: '#FFFFFF', border: colors.danger },
    soft: { face: colors.primarySoft, edge: null, fg: colors.primaryPressed, border: colors.primarySoft },
    ghost: { face: 'transparent', edge: null, fg: colors.primary, border: 'transparent' },
  }[variant];
  const inactive = disabled || loading;
  const iconSize = size === 'sm' ? 16 : 19;
  const edge = palette.edge && !inactive ? EDGE[size] : 0;
  // Shape props belong to the visible face; layout props (flex, margins, width, shadow) stay on the outer edge layer.
  const { padding, paddingHorizontal, paddingLeft, paddingRight, borderRadius, height: customHeight, ...outer } = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const height = typeof customHeight === 'number' ? customHeight : HEIGHT[size];
  const corner = typeof borderRadius === 'number' ? borderRadius : radius.sm;
  const facePadding = { paddingHorizontal: paddingHorizontal ?? padding ?? (size === 'sm' ? 14 : 20), paddingLeft, paddingRight };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={size === 'sm' ? 4 : 0}
      onPress={() => {
        if (haptic) Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      style={[{ height, borderRadius: corner, opacity: inactive ? 0.5 : 1 }, edge ? { backgroundColor: palette.edge! } : null, fullWidth && styles.fullWidth, outer]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            {
              height: height - edge,
              borderRadius: corner,
              ...facePadding,
              backgroundColor: palette.face,
              borderColor: palette.border,
              borderWidth: variant === 'secondary' ? 1.5 : 0,
              transform: [{ translateY: pressed && edge ? edge - 1 : 0 }],
            },
            !edge && pressed && { backgroundColor: variant === 'ghost' ? colors.surfaceMuted : colors.primaryBorder, transform: [{ scale: 0.98 }] },
          ]}
        >
          {loading ? <ActivityIndicator color={palette.fg} /> : (
            <View style={styles.content}>
              {Icon ? <Icon size={iconSize} color={palette.fg} strokeWidth={2.4} /> : null}
              {title ? <Text variant={size === 'sm' ? 'captionStrong' : 'subheading'} color={palette.fg} numberOfLines={1} style={size !== 'sm' ? { fontFamily: 'NunitoSans_800ExtraBold' } : undefined}>{title}</Text> : null}
              {children}
              {IconRight ? <IconRight size={iconSize} color={palette.fg} strokeWidth={2.4} /> : null}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// Visual size is `size`; the touch target is always at least 44x44 (WCAG / HIG).
export function IconButton({ icon: Icon, onPress, label, tone = 'default', size = 40, badge, filled }: {
  icon: LucideIcon; onPress?: () => void; label: string; tone?: 'default' | 'primary' | 'danger'; size?: number; badge?: number; filled?: boolean;
}) {
  const { colors } = useTheme();
  const fg = tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : colors.text;
  const rest = filled ? (tone === 'danger' ? colors.dangerSoft : tone === 'primary' ? colors.primarySoft : colors.surface) : 'transparent';
  const touch = Math.max(44, size);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress?.(); }}
      style={[styles.touch, { width: touch, height: touch }]}
    >
      {({ pressed }) => (
        <View style={[styles.icon, { width: size, height: size, backgroundColor: pressed ? (filled ? colors.primaryBorder : colors.surfaceSunken) : rest, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
          <Icon size={Math.min(22, Math.round(size * 0.5))} color={fg} strokeWidth={2.2} />
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
              <Text variant="label" color="#FFFFFF" style={{ letterSpacing: 0 }}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fullWidth: { alignSelf: 'stretch' },
  touch: { alignItems: 'center', justifyContent: 'center' },
  icon: { borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
