'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle, BarChart3, Bell, BookMarked, BookOpen, Calendar, CalendarDays,
  ChevronDown, FileText, Flame, Home, LogOut, Menu, PanelLeftClose,
  PanelLeftOpen, RotateCcw, Settings, Target, Timer, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { todayStr, toLocalDateKey } from '@/lib/utils/date';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({ level: 1, xp: 0, streak: 0 });

  const loadAccount = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.replace('/giris');
      return;
    }

    const authUser = authData.user;
    setUser(authUser);
    const [{ data: profileData, error: profileError }, { data: tasks }, { data: sessions }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', authUser.id).single(),
      supabase.from('gunluk_gorevler').select('tarih,tamamlandi,soru_sayisi').eq('user_id', authUser.id),
      supabase.from('calisma_suresi').select('tarih,sure_dakika,soru_sayisi').eq('user_id', authUser.id),
    ]);

    if (profileError) setError('Profil bilgileri yüklenemedi. Sayfayı yenileyerek tekrar deneyin.');
    setProfile(profileData || null);

    const completed = (tasks || []).filter((task) => task.tamamlandi);
    const questionCount = completed.reduce((sum, task) => sum + (task.soru_sayisi || 0), 0)
      + (sessions || []).reduce((sum, session) => sum + (session.soru_sayisi || 0), 0);
    const xpTotal = completed.length * 50 + questionCount * 5;
    const activeDates = new Set([...completed.map((task) => task.tarih), ...(sessions || []).map((session) => session.tarih)]);
    let streak = 0;
    const cursor = new Date();
    if (!activeDates.has(todayStr())) cursor.setDate(cursor.getDate() - 1);
    while (activeDates.has(toLocalDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStats({ level: Math.floor(xpTotal / 250) + 1, xp: xpTotal % 250, streak });
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadAccount, 0);
    return () => clearTimeout(timer);
  }, [loadAccount]);

  const accountRealtimeTables = useMemo(() => ['gunluk_gorevler', 'calisma_suresi'], []);
  const profileRealtimeTables = useMemo(() => ['profiles'], []);
  useRealtimeRefresh({ tables: accountRealtimeTables, userId: user?.id, onChange: loadAccount });
  useRealtimeRefresh({ tables: profileRealtimeTables, userId: user?.id, filterColumn: 'id', onChange: loadAccount });

  const logout = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError('Çıkış yapılamadı. Lütfen tekrar deneyin.');
      return;
    }
    router.replace('/giris');
  };

  if (loading) {
    return <div className="app-loading" role="status"><span className="brand-mark"><BookMarked size={24} /></span><div className="spinner spinner-lg" /><span>Çalışma alanın hazırlanıyor…</span></div>;
  }

  const initials = profile?.full_name?.trim()?.charAt(0)?.toLocaleUpperCase('tr-TR') || 'Ö';

  return (
    <UserContext.Provider value={{ user, profile, setProfile, error, setError }}>
      <div className={`study-layout ${collapsed ? 'is-collapsed' : ''}`}>
        {sidebarOpen && <button className="sidebar-backdrop" aria-label="Menüyü kapat" onClick={() => setSidebarOpen(false)} />}
        <aside className={`study-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <div className="sidebar-brand-row">
            <Link href="/dashboard" className="sidebar-brand" onClick={() => setSidebarOpen(false)}>
              <span className="brand-mark"><BookMarked size={22} /></span>
              {!collapsed && <span>calisiyo</span>}
            </Link>
            <button className="icon-button sidebar-desktop-toggle" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Paneli genişlet' : 'Paneli daralt'}>
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <button className="icon-button sidebar-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Menüyü kapat"><X size={20} /></button>
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
          </nav>

          <div className="sidebar-account">
            {!collapsed && (
              <div className="study-streak"><Flame size={17} /><span><strong>{stats.streak}</strong> günlük seri</span><small>Seviye {stats.level} · {stats.xp}/250 XP</small></div>
            )}
            <div className="account-row">
              <Link className="avatar" href="/dashboard/ayarlar" aria-label="Profil ayarları">{initials}</Link>
              {!collapsed && <div className="account-copy"><strong>{profile?.full_name || 'Öğrenci'}</strong><span>{profile?.alan_secimi?.replace('_', ' ') || 'Alan seçilmedi'}</span></div>}
              {!collapsed && <button className="icon-button" onClick={logout} aria-label="Çıkış yap"><LogOut size={17} /></button>}
            </div>
          </div>
        </aside>

        <div className="study-main">
          <header className="study-topbar">
            <button className="icon-button mobile-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Menüyü aç"><Menu size={21} /></button>
            <span className="topbar-context">YKS Çalışma Koçu</span>
            <div className="topbar-actions">
              <button className="icon-button" aria-label="Bildirimler"><Bell size={19} /></button>
              <Link className="topbar-profile" href="/dashboard/ayarlar"><span className="avatar avatar-sm">{initials}</span><ChevronDown size={15} /></Link>
            </div>
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
