import LegalPageLayout from '@/components/landing/LegalPageLayout';
import { getLegalBusinessConfig } from '@/lib/billing/config';

export const metadata = { title: 'Mesafeli Satış Sözleşmesi · calisiyo', description: 'calisiyo dijital hizmet mesafeli satış sözleşmesi.' };

export default function DistanceSalesPage() {
  const seller = getLegalBusinessConfig();
  return <LegalPageLayout title="Mesafeli Satış Sözleşmesi" subtitle="Sürüm: 13 Ağustos 2026 · Sözleşme, kullanıcı siparişi onayladığında sipariş bilgileriyle birlikte kurulur.">
    <h2>1. Taraflar</h2><p><strong>Satıcı:</strong> {seller.legalName || 'Ücretli satış etkinleştirilmeden önce resmi ticari unvan burada ve ödeme ekranında ilan edilecektir.'}; <strong>Vergi/MERSİS:</strong> {seller.taxOrMersis || 'Ücretli satış etkinleştirilmeden önce ilan edilecektir.'}; {seller.address}; {seller.phoneDisplay}{seller.supportEmail ? `; ${seller.supportEmail}` : ''}. <strong>Alıcı</strong>, ödeme öncesinde hesabıyla doğrulanan ve sipariş özetinde bilgileri gösterilen kullanıcıdır.</p>
    <h2>2. Konu</h2><p>Bu sözleşme, alıcının seçtiği calisiyo Odak veya Zirve ön ödemeli dijital erişim paketinin elektronik ortamda satışına ilişkin tarafların hak ve yükümlülüklerini düzenler.</p>
    <h2>3. Paket, süre ve bedel</h2><p>Paket adı, 30/365 günlük kullanım dönemi ve vergiler dahil toplam bedel siparişe özel özet ve İyzico ödeme sayfasında gösterilir. Otomatik yenileme veya saklı tekrar tahsilat yoktur.</p>
    <h2>4. Ödeme ve teslim</h2><p>Ödeme İyzico’nun güvenli sayfasında alınır; kart bilgileri calisiyo tarafından görülmez. İyzico Link API satış kaydını doğruladığında dijital erişim kullanıcı hesabına tanımlanır.</p>
    <h2>5. Cayma hakkı</h2><p>Alıcının açık talebi ve onayı üzerine dijital hizmetin cayma süresi dolmadan ifasına başlanır. İfasına başlanan elektronik ortamda anında sunulan hizmet bakımından mevzuattaki cayma hakkı istisnası uygulanabilir. Ayıplı hizmet ve zorunlu tüketici hakları bundan etkilenmez.</p>
    <h2>6. İptal, iade ve destek</h2><p>Henüz etkinleşmemiş veya mükerrer ödemenin iade talebi telefon ve ilan edilen destek e-postası üzerinden alınır. Onaylanan iadeler, kullanılan ödeme aracına ve sağlayıcı süreçlerine uygun şekilde yapılır.</p>
    <h2>7. Kayıt ve delil</h2><p>Sipariş, sözleşme sürümleri, onay zamanı, ödemeye ilişkin sağlayıcı referansı ve erişim aktivasyonu güvenlik ve yasal yükümlülükler için kayıt altına alınır.</p>
    <h2>8. Uyuşmazlık</h2><p>Türk hukuku uygulanır. Tüketicinin Tüketici Hakem Heyeti ve Tüketici Mahkemesine başvuru hakkı saklıdır.</p>
  </LegalPageLayout>;
}
