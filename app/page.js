'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BarChart3, BookMarked, BookOpen, CalendarDays, Check, ChevronRight,
  Clock3, FileText, HelpCircle, ListChecks, LockKeyhole, RotateCcw, Sparkles,
  Target, Timer, TrendingUp,
} from 'lucide-react';

const FEATURES = [
  ['Günlük ve haftalık plan', CalendarDays], ['Konu takibi', ListChecks], ['Deneme analizi', BarChart3],
  ['Tekrarlar', RotateCcw], ['Yapamadığım sorular', HelpCircle], ['Kaynaklar', BookOpen],
  ['İstatistikler', TrendingUp], ['Pomodoro', Timer], ['Not defteri', FileText], ['Hedefler', Target],
];

const TOUR = [
  {
    id: 'plan',
    label: 'Planla',
    icon: CalendarDays,
    title: 'Gününü ve haftanı tek ekranda kur',
    text: 'Ders, konu, soru sayısı, süre ve başlangıç saatini belirle. Bir görevi tamamladığında ilerleme ve çalışma verilerin otomatik güncellenir.',
    bullets: ['Günlük zaman çizelgesi', 'Haftalık ders dağılımı', 'Tamamlanma ve soru takibi'],
  },
  {
    id: 'track',
    label: 'Takip et',
    icon: ListChecks,
    title: 'Nerede kaldığını kaybetme',
    text: 'Konu durumlarını, kullandığın kaynakları, yapamadığın soruları ve tekrar tarihlerini aynı çalışma akışında yönet.',
    bullets: ['Alanına uygun TYT, AYT veya YDT görünümü', 'Kaynak ve soru fotoğrafı desteği', 'Tekrar zamanı yaklaşan kayıtlar'],
  },
  {
    id: 'improve',
    label: 'Geliştir',
    icon: BarChart3,
    title: 'Sonuçlarını kendi kayıtlarınla karşılaştır',
    text: 'Deneme sonuçlarını ders bazında gir; net, süre, soru ve konu ilerlemeni gerçek çalışma kayıtlarından oluşan özetlerle incele.',
    bullets: ['Ders bazında deneme analizi', 'Haftalık çalışma ve soru özeti', 'Kişisel hedeflerle karşılaştırma'],
  },
];

const STEPS = [
  ['1', 'Hesabını oluştur', 'Adını, e-posta adresini ve hazırlanacağın alanı seç. Sayısal, eşit ağırlık, sözel veya dil görünümün buna göre hazırlanır.'],
  ['2', 'İlk planını ekle', 'Günlük programa dersini, konunu, süreni ve soru hedefini yaz. İstersen haftalık görünümden tüm programı kontrol et.'],
  ['3', 'Çalışmanı kaydet', 'Görevlerini tamamla, Pomodoro kullan, deneme ve konu durumlarını güncelle. İstatistikler yalnızca kaydettiğin verilerden oluşur.'],
  ['4', 'Eksiklerine dön', 'Tekrar listesi, yapamadığın sorular ve deneme ayrıntıları sana bir sonraki çalışmada nereden devam edeceğini gösterir.'],
];

function Reveal({ children, className = '', delay = 0, ...props }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  const [activeTour, setActiveTour] = useState('plan');
  const selectedTour = TOUR.find((item) => item.id === activeTour) || TOUR[0];
  const ActiveIcon = selectedTour.icon;

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link href="/" className="public-brand"><span><BookMarked size={21} /></span>calisiyo</Link>
        <div className="landing-links"><a href="#ozellikler">Özellikler</a><a href="#nasil-calisir">Nasıl çalışır?</a><a href="#sorular">Sorular</a></div>
        <div className="landing-auth"><Link href="/giris">Giriş Yap</Link><Link className="public-button primary" href="/kayit">Ücretsiz Başla</Link></div>
      </nav>

      <section className="landing-hero">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, ease: [0.22, 1, 0.36, 1] }}>
          <span className="public-kicker"><Sparkles size={13} /> YKS çalışma alanın</span>
          <h1>YKS hazırlığını tek bir yerde <em>planla, takip et ve geliştir.</em></h1>
          <p>Günlük programdan deneme analizine kadar çalışma düzenini tek yerde kur. Gördüğün ilerleme yalnızca kendi eklediğin görev, süre, soru ve sonuç kayıtlarından oluşur.</p>
          <div className="hero-actions"><Link className="public-button primary" href="/kayit">Ücretsiz Başla <ArrowRight size={16} /></Link><a className="public-button" href="#nasil-calisir">Nasıl çalışır?</a></div>
          <div className="hero-notes"><span><Check size={15} /> Kredi kartı gerekmez</span><span><Check size={15} /> Telefon ve bilgisayarda çalışır</span><span><Check size={15} /> Kişisel çalışma alanı</span></div>
        </motion.div>
        <motion.div className="product-preview" aria-label="Calisiyo örnek kullanım önizlemesi" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .62, delay: .12, ease: [0.22, 1, 0.36, 1] }}>
          <div className="preview-demo-label">Örnek kullanım</div>
          <div className="preview-header"><strong>Günlük Program</strong><span>Bugünün çalışma akışı</span></div>
          {[['08:00', 'Paragraf', '40 dk', true], ['11:00', 'TYT Matematik', '60 dk', false], ['15:00', 'Fizik', '40 dk', false]].map(([time, task, duration, done]) => <div className="preview-task" key={time}><time>{time}</time><span className={done ? 'done' : ''}><Check size={13} /></span><div><strong>{task}</strong><small>{done ? 'Tamamlandı' : 'Planlandı'}</small></div><em>{duration}</em></div>)}
          <div className="preview-bottom"><div><span>Plan durumu</span><strong>1 / 3 tamamlandı</strong></div><div><span>Sıradaki</span><strong>TYT Matematik</strong></div></div>
        </motion.div>
      </section>

      <Reveal className="feature-strip" id="ozellikler">{FEATURES.map(([label, Icon]) => <Link href="/kayit" key={label}><Icon size={24} /><span>{label}</span></Link>)}</Reveal>

      <section className="landing-tour section-shell">
        <Reveal className="section-heading"><span className="public-kicker">Tek bir çalışma akışı</span><h2>Planından analizine kadar birbirine bağlı</h2><p>Bir yerde kaydettiğin çalışma, ilgili özet ve ilerleme alanlarına yansır. Aynı bilgiyi tekrar tekrar girmek zorunda kalmazsın.</p></Reveal>
        <Reveal className="tour-layout">
          <div className="tour-tabs" role="tablist" aria-label="Ürün özellikleri">
            {TOUR.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={activeTour === id} className={activeTour === id ? 'is-active' : ''} onClick={() => setActiveTour(id)}><Icon size={20} /><span>{label}</span><ChevronRight size={17} /></button>)}
          </div>
          <motion.article className="tour-panel" key={selectedTour.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .28 }}>
            <span className="tour-panel-icon"><ActiveIcon size={26} /></span><h3>{selectedTour.title}</h3><p>{selectedTour.text}</p><ul>{selectedTour.bullets.map((bullet) => <li key={bullet}><Check size={16} />{bullet}</li>)}</ul><Link href="/kayit">Bu akışla başla <ArrowRight size={16} /></Link>
          </motion.article>
        </Reveal>
      </section>

      <section className="how-section section-shell" id="nasil-calisir">
        <Reveal className="section-heading"><span className="public-kicker">Kısa başlangıç rehberi</span><h2>İlk planından düzenli takibe dört adım</h2><p>Teknik ayarlarla uğraşmadan hesabını kurar, çalışmaya başlarsın.</p></Reveal>
        <div className="tutorial-steps">{STEPS.map(([number, title, text], index) => <Reveal className="tutorial-card" key={number} delay={index * .06}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></Reveal>)}</div>
        <Reveal className="tutorial-cta"><div><Clock3 size={22} /><span><strong>İlk planın birkaç adımda hazır</strong><small>Alanını seç, görevini ekle ve ilerlemeyi kaydet.</small></span></div><Link className="public-button primary" href="/kayit">Ücretsiz hesap oluştur <ArrowRight size={16} /></Link></Reveal>
      </section>

      <section className="trust-section section-shell">
        <Reveal className="trust-card"><span><LockKeyhole size={24} /></span><div><h2>Çalışma alanın sana özeldir</h2><p>Program, deneme, not, kaynak ve soru kayıtların hesabına bağlı tutulur. Yüklediğin kaynak kapakları ve soru fotoğrafları herkese açık bir galeriye dönüşmez.</p></div></Reveal>
        <Reveal className="trust-card" delay={.08}><span><TrendingUp size={24} /></span><div><h2>Özetler kayıtlarından hesaplanır</h2><p>Seri, soru, süre, konu ve deneme özetlerinde uydurma başarı oranı veya hazır sıralama gösterilmez; sonuçlar sen veri ekledikçe oluşur.</p></div></Reveal>
      </section>

      <section className="faq-section section-shell" id="sorular">
        <Reveal className="section-heading"><span className="public-kicker">Merak edilenler</span><h2>Başlamadan önce bilmek isteyebileceklerin</h2></Reveal>
        <div className="faq-list">
          <details><summary>Hangi alanlar destekleniyor?<ChevronRight size={18} /></summary><p>Sayısal, eşit ağırlık, sözel ve dil alanları desteklenir. Seçimine göre TYT, AYT ve YDT dersleri ile sınav sekmeleri uyarlanır.</p></details>
          <details><summary>İlerleme verileri nereden geliyor?<ChevronRight size={18} /></summary><p>Tamamladığın görevler, kaydettiğin Pomodoro oturumları, konu durumları ve deneme sonuçlarından hesaplanır. Veri eklemediğinde yapay bir ilerleme gösterilmez.</p></details>
          <details><summary>Alanımı sonradan değiştirebilir miyim?<ChevronRight size={18} /></summary><p>Evet. Ayarlar bölümünden alanını değiştirebilirsin. Görünür ders ve sınav sekmeleri güncellenir; daha önce oluşturduğun kayıtlar silinmez.</p></details>
          <details><summary>Telefonumdan kullanabilir miyim?<ChevronRight size={18} /></summary><p>Evet. Arayüz telefon, tablet ve bilgisayar ekranlarına uyum sağlar; aynı hesabınla giriş yaptığında çalışma kayıtlarına erişirsin.</p></details>
        </div>
      </section>

      <Reveal className="landing-final-cta"><span className="public-kicker">Bugün başla</span><h2>Çalışma düzenini tek yerde kur.</h2><p>Planını oluştur, çalışmanı kaydet ve bir sonraki adımını kendi verilerinle gör.</p><Link className="public-button primary" href="/kayit">Ücretsiz Başla <ArrowRight size={16} /></Link></Reveal>

      <footer className="landing-footer"><Link href="/" className="public-brand"><span><BookMarked size={18} /></span>calisiyo</Link><p>YKS hazırlığında planla, takip et, geliştir.</p><div><Link href="/giris">Giriş Yap</Link><Link href="/kayit">Ücretsiz Başla</Link></div><small>© 2026 Calisiyo.</small></footer>
    </main>
  );
}
