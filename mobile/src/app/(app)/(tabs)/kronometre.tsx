import { useQuery } from '@tanstack/react-query';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { CheckCircle2, Coffee, Pause, Play, RotateCcw, SkipForward, SlidersHorizontal, TimerReset } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { formatDuration, todayStr } from '@shared/utils/date';
import { TabHeader } from '@/components/TabHeader';
import { Button, Card, Chip, Notice, ProgressRing, Screen, Select, Sheet, SwitchRow, Text, TextField, useToast } from '@/components/ui';
import { courseKey, fetchCourses } from '@/features/study/queries';
import { fetchResourceOptions, resourceName } from '@/features/study/resources';
import { PRESETS } from '@/features/timer/store';
import { useFocusTimer } from '@/features/timer/useFocusTimer';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, typography } from '@/theme/tokens';

const REALTIME_TABLES = ['calisma_suresi'];
const KEEP_AWAKE_TAG = 'kronometre';

export default function TimerScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { profile, reload } = useAccount();
  const userId = profile?.id;
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState({ work: '25', breakMinutes: '5' });
  const [keepAwake, setKeepAwake] = useState(true);

  const courses = useQuery({ queryKey: courseKey(profile), queryFn: () => fetchCourses(profile), enabled: !!profile });
  const resources = useQuery({ queryKey: ['resource-options', userId], queryFn: () => fetchResourceOptions(userId), enabled: !!userId });
  const sessions = useQuery({
    queryKey: ['today-sessions', userId, todayStr()],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('calisma_suresi').select('*, dersler(ad)').eq('user_id', userId!).eq('tarih', todayStr()).order('created_at', { ascending: false });
      if (error) throw new Error('Kronometre verilerin yüklenemedi.');
      return (data || []) as { id: string; sure_dakika: number; dersler?: { ad?: string } | null }[];
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: sessions.refetch });

  const timer = useFocusTimer(profile, {
    onRecorded: () => { sessions.refetch(); reload(); toast.success('Odak oturumu istatistiklerine kaydedildi'); },
    onError: toast.error,
  });
  const { state, preset, timeLeft, totalSeconds, elapsed } = timer;

  useEffect(() => {
    if (state.running && keepAwake) activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    else deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => { deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined); };
  }, [keepAwake, state.running]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = state.running ? withRepeat(withTiming(1.03, { duration: 1200 }), -1, true) : withTiming(1);
  }, [pulse, state.running]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  const accent = state.breakMode ? colors.warning : colors.primary;
  const completedMinutes = (sessions.data || []).reduce((sum, item) => sum + (item.sure_dakika || 0), 0);
  const started = timeLeft < totalSeconds;

  return (
    <Screen edges="top" onRefresh={sessions.refetch}>
      <TabHeader title="Kronometre" subtitle="Çalışma ve mola süreni takip et. Tamamlanan oturumlar istatistiklerine kaydedilir." />

      <View style={styles.presets}>
        {PRESETS.map((item, index) => (
          <Chip key={item.label} label={item.label} active={!state.customActive && state.presetIndex === index} onPress={() => timer.applyPreset(index)} />
        ))}
        <Chip label={state.customActive ? `${state.custom.work} / ${state.custom.breakMinutes}` : 'Özel'} icon={SlidersHorizontal} active={state.customActive}
          onPress={() => { setCustomDraft({ work: String(state.custom.work), breakMinutes: String(state.custom.breakMinutes) }); setCustomOpen(true); }} />
      </View>

      <Animated.View style={[styles.ringWrap, pulseStyle]} accessibilityLiveRegion="polite" accessibilityLabel={`${state.breakMode ? 'Mola' : 'Çalışma'}: ${minutes} dakika ${seconds} saniye kaldı`}>
        <ProgressRing value={(elapsed / Math.max(1, totalSeconds)) * 100} size={272} stroke={14} color={accent} track={state.breakMode ? colors.warningSoft : colors.primarySoft}>
          <View style={[styles.modePill, { backgroundColor: state.breakMode ? colors.warningSoft : colors.primarySoft }]}>
            {state.breakMode ? <Coffee size={14} color={accent} /> : <TimerReset size={14} color={accent} />}
            <Text variant="captionStrong" color={accent}>{state.breakMode ? 'Mola' : 'Çalışma'}</Text>
          </View>
          <Text style={[typography.mono, { color: colors.text, fontVariant: ['tabular-nums'] }]}>{minutes}:{seconds}</Text>
          <Text variant="caption" color="textMuted">{state.breakMode ? `${preset.breakMinutes} dk mola` : `${preset.work} dk çalış`}</Text>
        </ProgressRing>
      </Animated.View>

      <View style={styles.controls}>
        <Button icon={RotateCcw} variant="secondary" size="lg" onPress={timer.reset} accessibilityLabel="Sıfırla" style={styles.round} />
        <Button title={state.running ? 'Duraklat' : started ? 'Devam et' : 'Başla'} icon={state.running ? Pause : Play} size="lg" onPress={timer.toggle} style={{ flex: 1, backgroundColor: state.running ? colors.text : accent }} />
        {state.breakMode ? <Button icon={SkipForward} variant="secondary" size="lg" onPress={timer.skipBreak} accessibilityLabel="Molayı atla" style={styles.round} /> : null}
      </View>
      {state.running ? <Notice tone="success">Kilit ekranından süreni takip edebilirsin; süre dolduğunda bildirim alırsın. Dikkat dağıtan bildirimleri kapatmanı öneririz.</Notice> : null}

      <Card style={{ gap: space.md, marginTop: space.lg }}>
        <Select label="Konu / ders" value={state.courseId} onChange={timer.setCourse} placeholder="Ders seç (isteğe bağlı)"
          options={[{ value: '', label: 'Ders seçilmesin' }, ...(courses.data || []).map((course) => ({ value: course.id, label: course.ad, description: course.sinav_turu }))]} />
        <Select label="Kaynak" value={state.resourceId} onChange={timer.setResource} placeholder="Kaynak seç (isteğe bağlı)"
          options={[{ value: '', label: 'Kaynak seçilmesin' }, ...(resources.data || []).map((resource) => ({ value: resource.id, label: resourceName(resource) || 'Kaynak' }))]} />
        <SwitchRow title="Ekranı açık tut" description="Kronometre çalışırken ekran kararmaz." value={keepAwake} onChange={setKeepAwake} />
      </Card>

      <Card style={[styles.today, { marginTop: space.md }]}>
        <View style={[styles.todayIcon, { backgroundColor: colors.primarySoft }]}><CheckCircle2 size={20} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text variant="subheading">Bugünkü oturumlar</Text>
          <Text variant="caption" color="textMuted">Tamamlanan oturumlar istatistiklerine kaydedilir.</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="heading">{(sessions.data || []).length}</Text>
          <Text variant="caption" color="textMuted">{formatDuration(completedMinutes)}</Text>
        </View>
      </Card>

      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} title="Özel süre"
        footer={<Button title="Özel süreyi uygula" style={{ flex: 1 }} onPress={() => { timer.applyCustom(Number(customDraft.work), Number(customDraft.breakMinutes)); setCustomOpen(false); }} />}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><TextField label="Çalışma (dk)" hint="1–180" keyboardType="number-pad" value={customDraft.work} onChangeText={(work) => setCustomDraft({ ...customDraft, work: work.replace(/\D/g, '') })} /></View>
          <View style={{ flex: 1 }}><TextField label="Mola (dk)" hint="1–60" keyboardType="number-pad" value={customDraft.breakMinutes} onChangeText={(breakMinutes) => setCustomDraft({ ...customDraft, breakMinutes: breakMinutes.replace(/\D/g, '') })} /></View>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  ringWrap: { alignItems: 'center', marginVertical: space.xxl },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, marginBottom: space.xs },
  controls: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  round: { width: 54, paddingHorizontal: 0 },
  today: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  todayIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
