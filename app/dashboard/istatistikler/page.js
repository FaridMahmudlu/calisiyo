'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, BookOpenCheck, CalendarCheck2,
  CheckCircle2, Clock3, Download, Flame, Goal, Minus, Sparkles, Target, TrendingUp,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatDuration, parseLocalDate, todayStr, toLocalDateKey } from '@/lib/utils/date';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import PageHeader from '@/components/ui/PageHeader';
import DataState from '@/components/ui/DataState';
import PremiumFeaturePrompt from '@/components/billing/PremiumFeaturePrompt';

const REALTIME_TABLES = ['calisma_suresi', 'gunluk_gorevler', 'denemeler', 'konu_takibi', 'yapamadiklari'];
const COLORS = ['#00a870', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef6c57', '#14b8a6'];

function examNet(exam) {
  return Number((exam.deneme_detaylari || []).reduce((sum, detail) => sum + Number(detail.net ?? ((detail.dogru || 0) - (detail.yanlis || 0) / 4)), 0).toFixed(2));
}

function currentStreak(dates) {
  const active = new Set(dates);
  const cursor = parseLocalDate(todayStr());
  if (!active.has(toLocalDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (active.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function Delta({ value, suffix = '' }) {
  if (!value) return <span className="metric-delta is-neutral"><Minus size={13} /> Değişim yok</span>;
  const positive = value > 0;
  return <span className={`metric-delta ${positive ? 'is-positive' : 'is-negative'}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{positive ? '+' : ''}{value}{suffix}</span>;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="stats-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.dataKey} style={{ color: item.color }}>{item.name}: {item.dataKey === 'minutes' ? formatDuration(item.value) : item.value}</span>)}</div>;
}

export default function IstatistiklerPage() {
  const { profile, currentPlan, stats: accountStats } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [range, setRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [records, setRecords] = useState({ sessions: [], tasks: [], exams: [], topics: [], questions: [] });
  const [premiumPrompt, setPremiumPrompt] = useState(null);

  const loadStats = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    const start = parseLocalDate(todayStr());
    const historyDays = Math.max(7, Number(currentPlan?.entitlements?.stats_history_days || 30));
    if (range === 'week') start.setDate(start.getDate() - 6);
    if (range === 'month') start.setDate(start.getDate() - 29);
    if (range === 'all') start.setDate(start.getDate() - (historyDays - 1));
    const startKey = toLocalDateKey(start);

    let sessionQuery = supabase.from('calisma_suresi').select('id,tarih,sure_dakika,soru_sayisi,created_at,dersler(ad,renk,sinav_turu)').eq('user_id', profile.id).order('tarih');
    let taskQuery = supabase.from('gunluk_gorevler').select('id,tarih,baslangic_saat,bitis_saat,tamamlandi,soru_sayisi,dersler(ad,renk,sinav_turu)').eq('user_id', profile.id).order('tarih');
    let examQuery = supabase.from('denemeler').select('id,tarih,yayin,sinav_turu,sure_dakika,deneme_detaylari(net,dogru,yanlis,bos,dersler(ad))').eq('user_id', profile.id).order('tarih');
    if (range !== 'all' || historyDays < 36500) {
      sessionQuery = sessionQuery.gte('tarih', startKey);
      taskQuery = taskQuery.gte('tarih', startKey);
      examQuery = examQuery.gte('tarih', startKey);
    }
    const [sessions, tasks, exams, topics, questions] = await Promise.all([
      sessionQuery,
      taskQuery,
      examQuery,
      supabase.from('konu_takibi').select('durum,updated_at,konular(ad,dersler(ad,renk,sinav_turu))').eq('user_id', profile.id).gte('updated_at', `${startKey}T00:00:00`),
      supabase.from('yapamadiklari').select('cozuldu,created_at').eq('user_id', profile.id).gte('created_at', `${startKey}T00:00:00`),
    ]);
    const firstError = sessions.error || tasks.error || exams.error || topics.error || questions.error;
    if (firstError) setError('İstatistiklerin yüklenemedi. Lütfen sayfayı yenileyip tekrar dene.');
    setRecords({ sessions: sessions.data || [], tasks: tasks.data || [], exams: exams.data || [], topics: topics.data || [], questions: questions.data || [] });
    setLoading(false);
  }, [currentPlan?.entitlements?.stats_history_days, profile, range, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadStats, 0);
    return () => clearTimeout(timer);
  }, [loadStats]);
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: loadStats });

  const stats = useMemo(() => {
    const completedTasks = records.tasks.filter((task) => task.tamamlandi);
    const activeDates = [...new Set([...records.sessions.map((item) => item.tarih), ...completedTasks.map((item) => item.tarih)])].sort();
    const totalMinutes = records.sessions.reduce((sum, item) => sum + (item.sure_dakika || 0), 0);
    const sessionQuestions = records.sessions.reduce((sum, item) => sum + (item.soru_sayisi || 0), 0);
    const taskQuestions = completedTasks.reduce((sum, item) => sum + (item.soru_sayisi || 0), 0);
    // Study sessions and completed tasks can describe the same work. Until
    // records carry a shared source id, use the larger total to avoid counting
    // one solved question set twice.
    const totalQuestions = Math.max(sessionQuestions, taskQuestions);
    const completionRate = records.tasks.length ? Math.round(completedTasks.length / records.tasks.length * 100) : 0;
    const averageMinutes = activeDates.length ? Math.round(totalMinutes / activeDates.length) : 0;

    const timelineMap = {};
    for (const date of activeDates) timelineMap[date] = { key: date, date: new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }), minutes: 0, questions: 0, tasks: 0 };
    records.sessions.forEach((item) => {
      timelineMap[item.tarih] ||= { key: item.tarih, date: new Date(`${item.tarih}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }), minutes: 0, questions: 0, tasks: 0 };
      timelineMap[item.tarih].minutes += item.sure_dakika || 0;
      timelineMap[item.tarih].sessionQuestions = (timelineMap[item.tarih].sessionQuestions || 0) + (item.soru_sayisi || 0);
      timelineMap[item.tarih].questions = Math.max(timelineMap[item.tarih].questions, timelineMap[item.tarih].sessionQuestions);
    });
    completedTasks.forEach((item) => {
      timelineMap[item.tarih] ||= { key: item.tarih, date: new Date(`${item.tarih}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }), minutes: 0, questions: 0, tasks: 0 };
      timelineMap[item.tarih].tasks += 1;
      timelineMap[item.tarih].taskQuestions = (timelineMap[item.tarih].taskQuestions || 0) + (item.soru_sayisi || 0);
      timelineMap[item.tarih].questions = Math.max(
        timelineMap[item.tarih].sessionQuestions || 0,
        timelineMap[item.tarih].taskQuestions
      );
    });
    const timeline = Object.values(timelineMap).sort((a, b) => a.key.localeCompare(b.key));

    const courseMap = {};
    records.sessions.forEach((item) => {
      const name = item.dersler?.ad || 'Genel çalışma';
      courseMap[name] ||= { name, minutes: 0, questions: 0, color: item.dersler?.renk || COLORS[Object.keys(courseMap).length % COLORS.length] };
      courseMap[name].minutes += item.sure_dakika || 0;
      courseMap[name].questions += item.soru_sayisi || 0;
    });
    const courses = Object.values(courseMap).sort((a, b) => b.minutes - a.minutes);
    const exams = records.exams.map((exam) => ({ ...exam, net: examNet(exam), label: new Date(`${exam.tarih}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) }));
    const lastNet = exams.at(-1)?.net || 0;
    const netDelta = exams.length > 1 ? Number((lastNet - exams.at(-2).net).toFixed(1)) : 0;
    const topicCounts = records.topics.reduce((acc, item) => ({ ...acc, [item.durum]: (acc[item.durum] || 0) + 1 }), { baslanmadi: 0, devam_ediyor: 0, tamamlandi: 0 });
    const solvedQuestions = records.questions.filter((item) => item.cozuldu).length;
    const goalMinutes = Number(profile?.study_goals?.weeklyMinutes || 0);
    const goalQuestions = Number(profile?.study_goals?.weeklyQuestions || 0);
    const weeklyStart = parseLocalDate(todayStr());
    weeklyStart.setDate(weeklyStart.getDate() - 6);
    const weeklyStartKey = toLocalDateKey(weeklyStart);
    const weeklySessions = records.sessions.filter((item) => item.tarih >= weeklyStartKey);
    const weeklyTasks = completedTasks.filter((item) => item.tarih >= weeklyStartKey);
    const weeklyMinutes = weeklySessions.reduce((sum, item) => sum + (item.sure_dakika || 0), 0);
    const weeklySessionQuestions = weeklySessions.reduce((sum, item) => sum + (item.soru_sayisi || 0), 0);
    const weeklyTaskQuestions = weeklyTasks.reduce((sum, item) => sum + (item.soru_sayisi || 0), 0);
    const weeklyQuestions = Math.max(weeklySessionQuestions, weeklyTaskQuestions);
    const bestDay = timeline.reduce((best, item) => item.minutes > (best?.minutes || 0) ? item : best, null);
    return {
      activeDates, averageMinutes, bestDay, completionRate, completedTasks: completedTasks.length, courses,
      currentStreak: Number(accountStats?.streak ?? currentStreak(activeDates)),
      exams, goalMinutes, goalQuestions, lastNet, netDelta, solvedQuestions, timeline, topicCounts, totalMinutes, totalQuestions,
      unresolvedQuestions: Math.max(0, records.questions.length - solvedQuestions), weeklyMinutes, weeklyQuestions,
    };
  }, [accountStats?.streak, profile?.study_goals, records]);

  const hasData = records.sessions.length || records.tasks.length || records.exams.length || records.topics.length;
  const weeklyMinutesProgress = stats.goalMinutes ? Math.min(100, Math.round(stats.weeklyMinutes / stats.goalMinutes * 100)) : 0;
  const weeklyQuestionProgress = stats.goalQuestions ? Math.min(100, Math.round(stats.weeklyQuestions / stats.goalQuestions * 100)) : 0;
  const canExport = currentPlan?.entitlements?.progress_export === true;

  const exportProgress = () => {
    if (!canExport) {
      setPremiumPrompt({ feature: 'CSV ilerleme raporu', requiredPlan: 'calisiyo plus', description: 'Çalışma süresi, soru ve tamamlanan görev verilerini CSV olarak indirip kendi arşivinde kullanabilirsin.', benefits: ['İlerleme verilerini dışa aktar', 'Kendi analiz dosyanı oluştur', 'Sınırsız istatistik geçmişini koru'] });
      return;
    }
    const rows = [
      ['Tarih', 'Çalışma süresi (dk)', 'Soru', 'Tamamlanan görev'],
      ...stats.timeline.map((item) => [item.key, item.minutes, item.questions, item.tasks]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `calisiyo-ilerleme-${todayStr()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div className="page stats-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader title="İstatistikler" description="Çalışma, program, deneme ve konu kayıtlarından anlık olarak hesaplanan ilerleme görünümün." actions={<div className="stats-head-actions"><button className={`stats-export ${!canExport ? 'is-premium' : ''}`} onClick={exportProgress} title={!canExport ? 'CSV dışa aktarma calisiyo plus planında' : 'İlerleme verilerini indir'}><Download size={14} /> {canExport ? 'CSV indir' : 'Plus ile indir'}{!canExport && <span>Premium</span>}</button><span className="stats-live"><Activity size={14} /> Canlı veri</span></div>} />
      <div className="stats-toolbar">
        <div className="study-segments stats-range" aria-label="Tarih aralığı">
          <button className={range === 'week' ? 'is-active' : ''} onClick={() => setRange('week')}>7 Gün</button>
          <button className={range === 'month' ? 'is-active' : ''} onClick={() => setRange('month')}>30 Gün</button>
          <button className={`${range === 'all' ? 'is-active' : ''} ${Number(currentPlan?.entitlements?.stats_history_days || 30) <= 30 ? 'is-premium' : ''}`} onClick={() => Number(currentPlan?.entitlements?.stats_history_days || 30) <= 30 ? setPremiumPrompt({ feature: 'Tüm istatistik geçmişi', requiredPlan: 'calisiyo plus', description: 'calisiyo ücretsiz planında son 30 günü görürsün. Plus ile geçmiş kayıtlarının tamamını tek görünümde inceleyebilirsin.', benefits: ['30 günden eski kayıtları karşılaştır', 'Uzun dönem çalışma ritmini gör', 'Deneme ve süre trendlerini birlikte izle'] }) : setRange('all')} title={Number(currentPlan?.entitlements?.stats_history_days || 30) <= 30 ? 'Tüm geçmiş calisiyo plus planında' : undefined}>Tümü{Number(currentPlan?.entitlements?.stats_history_days || 30) <= 30 && <span>Premium</span>}</button>
        </div>
        <span>{stats.activeDates.length} aktif gün · {Number(currentPlan?.entitlements?.stats_history_days || 30) <= 30 ? 'calisiyo ücretsiz planında son 30 gün' : `${currentPlan?.name} geçmişi`} · Son kayıtlar otomatik yenilenir</span>
      </div>

      <DataState loading={loading} error={error} empty={!hasData} emptyTitle="Henüz analiz edilecek kayıt yok" emptyText="Programını tamamladıkça, Pomodoro kullandıkça ve deneme ekledikçe bu sayfa gerçek verilerinle dolacak.">
        <section className="stats-metrics" aria-label="Temel istatistikler">
          <article><span className="metric-icon is-green"><Clock3 size={19} /></span><div><small>Odak süresi</small><strong>{formatDuration(stats.totalMinutes)}</strong><span>Aktif gün ortalaması {formatDuration(stats.averageMinutes)}</span></div></article>
          <article><span className="metric-icon is-blue"><BookOpenCheck size={19} /></span><div><small>Çözülen soru</small><strong>{stats.totalQuestions.toLocaleString('tr-TR')}</strong><span>Tamamlanan çalışma kayıtları</span></div></article>
          <article><span className="metric-icon is-violet"><CheckCircle2 size={19} /></span><div><small>Program uyumu</small><strong>%{stats.completionRate}</strong><span>{stats.completedTasks} görev tamamlandı</span></div></article>
          <article><span className="metric-icon is-orange"><Flame size={19} /></span><div><small>Güncel seri</small><strong>{stats.currentStreak} gün</strong><span>{stats.activeDates.length} farklı çalışma günü</span></div></article>
          <article><span className="metric-icon is-cyan"><TrendingUp size={19} /></span><div><small>Son deneme neti</small><strong>{stats.exams.length ? stats.lastNet.toFixed(1) : '—'}</strong><Delta value={stats.netDelta} suffix=" net" /></div></article>
          <article><span className="metric-icon is-rose"><Target size={19} /></span><div><small>Çözülen zor soru</small><strong>{stats.solvedQuestions}</strong><span>{stats.unresolvedQuestions} soru tekrar bekliyor</span></div></article>
        </section>

        <section className="stats-primary-grid">
          <article className="study-panel stats-chart-card stats-activity-card">
            <div className="stats-card-heading"><div><span>Çalışma ritmi</span><h2>Süre ve soru gelişimi</h2></div><span className="stats-card-icon"><BarChart3 size={18} /></span></div>
            <div className="stats-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={stats.timeline} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}><CartesianGrid stroke="#e9eeec" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#7d899b', fontSize: 11 }}/><YAxis yAxisId="minutes" axisLine={false} tickLine={false} tick={{ fill: '#7d899b', fontSize: 11 }}/><YAxis yAxisId="questions" orientation="right" hide/><Tooltip content={<ChartTooltip />}/><Bar yAxisId="minutes" dataKey="minutes" name="Süre" fill="#00a870" radius={[5,5,0,0]} barSize={13}/><Line yAxisId="questions" type="monotone" dataKey="questions" name="Soru" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}/></ComposedChart></ResponsiveContainer></div>
          </article>

          <article className="study-panel stats-goal-card">
            <div className="stats-card-heading"><div><span>Hedef takibi</span><h2>Son 7 günün ilerlemesi</h2></div><span className="stats-card-icon"><Goal size={18} /></span></div>
            <div className="goal-meter"><div><span>Soru hedefi</span><strong>{stats.weeklyQuestions} / {stats.goalQuestions || 'Hedef yok'}</strong></div><div className="goal-meter-track"><i style={{ width: `${weeklyQuestionProgress}%` }} /></div><small>{stats.goalQuestions ? `%${weeklyQuestionProgress} tamamlandı` : 'Hedeflerim sayfasından soru hedefi ekleyebilirsin.'}</small></div>
            <div className="goal-meter"><div><span>Süre hedefi</span><strong>{formatDuration(stats.weeklyMinutes)} / {stats.goalMinutes ? formatDuration(stats.goalMinutes) : 'Hedef yok'}</strong></div><div className="goal-meter-track"><i style={{ width: `${weeklyMinutesProgress}%` }} /></div><small>{stats.goalMinutes ? `%${weeklyMinutesProgress} tamamlandı` : 'Hedeflerim sayfasından süre hedefi ekleyebilirsin.'}</small></div>
            <div className="stats-insight"><Sparkles size={17} /><p>{stats.bestDay ? <><strong>En verimli günün {formatDate(stats.bestDay.key)}.</strong> O gün {formatDuration(stats.bestDay.minutes)} odak kaydı oluşturdun.</> : 'İlk odak oturumunla kişisel içgörüler burada görünecek.'}</p></div>
          </article>
        </section>

        <section className="stats-secondary-grid">
          <article className="study-panel stats-chart-card">
            <div className="stats-card-heading"><div><span>Ders dağılımı</span><h2>Zamanını nereye ayırdın?</h2></div></div>
            {stats.courses.length ? <div className="stats-chart is-small"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.courses} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}><CartesianGrid stroke="#edf1ef" horizontal={false}/><XAxis type="number" hide/><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={88} tick={{ fill: '#53617c', fontSize: 11 }}/><Tooltip content={<ChartTooltip />}/><Bar dataKey="minutes" name="Süre" radius={[0, 7, 7, 0]} barSize={15}>{stats.courses.map((course) => <Cell key={course.name} fill={course.color}/>)}</Bar></BarChart></ResponsiveContainer></div> : <p className="stats-inline-empty">Ders seçilmiş odak kaydı yok.</p>}
          </article>

          <article className="study-panel stats-chart-card">
            <div className="stats-card-heading"><div><span>Deneme performansı</span><h2>Net gelişimi</h2></div><Delta value={stats.netDelta} suffix=" net" /></div>
            {stats.exams.length ? <div className="stats-chart is-small"><ResponsiveContainer width="100%" height="100%"><LineChart data={stats.exams} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}><CartesianGrid stroke="#edf1ef" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#7d899b', fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#7d899b', fontSize: 11 }}/><Tooltip content={<ChartTooltip />}/><Line type="monotone" dataKey="net" name="Net" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}/></LineChart></ResponsiveContainer></div> : <p className="stats-inline-empty">Bu dönemde deneme kaydı yok.</p>}
          </article>

          <article className="study-panel stats-topics-card">
            <div className="stats-card-heading"><div><span>Konu hakimiyeti</span><h2>Öğrenme durumu</h2></div><span className="stats-card-icon"><CalendarCheck2 size={18} /></span></div>
            {[['Tamamlandı', stats.topicCounts.tamamlandi, '#00a870'], ['Devam ediyor', stats.topicCounts.devam_ediyor, '#3b82f6'], ['Başlanmadı', stats.topicCounts.baslanmadi, '#d7dee5']].map(([label, count, color]) => {
              const total = Object.values(stats.topicCounts).reduce((sum, value) => sum + value, 0);
              return <div className="topic-row" key={label}><span style={{ background: color }} /><div><strong>{label}</strong><small>{count} konu</small></div><em>%{total ? Math.round(count / total * 100) : 0}</em></div>;
            })}
          </article>
        </section>

        {stats.exams.length > 0 && <section className="study-panel recent-exams"><div className="stats-card-heading"><div><span>Son sonuçlar</span><h2>Deneme geçmişi</h2></div></div><div className="recent-exam-list">{stats.exams.slice(-4).reverse().map((exam) => <div key={exam.id}><span className="exam-type">{exam.sinav_turu}</span><div><strong>{exam.yayin}</strong><small>{formatDate(exam.tarih)} · {exam.deneme_detaylari?.length || 0} ders</small></div><em>{exam.net.toFixed(1)} net</em></div>)}</div></section>}
      </DataState>

      <PremiumFeaturePrompt open={Boolean(premiumPrompt)} onClose={() => setPremiumPrompt(null)} currentPlan={currentPlan?.name || 'calisiyo ücretsiz'} {...premiumPrompt} />

      <style jsx>{`
        .stats-page { padding-bottom: 20px; }
        .stats-live { height: 34px; padding: 0 11px; border: 1px solid #b8e2d3; border-radius: 999px; background: #effaf6; color: #07875f; display: inline-flex; align-items: center; gap: 6px; font-size: .7rem; font-weight: 750; }
        .stats-head-actions { display: flex; align-items: center; gap: 7px; }
        .stats-export { height: 34px; padding: 0 10px; border: 1px solid var(--study-border); border-radius: 9px; background: #fff; color: var(--study-green-dark); display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: .65rem; font-weight: 750; cursor: pointer; }
        .stats-export:disabled { color: var(--study-muted); background: #f5f7f6; cursor: not-allowed; }
        .stats-live svg { animation: live-pulse 1.8s ease-in-out infinite; }
        @keyframes live-pulse { 50% { opacity: .42; } }
        .stats-toolbar { margin: -6px 0 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .stats-toolbar > span { color: var(--study-muted); font-size: .7rem; }
        .stats-range { margin: 0; }
        .stats-metrics { margin-bottom: 18px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .stats-metrics article { min-height: 112px; padding: 18px; border: 1px solid var(--study-border); border-radius: 12px; background: #fff; display: flex; align-items: flex-start; gap: 13px; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
        .stats-metrics article:hover { transform: translateY(-2px); border-color: #cad8d2; box-shadow: 0 10px 24px rgba(13,24,48,.05); }
        .metric-icon { width: 38px; height: 38px; flex: 0 0 auto; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; }
        .metric-icon.is-green { background: #e8f8f2; color: #07875f; } .metric-icon.is-blue { background: #edf5ff; color: #2774d8; } .metric-icon.is-violet { background: #f3efff; color: #7357d8; } .metric-icon.is-orange { background: #fff5e5; color: #dc8510; } .metric-icon.is-cyan { background: #e9f9f8; color: #0f8f8b; } .metric-icon.is-rose { background: #fff0ed; color: #d35f4c; }
        .stats-metrics article > div { min-width: 0; display: grid; gap: 2px; }
        .stats-metrics small, .stats-card-heading > div > span { color: var(--study-muted); font-size: .65rem; font-weight: 700; letter-spacing: .03em; }
        .stats-metrics strong { color: var(--study-ink); font-size: 1.45rem; line-height: 1.25; letter-spacing: -.035em; }
        .stats-metrics article > div > span:not(.metric-delta) { color: var(--study-muted); font-size: .67rem; }
        .metric-delta { width: fit-content; display: inline-flex; align-items: center; gap: 2px; color: #66738f; font-size: .66rem; font-weight: 700; }
        .metric-delta.is-positive { color: #07875f; } .metric-delta.is-negative { color: #c24e42; }
        .stats-primary-grid { margin-bottom: 14px; display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(280px, .85fr); gap: 14px; }
        .stats-secondary-grid { margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr .82fr; gap: 14px; }
        .stats-chart-card, .stats-goal-card, .stats-topics-card, .recent-exams { padding: 20px; }
        .stats-card-heading { min-height: 42px; margin-bottom: 18px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .stats-card-heading h2 { margin: 4px 0 0; color: var(--study-ink); font-size: .96rem; letter-spacing: -.015em; }
        .stats-card-icon { width: 34px; height: 34px; border-radius: 9px; background: #f2f7f5; color: var(--study-green-dark); display: inline-flex; align-items: center; justify-content: center; }
        .stats-chart { height: 290px; } .stats-chart.is-small { height: 230px; }
        .goal-meter { margin: 0 0 22px; display: grid; gap: 7px; }
        .goal-meter > div:first-child { display: flex; justify-content: space-between; gap: 12px; font-size: .71rem; }
        .goal-meter > div span { color: var(--study-muted); } .goal-meter > div strong { color: var(--study-ink); }
        .goal-meter-track { height: 7px; overflow: hidden; border-radius: 999px; background: #edf2f0; }
        .goal-meter-track i { height: 100%; display: block; border-radius: inherit; background: linear-gradient(90deg, #00a870, #26c98f); transition: width .45s ease; }
        .goal-meter small { color: var(--study-muted); font-size: .64rem; }
        .stats-insight { margin-top: 6px; padding: 13px; border-radius: 10px; background: #f2faf7; color: var(--study-green-dark); display: flex; align-items: flex-start; gap: 9px; }
        .stats-insight p { margin: 0; color: #526a62; font-size: .68rem; line-height: 1.5; } .stats-insight strong { color: #205b47; }
        .stats-inline-empty { min-height: 220px; margin: 0; color: var(--study-muted); display: grid; place-items: center; font-size: .72rem; }
        .topic-row { min-height: 62px; border-bottom: 1px solid #eef2f1; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; }
        .topic-row:last-child { border-bottom: 0; } .topic-row > span { width: 9px; height: 9px; border-radius: 50%; }
        .topic-row > div { display: grid; gap: 2px; } .topic-row strong { font-size: .72rem; } .topic-row small { color: var(--study-muted); font-size: .62rem; }
        .topic-row em { color: var(--study-muted); font-size: .68rem; font-style: normal; font-weight: 750; }
        .recent-exam-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .recent-exam-list > div { min-width: 0; padding: 13px; border: 1px solid #e7ecea; border-radius: 10px; display: grid; grid-template-columns: auto 1fr; gap: 8px 10px; align-items: center; }
        .exam-type { padding: 4px 6px; border-radius: 6px; background: var(--study-green-soft); color: var(--study-green-dark); font-size: .58rem; font-weight: 800; }
        .recent-exam-list > div > div { min-width: 0; display: grid; gap: 2px; } .recent-exam-list strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .7rem; } .recent-exam-list small { color: var(--study-muted); font-size: .6rem; }
        .recent-exam-list em { grid-column: 1 / -1; color: var(--study-ink); font-size: 1rem; font-style: normal; font-weight: 800; }
        :global(.stats-tooltip) { min-width: 110px; padding: 10px 11px; border: 1px solid #dfe6e3; border-radius: 9px; background: rgba(255,255,255,.97); box-shadow: 0 12px 28px rgba(13,24,48,.12); display: grid; gap: 4px; }
        :global(.stats-tooltip strong) { color: #0d1830; font-size: .68rem; } :global(.stats-tooltip span) { font-size: .64rem; font-weight: 650; }
        @media (max-width: 1050px) { .stats-secondary-grid { grid-template-columns: 1fr 1fr; } .stats-topics-card { grid-column: 1 / -1; } .recent-exam-list { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 760px) { .stats-toolbar { align-items: flex-start; flex-direction: column; } .stats-metrics { grid-template-columns: 1fr 1fr; } .stats-primary-grid, .stats-secondary-grid { grid-template-columns: 1fr; } .stats-topics-card { grid-column: auto; } .stats-chart { height: 245px; } }
        @media (max-width: 480px) { .stats-metrics, .recent-exam-list { grid-template-columns: 1fr; } .stats-metrics article { min-height: 98px; } }
      `}</style>
    </motion.div>
  );
}
