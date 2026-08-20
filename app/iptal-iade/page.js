import LegalPageLayout from '@/components/landing/LegalPageLayout';

export const metadata = { title: 'İptal ve İade Politikası', description: 'calisiyo ücretli dijital paket iptal ve iade koşulları.', alternates: { canonical: '/iptal-iade' } };

export default function RefundPage() {
  return <LegalPageLayout title="İptal ve İade Politikası" subtitle="Sürüm: 13 Ağustos 2026">
    <h2>1. Otomatik yenileme yok</h2><p>calisiyo plus, seçilen YKS dönemine göre sunulan ön ödemeli bir erişimdir. YKS 2028 seçeneği 6 ay; YKS 2027 seçeneği ise 19 Ağustos 2027 tarihine kadar geçerlidir. Süre bitiminde kullanıcı yeni bir sipariş vermedikçe ücret alınmaz.</p>
    <h2>2. Ödeme öncesi iptal</h2><p>Shopier’de ödeme tamamlanmamış sipariş kullanıcı tarafından terk edilebilir; karttan çekim yapılmaz. Hesaptaki açık sipariş kaydı daha sonra süre aşımına uğrar veya iptal edilebilir.</p>
    <h2>3. Aktivasyon öncesi ve mükerrer ödeme</h2><p>Ödeme alındığı halde hizmet etkinleşmediyse, mükerrer tahsilat olduysa veya tutar siparişle eşleşmiyorsa destek kanallarına sipariş numarasıyla başvur. Doğrulanan uygunsuz tahsilat iade edilir.</p>
    <h2>4. Dijital hizmet başladıktan sonra</h2><p>Kullanıcının açık onayıyla hemen ifasına başlanan dijital hizmette cayma hakkı istisnası uygulanabilir. Bununla birlikte hizmetin ayıplı olması, hiç sunulmaması veya zorunlu tüketici haklarının doğması halinde inceleme ve uygun çözüm sağlanır.</p>
    <h2>5. İade yöntemi ve süresi</h2><p>Onaylanan iade, mümkünse ödemenin yapıldığı araca gönderilir. Bankanın veya Shopier’in yansıtma süresi calisiyo’nun kontrolü dışında olabilir; süreç kullanıcıya sipariş durumu üzerinden bildirilir.</p>
    <h2>6. Başvuru</h2><p><a href="mailto:calisiyo.destek@gmail.com">calisiyo.destek@gmail.com</a> adresine sipariş numaranı ve talebini yazarak başvurabilirsin.</p>
  </LegalPageLayout>;
}
