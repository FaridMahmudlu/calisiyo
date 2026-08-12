'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, BookOpenCheck, Check, Clipboard, Clock3, Coffee,
  Crown, DoorOpen, Flame, Goal, LockKeyhole, LogOut, Sparkles, UsersRound,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../../layout';
import DataState from '@/components/ui/DataState';
import Modal from '@/components/ui/Modal';
import '../classroom.css';

const STATUS_META = {
  studying: { label: 'Çalışıyor', icon: BookOpenCheck },
  break: { label: 'Molada', icon: Coffee },
  online: { label: 'Sınıfta', icon: Sparkles },
  offline: { label: 'Çevrimdışı', icon: Clock3 },
};

const initials = (name) => String(name || 'Ö')
  .split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toLocaleUpperCase('tr-TR');

export default function ClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId;
  const { user } = useUser();
  const userId = user?.id;
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('online');
  const [focusSubject, setFocusSubject] = useState('');
  const [presenceBusy, setPresenceBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const presenceStartedRef = useRef(false);

  const loadRoom = useCallback(async ({ quiet = false } = {}) => {
    if (!groupId || !userId) return;
    if (!quiet) setLoading(true);
    const { data: roomData, error: roomError } = await supabase.rpc('get_group_room', { p_group_id: groupId });
    if (roomError) {
      setError(roomError.message || 'Çalışma sınıfı yüklenemedi.');
    } else {
      setData(roomData);
      setError('');
      const me = roomData?.members?.find((member) => member.userId === userId);
      if (me?.presence && me.presence !== 'offline') setStatus(me.presence);
      if (me?.focusSubject) setFocusSubject(me.focusSubject);
    }
    setLoading(false);
  }, [groupId, supabase, userId]);

  const updatePresence = useCallback(async (nextStatus = status, subject = focusSubject, { quiet = false } = {}) => {
    if (!groupId || !userId) return;
    if (!quiet) setPresenceBusy(true);
    const { error: presenceError } = await supabase.rpc('set_classroom_presence', {
      p_group_id: groupId,
      p_status: nextStatus,
      p_focus_subject: subject || null,
    });
    if (!quiet) setPresenceBusy(false);
    if (presenceError) {
      setError(presenceError.message || 'Sınıf durumun güncellenemedi.');
    } else if (!quiet) {
      await loadRoom({ quiet: true });
    }
  }, [focusSubject, groupId, loadRoom, status, supabase, userId]);

  useEffect(() => {
    const timer = setTimeout(loadRoom, 0);
    return () => clearTimeout(timer);
  }, [loadRoom]);

  useEffect(() => {
    if (!data?.room?.id || presenceStartedRef.current) return;
    presenceStartedRef.current = true;
    supabase.rpc('set_classroom_presence', {
      p_group_id: groupId,
      p_status: status,
      p_focus_subject: focusSubject || null,
    }).then(() => loadRoom({ quiet: true }));
  }, [data?.room?.id, focusSubject, groupId, loadRoom, status, supabase]);

  useEffect(() => {
    if (!groupId || !userId) return undefined;
    const channel = supabase.channel(`classroom-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_presence' }, () => loadRoom({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members' }, () => loadRoom({ quiet: true }))
      .subscribe();
    const heartbeat = window.setInterval(() => updatePresence(status, focusSubject, { quiet: true }), 45000);
    return () => {
      window.clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [focusSubject, groupId, loadRoom, status, supabase, updatePresence, userId]);

  const changeStatus = async (nextStatus) => {
    setStatus(nextStatus);
    await updatePresence(nextStatus, focusSubject);
  };

  const submitFocus = async (event) => {
    event.preventDefault();
    await updatePresence(status, focusSubject);
  };

  const copyInvite = async () => {
    if (!data?.room?.inviteCode) return;
    await navigator.clipboard.writeText(data.room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const leaveRoom = async () => {
    setLeaving(true);
    const { error: leaveError } = await supabase.rpc('leave_study_group', { p_group_id: groupId });
    setLeaving(false);
    if (leaveError) {
      setError(leaveError.message || 'Sınıftan ayrılamadın.');
      setLeaveOpen(false);
      return;
    }
    router.replace('/dashboard/arkadaslar');
  };

  const room = data?.room;
  const members = data?.members || [];
  const weeklyProgress = room ? Math.min(100, (Number(room.weeklyMinutes || 0) / Number(room.weeklyGoalMinutes || 1)) * 100) : 0;
  const isOwner = room?.ownerId === userId;
  const onlineCount = members.filter((member) => member.presence !== 'offline').length;

  return (
    <div className="classroom-page">
      <div className="classroom-breadcrumb"><Link href="/dashboard/arkadaslar"><ArrowLeft size={16} /> Çalışma arkadaşları</Link></div>
      {error && <div className="classroom-alert" role="alert">{error}</div>}
      <DataState loading={loading} error={!loading && !room ? error : ''} empty={!room}>
        {room && (
          <>
            <header className="classroom-header">
              <div>
                <span><UsersRound size={16} /> Canlı çalışma sınıfı</span>
                <h1>{room.name}</h1>
                <p>{members.length}/{room.maxMembers} öğrenci · {onlineCount} kişi şu anda sınıfta</p>
              </div>
              <div className="classroom-header-actions">
                {room.inviteCode && <button onClick={copyInvite}><Clipboard size={16} /> {copied ? 'Kod kopyalandı' : room.inviteCode}</button>}
                <button className="leave-room-button" onClick={() => setLeaveOpen(true)}><LogOut size={16} /> {isOwner ? 'Sınıfı kapat' : 'Sınıftan ayrıl'}</button>
              </div>
            </header>

            <section className="classroom-overview-grid">
              <article className="isometric-classroom study-panel">
                <div className="classroom-wall">
                  <div className="classroom-board"><span>{room.name}</span><small>Birlikte odaklan, kendi ritminde ilerle.</small></div>
                  <span className="classroom-clock"><Clock3 size={17} /></span>
                </div>
                <div className="classroom-floor">
                  {members.map((member, index) => {
                    const meta = STATUS_META[member.presence] || STATUS_META.offline;
                    const StatusIcon = meta.icon;
                    return (
                      <article key={member.userId} className={`classroom-seat seat-${index + 1} is-${member.presence} ${member.userId === userId ? 'is-me' : ''}`}>
                        <div className="desk"><span /><i /></div>
                        <div className="seat-avatar">{initials(member.name)}{member.role === 'owner' && <Crown size={11} />}</div>
                        <div className="seat-label"><strong>{member.userId === userId ? 'Sen' : member.name}</strong><span><StatusIcon size={11} /> {meta.label}</span>{member.focusSubject && <small>{member.focusSubject}</small>}</div>
                      </article>
                    );
                  })}
                  {Array.from({ length: Math.max(0, Math.min(room.maxMembers, 8) - members.length) }, (_, index) => (
                    <article key={`empty-${index}`} className={`classroom-seat seat-${members.length + index + 1} is-empty`}><div className="desk"><span /><i /></div><div className="empty-seat"><DoorOpen size={14} /></div></article>
                  ))}
                </div>
                <div className="classroom-legend"><span><i className="dot studying" />Çalışıyor</span><span><i className="dot break" />Molada</span><span><i className="dot online" />Sınıfta</span><span><i className="dot offline" />Çevrimdışı</span></div>
              </article>

              <aside className="classroom-controls study-panel">
                <header><span>Benim durumum</span><h2>Sınıfta nasıl görünüyorsun?</h2></header>
                <div className="presence-options">
                  {['studying', 'break', 'online'].map((option) => {
                    const meta = STATUS_META[option];
                    const Icon = meta.icon;
                    return <button key={option} className={status === option ? 'is-active' : ''} onClick={() => changeStatus(option)} disabled={presenceBusy}><Icon size={17} /><span>{meta.label}</span></button>;
                  })}
                </div>
                <form onSubmit={submitFocus}>
                  <label><span>Şu an ne çalışıyorsun?</span><input value={focusSubject} onChange={(event) => setFocusSubject(event.target.value)} maxLength={60} placeholder="Örn. TYT Matematik · Problemler" /></label>
                  <button disabled={presenceBusy}>{presenceBusy ? 'Güncelleniyor…' : 'Durumumu güncelle'}</button>
                </form>
                <div className="classroom-privacy-note"><LockKeyhole size={15} /><span>Yalnızca bu sınıfın üyeleri canlı durumunu görebilir.</span></div>
              </aside>
            </section>

            <section className="classroom-lower-grid">
              <article className="group-goal-card study-panel">
                <header><span><Goal size={16} /> Bu haftanın ortak hedefi</span><strong>{Math.round(weeklyProgress)}%</strong></header>
                <h2>{Number(room.weeklyMinutes || 0).toLocaleString('tr-TR')} <small>/ {Number(room.weeklyGoalMinutes).toLocaleString('tr-TR')} dakika</small></h2>
                <div><i style={{ width: `${weeklyProgress}%` }} /></div>
                <p>Bu değer yalnızca sınıf üyelerinin gerçek çalışma kayıtlarından hesaplanır.</p>
              </article>

              <article className="classroom-ranking study-panel">
                <header><span>Haftalık katkı</span><h2>Sınıf ritmi</h2></header>
                <div>
                  {[...members].sort((a, b) => Number(b.weeklyMinutes) - Number(a.weeklyMinutes)).map((member, index) => (
                    <article key={member.userId}><em>{index + 1}</em><span className="ranking-avatar">{initials(member.name)}</span><div><strong>{member.userId === userId ? 'Sen' : member.name}</strong><small>{member.presence === 'studying' ? 'Şu anda çalışıyor' : `${member.studyDays ?? '—'} çalışma günü`}</small></div><b>{Number(member.weeklyMinutes || 0).toLocaleString('tr-TR')} dk</b></article>
                  ))}
                </div>
              </article>

              <article className="classroom-stats study-panel">
                <header><span>Sınıf özeti</span><h2>Paylaşılan göstergeler</h2></header>
                <div>
                  <span><Flame size={17} /><div><small>En uzun seri</small><strong>{Math.max(0, ...members.map((member) => Number(member.streak || 0)))} gün</strong></div></span>
                  <span><Sparkles size={17} /><div><small>Görünen soru</small><strong>{members.reduce((sum, member) => sum + Number(member.questions || 0), 0).toLocaleString('tr-TR')}</strong></div></span>
                  <span><UsersRound size={17} /><div><small>Çevrimiçi</small><strong>{onlineCount}/{members.length}</strong></div></span>
                </div>
              </article>
            </section>
          </>
        )}
      </DataState>

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title={isOwner ? 'Çalışma sınıfını kapat' : 'Sınıftan ayrıl'} description={isOwner && members.length > 1 ? 'Sınıfta başka üyeler varken sahipliği devretmeden kapatamazsın.' : 'Bu işlemden sonra yeniden katılmak için davet koduna ihtiyacın olacak.'}>
        <div className="leave-room-confirm"><button className="study-button" onClick={() => setLeaveOpen(false)}>Vazgeç</button><button className="study-button study-button-danger" onClick={leaveRoom} disabled={leaving || (isOwner && members.length > 1)}>{leaving ? 'İşleniyor…' : isOwner ? 'Sınıfı kapat' : 'Sınıftan ayrıl'}</button></div>
      </Modal>
    </div>
  );
}
