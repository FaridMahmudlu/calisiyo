import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { Camera, FileImage, ImagePlus, Images, ListPlus, Plus, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getExamTabs } from '@shared/constants/alanlar';
import { formatDate } from '@shared/utils/date';
import { ImageViewer } from '@/components/ImageViewer';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, Screen, Segmented, Select, Sheet, SkeletonCards, Text, TextField, useToast } from '@/components/ui';
import type { Ders } from '@/features/study/queries';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { createStudyImageUrls, pickImage, pickImages, removeStudyImages, uploadStudyImage, type PickedImage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type QuestionImage = { id: string; storage_path: string; sort_order: number; legacy?: boolean };
type Question = { id: string; ders_id?: string | null; konu?: string | null; kaynak?: string | null; sayfa?: number | null; soru_no?: string | null; foto_url?: string | null; cozuldu: boolean; created_at: string; dersler?: { ad?: string; renk?: string; ikon?: string } | null; yapamadiklari_gorseller?: QuestionImage[] };
const EMPTY = { ders_id: '', konu: '', kaynak: '', sayfa: '', soru_no: '' };
const MAX_IMAGES = 6;
const REALTIME_TABLES = ['yapamadiklari', 'yapamadiklari_gorseller'];

function questionImages(question: Question): QuestionImage[] {
  const related = [...(question.yapamadiklari_gorseller || [])].sort((a, b) => a.sort_order - b.sort_order);
  if (related.length) return related;
  return question.foto_url ? [{ id: `legacy-${question.id}`, storage_path: question.foto_url, sort_order: 0, legacy: true }] : [];
}

export default function WrongQuestionsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAccount();
  const userId = profile?.id;
  const examTabs = getExamTabs(profile?.alan_secimi || 'sayisal');
  const [activeExam, setActiveExam] = useState(examTabs[0]);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [bulkForm, setBulkForm] = useState({ ders_id: '', konu: '', kaynak: '' });
  const [files, setFiles] = useState<PickedImage[]>([]);
  const [bulkFiles, setBulkFiles] = useState<PickedImage[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [viewer, setViewer] = useState<{ urls: string[]; index: number } | null>(null);
  const key = ['wrong-questions', userId, activeExam];

  const query = useQuery({
    queryKey: key,
    enabled: !!profile,
    queryFn: async () => {
      const [questions, courses] = await Promise.all([
        supabase.from('yapamadiklari').select('*, dersler(ad, renk, ikon), yapamadiklari_gorseller(id,storage_path,sort_order)').eq('user_id', userId!).eq('sinav_turu', activeExam).order('created_at', { ascending: false }),
        supabase.from('dersler').select('*').eq('sinav_turu', activeExam).eq('curriculum_year', Number(profile!.yks_year || 2027)).contains('alan', [profile!.alan_secimi]).order('sira'),
      ]);
      if (questions.error || courses.error) throw new Error('Soru kayıtların yüklenemedi. Lütfen tekrar dene.');
      const rows = (questions.data || []) as Question[];
      const urls = await createStudyImageUrls(rows.flatMap((row) => questionImages(row).map((image) => image.storage_path)));
      return { questions: rows, courses: (courses.data || []) as Ders[], urls };
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: query.refetch });
  const urls = query.data?.urls || {};
  const courses = query.data?.courses || [];

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFiles([]); setRemoved(new Set()); setOpen(true); };
  const openEdit = (question: Question) => {
    setEditing(question);
    setForm({ ders_id: question.ders_id || '', konu: question.konu || '', kaynak: question.kaynak || '', sayfa: question.sayfa?.toString() || '', soru_no: question.soru_no || '' });
    setFiles([]);
    setRemoved(new Set());
    setOpen(true);
  };

  const existing = editing ? questionImages(editing).filter((image) => !removed.has(image.id)) : [];
  const addImage = async (camera: boolean) => {
    try {
      if (existing.length + files.length >= MAX_IMAGES) return toast.error(`Bir soruya en fazla ${MAX_IMAGES} görsel ekleyebilirsin.`);
      if (camera) { const image = await pickImage({ camera: true }); if (image) setFiles((current) => [...current, image]); }
      else { const images = await pickImages(MAX_IMAGES - existing.length - files.length); setFiles((current) => [...current, ...images]); }
    } catch (error) { toast.error((error as Error).message); }
  };

  const save = async () => {
    if (!form.ders_id) return toast.error('Soru kaydı için bir ders seçmelisin.');
    if (existing.length + files.length > MAX_IMAGES) return toast.error(`Bir soruya en fazla ${MAX_IMAGES} görsel ekleyebilirsin.`);
    setSaving(true);
    const uploaded: string[] = [];
    try {
      for (const file of files) uploaded.push(await uploadStudyImage(userId!, file, 'wrong-questions'));
      const { error } = await supabase.rpc('save_wrong_question_with_images', {
        p_question_id: editing?.id || null, p_exam_type: activeExam, p_course_id: form.ders_id, p_topic: form.konu.trim(),
        p_source: form.kaynak.trim(), p_page: form.sayfa ? Number(form.sayfa) : null, p_question_number: form.soru_no.trim(),
        p_image_paths: [...existing.map((image) => image.storage_path), ...uploaded],
      });
      if (error) throw error;
      if (editing) await removeStudyImages(questionImages(editing).filter((image) => removed.has(image.id)).map((image) => image.storage_path)).catch(() => undefined);
      setOpen(false);
      toast.success(editing ? 'Soru güncellendi' : 'Soru eklendi');
      query.refetch();
    } catch {
      await removeStudyImages(uploaded).catch(() => undefined);
      toast.error('Soru kaydedilemedi. Bilgileri kontrol edip tekrar dene.');
    } finally { setSaving(false); }
  };

  const saveBulk = async () => {
    if (!bulkForm.ders_id) return toast.error('Toplu soru kaydı için bir ders seçmelisin.');
    if (!bulkFiles.length) return toast.error('En az bir soru görseli seçmelisin.');
    setSaving(true);
    const uploaded: string[] = [];
    try {
      for (const file of bulkFiles) uploaded.push(await uploadStudyImage(userId!, file, 'wrong-questions'));
      const { error } = await supabase.rpc('create_wrong_questions_from_images', {
        p_exam_type: activeExam, p_course_id: bulkForm.ders_id, p_topic: bulkForm.konu.trim(), p_source: bulkForm.kaynak.trim(), p_image_paths: uploaded,
      });
      if (error) throw error;
      setBulkOpen(false);
      toast.success(`${uploaded.length} soru eklendi`);
      query.refetch();
    } catch {
      await removeStudyImages(uploaded).catch(() => undefined);
      toast.error('Sorular toplu eklenemedi. Bilgileri kontrol edip tekrar dene.');
    } finally { setSaving(false); }
  };

  const toggleSolved = async (question: Question) => {
    queryClient.setQueryData(key, (current: typeof query.data) => current ? { ...current, questions: current.questions.map((item) => item.id === question.id ? { ...item, cozuldu: !question.cozuldu } : item) } : current);
    const { error } = await supabase.from('yapamadiklari').update({ cozuldu: !question.cozuldu }).eq('id', question.id).eq('user_id', userId!);
    if (error) { toast.error('Soru durumu güncellenemedi.'); query.refetch(); }
  };

  const remove = (question: Question) => Alert.alert('Soruyu sil', 'Bu soru kaydını silmek istediğine emin misin?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => {
      setOpen(false);
      const { error } = await supabase.from('yapamadiklari').delete().eq('id', question.id).eq('user_id', userId!);
      if (error) return toast.error('Soru silinemedi. Lütfen tekrar dene.');
      await removeStudyImages(questionImages(question).map((image) => image.storage_path)).catch(() => undefined);
      query.refetch();
    } },
  ]);

  const questions = query.data?.questions || [];
  const solved = questions.filter((item) => item.cozuldu).length;

  return (
    <Screen onRefresh={query.refetch}>
      <Stack.Screen options={{ headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon={ListPlus} label="Toplu ekle" onPress={() => { setBulkForm({ ders_id: courses[0]?.id || '', konu: '', kaynak: '' }); setBulkFiles([]); setBulkOpen(true); }} />
          <IconButton icon={Plus} label="Soru ekle" tone="primary" onPress={openCreate} />
        </View>
      ) }} />
      <Text variant="body" color="textMuted">Zorlandığın soruları görseli ve kaynak bilgisiyle kaydet; çözdükçe işaretle.</Text>
      <View style={{ marginTop: space.lg }}><Segmented options={examTabs.map((exam) => ({ value: exam, label: exam }))} value={activeExam} onChange={setActiveExam} /></View>
      {questions.length ? <Text variant="captionStrong" color="textMuted" style={{ marginTop: space.md }}>{questions.length} soru · {solved} çözüldü</Text> : null}

      <View style={{ gap: space.sm, marginTop: space.md }}>
        {query.isLoading ? <SkeletonCards /> : query.isError ? <ErrorState message={(query.error as Error).message} onRetry={query.refetch} /> : questions.length === 0 ? (
          <Card><EmptyState icon={FileImage} title={`${activeExam} için soru kaydın yok`} description="İlk yapamadığın soruyu fotoğrafını çekerek ekleyebilirsin." action="Soru ekle" onAction={openCreate} /></Card>
        ) : questions.map((question) => {
          const images = questionImages(question);
          const thumb = urls[images[0]?.storage_path];
          return (
            <Pressable key={question.id} onPress={() => openEdit(question)} style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border, opacity: question.cozuldu ? 0.7 : 1 }]}>
              <Pressable accessibilityRole="imagebutton" accessibilityLabel="Soru görsellerini büyüt" disabled={!thumb} onPress={() => setViewer({ urls: images.map((image) => urls[image.storage_path]).filter(Boolean), index: 0 })}
                style={[styles.thumb, { backgroundColor: colors.surfaceSunken }]}>
                {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <FileImage size={22} color={colors.textSubtle} />}
                {images.length > 1 ? <View style={styles.count}><Images size={10} color="#FFFFFF" /><Text variant="caption" color="#FFFFFF" style={{ fontSize: 10 }}>{images.length}</Text></View> : null}
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="captionStrong" color={question.dersler?.renk || colors.primary}>{question.dersler?.ikon} {question.dersler?.ad || 'Ders belirtilmedi'}</Text>
                <Text variant="bodyStrong" numberOfLines={1}>{question.konu || 'Konu belirtilmedi'}</Text>
                <Text variant="caption" color="textMuted" numberOfLines={1}>{[question.kaynak, `S. ${question.sayfa || '—'} · Soru ${question.soru_no || '—'}`, formatDate(question.created_at)].filter(Boolean).join(' · ')}</Text>
              </View>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: question.cozuldu }} accessibilityLabel={question.cozuldu ? 'Çözülmedi olarak işaretle' : 'Çözüldü olarak işaretle'} onPress={() => toggleSolved(question)} style={({ pressed }) => [{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, { opacity: pressed ? 0.6 : 1 }]}>
                {question.cozuldu ? <Badge label="Çözüldü" /> : <Badge label="Bekliyor" tone="warning" />}
              </Pressable>
            </Pressable>
          );
        })}
      </View>

      <Sheet open={open} onClose={() => !saving && setOpen(false)} title={editing ? 'Soruyu düzenle' : 'Yeni soru'}
        footer={(<>
          {editing ? <Button icon={Trash2} variant="danger" accessibilityLabel="Soruyu sil" onPress={() => remove(editing)} /> : null}
          <Button title={saving ? 'Kaydediliyor…' : 'Kaydet'} loading={saving} onPress={save} style={{ flex: 1 }} />
        </>)}>
        <Select label="Ders" value={form.ders_id} onChange={(ders_id) => setForm({ ...form, ders_id })} placeholder="Ders seç" options={courses.map((course) => ({ value: course.id, label: course.ad }))} />
        <TextField label="Konu" value={form.konu} onChangeText={(konu) => setForm({ ...form, konu })} placeholder="ör. Türev uygulamaları" />
        <TextField label="Kaynak" value={form.kaynak} onChangeText={(kaynak) => setForm({ ...form, kaynak })} placeholder="ör. 3D Soru Bankası" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><TextField label="Sayfa" value={form.sayfa} onChangeText={(sayfa) => setForm({ ...form, sayfa: sayfa.replace(/\D/g, '') })} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><TextField label="Soru no" value={form.soru_no} onChangeText={(soru_no) => setForm({ ...form, soru_no })} /></View>
        </View>
        <Text variant="captionStrong" color="textMuted">Görseller ({existing.length + files.length}/{MAX_IMAGES})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {existing.map((image) => (
            <View key={image.id} style={styles.preview}>
              {urls[image.storage_path] ? <Image source={{ uri: urls[image.storage_path] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <Pressable accessibilityLabel="Görseli kaldır" onPress={() => setRemoved((current) => new Set(current).add(image.id))} style={styles.removeImage}><X size={13} color="#FFFFFF" /></Pressable>
            </View>
          ))}
          {files.map((file, index) => (
            <View key={file.uri} style={styles.preview}>
              <Image source={{ uri: file.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Pressable accessibilityLabel="Görseli kaldır" onPress={() => setFiles((current) => current.filter((_, i) => i !== index))} style={styles.removeImage}><X size={13} color="#FFFFFF" /></Pressable>
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button title="Fotoğraf çek" icon={Camera} variant="secondary" onPress={() => addImage(true)} style={{ flex: 1 }} />
          <Button title="Galeriden" icon={ImagePlus} variant="secondary" onPress={() => addImage(false)} style={{ flex: 1 }} />
        </View>
      </Sheet>

      <Sheet open={bulkOpen} onClose={() => !saving && setBulkOpen(false)} title="Toplu soru ekle" subtitle="Her görsel ayrı bir soru kaydı olur."
        footer={<Button title={saving ? 'Yükleniyor…' : `${bulkFiles.length} soruyu ekle`} loading={saving} disabled={!bulkFiles.length} onPress={saveBulk} style={{ flex: 1 }} />}>
        <Select label="Ders" value={bulkForm.ders_id} onChange={(ders_id) => setBulkForm({ ...bulkForm, ders_id })} placeholder="Ders seç" options={courses.map((course) => ({ value: course.id, label: course.ad }))} />
        <TextField label="Konu (isteğe bağlı)" value={bulkForm.konu} onChangeText={(konu) => setBulkForm({ ...bulkForm, konu })} />
        <TextField label="Kaynak (isteğe bağlı)" value={bulkForm.kaynak} onChangeText={(kaynak) => setBulkForm({ ...bulkForm, kaynak })} />
        <Button title={bulkFiles.length ? `${bulkFiles.length} görsel seçildi · Değiştir` : 'Görselleri seç (en fazla 50)'} icon={Images} variant="soft"
          onPress={async () => { try { setBulkFiles(await pickImages(50)); } catch (error) { toast.error((error as Error).message); } }} />
        {bulkFiles.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {bulkFiles.map((file, index) => (
              <View key={file.uri} style={styles.preview}>
                <Image source={{ uri: file.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={styles.indexBadge}><Text variant="caption" color="#FFFFFF" style={{ fontSize: 10 }}>{index + 1}</Text></View>
                <Pressable accessibilityLabel={`${index + 1}. görseli kaldır`} onPress={() => setBulkFiles((current) => current.filter((_, i) => i !== index))} style={styles.removeImage}><X size={13} color="#FFFFFF" /></Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </Sheet>

      <ImageViewer urls={viewer?.urls || []} index={viewer?.index ?? null} onClose={() => setViewer(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2 },
  thumb: { width: 64, height: 56, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: 3, bottom: 3, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)' },
  preview: { width: 84, height: 84, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: '#0001' },
  removeImage: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  indexBadge: { position: 'absolute', left: 4, bottom: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
});
