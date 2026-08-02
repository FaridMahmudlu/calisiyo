'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';
import { formatDate } from '@/lib/utils/date';

export default function DenemeAnaliziPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const examTabs = profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'];

  const [activeTab, setActiveTab] = useState('TYT');
  const [denemeler, setDenemeler] = useState([]);
  const [dersler, setDersler] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    yayin: '',
    tarih: new Date().toISOString().split('T')[0],
    sure_dakika: '',
    detaylar: {},
  });

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile, activeTab]);

  async function loadData() {
    setLoading(true);

    const [{ data: denemeData }, { data: dersData }] = await Promise.all([
      supabase
        .from('denemeler')
        .select('*, deneme_detaylari(*, dersler(ad, renk, ikon))')
        .eq('user_id', profile.id)
        .eq('sinav_turu', activeTab)
        .order('tarih', { ascending: false }),
      supabase
        .from('dersler')
        .select('*')
        .eq('sinav_turu', activeTab)
        .contains('alan', [profile.alan_secimi])
        .order('sira'),
    ]);

    setDenemeler(denemeData || []);
    setDersler(dersData || []);
    setLoading(false);
  }

  function openAddModal() {
    const initialDetaylar = {};
    dersler.forEach(d => {
      initialDetaylar[d.id] = { dogru: '', yanlis: '', bos: '' };
    });
    setForm({
      yayin: '',
      tarih: new Date().toISOString().split('T')[0],
      sure_dakika: '',
      detaylar: initialDetaylar,
    });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();

    const { data: deneme } = await supabase
      .from('denemeler')
      .insert({
        user_id: profile.id,
        sinav_turu: activeTab,
        yayin: form.yayin,
        tarih: form.tarih,
        sure_dakika: form.sure_dakika ? parseInt(form.sure_dakika) : null,
      })
      .select()
      .single();

    if (deneme) {
      const detayRows = Object.entries(form.detaylar)
        .filter(([, v]) => v.dogru || v.yanlis || v.bos)
        .map(([dersId, v]) => ({
          deneme_id: deneme.id,
          ders_id: dersId,
          dogru: parseInt(v.dogru) || 0,
          yanlis: parseInt(v.yanlis) || 0,
          bos: parseInt(v.bos) || 0,
        }));

      if (detayRows.length > 0) {
        await supabase.from('deneme_detaylari').insert(detayRows);
      }
    }

    setShowModal(false);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from('deneme_detaylari').delete().eq('deneme_id', id);
    await supabase.from('denemeler').delete().eq('id', id);
    loadData();
  }

  function calculateTotalNet(deneme) {
    return deneme.deneme_detaylari?.reduce((sum, d) => sum + (d.net || 0), 0).toFixed(2);
  }

  return (
    <div className="page animate-fade-in">
      <div className="tabs" style={{ marginBottom: '24px' }}>
        {examTabs.map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={openAddModal}>+ Deneme Ekle</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : denemeler.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Henüz deneme eklenmemiş</div>
          <div className="empty-state-text">Deneme sonuçlarını ekleyerek gelişimini takip et.</div>
        </div>
      ) : (
        <div className="deneme-list">
          {denemeler.map(deneme => (
            <div key={deneme.id} className="card deneme-card">
              <div className="deneme-header">
                <div>
                  <span className="deneme-yayin">{deneme.yayin}</span>
                  <span className="deneme-date">{formatDate(deneme.tarih)}</span>
                </div>
                <div className="deneme-total">
                  <span className="deneme-total-label">Toplam Net</span>
                  <span className="deneme-total-value">{calculateTotalNet(deneme)}</span>
                </div>
              </div>
              {deneme.deneme_detaylari?.length > 0 && (
                <div className="deneme-details">
                  {deneme.deneme_detaylari.map(d => (
                    <div key={d.id} className="detail-row">
                      <span className="detail-ders" style={{ color: d.dersler?.renk }}>
                        {d.dersler?.ikon} {d.dersler?.ad}
                      </span>
                      <div className="detail-nums">
                        <span className="detail-d">D: {d.dogru}</span>
                        <span className="detail-y">Y: {d.yanlis}</span>
                        <span className="detail-b">B: {d.bos}</span>
                        <span className="detail-net">Net: {d.net?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(deneme.id)}>🗑️ Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Yeni Deneme</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div className="input-group">
                  <label className="input-label">Yayın</label>
                  <input className="input" value={form.yayin} onChange={(e) => setForm({ ...form, yayin: e.target.value })} placeholder="ör. 3D" required />
                </div>
                <div className="input-group">
                  <label className="input-label">Tarih</label>
                  <input className="input" type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Süre (dk)</label>
                  <input className="input" type="number" value={form.sure_dakika} onChange={(e) => setForm({ ...form, sure_dakika: e.target.value })} placeholder="165" />
                </div>
              </div>

              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px' }}>Ders Bazlı Sonuçlar</h4>
              <div className="ders-inputs">
                {dersler.map(d => (
                  <div key={d.id} className="ders-input-row">
                    <span className="ders-input-name" style={{ color: d.renk }}>{d.ikon} {d.ad}</span>
                    <input className="input" type="number" placeholder="D" style={{ width: '60px' }}
                      value={form.detaylar[d.id]?.dogru || ''}
                      onChange={(e) => setForm({
                        ...form,
                        detaylar: { ...form.detaylar, [d.id]: { ...form.detaylar[d.id], dogru: e.target.value } }
                      })} />
                    <input className="input" type="number" placeholder="Y" style={{ width: '60px' }}
                      value={form.detaylar[d.id]?.yanlis || ''}
                      onChange={(e) => setForm({
                        ...form,
                        detaylar: { ...form.detaylar, [d.id]: { ...form.detaylar[d.id], yanlis: e.target.value } }
                      })} />
                    <input className="input" type="number" placeholder="B" style={{ width: '60px' }}
                      value={form.detaylar[d.id]?.bos || ''}
                      onChange={(e) => setForm({
                        ...form,
                        detaylar: { ...form.detaylar, [d.id]: { ...form.detaylar[d.id], bos: e.target.value } }
                      })} />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .deneme-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .deneme-card {
          padding: 20px;
        }

        .deneme-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .deneme-yayin {
          font-weight: 600;
          font-size: 1rem;
          display: block;
        }

        .deneme-date {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
        }

        .deneme-total {
          text-align: right;
        }

        .deneme-total-label {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          display: block;
        }

        .deneme-total-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary-600);
        }

        .deneme-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--gray-50);
          border-radius: var(--radius-sm);
        }

        .detail-ders {
          font-weight: 500;
          font-size: 0.8125rem;
        }

        .detail-nums {
          display: flex;
          gap: 12px;
          font-size: 0.75rem;
        }

        .detail-d { color: var(--success); font-weight: 600; }
        .detail-y { color: var(--error); font-weight: 600; }
        .detail-b { color: var(--text-tertiary); }
        .detail-net { color: var(--primary-600); font-weight: 700; }

        .ders-inputs {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .ders-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ders-input-name {
          font-size: 0.8125rem;
          font-weight: 500;
          min-width: 120px;
        }

        @media (max-width: 768px) {
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .ders-input-row {
            flex-wrap: wrap;
          }

          .ders-input-name {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
