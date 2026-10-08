import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, ArrowUpRight, Ban, CheckCircle2, CircleDollarSign, Clock3, CreditCard, FileText, GraduationCap, MessageSquarePlus, Search, Send, ShieldCheck, Sparkles, Target, UserCheck, UsersRound, Volume2, VolumeX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useNow } from '@/hooks/useNow';
import { Pressable, StyleSheet, View } from 'react-native';
import { AreaChart, HorizontalBars } from '@/components/charts';
import { Avatar, Badge, Button, Card, ErrorState, ListItem, Screen, SectionHeader, Segmented, Select, Sheet, SkeletonCards, StatTile, Text, TextField, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const EVENT_LABELS: Record<string, [string, typeof Activity]> = {
  user_registered: ['Yeni kullanıcı', UserCheck], study_recorded: ['Çalışma kaydı', Clock3], exam_created: ['Deneme eklendi', Target], task_completed: ['Görev tamamlandı', CheckCircle2],
  friend_request: ['Arkadaşlık isteği', UsersRound], friend_connected: ['Arkadaşlık kuruldu', UsersRound], study_group_created: ['Sınıf oluşturuldu', GraduationCap], admin_user_status: ['Hesap durumu', ShieldCheck],
};
const ROLE_OPTIONS = [{ value: 'student', label: 'Öğrenci', description: 'Yönetim erişimi yok' }, { value: 'moderator', label: 'Moderatör', description: 'Analizleri ve kullanıcıları görüntüler' }, { value: 'admin', label: 'Admin', description: 'Kullanıcı işlemleri ve duyuru yetkisi' }];
const PLAN_OPTIONS = [{ value: 'baslangic', label: 'calisiyo ücretsiz', description: 'Temel limitler' }, { value: 'plus_2027', label: 'calisiyo plus · YKS 2027', description: '19 Ağustos 2027’ye kadar' }, { value: 'plus_2028', label: 'calisiyo plus · YKS 2028', description: '25 Haziran 2028’e kadar' }];
const AUDIENCE_OPTIONS = [{ value: 'all', label: 'Tüm aktif hesaplar', description: 'Yöneticiler dahil' }, { value: 'active_students', label: 'Yalnızca öğrenciler', description: 'Yönetim rolü olmayanlar' }];
const DURATIONS = [{ value: '15', label: '15 dakika' }, { value: '60', label: '1 saat' }, { value: '1440', label: '24 saat' }, { value: '10080', label: '7 gün' }, { value: '43200', label: '30 gün' }];
const MODULES: Record<string, string> = { studySessions: 'Çalışma oturumları', tasksCompleted: 'Tamamlanan görevler', examsAdded: 'Denemeler', reviewsCompleted: 'Tekrarlar', topicsCompleted: 'Konular', notesCreated: 'Notlar', friendConnections: 'Arkadaşlıklar', studyGroups: 'Çalışma sınıfları' };
const AUDIT: Record<string, string> = { user_status_changed: 'Hesap durumu değiştirildi', user_role_changed: 'Yönetim rolü değiştirildi', user_plan_changed: 'Üyelik planı değiştirildi', user_note_added: 'Yönetici notu eklendi', announcement_sent: 'Duyuru gönderildi' };
const number = (value: unknown) => Number(value || 0).toLocaleString('tr-TR');
const percent = (value: unknown) => `%${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
const minutes = (value: unknown) => { const total = Number(value || 0); return total < 60 ? `${total} dk` : `${Math.floor(total / 60).toLocaleString('tr-TR')} sa ${total % 60} dk`; };
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const shortDate = (value: string) => new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`));
const eventDetail = (event: any) => event.type === 'study_recorded' ? `${event.payload?.minutes || 0} dk · ${event.payload?.questions || 0} soru` : event.type === 'exam_created' ? event.payload?.examType || 'Deneme' : event.type === 'admin_user_status' ? (event.payload?.status === 'suspended' ? 'Hesap askıya alındı' : 'Hesap etkinleştirildi') : 'Yeni hareket';

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [range, setRange] = useState(30);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('1440');
  const [selectedRole, setSelectedRole] = useState('student');
  const [planDraft, setPlanDraft] = useState<string | null>(null);
  const now = useNow(30_000);
  const [note, setNote] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', body: '', actionUrl: '/dashboard', audience: 'all' });

  const role = useQuery({ queryKey: ['admin-role'], queryFn: async () => (await supabase.rpc('current_admin_role')).data as string | null });
  const overview = useQuery({ queryKey: ['admin-overview', range], queryFn: async () => { const { data, error } = await supabase.rpc('admin_get_overview', { p_days: range }); if (error) throw error; return data as any; } });
  const users = useQuery({
    queryKey: ['admin-users', page, query],
    queryFn: async () => {
      await supabase.rpc('admin_cleanup_expired_moderation');
      const { data, error } = await supabase.rpc('admin_list_users', { p_search: query || null, p_page: page, p_page_size: 15 });
      if (error) throw error;
      return data as { items: any[]; total: number; pageSize: number };
    },
  });
  const activity = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const [live, audit] = await Promise.all([supabase.rpc('admin_get_live_events', { p_limit: 35 }), supabase.rpc('admin_get_audit_log', { p_limit: 40 })]);
      if (live.error) throw live.error;
      return { events: (live.data || []) as any[], audit: (audit.data || []) as any[] };
    },
  });
  const detail = useQuery({
    queryKey: ['admin-user-detail', selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const [d, m, p] = await Promise.all([
        supabase.rpc('admin_get_user_detail', { p_user_id: selected.id }), supabase.rpc('admin_get_user_moderation', { p_user_id: selected.id }), supabase.rpc('admin_get_user_plan', { p_user_id: selected.id }),
      ]);
      if (d.error) throw d.error;
      return { detail: d.data as any, moderation: m.error ? null : (m.data as any), plan: p.error ? null : (p.data as any) };
    },
  });

  const refetchOverview = overview.refetch;
  const refetchActivity = activity.refetch;
  const refetchUsers = users.refetch;
  useEffect(() => {
    const channel = supabase.channel(`admin-live-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_live_events' }, () => { refetchOverview(); refetchActivity(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' }, () => refetchUsers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchActivity, refetchOverview, refetchUsers]);

  const run = async (key: string, fn: () => PromiseLike<{ error: any; data?: any }>, success: string) => {
    setBusy(key);
    const result = await fn();
    setBusy('');
    if (result.error) { toast.error(result.error.message || 'İşlem tamamlanamadı.'); return null; }
    toast.success(success);
    return result;
  };
  const moderate = async (action: 'suspend' | 'activate' | 'mute' | 'unmute') => {
    const messages = { suspend: 'Hesap seçilen süre boyunca askıya alındı.', activate: 'Hesap yeniden etkinleştirildi.', mute: 'Sosyal iletişim sınırlandı.', unmute: 'İletişim kısıtı kaldırıldı.' };
    if (await run(action, () => supabase.rpc('admin_moderate_user', { p_user_id: selected.id, p_action: action, p_duration_minutes: ['suspend', 'mute'].includes(action) ? Number(duration) : null, p_reason: ['suspend', 'mute'].includes(action) ? reason : null }), messages[action])) {
      setReason(''); detail.refetch(); users.refetch(); activity.refetch();
    }
  };

  const totals = overview.data?.totals || {};
  const isAdmin = ['admin', 'super_admin'].includes(role.data || '');
  const maxPages = Math.max(1, Math.ceil(Number(users.data?.total || 0) / Number(users.data?.pageSize || 15)));
  const moderation = detail.data?.moderation;
  const selectedPlan = planDraft ?? detail.data?.plan?.code ?? 'baslangic';
  const suspended = moderation?.status === 'suspended' && (!moderation.suspendedUntil || Date.parse(moderation.suspendedUntil) > now);
  const muted = moderation?.mutedUntil && Date.parse(moderation.mutedUntil) > now;

  return (
    <Screen onRefresh={() => Promise.all([overview.refetch(), users.refetch(), activity.refetch()])}>
      <Card tone="muted" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <ShieldCheck size={20} color={colors.violet} />
        <View style={{ flex: 1 }}><Text variant="subheading">Güvenli yönetici oturumu</Text><Text variant="caption" color="textMuted">{(role.data || '').replace('_', ' ')} · Tüm işlemler denetim günlüğüne yazılır.</Text></View>
      </Card>
      <View style={{ marginTop: space.md, gap: space.sm }}>
        <ListItem icon={CreditCard} title="Ödeme inceleme" subtitle="Shopier siparişleri ve provider olayları" onPress={() => router.push('/admin/odemeler')} />
        <ListItem icon={CircleDollarSign} iconColor={colors.gold} title="İçerik üreticileri" subtitle="Başvurular, kodlar, ledger ve payout" onPress={() => router.push('/admin/icerik-ureticileri')} />
      </View>

      <SectionHeader title="Genel bakış" subtitle="Gerçek kullanıcı hareketlerinden anlık" />
      <Segmented options={[7, 30, 90].map((day) => ({ value: day, label: `${day} gün` }))} value={range} onChange={setRange} />
      {overview.isLoading ? <View style={{ marginTop: space.md }}><SkeletonCards count={3} /></View> : overview.isError ? <View style={{ marginTop: space.md }}><ErrorState message={(overview.error as Error).message} onRetry={overview.refetch} /></View> : (
        <>
          <View style={styles.grid}>
            <StatTile icon={UsersRound} label="Toplam kullanıcı" value={number(totals.users)} hint={`${number(totals.newUsers)} yeni kayıt`} />
            <StatTile icon={Activity} color="#3B82F6" label="Aktif öğrenci" value={number(totals.activeUsers)} hint={`${number(totals.activeToday)} bugün`} />
            <StatTile icon={Clock3} color="#8B5CF6" label="Çalışma süresi" value={minutes(totals.studyMinutes)} />
            <StatTile icon={Sparkles} color="#F97316" label="Çözülen soru" value={number(totals.questions)} hint={`${number(totals.exams)} deneme`} />
            <StatTile icon={CheckCircle2} color="#14B8A6" label="Görev tamamlama" value={percent(totals.taskCompletionRate)} />
            <StatTile icon={ArrowUpRight} color="#0D1830" label="Geri dönüş" value={percent(totals.returningStudentRate)} hint="En az 2 aktif gün" />
          </View>
          <Card style={{ marginTop: space.md, gap: space.sm }}>
            <Text variant="heading">Günlük çalışma hareketi</Text>
            <AreaChart data={(overview.data?.dailySeries || []).map((item: any) => ({ label: shortDate(item.date), value: Number(item.minutes || 0) }))} suffix=" dk" />
          </Card>
          <Card style={{ marginTop: space.md, gap: space.sm }}>
            <Text variant="heading">Modül dağılımı</Text>
            <HorizontalBars items={Object.entries(overview.data?.moduleUsage || {}).map(([key, value]) => ({ label: MODULES[key] || key, value: Number(value), hint: number(value) }))} />
          </Card>
        </>
      )}

      <SectionHeader title="Kullanıcılar" subtitle={`${number(users.data?.total)} hesap`} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}><TextField icon={Search} value={search} onChangeText={setSearch} placeholder="Ad veya e-posta ara" autoCapitalize="none" returnKeyType="search" onSubmitEditing={() => { setPage(1); setQuery(search.trim()); }} /></View>
        <Button title="Ara" onPress={() => { setPage(1); setQuery(search.trim()); }} style={{ height: 50 }} />
      </View>
      <Card padded={false} style={{ marginTop: space.md }}>
        {users.isLoading ? <View style={{ padding: space.lg }}><SkeletonCards count={3} /></View> : (users.data?.items || []).length === 0 ? <Text variant="caption" color="textMuted" style={{ padding: space.lg }}>Eşleşen kullanıcı yok.</Text> : (users.data?.items || []).map((item, index) => (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => { setSelected(item); setSelectedRole(item.role || 'student'); setReason(''); setPlanDraft(null); }} style={[styles.userRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Avatar name={item.name} size={38} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>{item.name}</Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>{item.email}</Text>
              <Text variant="caption" color="textSubtle">{minutes(item.studyMinutes)} · {number(item.questions)} soru · Sv. {item.level} · {item.streak} gün seri</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge label={item.status === 'active' ? 'Aktif' : 'Askıda'} tone={item.status === 'active' ? 'primary' : 'danger'} />
              {item.role ? <Text variant="caption" color="textMuted">{String(item.role).replace('_', ' ')}</Text> : null}
            </View>
          </Pressable>
        ))}
      </Card>
      <View style={styles.pager}>
        <Button title="Önceki" size="sm" variant="secondary" disabled={page <= 1} onPress={() => setPage((value) => value - 1)} />
        <Text variant="captionStrong">{page}/{maxPages}</Text>
        <Button title="Sonraki" size="sm" variant="secondary" disabled={page >= maxPages} onPress={() => setPage((value) => value + 1)} />
      </View>

      <SectionHeader title="Duyuru merkezi" subtitle="Mesaj uygulama içi bildirim merkezine ve cihazlara gider." />
      <Card style={{ gap: space.md }}>
        <TextField label="Başlık" value={announcement.title} onChangeText={(title) => setAnnouncement({ ...announcement, title })} maxLength={90} />
        <TextField label="Mesaj" multiline value={announcement.body} onChangeText={(body) => setAnnouncement({ ...announcement, body })} maxLength={240} style={{ minHeight: 80 }} />
        <TextField label="Uygulama içi bağlantı" value={announcement.actionUrl} onChangeText={(actionUrl) => setAnnouncement({ ...announcement, actionUrl })} autoCapitalize="none" />
        <Select label="Hedef kitle" value={announcement.audience} onChange={(audience) => setAnnouncement({ ...announcement, audience })} options={AUDIENCE_OPTIONS} />
        <Button title="Duyuruyu gönder" icon={Send} loading={busy === 'announcement'} disabled={announcement.title.trim().length < 2 || announcement.body.trim().length < 2 || !announcement.actionUrl.startsWith('/')}
          onPress={async () => {
            const result = await run('announcement', () => supabase.rpc('admin_broadcast', { p_title: announcement.title, p_body: announcement.body, p_action_url: announcement.actionUrl || '/dashboard', p_audience: announcement.audience }), 'Duyuru gönderildi.');
            if (result) { toast.success(`Duyuru ${number(result.data?.recipients)} kullanıcıya gönderildi.`); setAnnouncement({ title: '', body: '', actionUrl: '/dashboard', audience: 'all' }); activity.refetch(); }
          }} />
      </Card>

      <SectionHeader title="Canlı ürün akışı" />
      <Card padded={false}>
        {(activity.data?.events || []).length === 0 ? <Text variant="caption" color="textMuted" style={{ padding: space.lg }}>Henüz yeni hareket yok.</Text> : (activity.data?.events || []).map((event, index) => {
          const [label, Icon] = EVENT_LABELS[event.type] || [event.type, Activity];
          return (
            <View key={event.id} style={[styles.userRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><Icon size={16} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text variant="bodyStrong">{label}</Text><Text variant="caption" color="textMuted">{event.userName || 'Sistem'} · {eventDetail(event)}</Text></View>
              <Text variant="caption" color="textSubtle">{dateTime(event.createdAt)}</Text>
            </View>
          );
        })}
      </Card>

      <SectionHeader title="Yönetici işlem günlüğü" />
      <Card padded={false}>
        {(activity.data?.audit || []).length === 0 ? <Text variant="caption" color="textMuted" style={{ padding: space.lg }}>Henüz yönetici işlemi yok.</Text> : (activity.data?.audit || []).map((item, index) => (
          <View key={item.id} style={[styles.userRow, { alignItems: 'flex-start' }, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <FileText size={15} color={colors.textMuted} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">{AUDIT[item.action] || item.action}</Text>
              <Text variant="caption" color="textMuted">{item.actorName || 'Yönetici'}{item.targetName ? ` → ${item.targetName}` : ''} · {dateTime(item.createdAt)}</Text>
              <Text variant="caption" color="textSubtle" numberOfLines={3} style={{ fontFamily: 'monospace' }}>{JSON.stringify(item.details)}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.name || 'Kullanıcı'} subtitle={selected?.email}>
        {detail.isLoading ? <SkeletonCards count={2} /> : detail.data ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {[['Çalışma', minutes(selected.studyMinutes)], ['Soru', number(selected.questions)], ['Seri', `${selected.streak} gün`], ['Seviye', `${selected.level} · ${number(selected.xp)} XP`], ['Arkadaş', number(selected.friends)], ['Sınıf', number(selected.groups)]].map(([label, value]) => (
                <View key={label} style={[styles.metric, { backgroundColor: colors.surfaceMuted }]}><Text variant="caption" color="textMuted">{label}</Text><Text variant="captionStrong">{value}</Text></View>
              ))}
            </View>
            <Text variant="caption" color="textMuted">{selected.field?.replace('_', ' ') || 'Alan seçilmedi'} · {dateTime(selected.createdAt)} katıldı · Son giriş {dateTime(selected.lastSignInAt)}</Text>

            <Card tone="muted" style={{ gap: space.sm }}>
              <Text variant="subheading">Üyelik planı</Text>
              <Text variant="caption" color="textMuted">{detail.data.plan?.periodEnd ? `${detail.data.plan.name || 'calisiyo plus'} · ${dateTime(detail.data.plan.periodEnd)} tarihine kadar` : 'calisiyo ücretsiz · süresiz temel erişim'}</Text>
              <Select value={selectedPlan} onChange={setPlanDraft} options={PLAN_OPTIONS} />
              <Button title="Planı kaydet" size="sm" disabled={!isAdmin} loading={busy === 'plan'} onPress={async () => { if (await run('plan', () => supabase.rpc('admin_set_user_plan', { p_user_id: selected.id, p_plan_code: selectedPlan }), 'Kullanıcının planı güncellendi.')) { detail.refetch(); users.refetch(); } }} />
            </Card>

            <Card tone="muted" style={{ gap: space.sm }}>
              <Text variant="subheading">Hesap erişimi ve sosyal iletişim</Text>
              <Text variant="caption" color="textMuted">Askıya alma ve susturma seçilen sürenin sonunda otomatik biter.{moderation?.suspendedUntil ? ` Askı bitişi: ${dateTime(moderation.suspendedUntil)}.` : ''}{moderation?.mutedUntil ? ` Susturma bitişi: ${dateTime(moderation.mutedUntil)}.` : ''}</Text>
              {suspended ? <Button title="Hesabı şimdi etkinleştir" icon={UserCheck} size="sm" loading={busy === 'activate'} onPress={() => moderate('activate')} /> : null}
              {muted ? <Button title="Susturmayı kaldır" icon={Volume2} size="sm" variant="secondary" loading={busy === 'unmute'} onPress={() => moderate('unmute')} /> : null}
              {!suspended || !muted ? (
                <>
                  <Select label="Süre" value={duration} onChange={setDuration} options={DURATIONS} />
                  <TextField label="İşlem nedeni (zorunlu)" multiline value={reason} onChangeText={setReason} maxLength={240} style={{ minHeight: 60 }} />
                  <View style={{ flexDirection: 'row', gap: space.sm }}>
                    {!suspended ? <Button title="Askıya al" icon={Ban} size="sm" variant="danger" disabled={!reason.trim()} loading={busy === 'suspend'} onPress={() => moderate('suspend')} style={{ flex: 1 }} /> : null}
                    {!muted ? <Button title="Sustur" icon={VolumeX} size="sm" variant="secondary" disabled={!reason.trim()} loading={busy === 'mute'} onPress={() => moderate('mute')} style={{ flex: 1 }} /> : null}
                  </View>
                </>
              ) : null}
            </Card>

            {role.data === 'super_admin' ? (
              <Card tone="muted" style={{ gap: space.sm }}>
                <Text variant="subheading">Yönetim rolü</Text>
                <Select value={selectedRole} onChange={setSelectedRole} options={ROLE_OPTIONS} />
                <Button title="Rolü kaydet" size="sm" loading={busy === 'role'} onPress={async () => { if (await run('role', () => supabase.rpc('admin_set_user_role', { p_user_id: selected.id, p_role: selectedRole }), 'Kullanıcının rolü güncellendi.')) users.refetch(); }} />
              </Card>
            ) : null}

            {role.data !== 'moderator' ? (
              <Card tone="muted" style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><MessageSquarePlus size={16} color={colors.textMuted} /><Text variant="subheading">Yönetici notları</Text></View>
                <TextField multiline value={note} onChangeText={setNote} maxLength={1000} placeholder="İç ekip için güvenli bir not ekle…" style={{ minHeight: 60 }} />
                <Button title="Not ekle" size="sm" disabled={note.trim().length < 2} loading={busy === 'note'} onPress={async () => { if (await run('note', () => supabase.rpc('admin_add_user_note', { p_user_id: selected.id, p_note: note }), 'Yönetici notu kaydedildi.')) { setNote(''); detail.refetch(); } }} />
                {(detail.data.detail?.notes || []).map((item: any) => (
                  <View key={item.id} style={{ gap: 2 }}><Text variant="body">{item.note}</Text><Text variant="caption" color="textSubtle">{item.authorName || 'Yönetici'} · {dateTime(item.createdAt)}</Text></View>
                ))}
              </Card>
            ) : null}
          </>
        ) : <ErrorState message="Kullanıcı detayı yüklenemedi." onRetry={detail.refetch} />}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  icon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
  metric: { flexBasis: '31%', flexGrow: 1, padding: space.sm, borderRadius: radius.sm, gap: 2 },
});
