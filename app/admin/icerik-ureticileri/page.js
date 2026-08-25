'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck, BookOpenText, CircleDollarSign, KeyRound, LoaderCircle,
  RefreshCw, Search, ShieldCheck, UserPlus, WalletCards,
} from 'lucide-react';

const money = (minor) => new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY',
}).format(Number(minor || 0) / 100);

const date = (value) => value
  ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value))
  : '—';

export default function ContentProducerAdminPage() {
  const [producers, setProducers] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [providerId, setProviderId] = useState('');
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [ledger, setLedger] = useState(null);

  const load = useCallback(async (search = '') => {
    const response = await fetch(`/api/admin/content-producers${search ? `?q=${encodeURIComponent(search)}` : ''}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'Program bilgileri yüklenemedi.');
    setProducers(result.producers || []);
    setUsers(result.users || []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load()
        .catch((error) => setNotice({ type: 'error', message: error.message }))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const act = async (action, payload) => {
    setBusy(`${action}:${payload.userId || payload.payoutId}`);
    setNotice(null);
    const response = await fetch('/api/admin/content-producers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok || !result.ok) {
      setNotice({ type: 'error', message: result.message || 'İşlem tamamlanamadı.' });
      return false;
    }
    setNotice({ type: 'success', message: result.message });
    setConfirming(null);
    setProviderId('');
    setScopeConfirmed(false);
    await load(query);
    return true;
  };

  const loadLedger = async (producer) => {
    setBusy(`ledger:${producer.userId}`);
    const response = await fetch(`/api/admin/content-producers?ledgerUserId=${encodeURIComponent(producer.userId)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok || !result.ok) return setNotice({ type: 'error', message: result.message || 'Hareketler yüklenemedi.' });
    setLedger({ producer, ...result.ledger });
  };

  const rotateCode = async (producer) => {
    if (!window.confirm('Bu işlem eski kodu veritabanında emekliye ayırır. Varsa eski Shopier kodunu ayrıca pasifleştirmen gerekir. Devam edilsin mi?')) return;
    const reason = window.prompt('Kod değiştirme nedeni (en az 5 karakter)');
    if (reason) await act('rotate_code', { userId: producer.userId, reason });
  };

  const markPaid = async (payout) => {
    const reference = window.prompt('Banka transferi referansı');
    if (reference) await act('mark_paid', { payoutId: payout.id, reference });
  };

  const addAdjustment = async (producer) => {
    const amountText = window.prompt('Düzeltme tutarı (TRY). Borç için eksi değer gir.');
    if (amountText === null) return;
    const amount = Number(String(amountText).replace(',', '.'));
    if (!Number.isFinite(amount) || amount === 0 || Math.round(amount * 100) !== amount * 100) {
      return setNotice({ type: 'error', message: 'En fazla iki ondalıklı, sıfırdan farklı bir TRY tutarı gir.' });
    }
    const reason = window.prompt('Düzeltme nedeni (en az 5 karakter)');
    if (reason) await act('adjustment', { userId: producer.userId, amountMinor: Math.round(amount * 100), reason });
  };

  if (loading) return <div className="admin-detail-loading"><LoaderCircle className="is-spinning" /> İçerik Üretici Programı yükleniyor…</div>;

  return <div className="admin-dashboard producer-admin-page">
    {notice && <div className={`admin-notice is-${notice.type}`} role="status">{notice.message}</div>}
    <section className="admin-page-heading">
      <div><span><CircleDollarSign size={16} /> İçerik Üretici Programı</span><h1>Üretici ve kazanç yönetimi</h1><p>Ücretsiz grant, Shopier kod bağı, satış sırası ve banka payout kayıtlarını ayrı ve denetlenebilir şekilde yönet.</p></div>
      <button className="admin-refresh" onClick={() => load(query)}><RefreshCw /> Yenile</button>
    </section>

    <section className="admin-card producer-enroll-card">
      <header><div><span>Yeni üretici</span><h2>Mevcut kullanıcıyı programa ekle</h2><p>Bu işlem kullanıcıya admin yetkisi vermez; yalnızca seçilen sabit dönem grant’ini açar.</p></div></header>
      <form onSubmit={(event) => { event.preventDefault(); load(query); }}><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad veya e-posta ile ara" minLength={2} /><button>Ara</button></form>
      {users.length > 0 && <div className="producer-user-results">{users.map((user) => <div key={user.id}><span><strong>{user.name}</strong><small>{user.email}</small></span><div><button disabled={busy} onClick={() => act('activate', { userId: user.id, planCode: 'plus_2027' })}><UserPlus /> YKS 2027</button><button disabled={busy} onClick={() => act('activate', { userId: user.id, planCode: 'plus_2028' })}><UserPlus /> YKS 2028</button></div></div>)}</div>}
    </section>

    <section className="admin-card producer-admin-list">
      <header><div><span>Program hesapları</span><h2>Gerçek ledger özeti</h2></div><ShieldCheck /></header>
      {producers.length ? producers.map((producer) => <article key={producer.userId}>
        <div className="producer-admin-user"><span>{String(producer.name || 'Ü').charAt(0)}</span><div><strong>{producer.name}</strong><small>{producer.email}</small></div></div>
        <div><small>Kod</small><strong>{producer.code || '—'}</strong><em>{producer.promoStatus}</em></div>
        <div><small>Ücretsiz Plus</small><strong>{producer.grantPlanCode === 'plus_2028' ? 'YKS 2028' : 'YKS 2027'}</strong><em>{date(producer.grantEndsAt)} tarihine kadar</em></div>
        <div><small>Satış</small><strong>{producer.lifetimeSales || 0}</strong><em>{money(producer.availableMinor)} ödenebilir</em></div>
        <div><small>Ödenen</small><strong>{money(producer.paidMinor)}</strong><em>{money(producer.pendingMinor)} bekliyor</em></div>
        <div className="producer-admin-actions">
          {producer.promoStatus !== 'active' && <><button onClick={() => act('sync_code', { userId: producer.userId, code: producer.code })} disabled={Boolean(busy)}><RefreshCw /> Shopier senkronunu dene</button><button onClick={() => setConfirming(producer)}><BadgeCheck /> Provider kimliğiyle doğrula</button></>}
          <button onClick={() => loadLedger(producer)} disabled={Boolean(busy)}><BookOpenText /> Ledger</button>
          <button onClick={() => addAdjustment(producer)} disabled={Boolean(busy)}><CircleDollarSign /> Düzeltme ekle</button>
          <button onClick={() => rotateCode(producer)} disabled={Boolean(busy)}><KeyRound /> Kodu değiştir</button>
          {producer.status === 'active'
            ? <button className="is-danger" onClick={() => { const reason = window.prompt('Askıya alma nedeni'); if (reason) act('suspend', { userId: producer.userId, reason }); }}>Askıya al</button>
            : <><button onClick={() => act('activate', { userId: producer.userId, planCode: 'plus_2027' })}>YKS 2027 ile etkinleştir</button><button onClick={() => act('activate', { userId: producer.userId, planCode: 'plus_2028' })}>YKS 2028 ile etkinleştir</button></>}
          {producer.reservedPayout
            ? <button className="is-primary" onClick={() => markPaid(producer.reservedPayout)}><WalletCards /> {money(producer.reservedPayout.amountMinor)} ödendi</button>
            : <button onClick={() => act('create_payout', { userId: producer.userId })}><WalletCards /> Payout oluştur</button>}
        </div>
      </article>) : <div className="admin-empty"><CircleDollarSign /><strong>Henüz içerik üreticisi yok</strong></div>}
    </section>

    {confirming && <div className="admin-payment-modal" onMouseDown={() => setConfirming(null)}><section onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="promo-dialog-title"><header><div><span>Shopier doğrulaması</span><h2 id="promo-dialog-title">{confirming.code}</h2></div><button onClick={() => setConfirming(null)} aria-label="Pencereyi kapat">×</button></header><p className="payment-review-warning">Shopier panelinde %20, TRY ve yalnızca iki calisiyo ürününe uygulanacak şekilde oluşturduğun kodun provider kimliğini gir.</p><label><span>Shopier indirim kimliği</span><input value={providerId} onChange={(event) => setProviderId(event.target.value)} /></label><label className="producer-scope-check"><input type="checkbox" checked={scopeConfirmed} onChange={(event) => setScopeConfirmed(event.target.checked)} /><span>Kodun yalnızca ürün 50041880 ve 50041981 için geçerli olduğunu Shopier panelinde doğruladım.</span></label><button className="producer-confirm-button" disabled={!scopeConfirmed || providerId.length < 2 || busy} onClick={() => act('confirm_code', { userId: confirming.userId, code: confirming.code, providerDiscountId: providerId, scopeConfirmed: true })}>Doğrula ve etkinleştir</button></section></div>}

    {ledger && <div className="admin-payment-modal" onMouseDown={() => setLedger(null)}><section className="producer-ledger-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ledger-dialog-title"><header><div><span>Finansal hareketler</span><h2 id="ledger-dialog-title">{ledger.producer.name}</h2></div><button onClick={() => setLedger(null)} aria-label="Pencereyi kapat">×</button></header><div className="producer-ledger-section"><h3>Satış ödülleri</h3>{ledger.rewards?.length ? ledger.rewards.map((item) => <article key={item.id}><div><strong>{item.orderNumber}</strong><small>Satış #{item.sequence || '—'} · {item.status}</small></div><span>{money(item.rewardAmountMinor)}</span></article>) : <p>Henüz ödül hareketi yok.</p>}</div><div className="producer-ledger-section"><h3>Düzeltmeler</h3>{ledger.adjustments?.length ? ledger.adjustments.map((item) => <article key={item.id}><div><strong>{item.kind}</strong><small>{item.reason}</small></div><span>{money(item.amountMinor)}</span></article>) : <p>Düzeltme yok.</p>}</div><div className="producer-ledger-section"><h3>Payout geçmişi</h3>{ledger.payouts?.length ? ledger.payouts.map((item) => <article key={item.id}><div><strong>{item.status}</strong><small>{item.paymentReference || date(item.createdAt)}</small></div><span>{money(item.amountMinor)}</span></article>) : <p>Henüz payout yok.</p>}</div></section></div>}
  </div>;
}
