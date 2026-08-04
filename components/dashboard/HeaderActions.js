'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell, BellRing, CheckCheck, ChevronDown, Clock3, LogOut,
  Sparkles, Target, Timer, UserRound,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { todayStr } from '@/lib/utils/date';

const KIND_ICONS = {
  success: Sparkles,
  reminder: Clock3,
  warning: Target,
  info: Timer,
};

const formatNotificationTime = (value) => {
  const date = new Date(value);
  const distance = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(distance / 60000));
  if (minutes < 1) return 'Şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} sa önce`;
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(date);
};

export default function HeaderActions({ user, profile, initials, logout, setError }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const supabase = useMemo(() => createClient(), []);
  const userId = user?.id;
  const rootRef = useRef(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setNotificationsLoading(true);
    await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayStr() }),
    }).catch(() => null);
    const { data, error } = await supabase
      .from('notifications')
      .select('id,kind,title,body,action_url,read_at,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    setNotificationsLoading(false);
    if (error) {
      setError('Bildirimlerin şu anda yüklenemiyor. Lütfen tekrar dene.');
      return;
    }
    setNotifications(data || []);
  }, [setError, supabase, userId]);

  useEffect(() => {
    const timer = setTimeout(loadNotifications, 0);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          loadNotifications();
          if (
            payload.eventType === 'INSERT'
            && profile?.notifications_enabled !== false
            && typeof Notification !== 'undefined'
            && Notification.permission === 'granted'
            && document.visibilityState !== 'visible'
          ) {
            const incoming = payload.new;
            new Notification(incoming.title, { body: incoming.body, tag: incoming.id });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, profile?.notifications_enabled, supabase, userId]);

  useEffect(() => {
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpenMenu(null);
    };
    const closeWithKeyboard = (event) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithKeyboard);
    };
  }, []);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const markRead = async (id) => {
    setNotifications((items) => items.map((item) => (
      item.id === id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item
    )));
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  };

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || readAt })));
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) setError('Bildirimler okundu olarak işaretlenemedi.');
  };

  const openNotification = async (item) => {
    if (!item.read_at) await markRead(item.id);
    setOpenMenu(null);
    if (item.action_url) router.push(item.action_url);
  };

  const toggleMenu = (name) => setOpenMenu((current) => (current === name ? null : name));
  const fieldLabel = profile?.alan_secimi?.replace('_', ' ') || 'Alan seçilmedi';
  const panelMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: -6, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -4, scale: 0.98 } };

  return (
    <div className="topbar-actions" ref={rootRef}>
      <div className="topbar-action-wrap">
        <button
          className={`icon-button notification-button ${openMenu === 'notifications' ? 'is-active' : ''}`}
          aria-label={unreadCount ? `${unreadCount} okunmamış bildirim` : 'Bildirimler'}
          aria-expanded={openMenu === 'notifications'}
          aria-controls="notifications-panel"
          onClick={() => toggleMenu('notifications')}
        >
          {unreadCount ? <BellRing size={19} /> : <Bell size={19} />}
          {unreadCount > 0 && <span className="notification-badge">{Math.min(unreadCount, 9)}{unreadCount > 9 ? '+' : ''}</span>}
        </button>
        <AnimatePresence>
          {openMenu === 'notifications' && (
            <motion.section
              {...panelMotion}
              transition={{ duration: 0.16 }}
              className="topbar-popover notification-popover"
              id="notifications-panel"
              aria-label="Bildirimler"
            >
              <div className="popover-heading">
                <div><strong>Bildirimler</strong><span>{unreadCount ? `${unreadCount} yeni gelişme` : 'Her şey güncel'}</span></div>
                <button onClick={markAllRead} disabled={!unreadCount} aria-label="Tüm bildirimleri okundu işaretle"><CheckCheck size={17} />Tümünü oku</button>
              </div>
              <div className="notification-list">
                {notificationsLoading && (
                  <div className="notification-skeleton" aria-label="Bildirimler yükleniyor">
                    <i /><span><b /><b /></span>
                    <i /><span><b /><b /></span>
                  </div>
                )}
                {!notificationsLoading && notifications.length === 0 && (
                  <div className="notification-empty"><Bell size={22} /><strong>Henüz bildirim yok</strong><span>Plan ve çalışma gelişmelerin burada görünür.</span></div>
                )}
                {!notificationsLoading && notifications.map((item) => {
                  const Icon = KIND_ICONS[item.kind] || Bell;
                  return (
                    <button key={item.id} className={`notification-item ${item.read_at ? '' : 'is-unread'}`} onClick={() => openNotification(item)}>
                      <span className={`notification-kind is-${item.kind}`}><Icon size={16} /></span>
                      <span className="notification-copy"><strong>{item.title}</strong><span>{item.body}</span><time>{formatNotificationTime(item.created_at)}</time></span>
                      {!item.read_at && <i aria-label="Okunmamış" />}
                    </button>
                  );
                })}
              </div>
              <Link className="popover-footer-link" href="/dashboard/ayarlar" onClick={() => setOpenMenu(null)}>Bildirim ayarlarını yönet</Link>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <div className="topbar-action-wrap">
        <button
          className={`topbar-profile ${openMenu === 'profile' ? 'is-active' : ''}`}
          aria-label="Profil menüsü"
          aria-expanded={openMenu === 'profile'}
          aria-controls="profile-panel"
          onClick={() => toggleMenu('profile')}
        >
          <span className="avatar avatar-sm">{initials}</span><ChevronDown size={15} />
        </button>
        <AnimatePresence>
          {openMenu === 'profile' && (
            <motion.section {...panelMotion} transition={{ duration: 0.16 }} className="topbar-popover profile-popover" id="profile-panel" aria-label="Profil menüsü">
              <div className="profile-popover-user"><span className="avatar">{initials}</span><div><strong>{profile?.full_name || 'Öğrenci'}</strong><span>{user?.email}</span><small>{fieldLabel}</small></div></div>
              <div className="profile-popover-links">
                <Link href="/dashboard/ayarlar" onClick={() => setOpenMenu(null)}><UserRound size={17} /><span><strong>Profil ve ayarlar</strong><small>Hesap, alan ve bildirim tercihleri</small></span></Link>
                <Link href="/dashboard/hedeflerim" onClick={() => setOpenMenu(null)}><Target size={17} /><span><strong>Hedeflerim</strong><small>YKS hedeflerini düzenle</small></span></Link>
              </div>
              <button className="profile-logout" onClick={logout}><LogOut size={17} />Güvenli çıkış yap</button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
