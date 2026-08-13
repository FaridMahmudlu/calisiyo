import LegalPageLayout from '@/components/landing/LegalPageLayout';
import { getLegalBusinessConfig } from '@/lib/billing/config';

export const metadata = { title: 'Ön Bilgilendirme Formu', description: 'calisiyo ücretli dijital hizmet ön bilgilendirme formu.', alternates: { canonical: '/on-bilgilendirme' } };

export default function PreInformationPage() {
  const seller = getLegalBusinessConfig();
  return <LegalPageLayout title="Ön Bilgilendirme Formu" subtitle="Sürüm: 13 Ağustos 2026 · Siparişe özel tutar ödeme öncesinde ayrıca gösterilir.">
    <h2>1. Satıcı ve iletişim</h2><ul><li><strong>Ticari unvan:</strong> {seller.legalName || 'Ücretli satış etkinleştirilmeden önce ilan edilecektir.'}</li><li><strong>Vergi/MERSİS:</strong> {seller.taxOrMersis || 'Ücretli satış etkinleştirilmeden önce ilan edilecektir.'}</li><li><strong>Adres:</strong> {seller.address}</li><li><strong>Telefon:</strong> {seller.phoneDisplay}</li>{seller.supportEmail && <li><strong>E-posta:</strong> {seller.supportEmail}</li>}</ul>
    <h2>2. Hizmetin temel nitelikleri</h2><p>calisiyo Odak ve Zirve paketleri; YKS çalışma planlama, kayıt, analiz ve çalışma sınıfı özelliklerinde belirtilen limitleri 30 veya 365 gün boyunca sağlayan ön ödemeli dijital hizmetlerdir.</p>
    <h2>3. Toplam bedel</h2><p>Vergiler dahil toplam tutar, seçilen paket ve dönemle birlikte “ödeme yükümlülüğü doğuran siparişi onayla” düğmesinden hemen önce gösterilir. İyzico sayfasında da aynı tutar onaya sunulur.</p>
    <h2>4. İfa ve süre</h2><p>Ödeme İyzico tarafından doğrulandıktan sonra erişim kullanıcı hesabına tanımlanır. Paket otomatik yenilenmez; 30 veya 365 günlük sürenin sonunda ücret alınmadan Başlangıç planına dönülür.</p>
    <h2>5. Cayma ve iade</h2><p>Kullanıcının açık onayıyla anında ifasına başlanan dijital hizmetlerde mevzuattaki cayma hakkı istisnası uygulanabilir. Hizmet hiç etkinleştirilmediyse veya ayıplı ifa varsa yasal haklar saklıdır. Ayrıntılar İptal ve İade Politikası’ndadır.</p>
    <h2>6. Uyuşmazlık</h2><p>Tüketici, yürürlükteki parasal sınırlara göre yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetine ya da Tüketici Mahkemesine başvurabilir.</p>
  </LegalPageLayout>;
}
