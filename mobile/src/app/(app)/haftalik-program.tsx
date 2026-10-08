import { useQuery } from '@tanstack/react-query';
import { CalendarCheck2, ChevronLeft, ChevronRight, CircleHelp, ListTodo, Sparkles, Target } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getExamTabs } from '@shared/constants/alanlar';
import { formatShortDate, formatTime, getCurrentWeekDates, GUN_KISA, toLocalDateKey, todayStr } from '@shared/utils/date';
import { Badge, Card, ErrorState, IconButton, ProgressBar, Screen, Segmented, SkeletonCards, Text } from '@/components/ui';
import type { Task } from '@/features/study/TaskRow';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const REALTIME_TABLES = ['gunluk_gorevler'];

export default function WeeklyProgramScreen() {
  const { colors } = useTheme();
  const { profile } = useAccount();
  const userId = profile?.id;
  const examTabs = getExamTabs(profile?.alan_secimi || 'sayisal');
  const [activeExam, setActiveExam] = useState(examTabs[0]);
  const [offset, setOffset] = useState(0);
  const weekDates = useMemo(() => getCurrentWeekDates().map((date) => { const next = new Date(date); next.setDate(next.getDate() + offset * 7); return next; }), [offset]);
  const start = toLocalDateKey(weekDates[0]);
  const end = toLocalDateKey(weekDates[6]);

  const query = useQuery({
    queryKey: ['weekly-tasks', userId, start],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('gunluk_gorevler').select('*, dersler(ad, renk, ikon, sinav_turu)').eq('user_id', userId!).gte('tarih', start).lte('tarih', end).order('baslangic_saat');
      if (error) throw new Error('Haftalık programın yüklenemedi. Lütfen tekrar dene.');
      return (data || []) as Task[];
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: query.refetch });

  const tasks = (query.data || []).filter((task) => task.dersler?.sinav_turu === activeExam);
  const done = tasks.filter((task) => task.tamamlandi).length;
  const questions = tasks.reduce((sum, task) => sum + Number(task.soru_sayisi || 0), 0);
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const today = todayStr();

  return (
    <Screen onRefresh={query.refetch}>
      <Text variant="body" color="textMuted">Derslerini gün gün düzenle, yoğunluğu dengede tut ve tamamladığın çalışmaları tek bakışta gör.</Text>
      <View style={{ marginTop: space.lg, gap: space.md }}>
        <Segmented options={examTabs.map((exam) => ({ value: exam, label: exam }))} value={activeExam} onChange={setActiveExam} />
        <View style={styles.weekNav}>
          <IconButton icon={ChevronLeft} label="Önceki hafta" onPress={() => setOffset((value) => value - 1)} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="caption" color="textMuted">Görüntülenen hafta</Text>
            <Text variant="subheading">{formatShortDate(weekDates[0])} – {formatShortDate(weekDates[6])}</Text>
          </View>
          <IconButton icon={ChevronRight} label="Sonraki hafta" onPress={() => setOffset((value) => value + 1)} />
        </View>
      </View>

      <Card style={{ marginTop: space.md, gap: space.md }}>
        <View style={{ flexDirection: 'row' }}>
          <Stat icon={ListTodo} tint={colors.info} value={`${done}/${tasks.length}`} label="Tamamlanan görev" />
          <Stat icon={CircleHelp} tint={colors.warning} value={questions.toLocaleString('tr-TR')} label="Planlanan soru" />
          <Stat icon={Target} tint={colors.primary} value={`%${percent}`} label="Program uyumu" />
        </View>
        <ProgressBar value={percent} />
      </Card>

      <View style={{ gap: space.md, marginTop: space.lg }}>
        {query.isLoading ? <SkeletonCards count={4} /> : query.isError ? <ErrorState message={(query.error as Error).message} onRetry={query.refetch} /> : weekDates.map((date, index) => {
          const key = toLocalDateKey(date);
          const dayTasks = tasks.filter((task) => task.tarih === key);
          const dayDone = dayTasks.filter((task) => task.tamamlandi).length;
          const progress = dayTasks.length ? Math.round((dayDone / dayTasks.length) * 100) : 0;
          const isToday = key === today;
          return (
            <Card key={key} style={[{ gap: space.md }, isToday && { borderColor: colors.primary }]}>
              <View style={styles.dayHeader}>
                <Text variant="label" color="primary">{GUN_KISA[index]}</Text>
                <Text variant="title">{date.getDate()}</Text>
                <View style={{ flex: 1 }} />
                {isToday ? <Badge label="Bugün" /> : null}
                <Text variant="caption" color="textMuted">{dayTasks.length ? `${dayDone}/${dayTasks.length} tamamlandı` : 'Boş gün'}</Text>
              </View>
              {dayTasks.length ? <ProgressBar value={progress} height={4} /> : null}
              {dayTasks.length === 0 ? (
                <View style={styles.empty}>
                  <Sparkles size={18} color={colors.primary} />
                  <Text variant="caption" color="textMuted" style={{ flex: 1 }}>Planlanmış görev yok. Bu günü dinlenme veya tekrar için kullanabilirsin.</Text>
                </View>
              ) : dayTasks.map((task) => (
                <View key={task.id} style={[styles.task, { borderLeftColor: task.dersler?.renk || colors.info, backgroundColor: colors.surfaceMuted, opacity: task.tamamlandi ? 0.65 : 1 }]}>
                  <View style={styles.taskTop}>
                    <Text variant="caption" color="textMuted">{formatTime(task.baslangic_saat || '')}</Text>
                    {task.tamamlandi ? <CalendarCheck2 size={14} color={colors.primary} /> : null}
                  </View>
                  <Text variant="captionStrong" numberOfLines={1} style={task.tamamlandi ? { textDecorationLine: 'line-through' } : undefined}>{task.dersler?.ikon || '•'} {task.dersler?.ad || 'Ders'}</Text>
                  <Text variant="caption" color="textMuted" numberOfLines={2}>{task.konu || 'Konu belirtilmedi'}</Text>
                  {Number(task.soru_sayisi) > 0 ? <Badge label={`${Number(task.soru_sayisi).toLocaleString('tr-TR')} soru`} tone="info" /> : null}
                </View>
              ))}
              <View style={styles.footer}>
                <CalendarCheck2 size={14} color={colors.textSubtle} />
                <Text variant="caption" color="textSubtle">{dayTasks.length ? `%${progress} günlük uyum` : 'Esnek zaman'}</Text>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function Stat({ icon: Icon, tint, value, label }: { icon: typeof ListTodo; tint: string; value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}1A` }]}><Icon size={16} color={tint} /></View>
      <Text variant="subheading">{value}</Text>
      <Text variant="caption" color="textMuted" align="center">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  empty: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  task: { padding: space.md, borderRadius: radius.sm, borderLeftWidth: 4, gap: 4 },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
