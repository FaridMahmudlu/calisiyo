import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Ban, BookOpen, Check, CheckCheck, Clock3, Download, ExternalLink, File as FileIcon, Flag, Flame, Image as ImageIcon, Mic, Paperclip, Pencil, Send, Share2, Square, Trash2, Trophy, X } from 'lucide-react-native';
import { ActionMenu, type MenuAction } from '@/components/ActionMenu';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ImageViewer } from '@/components/ImageViewer';
import { Avatar, Button, Card, Sheet, SwitchRow, Text } from '@/components/ui';
import { optimizeImage, pickImage, readFileBytes } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { VoicePlayer } from './VoicePlayer';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'audio/mpeg', 'audio/mp4', 'audio/wav'];

export type ChatMessage = {
  id: string; userId: string; name: string; body?: string | null; messageType: string; attachmentPath?: string | null; attachmentName?: string | null; attachmentSize?: number | null;
  metadata?: Record<string, any> | null; createdAt: string; editedAt?: string | null; deletedAt?: string | null; readBy?: { userId: string; name: string }[]; replyToId?: string | null;
};
type Attachment = { uri: string; name: string; mimeType: string; size: number; kind: 'image' | 'audio' | 'file' };

const formatBytes = (bytes?: number | null) => { const size = Number(bytes || 0); return size < 1024 ? `${size} B` : size < 1048576 ? `${Math.round(size / 1024)} KB` : `${(size / 1048576).toFixed(1)} MB`; };
const safeFileName = (name: string) => String(name || 'dosya').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-120);
const timeLabel = (value: string) => new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export function ClassroomChat({ groupId, userId, canChat, isOwner, messages, onError, onRefresh, blockedUserIds, onReportMessage, onBlockUser }: {
  groupId: string; userId: string; canChat: boolean; isOwner: boolean; messages: ChatMessage[]; onError: (message: string) => void; onRefresh: () => Promise<unknown>;
  blockedUserIds: string[]; onReportMessage: (message: ChatMessage) => void; onBlockUser: (person: { userId: string; name: string }) => void;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState('');
  const [editText, setEditText] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareables, setShareables] = useState<{ id: string; title: string; publisher?: string; examType?: string }[]>([]);
  const [shareFields, setShareFields] = useState({ weekly: true, questions: true, streak: true, level: true });
  const [viewer, setViewer] = useState<string | null>(null);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const menuMine = menuMessage?.userId === userId;
  const menuActions: MenuAction[] = menuMessage ? [
    ...(menuMine && menuMessage.body ? [{ label: 'Düzenle', icon: Pencil, onPress: () => { setEditId(menuMessage.id); setEditText(menuMessage.body || ''); } }] : []),
    ...(menuMine || isOwner ? [{ label: 'Mesajı sil', icon: Trash2, destructive: true, onPress: () => remove(menuMessage) }] : []),
    ...(!menuMine ? [
      { label: 'Mesajı şikayet et', icon: Flag, destructive: true, onPress: () => onReportMessage(menuMessage) },
      { label: `${menuMessage.name} kullanıcısını engelle`, icon: Ban, destructive: true, onPress: () => onBlockUser({ userId: menuMessage.userId, name: menuMessage.name }) },
    ] : []),
  ] : [];
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const signed = useRef(new Set<string>());
  const marked = useRef(new Set<string>());
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  useEffect(() => {
    const paths = [...new Set(messages.map((message) => message.attachmentPath).filter(Boolean) as string[])].filter((path) => !signed.current.has(path));
    if (!paths.length) return;
    supabase.storage.from('classroom-attachments').createSignedUrls(paths, 3600).then(({ data, error }) => {
      if (error) return onError('Sohbetteki dosyalar şu anda açılamıyor.');
      const fresh = Object.fromEntries((data || []).filter((item) => item.signedUrl && item.path).map((item) => [item.path as string, item.signedUrl as string]));
      Object.keys(fresh).forEach((path) => signed.current.add(path));
      setSignedUrls((current) => ({ ...current, ...fresh }));
    });
  }, [messages, onError]);

  useEffect(() => {
    const unread = messages.filter((m) => m.userId !== userId && !m.deletedAt && !(m.readBy || []).some((r) => r.userId === userId)).map((m) => m.id).filter((id) => !marked.current.has(id));
    if (!unread.length) return;
    unread.forEach((id) => marked.current.add(id));
    supabase.rpc('mark_classroom_messages_read', { p_group_id: groupId, p_message_ids: unread.slice(0, 100) }).then(({ error }) => { if (error) unread.forEach((id) => marked.current.delete(id)); });
  }, [groupId, messages, userId]);

  const replyLookup = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);
  const ordered = useMemo(() => [...messages].reverse(), [messages]);

  const refreshUrl = async (path?: string | null) => {
    if (!path) return;
    signed.current.delete(path);
    const { data } = await supabase.storage.from('classroom-attachments').createSignedUrl(path, 3600);
    if (data?.signedUrl) { signed.current.add(path); setSignedUrls((current) => ({ ...current, [path]: data.signedUrl })); }
  };

  const chooseImage = async () => {
    try {
      const image = await pickImage();
      if (!image) return;
      const optimized = image.mimeType === 'image/gif' ? image : await optimizeImage(image);
      const bytes = await readFileBytes(optimized.uri);
      if (bytes.byteLength > MAX_FILE_SIZE) return onError('Dosya 20 MB sınırını aşmamalı.');
      setAttachment({ uri: optimized.uri, name: optimized.name, mimeType: optimized.mimeType, size: bytes.byteLength, kind: 'image' });
    } catch (error) { onError((error as Error).message || 'Görsel hazırlanamadı.'); }
  };

  const chooseDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: DOCUMENT_TYPES, copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || 'application/octet-stream';
    if (!DOCUMENT_TYPES.includes(mime)) return onError('Bu dosya türü desteklenmiyor. Görsel, ses, PDF veya Office dosyası seçebilirsin.');
    if (!asset.size || asset.size > MAX_FILE_SIZE) return onError('Dosya 20 MB sınırını aşmamalı.');
    setAttachment({ uri: asset.uri, name: asset.name, mimeType: mime, size: asset.size, kind: mime.startsWith('audio/') ? 'audio' : 'file' });
  };

  const startRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return onError('Mikrofon izni kapalı. Ayarlar’dan Calisiyo için mikrofona izin verebilirsin.');
    setAttachment(null);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
    setRecordingSeconds(0);
    const startedAt = Date.now();
    timer.current = setInterval(() => setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250);
  };

  const stopRecording = async () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    await recorder.stop();
    setRecording(false);
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (!recorder.uri) return onError('Ses kaydı oluşturulamadı. Mikrofonunu kontrol edip tekrar dene.');
    const bytes = await readFileBytes(recorder.uri);
    setAttachment({ uri: recorder.uri, name: `ses-${Date.now()}.m4a`, mimeType: 'audio/mp4', size: bytes.byteLength, kind: 'audio' });
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !attachment) || !canChat || busy) return;
    setBusy(true);
    let uploadedPath = '';
    try {
      if (attachment) {
        uploadedPath = `${groupId}/${userId}/${Crypto.randomUUID()}-${safeFileName(attachment.name)}`;
        const bytes = await readFileBytes(attachment.uri);
        const { error } = await supabase.storage.from('classroom-attachments').upload(uploadedPath, bytes, { upsert: false, contentType: attachment.mimeType, cacheControl: '3600' });
        if (error) throw new Error('Dosya sınıf sohbetine yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.');
      }
      const { error } = await supabase.rpc('send_classroom_message_v2', {
        p_group_id: groupId, p_body: body, p_message_type: attachment ? attachment.kind : 'text',
        p_attachment_path: uploadedPath || null, p_attachment_name: attachment?.name || null, p_attachment_mime: attachment?.mimeType || null,
        p_attachment_size: attachment?.size || null, p_reply_to_id: null,
      });
      if (error) throw new Error('Mesaj gönderilemedi. Lütfen tekrar dene.');
      setText('');
      setAttachment(null);
      await onRefresh();
    } catch (error) {
      if (uploadedPath) await supabase.storage.from('classroom-attachments').remove([uploadedPath]);
      onError((error as Error).message);
    } finally { setBusy(false); }
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc('edit_classroom_message', { p_message_id: id, p_body: editText.trim() });
    setBusy(false);
    if (error) return onError(error.message || 'Mesaj düzenlenemedi.');
    setEditId(''); setEditText(''); onRefresh();
  };

  const remove = (message: ChatMessage) => Alert.alert('Mesajı sil', 'Bu mesaj sınıftaki herkes için silinecek.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => {
      const { error } = await supabase.rpc('delete_classroom_message', { p_message_id: message.id });
      if (error) return onError(error.message || 'Mesaj silinemedi.');
      if (message.attachmentPath && message.userId === userId) await supabase.storage.from('classroom-attachments').remove([message.attachmentPath]);
      onRefresh();
    } },
  ]);

  const openShare = async () => {
    setShareOpen(true);
    const { data, error } = await supabase.rpc('get_classroom_shareable_resources', { p_group_id: groupId });
    if (error) return onError('Kaynakların paylaşım için hazırlanamadı.');
    setShareables(data || []);
  };
  const shareProfile = async () => {
    const { error } = await supabase.rpc('share_classroom_profile_card', {
      p_group_id: groupId, p_share_weekly_minutes: shareFields.weekly, p_share_questions: shareFields.questions, p_share_streak: shareFields.streak, p_share_level: shareFields.level,
    });
    if (error) return onError(error.message || 'Çalışma kartın paylaşılamadı.');
    setShareOpen(false); onRefresh();
  };
  const shareResource = async (id: string) => {
    const { error } = await supabase.rpc('share_classroom_resource', { p_group_id: groupId, p_resource_id: id });
    if (error) return onError(error.message || 'Kaynak paylaşılamadı.');
    setShareOpen(false); onRefresh();
  };

  const renderPayload = (message: ChatMessage, mine: boolean) => {
    const url = message.attachmentPath ? signedUrls[message.attachmentPath] : undefined;
    if (message.messageType === 'image') return url
      ? <Pressable accessibilityRole="imagebutton" accessibilityLabel="Görseli büyüt" onPress={() => setViewer(url)}><Image source={{ uri: url }} style={styles.chatImage} contentFit="cover" /></Pressable>
      : <ActivityIndicator color={colors.primary} />;
    if (message.messageType === 'audio') return url ? <VoicePlayer uri={url} tint={mine ? colors.primaryPressed : undefined} onSourceError={() => refreshUrl(message.attachmentPath)} /> : <Text variant="caption" color="textMuted">Ses hazırlanıyor…</Text>;
    if (message.messageType === 'file') return (
      <Pressable accessibilityRole="button" onPress={() => url && WebBrowser.openBrowserAsync(url)} style={[styles.file, { backgroundColor: colors.surfaceMuted }]}>
        <FileIcon size={18} color={colors.primary} />
        <View style={{ flex: 1 }}><Text variant="captionStrong" numberOfLines={1}>{message.attachmentName || 'Dosya'}</Text><Text variant="caption" color="textMuted">{formatBytes(message.attachmentSize)}</Text></View>
        <Download size={16} color={colors.textMuted} />
      </Pressable>
    );
    if (message.messageType === 'resource') return (
      <View style={[styles.file, { backgroundColor: colors.surfaceMuted }]}>
        <BookOpen size={18} color={colors.primary} />
        <View style={{ flex: 1 }}><Text variant="caption" color="textMuted">{message.metadata?.examType || 'Çalışma kaynağı'}</Text><Text variant="captionStrong">{message.metadata?.title}</Text><Text variant="caption" color="textMuted">{message.metadata?.publisher}</Text></View>
        {message.metadata?.sourceUrl ? <Pressable accessibilityLabel="Kaynağı aç" onPress={() => Linking.openURL(message.metadata!.sourceUrl)}><ExternalLink size={16} color={colors.primary} /></Pressable> : null}
      </View>
    );
    if (message.messageType === 'profile_card') {
      const m = message.metadata || {};
      return (
        <View style={[styles.profileCard, { backgroundColor: colors.primarySoft }]}>
          <Text variant="caption" color="primaryPressed">Çalışma kartı · {m.displayName || message.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {m.weeklyMinutes != null ? <View style={styles.stat}><Clock3 size={14} color={colors.primary} /><Text variant="captionStrong">{m.weeklyMinutes} dk</Text></View> : null}
            {m.weeklyQuestions != null ? <View style={styles.stat}><Check size={14} color={colors.primary} /><Text variant="captionStrong">{m.weeklyQuestions} soru</Text></View> : null}
            {m.streak != null ? <View style={styles.stat}><Flame size={14} color={colors.streak} /><Text variant="captionStrong">{m.streak} gün</Text></View> : null}
            {m.level != null ? <View style={styles.stat}><Trophy size={14} color={colors.gold} /><Text variant="captionStrong">Sv. {m.level}</Text></View> : null}
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={ordered}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: space.sm, padding: space.md }}
        ListEmptyComponent={<View style={{ transform: [{ scaleY: -1 }], alignItems: 'center', padding: space.xxl, gap: 6 }}><Send size={22} color={colors.primary} /><Text variant="subheading">İlk mesajı sen bırak</Text><Text variant="caption" color="textMuted" align="center">Metin, kaynak, görsel, dosya veya ses paylaşabilirsin.</Text></View>}
        renderItem={({ item: message }) => {
          const mine = message.userId === userId;
          if (!mine && blockedUserIds.includes(message.userId)) {
            return <View style={styles.row}><View style={[styles.bubble, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}><Text variant="caption" color="textSubtle" style={{ fontStyle: 'italic' }}>Engellediğin bir kullanıcının mesajı gizlendi.</Text></View></View>;
          }
          const reply = message.replyToId ? replyLookup.get(message.replyToId) : null;
          return (
            <View style={[styles.row, mine && { justifyContent: 'flex-end' }]}>
              {!mine ? <Avatar name={message.name} size={30} /> : null}
              <Pressable onLongPress={() => !message.deletedAt ? setMenuMessage(message) : undefined} delayLongPress={300}
                accessibilityHint="Seçenekler için basılı tut"
                style={[styles.bubble, { backgroundColor: mine ? colors.primarySoft : colors.surface, borderColor: mine ? colors.primaryBorder : colors.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                  <Text variant="captionStrong" color={mine ? 'primaryPressed' : 'text'}>{mine ? 'Sen' : message.name}</Text>
                  <Text variant="caption" color="textSubtle">{timeLabel(message.createdAt)}</Text>
                </View>
                {reply ? <Text variant="caption" color="textMuted" numberOfLines={1}>↪ {reply.name}: {reply.body}</Text> : null}
                {editId === message.id ? (
                  <View style={{ gap: 6 }}>
                    <TextInput value={editText} onChangeText={setEditText} maxLength={1000} autoFocus multiline style={[styles.editInput, { color: colors.text, borderColor: colors.border }]} />
                    <View style={{ flexDirection: 'row', gap: 6 }}><Button title="Kaydet" size="sm" onPress={() => saveEdit(message.id)} /><Button title="Vazgeç" size="sm" variant="ghost" onPress={() => setEditId('')} /></View>
                  </View>
                ) : (
                  <>
                    {!message.deletedAt ? renderPayload(message, mine) : null}
                    {message.body ? <Text variant="body" color={message.deletedAt ? 'textSubtle' : 'text'} style={message.deletedAt ? { fontStyle: 'italic' } : undefined}>{message.body}</Text> : null}
                  </>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                  {message.editedAt ? <Text variant="caption" color="textSubtle">düzenlendi</Text> : null}
                  {mine && !message.deletedAt ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><CheckCheck size={12} color={(message.readBy || []).length ? colors.primary : colors.textSubtle} /><Text variant="caption" color="textSubtle">{(message.readBy || []).length ? `${message.readBy!.length} kişi okudu` : 'Gönderildi'}</Text></View> : null}
                </View>
              </Pressable>
            </View>
          );
        }}
      />

      {recording ? (
        <View style={[styles.status, { backgroundColor: colors.dangerSoft }]}>
          <View style={[styles.recDot, { backgroundColor: colors.danger }]} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>Ses kaydediliyor</Text>
          <Text variant="subheading">{String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</Text>
        </View>
      ) : null}
      {attachment ? (
        <View style={[styles.status, { backgroundColor: colors.surfaceMuted }]}>
          {attachment.kind === 'image' ? <Image source={{ uri: attachment.uri }} style={{ width: 44, height: 44, borderRadius: 8 }} /> : attachment.kind === 'audio' ? <Mic size={18} color={colors.primary} /> : <FileIcon size={18} color={colors.primary} />}
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="captionStrong" numberOfLines={1}>{attachment.name}</Text>
            {attachment.kind === 'audio' ? <VoicePlayer uri={attachment.uri} /> : <Text variant="caption" color="textMuted">{busy ? 'Yükleniyor…' : formatBytes(attachment.size)}</Text>}
          </View>
          <Pressable accessibilityLabel="Eki kaldır" disabled={busy} onPress={() => setAttachment(null)} hitSlop={8}><X size={18} color={colors.textMuted} /></Pressable>
        </View>
      ) : null}

      <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <ToolButton icon={ImageIcon} label="Görsel ekle" disabled={!canChat || recording || busy} onPress={chooseImage} />
          <ToolButton icon={Paperclip} label="Dosya ekle" disabled={!canChat || recording || busy} onPress={chooseDocument} />
          <ToolButton icon={recording ? Square : Mic} label={recording ? 'Kaydı bitir' : 'Ses kaydet'} active={recording} disabled={!canChat || busy} onPress={recording ? stopRecording : startRecording} />
          <ToolButton icon={Share2} label="Çalışma bilgisi veya kaynak paylaş" disabled={!canChat || recording || busy} onPress={openShare} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
          <TextInput value={text} onChangeText={setText} maxLength={1000} multiline editable={canChat && !recording} placeholderTextColor={colors.textSubtle}
            placeholder={!canChat ? 'Sohbet erişimin şu anda sınırlı' : recording ? 'Ses kaydı devam ediyor…' : 'Sınıfa mesaj yaz…'}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceMuted }]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Mesajı gönder" disabled={recording || busy || (!text.trim() && !attachment) || !canChat} onPress={send}
            style={[styles.send, { backgroundColor: colors.primary, opacity: recording || busy || (!text.trim() && !attachment) || !canChat ? 0.45 : 1 }]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
          </Pressable>
        </View>
      </View>

      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Sınıfla paylaş" subtitle="Yalnızca seçtiğin bilgiler sohbette kart olarak görünür.">
        <Card tone="muted" style={{ gap: space.xs }}>
          <Text variant="subheading">Çalışma kartım</Text>
          <Text variant="caption" color="textMuted">E-posta ve özel hesap bilgilerin paylaşılmaz.</Text>
          {([['weekly', 'Bu haftaki süre'], ['questions', 'Çözülen soru'], ['streak', 'Güncel seri'], ['level', 'Seviye']] as const).map(([key, label]) => (
            <SwitchRow key={key} title={label} value={shareFields[key]} onChange={(value) => setShareFields((current) => ({ ...current, [key]: value }))} />
          ))}
          <Button title="Kartımı paylaş" disabled={!Object.values(shareFields).some(Boolean)} onPress={shareProfile} />
        </Card>
        <Text variant="subheading">Kaynaklarımdan paylaş</Text>
        {shareables.length ? shareables.map((resource) => (
          <Pressable key={resource.id} accessibilityRole="button" onPress={() => shareResource(resource.id)} style={[styles.file, { backgroundColor: colors.surfaceMuted }]}>
            <BookOpen size={18} color={colors.primary} />
            <View style={{ flex: 1 }}><Text variant="captionStrong">{resource.title}</Text><Text variant="caption" color="textMuted">{resource.publisher} · {resource.examType || 'YKS'}</Text></View>
            <Share2 size={15} color={colors.textMuted} />
          </Pressable>
        )) : <Text variant="caption" color="textMuted">Paylaşabileceğin kayıtlı kaynak bulunmuyor.</Text>}
      </Sheet>

      <ImageViewer urls={viewer ? [viewer] : []} index={viewer ? 0 : null} onClose={() => setViewer(null)} />
      <ActionMenu open={!!menuMessage} title="Mesaj" subtitle={menuMessage?.body ? String(menuMessage.body).slice(0, 80) : undefined} actions={menuActions} onClose={() => setMenuMessage(null)} />
    </View>
  );
}

function ToolButton({ icon: Icon, label, onPress, disabled, active }: { icon: typeof Mic; label: string; onPress: () => void; disabled?: boolean; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={4}
      style={[styles.tool, { backgroundColor: active ? colors.dangerSoft : 'transparent', opacity: disabled ? 0.4 : 1 }]}>
      <Icon size={19} color={active ? colors.danger : colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  bubble: { maxWidth: '82%', padding: space.md, borderRadius: radius.md, borderWidth: 1, gap: 6 },
  chatImage: { width: 220, height: 180, borderRadius: radius.sm },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.sm, minWidth: 200 },
  profileCard: { padding: space.md, borderRadius: radius.sm, gap: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editInput: { borderWidth: 1, borderRadius: radius.xs, padding: space.sm, fontFamily: fonts.regular, minWidth: 200 },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.md, marginBottom: space.sm, padding: space.md, borderRadius: radius.md },
  recDot: { width: 10, height: 10, borderRadius: 5 },
  composer: { borderTopWidth: 1, padding: space.sm, gap: space.xs },
  tool: { width: 40, height: 36, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: space.lg, paddingTop: 12, paddingBottom: 12, fontFamily: fonts.regular, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
