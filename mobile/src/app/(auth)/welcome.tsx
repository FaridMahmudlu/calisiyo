import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { BookOpenCheck, CalendarCheck, LineChart, Timer, UsersRound, type LucideIcon } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from '@/components/brand/BrandMark';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Slide = { key: string; icon: LucideIcon; kicker: string; title: string; body: string; points: string[] };

const SLIDES: Slide[] = [
  {
    key: 'plan', icon: CalendarCheck, kicker: 'YKS Çalışma Koçu',
    title: 'Planın cebinde, ritmin elinde.',
    body: 'Günlük ve haftalık programını alanına göre kur; görevlerini tek dokunuşla tamamla.',
    points: ['Alanına göre TYT/AYT/YDT dersleri', 'Günlük ve haftalık program', 'Tekrar ve hedef hatırlatmaları'],
  },
  {
    key: 'focus', icon: Timer, kicker: 'Odak',
    title: 'Kronometreyle gerçek çalışma süresi.',
    body: 'Odak oturumların kilit ekranında görünür, bitince bildirim alırsın ve istatistiklerine kaydedilir.',
    points: ['25/5, 50/10, 90/20 veya özel süre', 'Ders ve kaynak bazlı kayıt', 'Günlük 30 dakika ile seri'],
  },
  {
    key: 'analysis', icon: LineChart, kicker: 'Analiz',
    title: 'Denemelerini ve konularını verilerle izle.',
    body: 'Net gelişimini, konu ilerlemeni ve çalışma istatistiklerini gerçek kayıtlarınla gör.',
    points: ['Deneme analizi ve net takibi', 'Konu takibi ve yapamadığım sorular', 'Seviye, XP ve gelişim'],
  },
  {
    key: 'social', icon: UsersRound, kicker: 'Birlikte çalış',
    title: 'Çalışma sınıflarında birlikte odaklan.',
    body: 'Arkadaşlarınla sınıf kur, ortak odak oturumu başlat, mesajlaş ve birbirinizi motive edin.',
    points: ['Canlı çalışma sınıfı', 'Sesli mesaj ve dosya paylaşımı', 'Arkadaş sıralaması'],
  },
];

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }]}>
      <LinearGradient colors={[colors.primarySoft, colors.background]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.6 }} />
      <View style={styles.header}>
        <BrandLogo size={32} />
        <Link href="/rehber" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}><Text variant="captionStrong" color="primary">Rehber</Text></Pressable>
        </Link>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={[styles.slide, { width }]}>
              <Animated.View entering={FadeInDown.duration(500)} style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}>
                <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}><Icon size={34} color="#FFFFFF" strokeWidth={2.2} /></View>
                {item.points.map((point) => (
                  <View key={point} style={styles.point}>
                    <BookOpenCheck size={16} color={colors.primary} />
                    <Text variant="bodyStrong" style={{ flex: 1 }}>{point}</Text>
                  </View>
                ))}
              </Animated.View>
              <Text variant="label" color="primary" style={{ marginTop: space.xxl }}>{item.kicker}</Text>
              <Text variant="display" style={{ marginTop: space.sm }}>{item.title}</Text>
              <Text variant="body" color="textMuted" style={{ marginTop: space.md }}>{item.body}</Text>
            </View>
          );
        }}
      />

      <View style={styles.dots}>
        {SLIDES.map((slide, dot) => (
          <Pressable key={slide.key} accessibilityLabel={`${dot + 1}. tanıtım`} onPress={() => listRef.current?.scrollToIndex({ index: dot })} hitSlop={6}>
            <View style={[styles.dot, { width: dot === index ? 22 : 8, backgroundColor: dot === index ? colors.primary : colors.borderStrong }]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title="Ücretsiz hesap oluştur" size="lg" fullWidth onPress={() => router.push('/kayit')} />
        <Button title="Giriş yap" size="lg" variant="secondary" fullWidth onPress={() => router.push('/giris')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl },
  slide: { paddingHorizontal: space.xl, paddingTop: space.xxl },
  hero: { borderRadius: radius.xl, borderWidth: 1, padding: space.xl, gap: space.md },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: space.lg },
  dot: { height: 8, borderRadius: 4 },
  actions: { paddingHorizontal: space.xl, gap: space.sm },
});
