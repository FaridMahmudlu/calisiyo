import { router, Stack } from 'expo-router';
import { Bell, CheckCheck, Clock3, Settings, Sparkles, Target, Timer } from 'lucide-react-native';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, EmptyState, ErrorState, IconButton, SkeletonCards, Text } from '@/components/ui';
import { useNotifications, type AppNotification } from '@/features/notifications/useNotifications';
import { appRouteFromWebPath } from '@/lib/routes';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const KIND_ICONS = { success: Sparkles, reminder: Clock3, warning: Target, info: Timer } as const;

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} sa önce`;
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(value));
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { items, unread, isLoading, isError, error, refetch, isRefetching, markRead, markAllRead } = useNotifications();

  const open = async (item: AppNotification) => {
    if (!item.read_at) await markRead(item.id);
    const route = appRouteFromWebPath(item.action_url);
    if (route) router.push(route as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon={Settings} label="Bildirim ayarları" onPress={() => router.push('/ayarlar')} />
          </View>
        ),
      }} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text variant="body" color="textMuted" style={{ flex: 1 }}>{unread ? `${unread} yeni gelişme` : 'Her şey güncel'}</Text>
            <Button title="Tümünü oku" icon={CheckCheck} size="sm" variant="ghost" disabled={!unread} onPress={markAllRead} />
          </View>
        )}
        ListEmptyComponent={isLoading ? <SkeletonCards count={5} /> : isError ? <ErrorState message={(error as Error).message} onRetry={refetch} /> : (
          <EmptyState icon={Bell} title="Henüz bildirim yok" description="Plan ve çalışma gelişmelerin burada görünür." />
        )}
        renderItem={({ item }) => {
          const Icon = KIND_ICONS[item.kind as keyof typeof KIND_ICONS] || Bell;
          const isUnread = !item.read_at;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => open(item)}
              style={({ pressed }) => [styles.item, {
                backgroundColor: pressed ? colors.surfaceMuted : isUnread ? colors.primarySoft : colors.surface,
                borderColor: isUnread ? colors.primaryBorder : colors.border,
              }]}
            >
              <View style={[styles.icon, { backgroundColor: colors.surface }]}><Icon size={17} color={colors.primary} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{item.title}</Text>
                <Text variant="caption" color="textMuted">{item.body}</Text>
                <Text variant="caption" color="textSubtle">{relativeTime(item.created_at)}</Text>
              </View>
              {isUnread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} accessibilityLabel="Okunmamış" /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  item: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
});
