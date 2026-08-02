'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { formatDuration } from '@/lib/utils/date';
import { motion } from 'framer-motion';
import { Target, Clock, CalendarDays, Flame, BarChart3, TrendingUp } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid
} from 'recharts';

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

export default function IstatistiklerPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const [stats, setStats] = useState({ 
    totalQuestions: 0, 
    totalMinutes: 0, 
    totalDays: 0, 
    maxStreak: 0, 
    dersDistribution: [],
    timelineData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadStats();
  }, [profile]);

  async function loadStats() {
    setLoading(true);

    const { data: studyData } = await supabase
      .from('calisma_suresi')
      .select('tarih, sure_dakika, soru_sayisi, dersler(ad, renk, ikon)')
      .eq('user_id', profile.id)
      .order('tarih');

    const totalMinutes = (studyData || []).reduce((s, d) => s + (d.sure_dakika || 0), 0);
    const totalQuestions = (studyData || []).reduce((s, d) => s + (d.soru_sayisi || 0), 0);
    const uniqueDays = [...new Set((studyData || []).map(d => d.tarih))];
    const totalDays = uniqueDays.length;

    // Max streak
    let maxStreak = 0, currentStreak = 0;
    const sortedDays = uniqueDays.sort();
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) { currentStreak = 1; }
      else {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
        currentStreak = diffDays === 1 ? currentStreak + 1 : 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
    }

    // Distribution per ders
    const dersMap = {};
    (studyData || []).forEach(d => {
      const name = d.dersler?.ad || 'Diğer';
      const color = d.dersler?.renk || '#9CA3AF';
      if (!dersMap[name]) dersMap[name] = { name, color, minutes: 0, questions: 0 };
      dersMap[name].minutes += d.sure_dakika || 0;
      dersMap[name].questions += d.soru_sayisi || 0;
    });

    // Timeline data for the last 14 active days
    const timelineMap = {};
    (studyData || []).forEach(d => {
      if (!timelineMap[d.tarih]) {
        // format date as DD/MM
        const parts = d.tarih.split('-');
        const shortDate = `${parts[2]}/${parts[1]}`;
        timelineMap[d.tarih] = { date: shortDate, fullDate: d.tarih, minutes: 0, questions: 0 };
      }
      timelineMap[d.tarih].minutes += d.sure_dakika || 0;
      timelineMap[d.tarih].questions += d.soru_sayisi || 0;
    });

    const timelineData = Object.values(timelineMap)
      .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate))
      .slice(-14);

    setStats({
      totalQuestions,
      totalMinutes,
      totalDays,
      maxStreak,
      dersDistribution: Object.values(dersMap).sort((a, b) => b.minutes - a.minutes),
      timelineData
    });
    setLoading(false);
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg"></div></div>;
  }

  const CustomTooltipDers = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title" style={{ color: data.color }}>{data.name}</p>
          <p className="chart-tooltip-desc">{formatDuration(data.minutes)}</p>
          <p className="chart-tooltip-desc">{data.questions} soru</p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipTimeline = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title">{label}</p>
          <p className="chart-tooltip-desc">
            <span style={{ color: 'var(--primary-500)' }}>Süre: </span> 
            {formatDuration(payload[0].value)}
          </p>
          {payload[1] && (
            <p className="chart-tooltip-desc">
              <span style={{ color: '#8B5CF6' }}>Soru: </span> 
              {payload[1].value}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Genel İstatistikler</h1>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="stat-grid"
      >
        <motion.div variants={itemVariants} className="card stat-box">
          <div className="stat-box-icon"><Target size={32} color="#3B82F6" /></div>
          <div className="stat-box-value">{stats.totalQuestions.toLocaleString()}</div>
          <div className="stat-box-label">Toplam Soru</div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="card stat-box">
          <div className="stat-box-icon"><Clock size={32} color="#10B981" /></div>
          <div className="stat-box-value">{formatDuration(stats.totalMinutes)}</div>
          <div className="stat-box-label">Toplam Çalışma Süresi</div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="card stat-box">
          <div className="stat-box-icon"><CalendarDays size={32} color="#F59E0B" /></div>
          <div className="stat-box-value">{stats.totalDays}</div>
          <div className="stat-box-label">Toplam Çalışma Günü</div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="card stat-box stat-streak-box">
          <div className="stat-box-icon"><Flame size={32} color="white" /></div>
          <div className="stat-box-value text-white">{stats.maxStreak}</div>
          <div className="stat-box-label text-white-80">En Uzun Seri</div>
        </motion.div>
      </motion.div>

      <div className="charts-grid">
        {stats.timelineData.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card chart-card"
          >
            <h3 className="chart-title"><TrendingUp size={20} className="chart-icon" /> Çalışma Gelişimi</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} 
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltipTimeline />} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="minutes" 
                    stroke="var(--primary-500)" 
                    strokeWidth={4}
                    dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-primary)' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary-600)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {stats.dersDistribution.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card chart-card"
          >
            <h3 className="chart-title"><BarChart3 size={20} className="chart-icon" /> Derslere Göre Dağılım</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.dersDistribution} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} 
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltipDers />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                    {stats.dersDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      <style jsx>{`
        .stat-grid { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 20px; 
          margin-bottom: 24px;
        }
        
        .stat-box { 
          text-align: center; 
          padding: 24px; 
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .stat-box-icon { 
          margin-bottom: 16px; 
          padding: 12px;
          border-radius: var(--radius-full);
          background: var(--gray-50);
        }
        
        .stat-streak-box {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          border: none;
        }

        .stat-streak-box .stat-box-icon {
          background: rgba(255,255,255,0.2);
        }

        .text-white { color: white !important; }
        .text-white-80 { color: rgba(255,255,255,0.8) !important; }

        .stat-box-value { 
          font-size: 2rem; 
          font-weight: 800; 
          color: var(--text-primary); 
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        
        .stat-box-label { 
          font-size: 0.875rem; 
          color: var(--text-tertiary); 
          margin-top: 6px; 
          font-weight: 500;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        .chart-card {
          padding: 24px;
        }

        .chart-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .chart-icon {
          color: var(--primary-500);
        }

        .chart-container {
          width: 100%;
          min-height: 300px;
        }

        /* Tooltip provided as global because recharts renders it in a portal/separate node sometimes, or we can just style it directly */
      `}</style>
      <style jsx global>{`
        .chart-tooltip {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border-light);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
        }
        .chart-tooltip-title {
          font-weight: 700;
          font-size: 0.875rem;
          margin-bottom: 4px;
          color: var(--text-primary);
        }
        .chart-tooltip-desc {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
      `}</style>
    </motion.div>
  );
}
