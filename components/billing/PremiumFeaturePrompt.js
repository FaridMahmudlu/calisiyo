'use client';

import Link from 'next/link';
import { ArrowRight, Check, Crown, Sparkles } from 'lucide-react';
import Modal from '@/components/ui/Modal';

export function PremiumBadge({ label = 'Premium', onClick, title }) {
  return <button type="button" className="premium-feature-badge" onClick={onClick} title={title || 'Premium plan ayrıntılarını gör'}><Crown size={12} /> {label}</button>;
}

export default function PremiumFeaturePrompt({ open, onClose, feature, requiredPlan = 'calisiyo plus', currentPlan = 'calisiyo ücretsiz', description, benefits = [] }) {
  return (
    <Modal open={open} onClose={onClose} title={`${feature || 'Premium özellik'} · Premium`} description="Bu özellik planına göre açılır veya daha geniş limitlerle kullanılabilir.">
      <div className="premium-prompt">
        <span className="premium-prompt-icon"><Crown /></span>
        <div className="premium-prompt-copy"><span><Sparkles size={14} /> {requiredPlan}</span><h3>{feature} için çalışma alanını büyüt.</h3><p>{description}</p></div>
        <div className="premium-prompt-plan"><span>Mevcut planın</span><strong>{currentPlan}</strong><i /><span>Gerekli plan</span><strong>{requiredPlan}</strong></div>
        {benefits.length > 0 && <ul>{benefits.map((benefit) => <li key={benefit}><Check size={15} /> {benefit}</li>)}</ul>}
        <div className="premium-prompt-actions"><button type="button" onClick={onClose}>Şimdi değil</button><Link href="/dashboard/abonelik">Plus’ı incele <ArrowRight size={15} /></Link></div>
      </div>
    </Modal>
  );
}
