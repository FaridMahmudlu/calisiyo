import Link from 'next/link';
import {
  PiArrowRight, PiBookOpenText, PiCalendarBlank, PiChartLineUp,
  PiCheck, PiClock, PiCrownSimple, PiListChecks, PiLockKey,
  PiPlayCircle, PiSparkle, PiTarget, PiTimer, PiTrendUp,
} from 'react-icons/pi';
import BrandLogo from '@/components/brand/BrandLogo';
import PricingSection from './PricingSection';
import PublicFooter from './PublicFooter';
import { FAQS, NAV_LINKS } from './SharedLandingContent';

const agenda = [
  ['09:00', 'Matematik', 'Fonksiyonlar', '60 dk', 'done'],
  ['10:15', 'Türkçe', 'Paragraf', '40 dk', 'done'],
  ['11:15', 'Fizik', 'Hareket ve Kuvvet', '45 dk', 'active'],
  ['13:00', 'Kimya', 'Gazlar', '40 dk', 'next'],
];

const chapters = [
  { number: '01', title: 'Planını kur.', text: 'Ders, konu, saat, süre ve soru hedefini bir kez ekle. Günlük ve haftalık görünüm aynı kayıttan güncellensin.', Icon: PiCalendarBlank, type: 'plan' },
  { number: '02', title: 'Çalışmanı kaydet.', text: 'Pomodoro veya manuel çalışma kaydıyla harcadığın süreyi ve çözdüğün soruları doğrudan ilerlemene ekle.', Icon: PiTimer, type: 'focus' },
  { number: '03', title: 'İlerlemeni anla.', text: 'Deneme, konu, süre ve soru kayıtlarını birlikte gör. Sonraki çalışma kararını kendi verilerinle ver.', Icon: PiChartLineUp, type: 'progress' },
];

function ProductWorkspace() {
  return (
    <div className="landing-workspace" aria-label="calisiyo çalışma alanı örnek görünümü">
      <aside className="workspace-sidebar">
        <BrandLogo />
        <span className="workspace-nav is-active"><PiCalendarBlank /> Bugün</span>
        <span className="workspace-nav"><PiListChecks /> Planım</span>
        <span className="workspace-nav"><PiTimer /> Pomodoro</span>
        <span className="workspace-nav"><PiTarget /> Denemeler</span>
        <span className="workspace-nav"><PiChartLineUp /> İstatistikler</span>
      </aside>
      <section className="workspace-agenda">
        <header><div><small>Örnek çalışma alanı</small><h2>Bugünkü odak gündemin</h2></div><time>14 Ağustos 2026</time></header>
        <div className="agenda-head"><span>Saat</span><span>Ders</span><span>Konu</span><span>Süre</span><span>Durum</span></div>
        {agenda.map(([time, lesson, subject, duration, state]) => (
          <div className="agenda-row" key={`${time}-${lesson}`}>
            <time>{time}</time><strong>{lesson}</strong><span>{subject}</span><span>{duration}</span>
            <i role="img" className={`agenda-state is-${state}`} aria-label={state === 'done' ? 'Tamamlandı' : state === 'active' ? 'Devam ediyor' : 'Sırada'} />
          </div>
        ))}
        <Link href="/kayit" className="workspace-edit">Planını oluşturmaya başla <PiArrowRight /></Link>
      </section>
      <aside className="workspace-focus">
        <div><small>Pomodoro</small><span>Odaklan</span></div>
        <strong>25:00</strong>
        <progress value="17" max="25" aria-label="Örnek Pomodoro ilerlemesi">17 / 25</progress>
        <button type="button" tabIndex="-1"><PiPlayCircle /> Başlat</button>
        <dl><div><dt>Odak süresi</dt><dd>2 sa 45 dk</dd></div><div><dt>Tamamlanan</dt><dd>2 / 4</dd></div><div><dt>Soru</dt><dd>86</dd></div></dl>
      </aside>
    </div>
  );
}

function ChapterVisual({ type }) {
  if (type === 'plan') return <div className="chapter-ui weekly-ui"><header><strong>Haftalık plan</strong><span>17–23 Ağustos</span></header><div className="week-grid">{['Pzt', 'Sal', 'Çar', 'Per', 'Cum'].map((day, index) => <div key={day}><b>{day}</b><span className="is-math">Matematik</span><span className="is-turkish">Türkçe</span>{index % 2 === 0 && <span className="is-science">Fen</span>}</div>)}</div></div>;
  if (type === 'focus') return <div className="chapter-ui record-ui"><header><strong>Çalışma kaydı</strong><span>Tamamlandı</span></header><dl><div><dt>Ders</dt><dd>Fizik</dd></div><div><dt>Konu</dt><dd>Hareket ve Kuvvet</dd></div><div><dt>Süre</dt><dd>42 dakika</dd></div><div><dt>Soru</dt><dd>28 doğru · 4 yanlış</dd></div></dl><p><PiCheck /> Süre, soru ve seri ilerlemesi güncellendi.</p></div>;
  return <div className="chapter-ui progress-ui"><header><strong>Deneme gelişimi</strong><span>Son 5 kayıt</span></header><div className="net-summary"><div><small>TYT neti</small><b>78,25</b></div><div><small>Değişim</small><b>+6,50</b></div></div><div className="bar-list">{[['Türkçe', 82], ['Sosyal', 58], ['Matematik', 71], ['Fen', 49]].map(([label, value]) => <div key={label}><span>{label}</span><progress value={value} max="100">{value}</progress><b>{value}</b></div>)}</div></div>;
}

export default function LandingLightweight() {
  return (
    <main className="editorial-landing">
      <nav className="editorial-nav" aria-label="Ana navigasyon">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <div className="editorial-nav-links">{NAV_LINKS.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}</div>
        <div className="editorial-auth"><Link href="/giris">Giriş yap</Link><Link className="public-button primary" href="/kayit">Ücretsiz başla</Link></div>
      </nav>

      <section className="editorial-hero section-shell">
        <div className="editorial-hero-copy">
          <span className="editorial-eyebrow"><PiSparkle /> 19 Haziran 2027 YKS</span>
          <h1>YKS hazırlığını tek bir <em>net düzende</em> yönet.</h1>
          <p>Planını kur, odaklanarak çalış ve ilerlemeni yalnızca kendi gerçek kayıtlarınla gör. Gereksiz karmaşa olmadan, her gün ne yapacağını bil.</p>
          <div className="hero-actions"><Link className="public-button primary" href="/kayit">Ücretsiz başla <PiArrowRight /></Link><a className="public-button" href="#paketler">Paketleri gör</a></div>
          <div className="hero-proof"><span><PiCheck /> Kredi kartı gerekmez</span><span><PiCheck /> calisiyo ücretsiz</span><span><PiCheck /> Tüm cihazlarda uyumlu</span></div>
        </div>
        <ProductWorkspace />
      </section>

      <PricingSection />

      <section className="editorial-flow section-shell" id="nasil-calisir">
        <header className="editorial-section-heading"><span>Nasıl çalışır?</span><h2>Tek bir kayıt, bütün çalışma akışını günceller.</h2><p>Aynı bilgiyi farklı ekranlara tekrar yazmadan planından istatistiklerine kadar bağlı bir düzen kurarsın.</p></header>
        <div className="chapter-grid">
          {chapters.map(({ number, title, text, Icon, type }) => <article className="editorial-chapter" key={number}><div className="chapter-copy"><span aria-hidden="true">{number}</span><Icon /><h3>{title}</h3><p>{text}</p></div><ChapterVisual type={type} /></article>)}
        </div>
      </section>

      <section className="landing-data-band" id="ozellikler">
        <div className="section-shell data-band-grid">
          <div className="data-band-copy"><span><PiLockKey /> Gerçek veriden görünür ilerleme</span><h2>Rakamların yalnızca sen çalıştıkça oluşur.</h2><p>Calisiyo; program, Pomodoro, soru, konu ve deneme kayıtlarını birlikte değerlendirir. Veri yoksa yapay başarı oranı göstermez.</p><Link href="/kayit">Ücretsiz çalışma alanını aç <PiArrowRight /></Link></div>
          <div className="data-source-panel" aria-label="İstatistik veri kaynakları"><header><PiTrendUp /><div><strong>İlerlemenin kaynakları</strong><small>Örnek veri akışı</small></div></header>{[[PiClock, 'Çalışma sürelerin'], [PiBookOpenText, 'Çözdüğün sorular'], [PiTarget, 'Deneme sonuçların'], [PiListChecks, 'Tamamladığın görevler']].map(([Icon, label]) => <div key={label}><Icon /><span>{label}</span><PiCheck /></div>)}</div>
        </div>
      </section>

      <section className="landing-faq section-shell" id="sorular">
        <header className="editorial-section-heading"><span>Doğrudan cevaplar</span><h2>Calisiyo hakkında sık sorulanlar.</h2><p>Başlamadan önce bilmen gerekenleri kısa ve açık şekilde yanıtladık.</p></header>
        <div className="faq-list">{FAQS.map((item, index) => <details key={item.question} open={index === 0}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</div>
      </section>

      <section className="editorial-final section-shell"><div><span><PiCrownSimple /> Düzenini bugün kur</span><h2>YKS yolculuğunu belirsizliğe bırakma.</h2><p>Ücretsiz başla; daha geniş limitlere ihtiyaç duyduğunda planını yükselt.</p></div><div><Link className="public-button primary" href="/kayit">Ücretsiz başla <PiArrowRight /></Link><a className="public-button" href="#paketler">Paketleri karşılaştır</a></div></section>

      <PublicFooter />
    </main>
  );
}
