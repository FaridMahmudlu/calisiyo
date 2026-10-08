import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Text } from './Text';

export function Card({ children, style, onPress, padded = true, tone = 'default' }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  tone?: 'default' | 'primary' | 'muted';
}) {
  const { colors, scheme } = useTheme();
  const background = tone === 'primary' ? colors.primarySoft : tone === 'muted' ? colors.surfaceMuted : colors.surface;
  const border = tone === 'primary' ? colors.primaryBorder : colors.border;
  const base = [
    styles.card,
    { backgroundColor: background, borderColor: border, shadowColor: colors.shadow, shadowOpacity: scheme === 'dark' ? 0 : 0.05 },
    padded && styles.padded,
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction, subtitle }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <View style={{ flex: 1 }}>
        <Text variant="heading">{title}</Text>
        {subtitle ? <Text variant="caption" color="textMuted">{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text variant="captionStrong" color="primary">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 0,
  },
  padded: { padding: space.lg },
  section: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginTop: space.xl, marginBottom: space.md },
});
