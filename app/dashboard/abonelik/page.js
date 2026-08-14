'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, CheckCircle2, Clock3, CreditCard, ExternalLink, LoaderCircle, LockKeyhole, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { formatTry, getBillingVariant, getPublicPlan, PLUS_VARIANTS, PUBLIC_PLANS } from '@/lib/billing/plans';
import { useUser } from '../layout';
import './billing.css';

const STATUS = {
  created: ['Hazırlanıyor', 'muted'], payment_link_ready: ['Ödeme bekleniyor', 'warning'],
  awaiting_review: ['Doğrulanıyor', 'warning'], approved: ['Etkinleştirildi', 'success'],
  rejected: ['Doğrulanamadı', 'danger'], cancelled: ['İptal edildi', 'muted'],
  refunded: ['İade edildi', 'muted'], expired: ['Süresi doldu', 'muted'],
};

export default function BillingPage() {
  const { currentPlan: contextPlan, reloadAccount } = useUser();
  const [selectedCode, setSelectedCode] = useState('plus_2027');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
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
      const requested = getBillingVariant(params.get('plan'));
      if (requested) setSelectedCode(requested.code);
      loadBilling().catch((error) => { setNotice({ type: 'error', message: error.message }); setLoading(false); });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBilling]);

  const currentPlan = billing?.currentPlan || contextPlan;
  const selected = useMemo(() => getBillingVariant(selectedCode) || PLUS_VARIANTS[0], [selectedCode]);
  const trialActive = currentPlan?.status === 'trialing' && currentPlan?.trialEndsAt;

  const startTrial = async () => {
    setBusy('trial'); setNotice(null);
    const response = await fetch('/api/billing/trial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planCode: selected.code }) });
    const result = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok || !result.ok) return setNotice({ type: 'error', message: result.message || 'Ücretsiz deneme başlatılamadı.' });
    setNotice({ type: 'success', message: '7 günlük calisiyo plus denemen başladı. Süre sonunda otomatik ücret alınmaz.' });
    await Promise.all([loadBilling(), reloadAccount?.()]);
  };

  const startCheckout = async () => {
    if (!billing?.checkoutEnabled) return;
    if (!acceptImmediate || !confirmGuardian) return setNotice({ type: 'error', message: 'Ödemeye geçmek için iki zorunlu onayı da tamamla.' });
    setBusy('checkout'); setNotice(null);
    const response = await fetch('/api/billing/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planCode: selected.code, billingPeriod: selected.period, acceptImmediateService: true, confirmAdultOrGuardian: true }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok || !result.ok) return setNotice({ type: 'error', message: result.message || 'Ödeme bağlantısı oluşturulamadı.' });
    await loadBilling();
    window.open(result.order.paymentUrl, '_blank', 'noopener,noreferrer');
    setCheckoutOpen(false);
  };

  const verifyOrder = async (orderId) => {
    setBusy(orderId); setNotice(null);
    const response = await fetch('/api/billing/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
    const result = await response.json().catch(() => ({}));
    setBusy('');
    if (!response.ok || !result.ok) return setNotice({ type: 'error', message: result.message || 'Ödeme doğrulanamadı.' });
    setNotice({ type: result.status === 'approved' ? 'success' : 'info', message: result.message || 'Ödeme kontrol edildi.' });
    await Promise.all([loadBilling(), reloadAccount?.()]);
  };

  if (loading) return <div className="billing-loading"><LoaderCircle className="is-spinning" /><span>Paketlerin hazırlanıyor…</span></div>;

  return <div className="billing-page">
    <PageHeader eyebrow="Paketler" title="İki plan, tek net seçim" description="Ücretsiz devam et veya sınav yılına uygun calisiyo plus erişimini 7 gün dene." />
    {notice && <div className={`billing-notice is-${notice.type}`} role="status"><ShieldCheck /><span>{notice.message}</span><button onClick={() => setNotice(null)}>Kapat</button></div>}

    <section className="billing-current">
      <div className="billing-current-icon"><CreditCard /></div>
      <div><span>Mevcut planın</span><h2>{currentPlan?.name || 'calisiyo ücretsiz'}</h2><p>{trialActive ? `Deneme ${new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(currentPlan.trialEndsAt))} tarihinde biter` : currentPlan?.periodEnd ? `${new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(currentPlan.periodEnd))} tarihine kadar etkin` : 'Süresiz ücretsiz temel erişim'}</p></div>
      <span className={`billing-plan-badge is-${currentPlan?.code || 'baslangic'}`}>{trialActive ? 'Deneme' : currentPlan?.status === 'active' ? 'Etkin' : 'Ücretsiz'}</span>
    </section>

    <section className="billing-plans-panel">
      <div className="billing-section-head"><div><span>Paketler</span><h2>Karmaşık karşılaştırma yok</h2></div><ShieldCheck /></div>
      <div className="billing-plan-grid">
        <article className={`billing-plan-card is-${PUBLIC_PLANS[0].accent} ${currentPlan?.code === 'baslangic' ? 'is-current' : ''}`}>
          <div><span>{PUBLIC_PLANS[0].tagline}</span><h3>{PUBLIC_PLANS[0].name}</h3><p>{PUBLIC_PLANS[0].description}</p></div>
          <strong className="billing-plan-price">Ücretsiz<small>süresiz</small></strong>
          <ul>{PUBLIC_PLANS[0].features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
          <button disabled><CheckCircle2 /> {currentPlan?.code === 'baslangic' ? 'Mevcut planın' : 'Her zaman kullanılabilir'}</button>
        </article>
        <article className="billing-plan-card is-blue">
          <div><span>{PUBLIC_PLANS[1].tagline}</span><h3>{PUBLIC_PLANS[1].name}</h3><p>{PUBLIC_PLANS[1].description}</p></div>
          <div className="billing-period" role="group" aria-label="Plus sınav yılı">
            {PLUS_VARIANTS.map((variant) => <button key={variant.code} className={selected.code === variant.code ? 'is-active' : ''} onClick={() => setSelectedCode(variant.code)}>{variant.label}<small>{variant.duration}</small></button>)}
          </div>
          <strong className="billing-plan-price">{formatTry(selected.price)}<small>{selected.duration}</small></strong>
          <p className="pricing-equivalent">7 gün ücretsiz · süre sonunda otomatik ücret alınmaz</p>
          <ul>{PUBLIC_PLANS[1].features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
          <div className="order-actions">
            <button onClick={startTrial} disabled={busy === 'trial' || currentPlan?.code !== 'baslangic'}>{busy === 'trial' ? <LoaderCircle className="is-spinning" /> : <Sparkles />} 7 gün ücretsiz dene</button>
            <button onClick={() => { setCheckoutOpen(true); setAcceptImmediate(false); setConfirmGuardian(false); }}><ArrowUpRight /> Satın al</button>
          </div>
        </article>
      </div>
      <div className="pricing-trust"><ShieldCheck /><span>Şehit ve gazi yakınlarından ücret tahsil edilmemektedir. <a href="mailto:calisiyo.destek@gmail.com">calisiyo.destek@gmail.com</a></span></div>
    </section>

    <section className="billing-orders">
      <div className="billing-section-head"><div><span>Sipariş geçmişi</span><h2>Ödemelerin ve erişim durumun</h2></div><ReceiptText /></div>
      {billing?.orders?.length ? <div className="billing-order-list">{billing.orders.map((order) => { const meta = STATUS[order.status] || ['Bilinmiyor', 'muted']; const plan = getPublicPlan(order.plan_code); return <article key={order.id}><div><strong>{order.order_number}</strong><span>{plan.name} · {plan.duration || order.billing_period}</span><time>{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.created_at))}</time></div><strong>{formatTry(order.amount)}</strong><span className={`order-status is-${meta[1]}`}>{meta[0]}</span>{['payment_link_ready', 'awaiting_review'].includes(order.status) && <div className="order-actions"><a href={order.iyzico_link_url} target="_blank" rel="noopener noreferrer">Ödeme sayfası <ExternalLink /></a><button disabled={busy === order.id} onClick={() => verifyOrder(order.id)}><ShieldCheck /> Ödemeyi doğrula</button></div>}</article>; })}</div> : <div className="billing-empty"><ReceiptText /><strong>Henüz ücretli siparişin yok</strong><p>Satın alma açıldığında sipariş ve ödeme durumu burada görünür.</p></div>}
    </section>

    {checkoutOpen && <div className="billing-modal-backdrop" role="presentation" onMouseDown={() => !busy && setCheckoutOpen(false)}><section className="billing-checkout" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="checkout-heading"><span><LockKeyhole /></span><div><small>Güvenli sipariş özeti</small><h2 id="checkout-title">calisiyo plus · {selected.label}</h2></div><button onClick={() => setCheckoutOpen(false)} aria-label="Pencereyi kapat">×</button></div>
      <div className="checkout-summary"><span>{selected.duration}</span><strong>{formatTry(selected.price)}</strong><small>Vergiler dahil toplam tutar · otomatik yenileme yok</small></div>
      {!billing?.checkoutEnabled && <div className="checkout-disabled"><Clock3 /><div><strong>Satışa hazırlık tamamlanıyor</strong><p>{billing?.checkoutMessage} Bu sırada ücretsiz planı kullanmaya devam edebilirsin.</p></div></div>}
      <div className="checkout-links"><a href="/on-bilgilendirme" target="_blank">Ön Bilgilendirme</a><a href="/mesafeli-satis" target="_blank">Mesafeli Satış</a><a href="/iptal-iade" target="_blank">İptal ve İade</a><a href="/kvkk" target="_blank">KVKK</a></div>
      <label><input type="checkbox" checked={confirmGuardian} onChange={(event) => setConfirmGuardian(event.target.checked)} /><span>18 yaşındayım veya veli/kanuni temsilci onayıyla işlem yapıyorum; sözleşmeleri okudum.</span></label>
      <label><input type="checkbox" checked={acceptImmediate} onChange={(event) => setAcceptImmediate(event.target.checked)} /><span>Ödeme doğrulandığında dijital hizmetin hemen başlamasını istiyorum.</span></label>
      <button className="checkout-pay" disabled={!billing?.checkoutEnabled || busy === 'checkout' || !acceptImmediate || !confirmGuardian} onClick={startCheckout}>{busy === 'checkout' ? <LoaderCircle className="is-spinning" /> : <ShieldCheck />} Siparişi onayla</button>
      <div className="checkout-payment-methods"><Image src="/brand/iyzico-payment-methods.svg" alt="iyzico ile öde, Visa ve Mastercard" width={429} height={32} /><p className="checkout-security"><ShieldCheck /> Kart bilgilerin calisiyo sunucularına girmez.</p></div>
    </section></div>}
  </div>;
}
