'use client';

import { useState, useEffect } from 'react';
import { useUser } from './layout';
import { createClient } from '@/lib/supabase/client';
import { daysUntilYKS, todayStr, formatDuration, formatTime } from '@/lib/utils/date';
import { motion } from 'framer-motion';
import { Target, Activity, PenTool, Timer, Flame, CheckCircle2, ListTodo, PartyPopper, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
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

    // Calculate streak
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

    setUpcomingTasks(tasks?.filter(t => !t.tamamlandi) || []);
    setLoading(false);
  }

  const daysLeft = daysUntilYKS();
  const completionPercent = stats.todayTotal > 0 ? Math.round((stats.todayCompleted / stats.todayTotal) * 100) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
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
      {/* Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="welcome-banner glass"
      >
        <div className="banner-content">
          <div className="welcome-tag">
            <Sparkles size={14} color="var(--primary-600)" />
            <span>YKS Koçluk Paneli</span>
          </div>
          <h1 className="greeting-title">
            Hoş geldin, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="greeting-sub">
            Hedeflerine ulaşmak için harika bir çalışma günü seni bekliyor!
          </p>
        </div>
        <div className="banner-badge">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="stats-grid"
      >
        {/* YKS Countdown Card */}
        <motion.div variants={itemVariants} className="card stat-card stat-card-highlight">
          <div className="stat-card-header">
            <span className="stat-card-title">YKS'ye Kalan Gün</span>
            <div className="stat-icon-wrapper icon-emerald">
              <Target size={22} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-value text-emerald font-mono">{daysLeft}</span>
            <span className="stat-subtext">Hedefe adım adım!</span>
          </div>
        </motion.div>

        {/* Daily Progress */}
        <motion.div variants={itemVariants} className="card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Günlük İlerleme</span>
            <div className="stat-icon-wrapper icon-blue">
              <Activity size={22} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-value font-mono">{completionPercent}%</span>
            <div className="progress-bar progress-bar-sm" style={{ marginTop: '10px' }}>
              <div className="progress-bar-fill" style={{ width: `${completionPercent}%` }}></div>
            </div>
          </div>
        </motion.div>

        {/* Questions Solved */}
        <motion.div variants={itemVariants} className="card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Çözülen Soru</span>
            <div className="stat-icon-wrapper icon-purple">
              <PenTool size={22} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-value font-mono">{stats.todayQuestions}</span>
            <span className="stat-subtext">Bugün çözülen toplam soru</span>
          </div>
        </motion.div>

        {/* Study Time */}
        <motion.div variants={itemVariants} className="card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Çalışma Süresi</span>
            <div className="stat-icon-wrapper icon-amber">
              <Timer size={22} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-value font-mono">{formatDuration(stats.todayMinutes)}</span>
            <span className="stat-subtext">Net çalışma zamanı</span>
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div variants={itemVariants} className="card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Çalışma Serisi</span>
            <div className="stat-icon-wrapper icon-rose">
              <Flame size={22} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-value text-amber font-mono">{stats.streak} <span className="stat-unit">Gün</span></span>
            <span className="stat-subtext">Kesintisiz çalışma</span>
          </div>
        </motion.div>

        {/* Completed Tasks */}
        <motion.div variants={itemVariants} className="card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Tamamlanan Görev</span>
            <div className="stat-icon-wrapper icon-green">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-value font-mono">{stats.todayCompleted} <span className="stat-unit">/ {stats.todayTotal}</span></span>
            <span className="stat-subtext">Bugünkü görevlerin</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Upcoming Tasks Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="section"
      >
        <div className="section-header">
          <div className="section-title-wrapper">
            <ListTodo size={22} color="var(--primary-600)" />
            <h2 className="section-title">Yaklaşan Görevler</h2>
          </div>
          <Link href="/dashboard/gunluk-program" className="btn btn-ghost btn-sm">
            Programı Gör <ArrowRight size={16} />
          </Link>
        </div>
        
        {upcomingTasks.length === 0 ? (
          <div className="card empty-state" style={{ padding: '48px 24px' }}>
            <PartyPopper size={48} className="empty-state-icon" />
            <div className="empty-state-title">Harika! Bekleyen görevin yok 🎉</div>
            <div className="empty-state-text">
              Bugünkü tüm programını tamamladın veya henüz görev eklemedin.
            </div>
            <Link href="/dashboard/gunluk-program" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Görev Ekle
            </Link>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="task-list"
          >
            {upcomingTasks.map((task) => (
              <motion.div variants={itemVariants} key={task.id} className="card task-card card-interactive">
                <div className="task-time-badge font-mono">
                  {formatTime(task.baslangic_saat)} - {formatTime(task.bitis_saat)}
                </div>
                <div className="task-content">
                  <div className="task-ders-tag" style={{ color: task.dersler?.renk || 'var(--primary-600)' }}>
                    <span>{task.dersler?.ikon}</span>
                    <span>{task.dersler?.ad}</span>
                  </div>
                  {task.konu && <span className="task-konu-title">{task.konu}</span>}
                  {task.soru_sayisi > 0 && (
                    <span className="badge badge-neutral font-mono">{task.soru_sayisi} Soru</span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <style jsx>{`
        .dashboard-page {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .welcome-banner {
          background: linear-gradient(135deg, #ffffff 0%, var(--primary-50) 100%);
          border: 1px solid var(--primary-100);
          border-radius: var(--radius-xl);
          padding: 28px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-sm);
        }

        .welcome-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: var(--primary-100);
          color: var(--primary-800);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .greeting-title {
          font-size: 1.625rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }

        .greeting-sub {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .banner-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-primary);
          border-radius: var(--radius-full);
          border: 1px solid var(--border-light);
          color: var(--primary-700);
          font-size: 0.8125rem;
          font-weight: 600;
          box-shadow: var(--shadow-xs);
          white-space: nowrap;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .stat-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 140px;
          position: relative;
        }

        .stat-card-highlight {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: white;
          border: none;
        }

        .stat-card-highlight .stat-card-title,
        .stat-card-highlight .stat-subtext {
          color: rgba(255, 255, 255, 0.85);
        }

        .stat-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .stat-card-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .stat-icon-wrapper {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-emerald { background: var(--primary-50); color: var(--primary-600); }
        .icon-blue { background: #dbeafe; color: #2563eb; }
        .icon-purple { background: #f3e8ff; color: #9333ea; }
        .icon-amber { background: #fef3c7; color: #d97706; }
        .icon-rose { background: #ffe4e6; color: #e11d48; }
        .icon-green { background: #d1fae5; color: #059669; }

        .stat-card-highlight .stat-icon-wrapper {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .stat-value {
          font-size: 2.125rem;
          font-weight: 800;
          line-height: 1.1;
          color: var(--text-primary);
          letter-spacing: -0.03em;
        }

        .stat-card-highlight .stat-value {
          color: white;
        }

        .text-emerald { color: #ffffff; }
        .text-amber { color: #d97706; }

        .stat-unit {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-tertiary);
        }

        .stat-subtext {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin-top: 6px;
          display: block;
          font-weight: 500;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-title-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-card {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .task-time-badge {
          padding: 6px 14px;
          background: var(--gray-100);
          color: var(--text-primary);
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .task-content {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          flex-wrap: wrap;
        }

        .task-ders-tag {
          font-weight: 700;
          font-size: 0.9375rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .task-konu-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .welcome-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
          }

          .stats-grid {
            grid-template-columns: repeat(1, 1fr);
            gap: 14px;
          }

          .task-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </motion.div>
  );
}
