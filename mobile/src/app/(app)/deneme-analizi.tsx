import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { AlertCircle, BarChart2, BookOpen, Plus, Trash2, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { getExamTabs } from '@shared/constants/alanlar';
import { formatDate, formatShortDate, todayStr } from '@shared/utils/date';
import { AreaChart } from '@/components/charts';
import { Badge, Button, Card, DateField, EmptyState, ErrorState, IconButton, Screen, Segmented, Sheet, SkeletonCards, Text, TextField, useToast } from '@/components/ui';
import type { Ders } from '@/features/study/queries';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

type ExamDetail = { id: string; dogru: number; yanlis: number; bos: number; net: number; dersler?: { ad?: string; renk?: string; ikon?: string } | null };
type Exam = { id: string; yayin: string; tarih: string; sure_dakika?: number | null; deneme_detaylari?: ExamDetail[] };
type CourseWithCount = Ders & { question_count?: number | null };
const REALTIME_TABLES = ['denemeler'];

export default function ExamAnalysisScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { profile } = useAccount();
  const userId = profile?.id;
  const examTabs = getExamTabs(profile?.alan_secimi || 'sayisal');
  const [activeTab, setActiveTab] = useState(examTabs[0]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ yayin: string; tarih: string; sure_dakika: string; detaylar: Record<string, { dogru: string; yanlis: string }> }>({ yayin: '', tarih: todayStr(), sure_dakika: '', detaylar: {} });

  const query = useQuery({
    queryKey: ['exams', userId, activeTab, profile?.yks_year, profile?.alan_secimi],
    enabled: !!profile,
    queryFn: async () => {
      const [exams, courses] = await Promise.all([
        supabase.from('denemeler').select('*, deneme_detaylari(*, dersler(ad, renk, ikon))').eq('user_id', userId!).eq('sinav_turu', activeTab).order('tarih', { ascending: false }),
        supabase.from('dersler').select('*').eq('sinav_turu', activeTab).eq('curriculum_year', Number(profile!.yks_year || 2027)).contains('alan', [profile!.alan_secimi]).order('sira'),
      ]);
      if (exams.error || courses.error) throw new Error('Deneme verileri yüklenemedi. Lütfen tekrar dene.');
      return { exams: (exams.data || []) as Exam[], courses: (courses.data || []) as CourseWithCount[] };
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: query.refetch });

  const exams = query.data?.exams || [];
  const courses = query.data?.courses || [];
  const totalNet = (exam: Exam) => (exam.deneme_detaylari || []).reduce((sum, item) => sum + (item.net || 0), 0);
  const series = [...exams].reverse().map((exam) => ({ label: formatShortDate(exam.tarih), value: Number(totalNet(exam).toFixed(2)) }));
  const best = exams.length ? Math.max(...exams.map(totalNet)) : 0;
  const average = exams.length ? exams.reduce((sum, exam) => sum + totalNet(exam), 0) / exams.length : 0;

  const openAdd = () => {
    setForm({ yayin: '', tarih: todayStr(), sure_dakika: '', detaylar: Object.fromEntries(courses.map((course) => [course.id, { dogru: '', yanlis: '' }])) });
    setOpen(true);
  };

  const setDetail = (courseId: string, field: 'dogru' | 'yanlis', value: string) => setForm((current) => ({
    ...current, detaylar: { ...current.detaylar, [courseId]: { ...current.detaylar[courseId], [field]: value.replace(/\D/g, '') } },
  }));

  const save = async () => {
    if (form.yayin.trim().length < 2) return toast.error('Yayın adını girmelisin.');
    const duration = form.sure_dakika === '' ? null : Number(form.sure_dakika);
    if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 600)) return toast.error('Deneme süresi 1 ile 600 dakika arasında olmalıdır.');
    const entered = Object.entries(form.detaylar).filter(([, detail]) => detail.dogru !== '' || detail.yanlis !== '');
    if (!entered.length) return toast.error('Analiz için en az bir ders sonucu girmelisin.');
    const invalid = entered.some(([courseId, detail]) => {
      const course = courses.find((item) => item.id === courseId);
      const total = Number(detail.dogru || 0) + Number(detail.yanlis || 0);
      return !Number(course?.question_count || 0) || total > Number(course?.question_count);
    });
    if (invalid) return toast.error('Doğru ve yanlış toplamı dersin soru sayısını aşmamalıdır.');
    setSaving(true);
    const { error } = await supabase.rpc('create_exam_with_details', {
      p_exam_type: activeTab, p_publisher: form.yayin.trim(), p_exam_date: form.tarih, p_duration_minutes: duration,
      p_details: entered.map(([ders_id, value]) => ({ ders_id, dogru: Number(value.dogru || 0), yanlis: Number(value.yanlis || 0) })),
    });
    setSaving(false);
    if (error) return toast.error(error.message || 'Deneme kaydedilemedi. Bilgileri kontrol edip tekrar dene.');
    setOpen(false);
    toast.success('Deneme kaydedildi');
    query.refetch();
  };

  const remove = (exam: Exam) => Alert.alert('Denemeyi sil', 'Bu deneme ve tüm ders sonuçları silinsin mi?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('denemeler').delete().eq('id', exam.id).eq('user_id', userId!);
      if (error) toast.error(`Deneme silinemedi: ${error.message}`);
      query.refetch();
    } },
  ]);

  return (
    <Screen onRefresh={query.refetch}>
      <Stack.Screen options={{ headerRight: () => <IconButton icon={Plus} label="Deneme ekle" tone="primary" onPress={openAdd} /> }} />
      <Text variant="body" color="textMuted">Denemelerini ders ayrıntılarıyla kaydet; net gelişimini gerçek sonuçlarla izle.</Text>
      <View style={{ marginTop: space.lg }}><Segmented options={examTabs.map((tab) => ({ value: tab, label: tab }))} value={activeTab} onChange={setActiveTab} /></View>

      {query.isLoading ? <View style={{ marginTop: space.lg }}><SkeletonCards /></View> : query.isError ? <View style={{ marginTop: space.lg }}><ErrorState message={(query.error as Error).message} onRetry={query.refetch} /></View> : exams.length === 0 ? (
        <Card style={{ marginTop: space.lg }}><EmptyState icon={BarChart2} title="Henüz deneme eklenmemiş" description="Deneme sonuçlarını ekleyerek gelişimini analiz et." action="Deneme ekle" onAction={openAdd} /></Card>
      ) : (
        <View style={{ gap: space.md, marginTop: space.lg }}>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Card style={styles.kpi}><Text variant="caption" color="textMuted">Deneme</Text><Text variant="number">{exams.length}</Text></Card>
            <Card style={styles.kpi}><Text variant="caption" color="textMuted">Ortalama</Text><Text variant="number">{average.toFixed(1)}</Text></Card>
            <Card style={styles.kpi}><Text variant="caption" color="textMuted">En iyi</Text><Text variant="number" color="primary">{best.toFixed(1)}</Text></Card>
          </View>
          {series.length > 1 ? (
            <Card style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}><TrendingUp size={18} color={colors.primary} /><Text variant="heading">Net Gelişimi</Text></View>
              <AreaChart data={series} height={220} suffix=" net" />
            </Card>
          ) : null}
          {exams.map((exam) => (
            <Card key={exam.id} style={{ gap: space.md }}>
              <View style={styles.examHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><BookOpen size={16} color={colors.text} /><Text variant="subheading" numberOfLines={1} style={{ flex: 1 }}>{exam.yayin}</Text></View>
                  <Text variant="caption" color="textMuted">{formatDate(exam.tarih)}{exam.sure_dakika ? ` · ${exam.sure_dakika} dk` : ''}</Text>
                </View>
                <View style={[styles.total, { backgroundColor: colors.primarySoft }]}>
                  <Text variant="caption" color="primaryPressed">Toplam Net</Text>
                  <Text variant="title" color="primary">{totalNet(exam).toFixed(2)}</Text>
                </View>
              </View>
              {(exam.deneme_detaylari || []).map((detail) => (
                <View key={detail.id} style={[styles.detail, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                  <Text variant="captionStrong" color={detail.dersler?.renk || colors.text} numberOfLines={1} style={{ flex: 1 }}>{detail.dersler?.ikon} {detail.dersler?.ad}</Text>
                  <Text variant="captionStrong" color="primary">D {detail.dogru}</Text>
                  <Text variant="captionStrong" color="danger">Y {detail.yanlis}</Text>
                  <Text variant="captionStrong" color="textMuted">B {detail.bos}</Text>
                  <Badge label={`Net ${Number(detail.net || 0).toFixed(2)}`} />
                </View>
              ))}
              <Button title="Sil" icon={Trash2} variant="ghost" size="sm" onPress={() => remove(exam)} style={{ alignSelf: 'flex-end' }} />
            </Card>
          ))}
        </View>
      )}

      <Sheet open={open} onClose={() => !saving && setOpen(false)} title={`Yeni ${activeTab} Denemesi`}
        footer={<Button title={saving ? 'Kaydediliyor…' : 'Kaydet'} loading={saving} onPress={save} style={{ flex: 1 }} />}>
        <TextField label="Yayın adı" value={form.yayin} onChangeText={(yayin) => setForm({ ...form, yayin })} placeholder="ör. 3D Türkiye Geneli" maxLength={120} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1.4 }}><DateField label="Tarih" value={form.tarih} onChange={(tarih) => setForm({ ...form, tarih })} maximumDate={new Date()} /></View>
          <View style={{ flex: 1 }}><TextField label="Süre (dk)" value={form.sure_dakika} onChangeText={(sure_dakika) => setForm({ ...form, sure_dakika: sure_dakika.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="165" /></View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><AlertCircle size={15} color={colors.textMuted} /><Text variant="captionStrong" color="textMuted">Ders bazlı sonuçlar · Boş ve net otomatik hesaplanır</Text></View>
        {courses.map((course) => {
          const detail = form.detaylar[course.id] || { dogru: '', yanlis: '' };
          const blank = course.question_count ? Math.max(0, Number(course.question_count) - Number(detail.dogru || 0) - Number(detail.yanlis || 0)) : null;
          const net = (Number(detail.dogru || 0) - Number(detail.yanlis || 0) / 4).toFixed(2);
          return (
            <View key={course.id} style={[styles.inputRow, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text variant="captionStrong" color={course.renk || colors.text} numberOfLines={1}>{course.ikon} {course.ad}</Text>
                <Text variant="caption" color="textSubtle">{course.question_count ? `${course.question_count} soru · Boş ${blank} · Net ${net}` : 'Soru sayısı tanımlı değil'}</Text>
              </View>
              {(['dogru', 'yanlis'] as const).map((field) => (
                <TextInput key={field} accessibilityLabel={`${course.ad} ${field === 'dogru' ? 'doğru' : 'yanlış'}`} value={detail[field]} onChangeText={(value) => setDetail(course.id, field, value)}
                  keyboardType="number-pad" placeholder={field === 'dogru' ? 'D' : 'Y'} placeholderTextColor={colors.textSubtle} editable={!!course.question_count}
                  style={[styles.mini, { borderColor: field === 'dogru' ? colors.primaryBorder : colors.border, color: colors.text, backgroundColor: colors.surface }]} />
              ))}
            </View>
          );
        })}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpi: { flex: 1, alignItems: 'center', paddingVertical: space.md },
  examHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  total: { alignItems: 'flex-end', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.sm },
  detail: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.sm, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.sm, borderWidth: 1 },
  mini: { width: 52, height: 44, borderWidth: 1.5, borderRadius: radius.xs, textAlign: 'center', fontFamily: fonts.bold, fontSize: 16 },
});
