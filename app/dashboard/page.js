'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from './layout';
import { createClient } from '@/lib/supabase/client';
import { daysUntilYKS, yksDateLabel, todayStr, formatDate, formatShortDate, formatDuration, formatTime, GUN_KISA, parseLocalDate, toLocalDateKey } from '@/lib/utils/date';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, Target, BookOpen, Clock, Info, 
  ChevronLeft, ChevronRight, Flame, Trophy, TrendingUp, 
  Quote, ArrowRight, CheckCircle2, Circle, Plus, BarChart2, Zap, Flag
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import JourneyLoader from '@/components/ui/JourneyLoader';
import { createStudyImageUrls } from '@/lib/supabase/storage';

const MOTIVATION_QUOTES = [
  "Bugün attığın küçük adımlar, yarınki büyük başarılarının temeli olacak.",
  "Disiplin, ne istediğin ile şu an ne istediğin arasındaki seçimdir.",
  "Gelecek, bugünden hazırlananlara aittir.",
  "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
  "Zorluklar, başaranların vazgeçmediği yerlerde aşılır.",
  "Derece yapmak bir tesadüf değil, düzenli çalışmanın sonucudur.",
];

export default function DashboardPage() {
  const { profile, stats: accountStats } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);

  // Month navigation for heatmap
  const [currentMonthDate, setCurrentMonthDate] = useState(() => parseLocalDate(todayStr()));

  // Real Database States
  const [todayTasks, setTodayTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [derslerList, setDerslerList] = useState([]);
  const [konuStatsMap, setKonuStatsMap] = useState({});
  const [denemeList, setDenemeList] = useState([]);
  const [calismaSuresiList, setCalismaSuresiList] = useState([]);
  const [goalImageUrl, setGoalImageUrl] = useState('');

  // Quotes
  const currentQuote = useMemo(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    return MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length];
  }, []);

  const daysLeft = daysUntilYKS();

  useEffect(() => {
    let active = true;
    const path = profile?.study_goals?.goalImagePath;
    if (!path) {
      const timer = setTimeout(() => setGoalImageUrl(''), 0);
      return () => { active = false; clearTimeout(timer); };
    }
    createStudyImageUrls(supabase, [path]).then((urls) => {
      if (active) setGoalImageUrl(urls[path] || '');
    });
    return () => { active = false; };
  }, [profile?.study_goals?.goalImagePath, supabase]);

  // Load all dashboard data from Supabase
  const loadDashboardData = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const today = todayStr();

    // 1. Fetch user's subjects (dersler) for their field
    const { data: dersData } = await supabase
      .from('dersler')
      .select('*')
      .eq('curriculum_year', Number(profile.yks_year || 2027))
      .contains('alan', [profile.alan_secimi || 'sayisal'])
      .order('sira');

    const currentDersler = dersData || [];
    setDerslerList(currentDersler);

    // 2. Fetch today's tasks
    const { data: todayTasksData } = await supabase
      .from('gunluk_gorevler')
      .select('*, dersler(ad, renk, ikon, sinav_turu)')
      .eq('user_id', profile.id)
      .eq('tarih', today)
      .order('baslangic_saat');

    setTodayTasks(todayTasksData || []);

    // 3. Fetch all tasks (for total stats & heatmap & streak)
    const { data: allTasksData } = await supabase
      .from('gunluk_gorevler')
      .select('*, dersler(ad, renk, ikon, sinav_turu)')
      .eq('user_id', profile.id)
      .order('tarih', { ascending: false });

    setAllTasks(allTasksData || []);

    // 4. Fetch upcoming tasks (uncompleted, today or future)
    const { data: upcomingData } = await supabase
      .from('gunluk_gorevler')
      .select('*, dersler(ad, renk, ikon)')
      .eq('user_id', profile.id)
      .gte('tarih', today)
      .eq('tamamlandi', false)
      .order('tarih', { ascending: true })
      .order('baslangic_saat', { ascending: true })
      .limit(4);

    setUpcomingTasks(upcomingData || []);

    // 5. Fetch topics & tracking for Subject Progress
    const dersIds = currentDersler.map(d => d.id);
    if (dersIds.length > 0) {
      const [{ data: konularData }, { data: takipData }] = await Promise.all([
        supabase.from('konular').select('id, ders_id').in('ders_id', dersIds),
        supabase.from('konu_takibi').select('konu_id, durum').eq('user_id', profile.id),
      ]);

      const takipMap = {};
      (takipData || []).forEach(t => { takipMap[t.konu_id] = t.durum; });

      const subjectStats = {};
      currentDersler.forEach(d => {
        const dersKonulari = (konularData || []).filter(k => k.ders_id === d.id);
        const total = dersKonulari.length;
        const completed = dersKonulari.filter(k => takipMap[k.id] === 'tamamlandi').length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        subjectStats[d.id] = { total, completed, pct };
      });
      setKonuStatsMap(subjectStats);
    }

    // 6. Fetch Denemeler for net development chart & average net
    const { data: denemeData } = await supabase
      .from('denemeler')
      .select('*, deneme_detaylari(net)')
      .eq('user_id', profile.id)
      .order('tarih', { ascending: true });

    setDenemeList(denemeData || []);

    // 7. Fetch calisma_suresi table records
    const { data: calismaData } = await supabase
      .from('calisma_suresi')
      .select('*')
      .eq('user_id', profile.id);

    setCalismaSuresiList(calismaData || []);

    setLoading(false);
  }, [profile, supabase]);

  useEffect(() => {
    const initialLoad = setTimeout(loadDashboardData, 0);

    // Supabase Real-time subscription for instant dashboard updates
    if (!profile) return () => clearTimeout(initialLoad);
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gunluk_gorevler', filter: `user_id=eq.${profile.id}` }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'denemeler', filter: `user_id=eq.${profile.id}` }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'konu_takibi', filter: `user_id=eq.${profile.id}` }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      clearTimeout(initialLoad);
      supabase.removeChannel(channel);
    };
  }, [profile, supabase, loadDashboardData]);

  // Task Toggle Helper
  const handleToggleTask = async (taskId, currentStatus) => {
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, tamamlandi: !currentStatus } : t));
    await supabase.from('gunluk_gorevler').update({ tamamlandi: !currentStatus }).eq('id', taskId);
    loadDashboardData();
  };

  // Helper to get task duration in minutes
  function getTaskMinutes(t) {
    if (!t.baslangic_saat || !t.bitis_saat) return 40;
    const [bH, bM] = t.baslangic_saat.split(':').map(Number);
    const [eH, eM] = t.bitis_saat.split(':').map(Number);
    const diff = (eH * 60 + eM) - (bH * 60 + bM);
    return diff > 0 ? diff : 40;
  }

  // 📊 CALCULATED DYNAMIC STATS

  // 1. Today's Goal (Görevler)
  const completedTodayTasks = todayTasks.filter(t => t.tamamlandi);
  const todayTasksCount = todayTasks.length;
  const completedTodayCount = completedTodayTasks.length;
  const todayTaskPct = todayTasksCount > 0 ? Math.round((completedTodayCount / todayTasksCount) * 100) : 0;

  // 2. Today's Solved Questions
  const totalPlannedQuestionsToday = todayTasks.reduce((s, t) => s + (t.soru_sayisi || 0), 0);
  const solvedQuestionsToday = completedTodayTasks.reduce((s, t) => s + (t.soru_sayisi || 0), 0);
  const todayQuestionPct = totalPlannedQuestionsToday > 0 ? Math.round((solvedQuestionsToday / totalPlannedQuestionsToday) * 100) : 0;

  // 3. Today's Study Time (Minutes)
  const todayStudyMinutesFromTasks = completedTodayTasks.reduce((s, t) => s + getTaskMinutes(t), 0);
  const todayStudyMinutesFromCalisma = calismaSuresiList
    .filter(c => c.tarih === todayStr())
    .reduce((s, c) => s + (c.sure_dakika || 0), 0);
  const todayTotalMinutes = Math.max(todayStudyMinutesFromTasks, todayStudyMinutesFromCalisma);
  const targetMinutesToday = 300; // 5 hours target
  const todayTimePct = Math.min(100, Math.round((todayTotalMinutes / targetMinutesToday) * 100));

  // 4. Group today's program by ders
  const todayDersGrouped = useMemo(() => {
    const map = {};
    todayTasks.forEach(task => {
      const dersName = task.dersler?.ad || 'Genel';
      const dersIcon = task.dersler?.ikon || '📚';
      const dersColor = task.dersler?.renk || '#10b981';
      if (!map[dersName]) {
        map[dersName] = {
          name: dersName,
          icon: dersIcon,
          color: dersColor,
          totalQuestions: 0,
          solvedQuestions: 0,
          totalTasks: 0,
          completedTasks: 0,
        };
      }
      map[dersName].totalQuestions += task.soru_sayisi || 0;
      if (task.tamamlandi) {
        map[dersName].solvedQuestions += task.soru_sayisi || 0;
        map[dersName].completedTasks += 1;
      }
      map[dersName].totalTasks += 1;
    });
    return Object.values(map);
  }, [todayTasks]);

  // 5. Calculate Contribution Heatmap Matrix (12 columns x 7 days)
  const heatmapMatrix = useMemo(() => {
    // Generate dates for past 12 weeks ending this Sunday
    const todayObj = parseLocalDate(todayStr());
    const dayOfWeek = todayObj.getDay(); // 0 = Sun
    const endDate = new Date(todayObj);
    endDate.setDate(todayObj.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek));

    const activityMap = {};
    allTasks.forEach(t => {
      if (t.tamamlandi) {
        activityMap[t.tarih] = (activityMap[t.tarih] || 0) + (t.soru_sayisi || 1);
      }
    });
    calismaSuresiList.forEach(c => {
      activityMap[c.tarih] = (activityMap[c.tarih] || 0) + (c.sure_dakika || 1);
    });

    const cols = [];
    for (let col = 11; col >= 0; col--) {
      const colDays = [];
      for (let row = 0; row < 7; row++) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - (col * 7 + (6 - row)));
        const dateKey = toLocalDateKey(d);
        const val = activityMap[dateKey] || 0;

        let level = 0;
        if (val > 0 && val <= 30) level = 1;
        else if (val > 30 && val <= 80) level = 2;
        else if (val > 80 && val <= 150) level = 3;
        else if (val > 150) level = 4;

        colDays.push({ date: dateKey, level, val });
      }
      cols.push(colDays);
    }
    return cols;
  }, [allTasks, calismaSuresiList]);

  // Streak and today's minutes are calculated once by the account RPC/layout.
  // Every surface consumes that same live value so a Pomodoro minute cannot
  // disagree with the sidebar or statistics page.
  const currentStreak = Number(accountStats?.streak || 0);

  // 7. Overall Summary Stats
  const totalQuestionsAllTime = useMemo(() => {
    const q1 = allTasks.filter(t => t.tamamlandi).reduce((s, t) => s + (t.soru_sayisi || 0), 0);
    const q2 = calismaSuresiList.reduce((s, c) => s + (c.soru_sayisi || 0), 0);
    return Math.max(q1, q2);
  }, [allTasks, calismaSuresiList]);

  const totalMinutesAllTime = useMemo(
    () => calismaSuresiList.reduce((sum, item) => sum + Number(item.sure_dakika || 0), 0),
    [calismaSuresiList],
  );

  // Max study time in a single day
  const maxStudyDay = useMemo(() => {
    const dayMap = {};
    calismaSuresiList.forEach(c => {
      dayMap[c.tarih] = (dayMap[c.tarih] || 0) + Number(c.sure_dakika || 0);
    });

    let maxMins = 0;
    let maxDate = '';
    Object.entries(dayMap).forEach(([date, mins]) => {
      if (mins > maxMins) {
        maxMins = mins;
        maxDate = date;
      }
    });

    return {
      duration: maxMins > 0 ? formatDuration(maxMins) : '0sa',
      date: maxDate ? formatDate(maxDate) : 'Henüz veri yok'
    };
  }, [calismaSuresiList]);

  // Average Net Calculation
  const averageNet = useMemo(() => {
    if (denemeList.length === 0) return '0.0';
    let totalNets = 0;
    let count = 0;

    denemeList.forEach(d => {
      const denemeNet = (d.deneme_detaylari || []).reduce((sum, det) => sum + (det.net || 0), 0);
      if (denemeNet > 0 || (d.deneme_detaylari && d.deneme_detaylari.length > 0)) {
        totalNets += denemeNet;
        count++;
      }
    });

    return count > 0 ? (totalNets / count).toFixed(1) : '0.0';
  }, [denemeList]);

  // Deneme Net Chart Data
  const chartData = useMemo(() => {
    return denemeList.map(d => {
      const net = (d.deneme_detaylari || []).reduce((sum, det) => sum + (det.net || 0), 0);
      return {
        date: formatShortDate(d.tarih),
        net: parseFloat(net.toFixed(2)),
        yayin: d.yayin || 'Deneme'
      };
    });
  }, [denemeList]);

  if (loading) {
    return <JourneyLoader compact label="Dashboard hazırlanıyor" />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="dashboard-container"
    >
      {/* Header */}
      <div className="dashboard-hero-header">
        <div className="greeting-block">
          <h1 className="greeting-title">
            Merhaba, {profile?.full_name?.split(' ')[0] || 'Öğrenci'}! 👋
          </h1>
          <p className="greeting-sub">
            Bugün harika bir gün, hedeflerine bir adım daha yaklaş.
          </p>
        </div>

        {(profile?.study_goals?.university || profile?.study_goals?.program) && (
          <Link
            href="/dashboard/hedeflerim"
            className={`minimal-goal-pill ${goalImageUrl ? 'has-image' : ''}`}
            style={goalImageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(6,33,26,.92) 0%, rgba(6,33,26,.82) 100%), url(${goalImageUrl})` } : undefined}
          >
            <div className="goal-pill-badge">
              <Target size={15} />
            </div>
            <div className="goal-pill-info">
              <span className="goal-pill-label">Hedef</span>
              <div className="goal-pill-target">
                {profile.study_goals.university && (
                  <strong className="goal-pill-uni">{profile.study_goals.university}</strong>
                )}
                {profile.study_goals.university && profile.study_goals.program && (
                  <span className="goal-pill-dot">·</span>
                )}
                {profile.study_goals.program && (
                  <span className="goal-pill-prog">{profile.study_goals.program}</span>
                )}
              </div>
            </div>
            <ArrowRight size={15} className="goal-pill-arrow" />
          </Link>
        )}
      </div>

      {/* Row 1: Top 4 Stat Cards */}
      <div className="row-4-grid">
        {/* YKS sınavına kalan süre */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">YKS&apos;ye Kalan Süre</span>
            <div className="badge-icon badge-icon-green">
              <CalendarIcon size={16} color="#10b981" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">{daysLeft ?? '—'}</div>
            <div className="stat-mini-sub">{daysLeft == null ? 'Tahmini tarih geçti' : `Gün · Tahmini ${yksDateLabel()}`}</div>
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
              {completedTodayCount} <span className="stat-mini-denom">/ {todayTasksCount}</span>
            </div>
            <div className="stat-mini-sub">Görev Tamamlandı</div>
            <div className="progress-bar progress-bar-sm" style={{ marginTop: '10px' }}>
              <div className="progress-bar-fill" style={{ width: `${todayTaskPct}%`, background: '#10b981' }}></div>
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
              {solvedQuestionsToday} <span className="stat-mini-denom">/ {totalPlannedQuestionsToday}</span>
            </div>
            <div className="stat-mini-sub">Soru Çözüldü</div>
            <div className="progress-bar progress-bar-sm" style={{ marginTop: '10px' }}>
              <div className="progress-bar-fill" style={{ width: `${todayQuestionPct}%`, background: '#3b82f6' }}></div>
            </div>
          </div>
        </div>

        {/* Bugünkü Çalışma Süresi */}
        <div className="card stat-mini-card">
          <div className="stat-mini-header">
            <span className="stat-mini-title">Bugünkü Çalışma Süresi</span>
            <div className="badge-icon badge-icon-amber">
              <Clock size={16} color="#f59e0b" />
            </div>
          </div>
          <div className="stat-mini-body">
            <div className="stat-mini-num font-mono">{formatDuration(todayTotalMinutes)}</div>
            <div className="stat-mini-sub">Hedef: 5 Saat</div>
            <div className="progress-bar progress-bar-sm" style={{ marginTop: '10px' }}>
              <div className="progress-bar-fill" style={{ width: `${todayTimePct}%`, background: '#f59e0b' }}></div>
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
            <span className="badge badge-green font-mono">{completedTodayCount} / {todayTasksCount}</span>
          </div>

          {todayDersGrouped.length === 0 ? (
            <div className="program-empty">
              <CalendarIcon size={36} className="program-empty-icon" />
              <p className="program-empty-title">Bugün için görev eklenmemiş</p>
              <p className="program-empty-text">Günlük çalışma programını oluşturarak hedeflerini takip et.</p>
              <Link href="/dashboard/gunluk-program" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
                <Plus size={16} /> Görev Ekle
              </Link>
            </div>
          ) : (
            <div className="subject-progress-list">
              {todayDersGrouped.map((item, idx) => {
                const pct = item.totalQuestions > 0 ? Math.round((item.solvedQuestions / item.totalQuestions) * 100) : (item.completedTasks / item.totalTasks) * 100;
                return (
                  <div key={idx} className="subject-row">
                    <div className="subject-icon-box" style={{ background: `${item.color}15` }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: item.color }}>
                        {item.name.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <span className="subject-name">{item.name}</span>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: item.color }}></div>
                    </div>
                    <span className="subject-count font-mono">
                      {item.solvedQuestions} / {item.totalQuestions} Soru
                    </span>
                  </div>
                );
              })}
            </div>
          )}

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
              <span className="month-name">
                {currentMonthDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Days Header */}
          <div className="heatmap-days-header">
            <span>Pzt</span><span>Sal</span><span>Çar</span><span>Per</span><span>Cum</span><span>Cmt</span><span>Paz</span>
          </div>

          {/* Heatmap Grid */}
          <div className="heatmap-matrix">
            {heatmapMatrix.map((col, cIdx) => (
              <div key={cIdx} className="heatmap-col">
                {col.map((cell, rIdx) => (
                  <div 
                    key={rIdx} 
                    className={`heatmap-cell heatmap-level-${cell.level}`}
                    title={`${cell.date}: ${cell.val} çalışma aktivitesi`}
                  />
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
            {derslerList.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>
                Alanınıza uygun dersler bulunamadı.
              </div>
            ) : (
              derslerList.map((ders) => {
                const stats = konuStatsMap[ders.id] || { pct: 0 };
                return (
                  <div key={ders.id} className="subject-row">
                    <div className="subject-icon-box" style={{ background: `${ders.renk}15` }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: ders.renk }}>
                        {ders.ad.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <span className="subject-name">{ders.ad}</span>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-bar-fill" style={{ width: `${stats.pct}%`, background: ders.renk }}></div>
                    </div>
                    <span className="subject-pct font-mono">%{stats.pct}</span>
                  </div>
                );
              })
            )}
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
                  style={{ 
                    strokeDasharray: 314, 
                    strokeDashoffset: Math.max(0, 314 - (Math.min(30, currentStreak) / 30) * 314) 
                  }} 
                />
              </svg>
              <div className="ring-text">
                <span className="ring-num font-mono">{currentStreak}</span>
                <span className="ring-label">Günlük Seri</span>
              </div>
            </div>

            {/* Streak Description */}
            <div className="streak-info-box">
              <p className="streak-p1">
                {accountStats?.streakQualified ? <><strong style={{ color: '#0f172a' }}>Bugünkü seri hedefin tamamlandı! 🔥</strong></> : <>Bugün <strong style={{ color: '#0f172a' }}>{Math.max(0, 30 - Number(accountStats?.todayMinutes || 0))} dakika daha odaklan</strong></>}
              </p>
              <p className="streak-p2">
                {Number(accountStats?.todayMinutes || 0)} / 30 dakika · Seri yalnızca gerçek çalışma kayıtlarından hesaplanır.
              </p>

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
            <div className="stat-mini-num font-mono">{totalQuestionsAllTime.toLocaleString('tr-TR')}</div>
            <div className="stat-diff-positive font-mono">+{solvedQuestionsToday} bugün</div>
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
            <div className="stat-mini-num font-mono">{formatDuration(totalMinutesAllTime)}</div>
            <div className="stat-diff-positive font-mono">+{formatDuration(todayTotalMinutes)} bugün</div>
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
            <div className="stat-mini-num font-mono">{maxStudyDay.duration}</div>
            <div className="stat-mini-sub">{maxStudyDay.date}</div>
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
            <div className="stat-mini-num font-mono">{averageNet}</div>
            <div className="stat-mini-sub">Tüm Denemeler</div>
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

          {chartData.length === 0 ? (
            <div className="program-empty" style={{ padding: '32px 0' }}>
              <BarChart2 size={36} className="program-empty-icon" />
              <p className="program-empty-title">Henüz deneme eklenmemiş</p>
              <p className="program-empty-text">Deneme sonuçlarını ekleyerek net gelişim grafiklerini gör.</p>
              <Link href="/dashboard/deneme-analizi" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
                <Plus size={16} /> Deneme Ekle
              </Link>
            </div>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Area type="monotone" dataKey="net" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#netGradient)" dot={{ r: 4, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Yaklaşan Görevler */}
        <div className="card">
          <div className="card-header-flex" style={{ marginBottom: '16px' }}>
            <h2 className="card-title">Yaklaşan Görevler</h2>
            <Link href="/dashboard/gunluk-program" className="link-green">Tümünü Gör</Link>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="program-empty" style={{ padding: '32px 0' }}>
              <CheckCircle2 size={36} className="program-empty-icon" style={{ color: 'var(--primary-400)' }} />
              <p className="program-empty-title">Yaklaşan görev bulunmuyor</p>
              <p className="program-empty-text">Harika! Bekleyen tüm görevlerini tamamladın.</p>
            </div>
          ) : (
            <div className="upcoming-tasks-list">
              {upcomingTasks.map((t) => (
                <div key={t.id} className="upcoming-task-item">
                  <button 
                    className="task-check-icon-btn" 
                    onClick={() => handleToggleTask(t.id, t.tamamlandi)}
                    title="Tamamla"
                  >
                    <Circle size={18} color="var(--gray-400)" />
                  </button>
                  <div className="upcoming-task-info">
                    <span className="upcoming-task-ders" style={{ color: t.dersler?.renk || 'var(--primary-600)' }}>
                      {t.dersler?.ikon} {t.dersler?.ad}
                    </span>
                    <span className="upcoming-task-konu">
                      {t.konu ? t.konu : `${t.soru_sayisi ? t.soru_sayisi + ' Soru' : 'Çalışma Görevi'}`}
                    </span>
                  </div>
                  <div className="upcoming-task-time">
                    <span className="time-day">
                      {t.tarih === todayStr() ? 'Bugün' : formatShortDate(t.tarih)}
                    </span>
                    {t.baslangic_saat && (
                      <span className="time-hour font-mono">{formatTime(t.baslangic_saat)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 6: Quote Banner */}
      <div className="quote-banner-card">
        <div className="quote-left">
          <div className="quote-icon-circle">
            <Quote size={20} color="#10b981" />
          </div>
          <p className="quote-text">
            {currentQuote}
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

        .dashboard-hero-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: -4px;
        }

        .greeting-block {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .greeting-title {
          font-size: 1.5rem;
          font-weight: 750;
          color: #0f172a;
          letter-spacing: -0.025em;
          line-height: 1.25;
          margin: 0;
        }

        .greeting-sub {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 450;
          margin: 0;
          line-height: 1.4;
        }

        .minimal-goal-pill {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px 8px 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          text-decoration: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          background-position: center;
          background-size: cover;
          max-width: 100%;
        }

        .minimal-goal-pill:hover {
          border-color: #10b981;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px -3px rgba(16, 185, 129, 0.12), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
        }

        .minimal-goal-pill.has-image {
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 16px rgba(6, 33, 26, 0.22);
        }

        .minimal-goal-pill.has-image:hover {
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 8px 24px rgba(6, 33, 26, 0.32);
        }

        .goal-pill-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ecfdf5;
          color: #059669;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid #a7f3d0;
          transition: transform 0.2s ease;
        }

        .minimal-goal-pill:hover .goal-pill-badge {
          transform: scale(1.08);
          background: #d1fae5;
        }

        .has-image .goal-pill-badge {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.3);
          color: #6ee7b7;
          backdrop-filter: blur(6px);
        }

        .goal-pill-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .goal-pill-label {
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #059669;
          line-height: 1;
        }

        .has-image .goal-pill-label {
          color: #a7f3d0;
        }

        .goal-pill-target {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.84rem;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .goal-pill-uni {
          font-weight: 750;
          color: #0f172a;
        }

        .goal-pill-dot {
          color: #94a3b8;
          font-weight: 400;
        }

        .goal-pill-prog {
          font-weight: 500;
          color: #475569;
        }

        .has-image .goal-pill-uni {
          color: #ffffff;
        }

        .has-image .goal-pill-dot {
          color: rgba(255, 255, 255, 0.5);
        }

        .has-image .goal-pill-prog {
          color: #e2e8f0;
        }

        .goal-pill-arrow {
          color: #94a3b8;
          flex-shrink: 0;
          margin-left: 2px;
          transition: transform 0.2s ease, color 0.2s ease;
        }

        .minimal-goal-pill:hover .goal-pill-arrow {
          color: #059669;
          transform: translateX(3px);
        }

        .has-image .goal-pill-arrow {
          color: rgba(255, 255, 255, 0.7);
        }

        .has-image .minimal-goal-pill:hover .goal-pill-arrow {
          color: #ffffff;
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
          text-transform: capitalize;
        }

        /* Program empty */
        .program-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          text-align: center;
        }

        .program-empty-icon {
          color: var(--gray-300);
          margin-bottom: 8px;
        }

        .program-empty-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .program-empty-text {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
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

        .subject-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          width: 100px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          cursor: pointer;
        }

        .heatmap-cell:hover {
          transform: scale(1.25);
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
          transition: stroke-dashoffset 800ms ease;
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
          text-decoration: none;
        }

        .link-green:hover {
          text-decoration: underline;
        }

        .upcoming-tasks-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .upcoming-task-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: #f8fafc;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          transition: all var(--transition-fast);
        }

        .upcoming-task-item:hover {
          border-color: var(--primary-300);
          background: #ffffff;
        }

        .task-check-icon-btn {
          cursor: pointer;
          background: none;
          border: none;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 150ms ease;
        }

        .task-check-icon-btn:hover {
          transform: scale(1.15);
        }

        .upcoming-task-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .upcoming-task-ders {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .upcoming-task-konu {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .upcoming-task-time {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.2;
          flex-shrink: 0;
        }

        .time-day {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
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
          flex-shrink: 0;
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

        @media (max-width: 768px) {
          .dashboard-hero-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .minimal-goal-pill {
            width: 100%;
            border-radius: 14px;
            justify-content: space-between;
            padding: 10px 14px;
          }

          .goal-pill-target {
            white-space: normal;
            flex-wrap: wrap;
          }
        }

        @media (max-width: 640px) {
          .row-4-grid {
            grid-template-columns: repeat(1, 1fr);
          }

          .quote-banner-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .quote-illustration {
            align-self: flex-end;
          }
        }
      `}</style>
    </motion.div>
  );
}
