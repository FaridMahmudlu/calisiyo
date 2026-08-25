'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity, BarChart3, BellRing, ChevronLeft, CircleDollarSign, ClipboardList, CreditCard,
  LogOut, Menu, ShieldCheck, UsersRound, X,
} from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

const NAV_ITEMS = [
  ['overview', 'Genel bakış', BarChart3],
  ['users', 'Kullanıcılar', UsersRound],
  ['activity', 'Canlı akış', Activity],
  ['broadcast', 'Duyuru', BellRing],
  ['audit', 'İşlem günlüğü', ClipboardList],
];

export default function AdminShell({ user, profile, role, children }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = profile?.full_name?.trim()?.charAt(0)?.toLocaleUpperCase('tr-TR') || 'A';

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/giris');
    router.refresh();
  };

  const goTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="admin-shell">
      {menuOpen && <button className="admin-backdrop" aria-label="Menüyü kapat" onClick={() => setMenuOpen(false)} />}
      <aside className={menuOpen ? 'is-open' : ''}>
        <div className="admin-brand-row"><Link href="/admin"><BrandLogo /></Link><button onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat"><X size={19} /></button></div>
        <div className="admin-mode"><span><ShieldCheck size={17} /></span><div><strong>Yönetim merkezi</strong><small>{role.replace('_', ' ')}</small></div></div>
        <nav aria-label="Admin menüsü">{NAV_ITEMS.map(([id, label, Icon]) => <button key={id} onClick={() => goTo(id)}><Icon size={18} /><span>{label}</span></button>)}</nav>
        <Link className="admin-payments-link" href="/admin/odemeler" onClick={() => setMenuOpen(false)}><CreditCard size={18} /><span>Ödeme inceleme</span></Link>
        <Link className="admin-payments-link" href="/admin/icerik-ureticileri" onClick={() => setMenuOpen(false)}><CircleDollarSign size={18} /><span>İçerik üreticileri</span></Link>
        <div className="admin-sidebar-footer">
          <Link href="/dashboard"><ChevronLeft size={17} /> Öğrenci paneline dön</Link>
          <div><span>{initials}</span><div><strong>{profile?.full_name || 'Yönetici'}</strong><small>{user.email}</small></div><button onClick={logout} aria-label="Çıkış yap"><LogOut size={17} /></button></div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><button onClick={() => setMenuOpen(true)} aria-label="Menüyü aç"><Menu size={20} /></button><div><ShieldCheck size={16} /><span>Güvenli yönetici oturumu</span></div><Link href="/dashboard">Öğrenci görünümü</Link></header>
        <main>{children}</main>
      </div>
    </div>
  );
}
