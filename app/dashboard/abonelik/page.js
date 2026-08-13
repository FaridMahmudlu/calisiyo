'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Check, CheckCircle2, Clock3, CreditCard,
  ExternalLink, LoaderCircle, LockKeyhole, ReceiptText, ShieldCheck,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { BILLING_PERIODS, formatTry, getPublicPlan, PUBLIC_PLANS } from '@/lib/billing/plans';
import { useUser } from '../layout';
import './billing.css';

const STATUS = {
  created: ['Hazırlanıyor', 'muted'],
  payment_link_ready: ['Ödeme bekleniyor', 'warning'],
  awaiting_review: ['Doğrulanıyor', 'warning'],
  approved: ['Etkinleştirildi', 'success'],
  rejected: ['Doğrulanamadı', 'danger'],
  cancelled: ['İptal edildi', 'muted'],
  refunded: ['İade edildi', 'muted'],
  expired: ['Süresi doldu', 'muted'],
};

export default function BillingPage() {
  const { currentPlan: contextPlan, reloadAccount } = useUser();
  const [period, setPeriod] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [acceptImmediate, setAcceptImmediate] = useState(false);
  const [confirmGuardian, setConfirmGuardian] = useState(false);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);

  const loadBilling = useCallback(async () => {
    const response = await fetch('/api/billing', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'Paket bilgileri yüklenemedi.');
    setBilling(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedPlan = params.get('plan');
      const requestedPeriod = params.get('period');
      if (['odak', 'zirve'].includes(requestedPlan)) setSelectedPlan(requestedPlan);
      if (['monthly', 'annual'].includes(requestedPeriod)) setPeriod(requestedPeriod);
      loadBilling().catch((error) => {
        setNotice({ type: 'error', message: error.message });
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBilling]);

  const currentPlan = billing?.currentPlan || contextPlan;
  const selected = useMemo(() => selectedPlan ? getPublicPlan(selectedPlan) : null, [selectedPlan]);

  const startCheckout = async () => {
    if (!selected || !billing?.checkoutEnabled) return;
    if (!acceptImmediate || !confirmGuardian) {
      setNotice({ type: 'error', message: 'Ödemeye geçmek için iki zorunlu onayı da tamamla.' });
      return;
    }
    setBusy('checkout');
    setNotice(null);
    const response = await fetch('/api/billing/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planCode: selected.code,
        billingPeriod: period,
        acceptImmediateService: acceptImmediate,
        confirmAdultOrGuardian: confirmGuardian,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok || !result.ok) {
      setNotice({ type: 'error', message: result.message || 'Ödeme bağlantısı oluşturulamadı.' });
      return;
    }
    await loadBilling();
    setNotice({ type: 'success', message: 'Siparişin hazır. İyzico ödeme sayfası yeni sekmede açılıyor.' });
    window.open(result.order.paymentUrl, '_blank', 'noopener,noreferrer');
    setSelectedPlan(null);
  };

  const verifyOrder = async (orderId) => {
    setBusy(orderId);
    setNotice(null);
    const response = await fetch('/api/billing/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok || !result.ok) {
      setNotice({ type: 'error', message: result.message || 'Ödeme doğrulanamadı.' });
      return;
    }
    setNotice({ type: result.status === 'approved' ? 'success' : 'info', message: result.message || 'Ödemen doğrulandı ve planın etkinleşti.' });
    await Promise.all([loadBilling(), reloadAccount?.()]);
  };

  if (loading) return <div className="billing-loading"><LoaderCircle /><span>Paketlerin hazırlanıyor…</span></div>;

  return (
    <div className="billing-page">
      <PageHeader eyebrow="Paket ve ödemeler" title="Çalışma alanını ihtiyacına göre büyüt" description="Paketini, erişim süreni ve İyzico siparişlerini tek yerden yönet." />
      {notice && <div className={`billing-notice is-${notice.type}`} role="status">{notice.type === 'success' ? <CheckCircle2 /> : <ShieldCheck />}<span>{notice.message}</span><button onClick={() => setNotice(null)}>Kapat</button></div>}

      <section className="billing-current">
        <div className="billing-current-icon"><CreditCard /></div>
        <div><span>Mevcut planın</span><h2>{currentPlan?.name || 'Başlangıç'}</h2><p>{currentPlan?.periodEnd ? `${new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(currentPlan.periodEnd))} tarihine kadar etkin` : 'Süresiz ücretsiz temel erişim'}</p></div>
        <span className={`billing-plan-badge is-${currentPlan?.code || 'baslangic'}`}>{currentPlan?.status === 'active' ? 'Etkin' : 'Ücretsiz'}</span>
      </section>

      <section className="billing-plans-panel">
        <div className="billing-section-head"><div><span>Paketleri karşılaştır</span><h2>Net limitler, otomatik yenileme yok</h2></div><div className="billing-period">{Object.entries(BILLING_PERIODS).map(([key, item]) => <button key={key} className={period === key ? 'is-active' : ''} onClick={() => setPeriod(key)}>{item.label}{key === 'annual' && <small>2 ay avantaj</small>}</button>)}</div></div>
        <div className="billing-plan-grid">
          {PUBLIC_PLANS.map((plan) => {
            const price = period === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const active = currentPlan?.code === plan.code;
            return <article key={plan.code} className={`billing-plan-card is-${plan.accent} ${active ? 'is-current' : ''}`}>
              <div><span>{plan.tagline}</span><h3>{plan.name}</h3><p>{plan.description}</p></div>
              <strong className="billing-plan-price">{price ? formatTry(price) : 'Ücretsiz'}<small>{price ? BILLING_PERIODS[period].suffix : 'süresiz'}</small></strong>
              <ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
              {active ? <button disabled><CheckCircle2 /> Mevcut planın</button> : plan.code === 'baslangic' ? <button disabled>Ücretsiz temel plan</button> : <button onClick={() => { setSelectedPlan(plan.code); setAcceptImmediate(false); setConfirmGuardian(false); }}><ArrowUpRight /> Bu planı seç</button>}
            </article>;
          })}
        </div>
      </section>

      <section className="billing-orders">
        <div className="billing-section-head"><div><span>Sipariş geçmişi</span><h2>Ödemelerin ve erişim durumun</h2></div><ReceiptText /></div>
        {billing?.orders?.length ? <div className="billing-order-list">{billing.orders.map((order) => {
          const meta = STATUS[order.status] || ['Bilinmiyor', 'muted'];
          return <article key={order.id}>
            <div><strong>{order.order_number}</strong><span>{getPublicPlan(order.plan_code).name} · {BILLING_PERIODS[order.billing_period]?.label}</span><time>{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.created_at))}</time></div>
            <strong>{formatTry(order.amount)}</strong><span className={`order-status is-${meta[1]}`}>{meta[0]}</span>
            {['payment_link_ready', 'awaiting_review'].includes(order.status) && <div className="order-actions"><a href={order.iyzico_link_url} target="_blank" rel="noopener noreferrer">Ödeme sayfası <ExternalLink /></a><button disabled={busy === order.id} onClick={() => verifyOrder(order.id)}>{busy === order.id ? <LoaderCircle className="is-spinning" /> : <ShieldCheck />} Ödemeyi doğrula</button></div>}
          </article>;
        })}</div> : <div className="billing-empty"><ReceiptText /><strong>Henüz ücretli siparişin yok</strong><p>Paket seçtiğinde sipariş ve ödeme durumu burada görünür.</p></div>}
      </section>

      {selected && <div className="billing-modal-backdrop" role="presentation" onMouseDown={() => !busy && setSelectedPlan(null)}><section className="billing-checkout" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="checkout-heading"><span><LockKeyhole /></span><div><small>Güvenli sipariş özeti</small><h2 id="checkout-title">{selected.name} · {BILLING_PERIODS[period].label}</h2></div><button onClick={() => setSelectedPlan(null)} aria-label="Pencereyi kapat">×</button></div>
        <div className="checkout-summary"><span>Dijital erişim</span><strong>{formatTry(period === 'annual' ? selected.annualPrice : selected.monthlyPrice)}</strong><small>Vergiler dahil toplam tutar · otomatik yenileme yok</small></div>
        {!billing?.checkoutEnabled && <div className="checkout-disabled"><Clock3 /><div><strong>Satışa hazırlık tamamlanıyor</strong><p>{billing?.checkoutMessage} Bu sırada Başlangıç planını ücretsiz kullanabilirsin.</p></div></div>}
        <div className="checkout-links"><a href="/on-bilgilendirme" target="_blank">Ön Bilgilendirme Formu</a><a href="/mesafeli-satis" target="_blank">Mesafeli Satış Sözleşmesi</a><a href="/iptal-iade" target="_blank">İptal ve İade</a><a href="/kvkk" target="_blank">KVKK</a></div>
        <label><input type="checkbox" checked={confirmGuardian} onChange={(event) => setConfirmGuardian(event.target.checked)} /><span>18 yaşındayım veya veli/kanuni temsilci onayıyla işlem yapıyorum; ön bilgilendirme ve sözleşmeleri okudum.</span></label>
        <label><input type="checkbox" checked={acceptImmediate} onChange={(event) => setAcceptImmediate(event.target.checked)} /><span>Ödeme doğrulandığında dijital hizmetin hemen başlamasını istiyorum; ifasına başlanan dijital hizmet için cayma hakkı istisnası uygulanabileceğini biliyorum.</span></label>
        <button className="checkout-pay" disabled={!billing?.checkoutEnabled || busy === 'checkout' || !acceptImmediate || !confirmGuardian} onClick={startCheckout}>{busy === 'checkout' ? <LoaderCircle className="is-spinning" /> : <ShieldCheck />} Ödeme yükümlülüğü doğuran siparişi onayla</button>
        <p className="checkout-security"><ShieldCheck /> İyzico’ya yönlendirilirsin; kart bilgilerin calisiyo sunucularına girmez.</p>
      </section></div>}
    </div>
  );
}
