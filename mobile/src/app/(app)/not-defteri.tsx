import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Folder, NotebookText, Plus, Search, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, IconButton, Screen, Sheet, SkeletonCards, Text, TextField, useToast } from '@/components/ui';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Note = { id: string; klasor: string; baslik: string; icerik?: string | null; updated_at: string };
const REALTIME_TABLES = ['notlar'];
const EMPTY = { klasor: '', baslik: '', icerik: '' };

export default function NotebookScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAccount();
  const userId = profile?.id;
  const [folder, setFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const key = ['notes', userId];

  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('notlar').select('*').eq('user_id', userId!).order('updated_at', { ascending: false });
      if (error) throw new Error('Notların yüklenemedi. Lütfen tekrar dene.');
      return (data || []) as Note[];
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: query.refetch });
  const notes = query.data || [];
  const folders = [...new Set(notes.map((note) => note.klasor))];
  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const visible = notes.filter((note) => (!folder || note.klasor === folder) && (!needle || `${note.baslik} ${note.icerik || ''}`.toLocaleLowerCase('tr-TR').includes(needle)));

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, klasor: folder || '' }); setOpen(true); };
  const openEdit = (note: Note) => { setEditing(note); setForm({ klasor: note.klasor, baslik: note.baslik, icerik: note.icerik || '' }); setOpen(true); };

  const save = async () => {
    if (!form.klasor.trim() || !form.baslik.trim()) return toast.error('Klasör ve başlık gerekli.');
    setSaving(true);
    const payload = { user_id: userId, klasor: form.klasor.trim(), baslik: form.baslik.trim(), icerik: form.icerik, updated_at: new Date().toISOString() };
    const { error } = editing
      ? await supabase.from('notlar').update(payload).eq('id', editing.id).eq('user_id', userId!)
      : await supabase.from('notlar').insert(payload);
    setSaving(false);
    if (error) return toast.error(`Not kaydedilemedi: ${error.message}`);
    setOpen(false);
    toast.success(editing ? 'Not güncellendi' : 'Not kaydedildi');
    query.refetch();
  };

  const remove = (note: Note) => Alert.alert('Notu sil', 'Bu notu silmek istediğine emin misin?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => {
      setOpen(false);
      queryClient.setQueryData<Note[]>(key, (current = []) => current.filter((item) => item.id !== note.id));
      const { error } = await supabase.from('notlar').delete().eq('id', note.id).eq('user_id', userId!);
      if (error) { toast.error(`Not silinemedi: ${error.message}`); query.refetch(); }
    } },
  ]);

  return (
    <Screen onRefresh={query.refetch}>
      <Stack.Screen options={{ headerRight: () => <IconButton icon={Plus} label="Yeni not" tone="primary" onPress={openCreate} /> }} />
      <TextField icon={Search} value={search} onChangeText={setSearch} placeholder="Notlarda ara" returnKeyType="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.md }}>
        <Chip label="Tümü" active={!folder} onPress={() => setFolder(null)} />
        {folders.map((item) => <Chip key={item} label={item} icon={Folder} active={folder === item} onPress={() => setFolder(item)} />)}
      </ScrollView>

      {query.isLoading ? <SkeletonCards /> : query.isError ? <ErrorState message={(query.error as Error).message} onRetry={query.refetch} /> : visible.length === 0 ? (
        <Card><EmptyState icon={NotebookText} title={needle ? 'Sonuç bulunamadı' : 'Henüz not eklenmemiş'} description="Ders notlarını klasörler halinde düzenleyerek kolayca tekrar edebilirsin." action="Yeni not" onAction={openCreate} /></Card>
      ) : (
        <View style={styles.grid}>
          {visible.map((note) => (
            <Pressable key={note.id} accessibilityRole="button" onPress={() => openEdit(note)} onLongPress={() => remove(note)}
              style={({ pressed }) => [styles.note, { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border }]}>
              <Badge label={note.klasor} tone="info" />
              <Text variant="subheading" numberOfLines={2}>{note.baslik}</Text>
              <Text variant="caption" color="textMuted" numberOfLines={5} style={{ flex: 1 }}>{note.icerik?.slice(0, 200) || 'Boş not…'}</Text>
              <Text variant="caption" color="textSubtle">{new Date(note.updated_at).toLocaleDateString('tr-TR')}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Sheet open={open} onClose={() => !saving && setOpen(false)} title={editing ? 'Notu düzenle' : 'Yeni not'}
        footer={(<>
          {editing ? <Button icon={Trash2} variant="danger" accessibilityLabel="Notu sil" onPress={() => remove(editing)} /> : null}
          <Button title={saving ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Kaydet'} loading={saving} onPress={save} style={{ flex: 1 }} />
        </>)}>
        <TextField label="Klasör" icon={Folder} value={form.klasor} onChangeText={(klasor) => setForm({ ...form, klasor })} placeholder="ör. Matematik" />
        {folders.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }}>
            {folders.map((item) => <Chip key={item} label={item} active={form.klasor === item} onPress={() => setForm({ ...form, klasor: item })} />)}
          </ScrollView>
        ) : null}
        <TextField label="Başlık" value={form.baslik} onChangeText={(baslik) => setForm({ ...form, baslik })} placeholder="Not başlığı" />
        <TextField label="İçerik" multiline value={form.icerik} onChangeText={(icerik) => setForm({ ...form, icerik })} placeholder="Notlarını buraya yaz…" style={{ minHeight: 220 }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  note: { flexBasis: '47%', flexGrow: 1, minHeight: 170, padding: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, gap: space.sm },
});
