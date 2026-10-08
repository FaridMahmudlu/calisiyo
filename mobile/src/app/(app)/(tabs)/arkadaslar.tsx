import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import {
  ArrowRight, Ban, Check, Clipboard as ClipboardIcon, Crown, DoorOpen, Flag, Flame, Goal, LockKeyhole, Medal, MoreHorizontal, PencilLine, Plus, Search, Share2, ShieldCheck, Sparkles, UserPlus, UsersRound, X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { ActionMenu } from '@/components/ActionMenu';
import { TabHeader } from '@/components/TabHeader';
import { useBlockActions, type ReportTarget } from '@/features/moderation/moderation';
import { ReportSheet } from '@/features/moderation/ReportSheet';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, IconButton, Screen, SectionHeader, Segmented, Select, Sheet, SkeletonCards, SwitchRow, Text, TextField, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Metric = 'streak' | 'studyDays' | 'questions' | 'xp';
const METRICS: { key: Metric; label: string; unit: string; icon: typeof Flame }[] = [
  { key: 'streak', label: 'Seri', unit: 'gün', icon: Flame },
  { key: 'studyDays', label: 'Gün', unit: 'gün', icon: Goal },
  { key: 'questions', label: 'Soru', unit: 'soru', icon: Sparkles },
  { key: 'xp', label: 'XP', unit: 'XP', icon: Medal },
];
const PRIVACY = [
  ['allowFriendRequests', 'Arkadaşlık istekleri', 'Kullanıcı adımla istek al'],
  ['shareStudyDays', 'Çalışma günlerim', '30 dakikayı geçen günleri göster'],
  ['shareQuestionCount', 'Soru sayım', 'Toplam çözülen soru sayısını göster'],
  ['shareStreak', 'Serim', 'Güncel seri süremi göster'],
  ['shareXp', 'Seviye ve XP', 'Gelişim seviyemi göster'],
] as const;
const friendly = (error: any, fallback: string) => error?.message?.replace(/^.*?:\s*/, '') || fallback;

type Person = { friendshipId: string; userId?: string; name: string; isSelf?: boolean; level?: number; rank?: number } & Partial<Record<Metric, number | null>>;
type Group = { id: string; name: string; description?: string; memberCount: number; maxMembers: number; weeklyGoalMinutes: number; onlineCount?: number; memberRole?: string; accessType?: string; ownerName?: string; ownerUsername?: string; isMember?: boolean };
type Hub = { profile: Record<string, any>; metrics: Record<string, number>; friends: Person[]; groups: Group[]; incomingRequests: { friendshipId: string; userId: string; name: string }[] };

export default function SocialScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { user, profile, currentPlan } = useAccount();
  const [metric, setMetric] = useState<Metric>('streak');
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState<{ name: string; username: string; friendshipStatus?: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [personMenu, setPersonMenu] = useState<Person | null>(null);
  const { block } = useBlockActions(toast.error);
  const [sheet, setSheet] = useState<'create' | 'join' | 'protected' | 'username' | 'privacy' | null>(null);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [protectedGroup, setProtectedGroup] = useState<Group | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [group, setGroup] = useState({ name: '', description: 'Her gün düzenli çalışıp birbirimizi motive ettiğimiz YKS sınıfı.', goal: '1200', capacity: '8', track: 'tyt_ayt', style: 'balanced', access: 'open', password: '' });

  const hubQuery = useQuery({
    queryKey: ['social-hub', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [hub, identity] = await Promise.all([supabase.rpc('get_social_hub'), supabase.rpc('get_my_social_identity')]);
      if (hub.error || identity.error) throw new Error('Arkadaşlık merkezi şu anda yüklenemiyor. Lütfen tekrar dene.');
      return { hub: hub.data as Hub, identity: identity.data as { username?: string } };
    },
  });
  const directory = useQuery({
    queryKey: ['public-groups', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_public_study_groups');
      if (error) throw new Error('Herkese açık sınıflar yenilenemiyor.');
      return (data || []) as Group[];
    },
  });

  const refetchHub = hubQuery.refetch;
  useEffect(() => {
    if (!user?.id) return undefined;
    const refresh = () => refetchHub();
    const channel = supabase.channel(`social-hub-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_presence' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchHub, user?.id]);

  const hub = hubQuery.data?.hub;
  const identity = hubQuery.data?.identity;
  const ranked = useMemo(() => [{ friendshipId: 'self', userId: user?.id, name: profile?.full_name || 'Sen', isSelf: true, ...hub?.metrics } as Person, ...(hub?.friends || [])]
    .sort((a, b) => {
      const av = a[metric]; const bv = b[metric];
      if (av == null && bv == null) return a.name.localeCompare(b.name, 'tr');
      if (av == null) return 1; if (bv == null) return -1;
      return Number(bv) - Number(av) || a.name.localeCompare(b.name, 'tr');
    }).map((person, index) => ({ ...person, rank: index + 1 })), [hub?.friends, hub?.metrics, metric, profile?.full_name, user?.id]);
  const selfRank = ranked.find((person) => person.isSelf)?.rank || 1;
  const activeMetric = METRICS.find((item) => item.key === metric)!;
  const memberLimit = Math.max(2, Number(currentPlan?.entitlements?.classroom_member_limit || 8));
  const capacityOptions = [4, 8, 12, 20, 30, 50].filter((value) => value <= memberLimit).map((value) => ({ value: String(value), label: `${value} kişi`, description: value <= 4 ? 'Yakın çalışma ekibi' : value <= 8 ? 'Dengeli sınıf' : 'Geniş çalışma topluluğu' }));

  const run = async (key: string, task: () => PromiseLike<{ error: any; data?: any }>, fallback: string) => {
    setBusy(key);
    const result = await task();
    setBusy('');
    if (result.error) { toast.error(friendly(result.error, fallback)); return null; }
    return result;
  };

  const searchStudent = async () => {
    const username = search.trim().toLowerCase().replace(/^@/, '');
    if (!username) return;
    const result = await run('search', () => supabase.rpc('find_student_by_username', { p_username: username }), 'Öğrenci aranamadı.');
    if (result) setSearchResult(result.data);
  };
  const sendRequest = async () => {
    if (!searchResult?.username) return;
    if (await run('friend-request', () => supabase.rpc('send_friend_request_by_username', { p_username: searchResult.username }), 'Arkadaşlık isteği gönderilemedi.')) {
      toast.success('Arkadaşlık isteği gönderildi'); setSearchResult(null); setSearch(''); hubQuery.refetch();
    }
  };
  const respond = async (id: string, response: 'accepted' | 'declined') => {
    if (await run(`${response}-${id}`, () => supabase.rpc('respond_friend_request', { p_friendship_id: id, p_response: response }), 'İstek yanıtlanamadı.')) hubQuery.refetch();
  };
  const blockPerson = async (person: { userId: string; name: string }) => {
    if (await block(person)) { toast.success(`${person.name} engellendi.`); hubQuery.refetch(); }
  };
  const removeFriend = async (id: string) => {
    if (await run(`remove-${id}`, () => supabase.rpc('remove_friend', { p_friendship_id: id }), 'Arkadaş kaldırılamadı.')) hubQuery.refetch();
  };
  const saveUsername = async () => {
    if (await run('username', () => supabase.rpc('set_my_username', { p_username: usernameDraft }), 'Kullanıcı adı kaydedilemedi.')) { setSheet(null); hubQuery.refetch(); }
  };
  const updatePreference = async (key: string, value: boolean) => {
    if (!hub) return;
    const next = { ...hub.profile, [key]: value };
    const { error } = await supabase.rpc('update_social_preferences', {
      p_allow_requests: next.allowFriendRequests, p_share_study_days: next.shareStudyDays, p_share_questions: next.shareQuestionCount, p_share_streak: next.shareStreak, p_share_xp: next.shareXp,
    });
    if (error) toast.error('Gizlilik tercihin kaydedilemedi.');
    hubQuery.refetch();
  };
  const openGroup = (id: string) => router.push(`/sinif/${id}`);
  const createGroup = async () => {
    const result = await run('create', () => supabase.rpc('create_study_group_v4', {
      p_name: group.name, p_description: group.description, p_weekly_goal_minutes: Number(group.goal), p_max_members: Number(group.capacity),
      p_exam_track: group.track, p_study_style: group.style, p_access_type: group.access, p_password: group.access === 'password' ? group.password : null,
    }), 'Sınıf oluşturulamadı.');
    if (!result) return;
    setSheet(null);
    setGroup((current) => ({ ...current, name: '', password: '' }));
    if (result.data?.id) openGroup(result.data.id); else hubQuery.refetch();
  };
  const joinWithCode = async () => {
    const result = await run('join', () => supabase.rpc('join_study_group', { p_invite_code: inviteCode }), 'Sınıfa katılınamadı.');
    if (!result) return;
    setSheet(null); setInviteCode('');
    if (result.data?.id) openGroup(result.data.id); else hubQuery.refetch();
  };
  const joinPublic = async (item: Group, password: string | null = null) => {
    if (item.isMember) return openGroup(item.id);
    if (item.accessType === 'password' && password == null) { setProtectedGroup(item); setJoinPassword(''); setSheet('protected'); return; }
    const result = await run(`public-${item.id}`, () => supabase.rpc('join_public_study_group', { p_group_id: item.id, p_password: password }), 'Sınıfa katılınamadı.');
    if (!result) return;
    setSheet(null); setProtectedGroup(null);
    if (result.data?.id) openGroup(result.data.id); else hubQuery.refetch();
  };

  return (
    <Screen edges="top" onRefresh={() => Promise.all([hubQuery.refetch(), directory.refetch()])}>
      <TabHeader title="Birlikte çalış" subtitle="Arkadaşlarınla ritmini karşılaştır, çalışma sınıflarında birlikte odaklan." />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title="Sınıfa katıl" icon={DoorOpen} variant="secondary" onPress={() => setSheet('join')} style={{ flex: 1 }} />
        <Button title="Sınıf oluştur" icon={Plus} onPress={() => setSheet('create')} style={{ flex: 1 }} />
      </View>

      {hubQuery.isLoading ? <View style={{ marginTop: space.lg }}><SkeletonCards count={4} /></View> : hubQuery.isError || !hub ? (
        <View style={{ marginTop: space.lg }}><ErrorState message={(hubQuery.error as Error)?.message || 'Yüklenemedi.'} onRetry={hubQuery.refetch} /></View>
      ) : (
        <>
          <SectionHeader title="Çalışma sınıfların" subtitle={`${currentPlan.name} · ${memberLimit} kişiye kadar`} />
          {(hub.groups || []).length === 0 ? (
            <Card><EmptyState icon={UsersRound} title="İlk çalışma sınıfını kur" description="Arkadaşlarını davet et, sınıftaki masalarda kimin çalıştığını canlı gör." action="Sınıf oluştur" onAction={() => setSheet('create')} /></Card>
          ) : (
            <View style={{ gap: space.sm }}>
              {hub.groups.map((item) => (
                <Card key={item.id} onPress={() => openGroup(item.id)} style={styles.groupCard}>
                  <View style={[styles.groupIcon, { backgroundColor: colors.primarySoft }]}><UsersRound size={22} color={colors.primary} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {item.memberRole === 'owner' ? <Crown size={13} color={colors.gold} /> : null}
                      <Text variant="caption" color="textMuted">{item.memberRole === 'owner' ? 'Kurucusun' : 'Üyesin'}</Text>
                      {item.onlineCount ? <Badge label={`${item.onlineCount} çevrimiçi`} /> : null}
                    </View>
                    <Text variant="subheading" numberOfLines={1}>{item.name}</Text>
                    <Text variant="caption" color="textMuted">{item.memberCount} üye · Haftalık {Number(item.weeklyGoalMinutes).toLocaleString('tr-TR')} dk hedef</Text>
                  </View>
                  <ArrowRight size={18} color={colors.textSubtle} />
                </Card>
              ))}
            </View>
          )}

          {(hub.incomingRequests || []).length > 0 ? (
            <>
              <SectionHeader title="Bekleyen istekler" subtitle="Birlikte çalışmak isteyenler" />
              <Card padded={false}>
                {hub.incomingRequests.map((request, index) => (
                  <View key={request.friendshipId} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Avatar name={request.name} size={38} />
                    <View style={{ flex: 1 }}><Text variant="bodyStrong">{request.name}</Text><Text variant="caption" color="textMuted">Çalışma arkadaşlığı isteği</Text></View>
                    <IconButton icon={Ban} label={`${request.name} kullanıcısını engelle`} onPress={() => blockPerson({ userId: request.userId, name: request.name })} />
                    <IconButton icon={X} label="Reddet" tone="danger" onPress={() => respond(request.friendshipId, 'declined')} />
                    <IconButton icon={Check} label="Kabul et" tone="primary" onPress={() => respond(request.friendshipId, 'accepted')} />
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <SectionHeader title="Arkadaş bul" />
          <Card style={{ gap: space.md }}>
            <View style={styles.identity}>
              <Avatar name={profile?.full_name} size={40} />
              <View style={{ flex: 1 }}><Text variant="caption" color="textMuted">Kullanıcı adın</Text><Text variant="subheading">@{identity?.username || 'hazırlanıyor'}</Text></View>
              <IconButton icon={PencilLine} label="Kullanıcı adını düzenle" onPress={() => { setUsernameDraft(identity?.username || ''); setSheet('username'); }} />
              <IconButton icon={Share2} label="Kullanıcı adını paylaş" onPress={() => Share.share({ message: `Calisiyo’da birlikte çalışalım! Kullanıcı adım: @${identity?.username || ''}` })} />
              <IconButton icon={ClipboardIcon} label="Arkadaş kodunu kopyala" onPress={async () => { await Clipboard.setStringAsync(hub.profile?.friendCode || identity?.username || ''); toast.success('Kopyalandı'); }} />
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}><TextField icon={Search} value={search} onChangeText={(value) => setSearch(value.toLowerCase())} placeholder="Kullanıcı adıyla ara" autoCapitalize="none" maxLength={25} returnKeyType="search" onSubmitEditing={searchStudent} /></View>
              <Button title="Bul" onPress={searchStudent} loading={busy === 'search'} style={{ height: 50 }} />
            </View>
            {searchResult ? (
              <View style={[styles.row, { paddingHorizontal: 0 }]}>
                <Avatar name={searchResult.name} size={38} />
                <View style={{ flex: 1 }}><Text variant="bodyStrong">{searchResult.name}</Text><Text variant="caption" color="textMuted">@{searchResult.username} · {searchResult.friendshipStatus || 'Yeni bağlantı'}</Text></View>
                <Button title="İstek gönder" icon={UserPlus} size="sm" disabled={!!searchResult.friendshipStatus} loading={busy === 'friend-request'} onPress={sendRequest} />
              </View>
            ) : null}
          </Card>

          <SectionHeader title="Arkadaş sıralaması" subtitle="Ritmini birlikte takip et" action="Gizlilik" onAction={() => setSheet('privacy')} />
          <Card style={{ gap: space.md }}>
            <Segmented options={METRICS.map((item) => ({ value: item.key, label: item.label }))} value={metric} onChange={setMetric} />
            <View style={{ flexDirection: 'row' }}>
              {[[`#${selfRank}`, 'senin sıran'], [String(ranked.length), 'katılımcı'], [Number(hub.metrics?.[metric] || 0).toLocaleString('tr-TR'), activeMetric.label.toLocaleLowerCase('tr-TR')]].map(([value, label]) => (
                <View key={label} style={{ flex: 1, alignItems: 'center' }}><Text variant="heading">{value}</Text><Text variant="caption" color="textMuted">{label}</Text></View>
              ))}
            </View>
            {ranked.map((person) => (
              <View key={person.friendshipId} style={[styles.rank, person.isSelf && { backgroundColor: colors.primarySoft }]}>
                <View style={styles.rankNumber}>{person.rank! <= 3 ? <Medal size={18} color={['#E3B046', '#9AA5B7', '#C27C3E'][person.rank! - 1]} /> : <Text variant="captionStrong" color="textMuted">{person.rank}</Text>}</View>
                <Avatar name={person.name} size={34} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>{person.name}{person.isSelf ? ' · Sen' : ''}</Text>
                  <Text variant="caption" color="textMuted">{person.level ? `Seviye ${person.level}` : person.isSelf ? 'Kişisel göstergen' : 'Paylaşım tercihi sınırlı'}</Text>
                </View>
                {person[metric] == null ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><LockKeyhole size={13} color={colors.textSubtle} /><Text variant="caption" color="textSubtle">Gizli</Text></View>
                  : <Text variant="captionStrong">{Number(person[metric]).toLocaleString('tr-TR')} {activeMetric.unit}</Text>}
                {!person.isSelf ? <IconButton icon={MoreHorizontal} label={`${person.name} için seçenekler`} size={32} onPress={() => setPersonMenu(person)} /> : null}
              </View>
            ))}
            {(hub.friends || []).length === 0 ? <Text variant="caption" color="textMuted" align="center">Karşılaştırma için ilk çalışma arkadaşını ekle.</Text> : null}
          </Card>

          <SectionHeader title="Herkese açık sınıflar" subtitle="Çalışma ritmine uygun bir sınıf bul" />
          {(directory.data || []).length === 0 ? (
            <Card><EmptyState compact icon={DoorOpen} title="Henüz yayınlanan sınıf yok" description="İlk herkese açık çalışma sınıfını sen oluşturabilirsin." /></Card>
          ) : (
            <View style={{ gap: space.sm }}>
              {(directory.data || []).map((item) => {
                const full = item.memberCount >= item.maxMembers;
                return (
                  <Card key={item.id} style={{ gap: space.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Badge label={item.accessType === 'password' ? '🔒 Şifreli' : 'Herkese açık'} tone={item.accessType === 'password' ? 'warning' : 'primary'} />
                      <Text variant="caption" color="textMuted">{item.memberCount}/{item.maxMembers} kişi</Text>
                    </View>
                    <Text variant="subheading">{item.name}</Text>
                    {item.description ? <Text variant="caption" color="textMuted" numberOfLines={3}>{item.description}</Text> : null}
                    <Text variant="caption" color="textSubtle">Kurucu: {item.ownerName} · @{item.ownerUsername} · {Number(item.weeklyGoalMinutes).toLocaleString('tr-TR')} dk / hafta</Text>
                    <Button size="sm" iconRight={ArrowRight} variant={item.isMember ? 'soft' : 'primary'} disabled={!item.isMember && full} loading={busy === `public-${item.id}`}
                      title={item.isMember ? 'Sınıfa git' : full ? 'Sınıf dolu' : item.accessType === 'password' ? 'Şifreyle katıl' : 'Hemen katıl'} onPress={() => joinPublic(item)} />
                  </Card>
                );
              })}
            </View>
          )}
        </>
      )}

      <Sheet open={sheet === 'create'} onClose={() => setSheet(null)} title="Çalışma sınıfını kur" subtitle="Tüm ayarları sonra değiştirebilirsin."
        footer={<Button title="Sınıfı oluştur ve aç" loading={busy === 'create'} onPress={createGroup} style={{ flex: 1 }} />}>
        <TextField label="Sınıf adı" value={group.name} onChangeText={(name) => setGroup({ ...group, name })} maxLength={40} placeholder="Örn. Sayısal 2027 Sabah Grubu" />
        <TextField label="Sınıf açıklaması" multiline value={group.description} onChangeText={(description) => setGroup({ ...group, description })} maxLength={180} hint={`${group.description.length}/180`} style={{ minHeight: 80 }} />
        <Select label="Sınav odağı" value={group.track} onChange={(track) => setGroup({ ...group, track })} options={[{ value: 'tyt_ayt', label: 'TYT + AYT', description: 'Birlikte tam YKS hazırlığı' }, { value: 'tyt', label: 'TYT' }, { value: 'ayt', label: 'AYT' }, { value: 'ydt', label: 'YDT' }]} />
        <Select label="Çalışma atmosferi" value={group.style} onChange={(style) => setGroup({ ...group, style })} options={[{ value: 'balanced', label: 'Dengeli', description: 'Sohbet ve odak birlikte' }, { value: 'quiet', label: 'Sessiz odak', description: 'Kurucu kontrollü iletişim' }, { value: 'social', label: 'Sosyal', description: 'Motivasyon ve paylaşım yoğun' }]} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><Select label="Kapasite" value={group.capacity} onChange={(capacity) => setGroup({ ...group, capacity })} options={capacityOptions} /></View>
          <View style={{ flex: 1 }}><TextField label="Haftalık hedef (dk)" keyboardType="number-pad" value={group.goal} onChangeText={(goal) => setGroup({ ...group, goal: goal.replace(/\D/g, '') })} hint={`${Math.round(Number(group.goal || 0) / Math.max(1, Number(group.capacity)) / 7)} dk/kişi/gün`} /></View>
        </View>
        <Select label="Katılım biçimi" value={group.access} onChange={(access) => setGroup({ ...group, access })} options={[{ value: 'open', label: 'Herkese açık', description: 'İsteyen doğrudan katılır' }, { value: 'password', label: 'Şifreli', description: 'Doğru sınıf şifresi gerekir' }]} />
        {group.access === 'password' ? <TextField label="Sınıf şifresi" secure value={group.password} onChangeText={(password) => setGroup({ ...group, password })} maxLength={32} hint="4–32 karakter" /> : null}
      </Sheet>

      <Sheet open={sheet === 'join'} onClose={() => setSheet(null)} title="Çalışma sınıfına katıl" subtitle="Sınıf kurucusunun paylaştığı ROOM- kodunu gir."
        footer={<Button title="Sınıfa katıl" loading={busy === 'join'} disabled={!inviteCode.trim()} onPress={joinWithCode} style={{ flex: 1 }} />}>
        <TextField label="Davet kodu" value={inviteCode} onChangeText={(value) => setInviteCode(value.toUpperCase())} maxLength={13} placeholder="ROOM-XXXXXXXX" autoCapitalize="characters" />
      </Sheet>

      <Sheet open={sheet === 'protected'} onClose={() => { setSheet(null); setProtectedGroup(null); }} title={protectedGroup ? `${protectedGroup.name}` : 'Şifreli sınıf'} subtitle="Kurucunun paylaştığı sınıf şifresini yaz."
        footer={<Button title="Şifreyi doğrula ve katıl" loading={busy === `public-${protectedGroup?.id}`} onPress={() => protectedGroup && joinPublic(protectedGroup, joinPassword)} style={{ flex: 1 }} />}>
        <TextField label="Sınıf şifresi" secure value={joinPassword} onChangeText={setJoinPassword} maxLength={32} />
      </Sheet>

      <Sheet open={sheet === 'username'} onClose={() => setSheet(null)} title="Kullanıcı adı"
        footer={<Button title="Kaydet" loading={busy === 'username'} onPress={saveUsername} style={{ flex: 1 }} />}>
        <TextField label="Yeni kullanıcı adı" value={usernameDraft} onChangeText={(value) => setUsernameDraft(value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} maxLength={24} autoCapitalize="none" hint="3–24 karakter; harf, rakam ve alt çizgi" />
      </Sheet>

      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
      <ActionMenu open={!!personMenu} title={personMenu?.name} onClose={() => setPersonMenu(null)} actions={personMenu ? [
        { label: 'Arkadaşlıktan çıkar', icon: X, onPress: () => removeFriend(personMenu.friendshipId) },
        { label: 'Kullanıcıyı şikayet et', icon: Flag, destructive: true, onPress: () => personMenu.userId && setReportTarget({ type: 'user', id: personMenu.userId, label: personMenu.name }) },
        { label: 'Kullanıcıyı engelle', icon: Ban, destructive: true, onPress: () => personMenu.userId && blockPerson({ userId: personMenu.userId, name: personMenu.name }) },
      ] : []} />

      <Sheet open={sheet === 'privacy'} onClose={() => setSheet(null)} title="Neyi paylaşacağını sen seç" subtitle="Deneme netleri hiçbir zaman sosyal profiline eklenmez.">
        {hub ? PRIVACY.map(([key, title, description]) => (
          <SwitchRow key={key} title={title} description={description} icon={ShieldCheck} value={Boolean(hub.profile?.[key])} onChange={(value) => updatePreference(key, value)} />
        )) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  groupIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  rank: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.sm },
  rankNumber: { width: 24, alignItems: 'center' },
});
