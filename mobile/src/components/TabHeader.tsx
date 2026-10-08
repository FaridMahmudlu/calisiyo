import { router } from 'expo-router';
import { Bell, BellRing, Flame, Trophy } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, IconButton, Text } from '@/components/ui';
import { useNotifications } from '@/features/notifications/useNotifications';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export function TabHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { colors } = useTheme();
  const { profile, stats } = useAccount();
  const { unread } = useNotifications();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${stats.streak} günlük seri`} onPress={() => router.push('/istatistikler')} style={[styles.pill, { backgroundColor: colors.streakSoft }]}>
          <Flame size={15} color={colors.streak} fill={stats.streakQualified ? colors.streak : 'transparent'} />
          <Text variant="captionStrong" color={colors.streak}>{stats.streak}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Seviye ${stats.level}`} onPress={() => router.push('/gelisim')} style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
          <Trophy size={15} color={colors.gold} />
          <Text variant="captionStrong" color={colors.gold}>Sv. {stats.level}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {right}
        <IconButton icon={unread ? BellRing : Bell} label={unread ? `${unread} okunmamış bildirim` : 'Bildirimler'} badge={unread} onPress={() => router.push('/bildirimler')} />
        <Pressable accessibilityRole="button" accessibilityLabel="Profil ve ayarlar" onPress={() => router.push('/ayarlar')} style={({ pressed }) => [{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, { opacity: pressed ? 0.7 : 1 }]}>
          <Avatar name={profile?.full_name} size={36} />
        </Pressable>
      </View>
      <Text variant="title" style={{ marginTop: space.lg }}>{title}</Text>
      {subtitle ? <Text variant="body" color="textMuted">{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 13, borderRadius: radius.full },
});
