'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { formatDuration } from '@/lib/utils/date';

export default function IstatistiklerPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const [stats, setStats] = useState({ totalQuestions: 0, totalMinutes: 0, totalDays: 0, maxStreak: 0, dersDistribution: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadStats();
  }, [profile]);

  async function loadStats() {
    setLoading(true);

    const { data: studyData } = await supabase
      .from('calisma_suresi')
      .select('tarih, sure_dakika, soru_sayisi, ders_id, dersler(ad, renk, ikon)')
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
      const color = d.dersler?.renk || 'var(--gray-400)';
      if (!dersMap[name]) dersMap[name] = { name, color, minutes: 0, questions: 0 };
      dersMap[name].minutes += d.sure_dakika || 0;
      dersMap[name].questions += d.soru_sayisi || 0;
    });

    setStats({
      totalQuestions,
      totalMinutes,
      totalDays,
      maxStreak,
      dersDistribution: Object.values(dersMap).sort((a, b) => b.minutes - a.minutes),
    });
    setLoading(false);
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg"></div></div>;
  }

  const maxMinutes = Math.max(...stats.dersDistribution.map(d => d.minutes), 1);

  return (
    <div className="page animate-fade-in">
      <div className="stat-grid">
        <div className="card stat-box">
          <div className="stat-box-icon">✏️</div>
          <div className="stat-box-value">{stats.totalQuestions.toLocaleString()}</div>
          <div className="stat-box-label">Toplam Soru</div>
        </div>
        <div className="card stat-box">
          <div className="stat-box-icon">⏱️</div>
          <div className="stat-box-value">{formatDuration(stats.totalMinutes)}</div>
          <div className="stat-box-label">Toplam Çalışma Süresi</div>
        </div>
        <div className="card stat-box">
          <div className="stat-box-icon">📅</div>
          <div className="stat-box-value">{stats.totalDays}</div>
          <div className="stat-box-label">Toplam Çalışma Günü</div>
        </div>
        <div className="card stat-box">
          <div className="stat-box-icon">🔥</div>
          <div className="stat-box-value">{stats.maxStreak}</div>
          <div className="stat-box-label">En Uzun Seri</div>
        </div>
      </div>

      {stats.dersDistribution.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px' }}>📊 Derslere Göre Dağılım</h3>
          <div className="dist-list">
            {stats.dersDistribution.map(d => (
              <div key={d.name} className="dist-item">
                <div className="dist-header">
                  <span className="dist-name" style={{ color: d.color }}>{d.name}</span>
                  <span className="dist-value">{formatDuration(d.minutes)} • {d.questions} soru</span>
                </div>
                <div className="progress-bar progress-bar-sm">
                  <div className="progress-bar-fill" style={{ width: `${(d.minutes / maxMinutes) * 100}%`, background: d.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .stat-box { text-align: center; padding: 24px; }
        .stat-box-icon { font-size: 1.75rem; margin-bottom: 8px; }
        .stat-box-value { font-size: 1.75rem; font-weight: 700; color: var(--primary-600); }
        .stat-box-label { font-size: 0.8125rem; color: var(--text-tertiary); margin-top: 4px; }
        .dist-list { display: flex; flex-direction: column; gap: 14px; }
        .dist-item { }
        .dist-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .dist-name { font-weight: 600; font-size: 0.875rem; }
        .dist-value { font-size: 0.75rem; color: var(--text-tertiary); }

        @media (max-width: 480px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-box { padding: 16px; }
          .stat-box-value { font-size: 1.375rem; }
        }
      `}</style>
    </div>
  );
}
