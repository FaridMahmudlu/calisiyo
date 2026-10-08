import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { CalendarDays, ChevronRight, Clock3, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { Button } from './Button';

export function Chip({ label, active, onPress, icon: Icon, tone }: { label: string; active?: boolean; onPress?: () => void; icon?: LucideIcon; tone?: string }) {
  const { colors } = useTheme();
  const accent = tone || colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress?.(); }}
      style={({ pressed }) => [styles.chip, {
        borderColor: active ? accent : colors.border,
        borderBottomColor: active ? accent : colors.borderStrong,
        backgroundColor: active ? accent : pressed ? colors.surfaceMuted : colors.surface,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      }]}
    >
      {Icon ? <Icon size={15} color={active ? '#FFFFFF' : colors.textMuted} /> : null}
      <Text variant="captionStrong" color={active ? '#FFFFFF' : 'text'}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => { Haptics.selectionAsync().catch(() => undefined); onChange(option.value); }}
            style={({ pressed }) => [styles.segment, active && { backgroundColor: colors.surface, shadowColor: colors.shadow, elevation: 2 }, pressed && !active && { opacity: 0.6 }]}
          >
            <Text variant="captionStrong" color={active ? 'primaryPressed' : 'textMuted'} numberOfLines={1}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({ title, description, value, onChange, disabled, icon: Icon }: { title: string; description?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean; icon?: LucideIcon }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { opacity: disabled ? 0.5 : 1 }]}>
      {Icon ? <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}><Icon size={18} color={colors.primary} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {description ? <Text variant="caption" color="textMuted">{description}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(next) => { Haptics.selectionAsync().catch(() => undefined); onChange(next); }}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
        accessibilityLabel={title}
      />
    </View>
  );
}

export function ListItem({ title, subtitle, icon: Icon, iconColor, onPress, right, danger, chevron = true }: {
  title: string; subtitle?: string; icon?: LucideIcon; iconColor?: string; onPress?: () => void; right?: ReactNode; danger?: boolean; chevron?: boolean;
}) {
  const { colors } = useTheme();
  const tint = danger ? colors.danger : iconColor || colors.primary;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.listItem, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {Icon ? <View style={[styles.rowIcon, { backgroundColor: danger ? colors.dangerSoft : `${tint}1A` }]}><Icon size={18} color={tint} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={danger ? 'danger' : 'text'}>{title}</Text>
        {subtitle ? <Text variant="caption" color="textMuted" numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress && chevron ? <ChevronRight size={18} color={colors.textSubtle} /> : null}
    </Pressable>
  );
}

const pad = (value: number) => String(value).padStart(2, '0');
export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function DateField({ label, value, onChange, mode = 'date', minimumDate, maximumDate, placeholder }: {
  label?: string; value: string; onChange: (value: string) => void; mode?: 'date' | 'time'; minimumDate?: Date; maximumDate?: Date; placeholder?: string;
}) {
  const { colors, scheme } = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = (() => {
    if (mode === 'time') {
      const [h, m] = (value || '09:00').split(':').map(Number);
      const date = new Date(); date.setHours(h || 0, m || 0, 0, 0); return date;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) { const [y, mo, d] = value.split('-').map(Number); return new Date(y, mo - 1, d); }
    return new Date();
  })();
  const [draft, setDraft] = useState(parsed);
  const display = value
    ? mode === 'time' ? value.slice(0, 5) : parsed.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' })
    : placeholder || (mode === 'time' ? 'Saat seç' : 'Tarih seç');
  const commit = (date: Date) => onChange(mode === 'time' ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : dateKey(date));
  const Icon = mode === 'time' ? Clock3 : CalendarDays;

  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="captionStrong" color="textMuted">{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label || display}
        onPress={() => { setDraft(parsed); setOpen(true); }}
        style={({ pressed }) => [styles.dateTrigger, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}
      >
        <Icon size={18} color={colors.textMuted} />
        <Text variant="body" color={value ? 'text' : 'textSubtle'} style={{ flex: 1 }}>{display}</Text>
      </Pressable>
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parsed}
          mode={mode}
          is24Hour
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event: DateTimePickerEvent, date?: Date) => { setOpen(false); if (event.type === 'set' && date) commit(date); }}
        />
      ) : null}
      {Platform.OS === 'ios' ? (
        <Sheet open={open} onClose={() => setOpen(false)} title={label || (mode === 'time' ? 'Saat' : 'Tarih')} footer={<Button title="Tamam" fullWidth style={{ flex: 1 }} onPress={() => { commit(draft); setOpen(false); }} />}>
          <DateTimePicker
            value={draft}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            locale="tr-TR"
            themeVariant={scheme}
            accentColor={colors.primary}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_event: DateTimePickerEvent, date?: Date) => date && setDraft(date)}
          />
        </Sheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { height: 38, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1.5, borderBottomWidth: 2.5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.sm, borderWidth: 1 },
  segment: { flex: 1, height: 38, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  listItem: { paddingHorizontal: space.lg, minHeight: 60 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dateTrigger: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
