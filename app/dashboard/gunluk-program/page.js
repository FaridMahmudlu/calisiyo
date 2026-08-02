'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { todayStr, formatTime, formatDate, GUN_KISA } from '@/lib/utils/date';
import { getExamTabs } from '@/lib/constants/alanlar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus, CheckCircle2, 
  Circle, Edit2, Trash2, Clock 
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function GunlukProgramPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const examTabs = profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'];

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [tasks, setTasks] = useState([]);
  const [dersler, setDersler] = useState([]);
  const [kaynaklar, setKaynaklar] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    baslangic_saat: '08:00',
    bitis_saat: '08:40',
    ders_id: '',
    kaynak_id: '',
    konu: '',
    soru_sayisi: '',
    sayfa_araligi: '',
  });

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile, selectedDate]);

  async function loadData() {
    setLoading(true);

    const [{ data: taskData }, { data: dersData }, { data: kaynakData }] = await Promise.all([
      supabase
        .from('gunluk_gorevler')
        .select('*, dersler(ad, renk, ikon, sinav_turu)')
        .eq('user_id', profile.id)
        .eq('tarih', selectedDate)
        .order('baslangic_saat'),
      supabase
        .from('dersler')
        .select('*')
        .contains('alan', [profile.alan_secimi])
        .order('sira'),
      supabase
        .from('kaynaklarim')
        .select('*, kaynaklar_sistem(ad, yayin)')
        .eq('user_id', profile.id),
    ]);

    setTasks(taskData || []);
    setDersler(dersData || []);
    setKaynaklar(kaynakData || []);
    setLoading(false);
  }

  async function handleToggleComplete(taskId, current) {
    // Optimistic update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, tamamlandi: !current } : t));
    
    await supabase
      .from('gunluk_gorevler')
      .update({ tamamlandi: !current })
      .eq('id', taskId);
  }

  async function handleSaveTask(e) {
    e.preventDefault();

    const payload = {
      user_id: profile.id,
      tarih: selectedDate,
      baslangic_saat: form.baslangic_saat,
      bitis_saat: form.bitis_saat,
      ders_id: form.ders_id || null,
      kaynak_id: form.kaynak_id || null,
      konu: form.konu || null,
      soru_sayisi: form.soru_sayisi ? parseInt(form.soru_sayisi) : null,
      sayfa_araligi: form.sayfa_araligi || null,
    };

    if (editTask) {
      await supabase.from('gunluk_gorevler').update(payload).eq('id', editTask.id);
    } else {
      await supabase.from('gunluk_gorevler').insert(payload);
    }

    setShowModal(false);
    setEditTask(null);
    resetForm();
    loadData();
  }

  async function handleDeleteTask(id) {
    setTasks(tasks.filter(t => t.id !== id));
    await supabase.from('gunluk_gorevler').delete().eq('id', id);
  }

  function openEditModal(task) {
    setEditTask(task);
    setForm({
      baslangic_saat: task.baslangic_saat?.slice(0, 5) || '08:00',
      bitis_saat: task.bitis_saat?.slice(0, 5) || '08:40',
      ders_id: task.ders_id || '',
      kaynak_id: task.kaynak_id || '',
      konu: task.konu || '',
      soru_sayisi: task.soru_sayisi?.toString() || '',
      sayfa_araligi: task.sayfa_araligi || '',
    });
    setShowModal(true);
  }

  function resetForm() {
    setForm({
      baslangic_saat: '08:00',
      bitis_saat: '08:40',
      ders_id: '',
      kaynak_id: '',
      konu: '',
      soru_sayisi: '',
      sayfa_araligi: '',
    });
  }

  // Date navigation
  function changeDate(offset) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  }

  const isToday = selectedDate === todayStr();
  const completedCount = tasks.filter(t => t.tamamlandi).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      {/* Date Navigation */}
      <div className="date-nav">
        <button className="btn btn-ghost btn-icon-lg date-btn" onClick={() => changeDate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <div className="date-info">
          <span className="date-main">{formatDate(selectedDate)}</span>
          {isToday && <span className="badge badge-success">Bugün</span>}
        </div>
        <button className="btn btn-ghost btn-icon-lg date-btn" onClick={() => changeDate(1)}>
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card day-progress"
        >
          <div className="day-progress-header">
            <span>{completedCount}/{tasks.length} görev tamamlandı</span>
            <span className="day-progress-pct">{progressPercent}%</span>
          </div>
          <div className="progress-bar progress-bar-lg">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </motion.div>
      )}

      {/* Task List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : tasks.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card empty-state"
        >
          <CalendarDays size={48} className="empty-state-icon" />
          <div className="empty-state-title">Henüz görev eklenmemiş</div>
          <div className="empty-state-text">Bu gün için çalışma planı oluşturarak hedeflerine bir adım daha yaklaş.</div>
          <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => { resetForm(); setEditTask(null); setShowModal(true); }}>
            <Plus size={18} /> Görev Ekle
          </button>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="task-timeline"
        >
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div 
                variants={itemVariants} 
                key={task.id} 
                layout
                exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                className={`timeline-item card ${task.tamamlandi ? 'timeline-item-done' : ''}`}
              >
                <div className="timeline-time">
                  <span>{formatTime(task.baslangic_saat)}</span>
                  <span className="timeline-time-sep"><Clock size={12} /></span>
                  <span>{formatTime(task.bitis_saat)}</span>
                </div>
                
                <div className="timeline-divider"></div>
                
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-ders" style={{ color: task.dersler?.renk || 'var(--primary-500)' }}>
                      {task.dersler?.ikon} {task.dersler?.ad}
                    </span>
                    {task.dersler?.sinav_turu && (
                      <span className="badge badge-neutral">{task.dersler?.sinav_turu}</span>
                    )}
                  </div>
                  {task.konu && <div className="timeline-konu">{task.konu}</div>}
                  <div className="timeline-meta">
                    {task.soru_sayisi > 0 && <span className="meta-badge">{task.soru_sayisi} soru</span>}
                    {task.sayfa_araligi && <span className="meta-badge">Sayfa {task.sayfa_araligi}</span>}
                  </div>
                </div>
                <div className="timeline-actions">
                  <button
                    className={`timeline-check ${task.tamamlandi ? 'timeline-check-done' : ''}`}
                    onClick={() => handleToggleComplete(task.id, task.tamamlandi)}
                    title={task.tamamlandi ? 'Geri al' : 'Tamamla'}
                  >
                    {task.tamamlandi ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  <div className="timeline-actions-sub">
                    <button className="btn btn-ghost btn-icon btn-action" onClick={() => openEditModal(task)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-action btn-delete" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* FAB */}
      {tasks.length > 0 && (
        <motion.button 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.5 }}
          className="fab" 
          onClick={() => { resetForm(); setEditTask(null); setShowModal(true); }}
        >
          <Plus size={28} />
        </motion.button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editTask ? 'Görevi Düzenle' : 'Yeni Görev'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveTask} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Başlangıç</label>
                  <input className="input" type="time" value={form.baslangic_saat} onChange={(e) => setForm({ ...form, baslangic_saat: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Bitiş</label>
                  <input className="input" type="time" value={form.bitis_saat} onChange={(e) => setForm({ ...form, bitis_saat: e.target.value })} required />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Ders</label>
                <select className="select" value={form.ders_id} onChange={(e) => setForm({ ...form, ders_id: e.target.value })}>
                  <option value="">Ders Seçin</option>
                  {dersler.map((d) => (
                    <option key={d.id} value={d.id}>{d.sinav_turu} - {d.ad}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Konu</label>
                <input className="input" type="text" value={form.konu} onChange={(e) => setForm({ ...form, konu: e.target.value })} placeholder="ör. Bölme - Bölünebilme" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Soru Sayısı</label>
                  <input className="input" type="number" value={form.soru_sayisi} onChange={(e) => setForm({ ...form, soru_sayisi: e.target.value })} placeholder="40" />
                </div>
                <div className="input-group">
                  <label className="input-label">Sayfa Aralığı</label>
                  <input className="input" type="text" value={form.sayfa_araligi} onChange={(e) => setForm({ ...form, sayfa_araligi: e.target.value })} placeholder="45-60" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Kaynak</label>
                <select className="select" value={form.kaynak_id} onChange={(e) => setForm({ ...form, kaynak_id: e.target.value })}>
                  <option value="">Kaynak Seçin (opsiyonel)</option>
                  {kaynaklar.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.kaynaklar_sistem?.ad || k.custom_ad}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editTask ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .date-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .date-btn {
          color: var(--text-secondary);
        }
        
        .date-btn:hover {
          color: var(--text-primary);
          background: var(--gray-100);
        }

        .date-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .date-main {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .day-progress {
          margin-bottom: 24px;
          padding: 20px 24px;
        }

        .day-progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 12px;
          font-weight: 500;
        }

        .day-progress-pct {
          font-weight: 700;
          color: var(--primary-600);
        }

        .task-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .timeline-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          border-left: 4px solid transparent;
          transition: all var(--transition-base);
        }

        .timeline-item:hover {
          border-left-color: var(--primary-400);
        }

        .timeline-item-done {
          opacity: 0.6;
          background: var(--gray-50);
          border-left-color: var(--success);
        }

        .timeline-item-done .timeline-ders,
        .timeline-item-done .timeline-konu {
          text-decoration: line-through;
          color: var(--text-tertiary);
        }
        
        .timeline-item-done:hover {
          border-left-color: var(--success);
          opacity: 0.8;
        }

        .timeline-time {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
          min-width: 60px;
        }

        .timeline-time-sep {
          color: var(--text-tertiary);
          margin: 2px 0;
        }
        
        .timeline-divider {
          width: 2px;
          height: 40px;
          background: var(--gray-200);
          border-radius: 2px;
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .timeline-ders {
          font-weight: 700;
          font-size: 1rem;
        }

        .timeline-konu {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
          font-weight: 500;
        }

        .timeline-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .meta-badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--gray-100);
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }

        .timeline-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .timeline-actions-sub {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .timeline-check {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-400);
          transition: all var(--transition-fast);
          cursor: pointer;
          background: none;
          padding: 4px;
          border-radius: 50%;
        }

        .timeline-check:hover {
          color: var(--primary-500);
          background: var(--primary-50);
          transform: scale(1.1);
        }

        .timeline-check-done {
          color: var(--primary-500);
        }
        
        .btn-action {
          color: var(--text-tertiary);
        }
        
        .btn-action:hover {
          color: var(--primary-600);
          background: var(--primary-50);
        }
        
        .btn-delete:hover {
          color: var(--error);
          background: var(--error-light);
        }

        .fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
          cursor: pointer;
          border: none;
          transition: all var(--transition-bounce);
          z-index: 80;
        }

        .fab:hover {
          transform: scale(1.05) translateY(-4px);
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.5);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .timeline-item {
            padding: 16px;
          }
          
          .timeline-divider {
            display: none;
          }

          .fab {
            bottom: calc(var(--mobile-nav-height) + 16px);
            right: 16px;
            width: 56px;
            height: 56px;
          }
          
          .timeline-actions {
            flex-direction: column;
            gap: 8px;
          }
          
          .timeline-actions-sub {
            flex-direction: row;
          }
        }
      `}</style>
    </motion.div>
  );
}
