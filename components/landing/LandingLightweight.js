'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import BrandLogo from '@/components/brand/BrandLogo';
import { daysUntilYKS, yksDateLabel } from '@/lib/utils/date';
import {
  CAPABILITIES,
  CAPABILITIES_SECTION,
  FINAL_CTA,
  FOOTER,
  GUIDE,
  HERO,
  NAV_LINKS,
  REAL_DATA_CARDS,
  STORY_CHAPTERS,
  STORY_INTRO,
} from './SharedLandingContent';

function Reveal({ children, className = '', delay = 0, ...props }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function StoryChapter({ chapter, index }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [52, -42]);
  const imageRotate = useTransform(scrollYProgress, [0, 0.5, 1], reduceMotion ? [0, 0, 0] : [1.5, 0, -1.5]);
  const Icon = chapter.Icon;

  return (
    <section className={`story-chapter ${index % 2 ? 'is-reversed' : ''}`} id={chapter.id} ref={ref}>
      <Reveal className="story-copy">
        <span className="story-number">{chapter.number}</span>
        <span className="public-kicker"><Icon /> {chapter.eyebrow}</span>
        <h2>{chapter.title}</h2>
        <p>{chapter.text}</p>
        <div className="story-facts">
          {chapter.facts.map(([value, label]) => (
            <div key={`${value}-${label}`}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <Link href="/kayit" className="text-link">
          Bu akışla başla <HERO.ctaPrimary.Icon />
        </Link>
      </Reveal>
      <motion.div className="story-visual" style={{ y: imageY, rotate: imageRotate }}>
        <Image src={chapter.image} alt={chapter.alt} fill sizes="(max-width: 900px) 92vw, 48vw" />
      </motion.div>
    </section>
  );
}

export default function LandingLightweight() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.22], reduceMotion ? [0, 0] : [0, 80]);
  const heroScale = useTransform(scrollYProgress, [0, 0.22], reduceMotion ? [1, 1] : [1, 0.96]);
  const remainingDays = daysUntilYKS();
  const examDate = yksDateLabel();

  return (
    <main className="story-landing">
      <motion.div className="landing-scroll-progress" style={{ scaleX: scrollYProgress }} />

      {/* Navigation */}
      <nav className="story-nav" aria-label="Ana navigasyon">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa">
          <BrandLogo priority />
        </Link>
        <div className="story-nav-links">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </div>
        <div className="landing-auth">
          <Link href="/giris">Giriş yap</Link>
          <Link className="public-button primary" href="/kayit">Ücretsiz başla</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="story-hero">
        <motion.div
          className="story-hero-copy"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="public-kicker">
            <HERO.KickerIcon /> {HERO.kicker}
          </span>
          <h1>
            {HERO.headline} <em>{HERO.headlineEm}</em> {HERO.headlineSuffix}
          </h1>
          <p>{HERO.description}</p>
          <div className="hero-actions">
            <Link className="public-button primary" href={HERO.ctaPrimary.href}>
              {HERO.ctaPrimary.label} <HERO.ctaPrimary.Icon />
            </Link>
            <a className="public-button" href={HERO.ctaSecondary.href}>
              <HERO.ctaSecondary.Icon /> {HERO.ctaSecondary.label}
            </a>
          </div>
          <div className="hero-proof">
            {HERO.trustBadges.map((badge, idx) => {
              const BadgeIcon = badge.Icon;
              return (
                <span key={idx}>
                  <BadgeIcon /> {badge.text}
                </span>
              );
            })}
          </div>
          <div className="exam-countdown">
            <HERO.CountdownIcon />
            <div>
              <strong>{remainingDays ?? '—'} {HERO.countdownSuffix}</strong>
              <span>{HERO.countdownLabel} · {examDate}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="story-hero-visual"
          style={{ y: heroY, scale: heroScale }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.72, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={HERO.heroImage}
            alt={HERO.heroImageAlt}
            fill
            priority
            sizes="(max-width: 900px) 96vw, 55vw"
          />
          {HERO.milestones.map((m) => (
            <div key={m.number} className={`hero-milestone ${m.className}`}>
              <span>{m.number}</span>
              <strong>{m.label}</strong>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Story Intro */}
      <section className="story-intro section-shell" id="yolculuk">
        <Reveal className="section-heading">
          <span className="public-kicker">{STORY_INTRO.kicker}</span>
          <h2>{STORY_INTRO.headline}</h2>
          <p>{STORY_INTRO.description}</p>
        </Reveal>
        <div className="story-route" aria-hidden="true">
          <i />
          {STORY_INTRO.route.map((step, idx) => (
            <span key={idx}>
              {step}
              {idx < STORY_INTRO.route.length - 1 && <i />}
            </span>
          ))}
          <i />
        </div>
      </section>

      {/* Chapters */}
      <div className="story-chapters section-shell">
        {STORY_CHAPTERS.map((chapter, index) => (
          <StoryChapter key={chapter.id} chapter={chapter} index={index} />
        ))}
      </div>

      {/* Capabilities */}
      <section className="capability-section section-shell" id="araclar">
        <Reveal className="section-heading">
          <span className="public-kicker">{CAPABILITIES_SECTION.kicker}</span>
          <h2>{CAPABILITIES_SECTION.headline}</h2>
          <p>{CAPABILITIES_SECTION.description}</p>
        </Reveal>
        <div className="capability-grid">
          {CAPABILITIES.map(({ label, Icon }, index) => (
            <Reveal className="capability-card" key={label} delay={index * 0.04}>
              <span><Icon /></span>
              <strong>{label}</strong>
              <HERO.ctaPrimary.Icon />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Guide Section */}
      <section className="guide-section" id="rehber">
        <div className="section-shell guide-grid">
          <Reveal className="guide-heading">
            <span className="public-kicker">{GUIDE.kicker}</span>
            <h2>{GUIDE.headline}</h2>
            <p>{GUIDE.description}</p>
            <Link className="public-button primary" href={GUIDE.cta.href}>
              {GUIDE.cta.label} <GUIDE.cta.Icon />
            </Link>
          </Reveal>
          <div className="guide-steps">
            {GUIDE.steps.map(({ number, title, text }, index) => (
              <Reveal className="guide-step" key={number} delay={index * 0.05}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Real Data Section */}
      <section className="real-data-section section-shell">
        {REAL_DATA_CARDS.map(({ Icon, headline, text }, idx) => (
          <Reveal className="real-data-card" key={idx} delay={idx * 0.07}>
            <span><Icon /></span>
            <div>
              <h2>{headline}</h2>
              <p>{text}</p>
            </div>
          </Reveal>
        ))}
      </section>

      {/* Final CTA */}
      <section className="landing-final-cta section-shell">
        <Reveal>
          <span className="public-kicker">{FINAL_CTA.kicker}</span>
          <h2>{FINAL_CTA.headline}</h2>
          <p>{FINAL_CTA.description}</p>
          <Link className="public-button primary" href={FINAL_CTA.cta.href}>
            {FINAL_CTA.cta.label} <FINAL_CTA.cta.Icon />
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="story-footer">
        <div className="section-shell footer-grid">
          <div>
            <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa">
              <BrandLogo />
            </Link>
            <p>{FOOTER.tagline}</p>
          </div>
          <div>
            <strong>Ürün</strong>
            {FOOTER.productLinks.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </div>
          <div>
            <strong>Hesap</strong>
            {FOOTER.accountLinks.map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </div>
          <small>{FOOTER.copyright}</small>
        </div>
      </footer>
    </main>
  );
}
