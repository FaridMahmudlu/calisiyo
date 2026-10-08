import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BookOpen, CalendarDays, CirclePlay, Clock3, Crown, ExternalLink, ImagePlus, ListVideo, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { getExamTabs, KITAP_TURLERI } from '@shared/constants/alanlar';
import { todayStr } from '@shared/utils/date';
import { PremiumInfo } from '@/components/PremiumInfo';
import { Badge, Button, Card, Chip, DateField, EmptyState, ErrorState, IconButton, Notice, Screen, Segmented, Select, Sheet, SkeletonCards, Text, TextField, useToast } from '@/components/ui';
import type { Ders } from '@/features/study/queries';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { api } from '@/lib/api';
import { createStudyImageUrls, pickImage, removeStudyImages, uploadStudyImage, type PickedImage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type CatalogItem = { id: string; ad: string; yayin: string; sinav_turu: string; kitap_turu: string; kapak_url?: string | null; dersler?: { ad?: string; renk?: string; ikon?: string } | null };
type MyResource = {
  id: string; resource_kind?: string | null; custom_ad?: string | null; custom_yayin?: string | null; custom_ders_id?: string | null; custom_sinav_turu?: string | null; custom_kitap_turu?: string | null;
  kapak_url?: string | null; source_url?: string | null; duration_minutes?: number | null; item_count?: number | null; source_metadata?: { examType?: string; thumbnailUrl?: string } | null; kaynaklar_sistem?: CatalogItem | null;
};
type YoutubePreview = { resource: { kind: string; title: string; channelTitle: string; thumbnailUrl?: string | null; itemCount: number; durationMinutes: number } };
const REALTIME_TABLES = ['kaynaklarim'];
const EMPTY_FORM = { ad: '', yayin: '', ders_id: '', sinav_turu: 'TYT', kitap_turu: 'soru_bankasi' };
const CADENCE = [{ value: 'daily', label: 'Her gün', description: 'İçerikleri ardışık günlere paylaştırır' }, { value: 'weekly', label: 'Haftada 3 gün', description: 'Pazartesi, çarşamba ve cumartesi planlar' }];

export default function ResourcesScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { profile } = useAccount();
  const userId = profile?.id;
  const examTabs = getExamTabs(profile?.alan_secimi || 'sayisal');
  const [activeExam, setActiveExam] = useState(examTabs[0]);
  const [bookType, setBookType] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [catalogId, setCatalogId] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM, sinav_turu: examTabs[0] });
  const [cover, setCover] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [ytPreview, setYtPreview] = useState<YoutubePreview | null>(null);
  const [ytBusy, setYtBusy] = useState<'' | 'analyze' | 'import'>('');
  const [ytError, setYtError] = useState('');
  const [ytRequestId, setYtRequestId] = useState('');
  const [ytPlan, setYtPlan] = useState({ courseId: '', startDate: todayStr(), cadence: 'daily', dailyMinutes: '45', startItem: '1', startOffsetMinutes: '0' });

  const query = useQuery({
    queryKey: ['resources', userId, profile?.yks_year, profile?.alan_secimi],
    enabled: !!profile,
    queryFn: async () => {
      const [resources, catalog, courses] = await Promise.all([
        supabase.from('kaynaklarim').select('*, kaynaklar_sistem(*, dersler:ders_id(ad,renk,ikon))').eq('user_id', userId!).order('created_at', { ascending: false }),
        supabase.from('kaynaklar_sistem').select('*, dersler:ders_id(ad,renk,ikon)').order('ad'),
        supabase.from('dersler').select('*').eq('curriculum_year', Number(profile!.yks_year || 2027)).contains('alan', [profile!.alan_secimi]).order('sira'),
      ]);
      if (resources.error || catalog.error || courses.error) throw new Error('Kaynakların yüklenemedi. Lütfen tekrar dene.');
      const rows = (resources.data || []) as MyResource[];
      const urls = await createStudyImageUrls(rows.map((row) => row.kapak_url).filter((path) => path && !path.startsWith('http')));
      return { resources: rows, catalog: (catalog.data || []) as CatalogItem[], courses: (courses.data || []) as Ders[], urls };
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: query.refetch });
  const courses = query.data?.courses || [];

  const infoFor = (resource: MyResource) => {
    if (resource.resource_kind?.startsWith('youtube_')) {
      return { name: resource.custom_ad, publisher: resource.custom_yayin || 'YouTube', exam: resource.source_metadata?.examType || 'TYT', type: 'video', course: courses.find((course) => course.id === resource.custom_ders_id), cover: resource.source_metadata?.thumbnailUrl, youtube: true };
    }
    if (resource.kaynaklar_sistem) {
      const item = resource.kaynaklar_sistem;
      return { name: item.ad, publisher: item.yayin, exam: item.sinav_turu, type: item.kitap_turu, course: item.dersler, cover: item.kapak_url || resource.kapak_url, youtube: false };
    }
    return { name: resource.custom_ad, publisher: resource.custom_yayin, exam: resource.custom_sinav_turu, type: resource.custom_kitap_turu, course: courses.find((course) => course.id === resource.custom_ders_id), cover: resource.kapak_url, youtube: false };
  };
  const coverUrl = (path?: string | null) => (path?.startsWith('http') ? path : path ? query.data?.urls[path] : undefined);
  const typeLabel = (value?: string | null) => value === 'video' ? 'Video planı' : KITAP_TURLERI.find((type) => type.value === value)?.label || value || 'Kitap';
  const visible = (query.data?.resources || []).filter((resource) => { const info = infoFor(resource); return info.exam === activeExam && (bookType === 'all' || info.type === bookType); });

  const addCatalog = async () => {
    if (!catalogId) return;
    setSaving(true);
    const { error } = await supabase.from('kaynaklarim').insert({ user_id: userId, kaynak_sistem_id: catalogId });
    setSaving(false);
    if (error) return toast.error(`Kaynak eklenemedi: ${error.message}`);
    setCatalogId(''); setAddOpen(false); toast.success('Kaynak kitaplığına eklendi'); query.refetch();
  };

  const addCustom = async () => {
    if (!form.ad.trim() || !form.yayin.trim()) return toast.error('Kitap adı ve yayın bilgisi gerekli.');
    setSaving(true);
    let coverPath: string | null = null;
    try {
      coverPath = cover ? await uploadStudyImage(userId!, cover, 'resource-covers') : null;
      const { error } = await supabase.from('kaynaklarim').insert({
        user_id: userId, custom_ad: form.ad.trim(), custom_yayin: form.yayin.trim(), custom_ders_id: form.ders_id || null,
        custom_sinav_turu: form.sinav_turu, custom_kitap_turu: form.kitap_turu, kapak_url: coverPath,
      });
      if (error) throw error;
      setForm({ ...EMPTY_FORM, sinav_turu: activeExam }); setCover(null); setAddOpen(false); toast.success('Kaynak eklendi'); query.refetch();
    } catch (error) {
      if (coverPath) await removeStudyImages([coverPath]).catch(() => undefined);
      toast.error(`Kaynak eklenemedi: ${(error as Error).message}`);
    } finally { setSaving(false); }
  };

  const openYoutube = () => {
    setYtUrl(''); setYtPreview(null); setYtError(''); setYtRequestId(Crypto.randomUUID());
    setYtPlan((current) => ({ ...current, courseId: '', startDate: todayStr() }));
    setYtOpen(true);
  };

  const analyze = async () => {
    if (!ytUrl.trim()) return;
    setYtBusy('analyze'); setYtError('');
    try {
      const payload = await api<YoutubePreview & { ok: true }>('/api/youtube/plan', { method: 'POST', body: { action: 'analyze', url: ytUrl.trim() } });
      setYtPreview(payload);
      setYtPlan((current) => ({ ...current, startItem: '1', startOffsetMinutes: '0' }));
    } catch (error) { setYtPreview(null); setYtError((error as Error).message || 'YouTube içeriği okunamadı.'); }
    finally { setYtBusy(''); }
  };

  const importPlan = async () => {
    setYtBusy('import'); setYtError('');
    try {
      const payload = await api<{ result: { reused: boolean; tasksCreated: number } }>('/api/youtube/plan', {
        method: 'POST',
        body: { action: 'import', requestId: ytRequestId, url: ytUrl.trim(), ...ytPlan, examType: activeExam, dailyMinutes: Number(ytPlan.dailyMinutes) },
      });
      toast.success(payload.result.reused ? `Bu plan daha önce kaydedilmişti; ${payload.result.tasksCreated} görev bulundu.` : `${payload.result.tasksCreated} video günlük görevlerine eklendi.`);
      setYtOpen(false); query.refetch();
    } catch (error) { setYtError((error as Error).message || 'Plan kaydedilemedi. Aynı işlemi güvenle tekrar deneyebilirsin.'); }
    finally { setYtBusy(''); }
  };

  const remove = (resource: MyResource) => {
    const youtube = resource.resource_kind?.startsWith('youtube_');
    Alert.alert('Kaynağı kaldır', youtube
      ? 'Bu YouTube kaynağı ve henüz tamamlanmamış video görevleri kaldırılacak. Tamamlanan çalışma geçmişin korunur.'
      : 'Bu kaynağı kitaplığından kaldırmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('remove_learning_resource', { p_resource_id: resource.id });
        if (error) return toast.error(`Kaynak kaldırılamadı: ${error.message}`);
        if (resource.kapak_url && !resource.kapak_url.startsWith('http')) await removeStudyImages([resource.kapak_url]).catch(() => undefined);
        query.refetch();
      } },
    ]);
  };

  const sessions = ytPreview ? Math.max(1, Math.ceil(ytPreview.resource.durationMinutes / Math.max(15, Number(ytPlan.dailyMinutes) || 15))) : 0;

  return (
    <Screen onRefresh={query.refetch}>
      <Stack.Screen options={{ headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon={CirclePlay} label="YouTube’dan planla" tone="danger" onPress={openYoutube} />
          <IconButton icon={Plus} label="Kaynak ekle" tone="primary" onPress={() => { setForm({ ...EMPTY_FORM, sinav_turu: activeExam }); setAddOpen(true); }} />
        </View>
      ) }} />
      <Text variant="body" color="textMuted">Kullandığın kitap ve denemeleri yönet; YouTube videolarını günlük görevlere dönüştür.</Text>
      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Segmented options={examTabs.map((exam) => ({ value: exam, label: exam }))} value={activeExam} onChange={setActiveExam} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Chip label="Tümü" active={bookType === 'all'} onPress={() => setBookType('all')} />
          {[...KITAP_TURLERI, { value: 'video', label: 'Video' }].map((type) => <Chip key={type.value} label={type.label} active={bookType === type.value} onPress={() => setBookType(type.value)} />)}
        </View>
      </View>
      <Card tone="muted" onPress={openYoutube} style={[styles.ytBanner, { marginTop: space.md }]}>
        <CirclePlay size={22} color="#E62117" />
        <View style={{ flex: 1 }}><Text variant="subheading">YouTube’dan çalışma planı</Text><Text variant="caption" color="textMuted">Video veya oynatma listesini günlere böl.</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Paket limitleri" onPress={() => setPremiumOpen(true)} hitSlop={8}><Crown size={18} color={colors.gold} /></Pressable>
      </Card>

      <View style={{ gap: space.sm, marginTop: space.md }}>
        {query.isLoading ? <SkeletonCards /> : query.isError ? <ErrorState message={(query.error as Error).message} onRetry={query.refetch} /> : visible.length === 0 ? (
          <Card><EmptyState icon={BookOpen} title={`${activeExam} için kaynak yok`} description="Sistem kataloğundan seçebilir veya kendi kaynağını ekleyebilirsin." action="Kaynak ekle" onAction={() => setAddOpen(true)} /></Card>
        ) : visible.map((resource) => {
          const info = infoFor(resource);
          const url = coverUrl(info.cover);
          return (
            <Card key={resource.id} style={styles.book}>
              <View style={[styles.cover, { borderColor: info.course?.renk || colors.primary, backgroundColor: colors.surfaceMuted, width: info.youtube ? 96 : 64 }]}>
                {url ? <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <><BookOpen size={22} color={colors.textSubtle} /><Text variant="caption" color="textSubtle">{info.exam}</Text></>}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="subheading" numberOfLines={2}>{info.name}</Text>
                <Text variant="caption" color="textMuted" numberOfLines={1}>{info.publisher}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {info.course?.ad ? <Badge label={info.course.ad} tone="muted" /> : null}
                  <Badge label={typeLabel(info.type)} tone="info" />
                  {info.youtube ? <Badge label={`${resource.item_count} video · ${resource.duration_minutes} dk`} tone="danger" /> : null}
                </View>
                {info.youtube && resource.source_url ? (
                  <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(resource.source_url!)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <ExternalLink size={13} color={colors.primary} /><Text variant="captionStrong" color="primary">YouTube’da aç</Text>
                  </Pressable>
                ) : null}
              </View>
              <IconButton icon={Trash2} label="Kaynağı kaldır" tone="danger" onPress={() => remove(resource)} />
            </Card>
          );
        })}
      </View>

      <Sheet open={addOpen} onClose={() => !saving && setAddOpen(false)} title="Kaynak ekle"
        footer={<Button title={saving ? 'Ekleniyor…' : customMode ? 'Kaynağı ekle' : 'Kitaplığıma ekle'} loading={saving} disabled={!customMode && !catalogId} onPress={customMode ? addCustom : addCatalog} style={{ flex: 1 }} />}>
        <Segmented options={[{ value: 'catalog', label: 'Sistem kataloğu' }, { value: 'custom', label: 'Özel kaynak' }]} value={customMode ? 'custom' : 'catalog'} onChange={(value) => setCustomMode(value === 'custom')} />
        {!customMode ? (
          <Select label="Kaynak" value={catalogId} onChange={setCatalogId} placeholder="Katalogdan seç"
            options={(query.data?.catalog || []).filter((item) => examTabs.includes(item.sinav_turu)).map((item) => ({ value: item.id, label: item.ad, description: `${item.sinav_turu} · ${item.yayin}` }))} />
        ) : (
          <>
            <TextField label="Kitap adı" value={form.ad} onChangeText={(ad) => setForm({ ...form, ad })} />
            <TextField label="Yayın" value={form.yayin} onChangeText={(yayin) => setForm({ ...form, yayin })} />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}><Select label="Sınav" value={form.sinav_turu} onChange={(sinav_turu) => setForm({ ...form, sinav_turu, ders_id: '' })} options={examTabs.map((exam) => ({ value: exam, label: exam }))} /></View>
              <View style={{ flex: 1.4 }}><Select label="Ders" value={form.ders_id} onChange={(ders_id) => setForm({ ...form, ders_id })} placeholder="Ders seç" options={courses.filter((course) => course.sinav_turu === form.sinav_turu).map((course) => ({ value: course.id, label: course.ad }))} /></View>
            </View>
            <Select label="Kitap türü" value={form.kitap_turu} onChange={(kitap_turu) => setForm({ ...form, kitap_turu })} options={KITAP_TURLERI.map((type) => ({ value: type.value, label: type.label }))} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              {cover ? <Image source={{ uri: cover.uri }} style={{ width: 54, height: 76, borderRadius: radius.xs }} contentFit="cover" /> : null}
              <Button title={cover ? 'Kapağı değiştir' : 'Kapak görseli ekle'} icon={ImagePlus} variant="secondary" style={{ flex: 1 }}
                onPress={async () => { try { const image = await pickImage({ aspect: [2, 3] }); if (image) setCover(image); } catch (error) { toast.error((error as Error).message); } }} />
            </View>
          </>
        )}
      </Sheet>

      <Sheet open={ytOpen} onClose={() => !ytBusy && setYtOpen(false)} title="YouTube öğrenme planı" subtitle="Video veya oynatma listesini gerçek günlük görevlerine dönüştür."
        footer={ytPreview ? <Button title={ytBusy === 'import' ? 'Plan oluşturuluyor…' : 'Planı oluştur ve görevlerime ekle'} icon={Sparkles} loading={ytBusy === 'import'} disabled={!!ytBusy || !ytPlan.startDate} onPress={importPlan} style={{ flex: 1 }} /> : undefined}>
        <TextField label="YouTube bağlantısı" icon={CirclePlay} value={ytUrl} onChangeText={(value) => { setYtUrl(value); setYtPreview(null); setYtRequestId(Crypto.randomUUID()); }}
          placeholder="https://www.youtube.com/watch?v=..." autoCapitalize="none" keyboardType="url" returnKeyType="go" onSubmitEditing={analyze} />
        {!ytPreview ? <Button title={ytBusy === 'analyze' ? 'Analiz ediliyor…' : 'İçeriği analiz et'} loading={ytBusy === 'analyze'} disabled={!ytUrl.trim()} onPress={analyze} /> : null}
        {ytError ? <ErrorState message={ytError} /> : null}
        {ytBusy === 'analyze' ? <ActivityIndicator color={colors.primary} /> : null}
        {ytPreview ? (
          <>
            <Card tone="muted" style={{ gap: space.sm }}>
              {ytPreview.resource.thumbnailUrl ? <Image source={{ uri: ytPreview.resource.thumbnailUrl }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.sm }} contentFit="cover" /> : null}
              <Text variant="label" color="textMuted">{ytPreview.resource.kind === 'youtube_playlist' ? 'Oynatma listesi' : 'Video'}</Text>
              <Text variant="subheading">{ytPreview.resource.title}</Text>
              <Text variant="caption" color="textMuted">{ytPreview.resource.channelTitle}</Text>
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <View style={styles.inline}><ListVideo size={14} color={colors.textMuted} /><Text variant="caption" color="textMuted">{ytPreview.resource.itemCount} video</Text></View>
                <View style={styles.inline}><Clock3 size={14} color={colors.textMuted} /><Text variant="caption" color="textMuted">{ytPreview.resource.durationMinutes} dakika</Text></View>
              </View>
            </Card>
            <Notice tone="success" icon={Sparkles}>Akıllı dağıtım: video sırası korunur; süre hedefini aşınca sonraki çalışma gününe geçer.</Notice>
            <Select label="Ders" value={ytPlan.courseId} onChange={(courseId) => setYtPlan({ ...ytPlan, courseId })} placeholder="Ders seç (isteğe bağlı)" options={courses.filter((course) => course.sinav_turu === activeExam).map((course) => ({ value: course.id, label: course.ad }))} />
            <DateField label="Başlangıç tarihi" value={ytPlan.startDate} minimumDate={new Date()} onChange={(startDate) => setYtPlan({ ...ytPlan, startDate })} />
            <Select label="Çalışma ritmi" value={ytPlan.cadence} onChange={(cadence) => setYtPlan({ ...ytPlan, cadence })} options={CADENCE} />
            <TextField label="Günlük video süresi (dk)" hint="15–360 dakika" value={ytPlan.dailyMinutes} onChangeText={(dailyMinutes) => setYtPlan({ ...ytPlan, dailyMinutes: dailyMinutes.replace(/\D/g, '') })} keyboardType="number-pad" />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}><TextField label="Devam edilecek video" hint={`1–${ytPreview.resource.itemCount}`} value={ytPlan.startItem} onChangeText={(startItem) => setYtPlan({ ...ytPlan, startItem: startItem.replace(/\D/g, '') })} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><TextField label="Videodaki dakika" hint="Baştan için 0" value={ytPlan.startOffsetMinutes} onChangeText={(startOffsetMinutes) => setYtPlan({ ...ytPlan, startOffsetMinutes: startOffsetMinutes.replace(/\D/g, '') })} keyboardType="number-pad" /></View>
            </View>
            <View style={styles.inline}><CalendarDays size={16} color={colors.primary} /><Text variant="captionStrong">Yaklaşık {sessions} çalışma oturumu</Text></View>
          </>
        ) : null}
      </Sheet>

      <PremiumInfo open={premiumOpen} onClose={() => setPremiumOpen(false)} feature="YouTube çalışma planı limitleri"
        description="calisiyo ücretsiz planında ayda 2 YouTube içeriğini görevlere dönüştürebilirsin. Plus bu aylık limiti genişletir."
        benefits={['Plus ile ayda 30 YouTube planı', 'Kaldığın video ve dakikadan devam et', 'Video ve oynatma listelerini günlük görevlere böl']} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ytBanner: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  book: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cover: { height: 88, borderRadius: radius.xs, borderLeftWidth: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
