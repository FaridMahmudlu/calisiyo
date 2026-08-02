'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';
import { formatDate } from '@/lib/utils/date';

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
    await supabase.from('yapamadiklari').update({ cozuldu: !current }).eq('id', id);
    setSorular(sorular.map(s => s.id === id ? { ...s, cozuldu: !current } : s));
  }

  async function handleDelete(id) {
    await supabase.from('yapamadiklari').delete().eq('id', id);
    loadData();
  }

  return (
    <div className="page animate-fade-in">
      <div className="tabs" style={{ marginBottom: '20px' }}>
        {examTabs.map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Soru Ekle</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg"></div></div>
      ) : sorular.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">❓</div>
          <div className="empty-state-title">Henüz soru eklenmemiş</div>
          <div className="empty-state-text">Yapamadığın soruları ekleyerek tekrar çöz.</div>
        </div>
      ) : (
        <div className="soru-list">
          {sorular.map(s => (
            <div key={s.id} className={`card soru-card ${s.cozuldu ? 'soru-done' : ''}`}>
              <button className={`timeline-check ${s.cozuldu ? 'timeline-check-done' : ''}`} onClick={() => toggleCozuldu(s.id, s.cozuldu)}>
                {s.cozuldu ? '✓' : '○'}
              </button>
              <div className="soru-info" style={{ flex: 1 }}>
                <span className="soru-ders" style={{ color: s.dersler?.renk }}>{s.dersler?.ikon} {s.dersler?.ad}</span>
                {s.konu && <span className="soru-meta">{s.konu}</span>}
                <span className="soru-meta">{s.sayfa && `Sayfa ${s.sayfa}`} {s.soru_no && `• Soru ${s.soru_no}`}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Yapamadığım Soru</h3>
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
                <input className="input" value={form.konu} onChange={(e) => setForm({ ...form, konu: e.target.value })} placeholder="ör. Bölme Bölünebilme" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Sayfa</label>
                  <input className="input" type="number" value={form.sayfa} onChange={(e) => setForm({ ...form, sayfa: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Soru No</label>
                  <input className="input" value={form.soru_no} onChange={(e) => setForm({ ...form, soru_no: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Ekle</button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .soru-list { display: flex; flex-direction: column; gap: 8px; }
        .soru-card { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }
        .soru-done { opacity: 0.5; }
        .soru-done .soru-ders { text-decoration: line-through; }
        .soru-ders { font-weight: 600; font-size: 0.875rem; }
        .soru-info { display: flex; flex-direction: column; gap: 2px; }
        .soru-meta { font-size: 0.75rem; color: var(--text-tertiary); }
        .timeline-check { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--gray-300); display: flex; align-items: center; justify-content: center; cursor: pointer; background: none; transition: all var(--transition-fast); color: var(--gray-400); font-size: 0.875rem; }
        .timeline-check:hover { border-color: var(--primary-400); }
        .timeline-check-done { border-color: var(--primary-500); background: var(--primary-500); color: white; }
      `}</style>
    </div>
  );
}
