import * as Haptics from 'expo-haptics';
import { Check, Clock3 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatDuration, formatShortDate, formatTime, todayStr } from '@shared/utils/date';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export type Task = {
  id: string;
  tarih: string;
  baslangic_saat?: string | null;
  bitis_saat?: string | null;
  konu?: string | null;
  soru_sayisi?: number | null;
  sayfa_araligi?: string | null;
  tamamlandi: boolean;
  ders_id?: string | null;
  kaynak_id?: string | null;
  dersler?: { ad?: string | null; renk?: string | null; ikon?: string | null; sinav_turu?: string | null } | null;
  [key: string]: unknown;
};

export function taskDuration(task: Pick<Task, 'baslangic_saat' | 'bitis_saat'>) {
  if (!task.baslangic_saat || !task.bitis_saat) return 0;
  const [sh, sm] = task.baslangic_saat.split(':').map(Number);
  const [eh, em] = task.bitis_saat.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export function TaskRow({ task, onToggle, onPress, showDate, resourceName }: {
  task: Task; onToggle: () => void; onPress?: () => void; showDate?: boolean; resourceName?: string | null;
}) {
  const { colors } = useTheme();
  const accent = task.dersler?.renk || colors.primary;
  const duration = taskDuration(task);
  const meta = [
    showDate ? (task.tarih === todayStr() ? 'Bugün' : formatShortDate(task.tarih)) : null,
    task.baslangic_saat ? `${formatTime(task.baslangic_saat)}${task.bitis_saat ? `–${formatTime(task.bitis_saat)}` : ''}` : null,
    duration ? formatDuration(duration) : null,
    task.soru_sayisi ? `${task.soru_sayisi} soru` : null,
  ].filter(Boolean).join(' · ');
  const detail = [resourceName, task.sayfa_araligi ? `Sayfa ${task.sayfa_araligi}` : null].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed && onPress ? colors.surfaceMuted : colors.surface, borderColor: colors.border, opacity: task.tamamlandi ? 0.78 : 1 }]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.tamamlandi }}
        accessibilityLabel={task.tamamlandi ? 'Görevi tekrar aç' : 'Görevi tamamla'}
        hitSlop={10}
        onPress={() => { Haptics.impactAsync(task.tamamlandi ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined); onToggle(); }}
        style={[styles.check, { borderColor: task.tamamlandi ? colors.primary : colors.borderStrong, backgroundColor: task.tamamlandi ? colors.primary : 'transparent' }]}
      >
        {task.tamamlandi ? <Check size={15} color="#FFFFFF" strokeWidth={3} /> : null}
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="captionStrong" color={accent} numberOfLines={1}>{[task.dersler?.ikon, task.dersler?.ad || 'Genel çalışma'].filter(Boolean).join(' ')}</Text>
        <Text variant="bodyStrong" numberOfLines={2} style={task.tamamlandi ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}>
          {task.konu || 'Konu belirtilmedi'}
        </Text>
        {meta ? (
          <View style={styles.meta}>
            <Clock3 size={13} color={colors.textSubtle} />
            <Text variant="caption" color="textMuted">{meta}</Text>
          </View>
        ) : null}
        {detail ? <Text variant="caption" color="textSubtle" numberOfLines={1}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingLeft: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
