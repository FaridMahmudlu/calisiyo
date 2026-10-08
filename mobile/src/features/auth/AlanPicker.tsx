import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { ALANLAR, getExamTabs } from '@shared/constants/alanlar';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

function OptionCard({ title, subtitle, selected, onPress }: { title: string; subtitle: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress(); }}
      style={({ pressed }) => [styles.card, {
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : pressed ? colors.surfaceMuted : colors.surface,
      }]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="subheading" color={selected ? 'primaryPressed' : 'text'}>{title}</Text>
        <Text variant="caption" color="textMuted">{subtitle}</Text>
      </View>
      {selected ? <View style={[styles.check, { backgroundColor: colors.primary }]}><Check size={14} color="#FFFFFF" strokeWidth={3} /></View> : null}
    </Pressable>
  );
}

export function YearPicker({ value, onChange }: { value: number; onChange: (year: number) => void }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="YKS yılı">
      {[2027, 2028].map((year) => (
        <View key={year} style={{ flex: 1 }}>
          <OptionCard title={`YKS ${year}`} subtitle={year === 2028 ? 'Yeni MEB müfredatı' : 'Mevcut müfredat'} selected={value === year} onPress={() => onChange(year)} />
        </View>
      ))}
    </View>
  );
}

export function AlanPicker({ value, onChange }: { value: string; onChange: (alan: string) => void }) {
  return (
    <View style={{ gap: space.sm }} accessibilityRole="radiogroup" accessibilityLabel="Alan">
      {Object.entries(ALANLAR).map(([key, details]) => (
        <OptionCard key={key} title={details.label} subtitle={getExamTabs(key).join(' + ')} selected={value === key} onPress={() => onChange(key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  card: { minHeight: 64, borderWidth: 1.5, borderRadius: radius.md, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
