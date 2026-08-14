'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PiArrowRight, PiCheck, PiCrownSimple, PiShieldCheck, PiSparkle } from 'react-icons/pi';
import { formatTry, getVariantForYear, PUBLIC_PLANS } from '@/lib/billing/plans';

export default function PricingSection({ standalone = false }) {
  const [targetYear, setTargetYear] = useState(2027);
  const selectedVariant = useMemo(() => getVariantForYear(targetYear), [targetYear]);

  return (
    <section className={`pricing-section ${standalone ? 'is-standalone' : 'section-shell'}`} id="paketler">
      <div className="section-heading">
        <span className="public-kicker"><PiSparkle /> İki net seçenek</span>
        <h2>Ücretsiz başla. Hazır olduğunda plus’a geç.</h2>
        <p>Karmaşık paket karşılaştırmaları yok. Önce ücretsiz araçları kullan; daha geniş limitlere ihtiyaç duyduğunda sınav yılını seçip plus’ı 7 gün ücretsiz dene.</p>
      </div>
      <div className="pricing-grid">
        {PUBLIC_PLANS.map((plan) => {
          const isPlus = plan.code === 'plus';
          const price = isPlus ? selectedVariant.price : 0;
          return (
            <article className={`pricing-card is-${plan.accent} ${plan.popular ? 'is-popular' : ''}`} key={plan.code}>
              {plan.popular && <span className="pricing-popular">En çok tercih edilen</span>}
              <div className="pricing-card-heading">
                <span>{plan.tagline}</span>
                <h3>{plan.name}</h3>
                {plan.code !== 'baslangic' && <span className="pricing-premium"><PiCrownSimple /> Premium</span>}
                <p>{plan.description}</p>
              </div>
              {isPlus && <div className="pricing-period pricing-year-picker" role="group" aria-label="Sınav yılı">
                {[2027, 2028].map((year) => (
                  <button key={year} type="button" className={targetYear === year ? 'is-active' : ''} onClick={() => setTargetYear(year)}>
                    YKS {year}{year === 2028 && <small>5+1 ay</small>}
                  </button>
                ))}
              </div>}
              <div className="pricing-price">
                <strong>{price === 0 ? 'Ücretsiz' : formatTry(price)}</strong>
                {price > 0 && <span>{selectedVariant.duration}</span>}
              </div>
              {isPlus && <p className="pricing-equivalent">7 gün ücretsiz deneme · otomatik ücret alınmaz</p>}
              <ul>
                {plan.features.map((feature) => <li key={feature}><PiCheck />{feature}</li>)}
              </ul>
              <Link
                className={`public-button ${plan.code === 'baslangic' ? '' : 'primary'}`}
                href={plan.code === 'baslangic' ? '/kayit' : `/dashboard/abonelik?plan=${selectedVariant.code}`}
              >
                {plan.code === 'baslangic' ? 'Ücretsiz başla' : 'Plus’ı ücretsiz dene'} <PiArrowRight />
              </Link>
            </article>
          );
        })}
      </div>
      <div className="pricing-trust"><PiShieldCheck /><span>Şehit ve gazi yakınlarından ücret tahsil edilmemektedir. Ayrıntılar için <a href="mailto:calisiyo.destek@gmail.com">destek ekibimize</a> ulaşabilirsin.</span></div>
    </section>
  );
}
