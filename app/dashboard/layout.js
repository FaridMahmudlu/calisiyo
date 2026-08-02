'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, Calendar, CalendarDays, ClipboardList, 
  BarChart2, BookOpen, HelpCircle, RotateCcw, 
  TrendingUp, Timer, NotebookPen, Settings, LogOut, Menu, X, BookMarked
} from 'lucide-react';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Ana Sayfa', icon: <Home size={20} /> },
  { href: '/dashboard/gunluk-program', label: 'Günlük Program', icon: <Calendar size={20} /> },
  { href: '/dashboard/haftalik-program', label: 'Haftalık Program', icon: <CalendarDays size={20} /> },
  { href: '/dashboard/konu-takibi', label: 'Konu Takibi', icon: <ClipboardList size={20} /> },
  { href: '/dashboard/deneme-analizi', label: 'Deneme Analizi', icon: <BarChart2 size={20} /> },
  { href: '/dashboard/kaynaklarim', label: 'Kaynaklarım', icon: <BookOpen size={20} /> },
  { href: '/dashboard/yapamadiklari', label: 'Yapamadıklarım', icon: <HelpCircle size={20} /> },
  { href: '/dashboard/tekrarlarim', label: 'Tekrarlarım', icon: <RotateCcw size={20} /> },
  { href: '/dashboard/istatistikler', label: 'İstatistikler', icon: <TrendingUp size={20} /> },
  { href: '/dashboard/pomodoro', label: 'Pomodoro', icon: <Timer size={20} /> },
  { href: '/dashboard/not-defteri', label: 'Not Defteri', icon: <NotebookPen size={20} /> },
  { href: '/dashboard/ayarlar', label: 'Ayarlar', icon: <Settings size={20} /> },
];

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Ana Sayfa', icon: <Home size={20} /> },
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
        <p style={{ marginTop: '16px', color: 'var(--text-tertiary)' }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, profile, setProfile }}>
      <div className="dashboard-layout">
        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay hide-desktop" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <Link href="/dashboard" className="sidebar-logo">
              <span className="sidebar-logo-icon">
                <BookMarked size={28} className="logo-svg" />
              </span>
              <span className="sidebar-logo-text">calisiyo</span>
            </Link>
            <button className="sidebar-close hide-desktop" onClick={() => setSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? 'sidebar-link-active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-text">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{profile?.full_name}</span>
                <span className="sidebar-user-alan">
                  {profile?.alan_secimi === 'sayisal' && 'Sayısal'}
                  {profile?.alan_secimi === 'esit_agirlik' && 'Eşit Ağırlık'}
                  {profile?.alan_secimi === 'sozel' && 'Sözel'}
                  {profile?.alan_secimi === 'dil' && 'Dil'}
                </span>
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Çıkış Yap">
              <LogOut size={20} />
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="main-wrapper">
          {/* Topbar */}
          <header className="topbar glass">
            <button className="topbar-menu hide-desktop" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="topbar-title">
              {NAV_ITEMS.find(n => n.href === pathname)?.label || 'calisiyo'}
            </h2>
            <div className="topbar-actions">
              <Link href="/dashboard/ayarlar" className="topbar-avatar" title="Ayarlar">
                {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <main className="main-content">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="mobile-nav glass hide-desktop">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${pathname === item.href ? 'mobile-nav-item-active' : ''}`}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <style jsx>{`
        .loading-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .dashboard-layout {
          display: flex;
          min-height: 100vh;
        }

        /* Sidebar */
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
          transition: transform var(--transition-slow);
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
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
          gap: 12px;
        }

        .logo-svg {
          color: var(--primary-500);
        }

        .sidebar-logo-text {
          font-size: 1.25rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.03em;
        }

        .sidebar-close {
          color: var(--text-tertiary);
          padding: 4px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .sidebar-link:hover {
          background: var(--gray-50);
          color: var(--text-primary);
          transform: translateX(4px);
        }

        .sidebar-link-active {
          background: var(--primary-50);
          color: var(--primary-700);
          font-weight: 600;
        }

        .sidebar-link-active:hover {
          transform: none;
        }

        .sidebar-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-400), var(--primary-600));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1rem;
          box-shadow: var(--shadow-sm);
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
        }

        .sidebar-user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sidebar-user-alan {
          font-size: 0.75rem;
          color: var(--text-tertiary);
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
          border-bottom: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .topbar-menu {
          color: var(--text-secondary);
          padding: 4px;
        }

        .topbar-title {
          font-size: 1.125rem;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
        }

        .topbar-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-400), var(--primary-600));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          transition: transform var(--transition-bounce), box-shadow var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .topbar-avatar:hover {
          transform: scale(1.1);
          box-shadow: var(--shadow-md);
        }

        /* Main Content */
        .main-content {
          flex: 1;
          padding: 32px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }

        /* Mobile Nav */
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--mobile-nav-height);
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
          justify-content: center;
          gap: 4px;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          color: var(--text-tertiary);
          font-size: 0.6875rem;
          transition: color var(--transition-fast);
          min-width: 64px;
        }

        .mobile-nav-item-active {
          color: var(--primary-600);
        }

        .mobile-nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-nav-label {
          font-weight: 500;
        }

        /* Responsive */
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

          .main-content {
            padding: 20px 16px;
          }
        }
      `}</style>
    </UserContext.Provider>
  );
}
