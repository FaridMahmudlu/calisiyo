'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  PiArrowRight, PiCalendarCheck, PiChartLineUp,
  PiCheck, PiClockCountdown, PiCompass, PiListChecks, PiLockKey,
  PiPlayCircle, PiSparkle, PiTarget, PiTimer,
} from 'react-icons/pi';
import BrandLogo from '@/components/brand/BrandLogo';
import { daysUntilYKS, yksDateLabel } from '@/lib/utils/date';

const STORY = [
  {
    id: 'planla',
    number: '01',
    eyebrow: 'Planla',
    title: 'Bugün ne yapacağını bil.',
    text: 'Dersini, konunu, başlama saatini, süreni ve soru hedefini tek bir akışta planla. Günlük ve haftalık görünüm aynı kayıtlardan beslenir.',
    image: '/assets/landing/study-path-plan.webp',
    alt: 'Ajanda, kitaplar ve planlama kontrol noktalarıyla 3D çalışma yolu',
    facts: [['08:00', 'Paragraf · 40 dk'], ['11:00', 'TYT Matematik · 60 dk'], ['15:00', 'Fizik · 40 dk']],
    Icon: PiCalendarCheck,
  },
  {
    id: 'odaklan',
    number: '02',
    eyebrow: 'Odaklan',
    title: 'Süreyi gerçekten çalışmaya dönüştür.',
    text: 'Pomodoro ile kesintisiz bir çalışma oturumu başlat. Tamamlanan süre doğrudan çalışma kaydına, istatistiklerine ve günlük seri hedefine yansır.',
    image: '/assets/landing/study-path-focus.webp',
    alt: '25 dakikalık odak zamanlayıcısı, kulaklık ve masa lambasıyla 3D çalışma sahnesi',
    facts: [['25:00', 'Odak'], ['05:00', 'Kısa mola'], ['30 dk', 'Günlük seri eşiği']],
    Icon: PiTimer,
  },
  {
    id: 'ilerle',
    number: '03',
    eyebrow: 'İlerle',
    title: 'Bir sonraki doğru adımı verilerinle gör.',
    text: 'Süre, soru, konu ve deneme kayıtlarını birlikte incele. İstatistikler hazır başarı oranlarından değil, yalnızca kendi gerçek çalışmalarından hesaplanır.',
    image: '/assets/landing/study-path-progress.webp',
    alt: 'İlerleme çubukları, kontrol noktaları ve YKS zirvesiyle 3D çalışma yolu',
    facts: [['Süre', 'Günlük ve haftalık toplam'], ['Soru', 'Ders ve konu dağılımı'], ['Deneme', 'Net ve süre karşılaştırması']],
    Icon: PiChartLineUp,
  },
];

const CAPABILITIES = [
  ['Günlük ve haftalık program', PiCalendarCheck],
  ['Konu ve tekrar takibi', PiListChecks],
  ['Pomodoro ve süre kaydı', PiTimer],
  ['Deneme analizi', PiTarget],
  ['Gerçek çalışma istatistikleri', PiChartLineUp],
  ['Kişisel YKS hedefleri', PiCompass],
];

function Reveal({ children, className = '', delay = 0, ...props }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function StoryChapter({ chapter, index }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [52, -42]);
  const imageRotate = useTransform(scrollYProgress, [0, 0.5, 1], reduceMotion ? [0, 0, 0] : [1.5, 0, -1.5]);
  const Icon = chapter.Icon;

  return (
    <section className={`story-chapter ${index % 2 ? 'is-reversed' : ''}`} id={chapter.id} ref={ref}>
      <Reveal className="story-copy">
        <span className="story-number">{chapter.number}</span>
        <span className="public-kicker"><Icon /> {chapter.eyebrow}</span>
        <h2>{chapter.title}</h2>
        <p>{chapter.text}</p>
        <div className="story-facts">
          {chapter.facts.map(([value, label]) => <div key={`${value}-${label}`}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
        <Link href="/kayit" className="text-link">Bu akışla başla <PiArrowRight /></Link>
      </Reveal>
      <motion.div className="story-visual" style={{ y: imageY, rotate: imageRotate }}>
        <Image src={chapter.image} alt={chapter.alt} fill sizes="(max-width: 900px) 92vw, 48vw" />
      </motion.div>
    </section>
  );
}

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.22], reduceMotion ? [0, 0] : [0, 80]);
  const heroScale = useTransform(scrollYProgress, [0, 0.22], reduceMotion ? [1, 1] : [1, 0.96]);
  const remainingDays = daysUntilYKS();
  const examDate = yksDateLabel();

  return (
    <main className="story-landing">
      <motion.div className="landing-scroll-progress" style={{ scaleX: scrollYProgress }} />
      <nav className="story-nav" aria-label="Ana navigasyon">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <div className="story-nav-links"><a href="#yolculuk">Çalışma yolu</a><a href="#araclar">Araçlar</a><a href="#rehber">Nasıl çalışır?</a></div>
        <div className="landing-auth"><Link href="/giris">Giriş yap</Link><Link className="public-button primary" href="/kayit">Ücretsiz başla</Link></div>
      </nav>

      <section className="story-hero">
        <motion.div className="story-hero-copy" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .62, ease: [0.22, 1, 0.36, 1] }}>
          <span className="public-kicker"><PiSparkle /> YKS çalışma yolun</span>
          <h1>Dağınık çalışmayı <em>net bir yola</em> dönüştür.</h1>
          <p>Bugün ne yapacağını bil, odaklanarak çalış ve gelişimini yalnızca kendi gerçek kayıtlarından takip et.</p>
          <div className="hero-actions"><Link className="public-button primary" href="/kayit">Ücretsiz başla <PiArrowRight /></Link><a className="public-button" href="#yolculuk"><PiPlayCircle /> Nasıl çalışır?</a></div>
          <div className="hero-proof"><span><PiCheck /> Kredi kartı gerekmez</span><span><PiCheck /> Telefon ve bilgisayarda uyumlu</span></div>
          <div className="exam-countdown"><PiClockCountdown /><div><strong>{remainingDays ?? '—'} gün</strong><span>Tahmini YKS tarihi · {examDate}</span></div></div>
        </motion.div>
        <motion.div className="story-hero-visual" style={{ y: heroY, scale: heroScale }} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .72, delay: .1, ease: [0.22, 1, 0.36, 1] }}>
          <Image src="/assets/landing/study-path-hero.webp" alt="Planlamadan YKS zirvesine uzanan 3D çalışma yolu" fill priority sizes="(max-width: 900px) 96vw, 55vw" />
          <div className="hero-milestone is-plan"><span>01</span><strong>Planla</strong></div>
          <div className="hero-milestone is-focus"><span>02</span><strong>Odaklan</strong></div>
          <div className="hero-milestone is-progress"><span>03</span><strong>İlerle</strong></div>
        </motion.div>
      </section>

      <section className="story-intro section-shell" id="yolculuk">
        <Reveal className="section-heading"><span className="public-kicker">Kaydırdıkça çalışma yolunu keşfet</span><h2>Planından YKS hedefine kadar tek, bağlı bir akış.</h2><p>Her kayıt bir sonraki ekranı günceller. Aynı bilgiyi farklı yerlere tekrar yazmadan nerede olduğunu görürsün.</p></Reveal>
        <div className="story-route" aria-hidden="true"><i /><span>Planla</span><i /><span>Odaklan</span><i /><span>İlerle</span><i /></div>
      </section>

      <div className="story-chapters section-shell">
        {STORY.map((chapter, index) => <StoryChapter key={chapter.id} chapter={chapter} index={index} />)}
      </div>

      <section className="capability-section section-shell" id="araclar">
        <Reveal className="section-heading"><span className="public-kicker">Birbirini tamamlayan araçlar</span><h2>Paneldeki bütün işlevler, daha anlaşılır bir düzende.</h2><p>Plan, konu, deneme, tekrar, kaynak, not, hedef ve istatistik kayıtları aynı hesabın içinde birlikte çalışır.</p></Reveal>
        <div className="capability-grid">
          {CAPABILITIES.map(([label, Icon], index) => <Reveal className="capability-card" key={label} delay={index * .04}><span><Icon /></span><strong>{label}</strong><PiArrowRight /></Reveal>)}
        </div>
      </section>

      <section className="guide-section" id="rehber">
        <div className="section-shell guide-grid">
          <Reveal className="guide-heading"><span className="public-kicker">İlk 10 dakikan</span><h2>Teknik ayar yok. Çalışma var.</h2><p>Hesabını açtıktan sonra alanını seçer, ilk planını kurar ve gerçek çalışma verini oluşturmaya başlarsın.</p><Link className="public-button primary" href="/kayit">İlk planını oluştur <PiArrowRight /></Link></Reveal>
          <div className="guide-steps">
            {[
              ['1', 'Alanını seç', 'Sayısal, eşit ağırlık, sözel veya dil görünümünü hazırla.'],
              ['2', 'Görevini ekle', 'Ders, konu, saat, süre ve soru hedefini belirle.'],
              ['3', 'Çalış ve kaydet', 'Pomodoro veya çalışma kaydı ile süreyi ilerlemene ekle.'],
              ['4', 'Sonraki adımı gör', 'Tekrar, konu ve deneme verilerine göre devam et.'],
            ].map(([number, title, text], index) => <Reveal className="guide-step" key={number} delay={index * .05}><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></Reveal>)}
          </div>
        </div>
      </section>

      <section className="real-data-section section-shell">
        <Reveal className="real-data-card"><span><PiLockKey /></span><div><h2>Çalışma alanın hesabına özeldir.</h2><p>Program, deneme, not, kaynak ve soru kayıtların yalnızca kendi hesabına bağlı tutulur.</p></div></Reveal>
        <Reveal className="real-data-card" delay={.07}><span><PiChartLineUp /></span><div><h2>İstatistikler gerçek kayıtlarından doğar.</h2><p>Veri eklemediğinde yapay başarı oranı gösterilmez; sonuçlar çalıştıkça oluşur.</p></div></Reveal>
      </section>

      <section className="landing-final-cta section-shell">
        <Reveal><span className="public-kicker">Yolun bugün başlıyor</span><h2>Bir sonraki çalışmanı şansa bırakma.</h2><p>Planını oluştur, 30 dakikalık seri hedefini tamamla ve YKS yolunu kendi verilerinle yönet.</p><Link className="public-button primary" href="/kayit">Ücretsiz başla <PiArrowRight /></Link></Reveal>
      </section>

      <footer className="story-footer">
        <div className="section-shell footer-grid"><div><Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo /></Link><p>YKS hazırlığını net bir çalışma yoluna dönüştür.</p></div><div><strong>Ürün</strong><a href="#yolculuk">Çalışma yolu</a><a href="#araclar">Araçlar</a><a href="#rehber">Başlangıç rehberi</a></div><div><strong>Hesap</strong><Link href="/giris">Giriş yap</Link><Link href="/kayit">Ücretsiz hesap oluştur</Link></div><small>© 2026 calisiyo · YKS Çalışma Koçu</small></div>
      </footer>
    </main>
  );
}
