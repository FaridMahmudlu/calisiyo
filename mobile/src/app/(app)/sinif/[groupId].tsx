import * as Clipboard from 'expo-clipboard';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowRightLeft, BookOpenCheck, Coffee, Copy, Flame, Goal, LogOut, Palette, PauseCircle, Play, Settings2, Share2, ShieldCheck, Sparkles, Trophy, UserMinus, UsersRound, Volume2, VolumeX,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Chip, ErrorState, IconButton, Notice, ProgressBar, Segmented, Select, Sheet, SkeletonCards, SwitchRow, Text, TextField, useToast } from '@/components/ui';
import { ClassroomAvatar } from '@/features/classroom/Avatar';
import { AvatarStudio } from '@/features/classroom/AvatarStudio';
import { ClassroomBoard, type BoardState } from '@/features/classroom/Board';
import { ClassroomChat, type ChatMessage } from '@/features/classroom/Chat';
import { ClassroomScene } from '@/features/classroom/Scene';
import { REACTION_META, STATUS_LABEL, type Member, type Position, type ReactionKey, type Seat, type Zone } from '@/features/classroom/world';
import { useNow } from '@/hooks/useNow';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, typography } from '@/theme/tokens';

type Room = {
  id: string; name: string; description?: string; motto?: string; theme?: string; maxMembers: number; inviteCode?: string; ownerId: string; weeklyGoalMinutes: number; weeklyMinutes?: number;
  membersCanStartFocus?: boolean; membersCanChat?: boolean; membersCanReact?: boolean; viewerMutedUntil?: string | null; globalMutedUntil?: string | null; viewerMuteReason?: string | null; globalMuteReason?: string | null; serverTime?: string;
};
type RoomData = { room: Room; members: Member[]; messages?: ChatMessage[]; reactions?: { userId: string; reaction: string; createdAt: string }[]; focusSession?: { id: string; endsAt: string; durationMinutes: number; starterName?: string; startedBy?: string } | null; memberModeration?: { userId: string; mutedUntil?: string | null; muteReason?: string | null }[] };
type Tab = 'room' | 'chat' | 'members';
const STATUS_OPTIONS = [
  { value: 'studying', label: 'Çalışıyor', icon: BookOpenCheck },
  { value: 'break', label: 'Molada', icon: Coffee },
  { value: 'online', label: 'Sınıfta', icon: Sparkles },
] as const;
const FOCUS_DURATIONS = [15, 25, 40, 50];
const THEMES = [{ value: 'sunny', label: 'Aydınlık sınıf', description: 'Taze ve sakin yeşil tonlar' }, { value: 'library', label: 'Sessiz kütüphane', description: 'Derin odak için sıcak tonlar' }, { value: 'evening', label: 'Akşam etüdü', description: 'Yumuşak ve düşük ışıklı ortam' }];
const formatTimer = (seconds: number) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;

export default function ClassroomScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { user } = useAccount();
  const userId = user?.id || '';
  const [tab, setTab] = useState<Tab>('room');
  const [data, setData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('online');
  const [focusSubject, setFocusSubject] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [board, setBoard] = useState<BoardState>({ text: '', strokes: [], version: 0 });
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardBusy, setBoardBusy] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusBusy, setFocusBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ theme: 'sunny', motto: '', description: '', goal: '1200', focus: true, chat: true, react: true });
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [moderation, setModeration] = useState<(Member & { isMuted?: boolean }) | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [moderationDuration, setModerationDuration] = useState('60');
  const [moderationBusy, setModerationBusy] = useState(false);
  const now = useNow(1000);
  const [serverOffset, setServerOffset] = useState(0);
  const lastLocalMove = useRef(0);
  const lastPresenceMutation = useRef(0);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMove = useRef<Position | null>(null);
  const focusExpired = useRef<string | null>(null);
  const presenceStarted = useRef(false);
  const editingSubject = useRef(false);

  const showError = useCallback((message: string) => toast.error(message), [toast]);

  const loadRoom = useCallback(() => {
    if (!groupId || !userId) return Promise.resolve();
    const requestedAt = Date.now();
    return Promise.resolve(supabase.rpc('get_group_room_v4', { p_group_id: groupId })).then(({ data: roomData, error }) => {
      if (error) setLoadError(error.message || 'Çalışma sınıfı yüklenemedi.');
      else {
        const next = roomData as RoomData;
        setData(next);
        setLoadError('');
        setServerOffset(next?.room?.serverTime ? Date.parse(next.room.serverTime) - Date.now() : 0);
        const me = next?.members?.find((member) => member.userId === userId);
        const fresh = requestedAt >= lastPresenceMutation.current;
        if (fresh && me?.presence && me.presence !== 'offline') setStatus(me.presence);
        if (fresh && !editingSubject.current) setFocusSubject(me?.focusSubject || '');
        if (me && Date.now() - lastLocalMove.current >= 1000) setPosition({ x: Number(me.positionX ?? 50), y: Number(me.positionY ?? 72), facing: me.facing || 'east' });
        if (next?.room) setSettings({
          theme: next.room.theme || 'sunny', motto: next.room.motto || 'Birlikte odaklan, kendi ritminde ilerle.', description: next.room.description || 'Birlikte düzenli çalışmak için kurulan özel sınıf.',
          goal: String(next.room.weeklyGoalMinutes || 1200), focus: next.room.membersCanStartFocus !== false, chat: next.room.membersCanChat !== false, react: next.room.membersCanReact !== false,
        });
      }
      setLoading(false);
    });
  }, [groupId, userId]);

  const loadMessages = useCallback(async () => {
    if (!groupId) return;
    const { data: messages, error } = await supabase.rpc('get_group_messages_v2', { p_group_id: groupId });
    if (error) return showError(error.message || 'Sınıf sohbeti yenilenemedi.');
    setData((current) => current ? { ...current, messages: messages || [] } : current);
  }, [groupId, showError]);

  const loadInteractions = useCallback(() => {
    if (!groupId) return Promise.resolve();
    return Promise.resolve(supabase.rpc('get_classroom_interaction_state', { p_group_id: groupId })).then(({ data: interaction, error }) => {
      if (error) return;
      setBoard(interaction?.board || { text: '', strokes: [], version: 0 });
      const poses = new Map((interaction?.poses || []).map((item: any) => [item.userId, item]));
      setData((current) => current ? { ...current, members: current.members.map((member) => ({ ...member, ...((poses.get(member.userId) as object) || {}) })) } : current);
    });
  }, [groupId]);

  const loadPresence = useCallback(async () => {
    if (!groupId || !userId) return;
    const requestedAt = Date.now();
    const { data: members, error } = await supabase.rpc('get_group_presence_snapshot', { p_group_id: groupId });
    if (error) return;
    const snapshot = new Map((members || []).map((member: any) => [member.userId, member]));
    setData((current) => current ? {
      ...current,
      members: current.members.map((member) => {
        const next: any = snapshot.get(member.userId);
        if (!next) return member;
        const recentMove = member.userId === userId && Date.now() - lastLocalMove.current < 1200;
        const recentPresence = member.userId === userId && (requestedAt < lastPresenceMutation.current || Date.now() - lastPresenceMutation.current < 1500);
        return {
          ...member,
          presence: recentPresence ? member.presence : (next.presence || 'offline'),
          focusSubject: recentPresence ? member.focusSubject : (next.focusSubject || null),
          positionX: recentMove ? member.positionX : Number(next.positionX ?? member.positionX),
          positionY: recentMove ? member.positionY : Number(next.positionY ?? member.positionY),
          facing: recentMove ? member.facing : (next.facing || member.facing),
        };
      }),
    } : current);
  }, [groupId, userId]);

  const updatePresence = useCallback(async (nextStatus: string, subject: string, { quiet = false } = {}) => {
    if (!groupId) return false;
    lastPresenceMutation.current = Date.now();
    const { error } = await supabase.rpc('set_classroom_presence', { p_group_id: groupId, p_status: nextStatus, p_focus_subject: subject || null });
    if (error) { if (!quiet) showError(error.message || 'Sınıf durumun güncellenemedi.'); return false; }
    editingSubject.current = false;
    setData((current) => current ? { ...current, members: current.members.map((member) => member.userId === userId ? { ...member, presence: nextStatus, focusSubject: subject || null } : member) } : current);
    return true;
  }, [groupId, showError, userId]);

  useEffect(() => { loadRoom(); }, [loadRoom]);
  useEffect(() => { if (data?.room?.id) loadInteractions(); }, [data?.room?.id, loadInteractions]);
  useEffect(() => {
    if (!data?.room?.id || presenceStarted.current) return;
    presenceStarted.current = true;
    updatePresence(status, focusSubject, { quiet: true }).then(() => loadRoom());
  }, [data?.room?.id, focusSubject, loadRoom, status, updatePresence]);

  useEffect(() => {
    if (!groupId || !userId) return undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;
    (async () => {
      await supabase.realtime.setAuth();
      if (disposed) return;
      channel = supabase.channel(`classroom:${groupId}:${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_presence', filter: `group_id=eq.${groupId}` }, (change: any) => {
          const row = change.new;
          if (!row?.user_id) { loadRoom(); return; }
          const protect = row.user_id === userId && Date.now() - lastLocalMove.current < 1200;
          if (row.user_id === userId && !protect) setPosition({ x: Number(row.position_x ?? 50), y: Number(row.position_y ?? 72), facing: row.facing || 'east' });
          setData((current) => current ? {
            ...current,
            members: current.members.map((member) => member.userId === row.user_id ? {
              ...member, presence: row.status || 'online', focusSubject: row.focus_subject || null,
              positionX: protect ? member.positionX : Number(row.position_x ?? member.positionX), positionY: protect ? member.positionY : Number(row.position_y ?? member.positionY),
              facing: protect ? member.facing : (row.facing || member.facing), pose: row.pose || member.pose || 'standing', seatId: row.seat_id || null,
            } : member),
          } : current);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_reactions', filter: `group_id=eq.${groupId}` }, () => loadRoom())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_messages', filter: `group_id=eq.${groupId}` }, loadMessages)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_message_reads', filter: `group_id=eq.${groupId}` }, loadMessages)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members', filter: `group_id=eq.${groupId}` }, () => loadRoom())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_focus_sessions', filter: `group_id=eq.${groupId}` }, () => loadRoom())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_boards', filter: `group_id=eq.${groupId}` }, loadInteractions)
        .subscribe((state) => { if (state === 'SUBSCRIBED' && !disposed) loadRoom(); });
    })().catch(() => showError('Canlı sınıf bağlantısı kurulamadı.'));
    return () => { disposed = true; if (channel) supabase.removeChannel(channel); };
  }, [groupId, loadInteractions, loadMessages, loadRoom, showError, userId]);

  // Presence heartbeat + snapshot polling only while this screen is visible.
  useFocusEffect(useCallback(() => {
    if (!groupId || !userId) return undefined;
    const heartbeat = setInterval(() => { if (AppState.currentState === 'active') updatePresence(status, focusSubject, { quiet: true }); }, 45000);
    const snapshot = setInterval(() => { if (AppState.currentState === 'active') loadPresence(); }, 3000);
    return () => { clearInterval(heartbeat); clearInterval(snapshot); };
  }, [focusSubject, groupId, loadPresence, status, updatePresence, userId]));

  const remaining = data?.focusSession?.endsAt ? Math.max(0, Math.ceil((Date.parse(data.focusSession.endsAt) - (now + serverOffset)) / 1000)) : 0;
  useEffect(() => {
    const session = data?.focusSession;
    if (!session?.endsAt || remaining > 0 || focusExpired.current === session.id) return undefined;
    focusExpired.current = session.id;
    const timer = setTimeout(() => loadRoom(), 500);
    return () => clearTimeout(timer);
  }, [data?.focusSession, loadRoom, remaining]);

  const room = data?.room;
  const members = data?.members || [];
  const me = members.find((member) => member.userId === userId);
  const isOwner = room?.ownerId === userId;
  const onlineCount = members.filter((member) => member.presence !== 'offline').length;
  const muteExpiresAt = [room?.viewerMutedUntil, room?.globalMutedUntil].filter(Boolean).sort().at(-1) as string | undefined;
  const viewerIsMuted = !!muteExpiresAt && Date.parse(muteExpiresAt) > now;
  const canChat = !viewerIsMuted && (isOwner || room?.membersCanChat !== false);
  const canReact = !viewerIsMuted && (isOwner || room?.membersCanReact !== false);
  const moderationByUser = new Map((data?.memberModeration || []).map((item) => [item.userId, item]));
  const weeklyProgress = room ? Math.min(100, (Number(room.weeklyMinutes || 0) / Number(room.weeklyGoalMinutes || 1)) * 100) : 0;

  const sendMove = async (next: Position) => {
    const { data: moved, error } = await supabase.rpc('move_in_classroom', { p_group_id: groupId, p_x: Number(next.x.toFixed(2)), p_y: Number(next.y.toFixed(2)), p_facing: next.facing });
    if (error) return showError(error.message || 'Sınıftaki konumun güncellenemedi.');
    if (moved?.throttled) setPosition({ x: Number(moved.x), y: Number(moved.y), facing: moved.facing || 'east' });
    setData((current) => current ? { ...current, members: current.members.map((member) => member.userId === userId ? { ...member, pose: 'standing', seatId: null } : member) } : current);
  };
  const move = (next: Position, immediate = true) => {
    lastLocalMove.current = Date.now();
    setPosition(next);
    latestMove.current = next;
    if (moveTimer.current) clearTimeout(moveTimer.current);
    if (immediate) { sendMove(next); return; }
    moveTimer.current = setTimeout(() => { if (latestMove.current) sendMove(latestMove.current); }, 260);
  };
  const enterZone = async (zone: Zone) => {
    const dx = zone.x - Number(position?.x ?? 50); const dy = zone.y - Number(position?.y ?? 72);
    const vertical = Math.abs(dy) > 2 ? (dy < 0 ? 'north' : 'south') : ''; const horizontal = Math.abs(dx) > 2 ? (dx < 0 ? 'west' : 'east') : '';
    move({ x: zone.x, y: zone.y, facing: vertical && horizontal ? `${vertical}_${horizontal}` : horizontal || vertical || 'east' });
    setStatus(zone.status);
    await updatePresence(zone.status, focusSubject, { quiet: true });
    toast.show(`${zone.label} alanına geçtin.`);
  };
  const setPose = async (pose: string, seat: Seat | null = null) => {
    const { data: changed, error } = await supabase.rpc('set_classroom_pose', { p_group_id: groupId, p_pose: pose, p_seat_id: seat?.id || null });
    if (error) { showError(error.code === '23505' ? 'Bu sırada başka bir öğrenci oturuyor.' : (error.message || 'Karakter duruşun güncellenemedi.')); return false; }
    if (changed?.x != null) { lastLocalMove.current = Date.now(); setPosition({ x: Number(changed.x), y: Number(changed.y), facing: changed.facing || 'north' }); }
    setData((current) => current ? { ...current, members: current.members.map((member) => member.userId === userId ? { ...member, pose: changed?.pose || pose, seatId: changed?.seatId || null } : member) } : current);
    return true;
  };
  const sendReaction = async (reaction: ReactionKey) => {
    if (reaction === 'jump' && me?.pose === 'sitting') return;
    const { data: created, error } = await supabase.rpc('send_classroom_reaction', { p_group_id: groupId, p_reaction: reaction });
    if (error) return showError(error.message || 'Tepkin gönderilemedi.');
    setData((current) => current ? { ...current, reactions: [created, ...(current.reactions || [])].slice(0, 12) } : current);
  };
  const runBoard = async (rpc: string, payload: Record<string, unknown> = {}) => {
    setBoardBusy(true);
    const { data: updated, error } = await supabase.rpc(rpc, { p_group_id: groupId, ...payload });
    setBoardBusy(false);
    if (error) { showError(error.message || 'Sınıf tahtası güncellenemedi.'); return null; }
    if (updated) setBoard(updated);
    return updated;
  };
  const saveAvatar = async (model: string) => {
    setAvatarBusy(true);
    const { data: saved, error } = await supabase.rpc('update_classroom_character', { p_model: model });
    setAvatarBusy(false);
    if (error) return showError(error.message || 'Karakterin kaydedilemedi.');
    setData((current) => current ? { ...current, members: current.members.map((member) => member.userId === userId ? { ...member, avatarModel: saved.model } : member) } : current);
    await updatePresence(status, focusSubject, { quiet: true });
    setAvatarOpen(false);
    toast.success('Karakterin sınıfta güncellendi.');
  };
  const startFocus = async () => {
    setFocusBusy(true);
    const { data: session, error } = await supabase.rpc('start_group_focus', { p_group_id: groupId, p_duration_minutes: focusDuration });
    setFocusBusy(false);
    if (error) return showError(error.message || 'Ortak odak turu başlatılamadı.');
    setData((current) => current ? { ...current, focusSession: session } : current);
    setStatus('studying');
    await updatePresence('studying', focusSubject, { quiet: true });
    toast.success(`${focusDuration} dakikalık ortak odak başladı.`);
  };
  const stopFocus = async () => {
    setFocusBusy(true);
    const { error } = await supabase.rpc('stop_group_focus', { p_group_id: groupId });
    setFocusBusy(false);
    if (error) return showError(error.message || 'Odak turu durdurulamadı.');
    setData((current) => current ? { ...current, focusSession: null } : current);
  };
  const saveSettings = async () => {
    setSettingsBusy(true);
    const { data: updated, error } = await supabase.rpc('update_study_group_room_v3', {
      p_group_id: groupId, p_theme: settings.theme, p_motto: settings.motto, p_description: settings.description, p_weekly_goal_minutes: Number(settings.goal),
      p_members_can_start_focus: settings.focus, p_members_can_chat: settings.chat, p_members_can_react: settings.react,
    });
    setSettingsBusy(false);
    if (error) return showError(error.message || 'Sınıf ayarları kaydedilemedi.');
    setData((current) => current ? { ...current, room: { ...current.room, ...updated } } : current);
    setSettingsOpen(false);
    toast.success('Sınıf görünümü güncellendi.');
  };
  const moderate = async (action: 'mute' | 'unmute' | 'remove' | 'transfer_owner') => {
    if (!moderation) return;
    setModerationBusy(true);
    const { error } = await supabase.rpc('moderate_study_group_member', {
      p_group_id: groupId, p_user_id: moderation.userId, p_action: action,
      p_duration_minutes: action === 'mute' ? Number(moderationDuration) : null, p_reason: action === 'mute' ? moderationReason : null,
    });
    setModerationBusy(false);
    if (error) return showError(error.message || 'Üye işlemi tamamlanamadı.');
    setModeration(null); setModerationReason('');
    await loadRoom();
    toast.success(action === 'remove' ? 'Üye sınıftan çıkarıldı.' : action === 'mute' ? 'Üye seçilen süre boyunca susturuldu.' : action === 'transfer_owner' ? 'Sınıf sahipliği devredildi.' : 'Üyenin susturması kaldırıldı.');
  };
  const leave = () => {
    if (isOwner && members.length > 1) return Alert.alert('Sınıfı kapat', 'Sınıfta başka üyeler varken sahipliği devretmeden kapatamazsın.');
    Alert.alert(isOwner ? 'Çalışma sınıfını kapat' : 'Sınıftan ayrıl', 'Bu işlemden sonra yeniden katılmak için davet koduna ihtiyacın olacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: isOwner ? 'Sınıfı kapat' : 'Ayrıl', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('leave_study_group', { p_group_id: groupId });
        if (error) return showError(error.message || 'Sınıftan ayrılamadın.');
        router.back();
      } },
    ]);
  };

  const refresh = async () => { setRefreshing(true); await Promise.all([loadRoom(), loadMessages(), loadInteractions()]); setRefreshing(false); };

  if (loading && !data) return <View style={{ flex: 1, padding: space.lg, backgroundColor: colors.background }}><SkeletonCards count={4} /></View>;
  if (!room) return <View style={{ flex: 1, padding: space.lg, backgroundColor: colors.background }}><ErrorState message={loadError || 'Sınıf bulunamadı.'} onRetry={() => loadRoom()} /></View>;

  const scrollProps = { contentContainerStyle: { padding: space.lg, gap: space.md, paddingBottom: insets.bottom + 60 }, refreshControl: <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} /> };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{
        title: room.name,
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            {room.inviteCode ? <IconButton icon={Share2} label="Davet kodunu paylaş" onPress={() => Share.share({ message: `Calisiyo çalışma sınıfıma katıl: ${room.name}\nDavet kodu: ${room.inviteCode}` })} /> : null}
            {isOwner ? <IconButton icon={Settings2} label="Sınıfı düzenle" onPress={() => setSettingsOpen(true)} /> : null}
            <IconButton icon={LogOut} label={isOwner ? 'Sınıfı kapat' : 'Sınıftan ayrıl'} tone="danger" onPress={leave} />
          </View>
        ),
      }} />
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm }}>
        <Text variant="caption" color="textMuted"><Text variant="captionStrong" color="primary">{onlineCount}</Text> kişi burada · {members.length}/{room.maxMembers} üye · canlı</Text>
        <Segmented options={[{ value: 'room', label: 'Sınıf' }, { value: 'chat', label: `Sohbet${(data?.messages || []).length ? ` · ${(data?.messages || []).length}` : ''}` }, { value: 'members', label: 'Üyeler' }]} value={tab} onChange={setTab} />
        {viewerIsMuted ? <Notice tone="warning" icon={VolumeX}>Sınıf iletişimin geçici olarak sınırlandı: {room.viewerMuteReason || room.globalMuteReason || 'Moderasyon kararı'} · {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(muteExpiresAt!))}</Notice> : null}
      </View>

      {tab === 'chat' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
          <View style={{ flex: 1, paddingBottom: insets.bottom }}>
            <ClassroomChat groupId={groupId!} userId={userId} canChat={canChat} isOwner={!!isOwner} messages={data?.messages || []} onError={showError} onRefresh={loadMessages} />
          </View>
        </KeyboardAvoidingView>
      ) : tab === 'room' ? (
        <ScrollView {...scrollProps}>
          <ClassroomScene theme={room.theme} motto={board.text || room.motto || room.name} members={members} userId={userId} position={position} reactions={data?.reactions || []}
            onMove={(next) => move(next)} onEnterZone={enterZone} onSit={async (seat) => { if (await setPose('sitting', seat)) toast.show(`${seat.label} sırasına oturdun.`); }}
            onStand={async () => { if (await setPose('standing')) toast.show('Ayağa kalktın.'); }} onAction={sendReaction} onOpenBoard={() => setBoardOpen(true)} onOpenAvatar={() => setAvatarOpen(true)} canReact={canReact} />

          <Card tone={data?.focusSession ? 'primary' : 'default'} style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label" color="primary">Ortak odak</Text>
              {data?.focusSession ? <Badge label="CANLI" tone="danger" /> : null}
            </View>
            {data?.focusSession ? (
              <>
                <Text style={[typography.mono, { color: colors.text, fontSize: 44, lineHeight: 52 }]}>{formatTimer(remaining)}</Text>
                <Text variant="caption" color="textMuted"><Text variant="captionStrong">{data.focusSession.starterName || 'Bir sınıf üyesi'}</Text> başlattı · {data.focusSession.durationMinutes} dakika</Text>
                <ProgressBar value={((data.focusSession.durationMinutes * 60 - remaining) / (data.focusSession.durationMinutes * 60)) * 100} />
                {data.focusSession.startedBy === userId || isOwner ? <Button title="Turu durdur" icon={PauseCircle} variant="secondary" loading={focusBusy} onPress={stopFocus} /> : null}
              </>
            ) : (
              <>
                <Text variant="heading">Birlikte başlayın</Text>
                <Text variant="caption" color="textMuted">Aynı sayacı paylaşın; herkes kendi dersine odaklansın.</Text>
                <View style={{ flexDirection: 'row', gap: space.sm }}>{FOCUS_DURATIONS.map((minutes) => <Chip key={minutes} label={`${minutes} dk`} active={focusDuration === minutes} onPress={() => setFocusDuration(minutes)} />)}</View>
                <Button title="Ortak odağı başlat" icon={Play} loading={focusBusy} disabled={viewerIsMuted || (!isOwner && room.membersCanStartFocus === false)} onPress={startFocus} />
              </>
            )}
          </Card>

          <Card style={{ gap: space.md }}>
            <Text variant="heading">Sınıfta nasıl görünüyorsun?</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {STATUS_OPTIONS.map((option) => {
                const Icon = option.icon; const active = status === option.value;
                return (
                  <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={async () => { const previous = status; setStatus(option.value); if (!(await updatePresence(option.value, focusSubject))) setStatus(previous); }}
                    style={[styles.statusOption, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface }]}>
                    <Icon size={18} color={active ? colors.primary : colors.textMuted} /><Text variant="captionStrong" color={active ? 'primaryPressed' : 'textMuted'}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField label="Şu an ne çalışıyorsun?" value={focusSubject} onChangeText={(value) => { editingSubject.current = true; setFocusSubject(value); }} maxLength={60} placeholder="Örn. TYT Matematik · Problemler"
              returnKeyType="done" onSubmitEditing={async () => { if (await updatePresence(status, focusSubject)) toast.success('Çalışma durumun güncellendi.'); }} />
            <Pressable accessibilityRole="button" onPress={() => setAvatarOpen(true)} style={[styles.avatarRow, { backgroundColor: colors.surfaceMuted }]}>
              <Palette size={18} color={colors.primary} />
              <View style={{ flex: 1 }}><Text variant="bodyStrong">Karakterimi özelleştir</Text><Text variant="caption" color="textMuted">8 yönlü görünümünü seç</Text></View>
              {me ? <ClassroomAvatar model={me.avatarModel} size={48} facing="south_east" name={me.name} /> : null}
            </Pressable>
          </Card>

          <Card style={{ gap: space.md }}>
            <Text variant="heading">Sessiz tepkiler</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {(Object.entries(REACTION_META) as [ReactionKey, typeof REACTION_META[ReactionKey]][]).map(([key, meta]) => <Chip key={key} label={meta.label} icon={meta.icon} onPress={() => canReact && sendReaction(key)} />)}
            </View>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView {...scrollProps}>
          <Card style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Goal size={16} color={colors.primary} /><Text variant="captionStrong">Bu haftanın ortak hedefi</Text></View><Text variant="subheading">%{Math.round(weeklyProgress)}</Text></View>
            <Text variant="title">{Number(room.weeklyMinutes || 0).toLocaleString('tr-TR')} <Text variant="caption" color="textMuted">/ {Number(room.weeklyGoalMinutes).toLocaleString('tr-TR')} dakika</Text></Text>
            <ProgressBar value={weeklyProgress} />
            <Text variant="caption" color="textMuted">Yalnızca sınıf üyelerinin gerçek çalışma kayıtlarından hesaplanır.</Text>
          </Card>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {[[Flame, 'En uzun seri', `${Math.max(0, ...members.map((m) => Number(m.streak || 0)))} gün`], [Trophy, 'Toplam soru', members.reduce((sum, m) => sum + Number(m.questions || 0), 0).toLocaleString('tr-TR')], [UsersRound, 'Şu an sınıfta', `${onlineCount}/${members.length}`]].map(([Icon, label, value]) => {
              const I = Icon as typeof Flame;
              return <Card key={label as string} style={{ flex: 1, alignItems: 'center', gap: 2, padding: space.md }}><I size={16} color={colors.primary} /><Text variant="subheading">{value as string}</Text><Text variant="caption" color="textMuted" align="center">{label as string}</Text></Card>;
            })}
          </View>
          <Card padded={false}>
            <View style={{ padding: space.lg, paddingBottom: space.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><ShieldCheck size={16} color={colors.primary} /><Text variant="heading">{isOwner ? 'Sınıfını yönet' : 'Sınıf arkadaşların'}</Text></View>
              <Text variant="captionStrong" color="textMuted">{members.length}/{room.maxMembers}</Text>
            </View>
            {[...members].sort((a, b) => Number(b.weeklyMinutes || 0) - Number(a.weeklyMinutes || 0)).map((member, index) => {
              const mod = moderationByUser.get(member.userId);
              const muted = !!mod?.mutedUntil && Date.parse(mod.mutedUntil) > now;
              return (
                <View key={member.userId} style={[styles.memberRow, { borderTopColor: colors.border }]}>
                  <Text variant="captionStrong" color="textMuted" style={{ width: 18 }}>{index + 1}</Text>
                  <ClassroomAvatar model={member.avatarModel} size={44} facing="south_east" name={member.name} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>{member.userId === userId ? 'Sen' : member.name}{member.role === 'owner' ? ' · Kurucu' : ''}</Text>
                    <Text variant="caption" color="textMuted">{member.presence === 'offline' ? 'Çevrimdışı' : STATUS_LABEL[member.presence] || 'Sınıfta'}{muted ? ' · Susturuldu' : ''}{member.focusSubject ? ` · ${member.focusSubject}` : ''}</Text>
                  </View>
                  <Text variant="captionStrong">{Number(member.weeklyMinutes || 0).toLocaleString('tr-TR')} dk</Text>
                  {isOwner && member.userId !== userId ? <IconButton icon={ShieldCheck} label={`${member.name} üyesini yönet`} size={34} onPress={() => { setModeration({ ...member, isMuted: muted }); setModerationReason(mod?.muteReason || ''); }} /> : null}
                </View>
              );
            })}
          </Card>
          {room.inviteCode ? (
            <Card tone="muted" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1 }}><Text variant="caption" color="textMuted">Davet kodu</Text><Text variant="heading">{room.inviteCode}</Text></View>
              <IconButton icon={Copy} label="Kodu kopyala" onPress={async () => { await Clipboard.setStringAsync(room.inviteCode!); toast.success('Davet kodu kopyalandı'); }} />
              <IconButton icon={Share2} label="Paylaş" onPress={() => Share.share({ message: `Calisiyo çalışma sınıfıma katıl: ${room.name}\nDavet kodu: ${room.inviteCode}` })} />
            </Card>
          ) : null}
        </ScrollView>
      )}

      <ClassroomBoard open={boardOpen} board={board} isOwner={!!isOwner} busy={boardBusy} onClose={() => setBoardOpen(false)}
        onSaveText={async (text) => { if (await runBoard('save_classroom_board_text', { p_text: text })) toast.success('Tahta notu kaydedildi.'); }}
        onAppendStroke={(stroke) => runBoard('append_classroom_board_stroke', { p_stroke: stroke })} onUndo={() => runBoard('undo_classroom_board_stroke')}
        onClear={async () => { if (await runBoard('clear_classroom_board')) toast.success('Sınıf tahtası temizlendi.'); }} />

      {avatarOpen ? <AvatarStudio open onClose={() => setAvatarOpen(false)} initialModel={me?.avatarModel} name={me?.name || 'Sen'} busy={avatarBusy} onSave={saveAvatar} /> : null}

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Sınıf atmosferini düzenle" subtitle="Bu ayarlar tüm sınıf üyelerinin gördüğü ortak alanı değiştirir."
        footer={<Button title="Sınıfı güncelle" loading={settingsBusy} onPress={saveSettings} style={{ flex: 1 }} />}>
        <Select label="Sınıf teması" value={settings.theme} onChange={(theme) => setSettings({ ...settings, theme })} options={THEMES} />
        <TextField label="Tahta mesajı" value={settings.motto} onChangeText={(motto) => setSettings({ ...settings, motto })} maxLength={80} />
        <TextField label="Sınıf açıklaması" multiline value={settings.description} onChangeText={(description) => setSettings({ ...settings, description })} maxLength={180} style={{ minHeight: 80 }} />
        <TextField label="Haftalık ortak hedef (dk)" keyboardType="number-pad" value={settings.goal} onChangeText={(goal) => setSettings({ ...settings, goal: goal.replace(/\D/g, '') })} />
        <Text variant="label" color="textMuted">Üye yetkileri</Text>
        <SwitchRow title="Ortak odak başlatabilsin" value={settings.focus} onChange={(focus) => setSettings({ ...settings, focus })} />
        <SwitchRow title="Sohbete yazabilsin" value={settings.chat} onChange={(chat) => setSettings({ ...settings, chat })} />
        <SwitchRow title="Sessiz tepki gönderebilsin" value={settings.react} onChange={(react) => setSettings({ ...settings, react })} />
      </Sheet>

      <Sheet open={!!moderation} onClose={() => setModeration(null)} title={`${moderation?.name || 'Üye'} · sınıf yönetimi`} subtitle="Susturma yalnızca bu sınıfın sohbet, tepki ve ortak odak araçlarını sınırlar.">
        {moderation?.isMuted ? <Button title="Susturmayı kaldır" icon={Volume2} loading={moderationBusy} onPress={() => moderate('unmute')} /> : (
          <>
            <Select label="Süre" value={moderationDuration} onChange={setModerationDuration} options={[{ value: '15', label: '15 dakika' }, { value: '60', label: '1 saat' }, { value: '1440', label: '24 saat' }, { value: '10080', label: '7 gün' }]} />
            <TextField label="Neden" multiline value={moderationReason} onChangeText={setModerationReason} maxLength={240} placeholder="Üyeye uygulanacak sınırın nedenini yaz" style={{ minHeight: 70 }} />
            <Button title="Seçilen süre sustur" icon={VolumeX} disabled={!moderationReason.trim()} loading={moderationBusy} onPress={() => moderate('mute')} />
          </>
        )}
        <Button title="Sahipliği devret" icon={ArrowRightLeft} variant="secondary" disabled={moderationBusy}
          onPress={() => Alert.alert('Sınıf sahipliğini devret', `${moderation?.name} yeni sınıf sahibi olacak; sen normal üye olarak kalırsın.`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla ve devret', onPress: () => moderate('transfer_owner') }])} />
        <Button title="Üyeyi sınıftan çıkar" icon={UserMinus} variant="danger" disabled={moderationBusy}
          onPress={() => Alert.alert('Üyeyi çıkar', 'Yeniden katılmak için davet koduna ihtiyaç duyar.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Çıkar', style: 'destructive', onPress: () => moderate('remove') }])} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  statusOption: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1.5 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingLeft: space.md, borderRadius: radius.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
