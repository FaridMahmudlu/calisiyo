import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check, Flame, Lock, TrendingUp } from 'lucide-react-native';
import { useRef, useState, type JSX } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { BrandLogo } from '@/components/brand/BrandMark';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts, radius, space, subjectColor } from '@/theme/tokens';

type Slide = { key: string; kicker: string; title: string; body: string; Art: () => JSX.Element };

function PlanArt() {
  const { colors } = useTheme();
  const tasks = [
    { time: '09:00', subject: 'Matematik', topic: 'Fonksiyonlar', done: true },
    { time: '10:30', subject: 'Türkçe', topic: 'Paragraf · 40 soru', done: true },
    { time: '14:00', subject: 'Fizik', topic: 'Hareket ve kuvvet', done: false },
  ];
  return (
    <View style={[styles.art, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View style={styles.artHeader}>
        <Text variant="captionStrong" color="textMuted">Bugünkü plan</Text>
        <Text variant="captionStrong" color="primary">2/3</Text>
      </View>
      {tasks.map((task) => (
        <View key={task.time} style={[styles.task, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.subjectBar, { backgroundColor: subjectColor(task.subject) }]} />
          <View style={{ flex: 1 }}>
            <Text variant="captionStrong">{task.subject}</Text>
            <Text variant="caption" color="textMuted">{task.time} · {task.topic}</Text>
          </View>
          <View style={[styles.check, task.done ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.borderStrong }]}>
            {task.done ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function FocusArt() {
  const { colors } = useTheme();
  const size = 168;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={[styles.art, styles.center, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.primarySoft} strokeWidth={stroke} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={brand.amber} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${c * 0.72} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={{ fontFamily: fonts.monoBold, fontSize: 34, color: colors.text }}>17:42</Text>
          <Text variant="caption" color="textMuted">Matematik · odak</Text>
        </View>
      </View>
      <View style={[styles.pill, { backgroundColor: colors.inverseSurface }]}>
        <Lock size={13} color={colors.inverseText} />
        <Text variant="captionStrong" color={colors.inverseText}>Kilit ekranında canlı</Text>
      </View>
    </View>
  );
}

function ProgressArt() {
  const { colors } = useTheme();
  const bars = [32, 54, 40, 76, 62, 90, 70];
  return (
    <View style={[styles.art, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View style={styles.artHeader}>
        <View style={[styles.badge, { backgroundColor: colors.streakSoft }]}>
          <Flame size={14} color={colors.streak} />
          <Text variant="captionStrong" color="streak">12 gün seri</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
          <TrendingUp size={14} color={colors.primary} />
          <Text variant="captionStrong" color="primary">TYT net +8,5</Text>
        </View>
      </View>
      <View style={styles.chart}>
        {bars.map((value, index) => (
          <View key={index} style={styles.barSlot}>
            <View style={[styles.bar, { height: `${value}%`, backgroundColor: index === bars.length - 2 ? colors.primary : colors.primaryBorder }]} />
          </View>
        ))}
      </View>
      <View style={styles.artHeader}>
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => <Text key={day} variant="label" color="textSubtle" style={styles.barLabel}>{day}</Text>)}
      </View>
    </View>
  );
}

const SLIDES: Slide[] = [
  { key: 'plan', kicker: 'Planla', title: 'Planını kur, adım adım ilerle.', body: 'Alanına göre günlük ve haftalık programını dakikalar içinde oluştur.', Art: PlanArt },
  { key: 'focus', kicker: 'Odaklan', title: 'Odaklan, süren kendiliğinden kaydedilsin.', body: 'Kronometre kilit ekranında canlı çalışır; biten her oturum istatistiklerine eklenir.', Art: FocusArt },
  { key: 'progress', kicker: 'Gelişimini gör', title: 'Gelişimini gör, motivasyonunu koru.', body: 'Deneme netlerin, serin ve seviyen gerçek çalışmalarınla büyür. Arkadaşlarınla birlikte çalış.', Art: ProgressArt },
];

function SlideView({ slide, index, width, scrollX }: { slide: Slide; index: number; width: number; scrollX: SharedValue<number> }) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const artStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(scrollX.value, range, [width * 0.35, 0, -width * 0.35], Extrapolation.CLAMP) },
      { scale: interpolate(scrollX.value, range, [0.92, 1, 0.92], Extrapolation.CLAMP) },
    ],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollX.value, range, [16, 0, 16], Extrapolation.CLAMP) }],
  }));
  const { Art } = slide;
  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={artStyle}><Art /></Animated.View>
      <Animated.View style={[{ marginTop: space.xxxl }, textStyle]}>
        <Text variant="label" color="primary">{slide.kicker}</Text>
        <Text variant="display" style={{ marginTop: space.sm }}>{slide.title}</Text>
        <Text variant="body" color="textMuted" style={{ marginTop: space.md }}>{slide.body}</Text>
      </Animated.View>
    </View>
  );
}

function Dot({ index, width, scrollX }: { index: number; width: number; scrollX: SharedValue<number> }) {
  const { colors } = useTheme();
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, range, [8, 24, 8], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, range, [0.35, 1, 0.35], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, style]} />;
}

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const onScroll = useAnimatedScrollHandler((event) => { scrollX.set(event.contentOffset.x); });
  const last = index === SLIDES.length - 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }]}>
      <LinearGradient colors={[colors.primarySoft, colors.background]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.55 }} />
      <View style={styles.header}>
        <BrandLogo size={30} />
        {!last ? (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => listRef.current?.scrollToIndex({ index: SLIDES.length - 1 })}>
            <Text variant="captionStrong" color="textMuted">Atla</Text>
          </Pressable>
        ) : null}
      </View>

      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: slideIndex }) => <SlideView slide={item} index={slideIndex} width={width} scrollX={scrollX} />}
      />

      <View style={styles.dots} accessibilityLabel={`${index + 1}. tanıtım / ${SLIDES.length}`}>
        {SLIDES.map((slide, dot) => <Dot key={slide.key} index={dot} width={width} scrollX={scrollX} />)}
      </View>

      <View style={styles.actions}>
        {last ? (
          <Button title="Ücretsiz başla" size="lg" fullWidth onPress={() => router.push('/kayit')} />
        ) : (
          <Button title="Devam" size="lg" fullWidth onPress={() => listRef.current?.scrollToIndex({ index: index + 1 })} />
        )}
        <View style={styles.loginRow}>
          <Text variant="body" color="textMuted">Zaten hesabın var mı?</Text>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/giris')}><Text variant="bodyStrong" color="primary">Giriş yap</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, minHeight: 40 },
  slide: { paddingHorizontal: space.xl, paddingTop: space.xxl },
  art: {
    borderRadius: radius.xl, borderWidth: 1, padding: space.lg, gap: space.sm, minHeight: 250,
    shadowOpacity: 0.08, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 4,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  artHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.sm },
  subjectBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, marginTop: space.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 8, marginTop: space.md },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 8 },
  barLabel: { flex: 1, textAlign: 'center', letterSpacing: 0 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: space.lg },
  dot: { height: 8, borderRadius: 4 },
  actions: { paddingHorizontal: space.xl, gap: space.md },
  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
