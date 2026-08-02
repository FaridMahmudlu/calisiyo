'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';
import { formatDate, todayStr } from '@/lib/utils/date';

export default function TekrarlarimPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const examTabs = profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'];

  const [activeTab, setActiveTab] = useState('TYT');
  const [filter, setFilter] = useState('bugun');
  const [tekrarlar, setTekrarlar] = useState([]);
  const [dersler, setDersler] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ders_id: '', konu: '', kaynak: '', tekrar_tarihi: todayStr(), tekrar_saati: '' });

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile, activeTab, filter]);

  async function loadData() {
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
  }

  async function handleAdd(e) {
    e.preventDefault();
    await supabase.from('tekrarlar').insert({
      user_id: profile.id,
      ders_id: form.ders_id || null,
      sinav_turu: activeTab,
      konu: form.konu,
      kaynak: form.kaynak || null,
      tekrar_tarihi: form.tekrar_tarihi,
      tekrar_saati: form.tekrar_saati || null,
    });
    setShowModal(false);
    setForm({ ders_id: '', konu: '', kaynak: '', tekrar_tarihi: todayStr(), tekrar_saati: '' });
    loadData();
  }

  async function toggleTamamlandi(id, current) {
    await supabase.from('tekrarlar').update({ tamamlandi: !current }).eq('id', id);
    setTekrarlar(tekrarlar.map(t => t.id === id ? { ...t, tamamlandi: !current } : t));
  }

  return (
    <div className="page animate-fade-in">
      <div className="tabs" style={{ marginBottom: '16px' }}>
        {examTabs.map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="tabs">
          <button className={`tab ${filter === 'bugun' ? 'tab-active' : ''}`} onClick={() => setFilter('bugun')}>Bugün</button>
          <button className={`tab ${filter === 'yaklasan' ? 'tab-active' : ''}`} onClick={() => setFilter('yaklasan')}>Yaklaşan</button>
          <button className={`tab ${filter === 'gecen' ? 'tab-active' : ''}`} onClick={() => setFilter('gecen')}>Geçen</button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tekrar Ekle</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg"></div></div>
      ) : tekrarlar.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🔄</div>
          <div className="empty-state-title">Tekrar bulunamadı</div>
          <div className="empty-state-text">Konu tekrarlarını ekleyerek takip et.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tekrarlar.map(t => (
            <div key={t.id} className={`card ${t.tamamlandi ? 'tekrar-done' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px' }}>
              <button className={`check-btn ${t.tamamlandi ? 'check-done' : ''}`} onClick={() => toggleTamamlandi(t.id, t.tamamlandi)}>
                {t.tamamlandi ? '✓' : '○'}
              </button>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: t.dersler?.renk }}>{t.dersler?.ikon} {t.dersler?.ad}</span>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t.konu}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {formatDate(t.tekrar_tarihi)} {t.tekrar_saati && `• ${t.tekrar_saati.slice(0,5)}`}
                  {t.kaynak && ` • ${t.kaynak}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Yeni Tekrar</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group">
                <label className="input-label">Ders</label>
                <select className="select" value={form.ders_id} onChange={(e) => setForm({ ...form, ders_id: e.target.value })}>
                  <option value="">Seçin</option>
                  {dersler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Konu</label>
                <input className="input" value={form.konu} onChange={(e) => setForm({ ...form, konu: e.target.value })} required placeholder="ör. Türev" />
              </div>
              <div className="input-group">
                <label className="input-label">Kaynak</label>
                <input className="input" value={form.kaynak} onChange={(e) => setForm({ ...form, kaynak: e.target.value })} placeholder="ör. 3D AYT" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Tarih</label>
                  <input className="input" type="date" value={form.tekrar_tarihi} onChange={(e) => setForm({ ...form, tekrar_tarihi: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Saat</label>
                  <input className="input" type="time" value={form.tekrar_saati} onChange={(e) => setForm({ ...form, tekrar_saati: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Ekle</button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .tekrar-done { opacity: 0.5; }
        .check-btn { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--gray-300); display: flex; align-items: center; justify-content: center; cursor: pointer; background: none; color: var(--gray-400); font-size: 0.875rem; transition: all var(--transition-fast); }
        .check-btn:hover { border-color: var(--primary-400); }
        .check-done { border-color: var(--primary-500); background: var(--primary-500); color: white; }
      `}</style>
    </div>
  );
}
