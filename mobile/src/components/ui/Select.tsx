import * as Haptics from 'expo-haptics';
import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Sheet } from './Sheet';
import { Text } from './Text';

export type SelectOption = { value: string; label: string; description?: string | null };

export function Select({ label, value, options, onChange, placeholder = 'Seç', title, disabled }: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="captionStrong" color="textMuted">{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label || title || placeholder}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : colors.surface, opacity: disabled ? 0.55 : 1 }]}
      >
        <Text variant="body" color={selected ? 'text' : 'textSubtle'} numberOfLines={1} style={{ flex: 1 }}>{selected?.label || placeholder}</Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={title || label || placeholder}>
        <View style={{ gap: 4 }}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value || '__empty'}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => { Haptics.selectionAsync().catch(() => undefined); onChange(option.value); setOpen(false); }}
                style={({ pressed }) => [styles.option, { backgroundColor: active ? colors.primarySoft : pressed ? colors.surfaceMuted : 'transparent' }]}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" color={active ? 'primaryPressed' : 'text'}>{option.label}</Text>
                  {option.description ? <Text variant="caption" color="textMuted">{option.description}</Text> : null}
                </View>
                {active ? <Check size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: 8 },
  option: { minHeight: 54, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
