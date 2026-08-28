'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, Check, CheckCheck, Clock3, Download, ExternalLink, File,
  Flame, Image as ImageIcon, Mic, Paperclip, Pencil, Send, Share2,
  Square, Trash2, Trophy, X,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/wav',
  'application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const formatBytes = (bytes) => {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const safeFileName = (name) => String(name || 'dosya')
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .slice(-120);

const messageTypeFor = (file) => {
  if (file?.type?.startsWith('image/')) return 'image';
  if (file?.type?.startsWith('audio/')) return 'audio';
  return 'file';
};

export default function ClassroomChat({
  supabase, groupId, userId, isOwner, room, messages,
  viewerIsMuted, onError, onRefresh,
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [signedUrls, setSignedUrls] = useState({});
  const [editId, setEditId] = useState('');
  const [editText, setEditText] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareables, setShareables] = useState([]);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareFields, setShareFields] = useState({ weekly: true, questions: true, streak: true, level: true });
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const recorderRef = useRef(null);
  const recorderChunksRef = useRef([]);
  const markedReadRef = useRef(new Set());
  const canChat = !viewerIsMuted && (isOwner || room.membersCanChat);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    let disposed = false;
    const paths = [...new Set((messages || []).map((message) => message.attachmentPath).filter(Boolean))];
    if (!paths.length) return undefined;
    supabase.storage.from('classroom-attachments').createSignedUrls(paths, 3600).then(({ data, error }) => {
      if (disposed) return;
      if (error) {
        onError('Sohbetteki dosyalar şu anda açılamıyor. Lütfen tekrar dene.');
        return;
      }
      setSignedUrls(Object.fromEntries((data || []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl])));
    });
    return () => { disposed = true; };
  }, [messages, onError, supabase]);

  useEffect(() => {
    const unread = (messages || [])
      .filter((message) => message.userId !== userId && !message.deletedAt)
      .filter((message) => !(message.readBy || []).some((reader) => reader.userId === userId))
      .map((message) => message.id)
      .filter((id) => !markedReadRef.current.has(id));
    if (!unread.length) return;
    unread.forEach((id) => markedReadRef.current.add(id));
    supabase.rpc('mark_classroom_messages_read', { p_group_id: groupId, p_message_ids: unread.slice(0, 100) })
      .then(({ error }) => {
        if (!error) return;
        unread.forEach((id) => markedReadRef.current.delete(id));
        onError('Mesajların okundu bilgisi güncellenemedi.');
      });
  }, [groupId, messages, onError, supabase, userId]);

  const replyLookup = useMemo(() => new Map((messages || []).map((message) => [message.id, message])), [messages]);

  const chooseFile = (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      onError('Bu dosya türü desteklenmiyor. Görsel, ses, PDF veya Office dosyası seçebilirsin.');
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      onError('Dosya 20 MB sınırını aşmamalı.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if ((!body && !selectedFile) || !canChat || busy) return;
    setBusy(true);
    let uploadedPath = '';
    try {
      if (selectedFile) {
        const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        uploadedPath = `${groupId}/${userId}/${unique}-${safeFileName(selectedFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from('classroom-attachments')
          .upload(uploadedPath, selectedFile, { upsert: false, contentType: selectedFile.type, cacheControl: '3600' });
        if (uploadError) throw new Error('Dosya sınıf sohbetine yüklenemedi.');
      }
      const { error } = await supabase.rpc('send_classroom_message_v2', {
        p_group_id: groupId,
        p_body: body,
        p_message_type: selectedFile ? messageTypeFor(selectedFile) : 'text',
        p_attachment_path: uploadedPath || null,
        p_attachment_name: selectedFile?.name || null,
        p_attachment_mime: selectedFile?.type || null,
        p_attachment_size: selectedFile?.size || null,
        p_reply_to_id: null,
      });
      if (error) throw new Error(error.message || 'Mesaj gönderilemedi.');
      setText('');
      clearFile();
      await onRefresh();
    } catch (sendError) {
      if (uploadedPath) await supabase.storage.from('classroom-attachments').remove([uploadedPath]);
      onError(sendError.message || 'Mesaj gönderilemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (messageId) => {
    const body = editText.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await supabase.rpc('edit_classroom_message', { p_message_id: messageId, p_body: body });
    setBusy(false);
    if (error) { onError(error.message || 'Mesaj düzenlenemedi.'); return; }
    setEditId('');
    setEditText('');
    await onRefresh();
  };

  const deleteMessage = async (message) => {
    setBusy(true);
    const { error } = await supabase.rpc('delete_classroom_message', { p_message_id: message.id });
    if (!error && message.attachmentPath && message.userId === userId) {
      const { error: removeError } = await supabase.storage.from('classroom-attachments').remove([message.attachmentPath]);
      if (removeError) onError('Mesaj silindi; dosya temizliği daha sonra yeniden denenecek.');
    }
    setBusy(false);
    if (error) { onError(error.message || 'Mesaj silinemedi.'); return; }
    await onRefresh();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) {
      onError('Bu tarayıcı ses kaydını desteklemiyor. Ses dosyası seçerek gönderebilirsin.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((type) => globalThis.MediaRecorder.isTypeSupported(type));
      const recorder = new globalThis.MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recorderChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType?.split(';')[0] || 'audio/webm';
        const blob = new Blob(recorderChunksRef.current, { type });
        stream.getTracks().forEach((track) => track.stop());
        chooseFile(new globalThis.File([blob], `ses-${Date.now()}.${type.includes('ogg') ? 'ogg' : 'webm'}`, { type }));
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      onError('Mikrofona erişilemedi. Tarayıcı iznini kontrol edebilirsin.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const openShare = async () => {
    setShareOpen(true);
    setShareBusy(true);
    const { data, error } = await supabase.rpc('get_classroom_shareable_resources', { p_group_id: groupId });
    setShareBusy(false);
    if (error) { onError('Kaynakların paylaşım için hazırlanamadı.'); return; }
    setShareables(data || []);
  };

  const shareProfile = async () => {
    setShareBusy(true);
    const { error } = await supabase.rpc('share_classroom_profile_card', {
      p_group_id: groupId,
      p_share_weekly_minutes: shareFields.weekly,
      p_share_questions: shareFields.questions,
      p_share_streak: shareFields.streak,
      p_share_level: shareFields.level,
    });
    setShareBusy(false);
    if (error) { onError(error.message || 'Çalışma kartın paylaşılamadı.'); return; }
    setShareOpen(false);
    await onRefresh();
  };

  const shareResource = async (resourceId) => {
    setShareBusy(true);
    const { error } = await supabase.rpc('share_classroom_resource', { p_group_id: groupId, p_resource_id: resourceId });
    setShareBusy(false);
    if (error) { onError(error.message || 'Kaynak paylaşılamadı.'); return; }
    setShareOpen(false);
    await onRefresh();
  };

  const renderPayload = (message) => {
    const url = signedUrls[message.attachmentPath];
    if (message.messageType === 'image') return <a className="chat-image" href={url || '#'} target="_blank" rel="noreferrer" style={url ? { backgroundImage: `url(${url})` } : undefined}><span>{url ? 'Görseli aç' : 'Görsel hazırlanıyor…'}</span></a>;
    if (message.messageType === 'audio') return url ? <audio className="chat-audio" controls preload="metadata" src={url} /> : <span className="chat-file-loading">Ses hazırlanıyor…</span>;
    if (message.messageType === 'file') return <a className="chat-file" href={url || '#'} target="_blank" rel="noreferrer"><File size={18} /><span><strong>{message.attachmentName || 'Dosya'}</strong><small>{formatBytes(message.attachmentSize)}</small></span><Download size={16} /></a>;
    if (message.messageType === 'resource') return <div className="chat-resource-card"><span><BookOpen size={18} /></span><div><small>{message.metadata?.examType || 'Çalışma kaynağı'}</small><strong>{message.metadata?.title}</strong><p>{message.metadata?.publisher}</p></div>{message.metadata?.sourceUrl && <a href={message.metadata.sourceUrl} target="_blank" rel="noreferrer" aria-label="Kaynağı aç"><ExternalLink size={16} /></a>}</div>;
    if (message.messageType === 'profile_card') return <div className="chat-profile-card"><header><span>{String(message.metadata?.displayName || message.name || 'Ö').charAt(0)}</span><div><small>Çalışma kartı</small><strong>{message.metadata?.displayName || message.name}</strong></div></header><div>{message.metadata?.weeklyMinutes != null && <span><Clock3 size={15} /><b>{message.metadata.weeklyMinutes} dk</b><small>Bu hafta</small></span>}{message.metadata?.weeklyQuestions != null && <span><Check size={15} /><b>{message.metadata.weeklyQuestions}</b><small>Soru</small></span>}{message.metadata?.streak != null && <span><Flame size={15} /><b>{message.metadata.streak} gün</b><small>Seri</small></span>}{message.metadata?.level != null && <span><Trophy size={15} /><b>Seviye {message.metadata.level}</b><small>{message.metadata.levelTitle}</small></span>}</div></div>;
    return null;
  };

  return (
    <>
      <article className="classroom-chat study-panel">
        <header><div><span><Send size={15} /> Sınıf sohbeti</span><h2>Canlı paylaşım alanı</h2></div><em>{(messages || []).length} mesaj</em></header>
        <div className="classroom-message-list" aria-live="polite">
          {(messages || []).length === 0 ? <div className="classroom-chat-empty"><Send size={22} /><strong>İlk mesajı sen bırak</strong><span>Metin, kaynak, görsel, dosya veya ses paylaşabilirsin.</span></div> : messages.map((message) => {
            const mine = message.userId === userId;
            const reply = message.replyToId ? replyLookup.get(message.replyToId) : null;
            return <article key={message.id} data-message-id={message.id} className={mine ? 'is-me' : ''}>
              <span className="message-avatar">{String(message.name || 'Ö').charAt(0).toLocaleUpperCase('tr-TR')}</span>
              <div className="message-content">
                <strong>{mine ? 'Sen' : message.name}<time>{new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt))}</time></strong>
                {reply && <small className="message-reply">{reply.name}: {reply.body}</small>}
                {editId === message.id ? <div className="message-edit"><input value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={1000} autoFocus /><button onClick={() => saveEdit(message.id)} disabled={busy}>Kaydet</button><button onClick={() => setEditId('')}>Vazgeç</button></div> : <>{!message.deletedAt && renderPayload(message)}{message.body && <p>{message.body}</p>}</>}
                <footer>{message.editedAt && <small>düzenlendi</small>}{mine && !message.deletedAt && <details><summary><CheckCheck size={14} /> {(message.readBy || []).length ? `${message.readBy.length} kişi okudu` : 'Gönderildi'}</summary>{(message.readBy || []).map((reader) => <span key={reader.userId}>{reader.name}</span>)}</details>}</footer>
              </div>
              {(mine || isOwner) && !message.deletedAt && <div className="message-actions">{mine && <button onClick={() => { setEditId(message.id); setEditText(message.body || ''); }} aria-label="Mesajı düzenle"><Pencil size={14} /></button>}<button onClick={() => deleteMessage(message)} aria-label="Mesajı sil"><Trash2 size={14} /></button></div>}
            </article>;
          })}
        </div>

        {selectedFile && <div className="chat-attachment-preview">{previewUrl ? <span style={{ backgroundImage: `url(${previewUrl})` }} /> : messageTypeFor(selectedFile) === 'audio' ? <Mic size={18} /> : <File size={18} />}<div><strong>{selectedFile.name}</strong><small>{formatBytes(selectedFile.size)}</small></div><button onClick={clearFile} aria-label="Eki kaldır"><X size={16} /></button></div>}
        <form className="classroom-chat-composer" onSubmit={sendMessage}>
          <div className="chat-tools">
            <button type="button" onClick={() => imageInputRef.current?.click()} disabled={!canChat} title="Görsel ekle"><ImageIcon size={17} /></button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canChat} title="Dosya ekle"><Paperclip size={17} /></button>
            <button type="button" className={recording ? 'is-recording' : ''} onClick={recording ? stopRecording : startRecording} disabled={!canChat} title={recording ? 'Kaydı durdur' : 'Ses kaydet'}>{recording ? <Square size={15} /> : <Mic size={17} />}</button>
            <button type="button" onClick={openShare} disabled={!canChat} title="Çalışma bilgisi veya kaynak paylaş"><Share2 size={17} /></button>
          </div>
          <div className="chat-input-row"><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} rows={1} disabled={!canChat} placeholder={viewerIsMuted ? 'Sohbet erişimin geçici olarak sınırlandı' : 'Sınıfa mesaj yaz…'} /><button disabled={busy || (!text.trim() && !selectedFile) || !canChat}><Send size={17} /><span>{busy ? 'Gönderiliyor…' : 'Gönder'}</span></button></div>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => chooseFile(event.target.files?.[0])} />
          <input ref={fileInputRef} type="file" accept={[...ACCEPTED_TYPES].join(',')} hidden onChange={(event) => chooseFile(event.target.files?.[0])} />
        </form>
      </article>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Sınıfla paylaş" description="Yalnızca seçtiğin bilgiler bu sohbette kart olarak görünür." size="lg">
        <div className="classroom-share-panel">
          <section><header><span><Trophy size={17} /></span><div><strong>Çalışma kartım</strong><small>E-posta ve özel hesap bilgilerin paylaşılmaz.</small></div></header><div className="share-field-grid">{[['weekly','Bu haftaki süre'],['questions','Çözülen soru'],['streak','Güncel seri'],['level','Seviye']].map(([key,label]) => <label key={key}><input type="checkbox" checked={shareFields[key]} onChange={(event) => setShareFields((current) => ({ ...current, [key]: event.target.checked }))} /><span>{label}</span></label>)}</div><button onClick={shareProfile} disabled={shareBusy || !Object.values(shareFields).some(Boolean)}>Kartımı paylaş</button></section>
          <section><header><span><BookOpen size={17} /></span><div><strong>Kaynaklarımdan paylaş</strong><small>Hesabına kayıtlı bir kaynağı sınıfa öner.</small></div></header>{shareBusy && !shareables.length ? <p>Kaynakların hazırlanıyor…</p> : shareables.length ? <div className="share-resource-list">{shareables.map((resource) => <button key={resource.id} onClick={() => shareResource(resource.id)} disabled={shareBusy}><span><strong>{resource.title}</strong><small>{resource.publisher} · {resource.examType || 'YKS'}</small></span><Share2 size={15} /></button>)}</div> : <p>Paylaşabileceğin kayıtlı kaynak bulunmuyor.</p>}</section>
        </div>
      </Modal>
    </>
  );
}
