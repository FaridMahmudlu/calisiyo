import LegalPageLayout from '@/components/landing/LegalPageLayout';
import { getLegalBusinessConfig } from '@/lib/billing/config';

export const metadata = { title: 'Ön Bilgilendirme Formu', description: 'calisiyo ücretli dijital hizmet ön bilgilendirme formu.', alternates: { canonical: '/on-bilgilendirme' } };

export default function PreInformationPage() {
  const seller = getLegalBusinessConfig();
  return <LegalPageLayout title="Ön Bilgilendirme Formu" subtitle="Sürüm: 26 Ağustos 2026 · Siparişe özel tutar ödeme öncesinde ayrıca gösterilir.">
    <h2>1. Satıcı ve iletişim</h2><ul><li><strong>Satıcı türü:</strong> Shopier üzerinden satış yapan bireysel satıcı</li>{seller.legalName && <li><strong>Ad / unvan:</strong> {seller.legalName}</li>}{seller.taxOrMersis && <li><strong>Vergi/MERSİS:</strong> {seller.taxOrMersis}</li>}<li><strong>Adres:</strong> {seller.address}</li><li><strong>Telefon:</strong> {seller.phoneDisplay}</li>{seller.supportEmail && <li><strong>E-posta:</strong> {seller.supportEmail}</li>}</ul>
    <h2>2. Hizmetin temel nitelikleri</h2><p>calisiyo ücretsiz ve calisiyo plus; YKS çalışma planlama, kayıt, analiz ve çalışma sınıfı özelliklerini seçilen planın belirtilen limitleriyle sunan dijital hizmetlerdir. calisiyo plus, YKS 2028 için 25 Haziran 2028; YKS 2027 için 19 Ağustos 2027 tarihine kadar geçerli ön ödemeli erişim seçeneğidir.</p>
    <h2>3. Toplam bedel</h2><p>Vergiler dahil toplam tutar, seçilen paket ve dönemle birlikte “ödeme yükümlülüğü doğuran siparişi onayla” düğmesinden hemen önce gösterilir. Shopier ödeme sayfasında da aynı tutar onaya sunulur.</p>
    <h2>4. İfa ve süre</h2><p>Ödeme Shopier kayıtları üzerinden sunucu tarafında doğrulandıktan sonra erişim kullanıcı hesabına tanımlanır. YKS 2027 seçeneği 19 Ağustos 2027’ye, YKS 2028 seçeneği 25 Haziran 2028’e kadar sürer. Paket otomatik yenilenmez; sürenin sonunda ücret alınmadan calisiyo ücretsiz planına dönülür.</p><p>Geçerli indirim kodları Shopier ödeme ekranında uygulanır. Nihai ödeme tutarı Shopier ekranında gösterilir.</p>
    <h2>5. Cayma ve iade</h2><p>Kullanıcının açık onayıyla anında ifasına başlanan dijital hizmetlerde mevzuattaki cayma hakkı istisnası uygulanabilir. Hizmet hiç etkinleştirilmediyse veya ayıplı ifa varsa yasal haklar saklıdır. Ayrıntılar İptal ve İade Politikası’ndadır.</p>
    <h2>6. Uyuşmazlık</h2><p>Tüketici, yürürlükteki parasal sınırlara göre yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetine ya da Tüketici Mahkemesine başvurabilir.</p>
  </LegalPageLayout>;
}
