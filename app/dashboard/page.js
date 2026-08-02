'use client';

import { useState, useEffect } from 'react';
import { useUser } from './layout';
import { createClient } from '@/lib/supabase/client';
import { daysUntilYKS, todayStr, formatDuration, formatTime } from '@/lib/utils/date';
import { getExamTabs } from '@/lib/constants/alanlar';

export default function DashboardPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const [stats, setStats] = useState({
    todayQuestions: 0,
    todayMinutes: 0,
    todayCompleted: 0,
    todayTotal: 0,
    streak: 0,
  });
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadDashboardData();
  }, [profile]);

  async function loadDashboardData() {
    const today = todayStr();

    // Load today's tasks
    const { data: tasks } = await supabase
      .from('gunluk_gorevler')
      .select('*, dersler(ad, renk, ikon)')
      .eq('user_id', profile.id)
      .eq('tarih', today)
      .order('baslangic_saat');

    // Load today's study time
    const { data: studyTime } = await supabase
      .from('calisma_suresi')
      .select('sure_dakika, soru_sayisi')
      .eq('user_id', profile.id)
      .eq('tarih', today);

    const todayMinutes = studyTime?.reduce((sum, s) => sum + (s.sure_dakika || 0), 0) || 0;
    const todayQuestions = studyTime?.reduce((sum, s) => sum + (s.soru_sayisi || 0), 0) || 0;
    const completedTasks = tasks?.filter(t => t.tamamlandi).length || 0;

    // Calculate streak (simplified)
    let streak = 0;
    const { data: recentStudy } = await supabase
      .from('calisma_suresi')
      .select('tarih')
      .eq('user_id', profile.id)
      .order('tarih', { ascending: false })
      .limit(30);

    if (recentStudy && recentStudy.length > 0) {
      const uniqueDays = [...new Set(recentStudy.map(s => s.tarih))].sort().reverse();
      const todayDate = new Date(today);

      for (let i = 0; i < uniqueDays.length; i++) {
        const expectedDate = new Date(todayDate);
        expectedDate.setDate(todayDate.getDate() - i);
        const expectedStr = expectedDate.toISOString().split('T')[0];

        if (uniqueDays[i] === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
    }

    setStats({
      todayQuestions,
      todayMinutes,
      todayCompleted: completedTasks,
      todayTotal: tasks?.length || 0,
      streak,
    });

    // Upcoming tasks (not completed)
    setUpcomingTasks(tasks?.filter(t => !t.tamamlandi) || []);
    setLoading(false);
  }

  const daysLeft = daysUntilYKS();
  const completionPercent = stats.todayTotal > 0 ? Math.round((stats.todayCompleted / stats.todayTotal) * 100) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Greeting */}
      <div className="greeting">
        <h1 className="greeting-title">
          Merhaba, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="greeting-sub">Bugün harika bir gün olacak!</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* YKS Countdown */}
        <div className="stat-card stat-countdown">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{daysLeft}</div>
          <div className="stat-label">YKS&apos;ye Kalan Gün</div>
        </div>

        {/* Daily Progress */}
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{completionPercent}%</div>
          <div className="stat-label">Günlük İlerleme</div>
          <div className="progress-bar progress-bar-sm" style={{ marginTop: '8px' }}>
            <div className="progress-bar-fill" style={{ width: `${completionPercent}%` }}></div>
          </div>
        </div>

        {/* Questions */}
        <div className="stat-card">
          <div className="stat-icon">✏️</div>
          <div className="stat-value">{stats.todayQuestions}</div>
          <div className="stat-label">Günlük Soru</div>
        </div>

        {/* Study Time */}
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{formatDuration(stats.todayMinutes)}</div>
          <div className="stat-label">Çalışma Süresi</div>
        </div>

        {/* Streak */}
        <div className="stat-card stat-streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Günlük Seri</div>
        </div>

        {/* Tasks Progress */}
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.todayCompleted}/{stats.todayTotal}</div>
          <div className="stat-label">Görevler</div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="section">
        <h2 className="section-title">📋 Yaklaşan Görevler</h2>
        {upcomingTasks.length === 0 ? (
          <div className="card empty-state" style={{ padding: '40px' }}>
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-title">Bugünkü görevlerin tamamlandı!</div>
            <div className="empty-state-text">
              Yeni görev eklemek için Günlük Program sayfasına git.
            </div>
          </div>
        ) : (
          <div className="task-list">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="task-card card">
                <div className="task-time">
                  {formatTime(task.baslangic_saat)} - {formatTime(task.bitis_saat)}
                </div>
                <div className="task-info">
                  <span className="task-ders" style={{ color: task.dersler?.renk || 'var(--primary-500)' }}>
                    {task.dersler?.ikon} {task.dersler?.ad}
                  </span>
                  {task.konu && <span className="task-konu">{task.konu}</span>}
                  {task.soru_sayisi && (
                    <span className="task-meta">{task.soru_sayisi} soru</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-page {
          animation: fadeIn 300ms ease;
        }

        .greeting {
          margin-bottom: 28px;
        }

        .greeting-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .greeting-sub {
          font-size: 0.875rem;
          color: var(--text-tertiary);
          margin-top: 4px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          padding: 20px;
          text-align: center;
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-fast);
        }

        .stat-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .stat-countdown {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: white;
          border: none;
        }

        .stat-countdown .stat-label {
          color: rgba(255, 255, 255, 0.8);
        }

        .stat-streak {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: white;
          border: none;
        }

        .stat-streak .stat-label {
          color: rgba(255, 255, 255, 0.8);
        }

        .stat-icon {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin-top: 4px;
          font-weight: 500;
        }

        .section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .task-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
        }

        .task-time {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          min-width: 100px;
        }

        .task-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .task-ders {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .task-konu {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

        .task-meta {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          background: var(--gray-100);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .greeting-title {
            font-size: 1.25rem;
          }

          .task-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .stat-card {
            padding: 14px;
          }

          .stat-value {
            font-size: 1.375rem;
          }
        }
      `}</style>
    </div>
  );
}
