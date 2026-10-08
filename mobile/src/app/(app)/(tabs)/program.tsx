import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarClearance } from '@/components/navigation/FloatingTabBar';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ListChecks, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { formatDate, formatDuration, formatTime, parseLocalDate, toLocalDateKey, todayStr } from '@shared/utils/date';
import { TabHeader } from '@/components/TabHeader';
import { Button, Card, DateField, EmptyState, ErrorState, IconButton, ProgressBar, Screen, Select, Sheet, SkeletonCards, Text, TextField, useToast } from '@/components/ui';
import { courseKey, fetchCourses } from '@/features/study/queries';
import { fetchResourceOptions, resourceName } from '@/features/study/resources';
import { TaskRow, taskDuration, type Task } from '@/features/study/TaskRow';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const EMPTY_FORM = { baslangic_saat: '08:00', bitis_saat: '08:40', ders_id: '', kaynak_id: '', konu: '', soru_sayisi: '', sayfa_araligi: '' };
const REALTIME_TABLES = ['gunluk_gorevler', 'kaynaklarim'];

export default function DailyProgramScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAccount();
  const userId = profile?.id;
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const courses = useQuery({ queryKey: courseKey(profile), queryFn: () => fetchCourses(profile), enabled: !!profile });
  const resources = useQuery({ queryKey: ['resource-options', userId], queryFn: () => fetchResourceOptions(userId), enabled: !!userId });
  const tasksKey = ['daily-tasks', userId, selectedDate];
  const tasks = useQuery({
    queryKey: tasksKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('gunluk_gorevler').select('*, dersler(ad, renk, ikon, sinav_turu)').eq('user_id', userId!).eq('tarih', selectedDate).order('baslangic_saat');
      if (error) throw new Error('Programın yüklenemedi. Lütfen tekrar dene.');
      return (data || []) as Task[];
    },
  });
  const refetch = tasks.refetch;
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: () => { refetch(); resources.refetch(); } });

  const list = tasks.data || [];
  const completedCount = list.filter((task) => task.tamamlandi).length;
  const totalMinutes = list.reduce((sum, task) => sum + taskDuration(task), 0);
  const progress = list.length ? Math.round((completedCount / list.length) * 100) : 0;

  const weekDates = useMemo(() => {
    const selected = parseLocalDate(selectedDate);
    const monday = new Date(selected);
    monday.setDate(selected.getDate() - (selected.getDay() === 0 ? 6 : selected.getDay() - 1));
    return Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date; });
  }, [selectedDate]);

  const shiftDay = (offset: number) => {
    const date = parseLocalDate(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(toLocalDateKey(date));
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setSheetOpen(true); };
  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      baslangic_saat: formatTime(task.baslangic_saat || '') || '08:00', bitis_saat: formatTime(task.bitis_saat || '') || '08:40',
      ders_id: task.ders_id || '', kaynak_id: task.kaynak_id || '', konu: task.konu || '',
      soru_sayisi: task.soru_sayisi?.toString() || '', sayfa_araligi: task.sayfa_araligi || '',
    });
    setSheetOpen(true);
  };

  const saveTask = async () => {
    if (!form.ders_id) return toast.error('Görev eklemek için bir ders seçmelisin.');
    if (form.bitis_saat <= form.baslangic_saat) return toast.error('Bitiş saati başlangıç saatinden sonra olmalıdır.');
    const questionCount = form.soru_sayisi === '' ? null : Number(form.soru_sayisi);
    if (questionCount !== null && (!Number.isInteger(questionCount) || questionCount < 0)) return toast.error('Soru sayısı sıfır veya pozitif bir tam sayı olmalıdır.');
    const overlaps = list.some((task) => task.id !== editing?.id
      && form.baslangic_saat < formatTime(task.bitis_saat || '')
      && formatTime(task.baslangic_saat || '') < form.bitis_saat);
    if (overlaps) return toast.error('Bu saat aralığında başka bir görevin var. Saatleri çakışmayacak şekilde düzenle.');
    setSaving(true);
    const payload = {
      user_id: userId, tarih: selectedDate, baslangic_saat: form.baslangic_saat, bitis_saat: form.bitis_saat,
      ders_id: form.ders_id || null, kaynak_id: form.kaynak_id || null, konu: form.konu.trim() || null,
      soru_sayisi: questionCount, sayfa_araligi: form.sayfa_araligi.trim() || null,
    };
    const { error } = editing
      ? await supabase.from('gunluk_gorevler').update(payload).eq('id', editing.id).eq('user_id', userId!)
      : await supabase.from('gunluk_gorevler').insert(payload);
    setSaving(false);
    if (error) return toast.error(`Görev kaydedilemedi: ${error.message}`);
    setSheetOpen(false);
    toast.success(editing ? 'Görev güncellendi' : 'Görev eklendi');
    refetch();
  };

  const toggleTask = async (task: Task) => {
    queryClient.setQueryData<Task[]>(tasksKey, (current = []) => current.map((item) => item.id === task.id ? { ...item, tamamlandi: !task.tamamlandi } : item));
    const { error } = await supabase.from('gunluk_gorevler').update({ tamamlandi: !task.tamamlandi }).eq('id', task.id).eq('user_id', userId!);
    if (error) {
      queryClient.setQueryData<Task[]>(tasksKey, (current = []) => current.map((item) => item.id === task.id ? { ...item, tamamlandi: task.tamamlandi } : item));
      toast.error(`Görev güncellenemedi: ${error.message}`);
    }
  };

  const deleteTask = (task: Task) => Alert.alert('Görevi sil', 'Bu görevi silmek istediğine emin misin?', [
    { text: 'Vazgeç', style: 'cancel' },
    {
      text: 'Sil', style: 'destructive', onPress: async () => {
        setSheetOpen(false);
        queryClient.setQueryData<Task[]>(tasksKey, (current = []) => current.filter((item) => item.id !== task.id));
        const { error } = await supabase.from('gunluk_gorevler').delete().eq('id', task.id).eq('user_id', userId!);
        if (error) { toast.error(`Görev silinemedi: ${error.message}`); refetch(); }
      },
    },
  ]);

  const resourceById = Object.fromEntries((resources.data || []).map((resource) => [resource.id, resource]));

  return (
    <Screen edges="top" onRefresh={refetch} contentStyle={{ paddingBottom: tabBarClearance(insets.bottom) + 90 }} footer={(
      <View style={[styles.fabWrap, { bottom: tabBarClearance(insets.bottom) + 6 }]} pointerEvents="box-none">
        <Button title="Görev ekle" icon={Plus} size="lg" onPress={openCreate} style={styles.fab} />
      </View>
    )}>
      <TabHeader title="Günlük Program" subtitle="Günün çalışma akışını planla, tamamladıkça ilerlemeni anında gör." />

      <View style={styles.dateRow}>
        <IconButton icon={ChevronLeft} label="Önceki gün" onPress={() => shiftDay(-1)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Bugüne dön" onPress={() => setSelectedDate(todayStr())} style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="subheading">{formatDate(selectedDate)}</Text>
          <Text variant="caption" color={selectedDate === todayStr() ? 'primary' : 'textMuted'}>{selectedDate === todayStr() ? 'Bugün' : 'Bugüne dön'}</Text>
        </Pressable>
        <IconButton icon={ChevronRight} label="Sonraki gün" onPress={() => shiftDay(1)} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.week}>
        {weekDates.map((date) => {
          const key = toLocalDateKey(date);
          const active = key === selectedDate;
          return (
            <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSelectedDate(key)}
              style={[styles.day, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}>
              <Text variant="caption" color={active ? '#FFFFFF' : 'textMuted'}>{date.toLocaleDateString('tr-TR', { weekday: 'short' })}</Text>
              <Text variant="heading" color={active ? '#FFFFFF' : 'text'}>{date.getDate()}</Text>
              {key === todayStr() && !active ? <View style={[styles.todayDot, { backgroundColor: colors.primary }]} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={{ gap: space.md, marginTop: space.md }}>
        <View style={styles.summary}>
          <Summary icon={CheckCircle2} label="İlerleme" value={`%${progress}`} />
          <Summary icon={Clock3} label="Planlanan" value={formatDuration(totalMinutes)} />
          <Summary icon={ListChecks} label="Tamamlanan" value={`${completedCount} / ${list.length}`} />
        </View>
        <ProgressBar value={progress} />
      </Card>

      <Button title="Haftalık görünüm" icon={CalendarDays} variant="ghost" size="sm" onPress={() => router.push('/haftalik-program')} style={{ alignSelf: 'flex-end', marginTop: space.sm }} />

      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {tasks.isLoading ? <SkeletonCards /> : tasks.isError ? <ErrorState message={(tasks.error as Error).message} onRetry={refetch} /> : list.length === 0 ? (
          <Card><EmptyState icon={CalendarDays} title="Henüz görev eklenmedi" description="Bu gün için ilk çalışma görevini ekleyebilirsin." action="Görev ekle" onAction={openCreate} /></Card>
        ) : list.map((task) => (
          <TaskRow key={task.id} task={task} resourceName={resourceName(resourceById[task.kaynak_id || ''])} onToggle={() => toggleTask(task)} onPress={() => openEdit(task)} />
        ))}
      </View>

      <Sheet
        open={sheetOpen}
        onClose={() => !saving && setSheetOpen(false)}
        title={editing ? 'Görevi düzenle' : 'Yeni görev'}
        subtitle={formatDate(selectedDate)}
        footer={(
          <>
            {editing ? <Button icon={Trash2} variant="danger" onPress={() => deleteTask(editing)} accessibilityLabel="Görevi sil" /> : null}
            <Button title={saving ? 'Kaydediliyor…' : editing ? 'Değişiklikleri kaydet' : 'Görevi ekle'} loading={saving} onPress={saveTask} style={{ flex: 1 }} />
          </>
        )}
      >
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><DateField mode="time" label="Başlangıç" value={form.baslangic_saat} onChange={(baslangic_saat) => setForm({ ...form, baslangic_saat })} /></View>
          <View style={{ flex: 1 }}><DateField mode="time" label="Bitiş" value={form.bitis_saat} onChange={(bitis_saat) => setForm({ ...form, bitis_saat })} /></View>
        </View>
        <Select label="Ders" value={form.ders_id} onChange={(ders_id) => setForm({ ...form, ders_id })} placeholder="Ders seç"
          options={(courses.data || []).map((course) => ({ value: course.id, label: `${course.ad}${course.sinav_turu ? ` (${course.sinav_turu})` : ''}` }))} />
        <TextField label="Konu" value={form.konu} onChangeText={(konu) => setForm({ ...form, konu })} placeholder="Örn. Bölme ve bölünebilme" />
        <Select label="Kaynak" value={form.kaynak_id} onChange={(kaynak_id) => setForm({ ...form, kaynak_id })} placeholder="Kaynak seç (isteğe bağlı)"
          options={[{ value: '', label: 'Kaynak seçilmesin' }, ...(resources.data || []).map((resource) => ({ value: resource.id, label: resourceName(resource) || 'Kaynak' }))]} />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><TextField label="Soru sayısı" value={form.soru_sayisi} onChangeText={(soru_sayisi) => setForm({ ...form, soru_sayisi: soru_sayisi.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="40" /></View>
          <View style={{ flex: 1 }}><TextField label="Sayfa aralığı" value={form.sayfa_araligi} onChangeText={(sayfa_araligi) => setForm({ ...form, sayfa_araligi })} placeholder="45–60" /></View>
        </View>
      </Sheet>
    </Screen>
  );
}

function Summary({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Icon size={18} color={colors.primary} />
      <Text variant="subheading">{value}</Text>
      <Text variant="caption" color="textMuted">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  week: { gap: space.sm, paddingVertical: space.md },
  day: { width: 52, height: 68, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  todayDot: { position: 'absolute', bottom: 6, width: 5, height: 5, borderRadius: 3 },
  summary: { flexDirection: 'row' },
  row2: { flexDirection: 'row', gap: space.md },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: { minWidth: 196, paddingHorizontal: 26, borderRadius: radius.full, shadowColor: '#00A870', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
});
