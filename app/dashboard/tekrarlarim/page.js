'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';
import { formatDate, todayStr } from '@/lib/utils/date';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, Plus, CheckCircle2, Circle, Calendar, Clock, BookOpen } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import PageHeader from '@/components/ui/PageHeader';
import Select from '@/components/ui/Select';

const REALTIME_TABLES = ['tekrarlar'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function TekrarlarimPage() {
  const { profile, setError } = useUser();
  const supabase = createClient();
  const examTabs = profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'];

  const [activeTab, setActiveTab] = useState('TYT');
  const [filter, setFilter] = useState('bugun');
  const [tekrarlar, setTekrarlar] = useState([]);
  const [dersler, setDersler] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ders_id: '', konu: '', kaynak: '', tekrar_tarihi: todayStr(), tekrar_saati: '' });

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const today = todayStr();

    let query = supabase.from('tekrarlar').select('*, dersler(ad, renk, ikon)').eq('user_id', profile.id).eq('sinav_turu', activeTab);

    if (filter === 'bugun') {
      query = query.eq('tekrar_tarihi', today);
    } else if (filter === 'yaklasan') {
      query = query.gt('tekrar_tarihi', today).order('tekrar_tarihi');
    } else {
      query = query.lt('tekrar_tarihi', today).order('tekrar_tarihi', { ascending: false });
    }

    const [{ data: t }, { data: d }] = await Promise.all([
      query,
      supabase.from('dersler').select('*').eq('sinav_turu', activeTab).contains('alan', [profile.alan_secimi]).order('sira'),
    ]);
    setTekrarlar(t || []);
    setDersler(d || []);
    setLoading(false);
  }, [activeTab, filter, profile, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: loadData });

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.ders_id) return setError('Tekrar eklemek için bir ders seçmelisin.');
    const { error: insertError } = await supabase.from('tekrarlar').insert({
      user_id: profile.id,
      ders_id: form.ders_id || null,
      sinav_turu: activeTab,
      konu: form.konu,
      kaynak: form.kaynak || null,
      tekrar_tarihi: form.tekrar_tarihi,
      tekrar_saati: form.tekrar_saati || null,
    });
    if (insertError) return setError(`Tekrar eklenemedi: ${insertError.message}`);
    setShowModal(false);
    setForm({ ders_id: '', konu: '', kaynak: '', tekrar_tarihi: todayStr(), tekrar_saati: '' });
    loadData();
  }

  async function toggleTamamlandi(id, current) {
    // Optimistic update
    setTekrarlar(tekrarlar.map(t => t.id === id ? { ...t, tamamlandi: !current } : t));
    const { error: updateError } = await supabase.from('tekrarlar').update({ tamamlandi: !current }).eq('id', id).eq('user_id', profile.id);
    if (updateError) {
      setTekrarlar((items) => items.map((item) => item.id === id ? { ...item, tamamlandi: current } : item));
      setError(`Tekrar güncellenemedi: ${updateError.message}`);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <PageHeader title="Tekrarlarım" description="Tamamladığın konular için 1, 7 ve 30 günlük tekrarlar otomatik oluşur; istersen manuel tekrar da ekleyebilirsin." />
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="tabs">
          {examTabs.map(tab => (
            <button key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="tabs tabs-sm">
          <button className={`tab ${filter === 'bugun' ? 'tab-active' : ''}`} onClick={() => setFilter('bugun')}>Bugün</button>
          <button className={`tab ${filter === 'yaklasan' ? 'tab-active' : ''}`} onClick={() => setFilter('yaklasan')}>Yaklaşanlar</button>
          <button className={`tab ${filter === 'gecen' ? 'tab-active' : ''}`} onClick={() => setFilter('gecen')}>Geçmiş</button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Yeni Tekrar
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : tekrarlar.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card empty-state"
        >
          <Repeat size={48} className="empty-state-icon" />
          <div className="empty-state-title">Tekrar bulunamadı</div>
          <div className="empty-state-text">Öğrendiklerini pekiştirmek için düzenli konu tekrarları oluştur.</div>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setShowModal(true)}>
            <Plus size={18} /> Yeni Tekrar Ekle
          </button>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="tekrarlar-list"
        >
          <AnimatePresence>
            {tekrarlar.map(t => (
              <motion.div 
                variants={itemVariants}
                layout
                key={t.id} 
                className={`card tekrar-card ${t.tamamlandi ? 'tekrar-done' : ''}`}
                style={{ borderLeftColor: t.dersler?.renk || 'var(--primary-500)' }}
              >
                <button 
                  className={`check-btn ${t.tamamlandi ? 'check-done' : ''}`} 
                  onClick={() => toggleTamamlandi(t.id, t.tamamlandi)}
                  title={t.tamamlandi ? 'Geri al' : 'Tamamla'}
                >
                  {t.tamamlandi ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                <div className="tekrar-content">
                  <div className="tekrar-header">
                    <span className="tekrar-ders" style={{ color: t.dersler?.renk || 'var(--primary-600)' }}>
                      {t.dersler?.ikon} {t.dersler?.ad}
                    </span>
                    {t.otomatik && <span className="badge badge-success">Otomatik</span>}
                    {t.kaynak && (
                      <span className="badge badge-neutral">
                        <BookOpen size={12} style={{ marginRight: '4px' }} />
                        {t.kaynak}
                      </span>
                    )}
                  </div>
                  <h3 className="tekrar-konu">{t.konu}</h3>
                  <div className="tekrar-meta">
                    <span className="meta-item">
                      <Calendar size={14} /> {formatDate(t.tekrar_tarihi)}
                    </span>
                    {t.tekrar_saati && (
                      <span className="meta-item">
                        <Clock size={14} /> {t.tekrar_saati.slice(0,5)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Yeni Tekrar Ekle</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd} className="modal-form">
              <div className="input-group">
                <label className="input-label">Ders</label>
                <Select ariaLabel="Ders" value={form.ders_id} onChange={(value) => setForm({ ...form, ders_id: value })} placeholder="Ders seç" options={dersler.map((course) => ({ value: course.id, label: course.ad }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Konu</label>
                <input className="input" value={form.konu} onChange={(e) => setForm({ ...form, konu: e.target.value })} required placeholder="ör. Limit ve Süreklilik" />
              </div>
              <div className="input-group">
                <label className="input-label">Kaynak</label>
                <input className="input" value={form.kaynak} onChange={(e) => setForm({ ...form, kaynak: e.target.value })} placeholder="ör. Apotemi Fasikülü (Opsiyonel)" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Tekrar Tarihi</label>
                  <input className="input" type="date" value={form.tekrar_tarihi} onChange={(e) => setForm({ ...form, tekrar_tarihi: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Saat (Opsiyonel)</label>
                  <input className="input" type="time" value={form.tekrar_saati} onChange={(e) => setForm({ ...form, tekrar_saati: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>İptal</button>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .tabs-sm .tab {
          padding: 6px 12px;
          font-size: 0.8125rem;
        }

        .tekrarlar-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tekrar-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-left: 4px solid;
          transition: all var(--transition-fast);
        }
        
        .tekrar-card:hover {
          transform: translateX(4px);
        }

        .tekrar-done { 
          opacity: 0.6; 
          background: var(--gray-50);
        }
        
        .tekrar-done .tekrar-konu {
          text-decoration: line-through;
          color: var(--text-tertiary);
        }

        .check-btn { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          cursor: pointer; 
          background: none; 
          border: none;
          color: var(--gray-300); 
          transition: all var(--transition-fast); 
          padding: 0;
          border-radius: 50%;
        }
        
        .check-btn:hover { 
          color: var(--primary-500); 
          background: var(--primary-50);
        }
        
        .check-done { 
          color: var(--success); 
        }
        
        .check-done:hover {
          background: var(--success-light);
        }

        .tekrar-content {
          flex: 1;
        }

        .tekrar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }

        .tekrar-ders {
          font-weight: 700;
          font-size: 0.875rem;
        }

        .tekrar-konu {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .tekrar-meta {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 480px) {
          .tekrar-card {
            padding: 14px 16px;
          }
        }
      `}</style>
    </motion.div>
  );
}
