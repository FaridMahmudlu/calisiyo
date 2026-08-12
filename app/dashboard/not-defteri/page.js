'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { NotebookText, Plus, Trash2, Folder, Edit3 } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import PageHeader from '@/components/ui/PageHeader';
import JourneyLoader from '@/components/ui/JourneyLoader';

const REALTIME_TABLES = ['notlar'];

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

export default function NotDefteriPage() {
  const { profile, setError } = useUser();
  const supabase = createClient();
  const [notlar, setNotlar] = useState([]);
  const [klasorler, setKlasorler] = useState([]);
  const [activeKlasor, setActiveKlasor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ klasor: '', baslik: '', icerik: '' });

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notlar')
      .select('*')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false });

    if (error) {
      setError('Notların yüklenemedi. Lütfen tekrar dene.');
      setNotlar([]);
      setKlasorler([]);
      setLoading(false);
      return;
    }

    setNotlar(data || []);
    const folders = [...new Set((data || []).map(n => n.klasor))];
    setKlasorler(folders);
    setLoading(false);
  }, [profile, setError, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: loadData });

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

    let result;
    if (editNote) {
      result = await supabase.from('notlar').update(payload).eq('id', editNote.id).eq('user_id', profile.id);
    } else {
      result = await supabase.from('notlar').insert(payload);
    }
    if (result.error) return setError(`Not kaydedilemedi: ${result.error.message}`);
    setShowModal(false);
    setEditNote(null);
    setForm({ klasor: '', baslik: '', icerik: '' });
    loadData();
  }

  async function handleDelete(id) {
    if (!window.confirm('Bu notu silmek istediğine emin misin?')) return;
    const previous = notlar;
    setNotlar(notlar.filter(n => n.id !== id));
    const { error: deleteError } = await supabase.from('notlar').delete().eq('id', id).eq('user_id', profile.id);
    if (deleteError) { setNotlar(previous); setError(`Not silinemedi: ${deleteError.message}`); }
  }

  function openEdit(note) {
    setEditNote(note);
    setForm({ klasor: note.klasor, baslik: note.baslik, icerik: note.icerik || '' });
    setShowModal(true);
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <PageHeader title="Not Defterim" description="Ders notlarını klasörler halinde düzenle, ara ve güncel tut." />
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="folder-tabs">
          <button 
            className={`tab ${!activeKlasor ? 'tab-active' : ''}`} 
            onClick={() => setActiveKlasor(null)}
          >
            Tümü
          </button>
          {klasorler.map(k => (
            <button 
              key={k} 
              className={`tab ${activeKlasor === k ? 'tab-active' : ''}`} 
              onClick={() => setActiveKlasor(k)}
            >
              <Folder size={14} style={{ marginRight: '6px' }} />
              {k}
            </button>
          ))}
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => { setEditNote(null); setForm({ klasor: '', baslik: '', icerik: '' }); setShowModal(true); }}
        >
          <Plus size={18} /> Yeni Not
        </button>
      </div>

      {loading ? (
        <JourneyLoader compact label="Notların hazırlanıyor" />
      ) : filteredNotes.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card empty-state"
        >
          <NotebookText size={48} className="empty-state-icon" />
          <div className="empty-state-title">Henüz not eklenmemiş</div>
          <div className="empty-state-text">Ders notlarını klasörler halinde düzenleyerek kolayca tekrar edebilirsin.</div>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => { setEditNote(null); setForm({ klasor: '', baslik: '', icerik: '' }); setShowModal(true); }}>
            <Plus size={18} /> Yeni Not
          </button>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="notes-grid"
        >
          <AnimatePresence>
            {filteredNotes.map(note => (
              <motion.div 
                variants={itemVariants}
                layout
                exit={{ opacity: 0, scale: 0.8 }}
                key={note.id} 
                className="card note-card card-interactive" 
                onClick={() => openEdit(note)}
              >
                <div className="note-header">
                  <span className="badge badge-info">
                    <Folder size={12} style={{ marginRight: '4px' }} />
                    {note.klasor}
                  </span>
                  <div className="note-actions">
                    <button className="btn btn-ghost btn-icon btn-sm btn-edit" onClick={(e) => { e.stopPropagation(); openEdit(note); }} title="Düzenle">
                      <Edit3 size={16} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} title="Sil">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="note-title">{note.baslik}</h3>
                <p className="note-preview">{note.icerik?.slice(0, 140) || 'Boş not...'}</p>
                <div className="note-footer">
                  <span>Son güncelleme: {new Date(note.updated_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editNote ? 'Notu Düzenle' : 'Yeni Not'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
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
                <textarea 
                  className="input" 
                  rows={14} 
                  value={form.icerik} 
                  onChange={(e) => setForm({ ...form, icerik: e.target.value })} 
                  placeholder="Notlarınızı buraya yazın..." 
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.6' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>İptal</button>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>
                  {editNote ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .folder-tabs {
          display: flex;
          gap: 8px;
          background: var(--bg-secondary);
          padding: 6px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          overflow-x: auto;
          flex: 1;
        }

        .notes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .note-card {
          padding: 24px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 220px;
        }

        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .note-actions {
          display: flex;
          gap: 4px;
        }
        
        .btn-edit {
          color: var(--text-tertiary);
        }
        
        .btn-edit:hover {
          color: var(--primary-600);
          background: var(--primary-50);
        }
        
        .btn-delete {
          color: var(--text-tertiary);
        }
        
        .btn-delete:hover {
          color: var(--error);
          background: var(--error-light);
        }

        .note-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--text-primary);
        }

        .note-preview {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        
        .note-footer {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px dashed var(--border-light);
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        @media (max-width: 768px) {
          .notes-grid {
            grid-template-columns: 1fr;
          }
          
          .folder-tabs {
            width: 100%;
          }
        }
      `}</style>
    </motion.div>
  );
}
