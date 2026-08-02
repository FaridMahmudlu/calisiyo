'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Plus, Trash2, Book, Bookmark } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function KaynaklarimPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const [kaynaklar, setKaynaklar] = useState([]);
  const [sistemKaynaklar, setSistemKaynaklar] = useState([]);
  const [dersler, setDersler] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSistem, setSelectedSistem] = useState('');
  const [customForm, setCustomForm] = useState({
    ad: '', yayin: '', ders_id: '', sinav_turu: 'TYT', kitap_turu: 'soru_bankasi',
  });

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);
    const [{ data: k }, { data: sk }, { data: d }] = await Promise.all([
      supabase.from('kaynaklarim').select('*, kaynaklar_sistem(ad, yayin, sinav_turu, kitap_turu, ders_id, dersler:ders_id(ad, renk, ikon))').eq('user_id', profile.id),
      supabase.from('kaynaklar_sistem').select('*, dersler:ders_id(ad, renk, ikon)'),
      supabase.from('dersler').select('*').contains('alan', [profile.alan_secimi]).order('sira'),
    ]);
    setKaynaklar(k || []);
    setSistemKaynaklar(sk || []);
    setDersler(d || []);
    setLoading(false);
  }

  async function handleAddSistem() {
    if (!selectedSistem) return;
    await supabase.from('kaynaklarim').insert({ user_id: profile.id, kaynak_sistem_id: selectedSistem });
    setShowModal(false);
    setSelectedSistem('');
    loadData();
  }

  async function handleAddCustom(e) {
    e.preventDefault();
    await supabase.from('kaynaklarim').insert({
      user_id: profile.id,
      custom_ad: customForm.ad,
      custom_yayin: customForm.yayin,
      custom_ders_id: customForm.ders_id || null,
      custom_sinav_turu: customForm.sinav_turu,
      custom_kitap_turu: customForm.kitap_turu,
    });
    setShowModal(false);
    setCustomForm({ ad: '', yayin: '', ders_id: '', sinav_turu: 'TYT', kitap_turu: 'soru_bankasi' });
    loadData();
  }

  async function handleRemove(id) {
    setKaynaklar(kaynaklar.filter(k => k.id !== id));
    await supabase.from('kaynaklarim').delete().eq('id', id);
  }

  function getKaynakInfo(k) {
    if (k.kaynak_sistem_id && k.kaynaklar_sistem) {
      return {
        ad: k.kaynaklar_sistem.ad,
        yayin: k.kaynaklar_sistem.yayin,
        sinav: k.kaynaklar_sistem.sinav_turu,
        ders: k.kaynaklar_sistem.dersler,
      };
    }
    return {
      ad: k.custom_ad,
      yayin: k.custom_yayin,
      sinav: k.custom_sinav_turu,
      ders: k.custom_ders_id ? dersler.find(d => d.id === k.custom_ders_id) : null,
    };
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Library size={24} color="var(--primary-500)" />
          Kaynaklarım
        </h1>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setIsCustom(false); }}>
          <Plus size={18} /> Kaynak Ekle
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : kaynaklar.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card empty-state"
        >
          <Book size={48} className="empty-state-icon" />
          <div className="empty-state-title">Henüz kaynak eklenmemiş</div>
          <div className="empty-state-text">Kullandığın kitapları ve denemeleri buraya ekleyerek programında kullanabilirsin.</div>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => { setShowModal(true); setIsCustom(false); }}>
            <Plus size={18} /> Kaynak Ekle
          </button>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="kaynak-grid"
        >
          <AnimatePresence>
            {kaynaklar.map(k => {
              const info = getKaynakInfo(k);
              const cardColor = info.ders?.renk || 'var(--primary-500)';
              
              return (
                <motion.div 
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                  key={k.id} 
                  className="card kaynak-card card-interactive"
                  style={{ borderTop: `4px solid ${cardColor}` }}
                >
                  <div className="kaynak-top">
                    <div className="kaynak-icon-wrapper" style={{ background: `${cardColor}15`, color: cardColor }}>
                      <Bookmark size={20} />
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm btn-delete" onClick={() => handleRemove(k.id)} title="Kaldır">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="kaynak-content">
                    <h3 className="kaynak-name">{info.ad}</h3>
                    <p className="kaynak-yayin">{info.yayin}</p>
                  </div>
                  <div className="kaynak-badges">
                    <span className="badge badge-info">{info.sinav}</span>
                    {info.ders && <span className="badge badge-neutral" style={{ color: cardColor }}>{info.ders.ad}</span>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Kaynak Ekle</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="tabs" style={{ marginBottom: '24px' }}>
              <button className={`tab ${!isCustom ? 'tab-active' : ''}`} onClick={() => setIsCustom(false)}>Sistemden Seç</button>
              <button className={`tab ${isCustom ? 'tab-active' : ''}`} onClick={() => setIsCustom(true)}>Özel Ekle</button>
            </div>

            {!isCustom ? (
              <div>
                <div className="input-group" style={{ marginBottom: '24px' }}>
                  <label className="input-label">Kaynak Seçin</label>
                  <select className="select" value={selectedSistem} onChange={(e) => setSelectedSistem(e.target.value)}>
                    <option value="">-- Listeden kaynak seçin --</option>
                    {sistemKaynaklar.map(s => (
                      <option key={s.id} value={s.id}>{s.ad} - {s.yayin}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddSistem} disabled={!selectedSistem}>
                  <Plus size={18} /> Kaynağı Ekle
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddCustom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Kitap Adı</label>
                  <input className="input" value={customForm.ad} onChange={(e) => setCustomForm({ ...customForm, ad: e.target.value })} required placeholder="ör. 3D TYT Matematik Soru Bankası" />
                </div>
                <div className="input-group">
                  <label className="input-label">Yayın Adı</label>
                  <input className="input" value={customForm.yayin} onChange={(e) => setCustomForm({ ...customForm, yayin: e.target.value })} required placeholder="ör. 3D Yayınları" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Sınav Türü</label>
                    <select className="select" value={customForm.sinav_turu} onChange={(e) => setCustomForm({ ...customForm, sinav_turu: e.target.value })}>
                      <option value="TYT">TYT</option>
                      <option value="AYT">AYT</option>
                      <option value="YDT">YDT</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">İlgili Ders</label>
                    <select className="select" value={customForm.ders_id} onChange={(e) => setCustomForm({ ...customForm, ders_id: e.target.value })}>
                      <option value="">Seçin (Opsiyonel)</option>
                      {dersler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '8px' }}>
                  <Plus size={18} /> Özel Kaynağı Ekle
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .kaynak-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
        }

        .kaynak-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .kaynak-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .kaynak-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-delete {
          color: var(--text-tertiary);
        }
        
        .btn-delete:hover {
          color: var(--error);
          background: var(--error-light);
        }

        .kaynak-content {
          flex: 1;
        }

        .kaynak-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .kaynak-yayin {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .kaynak-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 12px;
          border-top: 1px dashed var(--border-light);
        }
        
        @media (max-width: 480px) {
          .kaynak-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </motion.div>
  );
}
