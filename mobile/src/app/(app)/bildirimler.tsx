import { router, Stack } from 'expo-router';
import {
  BellRing, CalendarCheck, CheckCheck, ChevronRight, Crown, Flame, Megaphone, RotateCcw, Settings, ShieldCheck, Sparkles, Target, Timer, Trophy, Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { EmptyState, ErrorState, IconButton, Segmented, SkeletonCards, Text, useToast } from '@/components/ui';
import { useNotifications, type AppNotification } from '@/features/notifications/useNotifications';
import { useNow } from '@/hooks/useNow';
import { useContentFrame } from '@/hooks/useResponsive';
import { appRouteFromWebPath } from '@/lib/routes';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, type ThemeColors } from '@/theme/tokens';

type Category = { label: string; icon: LucideIcon; tint: keyof ThemeColors; soft: keyof ThemeColors };

const CATEGORIES: { test: (item: AppNotification) => boolean; category: Category }[] = [
  { test: (item) => /gunluk-program|haftalik/.test(item.action_url || ''), category: { label: 'Plan', icon: CalendarCheck, tint: 'primary', soft: 'primarySoft' } },
  { test: (item) => /tekrar/.test(item.action_url || ''), category: { label: 'Tekrar', icon: RotateCcw, tint: 'info', soft: 'infoSoft' } },
  { test: (item) => /pomodoro|kronometre/.test(item.action_url || ''), category: { label: 'Odak', icon: Timer, tint: 'primary', soft: 'primarySoft' } },
  { test: (item) => /istatistik/.test(item.action_url || '') || /seri/i.test(item.title), category: { label: 'Seri', icon: Flame, tint: 'streak', soft: 'streakSoft' } },
  { test: (item) => /gelisim/.test(item.action_url || '') || /^Seviye/i.test(item.title), category: { label: 'Seviye', icon: Trophy, tint: 'gold', soft: 'goldSoft' } },
  { test: (item) => /deneme/.test(item.action_url || ''), category: { label: 'Deneme', icon: Target, tint: 'danger', soft: 'dangerSoft' } },
  { test: (item) => /arkadas|sinif/.test(item.action_url || ''), category: { label: 'Sınıf', icon: Users, tint: 'violet', soft: 'violetSoft' } },
  { test: (item) => /abonelik|paket/.test(item.action_url || ''), category: { label: 'Paket', icon: Crown, tint: 'gold', soft: 'goldSoft' } },
  { test: (item) => /icerik-ureticisi/.test(item.action_url || ''), category: { label: 'Üretici', icon: Sparkles, tint: 'violet', soft: 'violetSoft' } },
  { test: (item) => /admin|ayarlar/.test(item.action_url || ''), category: { label: 'Hesap', icon: ShieldCheck, tint: 'info', soft: 'infoSoft' } },
];
const ANNOUNCEMENT: Category = { label: 'Duyuru', icon: Megaphone, tint: 'accent', soft: 'accentSoft' };
const categoryOf = (item: AppNotification) => CATEGORIES.find((entry) => entry.test(item))?.category || ANNOUNCEMENT;

const DAY = 86_400_000;
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const startOfDay = (time: number) => { const date = new Date(time); date.setHours(0, 0, 0, 0); return date.getTime(); };
const clock = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

function dayLabel(value: string, now: number) {
  const diff = Math.round((startOfDay(now) - startOfDay(new Date(value).getTime())) / DAY);
  if (diff <= 0) return 'Bugün';
  if (diff === 1) return 'Dün';
  if (diff < 7) return WEEKDAYS[new Date(value).getDay()];
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(value));
}

function timeLabel(value: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  if (minutes < 360) return `${Math.floor(minutes / 60)} sa önce`;
  return clock(new Date(value));
}

type Row = { type: 'header'; key: string; label: string } | { type: 'item'; key: string; item: AppNotification };

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const now = useNow(60_000);
  const frame = useContentFrame();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { items, unread, isLoading, isError, error, refetch, isRefetching, markRead, markAllRead } = useNotifications();

  const rows = useMemo(() => {
    const list: Row[] = [];
    let current = '';
    for (const item of items) {
      if (filter === 'unread' && item.read_at) continue;
      const label = dayLabel(item.created_at, now);
      if (label !== current) { current = label; list.push({ type: 'header', key: `h-${label}`, label }); }
      list.push({ type: 'item', key: item.id, item });
    }
    return list;
  }, [items, filter, now]);

  const open = async (item: AppNotification) => {
    if (!item.read_at) await markRead(item.id).catch((reason: Error) => toast.error(reason.message));
    const route = appRouteFromWebPath(item.action_url);
    if (route) router.push(route as never);
  };

  const readAll = () => markAllRead()
    .then(() => toast.success('Tüm bildirimler okundu.'))
    .catch((reason: Error) => toast.error(reason.message));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            {unread ? <IconButton icon={CheckCheck} label="Tümünü okundu say" tone="primary" onPress={readAll} /> : null}
            <IconButton icon={Settings} label="Bildirim ayarları" onPress={() => router.push('/ayarlar')} />
          </View>
        ),
      }} />
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[frame, { paddingVertical: space.lg, gap: space.sm, paddingBottom: 80 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={items.length ? (
          <View style={{ gap: space.md, marginBottom: space.xs }}>
            <Text variant="body" color="textMuted">
              {unread ? `${unread} okunmamış bildirimin var.` : 'Tüm bildirimlerini okudun.'}
            </Text>
            <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Tümü' }, { value: 'unread', label: unread ? `Okunmamış (${unread})` : 'Okunmamış' }]} />
          </View>
        ) : null}
        ListEmptyComponent={isLoading ? <SkeletonCards count={5} /> : isError ? <ErrorState message={(error as Error).message} onRetry={refetch} /> : filter === 'unread' && items.length ? (
          <EmptyState icon={CheckCheck} title="Hepsini okudun" description="Yeni bir gelişme olduğunda burada göreceksin." />
        ) : (
          <EmptyState icon={BellRing} title="Henüz bildirimin yok" description="Plan hatırlatmaları, seri ve deneme gelişmelerin burada görünür." />
        )}
        renderItem={({ item: row }) => {
          if (row.type === 'header') return <Text variant="label" color="textSubtle" style={styles.section}>{row.label}</Text>;
          const { item } = row;
          const category = categoryOf(item);
          const Icon = category.icon;
          const isUnread = !item.read_at;
          const actionable = !!appRouteFromWebPath(item.action_url);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${isUnread ? 'Okunmamış. ' : ''}${item.title}. ${item.body}`}
              onPress={() => open(item)}
              style={({ pressed }) => [styles.item, {
                backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                borderColor: isUnread ? colors.primaryBorder : colors.border,
              }]}
            >
              <View style={[styles.icon, { backgroundColor: colors[category.soft] }]}><Icon size={19} color={colors[category.tint]} strokeWidth={2.3} /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.meta}>
                  <Text variant="label" color={category.tint}>{category.label}</Text>
                  <Text variant="caption" color="textSubtle">· {timeLabel(item.created_at, now)}</Text>
                </View>
                <Text variant="bodyStrong" numberOfLines={2} style={isUnread ? { fontFamily: fonts.heavy } : undefined}>{item.title}</Text>
                {item.body ? <Text variant="caption" color="textMuted" numberOfLines={3}>{item.body}</Text> : null}
              </View>
              <View style={styles.trailing}>
                {isUnread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
                {actionable ? <ChevronRight size={18} color={colors.textSubtle} /> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.md, marginBottom: 2, marginLeft: 2 },
  item: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trailing: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2, minHeight: 42 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
