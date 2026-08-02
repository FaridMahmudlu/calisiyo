'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';

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
    await supabase.from('kaynaklarim').delete().eq('id', id);
    loadData();
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
      ders: null,
    };
  }

  return (
    <div className="page animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setIsCustom(false); }}>+ Kaynak Ekle</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg"></div></div>
      ) : kaynaklar.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-title">Henüz kaynak eklenmemiş</div>
          <div className="empty-state-text">Kullandığın kaynakları ekleyerek programında kullan.</div>
        </div>
      ) : (
        <div className="kaynak-grid">
          {kaynaklar.map(k => {
            const info = getKaynakInfo(k);
            return (
              <div key={k.id} className="card kaynak-card card-interactive">
                <div className="kaynak-top">
                  <div className="kaynak-icon-wrapper">📕</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(k.id)} title="Kaldır">✕</button>
                </div>
                <h3 className="kaynak-name">{info.ad}</h3>
                <p className="kaynak-yayin">{info.yayin}</p>
                <div className="kaynak-badges">
                  <span className="badge badge-info">{info.sinav}</span>
                  {info.ders && <span className="badge badge-neutral">{info.ders.ad}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Kaynak Ekle</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="tabs" style={{ marginBottom: '20px' }}>
              <button className={`tab ${!isCustom ? 'tab-active' : ''}`} onClick={() => setIsCustom(false)}>Listeden Seç</button>
              <button className={`tab ${isCustom ? 'tab-active' : ''}`} onClick={() => setIsCustom(true)}>Özel Ekle</button>
            </div>

            {!isCustom ? (
              <div>
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label className="input-label">Kaynak Seçin</label>
                  <select className="select" value={selectedSistem} onChange={(e) => setSelectedSistem(e.target.value)}>
                    <option value="">-- Kaynak seçin --</option>
                    {sistemKaynaklar.map(s => (
                      <option key={s.id} value={s.id}>{s.ad} - {s.yayin}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddSistem} disabled={!selectedSistem}>Ekle</button>
              </div>
            ) : (
              <form onSubmit={handleAddCustom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="input-group">
                  <label className="input-label">Kitap Adı</label>
                  <input className="input" value={customForm.ad} onChange={(e) => setCustomForm({ ...customForm, ad: e.target.value })} required placeholder="ör. 3D TYT Matematik" />
                </div>
                <div className="input-group">
                  <label className="input-label">Yayın</label>
                  <input className="input" value={customForm.yayin} onChange={(e) => setCustomForm({ ...customForm, yayin: e.target.value })} required placeholder="ör. 3D" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Sınav Türü</label>
                    <select className="select" value={customForm.sinav_turu} onChange={(e) => setCustomForm({ ...customForm, sinav_turu: e.target.value })}>
                      <option value="TYT">TYT</option>
                      <option value="AYT">AYT</option>
                      <option value="YDT">YDT</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Ders</label>
                    <select className="select" value={customForm.ders_id} onChange={(e) => setCustomForm({ ...customForm, ders_id: e.target.value })}>
                      <option value="">Seçin</option>
                      {dersler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Ekle</button>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .kaynak-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .kaynak-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .kaynak-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .kaynak-icon-wrapper {
          font-size: 2rem;
        }

        .kaynak-name {
          font-size: 0.9375rem;
          font-weight: 600;
        }

        .kaynak-yayin {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
        }

        .kaynak-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
