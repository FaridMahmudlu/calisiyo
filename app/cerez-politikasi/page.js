import LegalPageLayout from '@/components/landing/LegalPageLayout';

export const metadata = { title: 'Çerez Politikası', description: 'calisiyo çerez ve analitik tercihleri.', alternates: { canonical: '/cerez-politikasi' } };

export default function CookiePolicyPage() {
  return <LegalPageLayout title="Çerez Politikası" subtitle="Sürüm: 3 Eylül 2026">
    <h2>1. Çerez nedir?</h2><p>Çerezler, oturumun güvenli biçimde devam etmesi ve tercihlerin hatırlanması için tarayıcında saklanan küçük kayıtlardır.</p>
    <h2>2. Zorunlu çerezler</h2><p>Supabase kimlik doğrulama oturumunun korunması, güvenli giriş, çıkış ve yetkilendirme için gereken çerezler hizmetin çalışmasının parçasıdır. Bunlar analitik veya reklam amacıyla kullanılmaz.</p>
    <h2>3. İsteğe bağlı analitik</h2><p>Yalnızca açıkça izin verdiğinde PostHog ve Google Analytics, sayfa kullanımını ve ürün etkileşimlerini ölçmek için yüklenir. Reddettiğinde bu araçlar başlatılmaz.</p>
    <h2>4. Tercihini değiştirme</h2><p>Her sayfanın altındaki <strong>Çerez tercihleri</strong> düğmesinden kararını dilediğin zaman değiştirebilirsin. Tarayıcı ayarlarından site verilerini temizlemek de tercih ekranını yeniden açar.</p>
    <h2>5. İçerik üretici kodları</h2><p>İçerik üretici kodu için yönlendirme bağlantısı, kampanya çerezi veya cihazlar arası takip kullanılmaz. Kod yalnızca kayıt ekranında isteğe bağlı olarak yazılır ve doğrulanırsa güvenli biçimde kullanıcı hesabıyla ilişkilendirilir.</p>
    <h2>6. Üçüncü taraflar</h2><ul><li>Supabase: kimlik doğrulama ve zorunlu oturum yönetimi</li><li>PostHog: izinli ürün analitiği</li><li>Google Analytics: izinli toplu trafik analizi</li><li>Sentry: güvenlik ve teknik hata kaydı</li></ul>
  </LegalPageLayout>;
}
