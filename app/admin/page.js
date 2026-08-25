'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Ban, BarChart3,
  BellRing, CheckCircle2, Clock3, FileText, Gauge,
  GraduationCap, MessageSquarePlus, RefreshCw, Search, Send, ShieldCheck,
  Sparkles, Target, UserCheck, UsersRound, Volume2, VolumeX,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';

const EVENT_LABELS = {
  user_registered: ['Yeni kullanıcı', UserCheck],
  study_recorded: ['Çalışma kaydı', Clock3],
  exam_created: ['Deneme eklendi', Target],
  task_completed: ['Görev tamamlandı', CheckCircle2],
  friend_request: ['Arkadaşlık isteği', UsersRound],
  friend_connected: ['Arkadaşlık kuruldu', UsersRound],
  study_group_created: ['Sınıf oluşturuldu', GraduationCap],
  admin_user_status: ['Hesap durumu', ShieldCheck],
};

const ROLE_OPTIONS = [
  { value: 'student', label: 'Öğrenci', description: 'Yönetim erişimi yok' },
  { value: 'moderator', label: 'Moderatör', description: 'Analizleri ve kullanıcıları görüntüler' },
  { value: 'admin', label: 'Admin', description: 'Kullanıcı işlemleri ve duyuru yetkisi' },
];
const PLAN_OPTIONS = [
  { value: 'baslangic', label: 'calisiyo ücretsiz', description: 'Temel limitler' },
  { value: 'plus_2027', label: 'calisiyo plus · YKS 2027', description: '19 Ağustos 2027’ye kadar' },
  { value: 'plus_2028', label: 'calisiyo plus · YKS 2028', description: '25 Haziran 2028’e kadar' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Tüm aktif hesaplar', description: 'Yöneticiler dahil tüm aktif kullanıcılar' },
  { value: 'active_students', label: 'Yalnızca öğrenciler', description: 'Yönetim rolü olmayan aktif kullanıcılar' },
];
const MODERATION_DURATIONS = [
  { value: '15', label: '15 dakika', description: 'Kısa süreli uyarı' },
  { value: '60', label: '1 saat', description: 'Geçici erişim kısıtı' },
  { value: '1440', label: '24 saat', description: 'Bir günlük kısıt' },
  { value: '10080', label: '7 gün', description: 'Uzun süreli inceleme' },
  { value: '43200', label: '30 gün', description: 'Ciddi ihlal' },
];

const number = (value) => Number(value || 0).toLocaleString('tr-TR');
const percent = (value) => `%${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
const minutes = (value) => {
  const total = Number(value || 0);
  if (total < 60) return `${total} dk`;
  return `${Math.floor(total / 60).toLocaleString('tr-TR')} sa ${total % 60} dk`;
};
const dateTime = (value) => value ? new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value)) : '—';
const shortDate = (value) => new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`));

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [range, setRange] = useState(30);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState(null);
  const [events, setEvents] = useState([]);
  const [audit, setAudit] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [moderation, setModeration] = useState(null);
  const [moderationDuration, setModerationDuration] = useState('1440');
  const [moderationClock, setModerationClock] = useState(() => Date.now());
  const [selectedRole, setSelectedRole] = useState('student');
  const [selectedPlan, setSelectedPlan] = useState('baslangic');
  const [userPlan, setUserPlan] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', body: '', actionUrl: '/dashboard', audience: 'all' });

  const showNotice = useCallback((type, message) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadOverview = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_overview', { p_days: range });
    if (error) throw error;
    setOverview(data);
  }, [range, supabase]);

  const loadUsers = useCallback(async (targetPage = 1, query = '') => {
    const { error: cleanupError } = await supabase.rpc('admin_cleanup_expired_moderation');
    if (cleanupError) throw cleanupError;
    const { data, error } = await supabase.rpc('admin_list_users', {
      p_search: query || null,
      p_page: targetPage,
      p_page_size: 15,
    });
    if (error) throw error;
    setUsers(data);
  }, [supabase]);

  const loadActivity = useCallback(async () => {
    const [{ data: live, error: liveError }, { data: auditData, error: auditError }] = await Promise.all([
      supabase.rpc('admin_get_live_events', { p_limit: 35 }),
      supabase.rpc('admin_get_audit_log', { p_limit: 40 }),
    ]);
    if (liveError) throw liveError;
    setEvents(live || []);
    if (!auditError) setAudit(auditData || []);
  }, [supabase]);

  const loadAll = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setPage(1);
    setSearch('');
    try {
      const { data: currentRole } = await supabase.rpc('current_admin_role');
      setRole(currentRole);
      await Promise.all([loadOverview(), loadUsers(1, ''), loadActivity()]);
    } catch (error) {
      showNotice('error', error?.message || 'Yönetim verileri yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadActivity, loadOverview, loadUsers, showNotice, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => loadAll(), 0);
    return () => clearTimeout(timer);
  }, [loadAll]);

  useEffect(() => {
    const channel = supabase.channel('admin-live-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_live_events' }, () => {
        loadOverview().catch(() => null);
        loadActivity().catch(() => null);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' }, () => {
        loadUsers(page, search).catch(() => null);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadActivity, loadOverview, loadUsers, page, search, supabase]);

  useEffect(() => {
    const timer = window.setInterval(() => setModerationClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const runSearch = async (event) => {
    event.preventDefault();
    setPage(1);
    try { await loadUsers(1, search); } catch { showNotice('error', 'Kullanıcı araması tamamlanamadı.'); }
  };

  const changePage = async (nextPage) => {
    setPage(nextPage);
    try { await loadUsers(nextPage, search); } catch { showNotice('error', 'Kullanıcı sayfası yüklenemedi.'); }
  };

  const openUser = async (userItem) => {
    setSelected(userItem);
    setSelectedRole(userItem.role || 'student');
    setStatusReason(userItem.statusReason || '');
    setDetail(null);
    setModeration(null);
    setUserPlan(null);
    setDetailLoading(true);
    const [{ data, error }, { data: moderationData, error: moderationError }, { data: planData, error: planError }] = await Promise.all([
      supabase.rpc('admin_get_user_detail', { p_user_id: userItem.id }),
      supabase.rpc('admin_get_user_moderation', { p_user_id: userItem.id }),
      supabase.rpc('admin_get_user_plan', { p_user_id: userItem.id }),
    ]);
    setDetailLoading(false);
    if (error) showNotice('error', error.message || 'Kullanıcı detayı yüklenemedi.');
    else { setDetail(data); setModeration(moderationError ? null : moderationData); setUserPlan(planError ? null : planData); setSelectedPlan(planData?.code || 'baslangic'); }
  };

  const moderateUser = async (action) => {
    if (!selected) return;
    setActionBusy(action);
    const { data, error } = await supabase.rpc('admin_moderate_user', {
      p_user_id: selected.id,
      p_action: action,
      p_duration_minutes: ['suspend', 'mute'].includes(action) ? Number(moderationDuration) : null,
      p_reason: ['suspend', 'mute'].includes(action) ? statusReason : null,
    });
    setActionBusy('');
    if (error) { showNotice('error', error.message); return; }
    const messages = { suspend: 'Hesap seçilen süre boyunca askıya alındı.', activate: 'Hesap yeniden etkinleştirildi.', mute: 'Sosyal iletişim seçilen süre boyunca sınırlandı.', unmute: 'İletişim kısıtı kaldırıldı.' };
    showNotice('success', messages[action]);
    setModeration((current) => ({ ...current, status: action === 'suspend' ? 'suspended' : action === 'activate' ? 'active' : current?.status, suspendedUntil: action === 'suspend' ? data?.until : action === 'activate' ? null : current?.suspendedUntil, mutedUntil: action === 'mute' ? data?.until : action === 'unmute' ? null : current?.mutedUntil, statusReason: action === 'suspend' ? statusReason : action === 'activate' ? null : current?.statusReason, muteReason: action === 'mute' ? statusReason : action === 'unmute' ? null : current?.muteReason }));
    setStatusReason('');
    await Promise.all([loadUsers(), loadOverview(), loadActivity()]);
  };

  const saveRole = async () => {
    if (!selected) return;
    setActionBusy('role');
    const { error } = await supabase.rpc('admin_set_user_role', { p_user_id: selected.id, p_role: selectedRole });
    setActionBusy('');
    if (error) { showNotice('error', error.message); return; }
    showNotice('success', 'Kullanıcının rolü güncellendi.');
    await loadUsers();
  };

  const savePlan = async () => {
    if (!selected || !['admin', 'super_admin'].includes(role)) return;
    setActionBusy('plan');
    const { data, error } = await supabase.rpc('admin_set_user_plan', { p_user_id: selected.id, p_plan_code: selectedPlan });
    setActionBusy('');
    if (error) return showNotice('error', error.message);
    setUserPlan((current) => ({ ...current, code: data?.planCode || selectedPlan, periodEnd: data?.periodEnd, status: selectedPlan === 'baslangic' ? 'free' : 'active' }));
    showNotice('success', 'Kullanıcının planı güncellendi. Değişiklik hesabına anlık yansıtıldı.');
    await Promise.all([loadUsers(page, search), loadActivity()]);
  };

  const addNote = async (event) => {
    event.preventDefault();
    if (!selected || !adminNote.trim()) return;
    setActionBusy('note');
    const { error } = await supabase.rpc('admin_add_user_note', { p_user_id: selected.id, p_note: adminNote });
    setActionBusy('');
    if (error) { showNotice('error', error.message); return; }
    setAdminNote('');
    showNotice('success', 'Yönetici notu kaydedildi.');
    await openUser(selected);
  };

  const sendAnnouncement = async (event) => {
    event.preventDefault();
    setActionBusy('announcement');
    const { data, error } = await supabase.rpc('admin_broadcast', {
      p_title: announcement.title,
      p_body: announcement.body,
      p_action_url: announcement.actionUrl || '/dashboard',
      p_audience: announcement.audience,
    });
    setActionBusy('');
    if (error) { showNotice('error', error.message); return; }
    showNotice('success', `Duyuru ${number(data?.recipients)} kullanıcıya gönderildi.`);
    setAnnouncement({ title: '', body: '', actionUrl: '/dashboard', audience: 'all' });
    await loadActivity();
  };

  const totals = overview?.totals || {};
  const moduleEntries = overview?.moduleUsage ? Object.entries(overview.moduleUsage) : [];
  const maxPages = Math.max(1, Math.ceil(Number(users?.total || 0) / Number(users?.pageSize || 15)));

  return (
    <div className="admin-dashboard">
      {notice && <div className={`admin-notice is-${notice.type}`} role="status">{notice.type === 'success' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}<span>{notice.message}</span></div>}

      <section className="admin-page-heading" id="overview">
        <div><span><Gauge size={16} /> Canlı yönetim merkezi</span><h1>calisiyo’nun nabzı</h1><p>Tüm göstergeler gerçek kullanıcı hareketlerinden anlık olarak hesaplanır.</p></div>
        <div><div className="admin-range">{[7, 30, 90].map((day) => <button key={day} className={range === day ? 'is-active' : ''} onClick={() => setRange(day)}>{day} gün</button>)}</div><button className="admin-refresh" onClick={() => loadAll({ quiet: true })} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'is-spinning' : ''} /> Yenile</button></div>
      </section>

      {loading ? <AdminSkeleton /> : (
        <>
          <section className="admin-metric-grid">
            <MetricCard icon={UsersRound} label="Toplam kullanıcı" value={number(totals.users)} detail={`${number(totals.newUsers)} yeni kayıt`} tone="green" />
            <MetricCard icon={Activity} label="Aktif öğrenci" value={number(totals.activeUsers)} detail={`${number(totals.activeToday)} bugün aktif`} tone="blue" />
            <MetricCard icon={Clock3} label="Çalışma süresi" value={minutes(totals.studyMinutes)} detail={`${range} günlük gerçek kayıt`} tone="violet" />
            <MetricCard icon={Sparkles} label="Çözülen soru" value={number(totals.questions)} detail={`${number(totals.exams)} deneme`} tone="orange" />
            <MetricCard icon={CheckCircle2} label="Görev tamamlama" value={percent(totals.taskCompletionRate)} detail="Planlanan görevlerden" tone="teal" />
            <MetricCard icon={ArrowUpRight} label="Geri dönüş oranı" value={percent(totals.returningStudentRate)} detail="En az 2 aktif gün" tone="navy" />
          </section>

          <section className="admin-chart-grid">
            <article className="admin-card analytics-chart-card">
              <header><div><span>Aktivite eğrisi</span><h2>Günlük çalışma hareketi</h2></div><em>Son {range} gün</em></header>
              <div className="admin-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overview?.dailySeries || []} margin={{ top: 12, right: 10, bottom: 0, left: -18 }}>
                    <defs><linearGradient id="adminMinutes" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00a870" stopOpacity={0.28} /><stop offset="100%" stopColor="#00a870" stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf1f3" />
                    <XAxis dataKey="date" tickFormatter={shortDate} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8290a4' }} minTickGap={24} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8290a4' }} />
                    <Tooltip content={<AdminTooltip />} />
                    <Area type="monotone" dataKey="minutes" name="Dakika" stroke="#00a870" strokeWidth={2.3} fill="url(#adminMinutes)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="admin-card module-chart-card">
              <header><div><span>Ürün kullanımı</span><h2>Modül dağılımı</h2></div><BarChart3 size={19} /></header>
              <div className="module-bars">
                {moduleEntries.map(([key, value]) => <div key={key}><span>{moduleLabel(key)}</span><i><b style={{ width: `${Math.min(100, (Number(value) / Math.max(1, ...moduleEntries.map(([, item]) => Number(item)))) * 100)}%` }} /></i><strong>{number(value)}</strong></div>)}
              </div>
            </article>
          </section>

          <section className="admin-card admin-users" id="users">
            <header><div><span>Kullanıcı yönetimi</span><h2>Hesaplar ve gerçek ilerleme</h2><p>Rol ve hesap durumu değişiklikleri denetim günlüğüne yazılır.</p></div><form onSubmit={runSearch}><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad veya email ara" /><button>Ara</button></form></header>
            <div className="admin-table-wrap">
              <table><thead><tr><th>Kullanıcı</th><th>Durum</th><th>Çalışma</th><th>Soru</th><th>Seri</th><th>Seviye</th><th>Son giriş</th><th /></tr></thead><tbody>
                {(users?.items || []).map((item) => <tr key={item.id}><td><span className="admin-user-avatar">{String(item.name || 'Ö').charAt(0).toLocaleUpperCase('tr-TR')}</span><div><strong>{item.name}</strong><small>{item.email}</small></div></td><td><span className={`account-status is-${item.status}`}>{item.status === 'active' ? 'Aktif' : 'Askıda'}</span>{item.role && <small className="role-label">{item.role.replace('_', ' ')}</small>}</td><td><strong>{minutes(item.studyMinutes)}</strong><small>{number(item.studyDays)} gün</small></td><td>{number(item.questions)}</td><td>{item.streak} gün</td><td><strong>{item.level}</strong><small>{number(item.xp)} XP</small></td><td>{dateTime(item.lastSignInAt)}</td><td><button onClick={() => openUser(item)}>Yönet</button></td></tr>)}
              </tbody></table>
              {!users?.items?.length && <div className="admin-empty"><Search size={24} /><strong>Eşleşen kullanıcı yok</strong><span>Arama ifadesini değiştirip tekrar deneyin.</span></div>}
            </div>
            <footer><span>{number(users?.total)} kullanıcıdan {number((page - 1) * 15 + 1)}–{number(Math.min(page * 15, users?.total || 0))}</span><div><button onClick={() => changePage(page - 1)} disabled={page <= 1}>Önceki</button><em>{page}/{maxPages}</em><button onClick={() => changePage(page + 1)} disabled={page >= maxPages}>Sonraki</button></div></footer>
          </section>

          <section className="admin-activity-grid" id="activity">
            <article className="admin-card live-feed"><header><div><span>Realtime</span><h2>Canlı ürün akışı</h2></div><i><b /> Bağlı</i></header><div>{events.length ? events.map((event) => { const [label, Icon] = EVENT_LABELS[event.type] || [event.type, Activity]; return <article key={event.id}><span><Icon size={16} /></span><div><strong>{label}</strong><small>{event.userName || 'Sistem'} · {eventDetail(event)}</small></div><time>{dateTime(event.createdAt)}</time></article>; }) : <div className="admin-empty compact"><Activity size={23} /><strong>Henüz yeni hareket yok</strong></div>}</div></article>
            <article className="admin-card announcement-card" id="broadcast"><header><div><span>Duyuru merkezi</span><h2>Kullanıcılara ulaş</h2><p>Mesaj doğrudan uygulama içi bildirim merkezine gider.</p></div><BellRing size={20} /></header><form onSubmit={sendAnnouncement}><label><span>Başlık</span><input value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} minLength={2} maxLength={90} required /></label><label><span>Mesaj</span><textarea value={announcement.body} onChange={(event) => setAnnouncement({ ...announcement, body: event.target.value })} minLength={2} maxLength={240} required /></label><label><span>Uygulama içi bağlantı</span><input value={announcement.actionUrl} onChange={(event) => setAnnouncement({ ...announcement, actionUrl: event.target.value })} pattern="/.*" required /></label><label><span>Hedef kitle</span><Select value={announcement.audience} onChange={(value) => setAnnouncement({ ...announcement, audience: value })} options={AUDIENCE_OPTIONS} ariaLabel="Duyuru hedef kitlesi" /></label><button disabled={actionBusy === 'announcement'}><Send size={16} /> {actionBusy === 'announcement' ? 'Gönderiliyor…' : 'Duyuruyu gönder'}</button></form></article>
          </section>

          <section className="admin-card audit-log" id="audit"><header><div><span>Değiştirilemez iz</span><h2>Yönetici işlem günlüğü</h2></div><ShieldCheck size={20} /></header><div>{audit.length ? audit.map((item) => <article key={item.id}><span><FileText size={15} /></span><div><strong>{auditLabel(item.action)}</strong><small>{item.actorName || 'Yönetici'}{item.targetName ? ` → ${item.targetName}` : ''}</small></div><code>{JSON.stringify(item.details)}</code><time>{dateTime(item.createdAt)}</time></article>) : <div className="admin-empty compact"><ShieldCheck size={22} /><strong>Henüz yönetici işlemi yok</strong></div>}</div></section>
        </>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || 'Kullanıcı'} description={selected?.email} size="lg">
        {detailLoading ? <div className="admin-detail-loading"><RefreshCw className="is-spinning" size={22} /> Kullanıcı bilgileri hazırlanıyor…</div> : detail && (
          <div className="admin-user-detail">
            <section className="user-detail-summary"><div><span className="admin-user-avatar large">{String(selected.name || 'Ö').charAt(0)}</span><div><strong>{selected.name}</strong><small>{selected.field?.replace('_', ' ') || 'Alan seçilmedi'} · {dateTime(selected.createdAt)} tarihinde katıldı</small></div></div><span className={`account-status is-${moderation?.status || selected.status}`}>{(moderation?.status || selected.status) === 'active' ? 'Aktif hesap' : 'Askıda'}</span></section>
            <section className="detail-metrics">{[['Toplam çalışma', minutes(selected.studyMinutes)], ['Soru', number(selected.questions)], ['Seri', `${selected.streak} gün`], ['Seviye', `${selected.level} · ${number(selected.xp)} XP`], ['Arkadaş', number(selected.friends)], ['Sınıf', number(selected.groups)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
            <section className="detail-management"><div><h3>Üyelik planı</h3><p>{userPlan?.periodEnd ? `${userPlan.name || 'calisiyo plus'} · ${dateTime(userPlan.periodEnd)} tarihine kadar` : 'calisiyo ücretsiz · süresiz temel erişim'}</p></div><div className="role-control"><Select value={selectedPlan} onChange={setSelectedPlan} options={PLAN_OPTIONS} ariaLabel="Kullanıcı planı" /><button onClick={savePlan} disabled={!['admin', 'super_admin'].includes(role) || actionBusy === 'plan'}>{actionBusy === 'plan' ? 'Kaydediliyor…' : 'Planı kaydet'}</button></div></section>
            <section className="detail-management moderation-management"><div><h3>Hesap erişimi</h3><p>Askıya alma seçilen sürenin sonunda otomatik biter ve RLS erişimi yeniden açılır.{moderation?.suspendedUntil ? ` Bitiş: ${dateTime(moderation.suspendedUntil)}` : ''}</p></div>{moderation?.status === 'suspended' && (!moderation.suspendedUntil || Date.parse(moderation.suspendedUntil) > moderationClock) ? <button className="reactivate-button" onClick={() => moderateUser('activate')} disabled={actionBusy === 'activate'}><UserCheck size={16} /> Hesabı şimdi etkinleştir</button> : <div className="moderation-action-grid"><Select value={moderationDuration} onChange={setModerationDuration} options={MODERATION_DURATIONS} ariaLabel="Askıya alma süresi" /><textarea value={statusReason} onChange={(event) => setStatusReason(event.target.value)} maxLength={240} placeholder="İşlem nedeni (zorunlu)" /><button onClick={() => moderateUser('suspend')} disabled={!statusReason.trim() || actionBusy === 'suspend'}><Ban size={16} /> Süreli askıya al</button></div>}</section>
            <section className="detail-management moderation-management"><div><h3>Sosyal iletişim</h3><p>Susturulan kullanıcı sınıf sohbeti, tepkiler ve ortak odak başlatma araçlarını kullanamaz.{moderation?.mutedUntil ? ` Bitiş: ${dateTime(moderation.mutedUntil)}` : ''}</p></div>{moderation?.mutedUntil && Date.parse(moderation.mutedUntil) > moderationClock ? <button className="reactivate-button" onClick={() => moderateUser('unmute')} disabled={actionBusy === 'unmute'}><Volume2 size={16} /> Susturmayı kaldır</button> : <div className="moderation-action-grid"><Select value={moderationDuration} onChange={setModerationDuration} options={MODERATION_DURATIONS} ariaLabel="Susturma süresi" /><textarea value={statusReason} onChange={(event) => setStatusReason(event.target.value)} maxLength={240} placeholder="Susturma nedeni (zorunlu)" /><button onClick={() => moderateUser('mute')} disabled={!statusReason.trim() || actionBusy === 'mute'}><VolumeX size={16} /> Süreli sustur</button></div>}</section>
            {role === 'super_admin' && <section className="detail-management"><div><h3>Yönetim rolü</h3><p>En az yetki ilkesine göre yalnızca gerekli rolü verin.</p></div><div className="role-control"><Select value={selectedRole} onChange={setSelectedRole} options={ROLE_OPTIONS} ariaLabel="Kullanıcı rolü" /><button onClick={saveRole} disabled={actionBusy === 'role'}>Rolü kaydet</button></div></section>}
            {role !== 'moderator' && <section className="detail-notes"><header><div><h3>Yönetici notları</h3><p>Bu notlar kullanıcıya gösterilmez.</p></div><MessageSquarePlus size={18} /></header><form onSubmit={addNote}><textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} minLength={2} maxLength={1000} placeholder="İç ekip için güvenli bir not ekle…" /><button disabled={actionBusy === 'note'}>Not ekle</button></form><div>{(detail.notes || []).map((note) => <article key={note.id}><p>{note.note}</p><small>{note.authorName || 'Yönetici'} · {dateTime(note.createdAt)}</small></article>)}</div></section>}
          </div>
        )}
      </Modal>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  return <article className={`admin-metric is-${tone}`}><span><Icon size={19} /></span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></article>;
}

function AdminTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="admin-tooltip"><strong>{shortDate(label)}</strong>{payload.map((item) => <span key={item.dataKey}>{item.name}: {number(item.value)}</span>)}</div>;
}

function AdminSkeleton() {
  return <div className="admin-skeleton"><div>{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div><span /><span /></div>;
}

function moduleLabel(key) {
  return ({ studySessions: 'Çalışma oturumları', tasksCompleted: 'Tamamlanan görevler', examsAdded: 'Denemeler', reviewsCompleted: 'Tekrarlar', topicsCompleted: 'Konular', notesCreated: 'Notlar', friendConnections: 'Arkadaşlıklar', studyGroups: 'Çalışma sınıfları' })[key] || key;
}

function eventDetail(event) {
  if (event.type === 'study_recorded') return `${event.payload?.minutes || 0} dk · ${event.payload?.questions || 0} soru`;
  if (event.type === 'exam_created') return event.payload?.examType || 'Deneme';
  if (event.type === 'admin_user_status') return event.payload?.status === 'suspended' ? 'Hesap askıya alındı' : 'Hesap etkinleştirildi';
  return 'Yeni hareket';
}

function auditLabel(action) {
  return ({ user_status_changed: 'Hesap durumu değiştirildi', user_role_changed: 'Yönetim rolü değiştirildi', user_plan_changed: 'Üyelik planı değiştirildi', user_note_added: 'Yönetici notu eklendi', announcement_sent: 'Duyuru gönderildi' })[action] || action;
}
