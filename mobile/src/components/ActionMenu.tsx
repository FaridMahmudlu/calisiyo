import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sheet, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export type MenuAction = { label: string; icon?: LucideIcon; destructive?: boolean; onPress: () => void };

// Cross-platform action sheet; Android's Alert supports only three buttons.
export function ActionMenu({ open, title, subtitle, actions, onClose }: { open: boolean; title?: string; subtitle?: string; actions: MenuAction[]; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={{ gap: space.xs }}>
        {actions.map((action) => {
          const Icon = action.icon;
          const tint = action.destructive ? colors.danger : colors.text;
          return (
            <Pressable key={action.label} accessibilityRole="button" onPress={() => { onClose(); setTimeout(action.onPress, 250); }}
              style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border }]}>
              {Icon ? <Icon size={19} color={tint} /> : null}
              <Text variant="bodyStrong" color={tint}>{action.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 52, borderRadius: radius.md, borderWidth: 1 },
});
