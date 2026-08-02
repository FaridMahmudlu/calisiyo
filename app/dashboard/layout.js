'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, Calendar, CalendarDays, ClipboardList, 
  BarChart2, HelpCircle, RotateCcw, TrendingUp, Timer, 
  NotebookPen, Settings, LogOut, Menu, X, BookOpen, Search, Bell, Sun, ChevronDown, Flame, Leaf
} from 'lucide-react';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
  { href: '/dashboard/gunluk-program', label: 'Günlük Program', icon: <Calendar size={19} /> },
  { href: '/dashboard/haftalik-program', label: 'Haftalık Program', icon: <CalendarDays size={19} /> },
  { href: '/dashboard/konu-takibi', label: 'Konu Takibi', icon: <ClipboardList size={19} /> },
  { href: '/dashboard/deneme-analizi', label: 'Deneme Analizi', icon: <BarChart2 size={19} /> },
  { href: '/dashboard/yapamadiklari', label: 'Yapamadığım Sorular', icon: <HelpCircle size={19} /> },
  { href: '/dashboard/tekrarlarim', label: 'Tekrarlarım', icon: <RotateCcw size={19} /> },
  { href: '/dashboard/istatistikler', label: 'İstatistikler', icon: <TrendingUp size={19} /> },
  { href: '/dashboard/pomodoro', label: 'Pomodoro', icon: <Timer size={19} /> },
  { href: '/dashboard/not-defteri', label: 'Not Defterim', icon: <NotebookPen size={19} /> },
  { href: '/dashboard/ayarlar', label: 'Ayarlar', icon: <Settings size={19} /> },
];

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/dashboard/gunluk-program', label: 'Program', icon: <Calendar size={20} /> },
  { href: '/dashboard/konu-takibi', label: 'Konular', icon: <ClipboardList size={20} /> },
  { href: '/dashboard/deneme-analizi', label: 'Denemeler', icon: <BarChart2 size={20} /> },
  { href: '/dashboard/pomodoro', label: 'Pomodoro', icon: <Timer size={20} /> },
];

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

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
      setLoading(false);
    }
    loadUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/giris');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, profile, setProfile }}>
      <div className="dashboard-layout">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay hide-desktop" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <Link href="/dashboard" className="sidebar-logo">
              <div className="logo-icon-badge">
                <Leaf size={20} color="#10b981" />
              </div>
              <div className="sidebar-logo-titles">
                <span className="logo-title-main">TYT ÇALIŞMA</span>
                <span className="logo-title-sub">KOÇUM</span>
              </div>
            </Link>
            <button className="sidebar-close hide-desktop" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-text">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            {/* User Info & XP Bar */}
            <div className="user-profile-section">
              <div className="user-profile-row">
                <div className="sidebar-avatar">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'K'}
                </div>
                <div className="user-text-info">
                  <span className="user-name-text">{profile?.full_name || 'Kerem Yılmaz'}</span>
                  <span className="user-level-text">Seviye 12</span>
                </div>
                <button className="btn-logout-small" onClick={handleLogout} title="Çıkış Yap">
                  <LogOut size={16} />
                </button>
              </div>
              <div className="xp-progress-wrapper">
                <div className="progress-bar progress-bar-sm">
                  <div className="progress-bar-fill" style={{ width: '78%', background: '#10b981' }}></div>
                </div>
                <span className="xp-text">2340 / 3000 XP</span>
              </div>
            </div>

            {/* Streak Card */}
            <div className="sidebar-streak-card">
              <div className="streak-card-left">
                <div className="streak-flame-circle">
                  <Flame size={18} color="#10b981" />
                </div>
                <div>
                  <div className="streak-card-val">42</div>
                  <div className="streak-card-lbl">Günlük Seri</div>
                </div>
              </div>
              <div className="streak-card-sub">Harika gidiyorsun! 🎉</div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="main-wrapper">
          {/* Topbar matching Reference */}
          <header className="topbar">
            <div className="topbar-left">
              <button className="topbar-menu hide-desktop" onClick={() => setSidebarOpen(true)}>
                <Menu size={22} />
              </button>
            </div>
            <div className="topbar-right">
              <button className="topbar-circle-btn" title="Arama">
                <Search size={18} color="#64748b" />
              </button>
              <button className="topbar-circle-btn" title="Bildirimler">
                <Bell size={18} color="#64748b" />
              </button>
              <button className="topbar-circle-btn" title="Tema">
                <Sun size={18} color="#64748b" />
              </button>
              <Link href="/dashboard/ayarlar" className="topbar-user-dropdown">
                <div className="topbar-avatar-img">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'K'}
                </div>
                <ChevronDown size={14} color="#64748b" />
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
                className={`mobile-nav-item ${isActive ? 'mobile-nav-item-active' : ''}`}
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

        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background-color: #f8fafc;
        }

        /* Sidebar */
        .sidebar {
          width: var(--sidebar-width);
          background: #ffffff;
          border-right: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 100;
          transition: transform var(--transition-base);
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 99;
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
          background: #e6f9f0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-logo-titles {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .logo-title-main {
          font-size: 0.9375rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .logo-title-sub {
          font-size: 0.6875rem;
          font-weight: 700;
          color: #10b981;
          letter-spacing: 0.05em;
        }

        .sidebar-close {
          color: #94a3b8;
          padding: 4px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px 14px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          transition: all var(--transition-fast);
          text-decoration: none;
        }

        .sidebar-link:hover {
          color: #0f172a;
          background: #f8fafc;
        }

        .sidebar-link-active {
          background: #e6f9f0;
          color: #059669;
        }

        .sidebar-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-footer {
          padding: 16px 14px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid #f1f5f9;
        }

        .user-profile-section {
          padding: 8px 4px;
        }

        .user-profile-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .sidebar-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          overflow: hidden;
        }

        .user-text-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          line-height: 1.2;
        }

        .user-name-text {
          font-size: 0.875rem;
          font-weight: 700;
          color: #0f172a;
        }

        .user-level-text {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .btn-logout-small {
          color: #94a3b8;
          padding: 4px;
        }

        .btn-logout-small:hover {
          color: #ef4444;
        }

        .xp-progress-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .xp-text {
          font-size: 0.6875rem;
          color: #94a3b8;
          text-align: right;
          font-weight: 600;
        }

        .sidebar-streak-card {
          background: #f0fdf4;
          border-radius: var(--radius-md);
          padding: 12px 14px;
          border: 1px solid #dcfce7;
        }

        .streak-card-left {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .streak-flame-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-xs);
        }

        .streak-card-val {
          font-size: 1.125rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }

        .streak-card-lbl {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
        }

        .streak-card-sub {
          font-size: 0.75rem;
          color: #059669;
          font-weight: 500;
        }

        /* Main wrapper */
        .main-wrapper {
          flex: 1;
          margin-left: var(--sidebar-width);
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* Topbar */
        .topbar {
          height: var(--topbar-height);
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }

        .topbar-circle-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-xs);
          transition: all var(--transition-fast);
        }

        .topbar-circle-btn:hover {
          background: #f8fafc;
        }

        .topbar-user-dropdown {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          margin-left: 4px;
        }

        .topbar-avatar-img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #38bdf8;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9375rem;
        }

        /* Main Content */
        .main-content {
          flex: 1;
          padding: 0 32px 40px;
          max-width: 1240px;
          width: 100%;
        }

        /* Mobile Nav */
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--mobile-nav-height);
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-around;
          z-index: 90;
        }

        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #94a3b8;
          font-size: 0.6875rem;
          font-weight: 600;
          text-decoration: none;
        }

        .mobile-nav-item-active {
          color: #10b981;
        }

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

          .main-content {
            padding: 0 16px 24px;
          }
        }
      `}</style>
    </UserContext.Provider>
  );
}
