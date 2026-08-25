'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, CircleDollarSign, Clock3, Copy, Gift, LoaderCircle, ShieldCheck, WalletCards } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import './producer.css';

const money = (minor) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(minor || 0) / 100);
const date = (value) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value)) : '—';
const STATUS = {
  pending: '14 günlük bekleme süresinde', available: 'Ödenebilir', reserved: 'Ödeme için ayrıldı', paid: 'Ödendi',
  cancelled: 'Kazanç dışı', reversed: 'İade nedeniyle geri alındı', review_required: 'İnceleniyor',
};

export default function ContentProducerPage() {
  const [producer, setProducer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/content-producer', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'Üretici bilgilerin yüklenemedi.');
    setProducer(result.producer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((error) => setNotice(error.message)).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const copyCode = async () => {
    if (!producer?.code) return;
    try { await navigator.clipboard.writeText(producer.code); setNotice('İndirim kodun kopyalandı.'); }
    catch { setNotice('Kod kopyalanamadı; seçip manuel olarak kopyalayabilirsin.'); }
  };

  if (loading) return <div className="producer-loading"><LoaderCircle className="is-spinning" /> Üretici panelin hazırlanıyor…</div>;
  if (!producer || producer.status === 'not_enrolled') return <div className="producer-page"><PageHeader eyebrow="Program" title="İçerik Üretici Programı" description="Bu alan yalnızca programı yönetici tarafından etkinleştirilen hesaplarda açılır." /></div>;

  return <div className="producer-page">
    <PageHeader eyebrow="İçerik Üretici Programı" title="Üret, paylaş, kazancını şeffafça izle" description="Yalnızca doğrulanmış Shopier satışlarından oluşan kazançlarını ve ödeme geçmişini burada görürsün." />
    {notice && <div className="producer-notice" role="status">{notice}<button onClick={() => setNotice('')}>Kapat</button></div>}
    {producer.status === 'suspended' && <div className="producer-warning"><ShieldCheck /><div><strong>Program erişimin askıda</strong><p>Üretici grant’in ve kod ilişkilendirmen durduruldu. Satın aldığın ücretli plan varsa etkilenmez.</p></div></div>}
    <section className="producer-hero">
      <div><span><BadgeCheck /> İndirim Kodun</span><h2>{producer.code || producer.codePreview || 'Hazırlanıyor'}</h2><p>{producer.code ? 'Takipçilerin bu kodla Shopier ödeme ekranında %20 indirim kazanır.' : 'İndirim kodun hazırlanıyor. Shopier ürün kapsamı güvenli biçimde doğrulanıyor.'}</p><small><Gift /> Ücretsiz {producer.grantPlanCode === 'plus_2028' ? 'YKS 2028' : 'YKS 2027'} Plus · {date(producer.grantEndsAt)} tarihine kadar</small></div>
      <button onClick={copyCode} disabled={!producer.code}><Copy /> Kodu kopyala</button>
    </section>
    <section className="producer-model"><div><span>Kazanç modelin</span><h2>Basit, sabit ve denetlenebilir</h2></div><p>İlk 3 doğrulanmış satışında satış başına <strong>₺1.000</strong>, 4. satıştan itibaren satış başına <strong>₺500</strong> kazanırsın. Kazançlar, iade kontrolü için 14 gün bekledikten sonra ödenebilir olur.</p></section>
    <section className="producer-metrics">
      <article><span><CircleDollarSign /></span><small>Ödenebilir kazanç</small><strong>{money(producer.availableMinor)}</strong><p>14 günlük beklemesi biten net ledger tutarı</p></article>
      <article><span><Clock3 /></span><small>Bekleyen kazanç</small><strong>{money(producer.pendingMinor)}</strong><p>İade kontrol süresi devam eden satışlar</p></article>
      <article><span><WalletCards /></span><small>Toplam ödenen</small><strong>{money(producer.paidMinor)}</strong><p>Manuel banka transferiyle tamamlanan ödemeler</p></article>
      <article><span><BadgeCheck /></span><small>Geçerli satış</small><strong>{producer.lifetimeQualifiedSales || 0}</strong><p>Kendi alımların satış sırasına dahil edilmez</p></article>
      <article><span><ShieldCheck /></span><small>İptal/iade edilen</small><strong>{money(producer.reversedMinor)}</strong><p>Ledger’da geri alınan veya iptal edilen kazanç</p></article>
    </section>
    <section className="producer-grid">
      <article className="producer-panel"><header><div><span>Kazançlar</span><h2>Son doğrulanmış hareketler</h2></div></header>
        {producer.recentRewards?.length ? <div className="producer-list">{producer.recentRewards.map((reward) => <div key={reward.id}><span><strong>{reward.sequence ? `${reward.sequence}. satış` : 'Kazanç dışı işlem'}</strong><small>{date(reward.createdAt)} · {STATUS[reward.status] || reward.status}</small></span><b>{money(reward.amountMinor)}</b></div>)}</div> : <div className="producer-empty">Henüz doğrulanmış satış kazancı yok.</div>}
      </article>
      <article className="producer-panel"><header><div><span>Ödemeler</span><h2>Payout geçmişi</h2></div></header>
        {producer.payouts?.length ? <div className="producer-list">{producer.payouts.map((payout) => <div key={payout.id}><span><strong>{payout.status === 'paid' ? 'Ödendi' : 'Ödeme hazırlanıyor'}</strong><small>{date(payout.paidAt || payout.createdAt)}</small></span><b>{money(payout.amountMinor)}</b></div>)}</div> : <div className="producer-empty">Henüz oluşturulmuş ödeme kaydı yok.</div>}
      </article>
    </section>
    <p className="producer-footnote"><ShieldCheck /> Müşteri adı, e-posta veya başka kişisel bilgiler bu panelde gösterilmez. Kazançlar yalnızca Shopier’den sunucu tarafında doğrulanan ödemelerden oluşur.</p>
  </div>;
}
