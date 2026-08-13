'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PiArrowRight, PiCheck, PiCrownSimple, PiShieldCheck, PiSparkle } from 'react-icons/pi';
import { BILLING_PERIODS, formatTry, PUBLIC_PLANS } from '@/lib/billing/plans';

export default function PricingSection({ standalone = false }) {
  const [period, setPeriod] = useState('monthly');

  return (
    <section className={`pricing-section ${standalone ? 'is-standalone' : 'section-shell'}`} id="paketler">
      <div className="section-heading">
        <span className="public-kicker"><PiSparkle /> Net ve anlaşılır paketler</span>
        <h2>Ücretsiz başla, ihtiyacın olduğunda büyü.</h2>
        <p>Başlangıç planıyla temel düzenini kur. Daha geniş limitlere ihtiyaç duyduğunda Odak veya Zirve planını seç.</p>
      </div>
      <div className="pricing-period" role="group" aria-label="Ödeme dönemi">
        {Object.entries(BILLING_PERIODS).map(([key, item]) => (
          <button key={key} className={period === key ? 'is-active' : ''} onClick={() => setPeriod(key)}>
            {item.label}{key === 'annual' && <small>2 ay avantaj</small>}
          </button>
        ))}
      </div>
      <div className="pricing-grid">
        {PUBLIC_PLANS.map((plan) => {
          const price = period === 'annual' ? plan.annualPrice : plan.monthlyPrice;
          return (
            <article className={`pricing-card is-${plan.accent} ${plan.popular ? 'is-popular' : ''}`} key={plan.code}>
              {plan.popular && <span className="pricing-popular">En çok tercih edilen</span>}
              <div className="pricing-card-heading">
                <span>{plan.tagline}</span>
                <h3>{plan.name}</h3>
                {plan.code !== 'baslangic' && <span className="pricing-premium"><PiCrownSimple /> Premium</span>}
                <p>{plan.description}</p>
              </div>
              <div className="pricing-price">
                <strong>{price === 0 ? 'Ücretsiz' : formatTry(price)}</strong>
                {price > 0 && <span>{BILLING_PERIODS[period].suffix}</span>}
              </div>
              {period === 'annual' && price > 0 && (
                <p className="pricing-equivalent">Aylık ortalama {formatTry(price / 12)}</p>
              )}
              <ul>
                {plan.features.map((feature) => <li key={feature}><PiCheck />{feature}</li>)}
              </ul>
              <Link
                className={`public-button ${plan.code === 'baslangic' ? '' : 'primary'}`}
                href={plan.code === 'baslangic' ? '/kayit' : `/dashboard/abonelik?plan=${plan.code}&period=${period}`}
              >
                {plan.code === 'baslangic' ? 'Ücretsiz başla' : `${plan.name} planını incele`} <PiArrowRight />
              </Link>
            </article>
          );
        })}
      </div>
      <div className="pricing-trust"><PiShieldCheck /><span>Başlangıç ücretsizdir. Ücretli paketlerin satın alma özelliği hazırlanıyor; hazır olduğunda hesabından güvenli şekilde etkinleştirebileceksin.</span></div>
    </section>
  );
}
