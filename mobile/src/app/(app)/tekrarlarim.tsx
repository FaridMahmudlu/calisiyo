import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { BookOpen, Calendar, Check, Clock, Plus, Repeat } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { getExamTabs } from '@shared/constants/alanlar';
import { formatDate, parseLocalDate, todayStr } from '@shared/utils/date';
import { Badge, Button, Card, DateField, EmptyState, ErrorState, IconButton, Screen, Segmented, Select, Sheet, SkeletonCards, Text, TextField, useToast } from '@/components/ui';
import { scheduleLocalReminder } from '@/features/notifications/local';
import type { Ders } from '@/features/study/queries';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type RepeatItem = { id: string; konu: string; kaynak?: string | null; tekrar_tarihi: string; tekrar_saati?: string | null; tamamlandi: boolean; otomatik?: boolean; dersler?: { ad?: string; renk?: string; ikon?: string } | null };
type Filter = 'bugun' | 'yaklasan' | 'gecen';
const REALTIME_TABLES = ['tekrarlar'];
const EMPTY = { ders_id: '', konu: '', kaynak: '', tekrar_tarihi: todayStr(), tekrar_saati: '' };

export default function RepeatsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAccount();
  const userId = profile?.id;
  const examTabs = getExamTabs(profile?.alan_secimi || 'sayisal');
  const [activeTab, setActiveTab] = useState(examTabs[0]);
  const [filter, setFilter] = useState<Filter>('bugun');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const key = ['repeats', userId, activeTab, filter];

  const query = useQuery({
    queryKey: key,
    enabled: !!profile,
    queryFn: async () => {
      const today = todayStr();
      let request = supabase.from('tekrarlar').select('*, dersler(ad, renk, ikon)').eq('user_id', userId!).eq('sinav_turu', activeTab);
      request = filter === 'bugun' ? request.eq('tekrar_tarihi', today)
        : filter === 'yaklasan' ? request.gt('tekrar_tarihi', today).order('tekrar_tarihi')
          : request.lt('tekrar_tarihi', today).order('tekrar_tarihi', { ascending: false });
      const [repeats, courses] = await Promise.all([
        request,
        supabase.from('dersler').select('*').eq('sinav_turu', activeTab).eq('curriculum_year', Number(profile!.yks_year || 2027)).contains('alan', [profile!.alan_secimi]).order('sira'),
      ]);
      if (repeats.error || courses.error) throw new Error('Tekrarların yüklenemedi. Lütfen tekrar dene.');
      return { repeats: (repeats.data || []) as RepeatItem[], courses: (courses.data || []) as Ders[] };
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: query.refetch });

  const add = async () => {
    if (!form.ders_id) return toast.error('Tekrar eklemek için bir ders seçmelisin.');
    if (!form.konu.trim()) return toast.error('Tekrar edilecek konuyu yazmalısın.');
    setSaving(true);
    const { data, error } = await supabase.from('tekrarlar').insert({
      user_id: userId, ders_id: form.ders_id, sinav_turu: activeTab, konu: form.konu.trim(),
      kaynak: form.kaynak.trim() || null, tekrar_tarihi: form.tekrar_tarihi, tekrar_saati: form.tekrar_saati || null,
    }).select('id').single();
    setSaving(false);
    if (error) return toast.error(`Tekrar eklenemedi: ${error.message}`);
    if (form.tekrar_saati && profile?.notifications_enabled !== false && profile?.study_preferences?.repeats !== false) {
      const date = parseLocalDate(form.tekrar_tarihi);
      const [h, m] = form.tekrar_saati.split(':').map(Number);
      date.setHours(h, m, 0, 0);
      scheduleLocalReminder({ id: `repeat-${data.id}`, title: 'Tekrar zamanı', body: form.konu.trim(), date, route: '/tekrarlarim' }).catch(() => undefined);
    }
    setOpen(false);
    setForm(EMPTY);
    toast.success('Tekrar eklendi');
    query.refetch();
  };

  const toggle = async (item: RepeatItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    queryClient.setQueryData(key, (current: typeof query.data) => current ? { ...current, repeats: current.repeats.map((row) => row.id === item.id ? { ...row, tamamlandi: !item.tamamlandi } : row) } : current);
    const { error } = await supabase.from('tekrarlar').update({ tamamlandi: !item.tamamlandi }).eq('id', item.id).eq('user_id', userId!);
    if (error) { toast.error(`Tekrar güncellenemedi: ${error.message}`); query.refetch(); }
  };

  const repeats = query.data?.repeats || [];

  return (
    <Screen onRefresh={query.refetch}>
      <Stack.Screen options={{ headerRight: () => <IconButton icon={Plus} label="Yeni tekrar" tone="primary" onPress={() => setOpen(true)} /> }} />
      <Text variant="body" color="textMuted">Pekiştirmek istediğin konular için tekrar tarihini planla ve tamamladıkça işaretle.</Text>
      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Segmented options={examTabs.map((tab) => ({ value: tab, label: tab }))} value={activeTab} onChange={setActiveTab} />
        <Segmented options={[{ value: 'bugun', label: 'Bugün' }, { value: 'yaklasan', label: 'Yaklaşanlar' }, { value: 'gecen', label: 'Geçmiş' }]} value={filter} onChange={setFilter} />
      </View>

      <View style={{ gap: space.sm, marginTop: space.lg }}>
        {query.isLoading ? <SkeletonCards /> : query.isError ? <ErrorState message={(query.error as Error).message} onRetry={query.refetch} /> : repeats.length === 0 ? (
          <Card><EmptyState icon={Repeat} title="Tekrar bulunamadı" description="Öğrendiklerini pekiştirmek için düzenli konu tekrarları oluştur." action="Yeni tekrar ekle" onAction={() => setOpen(true)} /></Card>
        ) : repeats.map((item) => {
          const tint = item.dersler?.renk || colors.primary;
          return (
            <View key={item.id} style={[styles.card, { backgroundColor: item.tamamlandi ? colors.surfaceMuted : colors.surface, borderColor: colors.border, borderLeftColor: tint, opacity: item.tamamlandi ? 0.7 : 1 }]}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.tamamlandi }} accessibilityLabel={item.tamamlandi ? 'Geri al' : 'Tamamla'} onPress={() => toggle(item)} hitSlop={8}
                style={[styles.check, { borderColor: item.tamamlandi ? colors.primary : colors.borderStrong, backgroundColor: item.tamamlandi ? colors.primary : 'transparent' }]}>
                {item.tamamlandi ? <Check size={15} color="#FFFFFF" strokeWidth={3} /> : null}
              </Pressable>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  <Text variant="captionStrong" color={tint}>{item.dersler?.ikon} {item.dersler?.ad}</Text>
                  {item.otomatik ? <Badge label="Otomatik" /> : null}
                  {item.kaynak ? <Badge label={item.kaynak} tone="muted" /> : null}
                </View>
                <Text variant="subheading" style={item.tamamlandi ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}>{item.konu}</Text>
                <View style={{ flexDirection: 'row', gap: space.md }}>
                  <View style={styles.meta}><Calendar size={13} color={colors.textSubtle} /><Text variant="caption" color="textMuted">{formatDate(item.tekrar_tarihi)}</Text></View>
                  {item.tekrar_saati ? <View style={styles.meta}><Clock size={13} color={colors.textSubtle} /><Text variant="caption" color="textMuted">{item.tekrar_saati.slice(0, 5)}</Text></View> : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <Sheet open={open} onClose={() => !saving && setOpen(false)} title="Yeni Tekrar Ekle" footer={<Button title="Ekle" loading={saving} onPress={add} style={{ flex: 1 }} />}>
        <Select label="Ders" value={form.ders_id} onChange={(ders_id) => setForm({ ...form, ders_id })} placeholder="Ders seç" options={(query.data?.courses || []).map((course) => ({ value: course.id, label: course.ad }))} />
        <TextField label="Konu" value={form.konu} onChangeText={(konu) => setForm({ ...form, konu })} placeholder="ör. Limit ve Süreklilik" />
        <TextField label="Kaynak (isteğe bağlı)" icon={BookOpen} value={form.kaynak} onChangeText={(kaynak) => setForm({ ...form, kaynak })} placeholder="ör. Apotemi Fasikülü" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1.4 }}><DateField label="Tekrar tarihi" value={form.tekrar_tarihi} onChange={(tekrar_tarihi) => setForm({ ...form, tekrar_tarihi })} /></View>
          <View style={{ flex: 1 }}><DateField mode="time" label="Saat" placeholder="İsteğe bağlı" value={form.tekrar_saati} onChange={(tekrar_saati) => setForm({ ...form, tekrar_saati })} /></View>
        </View>
        {form.tekrar_saati ? <Text variant="caption" color="textMuted">Bildirim izni verdiysen bu saatte telefonuna hatırlatma gelir.</Text> : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, borderLeftWidth: 4 },
  check: { width: 32, height: 32, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
