'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import { FOOTER } from './SharedLandingContent';

export default function PublicFooter() {
  const productHref = (href) => href.startsWith('#') ? `/${href}` : href;
  const openCookiePreferences = () => window.dispatchEvent(new Event('calisiyo:open-cookie-preferences'));

  return (
    <footer className="story-footer">
      <div className="section-shell footer-grid">
        <div>
          <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo /></Link>
          <p>{FOOTER.tagline}</p>
          <a className="footer-contact" href="tel:+905550497360"><Phone size={14} /> +90 555 049 73 60</a>
          <span className="footer-address"><MapPin size={14} /> ATATÜRK MAH. 01117 NOLU SK. ZİRVE SİTESİ A BLOK NO:2 İÇ KAPI NO:11 ŞEHİTKAMİL / GAZİANTEP</span>
          <div className="footer-payment-methods" aria-label="Desteklenen güvenli ödeme yöntemleri">
            <span>Güvenli ödeme altyapısı</span>
            <Image
              src="/brand/iyzico-payment-methods.svg"
              alt="iyzico ile Öde, Visa ve Mastercard"
              width={429}
              height={32}
            />
          </div>
        </div>
        <div>
          <strong>Ürün</strong>
          {FOOTER.productLinks.map((link) => <Link key={link.href} href={productHref(link.href)}>{link.label}</Link>)}
        </div>
        <div>
          <strong>Hesap</strong>
          {FOOTER.accountLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </div>
        <div>
          <strong>Yasal & İletişim</strong>
          {FOOTER.legalLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          <button className="footer-preferences" type="button" onClick={openCookiePreferences}>Çerez tercihleri</button>
        </div>
        <small>{FOOTER.copyright}</small>
      </div>
    </footer>
  );
}
