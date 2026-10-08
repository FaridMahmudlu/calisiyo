import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BarChart2, BookOpen, Calendar, CheckCircle2, ChevronRight, Clock, Flame, Plus, Quote, Target, Timer, TrendingUp, Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { daysUntilYKS, formatDate, formatDuration, formatShortDate, parseLocalDate, toLocalDateKey, todayStr, yksDateLabel } from '@shared/utils/date';
import { AreaChart, Heatmap, HorizontalBars } from '@/components/charts';
import { TabHeader } from '@/components/TabHeader';
import { Badge, Button, Card, EmptyState, ProgressBar, ProgressRing, Screen, SectionHeader, SkeletonCards, Text, useToast } from '@/components/ui';
import { courseKey, fetchCourses } from '@/features/study/queries';
import { TaskRow, type Task } from '@/features/study/TaskRow';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { createStudyImageUrls } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const MOTIVATION_QUOTES = [
  'Bugün attığın küçük adımlar, yarınki büyük başarılarının temeli olacak.',
  'Disiplin, ne istediğin ile şu an ne istediğin arasındaki seçimdir.',
  'Gelecek, bugünden hazırlananlara aittir.',
  'Başarı, her gün tekrarlanan küçük çabaların toplamıdır.',
  'Zorluklar, başaranların vazgeçmediği yerlerde aşılır.',
  'Derece yapmak bir tesadüf değil, düzenli çalışmanın sonucudur.',
];
const REALTIME_TABLES = ['gunluk_gorevler', 'denemeler', 'konu_takibi', 'calisma_suresi', 'pomodoro_kayitlari'];
const dayOfYear = (dateKey: string) => {
  const date = parseLocalDate(dateKey);
  return Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000);
};
type ActivityTime = { studyMinutes: number; questions: number; daily: { date: string; studyMinutes: number }[] };

export default function DashboardScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile, stats } = useAccount();
  const userId = profile?.id;
  const today = todayStr();

  const courses = useQuery({ queryKey: courseKey(profile), queryFn: () => fetchCourses(profile), enabled: !!profile });
  const dashboard = useQuery({
    queryKey: ['dashboard', userId, today, courses.data?.length],
    enabled: !!userId && courses.isSuccess,
    queryFn: async () => {
      const courseIds = (courses.data || []).map((course) => course.id);
      const [todayResult, upcomingResult, topicsResult, trackingResult, examsResult, timeResult] = await Promise.all([
        supabase.from('gunluk_gorevler').select('*, dersler(ad, renk, ikon, sinav_turu)').eq('user_id', userId!).eq('tarih', today).order('baslangic_saat'),
        supabase.from('gunluk_gorevler').select('*, dersler(ad, renk, ikon)').eq('user_id', userId!).gte('tarih', today).eq('tamamlandi', false)
          .order('tarih', { ascending: true }).order('baslangic_saat', { ascending: true }).limit(4),
        courseIds.length ? supabase.from('konular').select('id, ders_id').in('ders_id', courseIds) : Promise.resolve({ data: [], error: null }),
        supabase.from('konu_takibi').select('konu_id, durum').eq('user_id', userId!),
        supabase.from('denemeler').select('*, deneme_detaylari(net)').eq('user_id', userId!).order('tarih', { ascending: true }),
        supabase.rpc('get_my_study_time_statistics', { p_start_date: null }),
      ]);
      const failed = [todayResult, upcomingResult, topicsResult, trackingResult, examsResult, timeResult].find((result) => result.error);
      if (failed) throw new Error('Dashboard verilerin yüklenemedi. Lütfen tekrar dene.');
      return {
        todayTasks: (todayResult.data || []) as Task[],
        upcoming: (upcomingResult.data || []) as Task[],
        topics: (topicsResult.data || []) as { id: string; ders_id: string }[],
        tracking: (trackingResult.data || []) as { konu_id: string; durum: string }[],
        exams: (examsResult.data || []) as { tarih: string; yayin?: string; deneme_detaylari?: { net: number }[] }[],
        time: (timeResult.data || { studyMinutes: 0, questions: 0, daily: [] }) as ActivityTime,
      };
    },
  });
  const refetch = dashboard.refetch;
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: refetch });

  const goalPath = profile?.study_goals?.goalImagePath as string | undefined;
  const goalImage = useQuery({ queryKey: ['goal-image', goalPath], enabled: !!goalPath, staleTime: 50 * 60_000, queryFn: async () => (await createStudyImageUrls([goalPath]))[goalPath!] || '' });

  const data = dashboard.data;
  const todayTasks = useMemo(() => data?.todayTasks || [], [data?.todayTasks]);
  const completed = todayTasks.filter((task) => task.tamamlandi);
  const taskPct = todayTasks.length ? Math.round((completed.length / todayTasks.length) * 100) : 0;
  const plannedQuestions = todayTasks.reduce((sum, task) => sum + (task.soru_sayisi || 0), 0);
  const solvedQuestions = completed.reduce((sum, task) => sum + (task.soru_sayisi || 0), 0);
  const questionPct = plannedQuestions ? Math.round((solvedQuestions / plannedQuestions) * 100) : 0;
  const todayMinutes = Number(data?.time.daily?.find((item) => item.date === today)?.studyMinutes || 0);
  const timePct = Math.min(100, Math.round((todayMinutes / 300) * 100));
  const daysLeft = daysUntilYKS();
  const quote = MOTIVATION_QUOTES[dayOfYear(today) % MOTIVATION_QUOTES.length];

  const grouped = useMemo(() => {
    const map: Record<string, { name: string; color: string; total: number; solved: number; tasks: number; done: number }> = {};
    for (const task of todayTasks) {
      const name = task.dersler?.ad || 'Genel';
      map[name] ||= { name, color: task.dersler?.renk || colors.primary, total: 0, solved: 0, tasks: 0, done: 0 };
      map[name].total += task.soru_sayisi || 0;
      map[name].tasks += 1;
      if (task.tamamlandi) { map[name].solved += task.soru_sayisi || 0; map[name].done += 1; }
    }
    return Object.values(map);
  }, [colors.primary, todayTasks]);

  const subjectProgress = useMemo(() => {
    const tracked = Object.fromEntries((data?.tracking || []).map((item) => [item.konu_id, item.durum]));
    return (courses.data || []).map((course) => {
      const topics = (data?.topics || []).filter((topic) => topic.ders_id === course.id);
      const done = topics.filter((topic) => tracked[topic.id] === 'tamamlandi').length;
      return { label: course.ad, value: topics.length ? Math.round((done / topics.length) * 100) : 0, color: course.renk || colors.primary };
    });
  }, [colors.primary, courses.data, data?.topics, data?.tracking]);

  const heatmap = useMemo(() => {
    const now = parseLocalDate(today);
    const end = new Date(now);
    end.setDate(now.getDate() + (now.getDay() === 0 ? 0 : 7 - now.getDay()));
    const minutes = Object.fromEntries((data?.time.daily || []).map((item) => [item.date, Number(item.studyMinutes || 0)]));
    return Array.from({ length: 12 }, (_, colIndex) => Array.from({ length: 7 }, (_, row) => {
      const date = new Date(end);
      date.setDate(end.getDate() - ((11 - colIndex) * 7 + (6 - row)));
      const key = toLocalDateKey(date);
      const value = minutes[key] || 0;
      const level = value <= 0 ? 0 : value <= 30 ? 1 : value <= 80 ? 2 : value <= 150 ? 3 : 4;
      return { date: key, value, level };
    }));
  }, [data?.time.daily, today]);

  const examSeries = (data?.exams || []).map((exam) => ({ label: formatShortDate(exam.tarih), value: Number((exam.deneme_detaylari || []).reduce((sum, item) => sum + (item.net || 0), 0).toFixed(2)) }));
  const averageNet = (() => {
    const scored = (data?.exams || []).filter((exam) => (exam.deneme_detaylari || []).length > 0);
    if (!scored.length) return '0.0';
    return (scored.reduce((sum, exam) => sum + (exam.deneme_detaylari || []).reduce((s, item) => s + (item.net || 0), 0), 0) / scored.length).toFixed(1);
  })();
  const bestDay = (data?.time.daily || []).reduce((best, item) => (Number(item.studyMinutes) > best.minutes ? { minutes: Number(item.studyMinutes), date: item.date } : best), { minutes: 0, date: '' });

  const toggleTask = async (task: Task) => {
    const key = ['dashboard', userId, today, courses.data?.length];
    queryClient.setQueryData(key, (current: typeof data) => current ? {
      ...current,
      todayTasks: current.todayTasks.map((item) => item.id === task.id ? { ...item, tamamlandi: !task.tamamlandi } : item),
      upcoming: current.upcoming.filter((item) => item.id !== task.id || task.tamamlandi),
    } : current);
    const { error } = await supabase.from('gunluk_gorevler').update({ tamamlandi: !task.tamamlandi }).eq('id', task.id).eq('user_id', userId!);
    if (error) toast.error('Görev güncellenemedi. Lütfen tekrar dene.');
    refetch();
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Öğrenci';
  const goals = profile?.study_goals || {};

  return (
    <Screen edges="top" onRefresh={() => Promise.all([refetch(), courses.refetch()])}>
      <TabHeader title={`Merhaba, ${firstName}! 👋`} subtitle="Bugün harika bir gün, hedeflerine bir adım daha yaklaş." />

      {(goals.university || goals.program) ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/hedeflerim')} style={[styles.goal, { borderColor: colors.primaryBorder, backgroundColor: colors.surface }]}>
          {goalImage.data ? (
            <>
              <Image source={{ uri: goalImage.data }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={['rgba(6,33,26,0.92)', 'rgba(6,33,26,0.78)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </>
          ) : null}
          <View style={[styles.goalIcon, { backgroundColor: colors.primarySoft }]}><Target size={16} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="label" color={goalImage.data ? '#A7F3D0' : 'primary'}>Hedef</Text>
            <Text variant="subheading" color={goalImage.data ? '#FFFFFF' : 'text'} numberOfLines={1}>{[goals.university, goals.program].filter(Boolean).join(' · ')}</Text>
          </View>
          <ChevronRight size={18} color={goalImage.data ? '#FFFFFF' : colors.textSubtle} />
        </Pressable>
      ) : null}

      {dashboard.isLoading ? <SkeletonCards count={4} /> : (
        <Animated.View entering={FadeInDown.duration(350)} style={{ gap: space.md }}>
          <View style={styles.grid}>
            <MiniStat icon={Calendar} tint={colors.primary} title="YKS’ye kalan" value={daysLeft == null ? '—' : String(daysLeft)} hint={daysLeft == null ? 'Tahmini tarih geçti' : `gün · Tahmini ${yksDateLabel()}`} />
            <MiniStat icon={Target} tint="#F43F5E" title="Bugünkü hedef" value={`${completed.length}/${todayTasks.length}`} hint="görev tamamlandı" progress={taskPct} />
            <MiniStat icon={BookOpen} tint="#3B82F6" title="Bugünkü soru" value={`${solvedQuestions}/${plannedQuestions}`} hint="soru çözüldü" progress={questionPct} />
            <MiniStat icon={Clock} tint="#F59E0B" title="Bugünkü süre" value={formatDuration(todayMinutes)} hint="Hedef: 5 saat" progress={timePct} />
          </View>

          <Card tone="primary" onPress={() => router.push('/kronometre')} style={styles.focusCard}>
            <View style={[styles.focusIcon, { backgroundColor: colors.primary }]}><Timer size={22} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text variant="subheading">{stats.activePomodoroMinutes ? `Odak oturumu sürüyor · ${stats.activePomodoroMinutes} dk` : 'Odak oturumu başlat'}</Text>
              <Text variant="caption" color="textMuted">{stats.streakQualified ? 'Bugünkü seri hedefin tamamlandı! 🔥' : `Seri için bugün ${Math.max(0, 30 - stats.todayMinutes)} dakika daha odaklan.`}</Text>
            </View>
            <ChevronRight size={18} color={colors.primary} />
          </Card>

          <SectionHeader title="Bugünkü Program" action="Tümünü gör" onAction={() => router.push('/program')} />
          <Card>
            {todayTasks.length === 0 ? (
              <EmptyState compact icon={Calendar} title="Bugün için görev eklenmemiş" description="Günlük çalışma programını oluşturarak hedeflerini takip et." action="Görev ekle" onAction={() => router.push('/program')} />
            ) : (
              <View style={{ gap: space.md }}>
                <View style={styles.between}><Text variant="captionStrong" color="textMuted">Derslere göre</Text><Badge label={`${completed.length} / ${todayTasks.length}`} /></View>
                <HorizontalBars items={grouped.map((item) => ({
                  label: item.name, color: item.color,
                  value: item.total ? Math.round((item.solved / item.total) * 100) : Math.round((item.done / item.tasks) * 100),
                  hint: `${item.solved} / ${item.total} soru`,
                }))} max={100} />
              </View>
            )}
          </Card>

          <SectionHeader title="Yaklaşan Görevler" action="Tümünü gör" onAction={() => router.push('/program')} />
          {(data?.upcoming || []).length === 0 ? (
            <Card><EmptyState compact icon={CheckCircle2} title="Yaklaşan görev bulunmuyor" description="Harika! Bekleyen tüm görevlerini tamamladın." /></Card>
          ) : (
            <View style={{ gap: space.sm }}>
              {(data?.upcoming || []).map((task) => <TaskRow key={task.id} task={task} showDate onToggle={() => toggleTask(task)} />)}
            </View>
          )}

          <SectionHeader title="Seri Takibin" action="Detaylar" onAction={() => router.push('/istatistikler')} />
          <Card style={styles.streak}>
            <ProgressRing value={(Math.min(30, stats.streak) / 30) * 100} size={112} stroke={11} color={colors.streak} track={colors.streakSoft}>
              <Flame size={18} color={colors.streak} />
              <Text variant="number">{stats.streak}</Text>
              <Text variant="caption" color="textMuted">gün</Text>
            </ProgressRing>
            <View style={{ flex: 1, gap: 6 }}>
              <Text variant="subheading">{stats.streakQualified ? 'Bugünkü seri hedefin tamamlandı! 🔥' : `Bugün ${Math.max(0, 30 - stats.todayMinutes)} dakika daha odaklan`}</Text>
              <ProgressBar value={(Math.min(30, stats.todayMinutes) / 30) * 100} color={colors.streak} />
              <Text variant="caption" color="textMuted">{stats.todayMinutes} / 30 dakika · Seri yalnızca gerçek çalışma kayıtlarından hesaplanır.</Text>
            </View>
          </Card>

          <SectionHeader title="Çalışma Takvimi" subtitle="Son 12 haftadaki çalışma yoğunluğun" />
          <Card><Heatmap columns={heatmap} onSelect={(cell) => toast.show(`${formatDate(cell.date)}: ${formatDuration(cell.value)}`)} /></Card>

          <SectionHeader title="Derslere Göre İlerleme" action="Konu takibi" onAction={() => router.push('/konu-takibi')} />
          <Card>
            {subjectProgress.length ? <HorizontalBars items={subjectProgress} max={100} suffix="%" /> : <Text variant="caption" color="textMuted" align="center">Alanına uygun dersler bulunamadı.</Text>}
          </Card>

          <View style={[styles.grid, { marginTop: space.lg }]}>
            <MiniStat icon={BookOpen} tint="#8B5CF6" title="Toplam soru" value={Number(data?.time.questions || 0).toLocaleString('tr-TR')} hint={`+${solvedQuestions} bugün`} />
            <MiniStat icon={Clock} tint="#F43F5E" title="Toplam süre" value={formatDuration(Number(data?.time.studyMinutes || 0))} hint={`+${formatDuration(todayMinutes)} bugün`} />
            <MiniStat icon={Trophy} tint="#F59E0B" title="En uzun gün" value={bestDay.minutes ? formatDuration(bestDay.minutes) : '0sa'} hint={bestDay.date ? formatDate(bestDay.date) : 'Henüz veri yok'} />
            <MiniStat icon={TrendingUp} tint="#8B5CF6" title="Ortalama net" value={averageNet} hint="Tüm denemeler" />
          </View>

          <SectionHeader title="Son Deneme Sonuçları" action="Tümünü gör" onAction={() => router.push('/deneme-analizi')} />
          <Card>
            {examSeries.length ? <AreaChart data={examSeries} suffix=" net" /> : (
              <EmptyState compact icon={BarChart2} title="Henüz deneme eklenmemiş" description="Deneme sonuçlarını ekleyerek net gelişim grafiklerini gör." action="Deneme ekle" onAction={() => router.push('/deneme-analizi')} />
            )}
          </Card>

          <Card tone="primary" style={[styles.quote, { marginTop: space.lg }]}>
            <View style={[styles.quoteIcon, { backgroundColor: colors.surface }]}><Quote size={18} color={colors.primary} /></View>
            <Text variant="bodyStrong" style={{ flex: 1 }}>{quote}</Text>
          </Card>

          {todayTasks.length === 0 ? <Button title="Bugün için görev ekle" icon={Plus} variant="soft" onPress={() => router.push('/program')} style={{ marginTop: space.md }} /> : null}
        </Animated.View>
      )}
    </Screen>
  );
}

function MiniStat({ icon: Icon, tint, title, value, hint, progress }: { icon: typeof Calendar; tint: string; title: string; value: string; hint: string; progress?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.mini, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.between}>
        <Text variant="captionStrong" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>{title}</Text>
        <View style={[styles.miniIcon, { backgroundColor: `${tint}1A` }]}><Icon size={15} color={tint} /></View>
      </View>
      <Text variant="number" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text variant="caption" color="textMuted" numberOfLines={1}>{hint}</Text>
      {progress != null ? <View style={{ marginTop: 6 }}><ProgressBar value={progress} color={tint} height={6} /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  goal: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.full, borderWidth: 1, overflow: 'hidden', marginBottom: space.lg },
  goalIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  mini: { flexBasis: '47%', flexGrow: 1, padding: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, gap: 2 },
  miniIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  focusCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  focusIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  quote: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  quoteIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
