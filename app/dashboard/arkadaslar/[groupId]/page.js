'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRightLeft, BookOpenCheck, Check, Clipboard, Clock3, Coffee,
  Eye, EyeOff, Flame, Goal, LockKeyhole, LogOut, Palette, PauseCircle,
  Play, Settings2, ShieldCheck, Sparkles, TimerReset, Trophy, UserMinus, UsersRound, Volume2, VolumeX,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../../layout';
import DataState from '@/components/ui/DataState';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import AvatarStudio from '@/components/classroom/AvatarStudio';
import ClassroomAvatar from '@/components/classroom/ClassroomAvatar';
import ClassroomScene, { REACTION_META } from '@/components/classroom/ClassroomScene';
import ClassroomChat from '@/components/classroom/ClassroomChat';
import ClassroomBoard from '@/components/classroom/ClassroomBoard';
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
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [roomSettingsBusy, setRoomSettingsBusy] = useState(false);
  const [roomTheme, setRoomTheme] = useState('sunny');
  const [roomMotto, setRoomMotto] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState('1200');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomPermissions, setRoomPermissions] = useState({ focus: true, chat: true, react: true });
  const [sceneVisible, setSceneVisible] = useState(() => {
    if (typeof window === 'undefined' || !groupId) return true;
    return window.localStorage.getItem(`calisiyo-classroom-scene:${groupId}`) !== 'hidden';
  });
  const [moderationTarget, setModerationTarget] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [moderationDuration, setModerationDuration] = useState('60');
  const [moderationBusy, setModerationBusy] = useState(false);
  const [ownershipConfirm, setOwnershipConfirm] = useState(false);
  const [board, setBoard] = useState({ text: '', strokes: [], version: 0 });
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardBusy, setBoardBusy] = useState(false);
  const presenceStartedRef = useRef(false);
  const lastPresenceMutationAtRef = useRef(0);
  const focusEditingRef = useRef(false);
  const latestMoveRef = useRef(null);
  const lastLocalMoveAtRef = useRef(0);
  const presenceSyncFailuresRef = useRef(0);
  const moveTimerRef = useRef(null);
  const serverOffsetRef = useRef(0);
  const focusExpiredRef = useRef(null);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  }, []);

  const loadRoom = useCallback(async ({ quiet = false } = {}) => {
    if (!groupId || !userId) return;
    const requestedAt = Date.now();
    if (!quiet) setLoading(true);
    const { data: roomData, error: roomError } = await supabase.rpc('get_group_room_v4', { p_group_id: groupId });
    if (roomError) {
      setError(roomError.message || 'Çalışma sınıfı yüklenemedi.');
    } else {
      setData(roomData);
      setError('');
      serverOffsetRef.current = roomData?.room?.serverTime
        ? Date.parse(roomData.room.serverTime) - Date.now()
        : 0;
      const me = roomData?.members?.find((member) => member.userId === userId);
      const isFreshPresenceRead = requestedAt >= lastPresenceMutationAtRef.current;
      if (isFreshPresenceRead && me?.presence && me.presence !== 'offline') setStatus(me.presence);
      if (isFreshPresenceRead && !focusEditingRef.current) setFocusSubject(me?.focusSubject || '');
      setLocalPosition((current) => {
        if (!me) return current;
        if (current && Date.now() - lastLocalMoveAtRef.current < 1000) return current;
        return {
          x: Number(me.positionX ?? 50),
          y: Number(me.positionY ?? 72),
          facing: me.facing || 'east',
        };
      });
      if (roomData?.room) {
        setRoomTheme(roomData.room.theme || 'sunny');
        setRoomMotto(roomData.room.motto || 'Birlikte odaklan, kendi ritminde ilerle.');
        setRoomDescription(roomData.room.description || 'Birlikte düzenli çalışmak için kurulan özel sınıf.');
        setWeeklyGoal(String(roomData.room.weeklyGoalMinutes || 1200));
        setRoomPermissions({
          focus: roomData.room.membersCanStartFocus !== false,
          chat: roomData.room.membersCanChat !== false,
          react: roomData.room.membersCanReact !== false,
        });
      }
    }
    setLoading(false);
  }, [groupId, supabase, userId]);

  const loadMessages = useCallback(async () => {
    if (!groupId || !userId) return;
    const { data: messages, error: messageError } = await supabase.rpc('get_group_messages_v2', { p_group_id: groupId });
    if (messageError) {
      setError(messageError.message || 'Sınıf sohbeti yenilenemedi.');
      return;
    }
    setData((current) => current ? { ...current, messages: messages || [] } : current);
  }, [groupId, supabase, userId]);

  const loadPresenceSnapshot = useCallback(async () => {
    if (!groupId || !userId) return;
    const requestedAt = Date.now();
    const { data: members, error: presenceError } = await supabase.rpc('get_group_presence_snapshot', {
      p_group_id: groupId,
    });
    if (presenceError) {
      presenceSyncFailuresRef.current += 1;
      if (presenceSyncFailuresRef.current >= 2) {
        setError('Sınıftaki canlı konumlar güncellenemedi. Sayfayı yenileyebilirsin.');
      }
      return;
    }
    presenceSyncFailuresRef.current = 0;
    setError((current) => current === 'Sınıftaki canlı konumlar güncellenemedi. Sayfayı yenileyebilirsin.' ? '' : current);
    const snapshot = new Map((members || []).map((member) => [member.userId, member]));
    const ownPresence = snapshot.get(userId);
    if (ownPresence && Date.now() - lastLocalMoveAtRef.current >= 1200) {
      setLocalPosition({
        x: Number(ownPresence.positionX ?? 50),
        y: Number(ownPresence.positionY ?? 72),
        facing: ownPresence.facing || 'east',
      });
    }
    setData((current) => current ? {
      ...current,
      members: current.members.map((member) => {
        const next = snapshot.get(member.userId);
        if (!next) return member;
        const protectRecentLocalMove = member.userId === userId && Date.now() - lastLocalMoveAtRef.current < 1200;
        const protectRecentPresenceMutation = member.userId === userId
          && (requestedAt < lastPresenceMutationAtRef.current || Date.now() - lastPresenceMutationAtRef.current < 1500);
        return {
          ...member,
          presence: protectRecentPresenceMutation ? member.presence : (next.presence || 'offline'),
          focusSubject: protectRecentPresenceMutation ? member.focusSubject : (next.focusSubject || null),
          positionX: protectRecentLocalMove ? member.positionX : Number(next.positionX ?? member.positionX),
          positionY: protectRecentLocalMove ? member.positionY : Number(next.positionY ?? member.positionY),
          facing: protectRecentLocalMove ? member.facing : (next.facing || member.facing),
          presenceUpdatedAt: next.presenceUpdatedAt,
        };
      }),
    } : current);
  }, [groupId, supabase, userId]);

  const loadInteractions = useCallback(async () => {
    if (!groupId || !userId) return;
    const { data: interaction, error: interactionError } = await supabase.rpc('get_classroom_interaction_state', {
      p_group_id: groupId,
    });
    if (interactionError) {
      setError('Sınıf etkileşimleri güncellenemedi. Lütfen tekrar deneyin.');
      return;
    }
    setBoard(interaction?.board || { text: '', strokes: [], version: 0 });
    const poses = new Map((interaction?.poses || []).map((item) => [item.userId, item]));
    setData((current) => current ? {
      ...current,
      members: current.members.map((member) => ({ ...member, ...(poses.get(member.userId) || {}) })),
    } : current);
  }, [groupId, supabase, userId]);

  const toggleScene = () => {
    setSceneVisible((current) => {
      const next = !current;
      window.localStorage.setItem(`calisiyo-classroom-scene:${groupId}`, next ? 'visible' : 'hidden');
      return next;
    });
  };

  const updatePresence = useCallback(async (nextStatus = status, subject = focusSubject, { quiet = false } = {}) => {
    if (!groupId || !userId) return false;
    lastPresenceMutationAtRef.current = Date.now();
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
    focusEditingRef.current = false;
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
      setLocalPosition({ x: Number(moved.x), y: Number(moved.y), facing: moved.facing || 'east' });
    }
    if (!moveError) setData((current) => current ? {
      ...current,
      members: current.members.map((member) => member.userId === userId
        ? { ...member, pose: 'standing', seatId: null }
        : member),
    } : current);
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
    }, 260);
  }, [sendMove]);

  useEffect(() => {
    const timer = window.setTimeout(loadRoom, 0);
    return () => window.clearTimeout(timer);
  }, [loadRoom]);

  useEffect(() => {
    if (!data?.room?.id) return;
    const timer = window.setTimeout(loadInteractions, 0);
    return () => window.clearTimeout(timer);
  }, [data?.room?.id, loadInteractions]);

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
    let disposed = false;
    let channel = null;
    const setupRealtime = async () => {
      await supabase.realtime.setAuth();
      if (disposed) return;
      channel = supabase.channel(`classroom:${groupId}`)
        // These are RLS-filtered Postgres rows, not member-authored Broadcast
        // payloads. Movement can therefore update only the matching member
        // instead of downloading the entire room on every step.
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_presence', filter: `group_id=eq.${groupId}` }, (change) => {
          const row = change.new;
          if (!row?.user_id) { loadRoom({ quiet: true }); return; }
          const protectRecentLocalMove = row.user_id === userId && Date.now() - lastLocalMoveAtRef.current < 1200;
          if (row.user_id === userId && !protectRecentLocalMove) {
            setLocalPosition({
              x: Number(row.position_x ?? 50),
              y: Number(row.position_y ?? 72),
              facing: row.facing || 'east',
            });
          }
          setData((current) => current ? {
                ...current,
                members: current.members.map((member) => member.userId === row.user_id ? {
                  ...member,
                  presence: row.status || 'online',
                  focusSubject: row.focus_subject || null,
                  positionX: protectRecentLocalMove ? member.positionX : Number(row.position_x ?? member.positionX),
                  positionY: protectRecentLocalMove ? member.positionY : Number(row.position_y ?? member.positionY),
                  facing: protectRecentLocalMove ? member.facing : (row.facing || member.facing),
                  pose: row.pose || member.pose || 'standing',
                  seatId: row.seat_id || null,
              presenceUpdatedAt: row.updated_at,
            } : member),
          } : current);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_reactions', filter: `group_id=eq.${groupId}` }, () => loadRoom({ quiet: true }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_messages', filter: `group_id=eq.${groupId}` }, loadMessages)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_message_reads', filter: `group_id=eq.${groupId}` }, loadMessages)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members', filter: `group_id=eq.${groupId}` }, () => loadRoom({ quiet: true }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_focus_sessions', filter: `group_id=eq.${groupId}` }, () => loadRoom({ quiet: true }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_boards', filter: `group_id=eq.${groupId}` }, loadInteractions)
        .subscribe((connectionStatus) => {
          if (connectionStatus === 'SUBSCRIBED' && !disposed) {
            loadRoom({ quiet: true });
          }
        });
    };
    setupRealtime().catch(() => setError('Canlı sınıf bağlantısı kurulamadı. Sayfayı yenileyebilirsin.'));
    return () => {
      disposed = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [groupId, loadInteractions, loadMessages, loadRoom, supabase, userId]);

  useEffect(() => {
    if (!groupId || !userId) return undefined;
    const heartbeat = window.setInterval(
      () => updatePresence(status, focusSubject, { quiet: true }),
      45000
    );
    return () => window.clearInterval(heartbeat);
  }, [focusSubject, groupId, status, updatePresence, userId]);

  useEffect(() => () => {
    if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
  }, []);

  useEffect(() => {
    if (!groupId || !userId) return undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible') loadPresenceSnapshot();
    };
    const initial = window.setTimeout(refresh, 1200);
    const timer = window.setInterval(refresh, 3000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [groupId, loadPresenceSnapshot, userId]);

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

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

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
    const dx = zone.x - Number(localPosition?.x ?? 50);
    const dy = zone.y - Number(localPosition?.y ?? 72);
    const vertical = Math.abs(dy) > 2 ? (dy < 0 ? 'north' : 'south') : '';
    const horizontal = Math.abs(dx) > 2 ? (dx < 0 ? 'west' : 'east') : '';
    const next = { x: zone.x, y: zone.y, facing: vertical && horizontal ? `${vertical}_${horizontal}` : horizontal || vertical || 'east' };
    moveCharacter(next, { immediate: true });
    setStatus(zone.status);
    await updatePresence(zone.status, focusSubject, { quiet: true });
    showNotice(`${zone.label} alanına geçtin.`);
  };

  const setPose = async (pose, seat = null) => {
    const { data: changed, error: poseError } = await supabase.rpc('set_classroom_pose', {
      p_group_id: groupId,
      p_pose: pose,
      p_seat_id: seat?.id || null,
    });
    if (poseError) {
      setError(poseError.code === '23505' ? 'Bu sırada başka bir öğrenci oturuyor.' : (poseError.message || 'Karakter duruşun güncellenemedi.'));
      return false;
    }
    if (changed?.x != null && changed?.y != null) {
      const nextPosition = { x: Number(changed.x), y: Number(changed.y), facing: changed.facing || 'north' };
      lastLocalMoveAtRef.current = Date.now();
      setLocalPosition(nextPosition);
    }
    setData((current) => current ? {
      ...current,
      members: current.members.map((member) => member.userId === userId ? {
        ...member,
        pose: changed?.pose || pose,
        seatId: changed?.seatId || null,
        positionX: changed?.x ?? member.positionX,
        positionY: changed?.y ?? member.positionY,
        facing: changed?.facing || member.facing,
      } : member),
    } : current);
    return true;
  };

  const sitAtSeat = async (seat) => {
    if (await setPose('sitting', seat)) showNotice(`${seat.label} sırasına oturdun.`);
  };

  const standUp = async () => {
    if (await setPose('standing')) showNotice('Ayağa kalktın.');
  };

  const sceneAction = async (action) => {
    if (action === 'jump' && me?.pose === 'sitting') return;
    await sendReaction(action);
  };

  const runBoardMutation = async (rpc, payload = {}) => {
    setBoardBusy(true);
    const { data: updated, error: boardError } = await supabase.rpc(rpc, { p_group_id: groupId, ...payload });
    setBoardBusy(false);
    if (boardError) {
      setError(boardError.message || 'Sınıf tahtası güncellenemedi.');
      return null;
    }
    if (updated) setBoard(updated);
    return updated;
  };

  const saveBoardText = async (text) => {
    if (await runBoardMutation('save_classroom_board_text', { p_text: text })) showNotice('Tahta notu kaydedildi.');
  };

  const appendBoardStroke = (stroke) => runBoardMutation('append_classroom_board_stroke', { p_stroke: stroke });
  const undoBoardStroke = () => runBoardMutation('undo_classroom_board_stroke');
  const clearBoard = async () => {
    if (!window.confirm('Tahtadaki tüm not ve çizimleri temizlemek istiyor musun?')) return;
    if (await runBoardMutation('clear_classroom_board')) showNotice('Sınıf tahtası temizlendi.');
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

  const saveAvatar = async (avatar) => {
    setAvatarBusy(true);
    const { data: saved, error: avatarError } = await supabase.rpc('update_classroom_character', { p_model: avatar.model });
    setAvatarBusy(false);
    if (avatarError) {
      setError(avatarError.message || 'Karakterin kaydedilemedi.');
      return;
    }
    setData((current) => current ? {
      ...current,
      members: current.members.map((member) => member.userId === userId ? { ...member, avatarModel: saved.model } : member),
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
    const { data: updated, error: settingsError } = await supabase.rpc('update_study_group_room_v3', {
      p_group_id: groupId,
      p_theme: roomTheme,
      p_motto: roomMotto,
      p_description: roomDescription,
      p_weekly_goal_minutes: Number(weeklyGoal),
      p_members_can_start_focus: roomPermissions.focus,
      p_members_can_chat: roomPermissions.chat,
      p_members_can_react: roomPermissions.react,
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
  const muteExpiresAt = [room?.viewerMutedUntil, room?.globalMutedUntil].filter(Boolean).sort().at(-1);
  const viewerIsMuted = muteExpiresAt && Date.parse(muteExpiresAt) > clockNow;
  const moderationByUser = new Map((data?.memberModeration || []).map((item) => [item.userId, item]));

  const moderateMember = async (action) => {
    if (!moderationTarget) return;
    setModerationBusy(true);
    const { error: moderationError } = await supabase.rpc('moderate_study_group_member', {
      p_group_id: groupId, p_user_id: moderationTarget.userId, p_action: action,
      p_duration_minutes: action === 'mute' ? Number(moderationDuration) : null,
      p_reason: action === 'mute' ? moderationReason : null,
    });
    setModerationBusy(false);
    if (moderationError) { setError(moderationError.message || 'Üye işlemi tamamlanamadı.'); return; }
    setModerationTarget(null); setModerationReason(''); setOwnershipConfirm(false);
    await loadRoom({ quiet: true });
    showNotice(action === 'remove' ? 'Üye sınıftan çıkarıldı.' : action === 'mute' ? 'Üye seçilen süre boyunca susturuldu.' : action === 'transfer_owner' ? 'Sınıf sahipliği güvenle devredildi.' : 'Üyenin susturması kaldırıldı.');
  };

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
                <p>{room.description}</p>
                <small className="classroom-live-summary"><b>{onlineCount}</b> kişi burada · {members.length}/{room.maxMembers} üye · Mesajlar ve konumlar canlı güncellenir</small>
              </div>
              <div className="classroom-header-actions">
                <button onClick={toggleScene}>{sceneVisible ? <EyeOff size={16} /> : <Eye size={16} />} {sceneVisible ? 'Görseli gizle' : 'Görseli aç'}</button>
                {room.inviteCode && <button onClick={copyInvite}><Clipboard size={16} /> {copied ? 'Kod kopyalandı' : room.inviteCode}</button>}
                {isOwner && <button onClick={() => setRoomSettingsOpen(true)}><Settings2 size={16} /> Sınıfı düzenle</button>}
                <button className="leave-room-button" onClick={() => setLeaveOpen(true)}><LogOut size={16} /> {isOwner ? 'Sınıfı kapat' : 'Sınıftan ayrıl'}</button>
              </div>
            </header>
            {viewerIsMuted && <div className="classroom-muted-banner"><VolumeX size={17} /><div><strong>Sınıf iletişimin geçici olarak sınırlandı</strong><span>{room.viewerMuteReason || room.globalMuteReason || 'Moderasiya kararı'} · {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(muteExpiresAt))} tarihine kadar</span></div></div>}

            <section className={`classroom-overview-grid${sceneVisible ? '' : ' is-scene-hidden'}`}>
              {sceneVisible ? <ClassroomScene
                room={room}
                members={members}
                userId={userId}
                localPosition={localPosition}
                reactions={data.reactions || []}
                onMove={moveCharacter}
                onEnterZone={enterZone}
                onOpenAvatar={() => setAvatarOpen(true)}
                onOpenBoard={() => setBoardOpen(true)}
                onSit={sitAtSeat}
                onStand={standUp}
                onAction={sceneAction}
                board={board}
              /> : <article className="classroom-scene-collapsed study-panel"><EyeOff size={24} /><div><strong>Sınıf görseli kapalı</strong><span>Odak, sohbet ve diğer araçları daha kompakt kullanmaya devam edebilirsin.</span></div><button onClick={toggleScene}><Eye size={16} /> 3D sınıfı aç</button></article>}

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
                      <button className="start-focus-button" onClick={startFocus} disabled={focusBusy || viewerIsMuted || (!isOwner && !room.membersCanStartFocus)}><Play size={16} /> {focusBusy ? 'Başlatılıyor…' : 'Ortak odağı başlat'}</button>
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
                    <label><span>Şu an ne çalışıyorsun?</span><input value={focusSubject} onChange={(event) => { focusEditingRef.current = true; setFocusSubject(event.target.value); }} maxLength={60} placeholder="Örn. TYT Matematik · Problemler" /></label>
                    <button disabled={presenceBusy}>{presenceBusy ? 'Güncelleniyor…' : 'Durumumu güncelle'}</button>
                  </form>
                  <button className="customize-avatar-button" onClick={() => setAvatarOpen(true)}><Palette size={17} /><span><b>Karakterimi özelleştir</b><small>8 yönlü profesyonel görünümünü seç</small></span>{me && <ClassroomAvatar avatar={{ model: me.avatarModel }} name={me.name} size={52} facing="south_east" />}</button>
                  <div className="classroom-privacy-note"><LockKeyhole size={15} /><span>Canlı durumun, karakterin ve konumun yalnızca bu sınıfın üyelerine görünür.</span></div>
                </article>

                <article className="reaction-card study-panel">
                  <header><span>Sessiz tepkiler</span><h2>Sınıfa küçük bir işaret bırak</h2></header>
                  <div>{Object.entries(REACTION_META).map(([key, meta]) => { const Icon = meta.icon; return <button key={key} disabled={viewerIsMuted || (!isOwner && !room.membersCanReact)} onClick={() => sendReaction(key)} title={meta.label} aria-label={meta.label}><Icon size={18} /><span>{meta.label}</span></button>; })}</div>
                </article>
              </aside>
            </section>

            <section className="classroom-community-grid">
              <ClassroomChat
                supabase={supabase}
                groupId={groupId}
                userId={userId}
                isOwner={isOwner}
                room={room}
                messages={data.messages || []}
                viewerIsMuted={viewerIsMuted}
                onError={setError}
                onRefresh={loadMessages}
              />

              <article className="classroom-members-panel study-panel">
                <header><div><span><ShieldCheck size={15} /> Üyeler</span><h2>{isOwner ? 'Sınıfını güvenle yönet' : 'Sınıf arkadaşların'}</h2></div><em>{members.length}/{room.maxMembers}</em></header>
                <div>{members.map((member) => { const memberModeration = moderationByUser.get(member.userId); const isMuted = memberModeration?.mutedUntil && Date.parse(memberModeration.mutedUntil) > clockNow; return <article key={member.userId}><ClassroomAvatar avatar={{ model: member.avatarModel }} name={member.name} size={46} facing="south_east" /><div><strong>{member.userId === userId ? 'Sen' : member.name}{member.role === 'owner' ? ' · Kurucu' : ''}</strong><small>{member.presence === 'offline' ? 'Çevrimdışı' : STATUS_META[member.presence]?.label || 'Sınıfta'}{isMuted ? ' · Susturuldu' : ''}</small></div>{isOwner && member.userId !== userId && <button onClick={() => { setModerationTarget({ ...member, isMuted }); setModerationReason(memberModeration?.muteReason || ''); setOwnershipConfirm(false); }}><ShieldCheck size={15} /> Yönet</button>}</article>; })}</div>
              </article>
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
                    <article key={member.userId}><em>{index + 1}</em><span className="ranking-avatar"><ClassroomAvatar avatar={{ model: member.avatarModel }} name={member.name} size={42} facing="south_east" /></span><div><strong>{member.userId === userId ? 'Sen' : member.name}</strong><small>{member.presence === 'studying' ? 'Şu anda çalışıyor' : `${member.studyDays ?? '—'} çalışma günü`}</small></div><b>{Number(member.weeklyMinutes || 0).toLocaleString('tr-TR')} dk</b></article>
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

      {avatarOpen && <AvatarStudio open onClose={() => setAvatarOpen(false)} initialAvatar={{ model: me?.avatarModel }} name={me?.name || 'Sen'} onSave={saveAvatar} busy={avatarBusy} />}

      <ClassroomBoard
        open={boardOpen}
        board={board}
        isOwner={isOwner}
        busy={boardBusy}
        onClose={() => setBoardOpen(false)}
        onSaveText={saveBoardText}
        onAppendStroke={appendBoardStroke}
        onUndo={undoBoardStroke}
        onClear={clearBoard}
      />

      <Modal open={roomSettingsOpen} onClose={() => setRoomSettingsOpen(false)} title="Sınıf atmosferini düzenle" description="Bu ayarlar tüm sınıf üyelerinin gördüğü ortak alanı değiştirir.">
        <form className="room-settings-form" onSubmit={saveRoomSettings}>
          <label><span>Sınıf teması</span><Select value={roomTheme} onChange={setRoomTheme} options={THEME_OPTIONS} ariaLabel="Sınıf teması" /></label>
          <label><span>Tahta mesajı</span><input value={roomMotto} onChange={(event) => setRoomMotto(event.target.value)} minLength={2} maxLength={80} required /></label>
          <label><span>Sınıf açıklaması</span><textarea value={roomDescription} onChange={(event) => setRoomDescription(event.target.value)} minLength={8} maxLength={180} required /></label>
          <label><span>Haftalık ortak hedef (dakika)</span><input type="number" value={weeklyGoal} onChange={(event) => setWeeklyGoal(event.target.value)} min="30" max="50000" required /></label>
          <fieldset className="room-permission-options"><legend>Üye yetkileri</legend>{[['focus','Ortak odak başlatabilsin'],['chat','Sohbete yazabilsin'],['react','Sessiz tepki gönderebilsin']].map(([key,label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={roomPermissions[key]} onChange={(event) => setRoomPermissions((current) => ({ ...current, [key]: event.target.checked }))} /></label>)}</fieldset>
          <footer><button type="button" className="study-button" onClick={() => setRoomSettingsOpen(false)}>Vazgeç</button><button className="study-button study-button-primary" disabled={roomSettingsBusy}>{roomSettingsBusy ? 'Kaydediliyor…' : 'Sınıfı güncelle'}</button></footer>
        </form>
      </Modal>

      <Modal open={Boolean(moderationTarget)} onClose={() => { setModerationTarget(null); setOwnershipConfirm(false); }} title={`${moderationTarget?.name || 'Üye'} · sınıf yönetimi`} description="Susturma yalnızca bu sınıfın sohbet, tepki ve ortak odak araçlarını sınırlar.">
        <div className="member-moderation-form">
          {moderationTarget?.isMuted ? <button className="study-button study-button-primary" onClick={() => moderateMember('unmute')} disabled={moderationBusy}><Volume2 size={16} /> Susturmayı kaldır</button> : <><label><span>Süre</span><Select value={moderationDuration} onChange={setModerationDuration} ariaLabel="Susturma süresi" options={[{ value:'15',label:'15 dakika'},{ value:'60',label:'1 saat'},{ value:'1440',label:'24 saat'},{ value:'10080',label:'7 gün' }]} /></label><label><span>Neden</span><textarea value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} maxLength={240} placeholder="Üyeye uygulanacak sınırın nedenini yaz" /></label><button className="study-button study-button-primary" onClick={() => moderateMember('mute')} disabled={moderationBusy || !moderationReason.trim()}><VolumeX size={16} /> Seçilen süre sustur</button></>}
          <div className={`moderation-transfer${ownershipConfirm ? ' is-confirming' : ''}`}><div><strong>{ownershipConfirm ? 'Bu değişikliği onaylıyor musun?' : 'Sınıf sahipliğini devret'}</strong><span>{ownershipConfirm ? `${moderationTarget?.name} yeni sınıf sahibi olacak.` : 'Yeni sahip ayarları ve üyeleri yönetir; sen normal üye olarak kalırsın.'}</span></div>{ownershipConfirm ? <span className="ownership-confirm-actions"><button onClick={() => setOwnershipConfirm(false)} disabled={moderationBusy}>Vazgeç</button><button onClick={() => moderateMember('transfer_owner')} disabled={moderationBusy}><ArrowRightLeft size={16} /> Onayla ve devret</button></span> : <button onClick={() => setOwnershipConfirm(true)} disabled={moderationBusy}><ArrowRightLeft size={16} /> Sahipliği devret</button>}</div>
          <div className="moderation-danger"><div><strong>Sınıftan çıkar</strong><span>Yeniden katılmak için davet koduna ihtiyaç duyar.</span></div><button onClick={() => moderateMember('remove')} disabled={moderationBusy}><UserMinus size={16} /> Üyeyi çıkar</button></div>
        </div>
      </Modal>

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title={isOwner ? 'Çalışma sınıfını kapat' : 'Sınıftan ayrıl'} description={isOwner && members.length > 1 ? 'Sınıfta başka üyeler varken sahipliği devretmeden kapatamazsın.' : 'Bu işlemden sonra yeniden katılmak için davet koduna ihtiyacın olacak.'}>
        <div className="leave-room-confirm"><button className="study-button" onClick={() => setLeaveOpen(false)}>Vazgeç</button><button className="study-button study-button-danger" onClick={leaveRoom} disabled={leaving || (isOwner && members.length > 1)}>{leaving ? 'İşleniyor…' : isOwner ? 'Sınıfı kapat' : 'Sınıftan ayrıl'}</button></div>
      </Modal>
    </div>
  );
}
