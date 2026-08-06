'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, Edit3, ListChecks, Plus, Trash2 } from 'lucide-react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatDuration, formatTime, parseLocalDate, toLocalDateKey, todayStr } from '@/lib/utils/date';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import PageHeader from '@/components/ui/PageHeader';
import DataState from '@/components/ui/DataState';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';

const EMPTY_FORM = {
  baslangic_saat: '08:00', bitis_saat: '08:40', ders_id: '', kaynak_id: '', konu: '', soru_sayisi: '', sayfa_araligi: '',
};

function taskDuration(task) {
  if (!task.baslangic_saat || !task.bitis_saat) return 0;
  const [startHour, startMinute] = task.baslangic_saat.split(':').map(Number);
  const [endHour, endMinute] = task.bitis_saat.split(':').map(Number);
  return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute));
}

export default function GunlukProgramPage() {
  const { profile, setError: setGlobalError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [tasks, setTasks] = useState([]);
  const [dersler, setDersler] = useState([]);
  const [kaynaklar, setKaynaklar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const realtimeTables = useMemo(() => ['gunluk_gorevler', 'kaynaklarim'], []);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    const [taskResult, courseResult, resourceResult] = await Promise.all([
      supabase.from('gunluk_gorevler').select('*, dersler(ad, renk, ikon, sinav_turu)').eq('user_id', profile.id).eq('tarih', selectedDate).order('baslangic_saat'),
      supabase.from('dersler').select('*').contains('alan', [profile.alan_secimi]).order('sira'),
      supabase.from('kaynaklarim').select('*, kaynaklar_sistem(ad, yayin)').eq('user_id', profile.id),
    ]);
    const firstError = taskResult.error || courseResult.error || resourceResult.error;
    if (firstError) setError(firstError.message);
    setTasks(taskResult.data || []);
    setDersler(courseResult.data || []);
    setKaynaklar(resourceResult.data || []);
    setLoading(false);
  }, [profile, selectedDate, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);
  useRealtimeRefresh({ tables: realtimeTables, userId: profile?.id, onChange: loadData });

  const visibleTasks = tasks;
  const completedCount = visibleTasks.filter((task) => task.tamamlandi).length;
  const totalMinutes = visibleTasks.reduce((sum, task) => sum + taskDuration(task), 0);
  const progress = visibleTasks.length ? Math.round(completedCount / visibleTasks.length * 100) : 0;

  const weekDates = useMemo(() => {
    const selected = parseLocalDate(selectedDate);
    const day = selected.getDay();
    const monday = new Date(selected);
    monday.setDate(selected.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, [selectedDate]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setForm({
      baslangic_saat: formatTime(task.baslangic_saat) || '08:00', bitis_saat: formatTime(task.bitis_saat) || '08:40',
      ders_id: task.ders_id || '', kaynak_id: task.kaynak_id || '', konu: task.konu || '',
      soru_sayisi: task.soru_sayisi?.toString() || '', sayfa_araligi: task.sayfa_araligi || '',
    });
    setModalOpen(true);
  };

  const saveTask = async (event) => {
    event.preventDefault();
    if (!form.ders_id) return setGlobalError('Görev eklemek için bir ders seçmelisin.');
    setSaving(true);
    const payload = {
      user_id: profile.id, tarih: selectedDate, baslangic_saat: form.baslangic_saat, bitis_saat: form.bitis_saat,
      ders_id: form.ders_id || null, kaynak_id: form.kaynak_id || null, konu: form.konu.trim() || null,
      soru_sayisi: form.soru_sayisi ? Number(form.soru_sayisi) : null, sayfa_araligi: form.sayfa_araligi.trim() || null,
    };
    const { error: saveError } = editing
      ? await supabase.from('gunluk_gorevler').update(payload).eq('id', editing.id).eq('user_id', profile.id)
      : await supabase.from('gunluk_gorevler').insert(payload);
    setSaving(false);
    if (saveError) {
      setGlobalError(`Görev kaydedilemedi: ${saveError.message}`);
      return;
    }
    setModalOpen(false);
    await loadData();
  };

  const toggleTask = async (task) => {
    const nextValue = !task.tamamlandi;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, tamamlandi: nextValue } : item));
    const { error: updateError } = await supabase.from('gunluk_gorevler').update({ tamamlandi: nextValue }).eq('id', task.id).eq('user_id', profile.id);
    if (updateError) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, tamamlandi: task.tamamlandi } : item));
      setGlobalError(`Görev güncellenemedi: ${updateError.message}`);
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm('Bu görevi silmek istediğine emin misin?')) return;
    const previous = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    const { error: deleteError } = await supabase.from('gunluk_gorevler').delete().eq('id', task.id).eq('user_id', profile.id);
    if (deleteError) {
      setTasks(previous);
      setGlobalError(`Görev silinemedi: ${deleteError.message}`);
    }
  };

  const shiftDay = (offset) => {
    const date = parseLocalDate(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(toLocalDateKey(date));
  };

  return (
    <div className="page daily-program-page">
      <PageHeader title="Günlük Program" description="Günün çalışma akışını planla, tamamladıkça ilerlemeni anında gör." actions={<button className="study-button study-button-primary" onClick={openCreate}><Plus size={17} /> Görev ekle</button>} />

      <div className="daily-toolbar">
        <div className="daily-date-control">
          <button className="icon-button" onClick={() => shiftDay(-1)} aria-label="Önceki gün"><ChevronLeft size={19} /></button>
          <strong>{formatDate(selectedDate)}</strong>
          {selectedDate === todayStr() && <span>Bugün</span>}
          <button className="icon-button" onClick={() => shiftDay(1)} aria-label="Sonraki gün"><ChevronRight size={19} /></button>
        </div>
      </div>

      <div className="week-rail" aria-label="Haftanın günleri">
        {weekDates.map((date) => {
          const key = toLocalDateKey(date);
          return <button key={key} className={selectedDate === key ? 'is-selected' : ''} onClick={() => setSelectedDate(key)}><span>{date.toLocaleDateString('tr-TR', { weekday: 'short' })}</span><strong>{date.getDate()}</strong></button>;
        })}
      </div>

      <div className="study-summary-grid">
        <div className="study-summary-item"><span className="summary-icon"><CheckCircle2 size={20} /></span><span className="summary-copy"><span>Günlük ilerleme</span><strong>%{progress}</strong></span></div>
        <div className="study-summary-item"><span className="summary-icon"><Clock3 size={20} /></span><span className="summary-copy"><span>Planlanan çalışma</span><strong>{formatDuration(totalMinutes)}</strong></span></div>
        <div className="study-summary-item"><span className="summary-icon"><ListChecks size={20} /></span><span className="summary-copy"><span>Tamamlanan görev</span><strong>{completedCount} / {visibleTasks.length}</strong></span></div>
      </div>

      <DataState loading={loading} error={error} empty={!visibleTasks.length} emptyTitle="Henüz görev eklenmedi" emptyText="Bu gün için ilk çalışma görevini ekleyebilirsin.">
        <section className="daily-timeline" aria-label="Günlük görevler">
          {visibleTasks.map((task) => {
            const resource = kaynaklar.find((item) => item.id === task.kaynak_id);
            return (
              <article key={task.id} className={`daily-task ${task.tamamlandi ? 'is-complete' : ''}`}>
                <time>{formatTime(task.baslangic_saat)}</time>
                <button className="timeline-status" onClick={() => toggleTask(task)} aria-label={task.tamamlandi ? 'Görevi tekrar aç' : 'Görevi tamamla'}>{task.tamamlandi ? <Check size={16} /> : <Circle size={17} />}</button>
                <div className="daily-task-body">
                  <div className="daily-task-title-row"><div><span>{task.dersler?.ad || 'Genel çalışma'}</span><strong>{task.konu || 'Konu belirtilmedi'}</strong></div><em>{formatDuration(taskDuration(task))}</em></div>
                  <p>{resource?.kaynaklar_sistem?.ad || resource?.custom_ad || 'Kaynak seçilmedi'}{task.sayfa_araligi ? ` · Sayfa ${task.sayfa_araligi}` : ''}{task.soru_sayisi ? ` · ${task.soru_sayisi} soru` : ''}</p>
                </div>
                <div className="daily-task-actions">
                  <button className="study-button task-complete-button" onClick={() => toggleTask(task)}>{task.tamamlandi ? <><Check size={15} /> Tamamlandı</> : 'Tamamla'}</button>
                  <button className="icon-button" onClick={() => openEdit(task)} aria-label="Görevi düzenle"><Edit3 size={17} /></button>
                  <button className="icon-button danger-icon" onClick={() => deleteTask(task)} aria-label="Görevi sil"><Trash2 size={17} /></button>
                </div>
              </article>
            );
          })}
        </section>
      </DataState>

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? 'Görevi düzenle' : 'Yeni görev'} description={formatDate(selectedDate)}>
        <form className="study-form" onSubmit={saveTask}>
          <div className="form-grid-2">
            <label>Başlangıç<input type="time" value={form.baslangic_saat} onChange={(event) => setForm({ ...form, baslangic_saat: event.target.value })} required /></label>
            <label>Bitiş<input type="time" value={form.bitis_saat} min={form.baslangic_saat} onChange={(event) => setForm({ ...form, bitis_saat: event.target.value })} required /></label>
          </div>
          <label>Ders<Select ariaLabel="Ders" value={form.ders_id} onChange={(value) => setForm({ ...form, ders_id: value })} placeholder="Ders seç" options={dersler.map((course) => ({ value: course.id, label: `${course.ad}${course.sinav_turu ? ` (${course.sinav_turu})` : ''}` }))} /></label>
          <label>Konu<input value={form.konu} onChange={(event) => setForm({ ...form, konu: event.target.value })} placeholder="Örn. Bölme ve bölünebilme" /></label>
          <label>Kaynak<Select ariaLabel="Kaynak" value={form.kaynak_id} onChange={(value) => setForm({ ...form, kaynak_id: value })} placeholder="Kaynak seç (isteğe bağlı)" options={[{ value: '', label: 'Kaynak seçilmesin' }, ...kaynaklar.map((resource) => ({ value: resource.id, label: resource.kaynaklar_sistem?.ad || resource.custom_ad }))]} /></label>
          <div className="form-grid-2">
            <label>Soru sayısı<input type="number" min="0" value={form.soru_sayisi} onChange={(event) => setForm({ ...form, soru_sayisi: event.target.value })} placeholder="40" /></label>
            <label>Sayfa aralığı<input value={form.sayfa_araligi} onChange={(event) => setForm({ ...form, sayfa_araligi: event.target.value })} placeholder="45–60" /></label>
          </div>
          <div className="form-actions"><button type="button" className="study-button" onClick={() => setModalOpen(false)} disabled={saving}>İptal</button><button className="study-button study-button-primary" disabled={saving}>{saving ? 'Kaydediliyor…' : editing ? 'Değişiklikleri kaydet' : 'Görevi ekle'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
