'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, CalendarCheck2, TimerReset } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

const STEPS = [
  { Icon: CalendarCheck2, label: 'Plan' },
  { Icon: TimerReset, label: 'Odak' },
  { Icon: BarChart3, label: 'İlerleme' },
];

export default function JourneyLoader({ compact = false, label = 'Çalışma alanın hazırlanıyor' }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={`journey-loader ${compact ? 'is-compact' : ''}`} role="status" aria-live="polite">
      <motion.span
        className="journey-loader-mark"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.86, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.35 }}
      >
        <BrandLogo markOnly />
      </motion.span>
      <div className="journey-loader-copy">
        <strong>{label}</strong>
        <span>Planın ve gerçek çalışma verilerin güvenle eşleştiriliyor.</span>
      </div>
      <div className="journey-loader-steps" aria-hidden="true">
        {STEPS.map(({ Icon, label: stepLabel }, index) => (
          <motion.span
            key={stepLabel}
            initial={reducedMotion ? false : { opacity: 0.35, y: 4 }}
            animate={{ opacity: [0.35, 1, 0.35], y: [4, 0, 4] }}
            transition={{ duration: reducedMotion ? 0 : 1.8, delay: index * 0.32, repeat: reducedMotion ? 0 : Infinity }}
          >
            <Icon size={compact ? 15 : 18} />
            <small>{stepLabel}</small>
          </motion.span>
        ))}
      </div>
      <div className="journey-loader-track" aria-hidden="true">
        <motion.i
          initial={{ width: '12%' }}
          animate={{ width: reducedMotion ? '72%' : ['12%', '88%', '48%', '88%'] }}
          transition={{ duration: reducedMotion ? 0 : 3.2, repeat: reducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
