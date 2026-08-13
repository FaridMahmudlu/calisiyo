'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, BookOpenCheck, Check, Clipboard, Crown, DoorOpen, Flame, Goal,
  LockKeyhole, Medal, Plus, Search, ShieldCheck, Sparkles, Timer, UserPlus,
  UsersRound, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../layout';
import PageHeader from '@/components/ui/PageHeader';
import DataState from '@/components/ui/DataState';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import './social.css';

const METRIC_OPTIONS = [
  ['streak', 'Seri', 'gün', Flame],
  ['studyDays', 'Çalışma günü', 'gün', Goal],
  ['questions', 'Soru', 'soru', Sparkles],
  ['xp', 'XP', 'XP', Medal],
];

const initials = (name) => String(name || 'Ö')
  .split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toLocaleUpperCase('tr-TR');

const friendlyError = (error, fallback) => error?.message?.replace(/^.*?:\s*/, '') || fallback;

export default function FriendsPage() {
  const router = useRouter();
  const { user, currentPlan } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [hub, setHub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [metric, setMetric] = useState('streak');
  const [friendCode, setFriendCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('Her gün düzenli çalışıp birbirimizi motive ettiğimiz YKS sınıfı.');
  const [groupGoal, setGroupGoal] = useState(1200);
  const [groupCapacity, setGroupCapacity] = useState('8');
  const [groupExamTrack, setGroupExamTrack] = useState('tyt_ayt');
  const [groupStyle, setGroupStyle] = useState('balanced');
  const [inviteCode, setInviteCode] = useState('');

  const loadHub = useCallback(async ({ quiet = false } = {}) => {
    if (!user?.id) return;
    if (!quiet) setLoading(true);
    const { data, error: hubError } = await supabase.rpc('get_social_hub');
    if (hubError) {
      setError('Arkadaşlık merkezi şu anda yüklenemiyor. Lütfen tekrar dene.');
    } else {
      setHub(data);
      setError('');
    }
    setLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => loadHub(), 0);
    return () => clearTimeout(timer);
  }, [loadHub]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const channel = supabase.channel(`social-hub-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => loadHub({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members' }, () => loadHub({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_presence' }, () => loadHub({ quiet: true }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadHub, supabase, user?.id]);

  const rankedFriends = useMemo(() => [...(hub?.friends || [])]
    .sort((a, b) => {
      const aValue = a[metric];
      const bValue = b[metric];
      if (aValue == null && bValue == null) return a.name.localeCompare(b.name, 'tr');
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return Number(bValue) - Number(aValue);
    }), [hub?.friends, metric]);

  const searchStudent = async (event) => {
    event.preventDefault();
    const code = friendCode.trim();
    if (!code) return;
    setSearching(true);
    const { data, error: searchError } = await supabase.rpc('find_student_by_code', { p_code: code });
    setSearching(false);
    if (searchError) {
      setError(friendlyError(searchError, 'Öğrenci aranamadı.'));
      return;
    }
    setSearchResult(data || { missing: true });
  };

  const sendRequest = async () => {
    if (!searchResult?.code) return;
    setBusy('friend-request');
    const { error: requestError } = await supabase.rpc('send_friend_request', { p_code: searchResult.code });
    setBusy('');
    if (requestError) {
      setError(friendlyError(requestError, 'Arkadaşlık isteği gönderilemedi.'));
      return;
    }
    setSearchResult(null);
    setFriendCode('');
    await loadHub({ quiet: true });
  };

  const respond = async (id, response) => {
    setBusy(`${response}-${id}`);
    const { error: responseError } = await supabase.rpc('respond_friend_request', {
      p_friendship_id: id,
      p_response: response,
    });
    setBusy('');
    if (responseError) setError(friendlyError(responseError, 'İstek yanıtlanamadı.'));
    else await loadHub({ quiet: true });
  };

  const removeFriend = async (id) => {
    setBusy(`remove-${id}`);
    const { error: removeError } = await supabase.rpc('remove_friend', { p_friendship_id: id });
    setBusy('');
    if (removeError) setError(friendlyError(removeError, 'Arkadaş kaldırılamadı.'));
    else await loadHub({ quiet: true });
  };

  const updatePreference = async (key, value) => {
    const next = { ...hub.profile, [key]: value };
    setHub((current) => ({ ...current, profile: next }));
    const { error: preferenceError } = await supabase.rpc('update_social_preferences', {
      p_allow_requests: next.allowFriendRequests,
      p_share_study_days: next.shareStudyDays,
      p_share_questions: next.shareQuestionCount,
      p_share_streak: next.shareStreak,
      p_share_xp: next.shareXp,
    });
    if (preferenceError) {
      setError('Gizlilik tercihin kaydedilemedi.');
      await loadHub({ quiet: true });
    }
  };

  const createGroup = async (event) => {
    event.preventDefault();
    setBusy('create-group');
    const { data, error: createError } = await supabase.rpc('create_study_group_v3', {
      p_name: groupName,
      p_description: groupDescription,
      p_weekly_goal_minutes: Number(groupGoal),
      p_max_members: Number(groupCapacity),
      p_exam_track: groupExamTrack,
      p_study_style: groupStyle,
    });
    setBusy('');
    if (createError) {
      setError(friendlyError(createError, 'Sınıf oluşturulamadı.'));
      return;
    }
    setModal(null);
    setGroupName('');
    setGroupDescription('Her gün düzenli çalışıp birbirimizi motive ettiğimiz YKS sınıfı.');
    await loadHub({ quiet: true });
    if (data?.id) router.push(`/dashboard/arkadaslar/${data.id}`);
  };

  const joinGroup = async (event) => {
    event.preventDefault();
    setBusy('join-group');
    const { data, error: joinError } = await supabase.rpc('join_study_group', { p_invite_code: inviteCode });
    setBusy('');
    if (joinError) {
      setError(friendlyError(joinError, 'Sınıfa katılınamadı.'));
      return;
    }
    setModal(null);
    setInviteCode('');
    await loadHub({ quiet: true });
    if (data?.id) router.push(`/dashboard/arkadaslar/${data.id}`);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(hub?.profile?.friendCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const activeMetric = METRIC_OPTIONS.find(([key]) => key === metric) || METRIC_OPTIONS[0];
  const classroomMemberLimit = Math.max(2, Number(currentPlan?.entitlements?.classroom_member_limit || 8));
  const capacityOptions = [4, 8, 12, 20, 30, 50]
    .filter((value) => value <= classroomMemberLimit)
    .map((value) => ({
      value: String(value),
      label: `${value} kişi`,
      description: value <= 4 ? 'Yakın çalışma ekibi' : value <= 8 ? 'Dengeli sınıf' : 'Geniş çalışma topluluğu',
    }));

  return (
    <div className="social-page">
      <PageHeader
        eyebrow="Sosyal çalışma"
        title="Birlikte çalış, kendi sınırını koru"
        description="Arkadaşlarınla çalışma ritmini karşılaştır; netlerini ve özel çalışma kayıtlarını paylaşmak zorunda değilsin."
        actions={(
          <>
            <button className="study-button" onClick={() => setModal('join')}><DoorOpen size={17} /> Sınıfa katıl</button>
            <button className="study-button study-button-primary" onClick={() => setModal('create')}><Plus size={17} /> Sınıf oluştur</button>
          </>
        )}
      />

      {error && <div className="social-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Uyarıyı kapat"><X size={16} /></button></div>}

      <DataState loading={loading} error={!loading ? error && !hub ? error : '' : ''} empty={!hub}>
        {hub && (
          <>
            <section className="social-pulse-grid" aria-label="Sosyal çalışma özeti">
              <article><span><UsersRound size={18} /></span><div><strong>{(hub.friends || []).length}</strong><small>çalışma arkadaşı</small></div></article>
              <article><span><DoorOpen size={18} /></span><div><strong>{(hub.groups || []).length}</strong><small>aktif sınıf</small></div></article>
              <article><span><Flame size={18} /></span><div><strong>{Number(hub.metrics?.streak || 0)}</strong><small>günlük seri</small></div></article>
              <article><span><ShieldCheck size={18} /></span><div><strong>Özel</strong><small>kontrollü paylaşım</small></div></article>
            </section>

            <section className="social-intro-grid">
              <article className="friend-code-card study-panel">
                <div><span><UserPlus size={17} /> Arkadaş kodun</span><strong>{hub.profile.friendCode}</strong><p>Bu kodu yalnızca tanıdığın kişilerle paylaş. Kod, email adresini göstermez.</p></div>
                <button onClick={copyCode}>{copied ? <Check size={17} /> : <Clipboard size={17} />}{copied ? 'Kopyalandı' : 'Kodu kopyala'}</button>
              </article>

              <article className="friend-search-card study-panel">
                <div><span><Search size={17} /> Kodla arkadaş bul</span><p>Arkadaşının CAL- ile başlayan kişisel kodunu gir.</p></div>
                <form onSubmit={searchStudent}>
                  <input value={friendCode} onChange={(event) => setFriendCode(event.target.value.toUpperCase())} placeholder="CAL-XXXXXXXXXX" maxLength={14} />
                  <button disabled={searching}>{searching ? 'Aranıyor…' : 'Bul'}</button>
                </form>
                {searchResult && (
                  <div className={`friend-search-result ${searchResult.missing ? 'is-missing' : ''}`}>
                    {searchResult.missing ? <span>Bu kodla istek kabul eden öğrenci bulunamadı.</span> : (
                      <><span className="social-avatar">{initials(searchResult.name)}</span><div><strong>{searchResult.name}</strong><small>{searchResult.relationship === 'none' ? 'Yeni bağlantı' : searchResult.relationship}</small></div><button onClick={sendRequest} disabled={busy === 'friend-request' || searchResult.relationship !== 'none'}>{busy === 'friend-request' ? 'Gönderiliyor…' : 'İstek gönder'}</button></>
                    )}
                  </div>
                )}
              </article>
            </section>

            {(hub.incomingRequests || []).length > 0 && (
              <section className="friend-requests study-panel">
                <header><div><span>Bekleyen istekler</span><h2>Birlikte çalışmak isteyenler</h2></div><em>{hub.incomingRequests.length}</em></header>
                <div>
                  {hub.incomingRequests.map((request) => (
                    <article key={request.friendshipId}>
                      <span className="social-avatar">{initials(request.name)}</span>
                      <div><strong>{request.name}</strong><small>Çalışma arkadaşlığı isteği gönderdi</small></div>
                      <button className="request-decline" onClick={() => respond(request.friendshipId, 'declined')} disabled={busy.endsWith(request.friendshipId)}><X size={16} /> Reddet</button>
                      <button className="request-accept" onClick={() => respond(request.friendshipId, 'accepted')} disabled={busy.endsWith(request.friendshipId)}><Check size={16} /> Kabul et</button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="social-main-grid">
              <article className="leaderboard study-panel">
                <header><div><span>Arkadaş sıralaması</span><h2>Ritmini birlikte takip et</h2></div><div className="metric-switcher">{METRIC_OPTIONS.map(([key, label, unit, Icon]) => <button key={key} className={metric === key ? 'is-active' : ''} onClick={() => setMetric(key)} title={label}><Icon size={15} /><span>{label}</span></button>)}</div></header>
                <div className="leaderboard-self">
                  <span className="social-avatar is-self">S</span><div><strong>Sen</strong><small>Kişisel göstergen</small></div><em>{Number(hub.metrics?.[metric] || 0).toLocaleString('tr-TR')} {activeMetric[2]}</em>
                </div>
                {(rankedFriends || []).length === 0 ? (
                  <div className="social-empty"><UsersRound size={28} /><strong>İlk çalışma arkadaşını ekle</strong><span>Kodla arkadaş eklediğinde gerçek çalışma ritminiz burada karşılaştırılır.</span></div>
                ) : (
                  <div className="leaderboard-list">
                    {rankedFriends.map((friend, index) => (
                      <article key={friend.friendshipId}>
                        <span className={`rank-number rank-${index + 1}`}>{index < 3 ? <Medal size={18} /> : index + 1}</span>
                        <span className="social-avatar">{initials(friend.name)}</span>
                        <div><strong>{friend.name}</strong><small>{friend.level ? `Seviye ${friend.level}` : 'Paylaşım tercihi sınırlı'}</small></div>
                        <em>{friend[metric] == null ? <LockKeyhole size={15} /> : `${Number(friend[metric]).toLocaleString('tr-TR')} ${activeMetric[2]}`}</em>
                        <button className="friend-remove" onClick={() => removeFriend(friend.friendshipId)} disabled={busy === `remove-${friend.friendshipId}`} aria-label={`${friend.name} arkadaşını kaldır`}><X size={15} /></button>
                      </article>
                    ))}
                  </div>
                )}
              </article>

              <article className="privacy-panel study-panel">
                <header><span>Gizlilik</span><h2>Neyi paylaşacağını sen seç</h2><p>Deneme netleri hiçbir zaman sosyal profiline eklenmez.</p></header>
                <div>
                  {[
                    ['allowFriendRequests', 'Arkadaşlık istekleri', 'Kodumla istek al'],
                    ['shareStudyDays', 'Çalışma günlerim', '30 dakikayı geçen günleri göster'],
                    ['shareQuestionCount', 'Soru sayım', 'Toplam çözülen soru sayısını göster'],
                    ['shareStreak', 'Serim', 'Güncel seri süremi göster'],
                    ['shareXp', 'Seviye ve XP', 'Gelişim seviyemi göster'],
                  ].map(([key, title, copy]) => (
                    <label key={key}><span><strong>{title}</strong><small>{copy}</small></span><input type="checkbox" checked={Boolean(hub.profile[key])} onChange={(event) => updatePreference(key, event.target.checked)} /></label>
                  ))}
                </div>
              </article>
            </section>

            <section className="group-section">
              <header><div><span>Çalışma sınıfları · {currentPlan?.name || 'Başlangıç'}</span><h2>Ortak ritmin canlı alanı</h2><p>Planına göre {classroomMemberLimit} kişiye kadar özel sınıflarda haftalık hedefi ve canlı çalışma durumunu takip et.</p></div><div><button onClick={() => setModal('join')}><DoorOpen size={16} /> Katıl</button><button onClick={() => setModal('create')}><Plus size={16} /> Oluştur</button></div></header>
              {(hub.groups || []).length === 0 ? (
                <div className="group-empty study-panel"><div className="mini-classroom"><i /><i /><i /><i /></div><strong>İlk çalışma sınıfını kur</strong><span>Arkadaşlarını davet et, sınıftaki masalarda kimin çalıştığını canlı gör.</span><button onClick={() => setModal('create')}>Sınıf oluştur <ArrowRight size={16} /></button></div>
              ) : (
                <div className="group-card-grid">
                  {hub.groups.map((group) => (
                    <Link href={`/dashboard/arkadaslar/${group.id}`} key={group.id} className="group-card study-panel">
                      <div className="group-card-visual"><span><UsersRound size={22} /></span>{group.onlineCount > 0 && <em>{group.onlineCount} çevrimiçi</em>}</div>
                      <div><span>{group.memberRole === 'owner' ? <><Crown size={13} /> Kurucusun</> : 'Üyesin'}</span><h3>{group.name}</h3><p>{group.memberCount} üye · Haftalık {Number(group.weeklyGoalMinutes).toLocaleString('tr-TR')} dk hedef</p></div>
                      <ArrowRight size={19} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </DataState>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Çalışma sınıfını kur" description="Ritmini, kapasiteyi ve iletişim biçimini baştan belirle; tüm ayarları sonra değiştirebilirsin." size="lg">
        <form className="social-modal-form class-create-form" onSubmit={createGroup}>
          <section className="class-create-guide"><article><BookOpenCheck size={18} /><strong>Ortak ritim</strong><span>Gerçek çalışma kayıtları hedefe eklenir.</span></article><article><Timer size={18} /><strong>Canlı odak</strong><span>Paylaşılan sayaç ve sessiz durumlar.</span></article><article><ShieldCheck size={18} /><strong>Kurucu kontrolü</strong><span>Yetki, susturma ve üye yönetimi.</span></article></section>
          <div className="class-create-fields">
            <label><span>Sınıf adı</span><input value={groupName} onChange={(event) => setGroupName(event.target.value)} minLength={2} maxLength={40} placeholder="Örn. Sayısal 2027 Sabah Grubu" required /><small>Kısa, anlaşılır ve hedefi anlatan bir ad seç.</small></label>
            <label className="is-wide"><span>Sınıf açıklaması</span><textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} minLength={8} maxLength={180} required /><small>{groupDescription.length}/180 · Üyeler katılmadan önce ritmi anlayabilsin.</small></label>
            <label><span>Sınav odağı</span><Select value={groupExamTrack} onChange={setGroupExamTrack} ariaLabel="Sınıf sınav odağı" options={[{ value:'tyt_ayt',label:'TYT + AYT',description:'Birlikte tam YKS hazırlığı'},{ value:'tyt',label:'TYT',description:'Temel yeterlilik odağı'},{ value:'ayt',label:'AYT',description:'Alan yeterlilik odağı'},{ value:'ydt',label:'YDT',description:'Yabancı dil odağı'}]} /></label>
            <label><span>Çalışma atmosferi</span><Select value={groupStyle} onChange={setGroupStyle} ariaLabel="Çalışma atmosferi" options={[{ value:'balanced',label:'Dengeli',description:'Sohbet ve odak birlikte'},{ value:'quiet',label:'Sessiz odak',description:'Kurucu kontrollü iletişim'},{ value:'social',label:'Sosyal',description:'Motivasyon ve paylaşım yoğun'}]} /></label>
            <label><span>Üye kapasitesi</span><Select value={groupCapacity} onChange={setGroupCapacity} ariaLabel="Sınıf kapasitesi" options={capacityOptions} /></label>
            <label><span>Haftalık ortak hedef</span><input type="number" value={groupGoal} onChange={(event) => setGroupGoal(event.target.value)} min="30" max="50000" required /><small>{Math.round(Number(groupGoal || 0) / Math.max(1,Number(groupCapacity)) / 7)} dk / kişi / gün önerisi</small></label>
          </div>
          <footer><div><LockKeyhole size={15} /><span>Sınıf yalnızca ROOM davet koduyla açılır.</span></div><button className="study-button study-button-primary" disabled={busy === 'create-group'}>{busy === 'create-group' ? 'Oluşturuluyor…' : 'Sınıfı oluştur ve aç'}</button></footer>
        </form>
      </Modal>

      <Modal open={modal === 'join'} onClose={() => setModal(null)} title="Çalışma sınıfına katıl" description="Sınıf kurucusunun paylaştığı ROOM- kodunu gir.">
        <form className="social-modal-form" onSubmit={joinGroup}>
          <label><span>Davet kodu</span><input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} maxLength={13} placeholder="ROOM-XXXXXXXX" required /></label>
          <button className="study-button study-button-primary" disabled={busy === 'join-group'}>{busy === 'join-group' ? 'Katılınıyor…' : 'Sınıfa katıl'}</button>
        </form>
      </Modal>
    </div>
  );
}
