'use client';

import { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Calendar, CalendarDays, BarChart3, Target, 
  RotateCcw, AlertTriangle, BookOpen, Clock, Timer, 
  FileText, Settings, LogOut, Menu, X, BookMarked, Bell, Flame, Leaf
} from 'lucide-react';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: <Home size={19} /> },
  { href: '/dashboard/gunluk-program', label: 'Günlük Program', icon: <Calendar size={19} /> },
  { href: '/dashboard/haftalik-program', label: 'Haftalık Program', icon: <CalendarDays size={19} /> },
  { href: '/dashboard/konu-takibi', label: 'Konu Takibi', icon: <BarChart3 size={19} /> },
  { href: '/dashboard/deneme-analizi', label: 'Deneme Analizi', icon: <Target size={19} /> },
  { href: '/dashboard/tekrarlarim', label: 'Tekrarlarım', icon: <RotateCcw size={19} /> },
  { href: '/dashboard/yapamadiklari', label: 'Yapamadığım Sorular', icon: <AlertTriangle size={19} /> },
  { href: '/dashboard/kaynaklarim', label: 'Kaynaklarım', icon: <BookOpen size={19} /> },
  { href: '/dashboard/istatistikler', label: 'İstatistikler', icon: <Clock size={19} /> },
  { href: '/dashboard/pomodoro', label: 'Pomodoro', icon: <Timer size={19} /> },
  { href: '/dashboard/not-defteri', label: 'Not Defterim', icon: <FileText size={19} /> },
  { href: '/dashboard/hedeflerim', label: 'Hedeflerim', icon: <Target size={19} /> },
  { href: '/dashboard/ayarlar', label: 'Ayarlar', icon: <Settings size={19} /> },
];

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { href: '/dashboard/gunluk-program', label: 'Program', icon: <Calendar size={20} /> },
  { href: '/dashboard/konu-takibi', label: 'Konular', icon: <BarChart3 size={20} /> },
  { href: '/dashboard/deneme-analizi', label: 'Denemeler', icon: <Target size={20} /> },
  { href: '/dashboard/pomodoro', label: 'Pomodoro', icon: <Timer size={20} /> },
];

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // User Gamification Stats
  const [userLevel, setUserLevel] = useState(1);
  const [currentXP, setCurrentXP] = useState(0);
  const [nextLevelXP, setNextLevelXP] = useState(500);
  const [userStreak, setUserStreak] = useState(0);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  // Fetch User Gamification Stats (XP, Level, Streak)
  const fetchUserGamification = useCallback(async (userId) => {
    if (!userId) return;

    // Fetch tasks & completed questions
    const { data: tasks } = await supabase
      .from('gunluk_gorevler')
      .select('tarih, tamamlandi, soru_sayisi')
      .eq('user_id', userId);

    const { data: calisma } = await supabase
      .from('calisma_suresi')
      .select('tarih, sure_dakika, soru_sayisi')
      .eq('user_id', userId);

    const completedTasks = (tasks || []).filter(t => t.tamamlandi);
    const solvedQuestionsFromTasks = completedTasks.reduce((s, t) => s + (t.soru_sayisi || 0), 0);
    const solvedQuestionsFromCalisma = (calisma || []).reduce((s, c) => s + (c.soru_sayisi || 0), 0);
    const totalQuestions = Math.max(solvedQuestionsFromTasks, solvedQuestionsFromCalisma);

    // Total XP Formula: 50 XP per task + 5 XP per question solved
    const totalXP = (completedTasks.length * 50) + (totalQuestions * 5);
    
    // Level Formula: Every 250 XP is 1 Level
    const step = 250;
    const level = Math.max(1, Math.floor(totalXP / step) + 1);
    const xpInLevel = totalXP % step;

    setUserLevel(level);
    setCurrentXP(xpInLevel);
    setNextLevelXP(step);

    // Calculate Streak
    const completedDates = new Set([
      ...completedTasks.map(t => t.tarih),
      ...(calisma || []).map(c => c.tarih)
    ]);

    let streak = 0;
    const checkDate = new Date();
    const todayStr = checkDate.toISOString().split('T')[0];

    if (!completedDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const key = checkDate.toISOString().split('T')[0];
      if (completedDates.has(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    setUserStreak(streak);
  }, [supabase]);

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/giris');
        return;
      }
      setUser(authUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setProfile(profileData);
      await fetchUserGamification(authUser.id);
      setLoading(false);
    }
    loadUser();
  }, [router, supabase, fetchUserGamification]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/giris');
    router.refresh();
  };

  // Get page title from pathname
  const pageTitle = useMemo(() => {
    const match = NAV_ITEMS.find(item => item.href === pathname);
    return match?.label || 'Dashboard';
  }, [pathname]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-inner">
          <div className="loading-logo">
            <BookMarked size={28} />
          </div>
          <div className="spinner spinner-lg"></div>
        </div>
      </div>
    );
  }

  const xpPercent = Math.min(100, Math.round((currentXP / nextLevelXP) * 100));

  return (
    <UserContext.Provider value={{ user, profile, setProfile, userStreak, userLevel }}>
      <div className="dashboard-layout">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay hide-desktop" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          {/* Logo Header */}
          <div className="sidebar-header">
            <Link href="/dashboard" className="sidebar-logo">
              <div className="logo-icon-badge">
                <Leaf size={20} color="#10b981" />
              </div>
              <span className="sidebar-logo-text">calisiyo</span>
            </Link>
            <button className="sidebar-close hide-desktop" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Navigation List */}
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                >
                  <span className={`sidebar-link-icon ${isActive ? 'icon-active' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="sidebar-link-text">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            {/* User Profile & XP Bar */}
            <div className="user-profile-card">
              <div className="user-profile-row">
                <div className="sidebar-avatar">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'K'}
                </div>
                <div className="user-text-info">
                  <span className="user-name-text">{profile?.full_name || 'Kerem Yılmaz'}</span>
                  <span className="user-level-text">Seviye {userLevel}</span>
                </div>
                <button className="btn-logout-small" onClick={handleLogout} title="Çıkış Yap">
                  <LogOut size={16} />
                </button>
              </div>
              
              {/* XP Progress Bar */}
              <div className="xp-progress-wrapper">
                <div className="progress-bar progress-bar-sm">
                  <div className="progress-bar-fill" style={{ width: `${xpPercent}%`, background: '#10b981' }} />
                </div>
                <div className="xp-text font-mono">
                  <strong>{currentXP}</strong> / {nextLevelXP} XP
                </div>
              </div>
            </div>

            {/* Bottom Streak Card */}
            <div className="sidebar-streak-card">
              <div className="streak-card-top">
                <div className="streak-flame-circle">
                  <Flame size={18} color="#ef4444" fill="#fef2f2" />
                </div>
                <div className="streak-numbers">
                  <span className="streak-card-val font-mono">{userStreak || 42}</span>
                  <span className="streak-card-lbl">Günlük Seri</span>
                </div>
              </div>
              <div className="streak-card-sub">Harika gidiyorsun! 🎉</div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="main-wrapper">
          {/* Topbar */}
          <header className="topbar">
            <div className="topbar-left">
              <button className="topbar-menu hide-desktop" onClick={() => setSidebarOpen(true)}>
                <Menu size={22} />
              </button>
              <h1 className="topbar-title">{pageTitle}</h1>
            </div>
            <div className="topbar-right">
              <button className="topbar-btn" title="Bildirimler">
                <Bell size={18} />
              </button>
              <Link href="/dashboard/ayarlar" className="topbar-avatar-link">
                <div className="topbar-avatar">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'K'}
                </div>
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <main className="main-content">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="mobile-nav hide-desktop">
          {MOBILE_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-item ${isActive ? 'mobile-nav-active' : ''}`}
              >
                <span className="mobile-nav-icon">{item.icon}</span>
                <span className="mobile-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <style jsx>{`
        .loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .loading-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .loading-logo {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25);
        }

        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg-secondary);
        }

        /* ═══ Sidebar ═══ */
        .sidebar {
          width: 256px;
          background: #ffffff;
          border-right: 1.5px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 100;
          transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          z-index: 99;
          animation: fadeIn 200ms ease;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 20px 16px;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .logo-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #ecfdf5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-logo-text {
          font-weight: 800;
          font-size: 1.375rem;
          background: linear-gradient(135deg, #059669, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .sidebar-close {
          color: #94a3b8;
          padding: 6px;
          border-radius: 8px;
          transition: all 150ms;
        }

        .sidebar-close:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Nav List */
        .sidebar-nav {
          flex: 1;
          padding: 8px 14px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sidebar-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 16px;
          border-radius: 14px;
          font-size: 0.90rem;
          font-weight: 500;
          color: #475569;
          transition: all 180ms ease;
          text-decoration: none;
        }

        .sidebar-link:hover {
          color: #0f172a;
          background: #f8fafc;
        }

        .sidebar-link-active {
          background: #f0fdf4 !important;
          color: #059669 !important;
          font-weight: 600 !important;
        }

        .sidebar-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #64748b;
          transition: color 180ms ease;
        }

        .icon-active {
          color: #10b981 !important;
        }

        /* Sidebar Footer */
        .sidebar-footer {
          padding: 16px 14px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid #f1f5f9;
          background: #ffffff;
        }

        /* User Profile Card */
        .user-profile-card {
          padding: 4px 2px;
        }

        .user-profile-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .sidebar-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9375rem;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
        }

        .user-text-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          line-height: 1.25;
        }

        .user-name-text {
          font-size: 0.875rem;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-level-text {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .btn-logout-small {
          color: #94a3b8;
          padding: 6px;
          border-radius: 8px;
          transition: all 150ms;
          flex-shrink: 0;
        }

        .btn-logout-small:hover {
          color: #ef4444;
          background: #fef2f2;
        }

        /* XP Bar */
        .xp-progress-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .xp-text {
          font-size: 0.75rem;
          color: #475569;
          text-align: right;
          font-weight: 600;
        }

        /* Streak Card */
        .sidebar-streak-card {
          background: #f8fafc;
          border-radius: 18px;
          padding: 14px 16px;
          border: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .streak-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .streak-flame-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #fef2f2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .streak-numbers {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .streak-card-val {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
        }

        .streak-card-lbl {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
        }

        .streak-card-sub {
          font-size: 0.78125rem;
          color: #059669;
          font-weight: 500;
        }

        /* ═══ Main Wrapper ═══ */
        .main-wrapper {
          flex: 1;
          margin-left: 256px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* ═══ Topbar ═══ */
        .topbar {
          height: var(--topbar-height);
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          flex-shrink: 0;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .topbar-menu {
          color: var(--text-secondary);
          padding: 8px;
          border-radius: var(--radius-xs);
          transition: all var(--transition-fast);
        }

        .topbar-menu:hover {
          background: var(--gray-100);
        }

        .topbar-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .topbar-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .topbar-btn:hover {
          background: var(--gray-50);
          color: var(--text-primary);
        }

        .topbar-avatar-link {
          text-decoration: none;
          margin-left: 4px;
        }

        .topbar-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          transition: all var(--transition-fast);
        }

        .topbar-avatar:hover {
          transform: scale(1.05);
          box-shadow: 0 3px 10px rgba(16, 185, 129, 0.25);
        }

        /* ═══ Main Content ═══ */
        .main-content {
          flex: 1;
          padding: 0 32px 40px;
          max-width: 1240px;
          width: 100%;
        }

        /* ═══ Mobile Nav ═══ */
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--mobile-nav-height);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: space-around;
          z-index: 90;
          padding: 0 8px;
        }

        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          color: var(--text-tertiary);
          font-size: 0.625rem;
          font-weight: 600;
          text-decoration: none;
          padding: 8px 4px;
          border-radius: var(--radius-xs);
          transition: all var(--transition-fast);
          min-width: 56px;
        }

        .mobile-nav-item:hover {
          color: var(--text-secondary);
        }

        .mobile-nav-active {
          color: var(--primary-600);
        }

        .mobile-nav-active .mobile-nav-icon {
          background: var(--primary-50);
          border-radius: var(--radius-xs);
          padding: 4px 12px;
        }

        .mobile-nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
          padding: 4px 12px;
          border-radius: var(--radius-xs);
        }

        /* ═══ Responsive ═══ */
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar-open {
            transform: translateX(0);
          }

          .main-wrapper {
            margin-left: 0;
            padding-bottom: var(--mobile-nav-height);
          }

          .topbar {
            padding: 0 16px;
          }

          .topbar-title {
            font-size: 1.125rem;
          }

          .main-content {
            padding: 0 16px 24px;
          }
        }
      `}</style>
    </UserContext.Provider>
  );
}
