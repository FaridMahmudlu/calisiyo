'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getCurrentWeekDates, GUN_KISA, formatTime, formatDuration, formatShortDate, todayStr } from '@/lib/utils/date';

export default function HaftalikProgramPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const [weekDates, setWeekDates] = useState(getCurrentWeekDates());
  const [weekTasks, setWeekTasks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadWeekData();
  }, [profile, weekDates]);

  async function loadWeekData() {
    setLoading(true);
    const start = weekDates[0].toISOString().split('T')[0];
    const end = weekDates[6].toISOString().split('T')[0];

    const { data } = await supabase
      .from('gunluk_gorevler')
      .select('*, dersler(ad, renk, ikon)')
      .eq('user_id', profile.id)
      .gte('tarih', start)
      .lte('tarih', end)
      .order('baslangic_saat');

    const grouped = {};
    weekDates.forEach(d => {
      grouped[d.toISOString().split('T')[0]] = [];
    });
    (data || []).forEach(t => {
      if (grouped[t.tarih]) grouped[t.tarih].push(t);
    });
    setWeekTasks(grouped);
    setLoading(false);
  }

  function changeWeek(offset) {
    const newDates = weekDates.map(d => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + offset * 7);
      return nd;
    });
    setWeekDates(newDates);
  }

  // Week stats
  const allTasks = Object.values(weekTasks).flat();
  const completedTasks = allTasks.filter(t => t.tamamlandi);
  const totalQuestions = allTasks.reduce((s, t) => s + (t.soru_sayisi || 0), 0);
  const weekPercent = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
  const today = todayStr();

  return (
    <div className="page animate-fade-in">
      {/* Week Nav */}
      <div className="week-nav">
        <button className="btn btn-ghost btn-icon" onClick={() => changeWeek(-1)}>←</button>
        <span className="week-range">{formatShortDate(weekDates[0])} – {formatShortDate(weekDates[6])}</span>
        <button className="btn btn-ghost btn-icon" onClick={() => changeWeek(1)}>→</button>
      </div>

      {/* Week Stats */}
      <div className="card week-stats">
        <div className="week-stat-item">
          <span className="week-stat-value">{completedTasks.length}/{allTasks.length}</span>
          <span className="week-stat-label">Görevler</span>
        </div>
        <div className="week-stat-item">
          <span className="week-stat-value">{totalQuestions}</span>
          <span className="week-stat-label">Toplam Soru</span>
        </div>
        <div className="week-stat-item">
          <span className="week-stat-value">{weekPercent}%</span>
          <span className="week-stat-label">Başarı</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg"></div></div>
      ) : (
        <div className="week-grid">
          {weekDates.map((date, idx) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayTasks = weekTasks[dateStr] || [];
            const isToday = dateStr === today;
            const dayCompleted = dayTasks.filter(t => t.tamamlandi).length;

            return (
              <div key={dateStr} className={`card day-column ${isToday ? 'day-today' : ''}`}>
                <div className="day-header">
                  <span className="day-name">{GUN_KISA[idx]}</span>
                  <span className="day-date">{date.getDate()}</span>
                  {dayTasks.length > 0 && (
                    <span className="day-count">{dayCompleted}/{dayTasks.length}</span>
                  )}
                </div>
                <div className="day-tasks">
                  {dayTasks.length === 0 ? (
                    <span className="day-empty">—</span>
                  ) : (
                    dayTasks.map(t => (
                      <div key={t.id} className={`day-task ${t.tamamlandi ? 'day-task-done' : ''}`} style={{ borderLeftColor: t.dersler?.renk || 'var(--gray-300)' }}>
                        <span className="day-task-time">{formatTime(t.baslangic_saat)}</span>
                        <span className="day-task-ders">{t.dersler?.ad}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .week-nav { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
        .week-range { font-size: 1rem; font-weight: 600; }
        .week-stats { display: flex; justify-content: space-around; padding: 16px; margin-bottom: 20px; }
        .week-stat-item { text-align: center; }
        .week-stat-value { font-size: 1.25rem; font-weight: 700; color: var(--primary-600); display: block; }
        .week-stat-label { font-size: 0.75rem; color: var(--text-tertiary); }
        .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .day-column { padding: 12px 8px; min-height: 180px; }
        .day-today { border-color: var(--primary-400); background: var(--primary-50); }
        .day-header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); }
        .day-name { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); display: block; }
        .day-date { font-size: 1.125rem; font-weight: 700; display: block; }
        .day-count { font-size: 0.625rem; color: var(--text-tertiary); }
        .day-tasks { display: flex; flex-direction: column; gap: 4px; }
        .day-empty { text-align: center; color: var(--text-tertiary); font-size: 0.8125rem; }
        .day-task { padding: 6px 8px; border-left: 3px solid; border-radius: 0 var(--radius-xs) var(--radius-xs) 0; background: var(--gray-50); }
        .day-task-done { opacity: 0.5; text-decoration: line-through; }
        .day-task-time { font-size: 0.625rem; color: var(--text-tertiary); display: block; }
        .day-task-ders { font-size: 0.75rem; font-weight: 500; }

        @media (max-width: 768px) {
          .week-grid { grid-template-columns: 1fr; gap: 10px; }
          .day-column { min-height: auto; flex-direction: row; display: flex; align-items: flex-start; gap: 12px; }
          .day-header { border-bottom: none; padding-bottom: 0; min-width: 50px; }
          .day-tasks { flex: 1; flex-direction: row; flex-wrap: wrap; gap: 6px; }
        }
      `}</style>
    </div>
  );
}
