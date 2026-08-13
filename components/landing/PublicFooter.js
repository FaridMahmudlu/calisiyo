'use client';

import Link from 'next/link';
import { PiEnvelopeSimple } from 'react-icons/pi';
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
          <a className="support-email" href="mailto:calisiyo.destek@gmail.com"><PiEnvelopeSimple /> calisiyo.destek@gmail.com</a>
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
