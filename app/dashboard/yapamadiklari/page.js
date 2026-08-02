'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';
import { formatDate } from '@/lib/utils/date';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Plus, CheckCircle2, Circle, Trash2, FileText, Hash, BookOpen } from 'lucide-react';

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

export default function YapamadiklariPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const examTabs = profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'];

  const [activeTab, setActiveTab] = useState('TYT');
  const [sorular, setSorular] = useState([]);
  const [dersler, setDersler] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ders_id: '', konu: '', sayfa: '', soru_no: '' });

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile, activeTab]);

  async function loadData() {
    setLoading(true);
    const [{ data: s }, { data: d }] = await Promise.all([
      supabase.from('yapamadiklari').select('*, dersler(ad, renk, ikon)').eq('user_id', profile.id).eq('sinav_turu', activeTab).order('created_at', { ascending: false }),
      supabase.from('dersler').select('*').eq('sinav_turu', activeTab).contains('alan', [profile.alan_secimi]).order('sira'),
    ]);
    setSorular(s || []);
    setDersler(d || []);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    await supabase.from('yapamadiklari').insert({
      user_id: profile.id,
      ders_id: form.ders_id || null,
      sinav_turu: activeTab,
      konu: form.konu || null,
      sayfa: form.sayfa ? parseInt(form.sayfa) : null,
      soru_no: form.soru_no || null,
    });
    setShowModal(false);
    setForm({ ders_id: '', konu: '', sayfa: '', soru_no: '' });
    loadData();
  }

  async function toggleCozuldu(id, current) {
    // Optimistic Update
    setSorular(sorular.map(s => s.id === id ? { ...s, cozuldu: !current } : s));
    await supabase.from('yapamadiklari').update({ cozuldu: !current }).eq('id', id);
  }

  async function handleDelete(id) {
    setSorular(sorular.filter(s => s.id !== id));
    await supabase.from('yapamadiklari').delete().eq('id', id);
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="tabs">
          {examTabs.map(tab => (
            <button key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Soru Ekle
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : sorular.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card empty-state"
        >
          <HelpCircle size={48} className="empty-state-icon" />
          <div className="empty-state-title">Henüz soru eklenmemiş</div>
          <div className="empty-state-text">Denemelerde veya testlerde yapamadığın soruları buraya ekleyerek daha sonra tekrar edebilirsin.</div>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setShowModal(true)}>
            <Plus size={18} /> Soru Ekle
          </button>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="soru-grid"
        >
          <AnimatePresence>
            {sorular.map(s => (
              <motion.div 
                variants={itemVariants}
                layout
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                key={s.id} 
                className={`card soru-card ${s.cozuldu ? 'soru-done' : ''}`}
                style={{ borderTop: `4px solid ${s.dersler?.renk || 'var(--primary-500)'}` }}
              >
                <div className="soru-header">
                  <span className="soru-ders" style={{ color: s.dersler?.renk || 'var(--primary-600)' }}>
                    {s.dersler?.ikon} {s.dersler?.ad}
                  </span>
                  <div className="soru-actions">
                    <button 
                      className={`btn btn-ghost btn-icon btn-sm check-btn ${s.cozuldu ? 'check-done' : ''}`} 
                      onClick={() => toggleCozuldu(s.id, s.cozuldu)}
                      title={s.cozuldu ? 'Çözülmedi İşaretle' : 'Çözüldü İşaretle'}
                    >
                      {s.cozuldu ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <button 
                      className="btn btn-ghost btn-icon btn-sm btn-delete" 
                      onClick={() => handleDelete(s.id)}
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="soru-content">
                  {s.konu ? (
                    <h3 className="soru-konu">{s.konu}</h3>
                  ) : (
                    <h3 className="soru-konu" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Konu belirtilmemiş</h3>
                  )}
                  
                  <div className="soru-details">
                    {s.sayfa && (
                      <span className="soru-detail-badge">
                        <FileText size={14} /> Sayfa {s.sayfa}
                      </span>
                    )}
                    {s.soru_no && (
                      <span className="soru-detail-badge">
                        <Hash size={14} /> Soru {s.soru_no}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="soru-footer">
                  <span>Eklendi: {formatDate(s.created_at)}</span>
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
              <h3 className="modal-title">Yapamadığım Soru Ekle</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd} className="modal-form">
              <div className="input-group">
                <label className="input-label">Ders</label>
                <select className="select" value={form.ders_id} onChange={(e) => setForm({ ...form, ders_id: e.target.value })} required>
                  <option value="">Seçin</option>
                  {dersler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Konu (Opsiyonel)</label>
                <input className="input" value={form.konu} onChange={(e) => setForm({ ...form, konu: e.target.value })} placeholder="ör. Enerji Dönüşümleri" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Sayfa No (Opsiyonel)</label>
                  <input className="input" type="number" value={form.sayfa} onChange={(e) => setForm({ ...form, sayfa: e.target.value })} placeholder="142" />
                </div>
                <div className="input-group">
                  <label className="input-label">Soru No (Opsiyonel)</label>
                  <input className="input" value={form.soru_no} onChange={(e) => setForm({ ...form, soru_no: e.target.value })} placeholder="3" />
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
        .soru-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .soru-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          transition: all var(--transition-fast);
        }

        .soru-done { 
          opacity: 0.6;
          background: var(--gray-50);
        }
        
        .soru-done .soru-konu { 
          text-decoration: line-through; 
          color: var(--text-tertiary);
        }

        .soru-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .soru-ders {
          font-weight: 700;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .soru-actions {
          display: flex;
          gap: 4px;
        }
        
        .check-btn {
          color: var(--gray-400);
        }
        
        .check-btn:hover {
          color: var(--primary-500);
          background: var(--primary-50);
        }
        
        .check-done {
          color: var(--success);
        }
        
        .check-done:hover {
          color: var(--success-600);
          background: var(--success-light);
        }
        
        .btn-delete {
          color: var(--text-tertiary);
        }
        
        .btn-delete:hover {
          color: var(--error);
          background: var(--error-light);
        }

        .soru-content {
          flex: 1;
          margin-bottom: 16px;
        }

        .soru-konu {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .soru-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .soru-detail-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: var(--gray-100);
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 500;
        }

        .soru-footer {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          padding-top: 12px;
          border-top: 1px dashed var(--border-light);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 480px) {
          .soru-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </motion.div>
  );
}
