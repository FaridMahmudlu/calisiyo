'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, BookOpenCheck, Check, Clipboard, Clock3, Coffee,
  Flame, Goal, LockKeyhole, LogOut, Palette, PauseCircle,
  Play, Settings2, Sparkles, TimerReset, Trophy, UsersRound,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../../layout';
import DataState from '@/components/ui/DataState';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import AvatarStudio from '@/components/classroom/AvatarStudio';
import ClassroomAvatar from '@/components/classroom/ClassroomAvatar';
import ClassroomScene, { REACTION_META } from '@/components/classroom/ClassroomScene';
import '../classroom.css';

const STATUS_META = {
  studying: { label: 'Çalışıyor', hint: 'Odak modundasın', icon: BookOpenCheck },
  break: { label: 'Molada', hint: 'Kısa bir ara', icon: Coffee },
  online: { label: 'Sınıfta', hint: 'Sohbete ve harekete açık', icon: Sparkles },
  offline: { label: 'Çevrimdışı', hint: 'Şu anda sınıfta değil', icon: Clock3 },
};

const THEME_OPTIONS = [
  { value: 'sunny', label: 'Aydınlık sınıf', description: 'Taze ve sakin yeşil tonlar' },
  { value: 'library', label: 'Sessiz kütüphane', description: 'Derin odak için sıcak tonlar' },
  { value: 'evening', label: 'Akşam etüdü', description: 'Yumuşak ve düşük ışıklı ortam' },
];

const FOCUS_DURATIONS = [15, 25, 40, 50];

const formatTimer = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const remainder = Math.floor(safe % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

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
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState('online');
  const [focusSubject, setFocusSubject] = useState('');
  const [presenceBusy, setPresenceBusy] = useState(false);
  const [localPosition, setLocalPosition] = useState(null);
  const [copied, setCopied] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusBusy, setFocusBusy] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [roomSettingsBusy, setRoomSettingsBusy] = useState(false);
  const [roomTheme, setRoomTheme] = useState('sunny');
  const [roomMotto, setRoomMotto] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState('1200');
  const presenceStartedRef = useRef(false);
  const latestMoveRef = useRef(null);
  const lastLocalMoveAtRef = useRef(0);
  const moveTimerRef = useRef(null);
  const serverOffsetRef = useRef(0);
  const focusExpiredRef = useRef(null);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  }, []);

  const loadRoom = useCallback(async ({ quiet = false } = {}) => {
    if (!groupId || !userId) return;
    if (!quiet) setLoading(true);
    const { data: roomData, error: roomError } = await supabase.rpc('get_group_room', { p_group_id: groupId });
    if (roomError) {
      setError(roomError.message || 'Çalışma sınıfı yüklenemedi.');
    } else {
      setData(roomData);
      setError('');
      serverOffsetRef.current = roomData?.room?.serverTime
        ? Date.parse(roomData.room.serverTime) - Date.now()
        : 0;
      const me = roomData?.members?.find((member) => member.userId === userId);
      if (me?.presence && me.presence !== 'offline') setStatus(me.presence);
      if (me?.focusSubject) setFocusSubject(me.focusSubject);
      setLocalPosition((current) => {
        if (!me) return current;
        if (current && Date.now() - lastLocalMoveAtRef.current < 1000) return current;
        return {
          x: Number(me.positionX ?? 50),
          y: Number(me.positionY ?? 72),
          facing: me.facing || 'right',
        };
      });
      if (roomData?.room) {
        setRoomTheme(roomData.room.theme || 'sunny');
        setRoomMotto(roomData.room.motto || 'Birlikte odaklan, kendi ritminde ilerle.');
        setWeeklyGoal(String(roomData.room.weeklyGoalMinutes || 1200));
      }
    }
    setLoading(false);
  }, [groupId, supabase, userId]);

  const updatePresence = useCallback(async (nextStatus = status, subject = focusSubject, { quiet = false } = {}) => {
    if (!groupId || !userId) return false;
    if (!quiet) setPresenceBusy(true);
    const { error: presenceError } = await supabase.rpc('set_classroom_presence', {
      p_group_id: groupId,
      p_status: nextStatus,
      p_focus_subject: subject || null,
    });
    if (!quiet) setPresenceBusy(false);
    if (presenceError) {
      if (!quiet) setError(presenceError.message || 'Sınıf durumun güncellenemedi.');
      return false;
    }
    setData((current) => current ? {
      ...current,
      members: current.members.map((member) => member.userId === userId
        ? { ...member, presence: nextStatus, focusSubject: subject || null }
        : member),
    } : current);
    return true;
  }, [focusSubject, groupId, status, supabase, userId]);

  const sendMove = useCallback(async (next) => {
    if (!groupId || !userId || !next) return;
    const { data: moved, error: moveError } = await supabase.rpc('move_in_classroom', {
      p_group_id: groupId,
      p_x: Number(next.x.toFixed(2)),
      p_y: Number(next.y.toFixed(2)),
      p_facing: next.facing,
    });
    if (moveError) setError(moveError.message || 'Sınıftaki konumun güncellenemedi.');
    if (!moveError && moved?.throttled) {
      setLocalPosition({ x: Number(moved.x), y: Number(moved.y), facing: moved.facing || 'right' });
    }
  }, [groupId, supabase, userId]);

  const moveCharacter = useCallback((next, { immediate = false } = {}) => {
    lastLocalMoveAtRef.current = Date.now();
    setLocalPosition(next);
    latestMoveRef.current = next;
    if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
    if (immediate) {
      moveTimerRef.current = null;
      sendMove(next);
      return;
    }
    moveTimerRef.current = window.setTimeout(() => {
      sendMove(latestMoveRef.current);
      moveTimerRef.current = null;
    }, 120);
  }, [sendMove]);

  useEffect(() => {
    const timer = window.setTimeout(loadRoom, 0);
    return () => window.clearTimeout(timer);
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
    const channel = supabase.channel(`classroom-v2-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_presence', filter: `group_id=eq.${groupId}` }, () => loadRoom({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members', filter: `group_id=eq.${groupId}` }, () => loadRoom({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_focus_sessions', filter: `group_id=eq.${groupId}` }, () => loadRoom({ quiet: true }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_group_reactions', filter: `group_id=eq.${groupId}` }, () => loadRoom({ quiet: true }))
      .subscribe();
    const heartbeat = window.setInterval(() => updatePresence(status, focusSubject, { quiet: true }), 45000);
    return () => {
      window.clearInterval(heartbeat);
      if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [focusSubject, groupId, loadRoom, status, supabase, updatePresence, userId]);

  useEffect(() => {
    const tick = () => {
      const session = data?.focusSession;
      if (!session?.endsAt) {
        setRemainingSeconds(0);
        return;
      }
      const left = Math.max(0, Math.ceil((Date.parse(session.endsAt) - (Date.now() + serverOffsetRef.current)) / 1000));
      setRemainingSeconds(left);
      if (left === 0 && focusExpiredRef.current !== session.id) {
        focusExpiredRef.current = session.id;
        window.setTimeout(() => loadRoom({ quiet: true }), 500);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [data?.focusSession, loadRoom]);

  const room = data?.room;
  const members = data?.members || [];
  const me = members.find((member) => member.userId === userId);
  const weeklyProgress = room ? Math.min(100, (Number(room.weeklyMinutes || 0) / Number(room.weeklyGoalMinutes || 1)) * 100) : 0;
  const isOwner = room?.ownerId === userId;
  const onlineCount = members.filter((member) => member.presence !== 'offline').length;

  const changeStatus = async (nextStatus) => {
    const previous = status;
    setStatus(nextStatus);
    const ok = await updatePresence(nextStatus, focusSubject);
    if (!ok) setStatus(previous);
  };

  const submitFocus = async (event) => {
    event.preventDefault();
    if (await updatePresence(status, focusSubject)) showNotice('Çalışma durumun güncellendi.');
  };

  const enterZone = async (zone) => {
    const next = { x: zone.x, y: zone.y, facing: zone.x < Number(localPosition?.x ?? 50) ? 'left' : 'right' };
    moveCharacter(next, { immediate: true });
    setStatus(zone.status);
    await updatePresence(zone.status, focusSubject, { quiet: true });
    showNotice(`${zone.label} alanına geçtin.`);
  };

  const copyInvite = async () => {
    if (!room?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(room.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Davet kodu kopyalanamadı. Kodu seçip manuel olarak kopyalayabilirsin.');
    }
  };

  const sendReaction = async (reaction) => {
    const { data: created, error: reactionError } = await supabase.rpc('send_classroom_reaction', {
      p_group_id: groupId,
      p_reaction: reaction,
    });
    if (reactionError) {
      setError(reactionError.message || 'Tepkin gönderilemedi.');
      return;
    }
    setData((current) => current ? { ...current, reactions: [created, ...(current.reactions || [])].slice(0, 12) } : current);
  };

  const saveAvatar = async (avatar, shuffle) => {
    setAvatarBusy(true);
    const { data: saved, error: avatarError } = await supabase.rpc('update_classroom_avatar', {
      p_hair: avatar.hair,
      p_skin: avatar.skin,
      p_hair_color: avatar.hairColor,
      p_background: avatar.background,
      p_glasses: avatar.glasses,
      p_expression: avatar.expression,
      p_shuffle: shuffle,
    });
    setAvatarBusy(false);
    if (avatarError) {
      setError(avatarError.message || 'Karakterin kaydedilemedi.');
      return;
    }
    setData((current) => current ? {
      ...current,
      members: current.members.map((member) => member.userId === userId ? { ...member, avatar: saved } : member),
    } : current);
    await updatePresence(status, focusSubject, { quiet: true });
    setAvatarOpen(false);
    showNotice('Karakterin sınıfta güncellendi.');
  };

  const startFocus = async () => {
    setFocusBusy(true);
    const { data: session, error: focusError } = await supabase.rpc('start_group_focus', {
      p_group_id: groupId,
      p_duration_minutes: focusDuration,
    });
    setFocusBusy(false);
    if (focusError) {
      setError(focusError.message || 'Ortak odak turu başlatılamadı.');
      return;
    }
    setData((current) => current ? { ...current, focusSession: session } : current);
    setStatus('studying');
    await updatePresence('studying', focusSubject, { quiet: true });
    showNotice(`${focusDuration} dakikalık ortak odak başladı.`);
  };

  const stopFocus = async () => {
    setFocusBusy(true);
    const { error: focusError } = await supabase.rpc('stop_group_focus', { p_group_id: groupId });
    setFocusBusy(false);
    if (focusError) {
      setError(focusError.message || 'Odak turu durdurulamadı.');
      return;
    }
    setData((current) => current ? { ...current, focusSession: null } : current);
  };

  const saveRoomSettings = async (event) => {
    event.preventDefault();
    setRoomSettingsBusy(true);
    const { data: updated, error: settingsError } = await supabase.rpc('update_study_group_room', {
      p_group_id: groupId,
      p_theme: roomTheme,
      p_motto: roomMotto,
      p_weekly_goal_minutes: Number(weeklyGoal),
    });
    setRoomSettingsBusy(false);
    if (settingsError) {
      setError(settingsError.message || 'Sınıf ayarları kaydedilemedi.');
      return;
    }
    setData((current) => current ? { ...current, room: { ...current.room, ...updated } } : current);
    await updatePresence(status, focusSubject, { quiet: true });
    setRoomSettingsOpen(false);
    showNotice('Sınıf görünümü güncellendi.');
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

  const canStopFocus = data?.focusSession && (data.focusSession.startedBy === userId || isOwner);

  return (
    <div className="classroom-page">
      {notice && <div className="classroom-toast" role="status"><Check size={16} />{notice}</div>}
      <div className="classroom-breadcrumb"><Link href="/dashboard/arkadaslar"><ArrowLeft size={16} /> Çalışma arkadaşları</Link></div>
      {error && <div className="classroom-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Uyarıyı kapat">×</button></div>}
      <DataState loading={loading} error={!loading && !room ? error : ''} empty={!room}>
        {room && (
          <>
            <header className="classroom-header">
              <div>
                <span><UsersRound size={16} /> Canlı çalışma sınıfı</span>
                <h1>{room.name}</h1>
                <p><b>{onlineCount}</b> kişi burada · {members.length}/{room.maxMembers} üye · Konumlar ve tepkiler anlık</p>
              </div>
              <div className="classroom-header-actions">
                {room.inviteCode && <button onClick={copyInvite}><Clipboard size={16} /> {copied ? 'Kod kopyalandı' : room.inviteCode}</button>}
                {isOwner && <button onClick={() => setRoomSettingsOpen(true)}><Settings2 size={16} /> Sınıfı düzenle</button>}
                <button className="leave-room-button" onClick={() => setLeaveOpen(true)}><LogOut size={16} /> {isOwner ? 'Sınıfı kapat' : 'Sınıftan ayrıl'}</button>
              </div>
            </header>

            <section className="classroom-overview-grid">
              <ClassroomScene
                room={room}
                members={members}
                userId={userId}
                localPosition={localPosition}
                reactions={data.reactions || []}
                onMove={moveCharacter}
                onEnterZone={enterZone}
                onOpenAvatar={() => setAvatarOpen(true)}
              />

              <aside className="classroom-cockpit">
                <article className={`shared-focus-card study-panel ${data.focusSession ? 'is-active' : ''}`}>
                  <header><span><TimerReset size={15} /> Ortak odak</span>{data.focusSession && <i>CANLI</i>}</header>
                  {data.focusSession ? (
                    <>
                      <strong className="shared-focus-timer">{formatTimer(remainingSeconds)}</strong>
                      <p><b>{data.focusSession.starterName || 'Bir sınıf üyesi'}</b> başlattı · {data.focusSession.durationMinutes} dakika</p>
                      <div className="focus-progress"><i style={{ width: `${Math.max(0, Math.min(100, ((data.focusSession.durationMinutes * 60 - remainingSeconds) / (data.focusSession.durationMinutes * 60)) * 100))}%` }} /></div>
                      {canStopFocus && <button onClick={stopFocus} disabled={focusBusy}><PauseCircle size={16} /> Turu durdur</button>}
                    </>
                  ) : (
                    <>
                      <h2>Birlikte başlayın</h2>
                      <p>Aynı sayacı paylaşın; herkes kendi dersine odaklansın.</p>
                      <div className="focus-duration-options">{FOCUS_DURATIONS.map((minutes) => <button key={minutes} className={focusDuration === minutes ? 'is-active' : ''} onClick={() => setFocusDuration(minutes)}>{minutes} dk</button>)}</div>
                      <button className="start-focus-button" onClick={startFocus} disabled={focusBusy}><Play size={16} /> {focusBusy ? 'Başlatılıyor…' : 'Ortak odağı başlat'}</button>
                    </>
                  )}
                </article>

                <article className="classroom-controls study-panel">
                  <header><span>Benim durumum</span><h2>Sınıfta nasıl görünüyorsun?</h2></header>
                  <div className="presence-options">
                    {['studying', 'break', 'online'].map((option) => {
                      const meta = STATUS_META[option];
                      const Icon = meta.icon;
                      return <button key={option} className={status === option ? 'is-active' : ''} onClick={() => changeStatus(option)} disabled={presenceBusy}><Icon size={17} /><span><b>{meta.label}</b><small>{meta.hint}</small></span></button>;
                    })}
                  </div>
                  <form onSubmit={submitFocus}>
                    <label><span>Şu an ne çalışıyorsun?</span><input value={focusSubject} onChange={(event) => setFocusSubject(event.target.value)} maxLength={60} placeholder="Örn. TYT Matematik · Problemler" /></label>
                    <button disabled={presenceBusy}>{presenceBusy ? 'Güncelleniyor…' : 'Durumumu güncelle'}</button>
                  </form>
                  <button className="customize-avatar-button" onClick={() => setAvatarOpen(true)}><Palette size={17} /><span><b>Karakterimi özelleştir</b><small>Saç, renk, gözlük ve ifadeni seç</small></span>{me && <ClassroomAvatar avatar={me.avatar} name={me.name} size={44} />}</button>
                  <div className="classroom-privacy-note"><LockKeyhole size={15} /><span>Canlı durumun, karakterin ve konumun yalnızca bu sınıfın üyelerine görünür.</span></div>
                </article>

                <article className="reaction-card study-panel">
                  <header><span>Sessiz tepkiler</span><h2>Sınıfa küçük bir işaret bırak</h2></header>
                  <div>{Object.entries(REACTION_META).map(([key, meta]) => { const Icon = meta.icon; return <button key={key} onClick={() => sendReaction(key)} title={meta.label} aria-label={meta.label}><Icon size={18} /><span>{meta.label}</span></button>; })}</div>
                </article>
              </aside>
            </section>

            <section className="classroom-lower-grid">
              <article className="group-goal-card study-panel">
                <header><span><Goal size={16} /> Bu haftanın ortak hedefi</span><strong>{Math.round(weeklyProgress)}%</strong></header>
                <h2>{Number(room.weeklyMinutes || 0).toLocaleString('tr-TR')} <small>/ {Number(room.weeklyGoalMinutes).toLocaleString('tr-TR')} dakika</small></h2>
                <div><i style={{ width: `${weeklyProgress}%` }} /></div>
                <p>Yalnızca sınıf üyelerinin gerçek çalışma kayıtlarından hesaplanır.</p>
              </article>

              <article className="classroom-ranking study-panel">
                <header><span>Haftalık katkı</span><h2>Sınıf ritmi</h2></header>
                <div>
                  {[...members].sort((a, b) => Number(b.weeklyMinutes) - Number(a.weeklyMinutes)).map((member, index) => (
                    <article key={member.userId}><em>{index + 1}</em><span className="ranking-avatar"><ClassroomAvatar avatar={member.avatar} name={member.name} size={34} /></span><div><strong>{member.userId === userId ? 'Sen' : member.name}</strong><small>{member.presence === 'studying' ? 'Şu anda çalışıyor' : `${member.studyDays ?? '—'} çalışma günü`}</small></div><b>{Number(member.weeklyMinutes || 0).toLocaleString('tr-TR')} dk</b></article>
                  ))}
                </div>
              </article>

              <article className="classroom-stats study-panel">
                <header><span>Sınıf özeti</span><h2>Paylaşılan göstergeler</h2></header>
                <div>
                  <span><Flame size={17} /><div><small>En uzun seri</small><strong>{Math.max(0, ...members.map((member) => Number(member.streak || 0)))} gün</strong></div></span>
                  <span><Trophy size={17} /><div><small>Toplam soru</small><strong>{members.reduce((sum, member) => sum + Number(member.questions || 0), 0).toLocaleString('tr-TR')}</strong></div></span>
                  <span><UsersRound size={17} /><div><small>Şu an sınıfta</small><strong>{onlineCount}/{members.length}</strong></div></span>
                </div>
              </article>
            </section>
          </>
        )}
      </DataState>

      {avatarOpen && <AvatarStudio open onClose={() => setAvatarOpen(false)} initialAvatar={me?.avatar} name={me?.name || 'Sen'} onSave={saveAvatar} busy={avatarBusy} />}

      <Modal open={roomSettingsOpen} onClose={() => setRoomSettingsOpen(false)} title="Sınıf atmosferini düzenle" description="Bu ayarlar tüm sınıf üyelerinin gördüğü ortak alanı değiştirir.">
        <form className="room-settings-form" onSubmit={saveRoomSettings}>
          <label><span>Sınıf teması</span><Select value={roomTheme} onChange={setRoomTheme} options={THEME_OPTIONS} ariaLabel="Sınıf teması" /></label>
          <label><span>Tahta mesajı</span><input value={roomMotto} onChange={(event) => setRoomMotto(event.target.value)} minLength={2} maxLength={80} required /></label>
          <label><span>Haftalık ortak hedef (dakika)</span><input type="number" value={weeklyGoal} onChange={(event) => setWeeklyGoal(event.target.value)} min="30" max="50000" required /></label>
          <footer><button type="button" className="study-button" onClick={() => setRoomSettingsOpen(false)}>Vazgeç</button><button className="study-button study-button-primary" disabled={roomSettingsBusy}>{roomSettingsBusy ? 'Kaydediliyor…' : 'Sınıfı güncelle'}</button></footer>
        </form>
      </Modal>

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title={isOwner ? 'Çalışma sınıfını kapat' : 'Sınıftan ayrıl'} description={isOwner && members.length > 1 ? 'Sınıfta başka üyeler varken sahipliği devretmeden kapatamazsın.' : 'Bu işlemden sonra yeniden katılmak için davet koduna ihtiyacın olacak.'}>
        <div className="leave-room-confirm"><button className="study-button" onClick={() => setLeaveOpen(false)}>Vazgeç</button><button className="study-button study-button-danger" onClick={leaveRoom} disabled={leaving || (isOwner && members.length > 1)}>{leaving ? 'İşleniyor…' : isOwner ? 'Sınıfı kapat' : 'Sınıftan ayrıl'}</button></div>
      </Modal>
    </div>
  );
}
