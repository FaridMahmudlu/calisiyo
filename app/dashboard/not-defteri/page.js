'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';

export default function NotDefteriPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const [notlar, setNotlar] = useState([]);
  const [klasorler, setKlasorler] = useState([]);
  const [activeKlasor, setActiveKlasor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ klasor: '', baslik: '', icerik: '' });

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('notlar')
      .select('*')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false });

    setNotlar(data || []);
    const folders = [...new Set((data || []).map(n => n.klasor))];
    setKlasorler(folders);
    setLoading(false);
  }

  const filteredNotes = activeKlasor
    ? notlar.filter(n => n.klasor === activeKlasor)
    : notlar;

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      user_id: profile.id,
      klasor: form.klasor,
      baslik: form.baslik,
      icerik: form.icerik,
      updated_at: new Date().toISOString(),
    };

    if (editNote) {
      await supabase.from('notlar').update(payload).eq('id', editNote.id);
    } else {
      await supabase.from('notlar').insert(payload);
    }
    setShowModal(false);
    setEditNote(null);
    setForm({ klasor: '', baslik: '', icerik: '' });
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from('notlar').delete().eq('id', id);
    loadData();
  }

  function openEdit(note) {
    setEditNote(note);
    setForm({ klasor: note.klasor, baslik: note.baslik, icerik: note.icerik || '' });
    setShowModal(true);
  }

  return (
    <div className="page animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="folder-tabs">
          <button className={`tab ${!activeKlasor ? 'tab-active' : ''}`} onClick={() => setActiveKlasor(null)}>Tümü</button>
          {klasorler.map(k => (
            <button key={k} className={`tab ${activeKlasor === k ? 'tab-active' : ''}`} onClick={() => setActiveKlasor(k)}>{k}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => { setEditNote(null); setForm({ klasor: '', baslik: '', icerik: '' }); setShowModal(true); }}>+ Yeni Not</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg"></div></div>
      ) : filteredNotes.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">Henüz not eklenmemiş</div>
          <div className="empty-state-text">Ders notlarını klasörler halinde düzenle.</div>
        </div>
      ) : (
        <div className="notes-grid">
          {filteredNotes.map(note => (
            <div key={note.id} className="card note-card card-interactive" onClick={() => openEdit(note)}>
              <div className="note-header">
                <span className="badge badge-info">{note.klasor}</span>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}>🗑️</button>
              </div>
              <h3 className="note-title">{note.baslik}</h3>
              <p className="note-preview">{note.icerik?.slice(0, 120) || 'Boş not...'}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editNote ? 'Notu Düzenle' : 'Yeni Not'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Klasör</label>
                  <input className="input" value={form.klasor} onChange={(e) => setForm({ ...form, klasor: e.target.value })} placeholder="ör. Matematik" required list="klasor-list" />
                  <datalist id="klasor-list">
                    {klasorler.map(k => <option key={k} value={k} />)}
                  </datalist>
                </div>
                <div className="input-group">
                  <label className="input-label">Başlık</label>
                  <input className="input" value={form.baslik} onChange={(e) => setForm({ ...form, baslik: e.target.value })} placeholder="Not başlığı" required />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">İçerik</label>
                <textarea className="input" rows={10} value={form.icerik} onChange={(e) => setForm({ ...form, icerik: e.target.value })} placeholder="Notlarınızı yazın..." style={{ resize: 'vertical' }} />
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
                {editNote ? 'Güncelle' : 'Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .folder-tabs {
          display: flex;
          gap: 4px;
          background: var(--gray-100);
          padding: 4px;
          border-radius: var(--radius-lg);
          overflow-x: auto;
          flex: 1;
          margin-right: 12px;
        }

        .notes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        .note-card {
          padding: 18px;
          cursor: pointer;
        }

        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .note-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .note-preview {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .folder-tabs {
            margin-right: 0;
            margin-bottom: 12px;
          }
        }
      `}</style>
    </div>
  );
}
