'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getCurrentWeekDates, GUN_KISA, formatTime, formatShortDate, todayStr, toLocalDateKey } from '@/lib/utils/date';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, ListTodo, HelpCircle, Trophy } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import { getExamTabs } from '@/lib/constants/alanlar';
import PageHeader from '@/components/ui/PageHeader';
import JourneyLoader from '@/components/ui/JourneyLoader';

const REALTIME_TABLES = ['gunluk_gorevler'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function HaftalikProgramPage() {
  const { profile, setError } = useUser();
  const supabase = createClient();
  const [weekDates, setWeekDates] = useState(getCurrentWeekDates());
  const [weekTasks, setWeekTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState('TYT');
  const examTabs = profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'];

  const loadWeekData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const start = toLocalDateKey(weekDates[0]);
    const end = toLocalDateKey(weekDates[6]);

    const { data, error } = await supabase
      .from('gunluk_gorevler')
      .select('*, dersler(ad, renk, ikon, sinav_turu)')
      .eq('user_id', profile.id)
      .gte('tarih', start)
      .lte('tarih', end)
      .order('baslangic_saat');

    if (error) {
      setError('Haftalık programın yüklenemedi. Lütfen tekrar dene.');
      setWeekTasks({});
      setLoading(false);
      return;
    }

    const grouped = {};
    weekDates.forEach(d => {
      grouped[toLocalDateKey(d)] = [];
    });
    (data || []).forEach(t => {
      if (grouped[t.tarih]) grouped[t.tarih].push(t);
    });
    setWeekTasks(grouped);
    setLoading(false);
  }, [profile, setError, supabase, weekDates]);

  useEffect(() => {
    const timer = setTimeout(loadWeekData, 0);
    return () => clearTimeout(timer);
  }, [loadWeekData]);
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: loadWeekData });

  function changeWeek(offset) {
    const newDates = weekDates.map(d => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + offset * 7);
      return nd;
    });
    setWeekDates(newDates);
  }

  // Week stats
  const allTasks = Object.values(weekTasks).flat().filter((task) => task.dersler?.sinav_turu === activeExam);
  const completedTasks = allTasks.filter(t => t.tamamlandi);
  const totalQuestions = allTasks.reduce((s, t) => s + (t.soru_sayisi || 0), 0);
  const weekPercent = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
  const today = todayStr();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <PageHeader title="Haftalık Program" description="Yedi günlük çalışma akışını ve haftalık ilerlemeni tek bakışta gör." />
      <div className="study-segments content-tabs">{examTabs.map((exam) => <button key={exam} className={activeExam === exam ? 'is-active' : ''} onClick={() => setActiveExam(exam)}>{exam}</button>)}</div>
      {/* Week Nav */}
      <div className="week-nav">
        <button className="btn btn-ghost btn-icon-lg date-btn" onClick={() => changeWeek(-1)} aria-label="Önceki hafta">
          <ChevronLeft size={24} />
        </button>
        <span className="week-range">{formatShortDate(weekDates[0])} – {formatShortDate(weekDates[6])}</span>
        <button className="btn btn-ghost btn-icon-lg date-btn" onClick={() => changeWeek(1)} aria-label="Sonraki hafta">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Week Stats */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card week-stats"
      >
        <div className="week-stat-item">
          <div className="week-stat-icon"><ListTodo size={24} color="#3B82F6" /></div>
          <div>
            <span className="week-stat-value">{completedTasks.length}/{allTasks.length}</span>
            <span className="week-stat-label">Görevler</span>
          </div>
        </div>
        <div className="week-stat-divider"></div>
        <div className="week-stat-item">
          <div className="week-stat-icon"><HelpCircle size={24} color="#F59E0B" /></div>
          <div>
            <span className="week-stat-value">{totalQuestions}</span>
            <span className="week-stat-label">Toplam Soru</span>
          </div>
        </div>
        <div className="week-stat-divider"></div>
        <div className="week-stat-item">
          <div className="week-stat-icon"><Trophy size={24} color="#10B981" /></div>
          <div>
            <span className="week-stat-value">{weekPercent}%</span>
            <span className="week-stat-label">Başarı</span>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <JourneyLoader compact label="Haftalık planın hazırlanıyor" />
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="week-grid"
        >
          {weekDates.map((date, idx) => {
            const dateStr = toLocalDateKey(date);
            const dayTasks = (weekTasks[dateStr] || []).filter((task) => task.dersler?.sinav_turu === activeExam);
            const isToday = dateStr === today;
            const dayCompleted = dayTasks.filter(t => t.tamamlandi).length;
            const progressPct = dayTasks.length > 0 ? (dayCompleted / dayTasks.length) * 100 : 0;

            return (
              <motion.div variants={itemVariants} key={dateStr} className={`card day-column ${isToday ? 'day-today' : ''}`}>
                <div className="day-header">
                  <span className="day-name">{GUN_KISA[idx]}</span>
                  <span className="day-date">{date.getDate()}</span>
                  {dayTasks.length > 0 && (
                    <div className="day-progress-mini">
                      <div className="day-progress-fill" style={{ width: `${progressPct}%` }}></div>
                    </div>
                  )}
                </div>
                <div className="day-tasks">
                  {dayTasks.length === 0 ? (
                    <span className="day-empty">—</span>
                  ) : (
                    dayTasks.map(t => (
                      <div key={t.id} className={`day-task ${t.tamamlandi ? 'day-task-done' : ''}`} style={{ borderLeftColor: t.dersler?.renk || 'var(--gray-300)' }}>
                        <div className="day-task-header">
                          <span className="day-task-time">{formatTime(t.baslangic_saat)}</span>
                          {t.tamamlandi && <CheckCircle2 size={12} color="var(--success)" />}
                        </div>
                        <span className="day-task-ders">{t.dersler?.ikon} {t.dersler?.ad}</span>
                        <strong className="day-task-topic">{t.konu || 'Konu belirtilmedi'}</strong>
                        {t.soru_sayisi ? <small className="day-task-questions">{t.soru_sayisi} soru</small> : null}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <style jsx>{`
        .week-nav { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 20px; 
          margin-bottom: 24px; 
        }
        
        .date-btn {
          color: var(--text-secondary);
        }
        
        .date-btn:hover {
          color: var(--text-primary);
          background: var(--gray-100);
        }
        
        .week-range { 
          font-size: 1.25rem; 
          font-weight: 700; 
          color: var(--text-primary);
        }
        
        .week-stats { 
          display: flex; 
          justify-content: space-around; 
          align-items: center;
          padding: 20px; 
          margin-bottom: 24px; 
        }
        
        .week-stat-item { 
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left; 
        }
        
        .week-stat-icon {
          padding: 12px;
          border-radius: var(--radius-full);
          background: var(--gray-50);
        }
        
        .week-stat-divider {
          width: 1px;
          height: 40px;
          background: var(--border-light);
        }
        
        .week-stat-value { 
          font-size: 1.5rem; 
          font-weight: 800; 
          color: var(--text-primary); 
          display: block; 
          line-height: 1.2;
        }
        
        .week-stat-label { 
          font-size: 0.875rem; 
          color: var(--text-tertiary); 
          font-weight: 500;
        }
        
        .week-grid { 
          display: grid; 
          grid-template-columns: repeat(7, 1fr); 
          gap: 12px; 
        }
        
        .day-column { 
          padding: 16px 12px; 
          min-height: 240px; 
          display: flex;
          flex-direction: column;
        }
        
        .day-today { 
          border: 2px solid var(--primary-400); 
          background: var(--primary-50); 
        }
        
        .day-header { 
          text-align: center; 
          margin-bottom: 16px; 
          padding-bottom: 12px; 
          border-bottom: 1px dashed var(--border-light); 
        }
        
        .day-name { 
          font-size: 0.8125rem; 
          font-weight: 600; 
          color: var(--text-secondary); 
          display: block; 
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .day-date { 
          font-size: 1.5rem; 
          font-weight: 800; 
          display: block; 
          color: var(--text-primary);
        }
        
        .day-progress-mini {
          width: 100%;
          height: 4px;
          background: var(--gray-200);
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }
        
        .day-progress-fill {
          height: 100%;
          background: var(--primary-500);
          border-radius: 2px;
        }
        
        .day-tasks { 
          display: flex; 
          flex-direction: column; 
          gap: 8px; 
          flex: 1;
        }
        
        .day-empty { 
          text-align: center; 
          color: var(--text-tertiary); 
          font-size: 0.875rem; 
          margin-top: 20px;
        }
        
        .day-task { 
          padding: 8px 10px; 
          border-left: 4px solid; 
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0; 
          background: var(--bg-secondary); 
          box-shadow: var(--shadow-xs);
          transition: transform var(--transition-fast);
        }
        
        .day-task:hover {
          transform: translateX(2px);
        }
        
        .day-task-done { 
          opacity: 0.6; 
          background: var(--gray-50);
        }
        
        .day-task-done .day-task-ders {
          text-decoration: line-through;
          color: var(--text-tertiary);
        }
        
        .day-task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }
        
        .day-task-time { 
          font-size: 0.6875rem; 
          color: var(--text-tertiary); 
          font-weight: 600;
        }
        
        .day-task-ders { 
          display: block;
          font-size: 0.8125rem; 
          font-weight: 600; 
          color: var(--text-primary);
        }

        .day-task-topic {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          color: var(--text-secondary);
          font-size: 0.72rem;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .day-task-questions {
          display: block;
          margin-top: 3px;
          color: var(--text-tertiary);
          font-size: 0.64rem;
        }

        @media (max-width: 1024px) {
          .week-grid { grid-template-columns: repeat(4, 1fr); }
        }

        @media (max-width: 768px) {
          .week-stats {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }
          .week-stat-divider {
            width: 100%;
            height: 1px;
          }
          .week-grid { grid-template-columns: 1fr; gap: 12px; }
          .day-column { min-height: auto; flex-direction: row; align-items: stretch; gap: 16px; padding: 16px; }
          .day-header { border-bottom: none; padding-bottom: 0; min-width: 60px; display: flex; flex-direction: column; justify-content: center; border-right: 1px dashed var(--border-light); padding-right: 16px; margin-bottom: 0; }
          .day-tasks { flex: 1; flex-direction: row; flex-wrap: wrap; gap: 8px; align-items: center; }
          .day-task { width: calc(50% - 4px); }
        }
        
        @media (max-width: 480px) {
          .day-task { width: 100%; }
        }
      `}</style>
    </motion.div>
  );
}
