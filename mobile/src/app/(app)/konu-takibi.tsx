import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, Circle, PlayCircle, Repeat2, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { getExamTabs } from '@shared/constants/alanlar';
import { Card, EmptyState, ErrorState, IconButton, ProgressBar, Screen, Segmented, SkeletonCards, Text, TextField, useToast } from '@/components/ui';
import type { Ders, Konu } from '@/features/study/queries';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Durum = 'baslanmadi' | 'devam_ediyor' | 'tamamlandi';
const CYCLE: Durum[] = ['baslanmadi', 'devam_ediyor', 'tamamlandi'];
const REALTIME_TABLES = ['konu_takibi'];

export default function TopicTrackingScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAccount();
  const userId = profile?.id;
  const examTabs = getExamTabs(profile?.alan_secimi || 'sayisal');
  const [activeTab, setActiveTab] = useState(examTabs[0]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Set<string>>(new Set());

  const meta = { done: { label: 'Tamamlandı', icon: CheckCircle2, color: colors.primary, bg: colors.primarySoft }, progress: { label: 'Devam Ediyor', icon: PlayCircle, color: colors.warning, bg: colors.warningSoft }, none: { label: 'Başlanmadı', icon: Circle, color: colors.textMuted, bg: colors.surfaceSunken } };
  const durumMeta = (durum: Durum) => durum === 'tamamlandi' ? meta.done : durum === 'devam_ediyor' ? meta.progress : meta.none;

  const curriculum = useQuery({
    queryKey: ['curriculum', profile?.yks_year, profile?.alan_secimi, activeTab],
    enabled: !!profile,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data: courses, error } = await supabase.from('dersler').select('*').eq('sinav_turu', activeTab).eq('curriculum_year', Number(profile!.yks_year || 2027)).contains('alan', [profile!.alan_secimi]).order('sira');
      if (error) throw new Error('Ders ve konu verileri yüklenemedi. Lütfen tekrar dene.');
      const ids = (courses || []).map((course) => course.id);
      if (!ids.length) return { courses: [] as Ders[], topics: [] as Konu[] };
      const { data: topics, error: topicError } = await supabase.from('konular').select('*').in('ders_id', ids).order('sira');
      if (topicError) throw new Error('Konular yüklenemedi. Lütfen tekrar dene.');
      return { courses: (courses || []) as Ders[], topics: (topics || []) as Konu[] };
    },
  });
  const trackingKey = ['topic-tracking', userId];
  const tracking = useQuery({
    queryKey: trackingKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('konu_takibi').select('konu_id,durum').eq('user_id', userId!);
      if (error) throw new Error('Konu ilerlemen yüklenemedi.');
      return Object.fromEntries((data || []).map((item) => [item.konu_id, item.durum as Durum])) as Record<string, Durum>;
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: tracking.refetch });

  const takip = tracking.data || {};
  const courses = curriculum.data?.courses || [];
  const topics = curriculum.data?.topics || [];
  const activeOpen = openId ?? courses[0]?.id ?? null;
  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const matches = (topic: Konu) => !needle || topic.ad.toLocaleLowerCase('tr-TR').includes(needle);
  const completedTotal = topics.filter((topic) => takip[topic.id] === 'tamamlandi').length;
  const inProgressTotal = topics.filter((topic) => takip[topic.id] === 'devam_ediyor').length;

  const changeStatus = async (topicId: string) => {
    if (pending.has(topicId)) return;
    const existing = takip[topicId];
    const next = CYCLE[(CYCLE.indexOf(existing || 'baslanmadi') + 1) % CYCLE.length];
    Haptics.impactAsync(next === 'tamamlandi' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setPending((current) => new Set(current).add(topicId));
    queryClient.setQueryData(trackingKey, (current: Record<string, Durum> = {}) => ({ ...current, [topicId]: next }));
    const result = existing
      ? await supabase.from('konu_takibi').update({ durum: next, updated_at: new Date().toISOString() }).eq('user_id', userId!).eq('konu_id', topicId)
      : await supabase.from('konu_takibi').insert({ user_id: userId, konu_id: topicId, durum: next });
    if (result.error) {
      queryClient.setQueryData(trackingKey, (current: Record<string, Durum> = {}) => ({ ...current, [topicId]: existing || 'baslanmadi' }));
      toast.error(`Konu durumu güncellenemedi: ${result.error.message}`);
    }
    setPending((current) => { const copy = new Set(current); copy.delete(topicId); return copy; });
  };

  return (
    <Screen onRefresh={() => Promise.all([curriculum.refetch(), tracking.refetch()])}>
      <Stack.Screen options={{ headerRight: () => <IconButton icon={Repeat2} label="Tekrar planla" tone="primary" onPress={() => router.push('/tekrarlarim')} /> }} />
      <Text variant="body" color="textMuted">Alanına uygun konuları durumlarına göre takip et. Durumu değiştirmek için rozete dokun.</Text>
      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Segmented options={examTabs.map((tab) => ({ value: tab, label: tab }))} value={activeTab} onChange={(tab) => { setActiveTab(tab); setOpenId(null); }} />
        <TextField icon={Search} value={search} onChangeText={setSearch} placeholder="Konu ara" returnKeyType="search" />
      </View>
      <Card style={{ flexDirection: 'row', marginTop: space.md }}>
        {[['Toplam konu', topics.length], ['Devam eden', inProgressTotal], ['Tamamlanan', completedTotal]].map(([label, value]) => (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}><Text variant="number">{value}</Text><Text variant="caption" color="textMuted">{label}</Text></View>
        ))}
      </Card>

      <View style={{ gap: space.md, marginTop: space.lg }}>
        {curriculum.isLoading ? <SkeletonCards count={4} /> : curriculum.isError ? <ErrorState message={(curriculum.error as Error).message} onRetry={curriculum.refetch} /> : courses.length === 0 ? (
          <Card><EmptyState icon={BookOpen} title="Ders bulunamadı" description="Seçtiğin alan ve sınav türüne ait ders bulunamadı. Ayarlar’dan alanını kontrol et." /></Card>
        ) : courses.filter((course) => topics.some((topic) => topic.ders_id === course.id && matches(topic)) || !needle).map((course) => {
          const courseTopics = topics.filter((topic) => topic.ders_id === course.id);
          const visible = courseTopics.filter(matches);
          const done = courseTopics.filter((topic) => takip[topic.id] === 'tamamlandi').length;
          const percent = courseTopics.length ? Math.round((done / courseTopics.length) * 100) : 0;
          const isOpen = activeOpen === course.id || !!needle;
          const tint = course.renk || colors.primary;
          return (
            <Card key={course.id} padded={false} style={{ overflow: 'hidden' }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpenId(isOpen && !needle ? '' : course.id)} style={styles.courseHeader}>
                <View style={[styles.courseIcon, { backgroundColor: `${tint}1F` }]}><Text style={{ fontSize: 22 }}>{course.ikon || '📘'}</Text></View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="subheading">{course.ad}</Text>
                    <Text variant="subheading" color={tint}>%{percent}</Text>
                  </View>
                  <ProgressBar value={percent} color={tint} height={6} />
                  <Text variant="caption" color="textMuted">{done} / {courseTopics.length} konu</Text>
                </View>
                {isOpen ? <ChevronUp size={20} color={colors.textSubtle} /> : <ChevronDown size={20} color={colors.textSubtle} />}
              </Pressable>
              {isOpen ? (
                <View style={[styles.topics, { borderTopColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
                  {visible.length === 0 ? <Text variant="caption" color="textMuted" align="center">Bu derse ait konu bulunamadı.</Text> : visible.map((topic) => {
                    const durum = takip[topic.id] || 'baslanmadi';
                    const info = durumMeta(durum);
                    const Icon = info.icon;
                    return (
                      <View key={topic.id} style={[styles.topic, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text variant="body" style={[{ flex: 1 }, durum === 'tamamlandi' && { textDecorationLine: 'line-through', color: colors.textMuted }]}>{topic.ad}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${topic.ad}: ${info.label}. Sonraki duruma geçir`}
                          disabled={pending.has(topic.id)}
                          onPress={() => changeStatus(topic.id)}
                          style={[styles.status, { backgroundColor: info.bg, opacity: pending.has(topic.id) ? 0.6 : 1 }]}
                        >
                          <Icon size={14} color={info.color} />
                          <Text variant="captionStrong" color={info.color}>{info.label}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  courseHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  courseIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  topics: { borderTopWidth: 1, padding: space.md, gap: space.sm },
  topic: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.sm, borderWidth: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: radius.full },
});
