'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Target, Flag, Trophy, CheckCircle2, Plus, Sparkles, TrendingUp } from 'lucide-react';

export default function HedeflerimPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
          <Target size={24} color="var(--primary-500)" /> Hedeflerim
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          YKS 2027 sürecinde ulaşmak istediğin net ve üniversite hedefleri.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Net Target */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Trophy size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>TYT / AYT Net Hedefi</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Hedeflenen toplam net</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                <span>TYT Hedefi</span>
                <span style={{ color: 'var(--primary-600)' }}>95 Net</span>
              </div>
              <div className="progress-bar progress-bar-md">
                <div className="progress-bar-fill" style={{ width: '78%', background: '#10b981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                <span>AYT Hedefi</span>
                <span style={{ color: '#3b82f6' }}>70 Net</span>
              </div>
              <div className="progress-bar progress-bar-md">
                <div className="progress-bar-fill" style={{ width: '64%', background: '#3b82f6' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Target University */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Flag size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Hedef Üniversite & Bölüm</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Hayalindeki üniversite</p>
            </div>
          </div>

          <div style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Bilgisayar Mühendisliği
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--primary-600)', fontWeight: 600, marginTop: '2px' }}>
              İTÜ / ODTÜ / Boğaziçi
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
