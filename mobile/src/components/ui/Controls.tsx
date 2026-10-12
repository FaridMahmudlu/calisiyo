import * as Haptics from 'expo-haptics';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { Button, IconButton } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

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

// Brand switch: eased thumb, tinted track, haptic tick. Replaces the system Switch.
export function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean; label?: string }) {
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);
  const off = colors.borderStrong;
  const on = colors.primary;

  useEffect(() => {
    progress.set(withTiming(value ? 1 : 0, { duration: 180, easing: Easing.out(Easing.cubic) }));
  }, [value, progress]);

  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(progress.value, [0, 1], [off, on]) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * 20 }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => { Haptics.selectionAsync().catch(() => undefined); onChange(!value); }}
    >
      <Animated.View style={[styles.toggle, track]}>
        <Animated.View style={[styles.thumb, { shadowColor: colors.shadow }, thumb]} />
      </Animated.View>
    </Pressable>
  );
}

export function SwitchRow({ title, description, value, onChange, disabled, icon: Icon }: { title: string; description?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean; icon?: LucideIcon }) {
  const { colors } = useTheme();
  return (
    <Pressable accessible={false} disabled={disabled} onPress={() => { Haptics.selectionAsync().catch(() => undefined); onChange(!value); }} style={[styles.row, { opacity: disabled ? 0.5 : 1 }]}>
      {Icon ? <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}><Icon size={18} color={colors.primary} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {description ? <Text variant="caption" color="textMuted">{description}</Text> : null}
      </View>
      <Toggle value={value} disabled={disabled} onChange={onChange} label={title} />
    </Pressable>
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

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const sameDay = (a: Date, b: Date) => dateKey(a) === dateKey(b);

// Month grid with min/max limits and quick picks; Monday-first like Turkish calendars.
function CalendarPicker({ value, onChange, minimumDate, maximumDate }: { value: Date; onChange: (date: Date) => void; minimumDate?: Date; maximumDate?: Date }) {
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const today = dayStart(new Date());
  const min = minimumDate ? dayStart(minimumDate) : null;
  const max = maximumDate ? dayStart(maximumDate) : null;
  const allowed = (date: Date) => (!min || date >= min) && (!max || date <= max);
  const lead = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const shift = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  const pick = (date: Date) => { Haptics.selectionAsync().catch(() => undefined); onChange(date); if (date.getMonth() !== month.getMonth()) setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); };
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.monthBar}>
        <IconButton icon={ChevronLeft} label="Önceki ay" onPress={() => shift(-1)} />
        <Text variant="heading">{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
        <IconButton icon={ChevronRight} label="Sonraki ay" onPress={() => shift(1)} />
      </View>
      <View style={styles.weekRow}>{WEEKDAYS.map((day) => <Text key={day} variant="label" color="textSubtle" align="center" style={styles.weekCell}>{day}</Text>)}</View>
      <View style={styles.grid}>
        {cells.map((date, index) => {
          if (!date) return <View key={`e${index}`} style={styles.dayCell} />;
          const selected = sameDay(date, value);
          const isToday = sameDay(date, today);
          const enabled = allowed(date);
          return (
            <Pressable key={dateKey(date)} disabled={!enabled} onPress={() => pick(date)} accessibilityRole="button" accessibilityState={{ selected, disabled: !enabled }}
              accessibilityLabel={`${date.getDate()} ${MONTHS[date.getMonth()]}`} style={styles.dayCell}>
              {({ pressed }) => (
                <View style={[styles.day, selected && { backgroundColor: colors.primary }, !selected && isToday && { borderWidth: 1.5, borderColor: colors.primary }, pressed && !selected && { backgroundColor: colors.surfaceSunken }]}>
                  <Text variant="bodyStrong" color={selected ? colors.onPrimary : enabled ? 'text' : 'textSubtle'} style={{ opacity: enabled ? 1 : 0.4, fontFamily: selected || isToday ? fonts.heavy : fonts.medium }}>{date.getDate()}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {allowed(today) ? <Chip label="Bugün" active={sameDay(value, today)} onPress={() => pick(today)} /> : null}
        {allowed(tomorrow) ? <Chip label="Yarın" active={sameDay(value, tomorrow)} onPress={() => pick(tomorrow)} /> : null}
      </View>
    </View>
  );
}

const ITEM = 46;
const VISIBLE = 5;

function WheelColumn({ count, value, onChange, label }: { count: number; value: number; onChange: (value: number) => void; label: string }) {
  const ref = useRef<ScrollView>(null);
  const last = useRef(value);
  const align = () => ref.current?.scrollTo({ y: value * ITEM, animated: false });
  useEffect(() => { ref.current?.scrollTo({ y: value * ITEM, animated: false }); }, [value]);
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.max(0, Math.min(count - 1, Math.round(event.nativeEvent.contentOffset.y / ITEM)));
    if (index !== last.current) { last.current = index; Haptics.selectionAsync().catch(() => undefined); onChange(index); }
  };
  return (
    <ScrollView ref={ref} accessibilityLabel={label} style={{ height: ITEM * VISIBLE, flex: 1 }} showsVerticalScrollIndicator={false} snapToInterval={ITEM}
      decelerationRate="fast" nestedScrollEnabled contentOffset={{ x: 0, y: value * ITEM }} onLayout={align}
      contentContainerStyle={{ paddingVertical: ITEM * 2 }} onMomentumScrollEnd={settle} onScrollEndDrag={settle}>
      {Array.from({ length: count }, (_, i) => (
        <Pressable key={i} onPress={() => { ref.current?.scrollTo({ y: i * ITEM, animated: true }); last.current = i; onChange(i); }} style={styles.wheelItem}>
          <Text variant="heading" color={i === value ? 'text' : 'textSubtle'} style={{ fontFamily: fonts.monoBold, fontSize: i === value ? 26 : 20 }}>{pad(i)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// Hour/minute wheels with a highlighted centre band (24h, minute precision).
function TimeWheel({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const { colors } = useTheme();
  const set = (hours: number, minutes: number) => { const next = new Date(value); next.setHours(hours, minutes, 0, 0); onChange(next); };
  return (
    <View style={styles.wheels}>
      <View pointerEvents="none" style={[styles.band, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]} />
      <WheelColumn label="Saat" count={24} value={value.getHours()} onChange={(hours) => set(hours, value.getMinutes())} />
      <Text variant="title" color="primary" style={{ fontFamily: fonts.monoBold }}>:</Text>
      <WheelColumn label="Dakika" count={60} value={value.getMinutes()} onChange={(minutes) => set(value.getHours(), minutes)} />
    </View>
  );
}

export function DateField({ label, value, onChange, mode = 'date', minimumDate, maximumDate, placeholder }: {
  label?: string; value: string; onChange: (value: string) => void; mode?: 'date' | 'time'; minimumDate?: Date; maximumDate?: Date; placeholder?: string;
}) {
  const { colors } = useTheme();
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
      <Sheet open={open} onClose={() => setOpen(false)} scroll={false} title={label || (mode === 'time' ? 'Saat seç' : 'Tarih seç')}
        footer={<Button title="Tamam" fullWidth style={{ flex: 1 }} onPress={() => { commit(draft); setOpen(false); }} />}>
        {mode === 'time'
          ? <TimeWheel value={draft} onChange={setDraft} />
          : <CalendarPicker value={draft} onChange={setDraft} minimumDate={minimumDate} maximumDate={maximumDate} />}
      </Sheet>
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
  toggle: { width: 52, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  thumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center' },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  wheels: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: ITEM * VISIBLE },
  band: { position: 'absolute', left: 0, right: 0, top: ITEM * 2, height: ITEM, borderRadius: radius.sm, borderWidth: 1 },
  wheelItem: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
});
