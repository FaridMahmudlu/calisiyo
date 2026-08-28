'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck2, CheckCircle2, ChevronLeft, ChevronRight,
  CircleHelp, ListTodo, Sparkles, Target,
} from 'lucide-react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import {
  formatShortDate, formatTime, getCurrentWeekDates,
  GUN_KISA, todayStr, toLocalDateKey,
} from '@/lib/utils/date';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import { getExamTabs } from '@/lib/constants/alanlar';
import PageHeader from '@/components/ui/PageHeader';

const REALTIME_TABLES = ['gunluk_gorevler'];
const listMotion = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.035 } } };
const cardMotion = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } } };

export default function HaftalikProgramPage() {
  const { profile, setError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [weekDates, setWeekDates] = useState(() => getCurrentWeekDates());
  const [weekTasks, setWeekTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState('TYT');
  const profileId = profile?.id;
  const examTabs = useMemo(() => (profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT']), [profile]);

  const loadWeekData = useCallback(async ({ quiet = false } = {}) => {
    if (!profileId) return;
    if (!quiet) setLoading(true);
    const start = toLocalDateKey(weekDates[0]);
    const end = toLocalDateKey(weekDates[6]);
    const { data, error } = await supabase
      .from('gunluk_gorevler')
      .select('*, dersler(ad, renk, ikon, sinav_turu)')
      .eq('user_id', profileId)
      .gte('tarih', start)
      .lte('tarih', end)
      .order('baslangic_saat');

    if (error) {
      setError('Haftalık programın yüklenemedi. Lütfen tekrar dene.');
      if (!quiet) setWeekTasks({});
      setLoading(false);
      return;
    }
    const grouped = Object.fromEntries(weekDates.map((date) => [toLocalDateKey(date), []]));
    for (const task of data || []) if (grouped[task.tarih]) grouped[task.tarih].push(task);
    setWeekTasks(grouped);
    setLoading(false);
  }, [profileId, setError, supabase, weekDates]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadWeekData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWeekData]);
  const refreshQuietly = useCallback(() => loadWeekData({ quiet: true }), [loadWeekData]);
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: refreshQuietly });

  const changeWeek = (offset) => setWeekDates((current) => current.map((date) => {
    const next = new Date(date);
    next.setDate(next.getDate() + offset * 7);
    return next;
  }));

  const allTasks = useMemo(
    () => Object.values(weekTasks).flat().filter((task) => task.dersler?.sinav_turu === activeExam),
    [activeExam, weekTasks],
  );
  const completedTasks = allTasks.filter((task) => task.tamamlandi);
  const totalQuestions = allTasks.reduce((sum, task) => sum + Number(task.soru_sayisi || 0), 0);
  const weekPercent = allTasks.length ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
  const today = todayStr();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page weekly-page">
      <PageHeader eyebrow="Haftanın ritmi" title="Haftalık Program" description="Derslerini gün gün düzenle, yoğunluğu dengede tut ve tamamladığın çalışmaları tek bakışta gör." />

      <section className="week-command" aria-label="Hafta ve sınav seçimi">
        <div className="study-segments content-tabs week-exams">
          {examTabs.map((exam) => <button key={exam} className={activeExam === exam ? 'is-active' : ''} onClick={() => setActiveExam(exam)}>{exam}</button>)}
        </div>
        <nav className="week-nav" aria-label="Hafta değiştir">
          <button type="button" onClick={() => changeWeek(-1)} aria-label="Önceki hafta"><ChevronLeft size={18} /></button>
          <div><small>Görüntülenen hafta</small><strong>{formatShortDate(weekDates[0])} – {formatShortDate(weekDates[6])}</strong></div>
          <button type="button" onClick={() => changeWeek(1)} aria-label="Sonraki hafta"><ChevronRight size={18} /></button>
        </nav>
      </section>

      <section className="week-summary" aria-label="Haftalık program özeti">
        <article><span className="summary-icon is-blue"><ListTodo size={18} /></span><div><strong>{completedTasks.length}<small> / {allTasks.length}</small></strong><span>Tamamlanan görev</span></div></article>
        <article><span className="summary-icon is-amber"><CircleHelp size={18} /></span><div><strong>{totalQuestions.toLocaleString('tr-TR')}</strong><span>Planlanan soru</span></div></article>
        <article><span className="summary-icon is-green"><Target size={18} /></span><div><strong>%{weekPercent}</strong><span>Program uyumu</span></div></article>
        <article className="summary-progress"><div><span>Haftalık ilerleme</span><strong>{weekPercent}%</strong></div><div className="week-progress-track"><i style={{ width: `${weekPercent}%` }} /></div></article>
      </section>

      {loading ? (
        <section className="weekly-program-grid week-skeleton" aria-label="Haftalık program yükleniyor" aria-busy="true">
          {weekDates.map((date) => <article key={date.toISOString()}><i /><i /><i /><i /></article>)}
        </section>
      ) : (
        <motion.section variants={listMotion} initial="hidden" animate="show" className="weekly-program-grid" aria-label={`${activeExam} haftalık programı`}>
          {weekDates.map((date, index) => {
            const dateKey = toLocalDateKey(date);
            const dayTasks = (weekTasks[dateKey] || []).filter((task) => task.dersler?.sinav_turu === activeExam);
            const done = dayTasks.filter((task) => task.tamamlandi).length;
            const progress = dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0;
            const isToday = dateKey === today;
            return (
              <motion.article variants={cardMotion} key={dateKey} className={`week-day${isToday ? ' is-today' : ''}`}>
                <header><div><span>{GUN_KISA[index]}</span><time dateTime={dateKey}>{date.getDate()}</time></div><div className="day-meta">{isToday && <em>Bugün</em>}<small>{dayTasks.length ? `${done}/${dayTasks.length} tamamlandı` : 'Boş gün'}</small></div></header>
                {dayTasks.length > 0 && <div className="day-progress"><i style={{ width: `${progress}%` }} /></div>}
                <div className="day-task-list">
                  {dayTasks.length === 0 ? (
                    <div className="empty-day"><Sparkles size={20} /><strong>Planlanmış görev yok</strong><span>Bu günü dinlenme veya tekrar için kullanabilirsin.</span></div>
                  ) : dayTasks.map((task) => (
                    <div key={task.id} className={`weekly-task${task.tamamlandi ? ' is-done' : ''}`} style={{ '--task-color': task.dersler?.renk || '#6b8afd' }}>
                      <div className="task-time"><time>{formatTime(task.baslangic_saat)}</time>{task.tamamlandi && <CheckCircle2 size={15} />}</div>
                      <div className="task-course"><i>{task.dersler?.ikon || '•'}</i><strong>{task.dersler?.ad || 'Ders'}</strong></div>
                      <p title={task.konu || 'Konu belirtilmedi'}>{task.konu || 'Konu belirtilmedi'}</p>
                      {Number(task.soru_sayisi) > 0 && <span className="question-pill">{Number(task.soru_sayisi).toLocaleString('tr-TR')} soru</span>}
                    </div>
                  ))}
                </div>
                <footer><CalendarCheck2 size={14} /><span>{dayTasks.length ? `${progress}% günlük uyum` : 'Esnek zaman'}</span></footer>
              </motion.article>
            );
          })}
        </motion.section>
      )}

      <style jsx global>{`
        .weekly-page{min-width:0}.week-command{margin:4px 0 18px;padding:10px;border:1px solid var(--study-border,#e1e8e5);border-radius:16px;background:rgba(255,255,255,.76);display:flex;align-items:center;justify-content:space-between;gap:16px}.week-exams{margin:0}.week-nav{min-width:min(100%,390px);display:grid;grid-template-columns:42px minmax(0,1fr) 42px;align-items:center;gap:8px}.week-nav button{width:42px;height:42px;border:1px solid var(--study-border,#e1e8e5);border-radius:12px;background:#fff;color:var(--text-secondary);display:grid;place-items:center;cursor:pointer;transition:.18s ease}.week-nav button:hover{border-color:#93cfb8;color:#07815b;transform:translateY(-1px)}.week-nav div{min-width:0;text-align:center;display:grid;gap:2px}.week-nav small{color:var(--text-tertiary);font-size:.72rem}.week-nav strong{overflow:hidden;color:var(--text-primary);font-size:.9rem;text-overflow:ellipsis;white-space:nowrap}
        .week-summary{margin-bottom:18px;display:grid;grid-template-columns:repeat(3,minmax(160px,1fr)) minmax(230px,1.25fr);gap:10px}.week-summary>article{min-height:82px;padding:15px;border:1px solid var(--study-border,#e1e8e5);border-radius:16px;background:#fff;display:flex;align-items:center;gap:12px;box-shadow:0 8px 30px rgba(25,55,45,.035)}.summary-icon{width:40px;height:40px;flex:0 0 auto;border-radius:12px;display:grid;place-items:center}.summary-icon.is-blue{background:#eef4ff;color:#4878d6}.summary-icon.is-amber{background:#fff6e6;color:#bb7916}.summary-icon.is-green{background:#eaf8f2;color:#07815b}.week-summary article>div{min-width:0;display:grid;gap:2px}.week-summary strong{color:var(--text-primary);font-size:1.2rem;line-height:1}.week-summary strong small{color:var(--text-tertiary);font-size:.72rem}.week-summary article>div>span{color:var(--text-tertiary);font-size:.68rem}.summary-progress{align-content:center;display:grid!important}.summary-progress>div:first-child{display:flex;grid-auto-flow:column;justify-content:space-between}.summary-progress>div:first-child span{color:var(--text-secondary);font-weight:700}.summary-progress>div:first-child strong{font-size:.86rem}.week-progress-track{height:7px;overflow:hidden;border-radius:99px;background:#e8efec}.week-progress-track i{height:100%;display:block;border-radius:inherit;background:linear-gradient(90deg,#00a870,#57d5aa);transition:width .35s ease}
        .weekly-program-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;align-items:stretch}.week-day{min-width:0;min-height:320px;overflow:hidden;border:1px solid var(--study-border,#e1e8e5);border-radius:18px;background:#fff;display:grid;grid-template-rows:auto auto 1fr auto;box-shadow:0 10px 35px rgba(22,57,45,.04)}.week-day.is-today{border-color:#83cdb0;box-shadow:0 0 0 3px rgba(0,168,112,.07),0 12px 35px rgba(22,91,67,.08)}.week-day>header{padding:16px 17px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px}.week-day>header>div:first-child{display:flex;align-items:baseline;gap:8px}.week-day>header span{color:#07815b;font-size:.7rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.week-day>header time{color:var(--text-primary);font-size:1.55rem;font-weight:850;line-height:1}.day-meta{display:grid;justify-items:end;gap:3px}.day-meta em{padding:3px 7px;border-radius:99px;background:#e7f8f1;color:#07815b;font-size:.55rem;font-style:normal;font-weight:850}.day-meta small{color:var(--text-tertiary);font-size:.58rem}.day-progress{height:3px;margin:0 17px 2px;overflow:hidden;border-radius:99px;background:#edf2f0}.day-progress i{height:100%;display:block;background:#0ab47e}.day-task-list{min-width:0;padding:12px;display:grid;align-content:start;gap:8px}
        .weekly-task{min-width:0;padding:11px 12px 12px;border:1px solid #e5ece9;border-left:4px solid var(--task-color);border-radius:12px;background:#fbfdfc;display:grid;gap:6px;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}.weekly-task:hover{transform:translateY(-2px);border-color:#cbdcd5;box-shadow:0 8px 22px rgba(26,64,51,.07)}.weekly-task.is-done{opacity:.67;background:#f4f7f6}.task-time{display:flex;align-items:center;justify-content:space-between;color:#7f8e88;font-size:.62rem;font-weight:750}.task-time svg{color:#079b6d}.task-course{min-width:0;display:flex;align-items:center;gap:7px}.task-course i{flex:0 0 auto;font-size:.8rem;font-style:normal}.task-course strong{min-width:0;overflow:hidden;color:var(--text-primary);font-size:.72rem;text-overflow:ellipsis;white-space:nowrap}.is-done .task-course strong{text-decoration:line-through}.weekly-task p{margin:0;min-width:0;overflow:hidden;color:var(--text-secondary);font-size:.68rem;line-height:1.4;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow-wrap:anywhere}.question-pill{width:max-content;padding:3px 7px;border-radius:99px;background:#eff4ff;color:#4a67a9;font-size:.55rem;font-weight:750}.empty-day{min-height:170px;padding:18px;color:var(--text-tertiary);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;text-align:center}.empty-day svg{color:#73bca0}.empty-day strong{color:var(--text-secondary);font-size:.72rem}.empty-day span{max-width:220px;font-size:.6rem;line-height:1.45}.week-day>footer{min-height:40px;padding:9px 15px;border-top:1px solid #edf1ef;background:#fbfdfc;color:#78867f;display:flex;align-items:center;gap:6px;font-size:.58rem;font-weight:700}
        .week-skeleton article{min-height:320px;padding:18px;border:1px solid #e6ece9;border-radius:18px;background:#fff;display:grid;align-content:start;gap:12px}.week-skeleton i{height:18px;border-radius:8px;background:linear-gradient(90deg,#edf2f0 20%,#f8faf9 40%,#edf2f0 60%);background-size:220% 100%;animation:week-shimmer 1.3s infinite}.week-skeleton i:nth-child(1){width:45%;height:30px}.week-skeleton i:nth-child(2){margin-top:12px;height:78px}.week-skeleton i:nth-child(3){height:78px}.week-skeleton i:nth-child(4){width:65%}@keyframes week-shimmer{to{background-position:-220% 0}}
        @media(max-width:1180px){.week-summary{grid-template-columns:repeat(3,1fr)}.summary-progress{grid-column:1/-1}.weekly-program-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.week-command{align-items:stretch;flex-direction:column}.week-exams{width:100%}.week-exams button{flex:1}.week-nav{width:100%;min-width:0}.week-summary{grid-template-columns:1fr 1fr}.week-summary>article{min-height:72px;padding:12px}.week-summary>article:nth-child(3){grid-column:1/-1}.weekly-program-grid{grid-template-columns:1fr}.week-day{min-height:0}.day-task-list{grid-template-columns:repeat(2,minmax(0,1fr))}.empty-day{grid-column:1/-1;min-height:130px}}@media(max-width:480px){.week-summary{grid-template-columns:1fr}.week-summary>article:nth-child(3),.summary-progress{grid-column:auto}.week-nav strong{font-size:.78rem}.day-task-list{grid-template-columns:1fr}.week-day>header{padding-inline:14px}.day-meta small{max-width:105px;text-align:right}}@media(prefers-reduced-motion:reduce){.weekly-task,.week-nav button,.week-progress-track i{transition:none}.week-skeleton i{animation:none}}
      `}</style>
    </motion.div>
  );
}
