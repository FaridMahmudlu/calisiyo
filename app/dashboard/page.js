'use client';

import { useState, useEffect } from 'react';
import { useUser } from './layout';
import { createClient } from '@/lib/supabase/client';
import { daysUntilYKS, todayStr } from '@/lib/utils/date';
import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, Target, BookOpen, Clock, Info, 
  ChevronLeft, ChevronRight, Flame, Trophy, TrendingUp, 
  Quote, ArrowRight, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function DashboardPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  // Mock data for reference chart & heatmap
  const netData = [
    { date: '15 May', net: 62 },
    { date: '22 May', net: 67 },
    { date: '29 May', net: 71 },
    { date: '5 Haz', net: 75 },
    { date: '12 Haz', net: 78 },
    { date: '19 Haz', net: 84 },
  ];

  // 12 columns x 7 days heatmap levels
  const heatmapLevels = [
    [0,1,2,1,0,0,1],
    [0,2,3,2,1,0,0],
    [1,3,4,3,2,1,0],
    [2,4,3,4,3,2,1],
    [0,1,2,3,4,3,0],
    [1,2,3,4,3,2,1],
    [0,3,4,3,2,1,0],
    [1,2,3,4,2,1,0],
    [0,1,2,3,4,3,1],
    [1,3,4,3,2,1,0],
    [0,2,3,4,3,2,0],
    [1,1,2,3,4,3,1],
  ];

  const daysLeft = daysUntilYKS();

  useEffect(() => {
    setLoading(false);
  }, []);

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
      className="dashboard-container"
    >
      {/* Header */}
      <div className="greeting-header">
        <h1 className="greeting-title">
          Merhaba {profile?.full_name?.split(' ')[0] || 'Kerem'}! 👋
        </h1>
        <p className="greeting-sub">
          Bugün harika bir gün, hedeflerine bir adım daha yaklaş!
        </p>
      </div>

      {/* Row 1: Top 4 Stat Cards */}
      <div className="row-4-grid">
        {/* YKS'ye Kalan Süre */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">YKS'ye Kalan Süre</span>
            <div className="badge-icon badge-icon-green">
              <CalendarIcon size={16} color="#10b981" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">{daysLeft}</div>
            <div className="stat-mini-sub">Gün</div>
          </div>
        </div>

        {/* Bugünkü Hedef */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">Bugünkü Hedef</span>
            <div className="badge-icon badge-icon-pink">
              <Target size={16} color="#f43f5e" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">
              12 <span className="stat-mini-denom">/ 18</span>
            </div>
            <div className="stat-mini-sub">Görev Tamamlandı</div>
            <div className="progress-bar progress-bar-sm" style={{ marginTop: '10px' }}>
              <div className="progress-bar-fill" style={{ width: '66%', background: '#10b981' }}></div>
            </div>
          </div>
        </div>

        {/* Bugünkü Soru */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">Bugünkü Soru</span>
            <div className="badge-icon badge-icon-blue">
              <BookOpen size={16} color="#3b82f6" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">
              320 <span className="stat-mini-denom">/ 450</span>
            </div>
            <div className="stat-mini-sub">Soru Çözüldü</div>
            <div className="progress-bar progress-bar-sm" style={{ marginTop: '10px' }}>
              <div className="progress-bar-fill" style={{ width: '71%', background: '#3b82f6' }}></div>
            </div>
          </div>
        </div>

        {/* Bugünkü Çalışma Süresi */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">Bugünkü Çalışma Süresi</span>
            <div className="badge-icon badge-icon-gray">
              <Info size={16} color="#94a3b8" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">3s 45d</div>
            <div className="stat-mini-sub">Hedef: 5 Saat</div>
            <div className="progress-bar progress-bar-sm" style={{ marginTop: '10px' }}>
              <div className="progress-bar-fill" style={{ width: '75%', background: '#f59e0b' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Bugünkü Program & Çalışma Takvimi */}
      <div className="row-2-grid">
        {/* Bugünkü Program */}
        <div className="card">
          <div className="card-header-flex">
            <h2 className="card-title">Bugünkü Program</h2>
            <span className="badge badge-green font-mono">12 / 18</span>
          </div>

          <div className="subject-progress-list">
            {/* Matematik */}
            <div className="subject-row">
              <div className="subject-icon-box bg-purple-light">
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#8b5cf6' }}>3D</span>
              </div>
              <span className="subject-name">Matematik</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '60%', background: '#8b5cf6' }}></div>
              </div>
              <span className="subject-count font-mono">12 / 20 Soru</span>
            </div>

            {/* Türkçe */}
            <div className="subject-row">
              <div className="subject-icon-box bg-green-light">
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>TR</span>
              </div>
              <span className="subject-name">Türkçe</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '53%', background: '#10b981' }}></div>
              </div>
              <span className="subject-count font-mono">8 / 15 Soru</span>
            </div>

            {/* Fizik */}
            <div className="subject-row">
              <div className="subject-icon-box bg-blue-light">
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6' }}>FZ</span>
              </div>
              <span className="subject-name">Fizik</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '50%', background: '#60a5fa' }}></div>
              </div>
              <span className="subject-count font-mono">5 / 10 Soru</span>
            </div>

            {/* Kimya */}
            <div className="subject-row">
              <div className="subject-icon-box bg-orange-light">
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#f97316' }}>KM</span>
              </div>
              <span className="subject-name">Kimya</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '60%', background: '#f97316' }}></div>
              </div>
              <span className="subject-count font-mono">6 / 10 Soru</span>
            </div>

            {/* Tarih */}
            <div className="subject-row">
              <div className="subject-icon-box bg-amber-light">
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b' }}>TRH</span>
              </div>
              <span className="subject-name">Tarih</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '50%', background: '#f59e0b' }}></div>
              </div>
              <span className="subject-count font-mono">4 / 8 Soru</span>
            </div>

            {/* Biyoloji */}
            <div className="subject-row">
              <div className="subject-icon-box bg-green-light">
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>BY</span>
              </div>
              <span className="subject-name">Biyoloji</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '60%', background: '#10b981' }}></div>
              </div>
              <span className="subject-count font-mono">3 / 5 Soru</span>
            </div>
          </div>

          <Link href="/dashboard/gunluk-program" className="btn btn-soft-green" style={{ marginTop: '20px' }}>
            Tümünü Gör <ChevronRight size={16} />
          </Link>
        </div>

        {/* Çalışma Takvimi (Contribution Heatmap) */}
        <div className="card">
          <div className="card-header-flex">
            <div className="header-with-icon">
              <h2 className="card-title">Çalışma Takvimi</h2>
              <Info size={15} color="#94a3b8" />
            </div>
            <div className="month-selector">
              <span className="month-name">Mayıs 2024</span>
              <div className="month-arrows">
                <ChevronLeft size={16} className="arrow-btn" />
                <ChevronRight size={16} className="arrow-btn" />
              </div>
            </div>
          </div>

          {/* Days Header */}
          <div className="heatmap-days-header">
            <span>Pzt</span><span>Sal</span><span>Çar</span><span>Per</span><span>Cum</span><span>Cmt</span><span>Paz</span>
          </div>

          {/* Heatmap Grid */}
          <div className="heatmap-matrix">
            {heatmapLevels.map((col, cIdx) => (
              <div key={cIdx} className="heatmap-col">
                {col.map((lvl, rIdx) => (
                  <div key={rIdx} className={`heatmap-cell heatmap-level-${lvl}`} />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="heatmap-legend">
            <span>Az</span>
            <div className="legend-cell heatmap-level-0"></div>
            <div className="legend-cell heatmap-level-1"></div>
            <div className="legend-cell heatmap-level-2"></div>
            <div className="legend-cell heatmap-level-3"></div>
            <div className="legend-cell heatmap-level-4"></div>
            <span>Çok</span>
          </div>
        </div>
      </div>

      {/* Row 3: Derslere Göre İlerleme & Seri Takibin */}
      <div className="row-2-grid">
        {/* Derslere Göre İlerleme */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '20px' }}>Derslere Göre İlerleme</h2>
          
          <div className="subject-progress-list">
            <div className="subject-row">
              <div className="subject-icon-box bg-purple-light"><span style={{ fontSize: '11px', fontWeight: '800', color: '#8b5cf6' }}>MAT</span></div>
              <span className="subject-name">Matematik</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '72%', background: '#8b5cf6' }}></div>
              </div>
              <span className="subject-pct font-mono">%72</span>
            </div>

            <div className="subject-row">
              <div className="subject-icon-box bg-green-light"><span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>TRK</span></div>
              <span className="subject-name">Türkçe</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '68%', background: '#10b981' }}></div>
              </div>
              <span className="subject-pct font-mono">%68</span>
            </div>

            <div className="subject-row">
              <div className="subject-icon-box bg-blue-light"><span style={{ fontSize: '11px', fontWeight: '800', color: '#3b82f6' }}>FZK</span></div>
              <span className="subject-name">Fizik</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '45%', background: '#60a5fa' }}></div>
              </div>
              <span className="subject-pct font-mono">%45</span>
            </div>

            <div className="subject-row">
              <div className="subject-icon-box bg-orange-light"><span style={{ fontSize: '11px', fontWeight: '800', color: '#f97316' }}>KMY</span></div>
              <span className="subject-name">Kimya</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '40%', background: '#f97316' }}></div>
              </div>
              <span className="subject-pct font-mono">%40</span>
            </div>

            <div className="subject-row">
              <div className="subject-icon-box bg-green-light"><span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>BYL</span></div>
              <span className="subject-name">Biyoloji</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '55%', background: '#10b981' }}></div>
              </div>
              <span className="subject-pct font-mono">%55</span>
            </div>

            <div className="subject-row">
              <div className="subject-icon-box bg-amber-light"><span style={{ fontSize: '11px', fontWeight: '800', color: '#f59e0b' }}>TRH</span></div>
              <span className="subject-name">Tarih</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-bar-fill" style={{ width: '70%', background: '#f59e0b' }}></div>
              </div>
              <span className="subject-pct font-mono">%70</span>
            </div>
          </div>
        </div>

        {/* Seri Takibin */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '20px' }}>Seri Takibin</h2>

          <div className="streak-section-body">
            {/* Circle Progress Ring */}
            <div className="circle-ring-wrapper">
              <svg className="circle-ring-svg" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" className="ring-bg" />
                <circle 
                  cx="60" cy="60" r="50" 
                  className="ring-fill" 
                  style={{ strokeDasharray: 314, strokeDashoffset: 60 }} 
                />
              </svg>
              <div className="ring-text">
                <span className="ring-num font-mono">42</span>
                <span className="ring-label">Günlük Seri</span>
              </div>
            </div>

            {/* Streak Description */}
            <div className="streak-info-box">
              <p className="streak-p1">Bugün çalışırsan <strong style={{ color: '#0f172a' }}>43 olacak! 🔥</strong></p>
              <p className="streak-p2">Çalışmazsan seri sıfırlanacak.</p>

              <Link href="/dashboard/istatistikler" className="btn btn-soft-green" style={{ marginTop: '20px', width: 'auto' }}>
                Detayları Gör <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: 4 Summary Cards */}
      <div className="row-4-grid">
        {/* Toplam Soru */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">Toplam Soru</span>
            <div className="badge-icon badge-icon-purple">
              <BookOpen size={16} color="#8b5cf6" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">12.540</div>
            <div className="stat-diff-positive font-mono">+320 bugün</div>
          </div>
        </div>

        {/* Toplam Saat */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">Toplam Saat</span>
            <div className="badge-icon badge-icon-pink">
              <Clock size={16} color="#f43f5e" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">158s 45d</div>
            <div className="stat-diff-positive font-mono">+3s 45d bugün</div>
          </div>
        </div>

        {/* En Uzun Çalışma */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">En Uzun Çalışma</span>
            <div className="badge-icon badge-icon-amber">
              <Trophy size={16} color="#f59e0b" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">8 Saat</div>
            <div className="stat-mini-sub">25 Mayıs 2024</div>
          </div>
        </div>

        {/* Ortalama Net */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">Ortalama Net</span>
            <div className="badge-icon badge-icon-purple">
              <TrendingUp size={16} color="#8b5cf6" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">78.4</div>
            <div className="stat-mini-sub">Son 10 Deneme</div>
          </div>
        </div>
      </div>

      {/* Row 5: Son Deneme Sonuçları & Yaklaşan Görevler */}
      <div className="row-2-grid">
        {/* Son Deneme Sonuçları (Line Chart) */}
        <div className="card">
          <div className="card-header-flex" style={{ marginBottom: '16px' }}>
            <h2 className="card-title">Son Deneme Sonuçları</h2>
            <Link href="/dashboard/deneme-analizi" className="link-green">Tümünü Gör</Link>
          </div>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Area type="monotone" dataKey="net" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#netGradient)" dot={{ r: 4, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yaklaşan Görevler */}
        <div className="card">
          <div className="card-header-flex" style={{ marginBottom: '16px' }}>
            <h2 className="card-title">Yaklaşan Görevler</h2>
            <Link href="/dashboard/gunluk-program" className="link-green">Tümünü Gör</Link>
          </div>

          <div className="upcoming-tasks-list">
            <div className="upcoming-task-item">
              <div className="task-icon-sq bg-green-light">
                <CheckCircle2 size={16} color="#10b981" />
              </div>
              <span className="upcoming-task-name">Matematik: Limit - 30 Soru</span>
              <div className="upcoming-task-time">
                <span className="time-day">Bugün</span>
                <span className="time-hour font-mono">15:00</span>
              </div>
            </div>

            <div className="upcoming-task-item">
              <div className="task-icon-sq bg-amber-light">
                <CheckCircle2 size={16} color="#f59e0b" />
              </div>
              <span className="upcoming-task-name">Fizik: Kuvvet - 20 Soru</span>
              <div className="upcoming-task-time">
                <span className="time-day">Bugün</span>
                <span className="time-hour font-mono">17:30</span>
              </div>
            </div>

            <div className="upcoming-task-item">
              <div className="task-icon-sq bg-blue-light">
                <CheckCircle2 size={16} color="#3b82f6" />
              </div>
              <span className="upcoming-task-name">Kimya: Mol Kavramı - 25 Soru</span>
              <div className="upcoming-task-time">
                <span className="time-day">Yarın</span>
                <span className="time-hour font-mono">11:00</span>
              </div>
            </div>

            <div className="upcoming-task-item">
              <div className="task-icon-sq bg-purple-light">
                <CheckCircle2 size={16} color="#8b5cf6" />
              </div>
              <span className="upcoming-task-name">Deneme: TYT Denemesi</span>
              <div className="upcoming-task-time">
                <span className="time-day">27 Mayıs</span>
                <span className="time-hour font-mono">10:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 6: Quote Banner */}
      <div className="quote-banner-card">
        <div className="quote-left">
          <div className="quote-icon-circle">
            <Quote size={20} color="#10b981" />
          </div>
          <p className="quote-text">
            Bugün attığın küçük adımlar, yarınki büyük başarılarının temeli olacak.
          </p>
        </div>
        <div className="quote-illustration">
          📚🪴
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .greeting-header {
          margin-bottom: 4px;
        }

        .greeting-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .greeting-sub {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }

        /* Grids */
        .row-4-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .row-2-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        /* Mini Stat Cards */
        .stat-mini-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .stat-mini-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .stat-mini-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #64748b;
        }

        .badge-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .badge-icon-green { background: #e6f9f0; }
        .badge-icon-pink { background: #ffe4e6; }
        .badge-icon-blue { background: #dbeafe; }
        .badge-icon-purple { background: #f3e8ff; }
        .badge-icon-amber { background: #fef3c7; }
        .badge-icon-gray { background: #f1f5f9; }

        .stat-mini-num {
          font-size: 1.625rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
        }

        .stat-mini-denom {
          font-size: 1.125rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .stat-mini-sub {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 4px;
          font-weight: 500;
        }

        .stat-diff-positive {
          font-size: 0.75rem;
          color: #10b981;
          font-weight: 700;
          margin-top: 4px;
        }

        /* Card Header Flex */
        .card-header-flex {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #0f172a;
        }

        .header-with-icon {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .month-selector {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .month-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #475569;
        }

        .month-arrows {
          display: flex;
          gap: 4px;
          color: #94a3b8;
        }

        .arrow-btn {
          cursor: pointer;
        }

        .arrow-btn:hover {
          color: #0f172a;
        }

        /* Subject Progress List */
        .subject-progress-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .subject-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .subject-icon-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .bg-purple-light { background: #f3e8ff; }
        .bg-green-light { background: #e6f9f0; }
        .bg-blue-light { background: #dbeafe; }
        .bg-orange-light { background: #ffedd5; }
        .bg-amber-light { background: #fef3c7; }

        .subject-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          width: 90px;
        }

        .subject-count {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #64748b;
          white-space: nowrap;
        }

        .subject-pct {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #475569;
        }

        /* Heatmap Grid */
        .heatmap-days-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .heatmap-matrix {
          display: flex;
          justify-content: space-between;
          gap: 6px;
        }

        .heatmap-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .heatmap-cell {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 5px;
          transition: transform 150ms ease;
        }

        .heatmap-cell:hover {
          transform: scale(1.2);
        }

        .heatmap-level-0 { background: #f1f5f9; }
        .heatmap-level-1 { background: #d1fae5; }
        .heatmap-level-2 { background: #6ee7b7; }
        .heatmap-level-3 { background: #10b981; }
        .heatmap-level-4 { background: #047857; }

        .heatmap-legend {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 16px;
        }

        .legend-cell {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }

        /* Streak Circle Ring Section */
        .streak-section-body {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .circle-ring-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          flex-shrink: 0;
        }

        .circle-ring-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .ring-bg {
          fill: none;
          stroke: #f1f5f9;
          stroke-width: 10;
        }

        .ring-fill {
          fill: none;
          stroke: #10b981;
          stroke-width: 10;
          stroke-linecap: round;
        }

        .ring-text {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .ring-num {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
        }

        .ring-label {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 4px;
        }

        .streak-info-box {
          display: flex;
          flex-direction: column;
        }

        .streak-p1 {
          font-size: 0.9375rem;
          color: #475569;
          margin-bottom: 4px;
        }

        .streak-p2 {
          font-size: 0.8125rem;
          color: #94a3b8;
        }

        /* Upcoming tasks */
        .link-green {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #10b981;
        }

        .upcoming-tasks-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .upcoming-task-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #f8fafc;
          border-radius: var(--radius-md);
        }

        .task-icon-sq {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }

        .upcoming-task-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          flex: 1;
        }

        .upcoming-task-time {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.2;
        }

        .time-day {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .time-hour {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #475569;
        }

        /* Quote Banner */
        .quote-banner-card {
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          border-radius: var(--radius-xl);
          padding: 20px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .quote-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .quote-icon-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-xs);
        }

        .quote-text {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0f172a;
        }

        .quote-illustration {
          font-size: 2rem;
        }

        @media (max-width: 1024px) {
          .row-4-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .row-2-grid {
            grid-template-columns: repeat(1, 1fr);
          }
        }

        @media (max-width: 640px) {
          .row-4-grid {
            grid-template-columns: repeat(1, 1fr);
          }
        }
      `}</style>
    </motion.div>
  );
}
