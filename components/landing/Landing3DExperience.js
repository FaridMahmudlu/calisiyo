'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import BrandLogo from '@/components/brand/BrandLogo';
import PricingSection from './PricingSection';
import PublicFooter from './PublicFooter';
import { daysUntilYKS, yksDateLabel } from '@/lib/utils/date';
import { CameraPath } from './scenes/CameraPath';
import { FocusScene } from './scenes/FocusScene';
import { HeroScene } from './scenes/HeroScene';
import { PlanScene } from './scenes/PlanScene';
import { ProgressScene } from './scenes/ProgressScene';
import { SummitScene } from './scenes/SummitScene';
import {
  CAPABILITIES,
  CAPABILITIES_SECTION,
  FINAL_CTA,
  GUIDE,
  HERO,
  NAV_LINKS,
  REAL_DATA_CARDS,
  STORY_CHAPTERS,
  STORY_INTRO,
} from './SharedLandingContent';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function Loader() {
  return (
    <div className="canvas-loader" aria-live="polite">
      <div className="loader-spinner" />
      <span>3D Çalışma Yolu Hazırlanıyor...</span>
    </div>
  );
}

export default function Landing3DExperience() {
  const containerRef = useRef(null);
  const progressRef = useRef(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const remainingDays = daysUntilYKS();
  const examDate = yksDateLabel();

  useEffect(() => {
    // 1. Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    // 2. Bind GSAP ScrollTrigger to page container
    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        setScrollProgress(self.progress);
      },
    });

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      st.kill();
    };
  }, []);

  return (
    <div className="story-landing-3d" ref={containerRef}>
      {/* Scroll progress top bar */}
      <div
        className="landing-scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />

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

      {/* Fixed 3D WebGL Canvas */}
      <div className="webgl-container" aria-hidden="true">
        <Suspense fallback={<Loader />}>
          <Canvas
            shadows
            camera={{ position: [0, 2, 8], fov: 45 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.4} color="#00a870" />
            <Environment preset="city" />

            <CameraPath progressRef={progressRef} />
            <HeroScene progressRef={progressRef} />
            <PlanScene />
            <FocusScene />
            <ProgressScene />
            <SummitScene />
          </Canvas>
        </Suspense>
      </div>

      {/* Scrollable Story Content Overlays */}
      <div className="scroll-content-overlay">
        {/* Section 1: Hero */}
        <section className="story-hero-3d">
          <div className="story-hero-copy">
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
          </div>
        </section>

        {/* Section 2: Story Intro */}
        <section className="story-intro section-shell" id="yolculuk">
          <div className="section-heading">
            <span className="public-kicker">{STORY_INTRO.kicker}</span>
            <h2>{STORY_INTRO.headline}</h2>
            <p>{STORY_INTRO.description}</p>
          </div>
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

        {/* Section 3: Chapters */}
        <div className="story-chapters section-shell">
          {STORY_CHAPTERS.map((chapter, index) => {
            const Icon = chapter.Icon;
            return (
              <section className={`story-chapter ${index % 2 ? 'is-reversed' : ''}`} id={chapter.id} key={chapter.id}>
                <div className="story-copy">
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
                </div>
              </section>
            );
          })}
        </div>

        {/* Section 4: Capabilities */}
        <section className="capability-section section-shell" id="araclar">
          <div className="section-heading">
            <span className="public-kicker">{CAPABILITIES_SECTION.kicker}</span>
            <h2>{CAPABILITIES_SECTION.headline}</h2>
            <p>{CAPABILITIES_SECTION.description}</p>
          </div>
          <div className="capability-grid">
            {CAPABILITIES.map(({ label, Icon }) => (
              <div className="capability-card" key={label}>
                <span><Icon /></span>
                <strong>{label}</strong>
                <HERO.ctaPrimary.Icon />
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Guide */}
        <section className="guide-section" id="rehber">
          <div className="section-shell guide-grid">
            <div className="guide-heading">
              <span className="public-kicker">{GUIDE.kicker}</span>
              <h2>{GUIDE.headline}</h2>
              <p>{GUIDE.description}</p>
              <Link className="public-button primary" href={GUIDE.cta.href}>
                {GUIDE.cta.label} <GUIDE.cta.Icon />
              </Link>
            </div>
            <div className="guide-steps">
              {GUIDE.steps.map(({ number, title, text }) => (
                <div className="guide-step" key={number}>
                  <span>{number}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6: Real Data */}
        <section className="real-data-section section-shell">
          {REAL_DATA_CARDS.map(({ Icon, headline, text }, idx) => (
            <div className="real-data-card" key={idx}>
              <span><Icon /></span>
              <div>
                <h2>{headline}</h2>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </section>

        <PricingSection />

        {/* Section 7: Final CTA */}
        <section className="landing-final-cta section-shell">
          <div>
            <span className="public-kicker">{FINAL_CTA.kicker}</span>
            <h2>{FINAL_CTA.headline}</h2>
            <p>{FINAL_CTA.description}</p>
            <Link className="public-button primary" href={FINAL_CTA.cta.href}>
              {FINAL_CTA.cta.label} <FINAL_CTA.cta.Icon />
            </Link>
          </div>
        </section>

        {/* Section 8: Footer */}
        <PublicFooter />
      </div>
    </div>
  );
}
