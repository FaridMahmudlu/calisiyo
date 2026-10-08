import { router, type Href } from 'expo-router';
import {
  AlertTriangle, BarChart3, BookMarked, BookOpen, CalendarDays, CircleDollarSign, CreditCard, FileText,
  LifeBuoy, LogOut, RotateCcw, Settings, ShieldCheck, Target, Trophy, type LucideIcon,
} from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { TabHeader } from '@/components/TabHeader';
import { Avatar, Badge, Card, ListItem, ProgressBar, Screen, Text } from '@/components/ui';
import { openWebPage } from '@/lib/browser';
import { useAccount } from '@/providers/AccountProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Item = { href: Href; label: string; icon: LucideIcon; color: string };

const PLANNING: Item[] = [
  { href: '/haftalik-program', label: 'Haftalık Program', icon: CalendarDays, color: '#2563EB' },
  { href: '/konu-takibi', label: 'Konu Takibi', icon: BarChart3, color: '#00A870' },
  { href: '/deneme-analizi', label: 'Deneme Analizi', icon: Target, color: '#F43F5E' },
  { href: '/istatistikler', label: 'İstatistikler', icon: BarChart3, color: '#8B5CF6' },
];
const STUDY: Item[] = [
  { href: '/tekrarlarim', label: 'Tekrarlarım', icon: RotateCcw, color: '#0EA5E9' },
  { href: '/yapamadiklari', label: 'Yapamadığım Sorular', icon: AlertTriangle, color: '#F59E0B' },
  { href: '/kaynaklarim', label: 'Kaynaklarım', icon: BookOpen, color: '#14B8A6' },
  { href: '/not-defteri', label: 'Not Defterim', icon: FileText, color: '#6366F1' },
  { href: '/hedeflerim', label: 'Hedeflerim', icon: Target, color: '#EC4899' },
  { href: '/gelisim', label: 'Gelişim ve Seviyem', icon: Trophy, color: '#A36B08' },
];

function Tile({ item }: { item: Item }) {
  const { colors } = useTheme();
  const Icon = item.icon;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(item.href)}
      style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: `${item.color}1A` }]}><Icon size={20} color={item.color} /></View>
      <Text variant="captionStrong" numberOfLines={2}>{item.label}</Text>
    </Pressable>
  );
}

export default function MenuScreen() {
  const { colors } = useTheme();
  const { profile, user, currentPlan, adminRole, contentProducer, stats } = useAccount();
  const { signOut } = useAuth();

  const confirmLogout = () => Alert.alert('Çıkış yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Çıkış yap', style: 'destructive', onPress: signOut },
  ]);

  return (
    <Screen edges="top">
      <TabHeader title="Daha fazla" subtitle="Tüm çalışma araçların ve hesabın tek yerde." />

      <Card onPress={() => router.push('/ayarlar')} style={styles.profile}>
        <Avatar name={profile?.full_name} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading" numberOfLines={1}>{profile?.full_name || 'Öğrenci'}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>{user?.email}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <Badge label={currentPlan.name} tone={currentPlan.code === 'baslangic' ? 'muted' : 'primary'} />
            <Badge label={`YKS ${profile?.yks_year || 2027}`} tone="info" />
          </View>
        </View>
      </Card>

      <Card onPress={() => router.push('/gelisim')} style={{ marginTop: space.md, gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Trophy size={18} color={colors.gold} />
          <Text variant="subheading" style={{ flex: 1 }}>Seviye {stats.level} · {stats.levelTitle}</Text>
          <Text variant="captionStrong" color="textMuted">{stats.xpToNext} XP</Text>
        </View>
        <ProgressBar value={stats.progressPercent} color={colors.gold} track={colors.goldSoft} />
      </Card>

      <Text variant="label" color="textMuted" style={styles.label}>Planlama</Text>
      <View style={styles.grid}>{PLANNING.map((item) => <Tile key={String(item.href)} item={item} />)}</View>

      <Text variant="label" color="textMuted" style={styles.label}>Çalışma</Text>
      <View style={styles.grid}>{STUDY.map((item) => <Tile key={String(item.href)} item={item} />)}</View>

      <Text variant="label" color="textMuted" style={styles.label}>Hesap ve program</Text>
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <ListItem icon={CreditCard} title="Paketim" subtitle={currentPlan.name} onPress={() => router.push('/abonelik')} />
        <ListItem icon={CircleDollarSign} iconColor="#A36B08" title={contentProducer.status === 'not_enrolled' ? 'İçerik Üreticisi Başvurusu' : 'İçerik Üretici Programı'} onPress={() => router.push('/icerik-ureticisi')} />
        <ListItem icon={BookMarked} iconColor="#2563EB" title="Rehber" subtitle="YKS çalışma rehberleri" onPress={() => router.push('/rehber')} />
        {adminRole ? <ListItem icon={ShieldCheck} iconColor="#7C3AED" title="Admin Paneli" subtitle="Analiz ve yönetim araçları" onPress={() => router.push('/admin')} /> : null}
        <ListItem icon={Settings} iconColor={colors.textMuted} title="Ayarlar" onPress={() => router.push('/ayarlar')} />
        <ListItem icon={LifeBuoy} iconColor={colors.textMuted} title="Yardım ve iletişim" onPress={() => openWebPage('/iletisim')} />
        <ListItem icon={LogOut} title="Güvenli çıkış yap" danger chevron={false} onPress={confirmLogout} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  label: { marginTop: space.xxl, marginBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { flexBasis: '30%', flexGrow: 1, minHeight: 100, padding: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, gap: space.sm, justifyContent: 'space-between' },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
