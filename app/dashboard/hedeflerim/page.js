'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock3, Edit3, Flag, ImagePlus, ListChecks, Target, Trash2 } from 'lucide-react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';
import { getCurrentWeekDates, toLocalDateKey } from '@/lib/utils/date';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import PageHeader from '@/components/ui/PageHeader';
import DataState from '@/components/ui/DataState';
import Modal from '@/components/ui/Modal';
import { createStudyImageUrls, uploadStudyImage } from '@/lib/supabase/storage';

const DEFAULT_GOALS = { nets: { TYT: 0, AYT: 0, YDT: 0 }, weeklyQuestions: 0, weeklyMinutes: 0, topics: { TYT: 0, AYT: 0, YDT: 0 }, university: '', program: '', goalImagePath: '' };
const REALTIME_TABLES = ['denemeler', 'gunluk_gorevler', 'calisma_suresi', 'konu_takibi'];

function ProgressRow({ icon: Icon, title, description, current, target, unit }) {
  const percent = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
  return (
    <article className="goal-row">
      <span className="summary-icon"><Icon size={20} /></span>
      <div className="goal-copy"><strong>{title}</strong><span>{description}</span></div>
      <div className="goal-progress"><div><span>Güncel</span><strong>{current} {unit}</strong></div><div><span>Hedef</span><strong>{target || '—'} {target ? unit : ''}</strong></div><div className="goal-bar"><i style={{ width: `${percent}%` }} /></div><small>%{percent}</small></div>
    </article>
  );
}

export default function HedeflerimPage() {
  const { profile, setProfile, setError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const examTabs = useMemo(() => profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'], [profile]);
  const [activeExam, setActiveExam] = useState('TYT');
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [form, setForm] = useState(DEFAULT_GOALS);
  const [actual, setActual] = useState({ net: 0, questions: 0, minutes: 0, topics: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [goalImageUrl, setGoalImageUrl] = useState('');
  const [goalFile, setGoalFile] = useState(null);
  const [removeGoalImage, setRemoveGoalImage] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const week = getCurrentWeekDates();
    const start = toLocalDateKey(week[0]);
    const end = toLocalDateKey(week[6]);
    const [examsResult, taskResult, studyResult, topicResult] = await Promise.all([
      supabase.from('denemeler').select('sinav_turu, tarih, deneme_detaylari(net,dogru,yanlis)').eq('user_id', profile.id),
      supabase.from('gunluk_gorevler').select('soru_sayisi,tamamlandi,tarih').eq('user_id', profile.id).gte('tarih', start).lte('tarih', end),
      supabase.from('calisma_suresi').select('sure_dakika,soru_sayisi,tarih').eq('user_id', profile.id).gte('tarih', start).lte('tarih', end),
      supabase.from('konu_takibi').select('durum, konular!inner(dersler!inner(sinav_turu))').eq('user_id', profile.id).eq('durum', 'tamamlandi'),
    ]);
    const firstError = examsResult.error || taskResult.error || studyResult.error || topicResult.error;
    if (firstError) setError('Hedef verilerinin bir bölümü yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.');

    const saved = { ...DEFAULT_GOALS, ...(profile.study_goals || {}) };
    saved.nets = { ...DEFAULT_GOALS.nets, ...(saved.nets || {}) };
    saved.topics = { ...DEFAULT_GOALS.topics, ...(saved.topics || {}) };
    setGoals(saved);
    setForm(saved);
    setUpdatedAt(profile.study_goals_updated_at || '');
    const imageMap = await createStudyImageUrls(supabase, [saved.goalImagePath]);
    setGoalImageUrl(imageMap[saved.goalImagePath] || '');

    const exams = (examsResult.data || []).filter((exam) => exam.sinav_turu === activeExam);
    const netValues = exams.map((exam) => (exam.deneme_detaylari || []).reduce((sum, detail) => sum + Number(detail.net ?? ((detail.dogru || 0) - (detail.yanlis || 0) / 4)), 0));
    const taskQuestions = (taskResult.data || []).filter((task) => task.tamamlandi).reduce((sum, task) => sum + (task.soru_sayisi || 0), 0);
    const studyQuestions = (studyResult.data || []).reduce((sum, session) => sum + (session.soru_sayisi || 0), 0);
    const topicCount = (topicResult.data || []).filter((row) => row.konular?.dersler?.sinav_turu === activeExam).length;
    setActual({
      net: netValues.length ? Number((netValues.reduce((sum, value) => sum + value, 0) / netValues.length).toFixed(1)) : 0,
      questions: Math.max(taskQuestions, studyQuestions),
      minutes: (studyResult.data || []).reduce((sum, session) => sum + (session.sure_dakika || 0), 0),
      topics: topicCount,
    });
    setLoading(false);
  }, [activeExam, profile, setError, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadGoals, 0);
    return () => clearTimeout(timer);
  }, [loadGoals]);
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: loadGoals });

  const saveGoals = async (event) => {
    event.preventDefault();
    const numericValues = [
      ...Object.values(form.nets),
      ...Object.values(form.topics),
      form.weeklyQuestions,
      form.weeklyMinutes,
    ].map(Number);
    if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
      setError('Hedefler sıfır veya pozitif bir sayı olmalıdır.');
      return;
    }
    if (Object.values(form.topics).some((value) => !Number.isInteger(Number(value)))
      || !Number.isInteger(Number(form.weeklyQuestions))
      || !Number.isInteger(Number(form.weeklyMinutes))) {
      setError('Konu, soru ve dakika hedefleri tam sayı olmalıdır.');
      return;
    }
    setSaving(true);
    let uploadedPath = '';
    try {
      if (goalFile) uploadedPath = await uploadStudyImage(supabase, profile.id, goalFile, 'goal-backgrounds');
    } catch (uploadError) {
      setSaving(false);
      setError(`Hedef görseli yüklenemedi: ${uploadError.message}`);
      return;
    }
    const normalized = {
      ...form,
      nets: Object.fromEntries(Object.entries(form.nets).map(([key, value]) => [key, Number(value) || 0])),
      topics: Object.fromEntries(Object.entries(form.topics).map(([key, value]) => [key, Number(value) || 0])),
      weeklyQuestions: Number(form.weeklyQuestions) || 0,
      weeklyMinutes: Number(form.weeklyMinutes) || 0,
      university: String(form.university || '').trim().slice(0, 120),
      program: String(form.program || '').trim().slice(0, 120),
      goalImagePath: removeGoalImage ? '' : uploadedPath || form.goalImagePath || '',
    };
    const response = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'goals', goals: normalized }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !result.ok) {
      if (uploadedPath) await supabase.storage.from('study-assets').remove([uploadedPath]);
      setError(result.message || 'Hedeflerin kaydedilemedi. Lütfen tekrar deneyin.');
      return;
    }
    const previousPath = goals.goalImagePath;
    if (previousPath && previousPath !== normalized.goalImagePath) {
      await supabase.storage.from('study-assets').remove([previousPath]);
    }
    const imageMap = await createStudyImageUrls(supabase, [normalized.goalImagePath]);
    setGoalImageUrl(imageMap[normalized.goalImagePath] || '');
    setGoalFile(null);
    setRemoveGoalImage(false);
    setGoals(result.goals || normalized);
    setUpdatedAt(result.updatedAt);
    setProfile((current) => ({
      ...current,
      study_goals: result.goals || normalized,
      study_goals_updated_at: result.updatedAt,
    }));
    setEditing(false);
  };

  return (
    <div className="page goals-page">
      <PageHeader title="Hedeflerim" description="Çalışma hedeflerini belirle; gerçek verilerinle ilerlemeni karşılaştır." actions={<button className="study-button" onClick={() => { setForm(goals); setGoalFile(null); setRemoveGoalImage(false); setEditing(true); }}><Edit3 size={16} /> Hedefleri düzenle</button>} />
      <section className={`goal-vision ${goalImageUrl ? 'has-image' : ''}`} style={goalImageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(5,24,19,.88), rgba(5,24,19,.36)), url(${goalImageUrl})` } : undefined}>
        <div><span>Yol haritan</span><h2>{goals.program || 'Hedef bölümünü belirle'}</h2><p>{goals.university || 'Üniversite hedefini eklediğinde burada her gün göreceksin.'}</p></div>
        <button onClick={() => { setForm(goals); setGoalFile(null); setRemoveGoalImage(false); setEditing(true); }}><Flag size={18} /> {goals.university || goals.program ? 'Hedefi güncelle' : 'Hedef ekle'}</button>
      </section>
      <div className="goals-toolbar"><div className="study-segments">{examTabs.map((exam) => <button key={exam} onClick={() => setActiveExam(exam)} className={activeExam === exam ? 'is-active' : ''}>{exam}</button>)}</div>{updatedAt && <span>Son güncelleme: {new Date(updatedAt).toLocaleString('tr-TR')}</span>}</div>

      <DataState loading={loading}>
        <section className="goals-list study-panel">
          <ProgressRow icon={Target} title="Net Hedefi" description={`${activeExam} denemelerindeki ortalama netin.`} current={actual.net} target={goals.nets[activeExam]} unit="net" />
          <ProgressRow icon={ListChecks} title="Haftalık Soru Hedefi" description="Bu hafta tamamladığın görev ve çalışma kayıtları." current={actual.questions} target={goals.weeklyQuestions} unit="soru" />
          <ProgressRow icon={Clock3} title="Haftalık Çalışma Süresi" description="Pomodoro ve çalışma kayıtlarından hesaplanır." current={actual.minutes} target={goals.weeklyMinutes} unit="dk" />
          <ProgressRow icon={BookOpen} title="Konu Tamamlama Hedefi" description={`${activeExam} için tamamladığın konu sayısı.`} current={actual.topics} target={goals.topics[activeExam]} unit="konu" />
        </section>
      </DataState>

      <section className="personal-goal-section">
        <div><h2>Kişisel Hedefim <span>İsteğe bağlı</span></h2><p>Bu alan yalnızca senin yazdığın motivasyon hedefidir; sıralama veya öneri verisi değildir.</p></div>
        {goals.university || goals.program ? <div className="personal-goal-card"><Flag size={22} /><div><strong>{goals.program || 'Bölüm belirtilmedi'}</strong><span>{goals.university || 'Üniversite belirtilmedi'}</span></div></div> : <button className="empty-personal-goal" onClick={() => setEditing(true)}><Flag size={22} /><strong>Henüz kişisel hedef eklemedin</strong><span>Üniversite ve bölüm hedefini ekleyebilirsin.</span></button>}
      </section>

      <Modal open={editing} onClose={() => !saving && setEditing(false)} title="Hedefleri düzenle" description="İlerlemen gerçek kayıtlarından otomatik güncellenecektir." size="lg">
        <form className="study-form goal-form" onSubmit={saveGoals}>
          <div className="form-grid-2"><label>{activeExam} net hedefi<input type="number" min="0" step="0.25" value={form.nets[activeExam]} onChange={(event) => setForm({ ...form, nets: { ...form.nets, [activeExam]: event.target.value } })} /></label><label>{activeExam} konu hedefi<input type="number" min="0" value={form.topics[activeExam]} onChange={(event) => setForm({ ...form, topics: { ...form.topics, [activeExam]: event.target.value } })} /></label></div>
          <div className="form-grid-2"><label>Haftalık soru hedefi<input type="number" min="0" value={form.weeklyQuestions} onChange={(event) => setForm({ ...form, weeklyQuestions: event.target.value })} /></label><label>Haftalık çalışma hedefi (dk)<input type="number" min="0" value={form.weeklyMinutes} onChange={(event) => setForm({ ...form, weeklyMinutes: event.target.value })} /></label></div>
          <div className="form-grid-2"><label>Hedef üniversite<input value={form.university} onChange={(event) => setForm({ ...form, university: event.target.value })} placeholder="İsteğe bağlı" /></label><label>Hedef bölüm<input value={form.program} onChange={(event) => setForm({ ...form, program: event.target.value })} placeholder="İsteğe bağlı" /></label></div>
          <label className="goal-image-field"><span><ImagePlus size={16} /> Üniversite görseli <small>JPG, PNG veya WebP · en fazla 6 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setGoalFile(event.target.files?.[0] || null); setRemoveGoalImage(false); }} /></label>
          {(form.goalImagePath || goalFile) && !removeGoalImage && <div className="goal-image-selection"><span>{goalFile?.name || 'Kayıtlı üniversite görseli'}</span><button type="button" onClick={() => { setGoalFile(null); setRemoveGoalImage(true); }}><Trash2 size={14} /> Görseli kaldır</button></div>}
          <div className="form-actions"><button type="button" className="study-button" onClick={() => setEditing(false)}>İptal</button><button className="study-button study-button-primary" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
        </form>
      </Modal>
      <style jsx>{`
        .goal-vision { min-height: 190px; margin-bottom: 18px; padding: 28px; border: 1px solid #cfe5dc; border-radius: 16px; background: linear-gradient(135deg, #eaf8f2, #f7fbf9); background-position: center; background-size: cover; color: var(--study-ink); display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; overflow: hidden; }
        .goal-vision.has-image { color: #fff; border-color: transparent; box-shadow: 0 18px 40px rgba(5,24,19,.14); }
        .goal-vision > div { max-width: 620px; display: grid; gap: 5px; }
        .goal-vision span { color: var(--study-green-dark); font-size: .68rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .goal-vision.has-image span { color: #a8f1d3; }
        .goal-vision h2 { margin: 0; font-size: clamp(1.35rem, 3vw, 2.2rem); letter-spacing: -.03em; }
        .goal-vision p { margin: 0; opacity: .82; font-size: .78rem; }
        .goal-vision button { min-height: 40px; padding: 0 14px; border: 1px solid rgba(255,255,255,.45); border-radius: 10px; background: rgba(255,255,255,.92); color: #086d4f; display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: .7rem; font-weight: 800; cursor: pointer; }
        .goal-image-field > span { display: flex; align-items: center; gap: 6px; }
        .goal-image-field small { margin-left: auto; color: var(--study-muted); font-weight: 500; }
        .goal-image-selection { padding: 10px 12px; border: 1px solid var(--study-border); border-radius: 9px; background: #f7faf8; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: .68rem; }
        .goal-image-selection button { border: 0; background: transparent; color: #b42318; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
        @media (max-width: 680px) { .goal-vision { min-height: 220px; padding: 22px; align-items: flex-start; flex-direction: column; justify-content: flex-end; } .goal-vision button { width: 100%; justify-content: center; } }
      `}</style>
    </div>
  );
}
