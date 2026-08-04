'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Pause, Play, RotateCcw, TimerReset } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { todayStr } from '@/lib/utils/date';
import PageHeader from '@/components/ui/PageHeader';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import Select from '@/components/ui/Select';

const PRESETS = [
  { label: '25 / 5', work: 25, breakMinutes: 5 },
  { label: '50 / 10', work: 50, breakMinutes: 10 },
  { label: '90 / 20', work: 90, breakMinutes: 20 },
];
const REALTIME_TABLES = ['calisma_suresi'];

export default function PomodoroPage() {
  const { profile, setError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const intervalRef = useRef(null);
  const finishedRef = useRef(false);
  const [presetIndex, setPresetIndex] = useState(0);
  const [custom, setCustom] = useState({ work: 25, breakMinutes: 5 });
  const [customActive, setCustomActive] = useState(false);
  const [running, setRunning] = useState(false);
  const [breakMode, setBreakMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PRESETS[0].work * 60);
  const [courses, setCourses] = useState([]);
  const [resources, setResources] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [todaySessions, setTodaySessions] = useState([]);

  const preset = customActive ? custom : PRESETS[presetIndex];
  const totalSeconds = (breakMode ? preset.breakMinutes : preset.work) * 60;
  const elapsed = Math.max(0, totalSeconds - timeLeft);
  const chartData = [{ name: 'Tamamlanan', value: elapsed }, { name: 'Kalan', value: Math.max(0, timeLeft) }];

  const loadContext = useCallback(async () => {
    if (!profile?.id) return;
    const [courseResult, resourceResult, sessionResult] = await Promise.all([
      supabase.from('dersler').select('*').contains('alan', [profile.alan_secimi]).order('sira'),
      supabase.from('kaynaklarim').select('*, kaynaklar_sistem(ad)').eq('user_id', profile.id),
      supabase.from('calisma_suresi').select('*, dersler(ad)').eq('user_id', profile.id).eq('tarih', todayStr()).order('created_at', { ascending: false }),
    ]);
    const loadError = courseResult.error || resourceResult.error || sessionResult.error;
    if (loadError) setError(`Pomodoro verileri yüklenemedi: ${loadError.message}`);
    setCourses(courseResult.data || []);
    setResources(resourceResult.data || []);
    setTodaySessions(sessionResult.data || []);
  }, [profile, setError, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadContext, 0);
    return () => clearTimeout(timer);
  }, [loadContext]);
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: loadContext });

  const recordFocusSession = useCallback(async () => {
    if (!profile?.id) return;
    const basePayload = { user_id: profile.id, ders_id: courseId || null, tarih: todayStr(), sure_dakika: preset.work, soru_sayisi: 0 };
    let result = await supabase.from('calisma_suresi').insert({ ...basePayload, kaynak_id: resourceId || null });
    if (result.error?.message?.toLowerCase().includes('kaynak_id')) result = await supabase.from('calisma_suresi').insert(basePayload);
    if (result.error) setError(`Oturum istatistiklere kaydedilemedi: ${result.error.message}`);
  }, [courseId, preset.work, profile, resourceId, setError, supabase]);

  const notifyPomodoroStage = useCallback(async (completedBreak) => {
    if (profile?.notifications_enabled === false || profile?.study_preferences?.pomodoro === false) return;
    const title = completedBreak ? 'Mola bitti' : 'Odak oturumu tamamlandı';
    const body = completedBreak
      ? 'Hazırsan yeni odak oturumuna başlayabilirsin.'
      : `${preset.work} dakikalık çalışma istatistiklerine kaydedildi.`;
    const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${completedBreak ? 'break' : 'focus'}`;
    const { error } = await supabase.from('notifications').insert({
      user_id: profile.id,
      kind: 'reminder',
      title,
      body,
      action_url: '/dashboard/pomodoro',
      dedupe_key: `pomodoro-${uniqueId}`,
    });
    if (error) setError('Pomodoro bildirimi oluşturulamadı.');
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, tag: uniqueId });
    }
  }, [preset.work, profile, setError, supabase]);

  const finishStage = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setRunning(false);
    if (!breakMode) {
      recordFocusSession();
      notifyPomodoroStage(false);
      setBreakMode(true);
      setTimeLeft(preset.breakMinutes * 60);
    } else {
      notifyPomodoroStage(true);
      setBreakMode(false);
      setTimeLeft(preset.work * 60);
    }
  }, [breakMode, notifyPomodoroStage, preset.breakMinutes, preset.work, recordFocusSession]);

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return undefined;
    }
    finishedRef.current = false;
    intervalRef.current = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setTimeout(finishStage, 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [finishStage, running]);

  const applyPreset = (index) => {
    setPresetIndex(index);
    setCustomActive(false);
    setBreakMode(false);
    setRunning(false);
    setTimeLeft(PRESETS[index].work * 60);
  };

  const applyCustom = () => {
    const safeWork = Math.min(180, Math.max(1, Number(custom.work) || 25));
    const safeBreak = Math.min(60, Math.max(1, Number(custom.breakMinutes) || 5));
    setCustom({ work: safeWork, breakMinutes: safeBreak });
    setCustomActive(true);
    setBreakMode(false);
    setRunning(false);
    setTimeLeft(safeWork * 60);
  };

  const reset = () => {
    setRunning(false);
    setBreakMode(false);
    setTimeLeft(preset.work * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const completedMinutes = todaySessions.reduce((sum, session) => sum + (session.sure_dakika || 0), 0);

  return (
    <div className="page pomodoro-page">
      <PageHeader title="Pomodoro" description="Odaklan, molanı ver, ritmini koru. Tamamlanan odak oturumları istatistiklerine kaydedilir." />
      <div className="pomodoro-context">
        <label>Konu / ders <Select ariaLabel="Konu / ders" value={courseId} onChange={setCourseId} placeholder="Ders seç (isteğe bağlı)" options={[{ value: '', label: 'Ders seçilmesin' }, ...courses.map((course) => ({ value: course.id, label: course.ad, description: course.sinav_turu }))]} /></label>
        <label>Kaynak <Select ariaLabel="Kaynak" value={resourceId} onChange={setResourceId} placeholder="Kaynak seç (isteğe bağlı)" options={[{ value: '', label: 'Kaynak seçilmesin' }, ...resources.map((resource) => ({ value: resource.id, label: resource.kaynaklar_sistem?.ad || resource.custom_ad }))]} /></label>
      </div>

      <div className="pomodoro-workspace">
        <aside className="pomodoro-presets study-panel">
          <h2>Hazır Süreler</h2>
          {PRESETS.map((item, index) => <button key={item.label} className={!customActive && presetIndex === index ? 'is-active' : ''} onClick={() => applyPreset(index)}><strong>{item.label}</strong><span>Odak / Mola</span>{!customActive && presetIndex === index && <CheckCircle2 size={18} />}</button>)}
          <div className="custom-divider"><span>veya</span></div>
          <h2>Özel Süre</h2>
          <label>Odak süresi (dk)<input type="number" min="1" max="180" value={custom.work} onChange={(event) => setCustom({ ...custom, work: event.target.value })} /></label>
          <label>Mola süresi (dk)<input type="number" min="1" max="60" value={custom.breakMinutes} onChange={(event) => setCustom({ ...custom, breakMinutes: event.target.value })} /></label>
          <button className="study-button" onClick={applyCustom}>Özel süreyi uygula</button>
        </aside>

        <section className="pomodoro-timer" aria-live="polite">
          <div className="timer-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={chartData} dataKey="value" startAngle={90} endAngle={-270} innerRadius="88%" outerRadius="98%" stroke="none" isAnimationActive={false}>{chartData.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? '#00a870' : '#dceee8'} />)}</Pie></PieChart>
            </ResponsiveContainer>
            <div className="timer-copy"><span>{breakMode ? 'Mola' : 'Odak'}</span><strong>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</strong><p>{breakMode ? `${preset.breakMinutes} dk mola` : `${preset.work} dk odaklan`}</p></div>
          </div>
          <div className="timer-controls">
            <button className="study-button" onClick={reset}><RotateCcw size={18} /> Sıfırla</button>
            <button className="study-button study-button-primary" onClick={() => setRunning((value) => !value)}>{running ? <><Pause size={18} /> Duraklat</> : <><Play size={18} /> {timeLeft < totalSeconds ? 'Devam et' : 'Başla'}</>}</button>
          </div>
          <p className="focus-note"><span /> Odaklanma modundasın. Dikkatini dağıtan bildirimleri kapatmanı öneririz.</p>
        </section>
      </div>

      <section className="today-sessions study-panel">
        <div><h2>Bugünkü oturumlar</h2><p>Tamamlanan odak oturumların istatistiklerine kaydedilir.</p></div>
        <span className="summary-icon"><TimerReset size={20} /></span>
        <strong>{todaySessions.length}</strong><span>tamamlanan oturum</span>
        <strong>{completedMinutes} dk</strong><span>toplam odak süresi</span>
      </section>
    </div>
  );
}
