'use client';

import { useState, useEffect } from 'react';
import { useUser } from './layout';
import { createClient } from '@/lib/supabase/client';
import { daysUntilYKS, todayStr, formatDuration, formatTime } from '@/lib/utils/date';
import { motion } from 'framer-motion';
import { Target, Activity, PenTool, Timer, Flame, CheckCircle, ListTodo, PartyPopper } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="dashboard-page"
    >
      {/* Greeting */}
      <div className="greeting">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="greeting-title"
        >
          Merhaba, {profile?.full_name?.split(' ')[0]} 👋
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="greeting-sub"
        >
          Bugün harika bir gün olacak!
        </motion.p>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="stats-grid"
      >
        {/* YKS Countdown */}
        <motion.div variants={itemVariants} className="stat-card stat-countdown">
          <div className="stat-icon"><Target size={28} /></div>
          <div className="stat-value">{daysLeft}</div>
          <div className="stat-label">YKS'ye Kalan Gün</div>
        </motion.div>

        {/* Daily Progress */}
        <motion.div variants={itemVariants} className="stat-card">
          <div className="stat-icon stat-icon-primary"><Activity size={28} /></div>
          <div className="stat-value">{completionPercent}%</div>
          <div className="stat-label">Günlük İlerleme</div>
          <div className="progress-bar progress-bar-sm" style={{ marginTop: '12px' }}>
            <div className="progress-bar-fill" style={{ width: `${completionPercent}%` }}></div>
          </div>
        </motion.div>

        {/* Questions */}
        <motion.div variants={itemVariants} className="stat-card">
          <div className="stat-icon stat-icon-blue"><PenTool size={28} /></div>
          <div className="stat-value">{stats.todayQuestions}</div>
          <div className="stat-label">Günlük Soru</div>
        </motion.div>

        {/* Study Time */}
        <motion.div variants={itemVariants} className="stat-card">
          <div className="stat-icon stat-icon-purple"><Timer size={28} /></div>
          <div className="stat-value">{formatDuration(stats.todayMinutes)}</div>
          <div className="stat-label">Çalışma Süresi</div>
        </motion.div>

        {/* Streak */}
        <motion.div variants={itemVariants} className="stat-card stat-streak">
          <div className="stat-icon"><Flame size={28} /></div>
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Günlük Seri</div>
        </motion.div>

        {/* Tasks Progress */}
        <motion.div variants={itemVariants} className="stat-card">
          <div className="stat-icon stat-icon-green"><CheckCircle size={28} /></div>
          <div className="stat-value">{stats.todayCompleted}/{stats.todayTotal}</div>
          <div className="stat-label">Görevler</div>
        </motion.div>
      </motion.div>

      {/* Upcoming Tasks */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="section"
      >
        <div className="section-header">
          <h2 className="section-title"><ListTodo size={20} className="section-icon" /> Yaklaşan Görevler</h2>
        </div>
        
        {upcomingTasks.length === 0 ? (
          <div className="card empty-state" style={{ padding: '60px 20px' }}>
            <PartyPopper size={48} className="empty-state-icon" />
            <div className="empty-state-title">Harika, bugünkü görevlerin tamamlandı!</div>
            <div className="empty-state-text">
              Yeni görev eklemek için Günlük Program sayfasına gidebilirsin.
            </div>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="task-list"
          >
            {upcomingTasks.map((task) => (
              <motion.div variants={itemVariants} key={task.id} className="task-card card card-interactive">
                <div className="task-time">
                  {formatTime(task.baslangic_saat)} - {formatTime(task.bitis_saat)}
                </div>
                <div className="task-divider"></div>
                <div className="task-info">
                  <span className="task-ders" style={{ color: task.dersler?.renk || 'var(--primary-500)' }}>
                    {task.dersler?.ikon} {task.dersler?.ad}
                  </span>
                  {task.konu && <span className="task-konu">{task.konu}</span>}
                  {task.soru_sayisi > 0 && (
                    <span className="task-meta">{task.soru_sayisi} soru</span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <style jsx>{`
        .greeting {
          margin-bottom: 32px;
        }

        .greeting-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .greeting-sub {
          font-size: 1rem;
          color: var(--text-tertiary);
          margin-top: 4px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          padding: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .stat-icon {
          margin-bottom: 12px;
          color: var(--text-secondary);
        }

        .stat-icon-primary { color: var(--primary-500); }
        .stat-icon-blue { color: #3b82f6; }
        .stat-icon-purple { color: #8b5cf6; }
        .stat-icon-green { color: #10b981; }

        .stat-countdown {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: white;
          border: none;
        }

        .stat-countdown .stat-icon,
        .stat-countdown .stat-label {
          color: rgba(255, 255, 255, 0.9);
        }

        .stat-streak {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: white;
          border: none;
        }

        .stat-streak .stat-icon,
        .stat-streak .stat-label {
          color: rgba(255, 255, 255, 0.9);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-tertiary);
          margin-top: 6px;
          font-weight: 500;
        }

        .section {
          margin-bottom: 32px;
        }
        
        .section-header {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-primary);
        }
        
        .section-icon {
          color: var(--primary-500);
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 18px 24px;
        }

        .task-time {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          min-width: 110px;
        }

        .task-divider {
          width: 4px;
          height: 24px;
          background: var(--gray-200);
          border-radius: 4px;
        }

        .task-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          flex: 1;
        }

        .task-ders {
          font-weight: 700;
          font-size: 0.9375rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .task-konu {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .task-meta {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-tertiary);
          background: var(--gray-100);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          margin-left: auto;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .greeting-title {
            font-size: 1.5rem;
          }

          .task-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .task-divider {
            display: none;
          }
          
          .task-meta {
            margin-left: 0;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .stat-card {
            padding: 16px;
          }

          .stat-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </motion.div>
  );
}
