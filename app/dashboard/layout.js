'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle, BarChart3, BookOpen, Calendar, CalendarDays,
  FileText, Flame, Home, Info, LogOut, Menu, PanelLeftClose,
  PanelLeftOpen, RotateCcw, Settings, ShieldCheck, Target, Timer, Trophy, UsersRound, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { parseLocalDate, todayStr, toLocalDateKey } from '@/lib/utils/date';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import JourneyLoader from '@/components/ui/JourneyLoader';
import BrandLogo from '@/components/brand/BrandLogo';
import HeaderActions from '@/components/dashboard/HeaderActions';
import './study.css';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const NAV_GROUPS = [
  {
    label: 'Planlama',
    items: [
      ['/dashboard', 'Dashboard', Home],
      ['/dashboard/gunluk-program', 'Günlük Program', Calendar],
      ['/dashboard/haftalik-program', 'Haftalık Program', CalendarDays],
      ['/dashboard/konu-takibi', 'Konu Takibi', BarChart3],
      ['/dashboard/deneme-analizi', 'Deneme Analizi', Target],
    ],
  },
  {
    label: 'Çalışma',
    items: [
      ['/dashboard/tekrarlarim', 'Tekrarlarım', RotateCcw],
      ['/dashboard/yapamadiklari', 'Yapamadığım Sorular', AlertTriangle],
      ['/dashboard/kaynaklarim', 'Kaynaklarım', BookOpen],
      ['/dashboard/istatistikler', 'İstatistikler', BarChart3],
      ['/dashboard/pomodoro', 'Pomodoro', Timer],
      ['/dashboard/not-defteri', 'Not Defterim', FileText],
      ['/dashboard/hedeflerim', 'Hedeflerim', Target],
      ['/dashboard/gelisim', 'Gelişim ve Seviyem', Trophy],
      ['/dashboard/arkadaslar', 'Çalışma Arkadaşları', UsersRound],
    ],
  },
  { label: 'Hesap', items: [['/dashboard/ayarlar', 'Ayarlar', Settings]] },
];

const MOBILE_NAV = [
  ['/dashboard', 'Ana Sayfa', Home],
  ['/dashboard/gunluk-program', 'Program', Calendar],
  ['/dashboard/konu-takibi', 'Konular', BarChart3],
  ['/dashboard/deneme-analizi', 'Denemeler', Target],
  ['/dashboard/pomodoro', 'Pomodoro', Timer],
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState({ message: '', pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(232);
  const resizingRef = useRef(false);
  const [stats, setStats] = useState({
    level: 1,
    xp: 0,
    totalXp: 0,
    levelTitle: 'Yeni Başlangıç',
    progressPercent: 0,
    xpToNext: 250,
    streak: 0,
    todayMinutes: 0,
  });
  const [streakInfoOpen, setStreakInfoOpen] = useState(false);
  const error = errorState.pathname === pathname ? errorState.message : '';
  const setError = useCallback((message) => {
    setErrorState({ message, pathname });
  }, [pathname]);

  const loadAccount = useCallback(async () => {
    const response = await fetch('/api/account', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/giris');
      return;
    }
    if (response.status === 403 && result.code === 'account_suspended') {
      router.replace('/hesap-askida');
      return;
    }
    if (!response.ok || !result.ok) {
      setError(result.message || 'Çalışma bilgilerin yüklenemedi. Lütfen sayfayı yenileyin.');
      setLoading(false);
      return;
    }

    const authUser = result.user;
    setUser(authUser);
    setProfile(result.profile || null);
    setAdminRole(result.adminRole || null);

    const tasks = result.tasks || [];
    const sessions = result.sessions || [];
    const completed = tasks.filter((task) => task.tamamlandi);
    const questionCount = completed.reduce((sum, task) => sum + (task.soru_sayisi || 0), 0)
      + sessions.reduce((sum, session) => sum + (session.soru_sayisi || 0), 0);
    const xpTotal = completed.length * 50 + questionCount * 5;
    const minutesByDate = sessions.reduce((totals, session) => {
      totals[session.tarih] = (totals[session.tarih] || 0) + Number(session.sure_dakika || 0);
      return totals;
    }, {});
    const activeDates = new Set(Object.entries(minutesByDate).filter(([, minutes]) => minutes >= 30).map(([date]) => date));
    let streak = 0;
    const cursor = parseLocalDate(todayStr());
    if (!activeDates.has(todayStr())) cursor.setDate(cursor.getDate() - 1);
    while (activeDates.has(toLocalDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const progress = result.progress;
    setStats({
      level: progress?.level || Math.floor(xpTotal / 250) + 1,
      xp: progress?.currentLevelXp ?? xpTotal % 250,
      totalXp: progress?.totalXp ?? xpTotal,
      levelTitle: progress?.title || 'Yeni Başlangıç',
      progressPercent: progress?.progressPercent ?? ((xpTotal % 250) / 250) * 100,
      xpToNext: progress?.xpToNext ?? (250 - (xpTotal % 250)),
      streak,
      todayMinutes: minutesByDate[todayStr()] || 0,
    });
    setLoading(false);
  }, [router, setError]);

  useEffect(() => {
    const timer = setTimeout(loadAccount, 0);
    return () => clearTimeout(timer);
  }, [loadAccount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const savedWidth = Number(window.localStorage.getItem('calisiyo-sidebar-width'));
      if (savedWidth >= 210 && savedWidth <= 340) setSidebarWidth(savedWidth);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('calisiyo-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  const resizeSidebar = useCallback((clientX) => {
    setSidebarWidth(Math.min(340, Math.max(210, clientX)));
  }, []);

  const startResize = useCallback((event) => {
    if (collapsed || window.innerWidth <= 980) return;
    event.preventDefault();
    resizingRef.current = true;
    document.body.classList.add('is-resizing-sidebar');
    const move = (moveEvent) => resizeSidebar(moveEvent.clientX);
    const stop = () => {
      resizingRef.current = false;
      document.body.classList.remove('is-resizing-sidebar');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  }, [collapsed, resizeSidebar]);

  const resizeWithKeyboard = (event) => {
    if (event.key === 'ArrowLeft') setSidebarWidth((width) => Math.max(210, width - 10));
    if (event.key === 'ArrowRight') setSidebarWidth((width) => Math.min(340, width + 10));
    if (event.key === 'Home') setSidebarWidth(210);
    if (event.key === 'End') setSidebarWidth(340);
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 980) setSidebarOpen(false);
    else setCollapsed((value) => !value);
  };

  const accountRealtimeTables = useMemo(
    () => ['gunluk_gorevler', 'calisma_suresi', 'xp_events'],
    [],
  );
  const profileRealtimeTables = useMemo(() => ['profiles'], []);
  useRealtimeRefresh({ tables: accountRealtimeTables, userId: user?.id, onChange: loadAccount });
  useRealtimeRefresh({ tables: profileRealtimeTables, userId: user?.id, filterColumn: 'id', onChange: loadAccount });

  const logout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) {
      setError('Çıkış yapılamadı. Lütfen tekrar deneyin.');
      return;
    }
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/giris');
  };

  if (loading) {
    return <JourneyLoader />;
  }

  const initials = profile?.full_name?.trim()?.charAt(0)?.toLocaleUpperCase('tr-TR') || 'Ö';

  return (
    <UserContext.Provider value={{ user, profile, setProfile, adminRole, error, setError, reloadAccount: loadAccount, stats }}>
      <div className={`study-layout ${collapsed ? 'is-collapsed' : ''}`} style={{ '--sidebar-width': `${sidebarWidth}px` }}>
        {sidebarOpen && <button className="sidebar-backdrop" aria-label="Menüyü kapat" onClick={() => setSidebarOpen(false)} />}
        <aside className={`study-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <div className="sidebar-brand-row">
            <Link href="/dashboard" className="sidebar-brand" onClick={() => setSidebarOpen(false)}>
              <BrandLogo markOnly={collapsed} priority />
            </Link>
            <button className="icon-button sidebar-toggle" onClick={toggleSidebar} aria-label={collapsed ? 'Paneli genişlet' : 'Paneli daralt'}>
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <nav className="study-navigation" aria-label="Ana menü">
            {NAV_GROUPS.map((group) => (
              <div className="nav-section" key={group.label}>
                {!collapsed && <span className="nav-section-label">{group.label}</span>}
                {group.items.map(([href, label, Icon]) => {
                  const active = pathname === href;
                  return (
                    <Link key={href} href={href} title={collapsed ? label : undefined} className={`nav-link ${active ? 'is-active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <Icon size={19} />{!collapsed && <span>{label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
            {adminRole && (
              <div className="nav-section admin-nav-section">
                {!collapsed && <span className="nav-section-label">Yönetim</span>}
                <Link href="/admin" title={collapsed ? 'Admin Paneli' : undefined} className="nav-link admin-nav-link" onClick={() => setSidebarOpen(false)}>
                  <ShieldCheck size={19} />{!collapsed && <span>Admin Paneli</span>}
                </Link>
              </div>
            )}
          </nav>

          <div className="sidebar-account">
            {!collapsed && (
              <>
              <div className="study-streak">
                <Flame size={17} />
                <span><strong>{stats.streak}</strong> günlük seri <button className="streak-info-button" aria-label="Seri kuralını açıkla" aria-expanded={streakInfoOpen} onClick={() => setStreakInfoOpen((value) => !value)}><Info size={13} /></button></span>
                <small>Bugün {Math.min(stats.todayMinutes, 30)}/30 dk</small>
                {streakInfoOpen && <div className="streak-info-popover" role="note"><strong>Seri nasıl ilerler?</strong><p>Her gün calisiyo’da Pomodoro veya çalışma kaydı ile en az 30 dakika ders çalış. 30 dakikaya ulaşan gün serine eklenir.</p></div>}
              </div>
              <Link href="/dashboard/gelisim" className="sidebar-level-card" onClick={() => setSidebarOpen(false)}>
                <span><Trophy size={15} /><strong>Seviye {stats.level}</strong><small>{stats.levelTitle}</small></span>
                <i><b style={{ width: `${Math.min(100, Math.max(0, stats.progressPercent))}%` }} /></i>
                <em>{stats.xpToNext} XP sonra yeni seviye</em>
              </Link>
              </>
            )}
            <div className="account-row">
              <Link className="avatar" href="/dashboard/ayarlar" aria-label="Profil ayarları">{initials}</Link>
              {!collapsed && <div className="account-copy"><strong>{profile?.full_name || 'Öğrenci'}</strong><span>{profile?.alan_secimi?.replace('_', ' ') || 'Alan seçilmedi'}</span></div>}
              {!collapsed && <button className="icon-button" onClick={logout} aria-label="Çıkış yap"><LogOut size={17} /></button>}
            </div>
          </div>
          {!collapsed && <div className="sidebar-resizer" role="separator" aria-label="Panel genişliğini değiştir" aria-orientation="vertical" aria-valuemin="210" aria-valuemax="340" aria-valuenow={sidebarWidth} tabIndex={0} onKeyDown={resizeWithKeyboard} onPointerDown={startResize}><span /></div>}
        </aside>

        <div className="study-main">
          <header className="study-topbar">
            <button className="icon-button mobile-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Menüyü aç"><Menu size={21} /></button>
            <span className="topbar-context">YKS Çalışma Koçu</span>
            <HeaderActions user={user} profile={profile} initials={initials} adminRole={adminRole} stats={stats} logout={logout} setError={setError} />
          </header>
          {error && <div className="global-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Uyarıyı kapat"><X size={16} /></button></div>}
          <main className={`study-content ${pathname === '/dashboard' ? 'dashboard-home' : ''}`}>{children}</main>
        </div>

        <nav className="study-mobile-nav" aria-label="Mobil menü">
          {MOBILE_NAV.map(([href, label, Icon]) => <Link key={href} href={href} className={pathname === href ? 'is-active' : ''}><Icon size={20} /><span>{label}</span></Link>)}
        </nav>
      </div>
    </UserContext.Provider>
  );
}
