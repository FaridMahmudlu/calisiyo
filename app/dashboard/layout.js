'use client';

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, Calendar, CalendarDays, ClipboardList, 
  BarChart2, HelpCircle, RotateCcw, TrendingUp, Timer, 
  NotebookPen, Settings, LogOut, Menu, X, BookMarked, Bell, Flame
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
  { href: '/dashboard', label: 'Ana Sayfa', icon: <LayoutDashboard size={20} /> },
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
  const supabase = useMemo(() => createClient(), []);

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
                <BookMarked size={18} />
              </div>
              <span className="sidebar-logo-text">calisiyo</span>
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
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-text">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            {/* User Info */}
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{profile?.full_name || 'Kullanıcı'}</span>
                <span className="sidebar-user-alan">
                  {profile?.alan_secimi === 'sayisal' ? 'Sayısal' :
                   profile?.alan_secimi === 'esit_agirlik' ? 'Eşit Ağırlık' :
                   profile?.alan_secimi === 'sozel' ? 'Sözel' :
                   profile?.alan_secimi === 'dil' ? 'Dil' : ''}
                </span>
              </div>
              <button className="sidebar-logout" onClick={handleLogout} title="Çıkış Yap">
                <LogOut size={16} />
              </button>
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
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
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
          width: var(--sidebar-width);
          background: var(--bg-primary);
          border-right: 1px solid var(--border-light);
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
          backdrop-filter: blur(4px);
          z-index: 99;
          animation: fadeIn 200ms ease;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 20px 20px;
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
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 3px 10px rgba(16, 185, 129, 0.25);
        }

        .sidebar-logo-text {
          font-weight: 800;
          font-size: 1.25rem;
          background: linear-gradient(135deg, #059669, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .sidebar-close {
          color: var(--text-tertiary);
          padding: 6px;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }

        .sidebar-close:hover {
          background: var(--gray-100);
          color: var(--text-primary);
        }

        .sidebar-nav {
          flex: 1;
          padding: 8px 12px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          text-decoration: none;
        }

        .sidebar-link:hover {
          color: var(--text-primary);
          background: var(--gray-50);
        }

        .sidebar-link-active {
          background: var(--primary-50);
          color: var(--primary-600);
          font-weight: 600;
        }

        .sidebar-link-active:hover {
          background: var(--primary-100);
        }

        .sidebar-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sidebar-footer {
          padding: 16px 12px 20px;
          border-top: 1px solid var(--border-light);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast);
        }

        .sidebar-user:hover {
          background: var(--gray-50);
        }

        .sidebar-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .sidebar-user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-user-alan {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .sidebar-logout {
          color: var(--text-tertiary);
          padding: 6px;
          border-radius: 8px;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .sidebar-logout:hover {
          color: var(--error);
          background: var(--error-light);
        }

        /* ═══ Main Wrapper ═══ */
        .main-wrapper {
          flex: 1;
          margin-left: var(--sidebar-width);
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
          border-radius: var(--radius-sm);
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
