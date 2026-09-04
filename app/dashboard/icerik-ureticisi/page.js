'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck, CircleDollarSign, Clock3, Copy, Gift, LoaderCircle,
  PencilLine, RefreshCw, Send, ShieldCheck, Users, WalletCards,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useUser } from '@/app/dashboard/layout';
import './producer.css';

const money = (minor) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(minor || 0) / 100);
const date = (value) => value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value)) : '—';
const STATUS = {
  pending: '14 günlük bekleme süresinde', available: 'Ödenebilir', reserved: 'Ödeme için ayrıldı', paid: 'Ödendi',
  cancelled: 'Kazanç dışı', reversed: 'İade nedeniyle geri alındı', review_required: 'İnceleniyor',
};
const PLATFORMS = [
  ['youtube', 'YouTube'],
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
  ['other', 'Diğer'],
];

export default function ContentProducerPage() {
  const { profile } = useUser();
  const [producer, setProducer] = useState(null);
  const [application, setApplication] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [growthError, setGrowthError] = useState('');
  const [growthRange, setGrowthRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingCode, setChangingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    platform: 'youtube', profileUrl: '', audienceSize: '', contentFocus: '', motivation: '',
    preferredPlanCode: profile?.yks_year === 2028 ? 'plus_2028' : 'plus_2027',
  });
  const load = useCallback(async () => {
    const response = await fetch(`/api/content-producer?range=${growthRange}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'Üretici bilgilerin yüklenemedi.');
    setProducer(result.producer);
    setApplication(result.application || { status: 'none' });
    setGrowth(result.growth || null);
    setGrowthError(result.growthError || '');
    if (result.application && !['none', 'withdrawn'].includes(result.application.status)) {
      setForm({
        platform: result.application.platform || 'youtube',
        profileUrl: result.application.profileUrl || '',
        audienceSize: String(result.application.audienceSize ?? ''),
        contentFocus: result.application.contentFocus || '',
        motivation: result.application.motivation || '',
        preferredPlanCode: result.application.preferredPlanCode || 'plus_2027',
      });
    }
  }, [growthRange]);
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

  const changeCode = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    const response = await fetch('/api/content-producer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_code', code: codeDraft }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !result.ok) return setNotice(result.message || 'Kodun değiştirilemedi.');
    setProducer(result.producer || { ...producer, codePreview: codeDraft, selfCodeChangeUsed: true });
    setChangingCode(false);
    setNotice(result.message);
  };

  const retryCodeSync = async () => {
    setSaving(true);
    setNotice('');
    const response = await fetch('/api/content-producer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry_code_sync' }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (result.producer) setProducer(result.producer);
    setNotice(result.message || (response.ok ? 'İndirim kodun etkinleştirildi.' : 'Kodun henüz etkinleştirilemedi.'));
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    const response = await fetch('/api/content-producer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', ...form, audienceSize: Number(form.audienceSize) }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !result.ok) {
      setNotice(result.message || 'Başvurun gönderilemedi.');
      return;
    }
    setApplication(result.application);
    setNotice(result.message);
  };

  const withdrawApplication = async () => {
    setSaving(true);
    setNotice('');
    const response = await fetch('/api/content-producer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'withdraw' }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !result.ok) return setNotice(result.message || 'Başvuru geri çekilemedi.');
    setApplication(result.application);
    setNotice(result.message);
  };

  if (loading) return <div className="producer-loading"><LoaderCircle className="is-spinning" /> Üretici panelin hazırlanıyor…</div>;
  if (!producer || producer.status === 'not_enrolled') return <div className="producer-page producer-application-page">
    <PageHeader eyebrow="İçerik Üretici Programı" title="İçeriğini topluluğa, etkini kazanca dönüştür" description="Calisiyo’yu öğrencilerle buluştur; doğrulanan satışlarını ve kazançlarını şeffaf biçimde takip et." />
    {notice && <div className="producer-notice" role="status">{notice}<button onClick={() => setNotice('')}>Kapat</button></div>}

    {application?.status === 'pending' ? <section className="producer-application-status is-pending">
      <span><Clock3 /></span>
      <div><small>Başvurun alındı</small><h2>İnceleme sırasındasın</h2><p>Profil bağlantın ve içerik alanın yönetici ekibi tarafından inceleniyor. Sonucu bildirimlerinden ve bu sayfadan görebilirsin.</p><em>{application.platform} · {Number(application.audienceSize || 0).toLocaleString('tr-TR')} takipçi/abone</em></div>
      <button type="button" onClick={withdrawApplication} disabled={saving}>{saving ? 'İşleniyor…' : 'Başvuruyu geri çek'}</button>
    </section> : <>
      {application?.status === 'rejected' && <section className="producer-application-status is-rejected"><ShieldCheck /><div><small>Başvurun incelendi</small><h2>Şu anda onaylanmadı</h2><p>{application.reviewNote || 'Bilgilerini güncelleyerek yeniden başvurabilirsin.'}</p></div></section>}
      <section className="producer-application-intro">
        <div><span><Gift /> Program avantajları</span><h2>Takipçilerine %20 indirim, sana doğrulanmış satış kazancı</h2><p>Onaylandığında seçilen YKS dönemi için ücretsiz calisiyo plus erişimi ve kişisel Shopier indirim kodun hazırlanır.</p></div>
        <div className="producer-application-benefits"><article><strong>₺1.000</strong><span>İlk 3 doğrulanmış satışın her biri</span></article><article><strong>₺500</strong><span>4. satıştan itibaren her satış</span></article><article><strong>14 gün</strong><span>İade kontrolünden sonra ödenebilir</span></article></div>
      </section>
      <form className="producer-application-form" onSubmit={submitApplication}>
        <header><div><span>Başvuru formu</span><h2>Seni ve içeriklerini tanıyalım</h2><p>Yalnızca inceleme için gerekli bilgileri istiyoruz. Şifre veya sosyal medya hesabına erişim istemeyiz.</p></div><Users /></header>
        <fieldset><legend>Ana içerik platformun</legend><div className="producer-choice-grid">{PLATFORMS.map(([value, label]) => <button key={value} type="button" className={form.platform === value ? 'is-selected' : ''} aria-pressed={form.platform === value} onClick={() => setForm((current) => ({ ...current, platform: value }))}>{label}</button>)}</div></fieldset>
        <div className="producer-form-grid">
          <label><span>Profil bağlantın</span><input type="url" required maxLength={500} placeholder="https://youtube.com/@kanalin" value={form.profileUrl} onChange={(event) => setForm((current) => ({ ...current, profileUrl: event.target.value }))} /></label>
          <label><span>Takipçi / abone sayın</span><input type="number" required min="0" max="1000000000" step="1" inputMode="numeric" placeholder="Örn. 12500" value={form.audienceSize} onChange={(event) => setForm((current) => ({ ...current, audienceSize: event.target.value }))} /></label>
        </div>
        <label><span>İçerik alanın</span><input required minLength={5} maxLength={300} placeholder="Örn. YKS Matematik, çalışma motivasyonu ve deneme analizi" value={form.contentFocus} onChange={(event) => setForm((current) => ({ ...current, contentFocus: event.target.value }))} /></label>
        <label><span>Neden programa katılmak istiyorsun?</span><textarea required minLength={20} maxLength={1000} placeholder="Hedef kitleni ve Calisiyo’yu nasıl tanıtacağını kısaca anlat." value={form.motivation} onChange={(event) => setForm((current) => ({ ...current, motivation: event.target.value }))} /></label>
        <fieldset><legend>Tercih ettiğin ücretsiz Plus dönemi</legend><div className="producer-choice-grid is-plan">{[['plus_2027', 'YKS 2027'], ['plus_2028', 'YKS 2028']].map(([value, label]) => <button key={value} type="button" className={form.preferredPlanCode === value ? 'is-selected' : ''} aria-pressed={form.preferredPlanCode === value} onClick={() => setForm((current) => ({ ...current, preferredPlanCode: value }))}>{label}</button>)}</div></fieldset>
        <button className="producer-application-submit" disabled={saving}><Send /> {saving ? 'Başvurun gönderiliyor…' : application?.status === 'rejected' ? 'Yeniden başvur' : 'Başvuruyu gönder'}</button>
        <small className="producer-application-consent">Başvuru otomatik onaylanmaz. Profilin yalnızca program uygunluğu için yönetici tarafından incelenir.</small>
      </form>
    </>}
  </div>;

  return <div className="producer-page">
    <PageHeader eyebrow="İçerik Üretici Programı" title="Üret, paylaş, kazancını şeffafça izle" description="Yalnızca doğrulanmış Shopier satışlarından oluşan kazançlarını ve ödeme geçmişini burada görürsün." />
    {notice && <div className="producer-notice" role="status">{notice}<button onClick={() => setNotice('')}>Kapat</button></div>}
    {producer.status === 'suspended' && <div className="producer-warning"><ShieldCheck /><div><strong>Program erişimin askıda</strong><p>Üretici grant’in ve kod ilişkilendirmen durduruldu. Satın aldığın ücretli plan varsa etkilenmez.</p></div></div>}
    <section className="producer-hero">
      <div><span><BadgeCheck /> İndirim Kodun</span><h2>{producer.code || producer.codePreview || 'Hazırlanıyor'}</h2><p>{producer.code ? 'Takipçilerin kodunu kayıt sırasında kullanır; %20 indirim Plus satın alırken hesaplarına otomatik uygulanır.' : 'İndirim kodun hazırlanıyor. Shopier ürün kapsamı güvenli biçimde doğrulanıyor.'}</p><small><Gift /> Ücretsiz {producer.grantPlanCode === 'plus_2028' ? 'YKS 2028' : 'YKS 2027'} Plus · {date(producer.grantEndsAt)} tarihine kadar</small></div>
      <div className="producer-code-actions">
        <button onClick={copyCode} disabled={!producer.code}><Copy /> Kodu kopyala</button>
        {!producer.selfCodeChangeUsed && <button onClick={() => { setCodeDraft(''); setChangingCode(true); }}><PencilLine /> Kodunu değiştir</button>}
        {producer.selfCodeChangeUsed && !producer.code && producer.codePreview && <button onClick={retryCodeSync} disabled={saving}><RefreshCw className={saving ? 'is-spinning' : ''} /> Etkinleştirmeyi tekrar dene</button>}
      </div>
    </section>
    {changingCode && <form className="producer-code-form" onSubmit={changeCode}>
      <div><span>Tek kullanımlık değişiklik</span><h2>Kısa ve hatırlanabilir kodunu seç</h2><p>Örn. ADIN20. Kodunu yalnızca bir kez değiştirebilirsin; 4-20 harf veya rakam kullan.</p></div>
      <label><span>Yeni indirim kodu</span><input autoComplete="off" inputMode="text" required minLength={4} maxLength={20} pattern="[A-Za-z0-9ÇĞİÖŞÜçğıöşü]+" placeholder="ADIN20" value={codeDraft} onChange={(event) => setCodeDraft(event.target.value.toUpperCase())} /></label>
      <div><button type="button" onClick={() => setChangingCode(false)} disabled={saving}>Vazgeç</button><button type="submit" disabled={saving}>{saving ? 'Etkinleştiriliyor…' : 'Kodu bir kez değiştir'}</button></div>
    </form>}
    <section className="producer-model"><div><span>Kazanç modelin</span><h2>Basit, sabit ve denetlenebilir</h2></div><p>İlk 3 doğrulanmış satışında satış başına <strong>₺1.000</strong>, 4. satıştan itibaren satış başına <strong>₺500</strong> kazanırsın. Kazançlar, iade kontrolü için 14 gün bekledikten sonra ödenebilir olur.</p></section>
    <section className="producer-growth" aria-labelledby="producer-growth-title">
      <header><div><span>Kod Performansın</span><h2 id="producer-growth-title">Kayıttan doğrulanmış satışa</h2><p>İçerik üretici kodunla kayıt olan kullanıcıların toplu performansını takip et.</p></div><div className="producer-range" role="group" aria-label="Performans tarih aralığı">{[['7d', '7 gün'], ['30d', '30 gün'], ['all', 'Tümü']].map(([value, label]) => <button key={value} className={growthRange === value ? 'is-active' : ''} onClick={() => setGrowthRange(value)}>{label}</button>)}</div></header>
      {growthError ? <div className="producer-growth-error" role="alert">{growthError}</div> : growth ? <>
        <div className="producer-growth-metrics">
          <article><small>Kodla kayıt</small><strong>{Number(growth.registrations || 0).toLocaleString('tr-TR')}</strong><span>Yeni hesap</span></article>
          <article><small>Aktifleşen</small><strong>{Number(growth.activated || 0).toLocaleString('tr-TR')}</strong><span>%{growth.activationRate || 0} aktivasyon</span></article>
          <article><small>Plus denemesi</small><strong>{Number(growth.trials || 0).toLocaleString('tr-TR')}</strong><span>%{growth.trialRate || 0} dönüşüm</span></article>
          <article><small>Ücretliye geçen</small><strong>{Number(growth.paidConversions || 0).toLocaleString('tr-TR')}</strong><span>%{growth.paidRate || 0} dönüşüm</span></article>
          <article><small>Doğrulanmış satış</small><strong>{Number(growth.verifiedSales || 0).toLocaleString('tr-TR')}</strong><span>Kazanç ledger’ına giren</span></article>
        </div>
        <div className="producer-funnel" aria-label="İçerik üretici dönüşüm hunisi">{[['Kodla kayıt', growth.registrations], ['Aktifleşen', growth.activated], ['Plus denemesi', growth.trials], ['Ücretliye geçen', growth.paidConversions]].map(([label, value]) => <div key={label}><span>{label}<b>{Number(value || 0).toLocaleString('tr-TR')}</b></span><i><em style={{ width: `${growth.registrations ? Math.max(2, Math.min(100, Number(value || 0) * 100 / growth.registrations)) : 0}%` }} /></i></div>)}</div>
      </> : null}
      <p className="producer-privacy"><ShieldCheck /> Öğrenci gizliliğini korumak için yalnızca toplu sayılar gösterilir. İsim, e-posta veya kişisel çalışma verileri paylaşılmaz.</p>
    </section>
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
