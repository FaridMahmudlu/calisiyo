'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, LoaderCircle, RefreshCw, SearchCheck, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const FILTERS = [
  ['awaiting_review', 'İnceleme'], ['payment_link_ready', 'Ödeme bekliyor'],
  ['approved', 'Onaylandı'], ['rejected', 'Reddedildi'], [null, 'Tümü'],
];
const formatMoney = (value, currency = 'TRY') => new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value || 0));
const formatDate = (value) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const periodLabel = (value) => value === 'yks_2027' ? '19 Ağustos 2027’ye kadar' : value === 'six_months' ? '6 ay' : value;

export default function AdminPaymentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState('awaiting_review');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_billing_orders', { p_status: filter, p_limit: 100 });
    setLoading(false);
    if (error) return setNotice({ type: 'error', message: error.message });
    setOrders(data || []);
  }, [filter, supabase]);

  useEffect(() => { const timer = window.setTimeout(loadOrders, 0); return () => window.clearTimeout(timer); }, [loadOrders]);

  const review = async (decision) => {
    if (!selected) return;
    if (decision === 'approve' && reference.trim().length < 4) return setNotice({ type: 'error', message: 'iyzico panelindeki benzersiz ödeme referansını gir.' });
    setBusy(decision);
    const { error } = await supabase.rpc('admin_review_billing_order', {
      p_order_id: selected.id, p_decision: decision, p_payment_reference: reference.trim() || null, p_note: note.trim() || null,
    });
    setBusy('');
    if (error) return setNotice({ type: 'error', message: error.message });
    setNotice({ type: 'success', message: decision === 'approve' ? 'Sipariş onaylandı ve paket etkinleştirildi.' : 'Sipariş reddedildi.' });
    setSelected(null); setReference(''); setNote('');
    await loadOrders();
  };

  return <div className="admin-dashboard admin-payments-page">
    {notice && <div className={`admin-notice is-${notice.type}`} role="status">{notice.type === 'success' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}{notice.message}</div>}
    <section className="admin-page-heading"><div><span><CreditCard size={15} /> Ödeme yönetimi</span><h1>iyzico siparişleri</h1><p>Otomatik doğrulanmayan ödemeleri iyzico panelindeki benzersiz referansla güvenli biçimde incele.</p></div><div><button className="admin-refresh" onClick={loadOrders}><RefreshCw size={15} /> Yenile</button></div></section>
    <section className="admin-card admin-payment-queue">
      <header><div><span>Sipariş kuyruğu</span><h2>Duruma göre ödeme kayıtları</h2></div><div className="admin-range">{FILTERS.map(([value, label]) => <button key={label} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div></header>
      {loading ? <div className="admin-detail-loading"><LoaderCircle className="is-spinning" /> Siparişler yükleniyor…</div> : orders.length ? <div className="admin-table-wrap"><table><thead><tr><th>Sipariş / kullanıcı</th><th>Paket</th><th>Tutar</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.orderNumber}</strong><small>{order.fullName || 'Öğrenci'} · {order.email}</small></td><td>{order.planName}<small>{periodLabel(order.billingPeriod)}</small></td><td><strong>{formatMoney(order.amount, order.currency)}</strong></td><td><span className={`payment-state is-${order.status}`}>{order.status}</span></td><td>{formatDate(order.claimedAt || order.createdAt)}</td><td><button onClick={() => { setSelected(order); setReference(order.paymentReference || ''); setNote(order.decisionNote || ''); }}>{order.status === 'awaiting_review' ? 'İncele' : 'Detay'}</button></td></tr>)}</tbody></table></div> : <div className="admin-empty"><SearchCheck /><strong>Bu durumda sipariş yok</strong><span>Filtreyi değiştirebilir veya kuyruğu yenileyebilirsin.</span></div>}
    </section>
    {selected && <div className="admin-payment-modal" onMouseDown={() => !busy && setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="payment-review-title" onMouseDown={(event) => event.stopPropagation()}><header><div><span>Güvenli inceleme</span><h2 id="payment-review-title">{selected.orderNumber}</h2></div><button onClick={() => setSelected(null)} aria-label="Pencereyi kapat">×</button></header><div className="payment-review-summary"><span>Kullanıcı<strong>{selected.fullName || selected.email}</strong></span><span>Paket<strong>{selected.planName} · {periodLabel(selected.billingPeriod)}</strong></span><span>Tutar<strong>{formatMoney(selected.amount, selected.currency)}</strong></span></div>{selected.paymentUrl && <a className="payment-provider-link" href={selected.paymentUrl} target="_blank" rel="noopener noreferrer">iyzico bağlantısını aç <ExternalLink size={14} /></a>}<label><span>iyzico ödeme referansı</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="iyzico panelindeki benzersiz referans" disabled={selected.status !== 'awaiting_review'} /></label><label><span>İnceleme notu</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tutar, kullanıcı ve sipariş eşleşmesi…" disabled={selected.status !== 'awaiting_review'} /></label>{selected.status === 'awaiting_review' && <div className="payment-review-actions"><button className="is-reject" disabled={busy} onClick={() => review('reject')}>{busy === 'reject' ? <LoaderCircle className="is-spinning" /> : <XCircle />} Reddet</button><button className="is-approve" disabled={busy || reference.trim().length < 4} onClick={() => review('approve')}>{busy === 'approve' ? <LoaderCircle className="is-spinning" /> : <CheckCircle2 />} Onayla ve etkinleştir</button></div>}<p className="payment-review-warning">Onay vermeden önce iyzico panelinde tutar, sipariş ve ödeme durumunu doğrula. Bu işlem kullanıcıya ücretli erişim verir ve denetim kaydına yazılır.</p></section></div>}
  </div>;
}
