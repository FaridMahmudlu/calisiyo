import LegalPageLayout from '@/components/landing/LegalPageLayout';
import { getLegalBusinessConfig } from '@/lib/billing/config';

export const metadata = { title: 'Mesafeli Satış Sözleşmesi', description: 'calisiyo dijital hizmet mesafeli satış sözleşmesi.', alternates: { canonical: '/mesafeli-satis' } };

export default function DistanceSalesPage() {
  const seller = getLegalBusinessConfig();
  return <LegalPageLayout title="Mesafeli Satış Sözleşmesi" subtitle="Sürüm: 26 Ağustos 2026 · Sözleşme, kullanıcı siparişi onayladığında sipariş bilgileriyle birlikte kurulur.">
    <h2>1. Taraflar</h2><p><strong>Satıcı:</strong> {seller.legalName || 'calisiyo bireysel satıcısı'}{seller.taxOrMersis ? `; Vergi/MERSİS: ${seller.taxOrMersis}` : ''}; {seller.address}; {seller.phoneDisplay}{seller.supportEmail ? `; ${seller.supportEmail}` : ''}. Satış ve ödeme Shopier bireysel satıcı hesabı üzerinden yürütülür. <strong>Alıcı</strong>, ödeme öncesinde hesabıyla doğrulanan ve sipariş özetinde bilgileri gösterilen kullanıcıdır.</p>
    <h2>2. Konu</h2><p>Bu sözleşme, alıcının seçtiği calisiyo plus YKS dönemi ön ödemeli dijital erişim paketinin elektronik ortamda satışına ilişkin tarafların hak ve yükümlülüklerini düzenler.</p>
    <h2>3. Paket, süre ve bedel</h2><p>calisiyo plus seçeneğinin YKS dönemi, erişim süresi ve vergiler dahil liste bedeli sipariş özetinde gösterilir. Geçerli indirim kodları Shopier ödeme ekranında uygulanır ve nihai ödeme tutarı Shopier ekranında gösterilir. Otomatik yenileme veya saklı tekrar tahsilat yoktur.</p>
    <h2>4. Ödeme ve teslim</h2><p>Ödeme Shopier’in güvenli sayfasında alınır; kart bilgileri calisiyo tarafından görülmez. Shopier sipariş kaydı sunucu tarafında doğrulandığında dijital erişim kullanıcı hesabına tanımlanır.</p>
    <h2>5. Cayma hakkı</h2><p>Alıcının açık talebi ve onayı üzerine dijital hizmetin cayma süresi dolmadan ifasına başlanır. İfasına başlanan elektronik ortamda anında sunulan hizmet bakımından mevzuattaki cayma hakkı istisnası uygulanabilir. Ayıplı hizmet ve zorunlu tüketici hakları bundan etkilenmez.</p>
    <h2>6. İptal, iade ve destek</h2><p>Henüz etkinleşmemiş veya mükerrer ödemenin iade talebi telefon ve ilan edilen destek e-postası üzerinden alınır. Onaylanan iadeler, kullanılan ödeme aracına ve sağlayıcı süreçlerine uygun şekilde yapılır.</p>
    <h2>7. Kayıt ve delil</h2><p>Sipariş, sözleşme sürümleri, onay zamanı, ödemeye ilişkin sağlayıcı referansı ve erişim aktivasyonu güvenlik ve yasal yükümlülükler için kayıt altına alınır.</p>
    <h2>8. Uyuşmazlık</h2><p>Türk hukuku uygulanır. Tüketicinin Tüketici Hakem Heyeti ve Tüketici Mahkemesine başvuru hakkı saklıdır.</p>
  </LegalPageLayout>;
}
