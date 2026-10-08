import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { BookOpen, Clock3, Edit3, Flag, ImagePlus, ListChecks, Target, Trash2, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getExamTabs } from '@shared/constants/alanlar';
import { getCurrentWeekDates, toLocalDateKey } from '@shared/utils/date';
import { Button, Card, ErrorState, IconButton, ProgressBar, Screen, Segmented, Sheet, SkeletonCards, Text, TextField, useToast } from '@/components/ui';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { api } from '@/lib/api';
import { createStudyImageUrls, pickImage, removeStudyImages, uploadStudyImage, type PickedImage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Goals = { nets: Record<string, number | string>; topics: Record<string, number | string>; weeklyQuestions: number | string; weeklyMinutes: number | string; university: string; program: string; goalImagePath: string };
const DEFAULT_GOALS: Goals = { nets: { TYT: 0, AYT: 0, YDT: 0 }, weeklyQuestions: 0, weeklyMinutes: 0, topics: { TYT: 0, AYT: 0, YDT: 0 }, university: '', program: '', goalImagePath: '' };
const REALTIME_TABLES = ['denemeler', 'gunluk_gorevler', 'calisma_suresi', 'pomodoro_kayitlari', 'konu_takibi'];

function normalizeGoals(value: Record<string, any> | null | undefined): Goals {
  const saved = { ...DEFAULT_GOALS, ...(value || {}) };
  return { ...saved, nets: { ...DEFAULT_GOALS.nets, ...(saved.nets || {}) }, topics: { ...DEFAULT_GOALS.topics, ...(saved.topics || {}) } };
}

function GoalRow({ icon: Icon, title, description, current, target, unit }: { icon: LucideIcon; title: string; description: string; current: number; target: number; unit: string }) {
  const { colors } = useTheme();
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><Icon size={19} color={colors.primary} /></View>
        <View style={{ flex: 1 }}><Text variant="subheading">{title}</Text><Text variant="caption" color="textMuted">{description}</Text></View>
        <Text variant="heading" color={percent >= 100 ? 'primary' : 'text'}>%{percent}</Text>
      </View>
      <ProgressBar value={percent} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" color="textMuted">Güncel: <Text variant="captionStrong">{current} {unit}</Text></Text>
        <Text variant="caption" color="textMuted">Hedef: <Text variant="captionStrong">{target ? `${target} ${unit}` : '—'}</Text></Text>
      </View>
    </Card>
  );
}

export default function GoalsScreen() {
  const toast = useToast();
  const { profile, setProfile } = useAccount();
  const userId = profile?.id;
  const examTabs = getExamTabs(profile?.alan_secimi || 'sayisal');
  const [activeExam, setActiveExam] = useState(examTabs[0]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const goals = normalizeGoals(profile?.study_goals);
  const [form, setForm] = useState<Goals>(goals);
  const [goalFile, setGoalFile] = useState<PickedImage | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const query = useQuery({
    queryKey: ['goals-actual', userId, activeExam],
    enabled: !!userId,
    queryFn: async () => {
      const week = getCurrentWeekDates();
      const start = toLocalDateKey(week[0]);
      const end = toLocalDateKey(week[6]);
      const [exams, time, topics] = await Promise.all([
        supabase.from('denemeler').select('sinav_turu, tarih, deneme_detaylari(net,dogru,yanlis)').eq('user_id', userId!),
        supabase.rpc('get_my_study_time_statistics', { p_start_date: start }),
        supabase.from('konu_takibi').select('durum, konular!inner(dersler!inner(sinav_turu))').eq('user_id', userId!).eq('durum', 'tamamlandi'),
      ]);
      if (exams.error || time.error || topics.error) throw new Error('Hedef verilerinin bir bölümü yüklenemedi. Lütfen tekrar dene.');
      const nets = (exams.data || []).filter((exam: any) => exam.sinav_turu === activeExam)
        .map((exam: any) => (exam.deneme_detaylari || []).reduce((sum: number, d: any) => sum + Number(d.net ?? ((d.dogru || 0) - (d.yanlis || 0) / 4)), 0));
      const weekRows = ((time.data as any)?.daily || []).filter((item: any) => item.date <= end);
      return {
        net: nets.length ? Number((nets.reduce((a: number, b: number) => a + b, 0) / nets.length).toFixed(1)) : 0,
        questions: weekRows.reduce((sum: number, item: any) => sum + Number(item.questions || 0), 0),
        minutes: weekRows.reduce((sum: number, item: any) => sum + Number(item.studyMinutes || 0), 0),
        topics: (topics.data || []).filter((row: any) => row.konular?.dersler?.sinav_turu === activeExam).length,
      };
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: query.refetch });
  const image = useQuery({ queryKey: ['goal-image', goals.goalImagePath], enabled: !!goals.goalImagePath, staleTime: 50 * 60_000, queryFn: async () => (await createStudyImageUrls([goals.goalImagePath]))[goals.goalImagePath] || '' });

  const openEditor = () => { setForm(goals); setGoalFile(null); setRemoveImage(false); setEditing(true); };

  const save = async () => {
    const numbers = [...Object.values(form.nets), ...Object.values(form.topics), form.weeklyQuestions, form.weeklyMinutes].map(Number);
    if (numbers.some((value) => !Number.isFinite(value) || value < 0)) return toast.error('Hedefler sıfır veya pozitif bir sayı olmalıdır.');
    if ([...Object.values(form.topics), form.weeklyQuestions, form.weeklyMinutes].some((value) => !Number.isInteger(Number(value)))) return toast.error('Konu, soru ve dakika hedefleri tam sayı olmalıdır.');
    setSaving(true);
    let uploaded = '';
    try { if (goalFile) uploaded = await uploadStudyImage(userId!, goalFile, 'goal-backgrounds'); }
    catch (error) { setSaving(false); return toast.error(`Hedef görseli yüklenemedi: ${(error as Error).message}`); }
    const normalized = {
      ...form,
      nets: Object.fromEntries(Object.entries(form.nets).map(([k, v]) => [k, Number(v) || 0])),
      topics: Object.fromEntries(Object.entries(form.topics).map(([k, v]) => [k, Number(v) || 0])),
      weeklyQuestions: Number(form.weeklyQuestions) || 0,
      weeklyMinutes: Number(form.weeklyMinutes) || 0,
      university: form.university.trim().slice(0, 120),
      program: form.program.trim().slice(0, 120),
      goalImagePath: removeImage ? '' : uploaded || form.goalImagePath || '',
    };
    try {
      const result = await api<{ goals: Goals; updatedAt: string }>('/api/account', { method: 'PATCH', body: { action: 'goals', goals: normalized } });
      if (goals.goalImagePath && goals.goalImagePath !== normalized.goalImagePath) await removeStudyImages([goals.goalImagePath]).catch(() => undefined);
      if (profile) setProfile({ ...profile, study_goals: result.goals || normalized, study_goals_updated_at: result.updatedAt });
      setEditing(false);
      toast.success('Hedeflerin kaydedildi');
    } catch (error) {
      if (uploaded) await removeStudyImages([uploaded]).catch(() => undefined);
      toast.error((error as Error).message);
    } finally { setSaving(false); }
  };

  const actual = query.data || { net: 0, questions: 0, minutes: 0, topics: 0 };
  const hasImage = !!image.data;

  return (
    <Screen onRefresh={query.refetch}>
      <Stack.Screen options={{ headerRight: () => <IconButton icon={Edit3} label="Hedefleri düzenle" tone="primary" onPress={openEditor} /> }} />
      <View style={[styles.vision, { borderColor: hasImage ? 'transparent' : '#CFE5DC' }]}>
        {hasImage ? (<><Image source={{ uri: image.data! }} style={StyleSheet.absoluteFill} contentFit="cover" /><LinearGradient colors={['rgba(5,24,19,0.9)', 'rgba(5,24,19,0.4)']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /></>)
          : <LinearGradient colors={['#EAF8F2', '#F7FBF9']} style={StyleSheet.absoluteFill} />}
        <Text variant="label" color={hasImage ? '#A8F1D3' : '#07875F'}>Yol haritan</Text>
        <Text variant="title" color={hasImage ? '#FFFFFF' : '#0D1830'}>{goals.program || 'Hedef bölümünü belirle'}</Text>
        <Text variant="caption" color={hasImage ? '#E5F2EE' : '#66738F'}>{goals.university || 'Üniversite hedefini eklediğinde burada her gün göreceksin.'}</Text>
        <Button title={goals.university || goals.program ? 'Hedefi güncelle' : 'Hedef ekle'} icon={Flag} size="sm" variant="secondary" onPress={openEditor} style={{ alignSelf: 'flex-start', marginTop: space.md }} />
      </View>

      <View style={{ marginTop: space.lg }}><Segmented options={examTabs.map((exam) => ({ value: exam, label: exam }))} value={activeExam} onChange={setActiveExam} /></View>
      {profile?.study_goals_updated_at ? <Text variant="caption" color="textSubtle" style={{ marginTop: space.sm }}>Son güncelleme: {new Date(String(profile.study_goals_updated_at)).toLocaleString('tr-TR')}</Text> : null}

      <View style={{ gap: space.md, marginTop: space.md }}>
        {query.isLoading ? <SkeletonCards count={4} /> : query.isError ? <ErrorState message={(query.error as Error).message} onRetry={query.refetch} /> : (
          <>
            <GoalRow icon={Target} title="Net Hedefi" description={`${activeExam} denemelerindeki ortalama netin.`} current={actual.net} target={Number(goals.nets[activeExam] || 0)} unit="net" />
            <GoalRow icon={ListChecks} title="Haftalık Soru Hedefi" description="Bu hafta tamamladığın görev ve çalışma kayıtları." current={actual.questions} target={Number(goals.weeklyQuestions || 0)} unit="soru" />
            <GoalRow icon={Clock3} title="Haftalık Çalışma Süresi" description="Kronometre, program ve çalışma kayıtlarından hesaplanır." current={actual.minutes} target={Number(goals.weeklyMinutes || 0)} unit="dk" />
            <GoalRow icon={BookOpen} title="Konu Tamamlama Hedefi" description={`${activeExam} için tamamladığın konu sayısı.`} current={actual.topics} target={Number(goals.topics[activeExam] || 0)} unit="konu" />
          </>
        )}
      </View>

      <Sheet open={editing} onClose={() => !saving && setEditing(false)} title="Hedefleri düzenle" subtitle="İlerlemen gerçek kayıtlarından otomatik güncellenir."
        footer={<Button title={saving ? 'Kaydediliyor…' : 'Kaydet'} loading={saving} onPress={save} style={{ flex: 1 }} />}>
        <Segmented options={examTabs.map((exam) => ({ value: exam, label: exam }))} value={activeExam} onChange={setActiveExam} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}><TextField label={`${activeExam} net hedefi`} keyboardType="decimal-pad" value={String(form.nets[activeExam] ?? '')} onChangeText={(value) => setForm({ ...form, nets: { ...form.nets, [activeExam]: value.replace(',', '.') } })} /></View>
          <View style={{ flex: 1 }}><TextField label={`${activeExam} konu hedefi`} keyboardType="number-pad" value={String(form.topics[activeExam] ?? '')} onChangeText={(value) => setForm({ ...form, topics: { ...form.topics, [activeExam]: value.replace(/\D/g, '') } })} /></View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}><TextField label="Haftalık soru" keyboardType="number-pad" value={String(form.weeklyQuestions)} onChangeText={(value) => setForm({ ...form, weeklyQuestions: value.replace(/\D/g, '') })} /></View>
          <View style={{ flex: 1 }}><TextField label="Haftalık süre (dk)" keyboardType="number-pad" value={String(form.weeklyMinutes)} onChangeText={(value) => setForm({ ...form, weeklyMinutes: value.replace(/\D/g, '') })} /></View>
        </View>
        <TextField label="Hedef üniversite" value={form.university} onChangeText={(university) => setForm({ ...form, university })} placeholder="İsteğe bağlı" maxLength={120} />
        <TextField label="Hedef bölüm" value={form.program} onChangeText={(program) => setForm({ ...form, program })} placeholder="İsteğe bağlı" maxLength={120} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          {goalFile ? <Image source={{ uri: goalFile.uri }} style={{ width: 72, height: 48, borderRadius: radius.xs }} contentFit="cover" /> : null}
          <Button title={goalFile || (form.goalImagePath && !removeImage) ? 'Görseli değiştir' : 'Üniversite görseli ekle'} icon={ImagePlus} variant="secondary" style={{ flex: 1 }}
            onPress={async () => { try { const picked = await pickImage({ aspect: [16, 9] }); if (picked) { setGoalFile(picked); setRemoveImage(false); } } catch (error) { toast.error((error as Error).message); } }} />
          {(form.goalImagePath || goalFile) && !removeImage ? <IconButton icon={Trash2} label="Görseli kaldır" tone="danger" onPress={() => { setGoalFile(null); setRemoveImage(true); }} /> : null}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  vision: { minHeight: 200, padding: space.xl, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', justifyContent: 'flex-end', gap: 4 },
  icon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: space.md },
});
