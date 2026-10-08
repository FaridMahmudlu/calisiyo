'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Flag, LoaderCircle, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { REPORT_TARGET_LABELS, reportReasonLabel } from '@/lib/moderation/reports';

const FILTERS = [['open', 'Açık'], ['resolved', 'İşlem yapıldı'], ['dismissed', 'Reddedildi'], [null, 'Tümü']];
const formatDate = (value) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

function Evidence({ report }) {
  const evidence = report.evidence || {};
  if (report.targetType === 'message') {
    return <div className="report-evidence"><small>{evidence.groupName} · {evidence.senderName} · {formatDate(evidence.sentAt)}</small><p>{evidence.body || (evidence.attachmentName ? `Ek: ${evidence.attachmentName}` : 'Mesaj metni yok')}</p>{report.messageDeleted && <em>Mesaj artık kaldırılmış</em>}</div>;
  }
  if (report.targetType === 'group') {
    return <div className="report-evidence"><small>Kurucu: {evidence.ownerName || '—'}</small><p><strong>{evidence.groupName}</strong> — {evidence.description || evidence.motto || 'Açıklama yok'}</p></div>;
  }
  return <div className="report-evidence"><p><strong>{evidence.name}</strong>{evidence.username ? ` · @${evidence.username}` : ''}</p></div>;
}

export default function AdminReportsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState('open');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [removeMessage, setRemoveMessage] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => supabase.rpc('admin_list_content_reports', { p_status: filter, p_limit: 150 }).then(({ data, error }) => {
    setLoading(false);
    if (error) return setNotice({ type: 'error', message: error.message });
    setReports(data || []);
  }), [filter, supabase]);

  useEffect(() => { load(); }, [load]);

  const decide = async (decision) => {
    if (!selected) return;
    setBusy(decision);
    const { error } = await supabase.rpc('admin_resolve_content_report', {
      p_report_id: selected.id,
      p_decision: decision,
      p_note: note.trim() || null,
      p_remove_message: decision === 'resolved' && selected.targetType === 'message' && removeMessage,
    });
    setBusy('');
    if (error) return setNotice({ type: 'error', message: error.message });
    setNotice({ type: 'success', message: decision === 'resolved' ? 'Şikayet sonuçlandırıldı ve bildiren kişiye haber verildi.' : 'Şikayet reddedildi ve bildiren kişiye haber verildi.' });
    setSelected(null);
    setNote('');
    await load();
  };

  return <div className="admin-dashboard admin-payments-page">
    {notice && <div className={`admin-notice is-${notice.type}`} role="status">{notice.type === 'success' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}{notice.message}</div>}
    <section className="admin-page-heading"><div><span><Flag size={15} /> Topluluk güvenliği</span><h1>İçerik şikayetleri</h1><p>Mesaj, sınıf ve kullanıcı şikayetlerini incele. Gerekirse kullanıcıyı genel bakış ekranından süreli sustur veya askıya al.</p></div><div><button className="admin-refresh" onClick={() => { setLoading(true); load(); }}><RefreshCw size={15} /> Yenile</button></div></section>
    <section className="admin-card admin-payment-queue">
      <header><div><span>Şikayet kuyruğu</span><h2>Duruma göre şikayetler</h2></div><div className="admin-range">{FILTERS.map(([value, label]) => <button key={label} className={filter === value ? 'is-active' : ''} onClick={() => { setLoading(true); setFilter(value); }}>{label}</button>)}</div></header>
      {loading ? <div className="admin-detail-loading"><LoaderCircle className="is-spinning" /> Şikayetler yükleniyor…</div> : reports.length ? <div className="admin-table-wrap"><table><thead><tr><th>Tür / neden</th><th>Hedef</th><th>Bildiren</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><strong>{REPORT_TARGET_LABELS[report.targetType]}</strong><small>{reportReasonLabel(report.reason)}</small></td><td>{report.targetName || '—'}{Number(report.openReportsAgainstTarget) > 1 && <small>{report.openReportsAgainstTarget} açık şikayet</small>}</td><td>{report.reporterName || 'Silinmiş hesap'}</td><td><span className={`payment-state is-${report.status === 'open' ? 'awaiting_review' : report.status === 'resolved' ? 'approved' : 'rejected'}`}>{report.status === 'open' ? 'Açık' : report.status === 'resolved' ? 'İşlem yapıldı' : 'Reddedildi'}</span></td><td>{formatDate(report.createdAt)}</td><td><button onClick={() => { setSelected(report); setNote(report.resolutionNote || ''); setRemoveMessage(true); }}>{report.status === 'open' ? 'İncele' : 'Detay'}</button></td></tr>)}</tbody></table></div> : <div className="admin-empty"><ShieldCheck /><strong>Bu durumda şikayet yok</strong><span>Yeni şikayetler burada ve bildirim merkezinde görünür.</span></div>}
    </section>
    {selected && <div className="admin-payment-modal" onMouseDown={() => !busy && setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="report-review-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>{REPORT_TARGET_LABELS[selected.targetType]} şikayeti</span><h2 id="report-review-title">{reportReasonLabel(selected.reason)}</h2></div><button onClick={() => setSelected(null)} aria-label="Pencereyi kapat">×</button></header>
      <div className="payment-review-summary"><span>Hedef<strong>{selected.targetName || '—'}</strong></span><span>Bildiren<strong>{selected.reporterName || 'Silinmiş hesap'}</strong></span><span>Tarih<strong>{formatDate(selected.createdAt)}</strong></span><span>Hedefe açık şikayet<strong>{selected.openReportsAgainstTarget}</strong></span></div>
      <Evidence report={selected} />
      {selected.details && <div className="report-evidence"><small>Bildirenin açıklaması</small><p>{selected.details}</p></div>}
      {selected.status === 'open' ? <>
        <label><span>Karar notu (iç kayıt)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Yapılan inceleme ve karar" /></label>
        {selected.targetType === 'message' && !selected.messageDeleted && <label className="producer-scope-check"><input type="checkbox" checked={removeMessage} onChange={(event) => setRemoveMessage(event.target.checked)} /><span>İşlem yapıldığında mesajı sınıf sohbetinden kaldır</span></label>}
        <div className="payment-review-actions"><button className="is-reject" disabled={Boolean(busy)} onClick={() => decide('dismissed')}>{busy === 'dismissed' ? <LoaderCircle className="is-spinning" /> : <XCircle />} İhlal yok</button><button className="is-approve" disabled={Boolean(busy)} onClick={() => decide('resolved')}>{busy === 'resolved' ? <LoaderCircle className="is-spinning" /> : <CheckCircle2 />} İşlem yapıldı</button></div>
      </> : <div className="report-evidence"><small>{selected.resolverName || 'Yönetici'} · {formatDate(selected.resolvedAt)}</small><p>{selected.resolutionNote || 'Karar notu yok.'}</p></div>}
    </section></div>}
  </div>;
}
