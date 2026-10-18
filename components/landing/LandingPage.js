import Link from 'next/link';
import {
  PiArrowRight, PiBellRinging, PiBookOpenText, PiCalendarCheck, PiChartLineUp, PiCheckBold, PiDeviceMobile,
  PiFingerprint, PiFlame, PiLockKey, PiShieldCheck, PiSquaresFour, PiTimer, PiUsersThree, PiYoutubeLogo,
} from 'react-icons/pi';
import BrandLogo from '@/components/brand/BrandLogo';
import DomainNotice from '@/components/brand/DomainNotice';
import PricingSection from './PricingSection';
import PublicFooter from './PublicFooter';
import { FAQS, NAV_LINKS, SUPPORTED_EXAMS } from './SharedLandingContent';

const TODAY = [
  { time: '09:00', lesson: 'Matematik', topic: 'Türev', minutes: 60, state: 'done', color: '#7c5cff' },
  { time: '10:15', lesson: 'Türkçe', topic: 'Paragraf', minutes: 40, state: 'done', color: '#00a870' },
  { time: '11:15', lesson: 'Fizik', topic: 'Elektrik ve manyetizma', minutes: 45, state: 'live', color: '#2f7cf6' },
  { time: '13:30', lesson: 'Kimya', topic: 'Mol kavramı', minutes: 40, state: 'next', color: '#f59e0b' },
];
const WEEK = [62, 48, 80, 71, 90, 56, 34];

function ProductStage() {
  return (
    <div className="lp-stage" aria-hidden="true">
      <div className="lp-window">
        <div className="lp-window-bar"><i /><i /><i /><span>planliyo.com.tr/dashboard</span></div>
        <div className="lp-window-body">
          <nav className="lp-app-nav">
            <BrandLogo />
            {['Bugün', 'Haftalık program', 'Kronometre', 'Deneme analizi', 'İstatistikler'].map((item, index) => (
              <span key={item} className={index === 0 ? 'is-active' : ''}>{item}</span>
            ))}
          </nav>
          <section className="lp-app-today">
            <header>
              <div><small>Cumartesi, 18 Ekim</small><strong>Bugünkü planın</strong></div>
              <span className="lp-ring" style={{ '--value': 62 }}><b>%62</b></span>
            </header>
            <ol>
              {TODAY.map((task) => (
                <li key={task.time} className={`is-${task.state}`} style={{ '--tone': task.color }}>
                  <time>{task.time}</time>
                  <div><strong>{task.lesson}</strong><span>{task.topic}</span></div>
                  <em>{task.state === 'live' ? '18:42' : `${task.minutes} dk`}</em>
                </li>
              ))}
            </ol>
          </section>
          <aside className="lp-app-side">
            <div className="lp-mini-card">
              <small>Bu hafta</small>
              <strong>14 sa 20 dk</strong>
              <div className="lp-bars">{WEEK.map((value, index) => <i key={index} style={{ height: `${value}%` }} className={index === 4 ? 'is-today' : ''} />)}</div>
            </div>
            <div className="lp-mini-card is-streak"><PiFlame /><div><strong>12 gün</strong><small>çalışma serisi</small></div></div>
          </aside>
        </div>
      </div>

      <div className="lp-float-exam">
        <small>KDS · 2. dönem</small>
        <div><strong>82,5</strong><span>+4,5 net</span></div>
        <svg viewBox="0 0 120 34" preserveAspectRatio="none"><polyline points="0,28 24,24 48,26 72,15 96,12 120,5" /></svg>
      </div>

      <div className="lp-phone">
        <div className="lp-phone-screen">
          <span className="lp-phone-time">11:32</span>
          <span className="lp-phone-date">Cumartesi 18 Ekim</span>
          <div className="lp-live">
            <header><PiTimer /> Kronometre · Fizik</header>
            <strong>18:42</strong>
            <span>Bitiş 11:51 · sonra 5 dk mola</span>
            <i><b /></i>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamSpotlightVisual() {
  const lines = [
    { code: 'TYT', color: '#00a870', points: '0,96 60,88 120,80 180,70 240,62 300,52' },
    { code: 'KDS', color: '#f59e0b', points: '0,74 75,66 150,60 225,46 300,38' },
    { code: 'SDS', color: '#ec4899', points: '0,104 100,90 200,76 300,70' },
  ];
  return (
    <div className="lp-exam-visual" aria-hidden="true">
      <div className="lp-exam-tabs">
        <span className="is-active">Genel bakış</span><span>TYT <b>6</b></span><span>KDS <b>4</b></span><span>SDS <b>3</b></span>
      </div>
      <div className="lp-exam-chart">
        <header><strong>Başarı oranı gelişimi</strong><ul>{lines.map((line) => <li key={line.code}><i style={{ background: line.color }} />{line.code}</li>)}</ul></header>
        <svg viewBox="0 0 300 120" preserveAspectRatio="none">
          {[20, 50, 80, 110].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} />)}
          {lines.map((line) => <polyline key={line.code} points={line.points} style={{ stroke: line.color }} />)}
        </svg>
      </div>
      <div className="lp-exam-table">
        <header><span>KDS · ders bazında</span><span>Son</span><span>Başarı</span></header>
        {[
          ['Matematik', '18,5/30', 62, '+3'],
          ['Türk Dili ve Edebiyatı', '22,75/30', 76, '+1,5'],
          ['Fizik', '8,25/15', 55, '+2'],
          ['Kimya', '6/15', 40, 'Öncelik'],
        ].map(([label, net, rate, delta]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{net}</strong>
            <em><i><b style={{ width: `${rate}%` }} /></i>{delta === 'Öncelik' ? <mark>Öncelik</mark> : <small>{delta}</small>}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    id: 'program', size: 'is-wide', icon: PiCalendarCheck, kicker: 'Planla',
    title: 'Günlük ve haftalık program, tek kayıttan',
    text: 'Ders, konu, saat, süre ve soru hedefini bir kez ekle. Görevi tamamladığında haftan, serin ve istatistiklerin birlikte güncellenir.',
    visual: (
      <div className="lp-week" aria-hidden="true">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum'].map((day, index) => (
          <div key={day}><b>{day}</b><span className="is-math">Matematik</span><span className="is-turkish">Türkçe</span>{index % 2 === 0 ? <span className="is-science">Fizik</span> : <span className="is-history">Tarih</span>}</div>
        ))}
      </div>
    ),
  },
  {
    id: 'kronometre', icon: PiTimer, kicker: 'Odaklan',
    title: 'Kronometre ve canlı geri sayım',
    text: '25/5, 50/10 veya kendi sürenle çalış. Biten oturum süre ve soru sayısıyla kendiliğinden kaydedilir.',
    visual: <div className="lp-timer" aria-hidden="true"><span style={{ '--value': 70 }}><b>24:13</b><small>Çalışma</small></span></div>,
  },
  {
    id: 'konu', icon: PiBookOpenText, kicker: 'Takip et',
    title: 'Konu takibi ve tekrar planı',
    text: 'TYT, AYT ve YDT konularını işaretle; tekrar zamanı gelen konular önüne çıksın.',
    visual: (
      <div className="lp-progress" aria-hidden="true">
        {[['Matematik', 64], ['Fizik', 41], ['Türkçe', 78]].map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><em>%{value}</em></div>)}
      </div>
    ),
  },
  {
    id: 'sinif', icon: PiUsersThree, kicker: 'Birlikte çalış',
    title: 'Çalışma sınıfları',
    text: 'Arkadaşlarınla aynı odada odaklan; sohbet, sesli mesaj ve ortak tahta tek yerde. Netlerin özel kalır.',
    visual: <div className="lp-avatars" aria-hidden="true">{['E', 'M', 'Z', 'A'].map((letter) => <i key={letter}>{letter}</i>)}<span>4 kişi şu an odakta</span></div>,
  },
  {
    id: 'youtube', icon: PiYoutubeLogo, kicker: 'Kampını böl',
    title: 'YouTube oynatma listesinden plan',
    text: 'Oynatma listesini kapasitene göre günlere dağıt; her video takvimde bir görev olsun.',
    visual: <div className="lp-playlist" aria-hidden="true">{['1. Türev tanımı', '2. Türev kuralları', '3. Grafik çizimi'].map((item, index) => <div key={item}><i>{index + 1}</i><span>{item}</span><small>{['Pzt', 'Sal', 'Çar'][index]}</small></div>)}</div>,
  },
];

export default function LandingPage() {
  return (
    <div className="lp">
      <a href="#icerik" className="lp-skip">İçeriğe geç</a>
      <DomainNotice />
      <header className="lp-nav">
        <div className="lp-shell lp-nav-inner">
          <Link href="/" className="lp-brand" aria-label="Planliyo ana sayfa"><BrandLogo priority /></Link>
          <nav aria-label="Ana menü" className="lp-nav-links">
            {NAV_LINKS.map((link) => (link.href.startsWith('/') ? <Link key={link.href} href={link.href}>{link.label}</Link> : <a key={link.href} href={link.href}>{link.label}</a>))}
          </nav>
          <div className="lp-nav-actions">
            <Link href="/giris" className="lp-nav-login">Giriş yap</Link>
            <Link href="/kayit" className="lp-btn is-primary is-small">Ücretsiz başla</Link>
          </div>
        </div>
      </header>

      <main id="icerik">
        <section className="lp-hero" aria-labelledby="lp-hero-title">
          <div className="lp-shell lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow"><span>YKS 2027 · 2028</span><a href="#deneme-analizi">Yeni: KDS ve SDS deneme analizi <PiArrowRight /></a></p>
              <h1 id="lp-hero-title">Ne <span className="lp-nowrap">çalışacağını bil.</span><br /><em>Ne kadar <span className="lp-nowrap">ilerlediğini</span></em> <span className="lp-nowrap">gör.</span></h1>
              <p className="lp-lead">Planliyo; günlük programını, kronometreni, konu takibini ve TYT’den KDS’ye tüm deneme sonuçlarını tek çalışma alanında toplar. Gördüğün her rakam, kendi gerçek çalışma kayıtlarından gelir.</p>
              <div className="lp-actions">
                <Link href="/kayit" className="lp-btn is-primary">Ücretsiz başla <PiArrowRight /></Link>
                <a href="#nasil-calisir" className="lp-btn">Nasıl çalıştığını gör</a>
              </div>
              <ul className="lp-proof">
                <li><PiCheckBold /> Kredi kartı gerekmez</li>
                <li><PiCheckBold /> Telefon ve bilgisayarda</li>
                <li><PiCheckBold /> Reklamsız</li>
              </ul>
            </div>
            <ProductStage />
            <p className="sr-only">Örnek ekran: bugünkü plan yüzde 62 tamamlanmış, fizik oturumu için kronometre 18 dakika 42 saniye gösteriyor, KDS denemesinde son net 82,5.</p>
          </div>
        </section>

        <section className="lp-exams" aria-labelledby="lp-exams-title">
          <div className="lp-shell">
            <h2 id="lp-exams-title">YKS’nin yanında okul ve kurum sınavların da tek yerde</h2>
            <ul>{SUPPORTED_EXAMS.map((exam) => <li key={exam}>{exam}</li>)}<li className="is-custom">+ Özel deneme</li></ul>
          </div>
        </section>

        <section className="lp-section" id="ozellikler" aria-labelledby="lp-features-title">
          <div className="lp-shell">
            <header className="lp-heading">
              <span className="lp-kicker">Özellikler</span>
              <h2 id="lp-features-title">Çalışma düzenin için gereken her şey, birbirine bağlı.</h2>
              <p>Bir kez kaydettiğin çalışma; programını, serini, istatistiklerini ve deneme analizini aynı anda günceller. Aynı bilgiyi iki kez yazmazsın.</p>
            </header>
            <div className="lp-bento">
              {FEATURES.map(({ id, size, icon: Icon, kicker, title, text, visual }) => (
                <article key={id} className={`lp-tile ${size || ''}`}>
                  <div className="lp-tile-copy">
                    <span className="lp-tile-kicker"><Icon /> {kicker}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                  {visual}
                </article>
              ))}
              <article className="lp-tile is-link">
                <div className="lp-tile-copy">
                  <span className="lp-tile-kicker"><PiChartLineUp /> Gelişimini gör</span>
                  <h3>İstatistikler ve seviye</h3>
                  <p>Çalışma süren, çözdüğün sorular ve serin; günlük ısı haritası ve haftalık grafiklerle.</p>
                </div>
                <Link href="/ozellikler" className="lp-text-link">Tüm özellikleri incele <PiArrowRight /></Link>
              </article>
            </div>
          </div>
        </section>

        <section className="lp-section lp-spotlight" id="deneme-analizi" aria-labelledby="lp-exam-title">
          <div className="lp-shell lp-spotlight-grid">
            <div className="lp-spotlight-copy">
              <span className="lp-kicker is-amber">Yeni · Deneme analizi</span>
              <h2 id="lp-exam-title">Tüm denemelerin tek yerde, her biri kendi ölçüsüyle.</h2>
              <p>TYT ve AYT’nin yanında okulundaki KDS ve SDS sınavlarını, LGS, KPSS, ALES, DGS, YDS, YÖKDİL ve MSÜ denemelerini kaydet. Planliyo neti doğru kuralla hesaplar; sonuçları hem birlikte hem de sınav ve ders bazında ayrı ayrı gösterir.</p>
              <ul className="lp-checks">
                <li><PiCheckBold /><span><strong>Doğru net kuralı.</strong> YKS ve KPSS’de 4 yanlış 1 doğruyu, LGS’de 3 yanlış 1 doğruyu götürür; YDS ve YÖKDİL’de yanlış doğruyu götürmez.</span></li>
                <li><PiCheckBold /><span><strong>Birleşik görünüm.</strong> Soru sayıları farklı sınavları başarı oranıyla yan yana karşılaştır.</span></li>
                <li><PiCheckBold /><span><strong>Ayrı ayrı analiz.</strong> Her sınavın net gelişimi, ortalaması ve rekoru kendi sekmesinde.</span></li>
                <li><PiCheckBold /><span><strong>Ders bazında öncelik.</strong> Hangi derste ilerlediğini, hangisine zaman ayırman gerektiğini gör.</span></li>
                <li><PiCheckBold /><span><strong>Yayına göre düzen.</strong> KDS ve SDS’de ders ve soru sayılarını sınavına göre ayarla; bir sonraki kayıtta hatırlansın.</span></li>
              </ul>
              <Link href="/kayit" className="lp-btn is-primary">İlk denemeni ekle <PiArrowRight /></Link>
            </div>
            <ExamSpotlightVisual />
          </div>
        </section>

        <section className="lp-section" id="nasil-calisir" aria-labelledby="lp-how-title">
          <div className="lp-shell">
            <header className="lp-heading">
              <span className="lp-kicker">Nasıl çalışır?</span>
              <h2 id="lp-how-title">Üç adımda düzenli bir hazırlık.</h2>
            </header>
            <ol className="lp-steps">
              <li><span>1</span><h3>Alanını ve sınav yılını seç</h3><p>Sayısal, eşit ağırlık, sözel veya dil; YKS 2027 ya da 2028. Dersler ve konular buna göre hazır gelir.</p></li>
              <li><span>2</span><h3>Gününü planla, kronometreyle çalış</h3><p>Planladığın görevi başlat; süre ve çözdüğün soru sayısı çalışma geçmişine işlensin.</p></li>
              <li><span>3</span><h3>Denemelerini gir, kararını veriyle ver</h3><p>Netler, konu ilerlemesi ve çalışma süren aynı panelde. Neyi tekrar edeceğini tahmin etmek zorunda kalmazsın.</p></li>
            </ol>
          </div>
        </section>

        <section className="lp-principles" aria-labelledby="lp-principles-title">
          <div className="lp-shell">
            <header className="lp-heading is-inverse">
              <span className="lp-kicker">İlkemiz</span>
              <h2 id="lp-principles-title">Gerçek veri, gerçek ilerleme.</h2>
              <p>Rakamların sen çalıştıkça oluşur. Planliyo veri yokken başarı oranı uydurmaz; nasıl hesapladığımızı açıkça yazarız.</p>
            </header>
            <div className="lp-principle-grid">
              <article><PiSquaresFour /><h3>Uydurma skor yok</h3><p>Her grafik; program, kronometre, konu ve deneme kayıtlarından hesaplanır.</p></article>
              <article><PiLockKey /><h3>Verin sana ait</h3><p>Kayıtlarını dışa aktarabilir ya da hesabınla birlikte kalıcı olarak silebilirsin.</p></article>
              <article><PiShieldCheck /><h3>Güvenli altyapı</h3><p>Her kayıt satır düzeyi yetkilendirmeyle yalnızca sana açılır; KVKK’ya uygun işlenir.</p></article>
            </div>
            <Link href="/metodoloji" className="lp-text-link is-inverse">Hesaplama metodolojisini oku <PiArrowRight /></Link>
          </div>
        </section>

        <section className="lp-section lp-mobile" aria-labelledby="lp-mobile-title">
          <div className="lp-shell lp-mobile-grid">
            <div className="lp-mobile-phone" aria-hidden="true">
              <div className="lp-phone is-static">
                <div className="lp-phone-screen is-app">
                  <header><small>Bugün</small><strong>%52 tamamlandı</strong></header>
                  <div className="lp-phone-stats"><span><b>1 sa 50 dk</b>çalışma</span><span><b>37</b>gün seri</span></div>
                  {TODAY.slice(0, 3).map((task) => <div key={task.time} className={`lp-phone-task is-${task.state}`} style={{ '--tone': task.color }}><time>{task.time}</time><span>{task.lesson}</span></div>)}
                </div>
              </div>
            </div>
            <div>
              <span className="lp-kicker"><PiDeviceMobile /> Android uygulaması</span>
              <h2 id="lp-mobile-title">Telefonunda da yanında.</h2>
              <p>Android uygulamasında kronometre kilit ekranında ve bildirimde canlı geri sayar; ana ekran widget’ları serini ve sıradaki görevini gösterir. Aynı hesap, aynı veriler.</p>
              <ul className="lp-checks is-grid">
                <li><PiBellRinging /><span>Kilit ekranında canlı kronometre</span></li>
                <li><PiSquaresFour /><span>Ana ekran widget’ları</span></li>
                <li><PiFingerprint /><span>Biyometrik kilit</span></li>
                <li><PiChartLineUp /><span>Web ile anlık eşitleme</span></li>
              </ul>
              <p className="lp-note">Android uygulaması test aşamasında, yakında Google Play’de. Bugün web sürümünü telefon tarayıcından kullanabilirsin.</p>
            </div>
          </div>
        </section>

        <PricingSection />

        <section className="lp-section lp-faq" id="sss" aria-labelledby="lp-faq-title">
          <div className="lp-shell lp-faq-grid">
            <header className="lp-heading">
              <span className="lp-kicker">Sık sorulan sorular</span>
              <h2 id="lp-faq-title">Başlamadan önce bilmen gerekenler.</h2>
              <p>Aradığın cevap yoksa <a href="mailto:destek@planliyo.com.tr">destek@planliyo.com.tr</a> adresine yaz.</p>
            </header>
            <div className="lp-faq-list">
              {FAQS.map((item, index) => (
                <details key={item.question} open={index === 0}>
                  <summary><h3>{item.question}</h3><span aria-hidden="true" /></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final" aria-labelledby="lp-final-title">
          <div className="lp-shell lp-final-inner">
            <div>
              <h2 id="lp-final-title">Bugünün planı iki dakikada hazır.</h2>
              <p>Ücretsiz hesabını oluştur, ilk görevini ekle ve kronometreyi başlat.</p>
            </div>
            <div className="lp-actions">
              <Link href="/kayit" className="lp-btn is-primary">Ücretsiz başla <PiArrowRight /></Link>
              <Link href="/giris" className="lp-btn is-ghost">Hesabım var</Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
