'use client';

import { useState } from 'react';
import { Flag, ShieldCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { REPORT_REASONS, REPORT_TARGET_LABELS } from '@/lib/moderation/reports';

const friendly = (error, fallback) => error?.message?.replace(/^.*?:\s*/, '') || fallback;

// Reports a classroom message, a classroom or a user to the moderation team.
// `target` = { type: 'message' | 'user' | 'group', id, label }
export default function ReportDialog({ supabase, target, onClose, onReported }) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (busy) return;
    setReason('spam');
    setDetails('');
    setError('');
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!target) return;
    if (reason === 'other' && !details.trim()) return setError('Lütfen şikayetini kısaca açıkla.');
    setBusy(true);
    setError('');
    const { error: reportError } = await supabase.rpc('report_content', {
      p_target_type: target.type,
      p_target_id: target.id,
      p_reason: reason,
      p_details: details.trim() || null,
    });
    setBusy(false);
    if (reportError) return setError(friendly(reportError, 'Şikayet gönderilemedi. Lütfen tekrar dene.'));
    setReason('spam');
    setDetails('');
    onReported?.();
    onClose();
  };

  return (
    <Modal open={Boolean(target)} onClose={close} title={`${REPORT_TARGET_LABELS[target?.type] || 'İçerik'} şikayet et`} description={target?.label || 'Şikayetin yönetici ekibine gizli olarak iletilir.'}>
      <form className="study-form" onSubmit={submit}>
        <label>
          <span>Şikayet nedeni</span>
          <Select ariaLabel="Şikayet nedeni" value={reason} onChange={setReason} options={REPORT_REASONS} />
        </label>
        <label>
          <span>Açıklama {reason === 'other' ? '' : '(isteğe bağlı)'}</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} rows={4} placeholder="Ne olduğunu kısaca anlat" />
          <small>{details.length}/500</small>
        </label>
        <p className="report-dialog-note"><ShieldCheck size={15} /> Şikayet ettiğin kişiye adın gösterilmez. Acil bir tehlike varsa 112’yi ara.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="study-button" onClick={close} disabled={busy}>Vazgeç</button>
          <button className="study-button study-button-danger" disabled={busy}><Flag size={16} /> {busy ? 'Gönderiliyor…' : 'Şikayeti gönder'}</button>
        </div>
      </form>
    </Modal>
  );
}
