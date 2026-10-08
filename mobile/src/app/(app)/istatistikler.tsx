import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, BarChart3, BookOpenCheck, CalendarCheck2, CheckCircle2, Clock3, Download, Flame, Goal, Minus, Sparkles, Target, TrendingUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatDate, formatDuration, parseLocalDate, todayStr, toLocalDateKey } from '@shared/utils/date';
import { AreaChart, BarChart, DonutChart, HorizontalBars, Legend } from '@/components/charts';
import { PremiumInfo } from '@/components/PremiumInfo';
import { Button, Card, EmptyState, ErrorState, IconButton, ProgressBar, Screen, Segmented, SectionHeader, SkeletonCards, StatTile, Text, useToast } from '@/components/ui';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { shareTextFile } from '@/lib/share';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

type Range = 'week' | 'month' | 'all';
type Daily = { date: string; studyMinutes: number; questions?: number };
const REALTIME_TABLES = ['calisma_suresi', 'pomodoro_kayitlari', 'gunluk_gorevler', 'denemeler', 'konu_takibi', 'yapamadiklari'];
const COLORS = ['#00a870', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef6c57', '#14b8a6'];
function Delta({ value }: { value: number }) {
  const { colors } = useTheme();
  const Icon = !value ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const color = !value ? colors.textMuted : value > 0 ? colors.primary : colors.danger;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Icon size={13} color={color} /><Text variant="captionStrong" color={color}>{!value ? 'Değişim yok' : `${value > 0 ? '+' : ''}${value} net`}</Text></View>;
}

const shortDate = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { profile, currentPlan, stats: accountStats } = useAccount();
  const userId = profile?.id;
  const [range, setRange] = useState<Range>('month');
  const [premiumOpen, setPremiumOpen] = useState(false);

  const query = useQuery({
    queryKey: ['statistics', userId, range],
    enabled: !!userId,
    queryFn: async () => {
      const start = parseLocalDate(todayStr());
      if (range === 'week') start.setDate(start.getDate() - 6);
      if (range === 'month') start.setDate(start.getDate() - 29);
      const startKey = toLocalDateKey(start);
      const rangeStart = range === 'all' ? null : startKey;
      const today = todayStr();
      let sessions = supabase.from('calisma_suresi').select('id,tarih,sure_dakika,soru_sayisi,dersler(ad,renk,sinav_turu)').eq('user_id', userId!).lte('tarih', today).order('tarih');
      let tasks = supabase.from('gunluk_gorevler').select('id,tarih,tamamlandi,soru_sayisi').eq('user_id', userId!).lte('tarih', today).order('tarih');
      let exams = supabase.from('denemeler').select('id,tarih,yayin,deneme_detaylari(net,dogru,yanlis)').eq('user_id', userId!).lte('tarih', today).order('tarih');
      let topics = supabase.from('konu_takibi').select('durum,updated_at').eq('user_id', userId!);
      let questions = supabase.from('yapamadiklari').select('cozuldu,created_at').eq('user_id', userId!);
      if (rangeStart) {
        sessions = sessions.gte('tarih', startKey); tasks = tasks.gte('tarih', startKey); exams = exams.gte('tarih', startKey);
        topics = topics.gte('updated_at', `${startKey}T00:00:00`); questions = questions.gte('created_at', `${startKey}T00:00:00`);
      }
      const results = await Promise.all([sessions, tasks, exams, topics, questions, supabase.rpc('get_my_study_time_statistics', { p_start_date: rangeStart })]);
      if (results.some((result) => result.error)) throw new Error('İstatistiklerin yüklenemedi. Lütfen tekrar dene.');
      const [s, t, e, tp, q, time] = results;
      return {
        sessions: (s.data || []) as { tarih: string; sure_dakika: number; soru_sayisi: number; dersler?: { ad?: string; renk?: string } | null }[],
        tasks: (t.data || []) as { tarih: string; tamamlandi: boolean }[],
        exams: (e.data || []) as { tarih: string; deneme_detaylari?: { net?: number; dogru?: number; yanlis?: number }[] }[],
        topics: (tp.data || []) as { durum: string }[],
        questions: (q.data || []) as { cozuldu: boolean }[],
        time: (time.data || { studyMinutes: 0, questions: 0, daily: [] }) as { studyMinutes: number; questions: number; daily: Daily[] },
      };
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: query.refetch });

  const stats = useMemo(() => {
    const data = query.data;
    if (!data) return null;
    const daily = Array.isArray(data.time.daily) ? data.time.daily : [];
    const activeDates = daily.filter((item) => Number(item.studyMinutes) > 0).map((item) => item.date);
    const totalMinutes = Number(data.time.studyMinutes || 0);
    const completed = data.tasks.filter((task) => task.tamamlandi);
    const timelineMap: Record<string, { key: string; studyMinutes: number; questions: number; tasks: number }> = {};
    for (const item of daily) timelineMap[item.date] = { key: item.date, studyMinutes: Number(item.studyMinutes || 0), questions: Number(item.questions || 0), tasks: 0 };
    for (const task of completed) { timelineMap[task.tarih] ||= { key: task.tarih, studyMinutes: 0, questions: 0, tasks: 0 }; timelineMap[task.tarih].tasks += 1; }
    const timeline = Object.values(timelineMap).sort((a, b) => a.key.localeCompare(b.key));
    const courseMap: Record<string, { name: string; minutes: number; color: string }> = {};
    for (const item of data.sessions) {
      const name = item.dersler?.ad || 'Genel çalışma';
      courseMap[name] ||= { name, minutes: 0, color: item.dersler?.renk || COLORS[Object.keys(courseMap).length % COLORS.length] };
      courseMap[name].minutes += item.sure_dakika || 0;
    }
    const exams = data.exams.map((exam) => ({ key: exam.tarih, net: Number((exam.deneme_detaylari || []).reduce((sum, d) => sum + Number(d.net ?? ((d.dogru || 0) - (d.yanlis || 0) / 4)), 0).toFixed(2)) }));
    const lastNet = exams.at(-1)?.net || 0;
    const netDelta = exams.length > 1 ? Number((lastNet - exams[exams.length - 2].net).toFixed(1)) : 0;
    const topicCounts = data.topics.reduce((acc, item) => ({ ...acc, [item.durum]: (acc[item.durum] || 0) + 1 }), { baslanmadi: 0, devam_ediyor: 0, tamamlandi: 0 } as Record<string, number>);
    const solved = data.questions.filter((item) => item.cozuldu).length;
    const weekStart = parseLocalDate(todayStr()); weekStart.setDate(weekStart.getDate() - 6);
    const weekKey = toLocalDateKey(weekStart);
    const weekRows = daily.filter((item) => item.date >= weekKey);
    const bestDay = timeline.reduce<typeof timeline[number] | null>((best, item) => item.studyMinutes > (best?.studyMinutes || 0) ? item : best, null);
    return {
      activeDates, totalMinutes, averageMinutes: activeDates.length ? Math.round(totalMinutes / activeDates.length) : 0,
      totalQuestions: Number(data.time.questions || 0), completionRate: data.tasks.length ? Math.round((completed.length / data.tasks.length) * 100) : 0,
      completedTasks: completed.length, timeline, courses: Object.values(courseMap).sort((a, b) => b.minutes - a.minutes), exams, lastNet, netDelta, topicCounts,
      solved, unresolved: Math.max(0, data.questions.length - solved), bestDay,
      weeklyMinutes: weekRows.reduce((sum, item) => sum + Number(item.studyMinutes || 0), 0),
      weeklyQuestions: weekRows.reduce((sum, item) => sum + Number(item.questions || 0), 0),
      goalMinutes: Number(profile?.study_goals?.weeklyMinutes || 0), goalQuestions: Number(profile?.study_goals?.weeklyQuestions || 0),
      hasData: totalMinutes > 0 || data.tasks.length > 0 || data.exams.length > 0 || data.topics.length > 0,
    };
  }, [profile?.study_goals, query.data]);

  const canExport = currentPlan?.entitlements?.progress_export === true;
  const exportCsv = async () => {
    if (!canExport || !stats) return setPremiumOpen(true);
    const rows = [['Tarih', 'Çalışma süresi (dk)', 'Soru', 'Tamamlanan görev'], ...stats.timeline.map((item) => [item.key, item.studyMinutes, item.questions, item.tasks])];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';')).join('\n')}`;
    try { await shareTextFile(`calisiyo-ilerleme-${todayStr()}.csv`, csv, 'text/csv'); } catch (error) { toast.error((error as Error).message); }
  };

  const goalRow = (label: string, current: number, goal: number, format: (value: number) => string) => {
    const pct = goal ? Math.min(100, Math.round((current / goal) * 100)) : 0;
    return (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="captionStrong" color="textMuted">{label}</Text>
          {goal ? <Text variant="captionStrong">{format(current)} / {format(goal)}</Text> : <Text variant="captionStrong" color="primary" onPress={() => router.push('/hedeflerim')}>Hedef belirle</Text>}
        </View>
        <ProgressBar value={pct} />
        <Text variant="caption" color="textSubtle">{goal ? `%${pct} tamamlandı` : 'Hedeflerim sayfasından haftalık hedefini ekleyebilirsin.'}</Text>
      </View>
    );
  };

  const topicTotal = stats ? Object.values(stats.topicCounts).reduce((sum, value) => sum + value, 0) : 0;

  return (
    <Screen onRefresh={query.refetch}>
      <Stack.Screen options={{ headerRight: () => <IconButton icon={Download} label={canExport ? 'CSV paylaş' : 'CSV dışa aktarma (Plus)'} tone="primary" onPress={exportCsv} /> }} />
      <Text variant="body" color="textMuted">Çalışma, program, deneme ve konu kayıtlarından anlık hesaplanan ilerleme görünümün.</Text>
      <View style={{ marginTop: space.lg }}><Segmented options={[{ value: 'week', label: '7 Gün' }, { value: 'month', label: '30 Gün' }, { value: 'all', label: 'Tümü' }]} value={range} onChange={setRange} /></View>

      {query.isLoading ? <View style={{ marginTop: space.lg }}><SkeletonCards count={4} /></View> : query.isError ? <View style={{ marginTop: space.lg }}><ErrorState message={(query.error as Error).message} onRetry={query.refetch} /></View> : !stats?.hasData ? (
        <Card style={{ marginTop: space.lg }}><EmptyState icon={BarChart3} title="Henüz analiz edilecek kayıt yok" description="Programını tamamladıkça, Kronometre kullandıkça ve deneme ekledikçe bu sayfa gerçek verilerinle dolacak." /></Card>
      ) : (
        <>
          <Text variant="caption" color="textSubtle" style={{ marginTop: space.md }}>{stats.activeDates.length} aktif gün · canlı veri</Text>
          <View style={styles.grid}>
            <StatTile icon={Clock3} label="Çalışma süresi" value={formatDuration(stats.totalMinutes)} hint={`Günlük ort. ${formatDuration(stats.averageMinutes)}`} />
            <StatTile icon={BookOpenCheck} color="#3B82F6" label="Çözülen soru" value={stats.totalQuestions.toLocaleString('tr-TR')} />
            <StatTile icon={CheckCircle2} color="#8B5CF6" label="Program uyumu" value={`%${stats.completionRate}`} hint={`${stats.completedTasks} görev`} />
            <StatTile icon={Flame} color={colors.streak} label="Güncel seri" value={`${accountStats.streak} gün`} />
            <View style={{ flex: 1, minWidth: 140 }}><StatTile icon={TrendingUp} color="#0EA5E9" label="Son deneme neti" value={stats.exams.length ? stats.lastNet.toFixed(1) : '—'} /><View style={{ position: 'absolute', right: 14, top: 18 }}><Delta value={stats.netDelta} /></View></View>
            <StatTile icon={Target} color="#F43F5E" label="Sonradan çözülen" value={String(stats.solved)} hint={`${stats.unresolved} soru bekliyor`} />
          </View>

          <SectionHeader title="Süre ve soru gelişimi" subtitle="Günlük çalışma dakikaların" />
          <Card><BarChart data={stats.timeline.map((item) => ({ label: shortDate(item.key), value: item.studyMinutes }))} formatValue={formatDuration} /></Card>

          <SectionHeader title="Son 7 günün hedefleri" />
          <Card style={{ gap: space.lg }}>
            {goalRow('Soru hedefi', stats.weeklyQuestions, stats.goalQuestions, (value) => value.toLocaleString('tr-TR'))}
            {goalRow('Süre hedefi', stats.weeklyMinutes, stats.goalMinutes, formatDuration)}
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Sparkles size={17} color={colors.primary} />
              <Text variant="caption" color="textMuted" style={{ flex: 1 }}>{stats.bestDay ? `En verimli günün ${formatDate(stats.bestDay.key)}. O gün toplam ${formatDuration(stats.bestDay.studyMinutes)} çalıştın.` : 'İlk çalışma kaydınla kişisel içgörüler burada görünecek.'}</Text>
            </View>
          </Card>

          <SectionHeader title="Ders dağılımı" subtitle="Zamanını nereye ayırdın?" />
          <Card>{stats.courses.length ? <HorizontalBars items={stats.courses.map((course) => ({ label: course.name, value: course.minutes, color: course.color, hint: formatDuration(course.minutes) }))} /> : <Text variant="caption" color="textMuted">Ders seçilmiş çalışma kaydı yok.</Text>}</Card>

          <SectionHeader title="Net gelişimi" />
          <Card>{stats.exams.length ? <AreaChart data={stats.exams.map((exam) => ({ label: shortDate(exam.key), value: exam.net }))} color="#3B82F6" suffix=" net" /> : <Text variant="caption" color="textMuted">Bu dönemde deneme kaydı yok.</Text>}</Card>

          <SectionHeader title="Konu hakimiyeti" />
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <DonutChart size={130} centerValue={String(stats.topicCounts.tamamlandi || 0)} centerLabel="tamamlandı" segments={[
              { label: 'Tamamlandı', value: stats.topicCounts.tamamlandi || 0, color: colors.primary },
              { label: 'Devam ediyor', value: stats.topicCounts.devam_ediyor || 0, color: '#3B82F6' },
              { label: 'Başlanmadı', value: stats.topicCounts.baslanmadi || 0, color: colors.borderStrong },
            ]} />
            <View style={{ flex: 1 }}>
              <Legend items={[['Tamamlandı', 'tamamlandi', colors.primary], ['Devam ediyor', 'devam_ediyor', '#3B82F6'], ['Başlanmadı', 'baslanmadi', colors.borderStrong]].map(([label, key, color]) => ({
                label, color, value: `%${topicTotal ? Math.round(((stats.topicCounts[key] || 0) / topicTotal) * 100) : 0}`,
              }))} />
            </View>
          </Card>
          <Button title={canExport ? 'İlerleme verilerini CSV olarak paylaş' : 'CSV dışa aktarma · Plus'} icon={canExport ? Download : Goal} variant="soft" onPress={exportCsv} style={{ marginTop: space.lg }} />
          <View style={{ height: space.sm }} /><Button title="Takvimi gör" icon={CalendarCheck2} variant="ghost" onPress={() => router.push('/haftalik-program')} />
        </>
      )}

      <PremiumInfo open={premiumOpen} onClose={() => setPremiumOpen(false)} feature="CSV ilerleme raporu"
        description="Çalışma süresi, soru ve tamamlanan görev verilerini CSV olarak dışa aktarıp kendi arşivinde kullanabilirsin."
        benefits={['İlerleme verilerini dışa aktar', 'Kendi analiz dosyanı oluştur', 'Sınırsız istatistik geçmişini koru']} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
});
