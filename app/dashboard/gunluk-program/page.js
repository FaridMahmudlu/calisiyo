'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { todayStr, formatTime, formatDate, GUN_KISA } from '@/lib/utils/date';
import { getExamTabs } from '@/lib/constants/alanlar';

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
    await supabase
      .from('gunluk_gorevler')
      .update({ tamamlandi: !current })
      .eq('id', taskId);

    setTasks(tasks.map(t => t.id === taskId ? { ...t, tamamlandi: !current } : t));
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
    await supabase.from('gunluk_gorevler').delete().eq('id', id);
    loadData();
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
    <div className="page animate-fade-in">
      {/* Date Navigation */}
      <div className="date-nav">
        <button className="btn btn-ghost btn-icon" onClick={() => changeDate(-1)}>←</button>
        <div className="date-info">
          <span className="date-main">{formatDate(selectedDate)}</span>
          {isToday && <span className="badge badge-success">Bugün</span>}
        </div>
        <button className="btn btn-ghost btn-icon" onClick={() => changeDate(1)}>→</button>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="card day-progress">
          <div className="day-progress-header">
            <span>{completedCount}/{tasks.length} görev tamamlandı</span>
            <span className="day-progress-pct">{progressPercent}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">Henüz görev eklenmemiş</div>
          <div className="empty-state-text">Bu gün için çalışma planı oluştur.</div>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => { resetForm(); setEditTask(null); setShowModal(true); }}>
            + Görev Ekle
          </button>
        </div>
      ) : (
        <div className="task-timeline">
          {tasks.map((task) => (
            <div key={task.id} className={`timeline-item card ${task.tamamlandi ? 'timeline-item-done' : ''}`}>
              <div className="timeline-time">
                <span>{formatTime(task.baslangic_saat)}</span>
                <span className="timeline-time-sep">-</span>
                <span>{formatTime(task.bitis_saat)}</span>
              </div>
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
                  {task.soru_sayisi && <span>{task.soru_sayisi} soru</span>}
                  {task.sayfa_araligi && <span>Sayfa {task.sayfa_araligi}</span>}
                </div>
              </div>
              <div className="timeline-actions">
                <button
                  className={`timeline-check ${task.tamamlandi ? 'timeline-check-done' : ''}`}
                  onClick={() => handleToggleComplete(task.id, task.tamamlandi)}
                  title={task.tamamlandi ? 'Geri al' : 'Tamamla'}
                >
                  {task.tamamlandi ? '✓' : '○'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(task)}>✏️</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTask(task.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      {tasks.length > 0 && (
        <button className="fab" onClick={() => { resetForm(); setEditTask(null); setShowModal(true); }}>+</button>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
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
          margin-bottom: 20px;
        }

        .date-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .date-main {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .day-progress {
          margin-bottom: 20px;
          padding: 16px 20px;
        }

        .day-progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .day-progress-pct {
          font-weight: 600;
          color: var(--primary-600);
        }

        .task-timeline {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px 20px;
          transition: opacity var(--transition-fast);
        }

        .timeline-item-done {
          opacity: 0.6;
        }

        .timeline-item-done .timeline-ders,
        .timeline-item-done .timeline-konu {
          text-decoration: line-through;
        }

        .timeline-time {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          min-width: 50px;
        }

        .timeline-time-sep {
          font-size: 0.625rem;
          color: var(--text-tertiary);
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .timeline-ders {
          font-weight: 600;
          font-size: 0.9375rem;
        }

        .timeline-konu {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .timeline-meta {
          display: flex;
          gap: 12px;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .timeline-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .timeline-check {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid var(--gray-300);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          color: var(--gray-400);
          transition: all var(--transition-fast);
          cursor: pointer;
          background: none;
        }

        .timeline-check:hover {
          border-color: var(--primary-400);
          color: var(--primary-500);
        }

        .timeline-check-done {
          border-color: var(--primary-500);
          background: var(--primary-500);
          color: white;
        }

        .fab {
          position: fixed;
          bottom: 90px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: white;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
          cursor: pointer;
          border: none;
          transition: all var(--transition-fast);
          z-index: 80;
        }

        .fab:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .timeline-item {
            flex-direction: column;
            gap: 8px;
          }

          .timeline-time {
            flex-direction: row;
            gap: 4px;
          }

          .fab {
            bottom: 80px;
            right: 16px;
          }
        }
      `}</style>
    </div>
  );
}
