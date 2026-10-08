import { useQuery } from '@tanstack/react-query';
import { BookCheck, Brain, CalendarCheck2, Clock3, Medal, Sparkles, Target, Trophy, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { HorizontalBars } from '@/components/charts';
import { Card, EmptyState, ErrorState, ProgressBar, ProgressRing, Screen, SectionHeader, SkeletonCards, Text } from '@/components/ui';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const EVENT_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  task_completed: { label: 'Program görevi', icon: CalendarCheck2, color: '#00A870' },
  review_completed: { label: 'Planlı tekrar', icon: Brain, color: '#8B5CF6' },
  exam_added: { label: 'Deneme kaydı', icon: Target, color: '#F97316' },
  topic_completed: { label: 'Konu tamamlandı', icon: BookCheck, color: '#3B82F6' },
  daily_focus: { label: '30 dakika odağı', icon: Clock3, color: '#14B8A6' },
};
const levelThreshold = (level: number) => 25 * Math.max(level - 1, 0) * (level + 8);
const levelTitle = (level: number) => level >= 30 ? 'Ustalık Yolunda' : level >= 20 ? 'Sınava Hazır' : level >= 15 ? 'İstikrarlı Öğrenci' : level >= 10 ? 'Düzenli Öğrenci' : level >= 6 ? 'Odaklı Öğrenci' : level >= 3 ? 'Rutin Kurucu' : 'Yeni Başlangıç';
const formatEventDate = (value: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const TABLES = ['xp_events'];

type Progress = { level: number; title: string; totalXp: number; xpToNext: number; progressPercent: number; currentLevelXp: number; currentLevelSize: number; breakdown?: Record<string, number>; rules?: { type: string; label: string; xp: number }[]; recentEvents?: { id: string; event_type: string; xp_amount: number; created_at: string }[] };

export default function ProgressionScreen() {
  const { colors } = useTheme();
  const { user, reload } = useAccount();
  const query = useQuery({
    queryKey: ['progress', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_progress');
      if (error) throw new Error('Gelişim bilgilerin şu anda yüklenemiyor. Lütfen tekrar dene.');
      return data as Progress;
    },
  });
  useRealtimeRefresh({ tables: TABLES, userId: user?.id, onChange: () => { query.refetch(); reload(); } });
  const progress = query.data;
  const breakdown = Object.entries(progress?.breakdown || {}).map(([type, value]) => ({ type, value: Number(value || 0), ...(EVENT_META[type] || { label: type, color: colors.primary }) })).sort((a, b) => b.value - a.value);
  const milestones = progress ? [1, 2, 3].map((step) => { const level = progress.level + step; return { level, title: levelTitle(level), threshold: levelThreshold(level), remaining: Math.max(0, levelThreshold(level) - Number(progress.totalXp || 0)) }; }) : [];

  return (
    <Screen onRefresh={query.refetch}>
      <Text variant="body" color="textMuted">Seviyen yalnızca gerçek çalışma hareketlerinden ilerler. Tekrarlanan dokunuşlar veya silinen kayıtlar XP kazandırmaz.</Text>
      {query.isLoading ? <View style={{ marginTop: space.lg }}><SkeletonCards count={3} /></View> : query.isError || !progress ? <View style={{ marginTop: space.lg }}><ErrorState message={(query.error as Error)?.message || 'Gelişim bilgisi yok.'} onRetry={query.refetch} /></View> : (
        <>
          <Card style={[styles.hero, { marginTop: space.lg }]}>
            <ProgressRing value={progress.progressPercent || 0} size={128} stroke={12} color={colors.gold} track={colors.goldSoft}>
              <Trophy size={20} color={colors.gold} />
              <Text variant="display">{progress.level}</Text>
              <Text variant="label" color="textMuted">Seviye</Text>
            </ProgressRing>
            <View style={{ flex: 1, gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Sparkles size={14} color={colors.gold} /><Text variant="captionStrong" color="gold">{progress.title}</Text></View>
              <Text variant="heading">{Number(progress.totalXp || 0).toLocaleString('tr-TR')} toplam XP</Text>
              <Text variant="caption" color="textMuted">Sonraki seviyeye {Number(progress.xpToNext || 0).toLocaleString('tr-TR')} XP kaldı.</Text>
              <ProgressBar value={progress.progressPercent || 0} color={colors.gold} track={colors.goldSoft} />
              <Text variant="caption" color="textSubtle">{progress.currentLevelXp} / {progress.currentLevelSize} XP</Text>
            </View>
          </Card>
          <Card tone="muted" style={{ flexDirection: 'row', gap: space.md, marginTop: space.md }}>
            <Medal size={20} color={colors.primary} />
            <View style={{ flex: 1 }}><Text variant="subheading">Adil ilerleme</Text><Text variant="caption" color="textMuted">XP, kayıtların durumuyla birlikte güncellenir. Bir hareket geri alınırsa ona ait XP de geri alınır.</Text></View>
          </Card>

          <SectionHeader title="XP dağılımı" subtitle="Seni ileri taşıyan alışkanlıklar" />
          <Card>{breakdown.length ? <HorizontalBars items={breakdown.map((item) => ({ label: item.label, value: item.value, color: item.color, hint: `${item.value} XP` }))} /> : <EmptyState compact icon={Trophy} title="İlk XP’ni kazanmaya hazırsın" description="Bugünkü programından bir görevi tamamlayarak başlayabilirsin." />}</Card>

          <SectionHeader title="Sıradaki seviyeler" />
          <Card padded={false}>
            {milestones.map((item, index) => (
              <View key={item.level} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[styles.levelBadge, { backgroundColor: index === 0 ? colors.gold : colors.surfaceSunken }]}><Text variant="subheading" color={index === 0 ? '#FFFFFF' : 'textMuted'}>{item.level}</Text></View>
                <View style={{ flex: 1 }}><Text variant="bodyStrong">{item.title}</Text><Text variant="caption" color="textMuted">{item.threshold.toLocaleString('tr-TR')} toplam XP</Text></View>
                <Text variant="captionStrong" color="textMuted">{item.remaining.toLocaleString('tr-TR')} kaldı</Text>
              </View>
            ))}
          </Card>

          <SectionHeader title="XP kuralları" subtitle="Her puanın gerçek bir karşılığı var" />
          <Card padded={false}>
            {(progress.rules || []).map((rule, index) => {
              const meta = EVENT_META[rule.type] || { icon: Sparkles, color: colors.primary };
              const Icon = meta.icon;
              return (
                <View key={rule.type} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <View style={[styles.icon, { backgroundColor: `${meta.color}1A` }]}><Icon size={17} color={meta.color} /></View>
                  <View style={{ flex: 1 }}><Text variant="bodyStrong">{rule.label}</Text><Text variant="caption" color="textMuted">Bir kez, gerçek kayıt üzerinden</Text></View>
                  <Text variant="subheading" color="primary">+{rule.xp} XP</Text>
                </View>
              );
            })}
          </Card>

          <SectionHeader title="XP günlüğün" subtitle="Son hareketler" />
          <Card padded={false}>
            {(progress.recentEvents || []).length === 0 ? <EmptyState compact icon={Clock3} title="Henüz hareket yok" description="Kazandığın XP burada zaman sırasıyla görünür." /> : (progress.recentEvents || []).map((event, index) => {
              const meta = EVENT_META[event.event_type] || { label: event.event_type, icon: Sparkles, color: colors.primary };
              const Icon = meta.icon;
              return (
                <View key={event.id} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <View style={[styles.icon, { backgroundColor: `${meta.color}1A` }]}><Icon size={15} color={meta.color} /></View>
                  <View style={{ flex: 1 }}><Text variant="bodyStrong">{meta.label}</Text><Text variant="caption" color="textMuted">{formatEventDate(event.created_at)}</Text></View>
                  <Text variant="captionStrong" color="primary">+{event.xp_amount} XP</Text>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  levelBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
