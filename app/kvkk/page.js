import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import PublicFooter from '@/components/landing/PublicFooter';
import { getLegalBusinessConfig } from '@/lib/billing/config';

export const metadata = {
  title: 'KVKK Aydınlatma Metni – calisiyo',
  description: '6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca KVKK Aydınlatma Metni ve Veri Sahibi Hakları.',
};

export default function KvkkPage() {
  const contact = getLegalBusinessConfig();
  return (
    <main className="story-landing">
      <nav className="story-nav" aria-label="Ana navigasyon">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa">
          <BrandLogo priority />
        </Link>
        <div className="landing-auth">
          <Link href="/giris">Giriş yap</Link>
          <Link className="public-button primary" href="/kayit">Ücretsiz başla</Link>
        </div>
      </nav>

      <div className="legal-shell section-shell">
        <span className="public-kicker">KVKK Aydınlatma Metni</span>
        <h1>6698 Sayılı KVKK Uyarınca Aydınlatma Metni</h1>
        <p className="legal-subtitle">Son Güncelleme Tarihi: 9 Ağustos 2026</p>

        <hr className="legal-divider" />

        <section className="legal-content">
          <h2>1. Veri Sorumlusunun Kimliği</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, <strong>calisiyo</strong> platformu kapsamında işlenen kişisel verileriniz bakımından veri sorumlusu sıfatıyla <strong>{contact.legalName || 'calisiyo platform işletmecisi'}</strong> olarak hareket edilmektedir. İletişim adresi: {contact.address}; telefon: {contact.phoneDisplay}.
          </p>

          <h2>2. İşlenen Kişisel Verileriniz ve Toplama Yöntemi</h2>
          <p>
            Kişisel verileriniz, calisiyo platformuna kayıt olmanız, giriş yapmanız, profil bilgilerinizi doldurmanız ve platform içerisindeki günlük program, pomodoro süresi, deneme analizi ve not kaydı araçlarını kullanmanız sırasında doğrudan dijital ortamda elektronik yöntemlerle toplanmaktadır. Toplanan verileriniz şunlardır:
          </p>
          <ul>
            <li><strong>Kimlik Verisi:</strong> Ad ve soyadınız.</li>
            <li><strong>İletişim Verisi:</strong> E-posta adresiniz.</li>
            <li><strong>Müşteri İşlem ve Kullanım Verisi:</strong> YKS alanı seçiminiz (Sayısal, Eşit Ağırlık, Sözel, Dil), günlük ders çalışma süreleriniz, soru çözme ve deneme sınavı sonuçlarınız, kişisel çalışma hedefleriniz ve notlarınız.</li>
            <li><strong>İşlem Güvenliği Verisi:</strong> Şifrelenmiş parola, IP adresi, giriş-çıkış kayıtları, cihaz ve tarayıcı bilgisi.</li>
          </ul>

          <h2>3. Kişisel Verilerin İşlenme Amaçları ve Hukuki Sebepleri</h2>
          <p>
            Kişisel verileriniz, KVKK’nın 5. maddesinde belirtilen hukuki sebeplere dayalı olarak aşağıdaki amaçlarla işlenmektedir:
          </p>
          <ul>
            <li><strong>Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması kaydıyla (KVKK m. 5/2-c):</strong> Üyelik hesabınızın açılması, kişisel çalışma alanınızın oluşturulması ve YKS hazırlık hizmetlerinin sunulması.</li>
            <li><strong>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması (KVKK m. 5/2-ç):</strong> Sistem güvenliğinin sağlanması ve mevzuattan kaynaklanan bilgi saklama yükümlülüklerinin ifası.</li>
            <li><strong>İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması (KVKK m. 5/2-f):</strong> Platform performansının analizi, sistem hatalarının giderilmesi ve hizmet kalitesinin artırılması.</li>
          </ul>

          <h2>4. Kişisel Verilerin Aktarıldığı Taraflar ve Aktarım Amacı</h2>
          <p>
            Kişisel verileriniz, üçüncü kişilere satılmamakta veya pazarlama amacıyla paylaşılmamaktadır. Verileriniz yalnızca hizmetin teknik altyapısını sağlayan yurt içi ve yurt dışı güvenli hizmet sağlayıcılarımıza (Supabase veritabanı altyapısı, Vercel barındırma sunucuları, Sentry hata takip sistemi) KVKK’nın 8. ve 9. maddelerine uygun olarak aktarılmaktadır.
          </p>

          <h2>5. İlgili Kişinin (Veri Sahibinin) KVKK Md. 11 Kapsamındaki Hakları</h2>
          <p>KVKK’nın 11. maddesi uyarınca herkes, veri sorumlusuna başvurarak kendisiyle ilgili aşağıdaki haklara sahiptir:</p>
          <ul>
            <li>Kişisel veri işlenip işlenmediğini öğrenme,</li>
            <li>Kişisel verileri işlenmişse buna ilişkin bilgi talep etme,</li>
            <li>Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,</li>
            <li>Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,</li>
            <li>KVKK 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerin silinmesini veya yok edilmesini isteme,</li>
            <li>Düzeltme, silme ve yok edilme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
            <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle kişinin kendisi aleyhine bir sonucun ortaya çıkmasına itiraz etme,</li>
            <li>Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğraması hâlinde zararın giderilmesini talep etme.</li>
          </ul>

          <h2>6. Başvuru Usulü</h2>
          <p>
            Yukarıda belirtilen haklarınızı kullanmak için talebinizi sistemlerimizde kayıtlı e-posta adresinizi belirterek <a href={`tel:${contact.phoneHref}`}>{contact.phoneDisplay}</a> üzerinden{contact.supportEmail ? <> veya <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a> adresine</> : ''} iletebilirsiniz. Başvurular mevzuattaki süreler içinde sonuçlandırılır.
          </p>
        </section>
      </div>

      <PublicFooter />
    </main>
  );
}
