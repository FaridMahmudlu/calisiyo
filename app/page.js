import Link from 'next/link';
import { BarChart3, BookMarked, BookOpen, CalendarDays, Check, Clock3, FileText, HelpCircle, ListChecks, RotateCcw, Target, Timer } from 'lucide-react';

const FEATURES = [
  ['Günlük ve haftalık plan', CalendarDays], ['Konu takibi', ListChecks], ['Deneme analizi', BarChart3],
  ['Tekrarlar', RotateCcw], ['Yapamadığım sorular', HelpCircle], ['Kaynaklar', BookOpen],
  ['İstatistikler', BarChart3], ['Pomodoro', Timer], ['Not defteri', FileText], ['Hedefler', Target],
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav"><Link href="/" className="public-brand"><span><BookMarked size={21} /></span>calisiyo</Link><div className="landing-links"><a href="#ozellikler">Özellikler</a><a href="#nasil-calisir">Nasıl Çalışır</a></div><div className="landing-auth"><Link href="/giris">Giriş Yap</Link><Link className="public-button primary" href="/kayit">Ücretsiz Başla</Link></div></nav>

      <section className="landing-hero">
        <div className="hero-copy"><span className="public-kicker">YKS Çalışma Koçu</span><h1>YKS hazırlığını tek bir yerde <em>planla, takip et ve geliştir.</em></h1><p>Günlük ve haftalık planını oluştur, konularını takip et, denemelerini analiz et ve eksiklerine gerçek verilerinle odaklan.</p><div className="hero-actions"><Link className="public-button primary" href="/kayit">Ücretsiz Başla</Link><Link className="public-button" href="/giris">Giriş Yap</Link></div><div className="hero-notes"><span><Check size={15} /> Kredi kartı gerekmez</span><span><Check size={15} /> Web ve mobil uyumlu</span></div></div>
        <div className="product-preview" aria-label="Calisiyo ürün önizlemesi"><div className="preview-header"><strong>Günlük Program</strong><span>4 Ağustos 2026, Salı</span></div>{[['08:00', 'Paragraf', '40 dk', true], ['11:00', 'TYT Matematik', '60 dk', false], ['15:00', 'Fizik', '40 dk', false]].map(([time, task, duration, done]) => <div className="preview-task" key={time}><time>{time}</time><span className={done ? 'done' : ''}><Check size={13} /></span><div><strong>{task}</strong><small>{done ? 'Tamamlandı' : 'Planlandı'}</small></div><em>{duration}</em></div>)}<div className="preview-bottom"><div><span>Konu ilerlemesi</span><strong>%68</strong></div><div><span>Son deneme</span><strong>Gerçek verin</strong></div></div></div>
      </section>

      <section className="feature-strip" id="ozellikler">{FEATURES.map(([label, Icon]) => <Link href="/kayit" key={label}><Icon size={24} /><span>{label}</span></Link>)}</section>

      <section className="how-section" id="nasil-calisir"><h2>Nasıl çalışır?</h2><div>{[['1', 'Planını oluştur', 'Günlük veya haftalık planını, çalışma bloklarını ve hedeflerini belirle.'], ['2', 'Düzenli çalış ve takip et', 'Konularını ilerlet, kaynaklarını kullan, Pomodoro oturumlarını kaydet.'], ['3', 'Tekrar et ve geliş', 'Deneme sonuçları, tekrarlar ve istatistiklerle eksiklerini güçlendir.']].map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>

      <footer className="landing-footer"><Link href="/" className="public-brand"><span><BookMarked size={18} /></span>calisiyo</Link><p>YKS hazırlığında planla, takip et, geliştir.</p><div><Link href="/giris">Giriş Yap</Link><Link href="/kayit">Ücretsiz Başla</Link></div><small>© 2026 Calisiyo.</small></footer>
    </main>
  );
}
