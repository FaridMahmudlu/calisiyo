import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.DEMO_EMAIL || 'mert.kaya.demo@calisiyo.app';
const password = process.env.DEMO_PASSWORD;
const fullName = process.env.DEMO_FULL_NAME || 'Mert Kaya';
const accountType = process.env.DEMO_ACCOUNT_TYPE || 'demo';
const managedBy = process.env.DEMO_MANAGED_BY || 'manual';
const username = process.env.DEMO_USERNAME || 'mertkaya';
const startPlusTrial = process.env.DEMO_START_PLUS_TRIAL === 'true';

if (!url || !anonKey || !password) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY ve DEMO_PASSWORD gerekli.');
}
if (accountType !== 'demo' || !email.toLowerCase().endsWith('.demo@calisiyo.app')) {
  throw new Error('Bu script yalnızca *.demo@calisiyo.app adresli demo hesaplarında çalışır.');
}

const supabase = serviceKey ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const demoClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const istanbulParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(new Date()).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
const istanbulToday = Date.UTC(Number(istanbulParts.year), Number(istanbulParts.month) - 1, Number(istanbulParts.day));
const dateKey = (offset = 0) => {
  return new Date(istanbulToday + offset * 86_400_000).toISOString().slice(0, 10);
};
const createdAt = (offset, hour) => `${dateKey(offset)}T${String(hour).padStart(2, '0')}:15:00+03:00`;
const requireData = (result, context) => {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
};

let user;
if (supabase) {
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;
  user = list.data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const created = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName, alan_secimi: 'sayisal', yks_year: 2027 },
      app_metadata: { account_type: accountType, managed_by: managedBy },
    });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    if (user.app_metadata?.account_type !== 'demo') throw new Error('Mevcut hesap demo olarak işaretli değil; güvenlik için işlem durduruldu.');
    const updated = await supabase.auth.admin.updateUserById(user.id, {
      password, email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name: fullName, alan_secimi: 'sayisal', yks_year: 2027 },
      app_metadata: { ...user.app_metadata, account_type: accountType, managed_by: managedBy },
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  }
} else {
  user = requireData(await demoClient.auth.signInWithPassword({ email, password }), 'demo oturumu açma').user;
  if (user.app_metadata?.account_type !== 'demo') throw new Error('Hesap demo olarak işaretli değil; güvenlik için işlem durduruldu.');
}

const userId = user.id;
const ownerTables = ['notifications', 'pomodoro_kayitlari', 'notlar', 'tekrarlar', 'yapamadiklari', 'calisma_suresi', 'denemeler', 'gunluk_gorevler', 'kaynaklarim', 'konu_takibi', 'xp_events'];
if (supabase) {
  for (const table of ownerTables) requireData(await supabase.from(table).delete().eq('user_id', userId), `${table} temizleme`);
} else {
  const existingSessions = await demoClient.from('calisma_suresi').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  requireData(existingSessions, 'mevcut demo verisi kontrolü');
  if (Number(existingSessions.count || 0) > 0) throw new Error('Demo hesabında veri var; güvenli sıfırlama için service role gerekli.');
}

const profileValues = {
  id: userId,
  full_name: fullName,
  alan_secimi: 'sayisal',
  theme: 'light',
  notifications_enabled: true,
  yks_year: 2027,
  study_preferences: { theme: 'light', dailyPlan: true, repeats: true, pomodoro: true },
  study_goals: { nets: { TYT: 92, AYT: 62, YDT: 0 }, weeklyQuestions: 720, weeklyMinutes: 1500, topics: { TYT: 78, AYT: 55, YDT: 0 }, university: 'Orta Doğu Teknik Üniversitesi', program: 'Bilgisayar Mühendisliği' },
  study_goals_updated_at: createdAt(-28, 20),
  updated_at: createdAt(-1, 21),
};
if (supabase) {
  requireData(await supabase.from('profiles').upsert({ ...profileValues, created_at: createdAt(-36, 9) }), 'profil güncelleme');
} else {
  const editableProfileValues = { ...profileValues };
  delete editableProfileValues.id;
  requireData(await demoClient.from('profiles').update(editableProfileValues).eq('id', userId), 'profil güncelleme');
}

if (supabase) {
  requireData(await supabase.from('social_profiles').upsert({
    user_id: userId, username, allow_friend_requests: true,
    share_study_days: true, share_question_count: true, share_streak: true, share_xp: true,
    avatar_seed: `kerem-${userId.slice(0, 8)}`, avatar_model: 'arda',
    created_at: createdAt(-36, 9), updated_at: createdAt(-2, 18),
  }), 'sosyal profil güncelleme');
}

if (supabase) requireData(await demoClient.auth.signInWithPassword({ email, password }), 'demo oturumu açma');
if (!supabase) {
  const socialProfile = requireData(await demoClient.from('social_profiles').select('username').eq('user_id', userId).single(), 'sosyal profil kontrolü');
  if (socialProfile.username !== username) requireData(await demoClient.rpc('set_my_username', { p_username: username }), 'kullanıcı adı güncelleme');
  requireData(await demoClient.rpc('update_classroom_character', { p_model: 'arda' }), 'karakter güncelleme');
}
let trial = null;
if (startPlusTrial) {
  const subscription = requireData(await demoClient.from('user_subscriptions').select('plan_code,status,current_period_end').eq('user_id', userId).maybeSingle(), 'abonelik kontrolü');
  trial = subscription || requireData(await demoClient.rpc('start_plus_trial', { p_plan_code: 'plus_2027' }), 'plus denemesi başlatma');
}

const courses = requireData(await demoClient.from('dersler').select('id,ad,sinav_turu,renk').eq('curriculum_year', 2027).contains('alan', ['sayisal']).order('sira'), 'dersler');
const findCourse = (exam, name) => courses.find((course) => course.sinav_turu === exam && course.ad.toLocaleLowerCase('tr-TR').includes(name.toLocaleLowerCase('tr-TR')));
const selectedCourses = [
  findCourse('TYT', 'Türkçe'), findCourse('TYT', 'Matematik'), findCourse('TYT', 'Fizik'), findCourse('TYT', 'Kimya'),
  findCourse('AYT', 'Matematik'), findCourse('AYT', 'Fizik'), findCourse('AYT', 'Kimya'), findCourse('AYT', 'Biyoloji'),
].filter(Boolean);
if (selectedCourses.length < 6) throw new Error('Demo veri için yeterli sayısal ders bulunamadı.');

const resourceRows = [
  { custom_ad: 'TYT Matematik Soru Bankası', custom_yayin: '345 Yayınları', custom_ders_id: findCourse('TYT', 'Matematik')?.id, custom_sinav_turu: 'TYT', custom_kitap_turu: 'soru_bankasi' },
  { custom_ad: 'TYT Türkçe Branş Denemeleri', custom_yayin: 'Bilgi Sarmal', custom_ders_id: findCourse('TYT', 'Türkçe')?.id, custom_sinav_turu: 'TYT', custom_kitap_turu: 'brans_deneme' },
  { custom_ad: 'AYT Matematik Fasikülleri', custom_yayin: 'Orijinal Yayınları', custom_ders_id: findCourse('AYT', 'Matematik')?.id, custom_sinav_turu: 'AYT', custom_kitap_turu: 'fasikul' },
  { custom_ad: 'AYT Fen Denemeleri', custom_yayin: '3D Yayınları', custom_ders_id: findCourse('AYT', 'Fizik')?.id, custom_sinav_turu: 'AYT', custom_kitap_turu: 'brans_deneme' },
].map((item) => ({ ...item, user_id: userId }));
const resources = requireData(await demoClient.from('kaynaklarim').insert(resourceRows).select('id,custom_ad,custom_ders_id'), 'kaynak ekleme');

const topicsByCourse = requireData(await demoClient.from('konular').select('id,ad,ders_id').in('ders_id', selectedCourses.map((course) => course.id)).order('sira'), 'konular');
const trackedTopics = topicsByCourse.slice(0, 38).map((topic, index) => ({
  user_id: userId,
  konu_id: topic.id,
  durum: index < 21 ? 'tamamlandi' : index < 31 ? 'devam_ediyor' : 'baslanmadi',
  updated_at: createdAt(-Math.max(1, 32 - index), 19),
}));
requireData(await demoClient.from('konu_takibi').insert(trackedTopics), 'konu takibi');

const taskTopics = ['Paragrafta anlam', 'Problemler', 'Hareket ve kuvvet', 'Kimyasal türler', 'Fonksiyonlar', 'Elektrik alan', 'Organik kimya', 'Kalıtım'];
const taskRows = [];
const sessionRows = [];
for (let offset = -35; offset <= 2; offset += 1) {
  const isWeekend = [0, 6].includes(new Date(`${dateKey(offset)}T12:00:00Z`).getUTCDay());
  const dayCourses = [selectedCourses[Math.abs(offset) % selectedCourses.length], selectedCourses[(Math.abs(offset) + 3) % selectedCourses.length], selectedCourses[(Math.abs(offset) + 5) % selectedCourses.length]];
  dayCourses.slice(0, isWeekend ? 2 : 3).forEach((course, index) => {
    const completed = offset < 0 || (offset === 0 && index < 2);
    const startHour = 9 + index * 3;
    const duration = isWeekend ? [45, 40][index] : [50, 60, 45][index];
    const endMinutes = startHour * 60 + duration;
    taskRows.push({
      user_id: userId, tarih: dateKey(offset), baslangic_saat: `${String(startHour).padStart(2, '0')}:00`, bitis_saat: `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`,
      ders_id: course.id, kaynak_id: resources.find((item) => item.custom_ders_id === course.id)?.id || resources[index % resources.length].id,
      konu: taskTopics[(Math.abs(offset) + index) % taskTopics.length], soru_sayisi: 28 + ((Math.abs(offset) * 7 + index * 9) % 33), sayfa_araligi: `${24 + index * 12}–${35 + index * 14}`, tamamlandi: completed,
      created_at: createdAt(Math.min(offset, -1), 8),
    });
    if (completed && offset <= 0) sessionRows.push({
      user_id: userId, ders_id: course.id, kaynak_id: resources.find((item) => item.custom_ders_id === course.id)?.id || null,
      tarih: dateKey(offset), sure_dakika: duration, soru_sayisi: 24 + ((Math.abs(offset) * 5 + index * 8) % 31), created_at: createdAt(offset, startHour + 1),
    });
  });
}
requireData(await demoClient.from('gunluk_gorevler').insert(taskRows), 'program ekleme');
requireData(await demoClient.from('calisma_suresi').insert(sessionRows), 'çalışma kaydı ekleme');

const pomodoroRows = sessionRows.slice(-18).map((session, index) => ({
  user_id: userId,
  calisma_suresi: [25, 30, 40, 50][index % 4],
  mola_suresi: [5, 5, 10][index % 3],
  ders_id: session.ders_id,
  tarih: session.created_at,
}));
requireData(await demoClient.from('pomodoro_kayitlari').insert(pomodoroRows), 'pomodoro kaydı ekleme');

const examOffsets = [-32, -25, -18, -11, -4];
for (let examIndex = 0; examIndex < examOffsets.length; examIndex += 1) {
  const offset = examOffsets[examIndex];
  const insertedExam = requireData(await demoClient.from('denemeler').insert({ user_id: userId, sinav_turu: 'TYT', yayin: ['Bilgi Sarmal', '3D', 'Özdebir', 'Türkiye Geneli', 'Orijinal'][examIndex], tarih: dateKey(offset), sure_dakika: 165, created_at: createdAt(offset, 13) }).select('id').single(), 'deneme ekleme');
  const examCourses = selectedCourses.filter((course) => course.sinav_turu === 'TYT').slice(0, 4);
  const baseCorrect = [28, 23, 8, 7];
  const details = examCourses.map((course, index) => {
    const dogru = Math.min(index < 2 ? 38 : 13, baseCorrect[index] + examIndex * (index < 2 ? 2 : 1));
    const yanlis = Math.max(1, 7 - examIndex - index);
    const total = index < 2 ? 40 : 20;
    return { deneme_id: insertedExam.id, ders_id: course.id, dogru, yanlis, bos: Math.max(0, total - dogru - yanlis) };
  });
  requireData(await demoClient.from('deneme_detaylari').insert(details), 'deneme detayı');
}

const wrongQuestionRows = Array.from({ length: 10 }, (_, index) => ({
  user_id: userId,
  ders_id: selectedCourses[index % selectedCourses.length].id,
  sinav_turu: selectedCourses[index % selectedCourses.length].sinav_turu,
  kaynak: resources[index % resources.length].custom_ad,
  konu: taskTopics[index % taskTopics.length],
  sayfa: 42 + index * 3,
  soru_no: String(4 + index),
  cozuldu: index < 7,
  created_at: createdAt(-24 + index * 2, 20),
}));
requireData(await demoClient.from('yapamadiklari').insert(wrongQuestionRows), 'zor soru ekleme');

requireData(await demoClient.from('tekrarlar').insert([
  { user_id: userId, ders_id: findCourse('TYT', 'Matematik')?.id, sinav_turu: 'TYT', konu: 'Problemler', kaynak: '345 Yayınları', tekrar_tarihi: dateKey(0), tekrar_saati: '20:00', tamamlandi: false },
  { user_id: userId, ders_id: findCourse('AYT', 'Matematik')?.id, sinav_turu: 'AYT', konu: 'Fonksiyonlar', kaynak: 'Orijinal Yayınları', tekrar_tarihi: dateKey(1), tekrar_saati: '18:30', tamamlandi: false },
  { user_id: userId, ders_id: findCourse('TYT', 'Fizik')?.id, sinav_turu: 'TYT', konu: 'Hareket ve kuvvet', tekrar_tarihi: dateKey(-1), tekrar_saati: '19:00', tamamlandi: true },
]), 'tekrar ekleme');

requireData(await demoClient.from('notlar').insert([
  { user_id: userId, klasor: 'Matematik', baslik: 'Problem çözme kontrol listesi', icerik: 'Önce verilenleri yaz. Birimleri eşitle. Sonuç için yaklaşık değer kontrolü yap.', created_at: createdAt(-12, 21), updated_at: createdAt(-2, 21) },
  { user_id: userId, klasor: 'Fen', baslik: 'Elektrik alan kısa notları', icerik: 'Vektörel yönü belirlemeden büyüklük hesabına geçme.', created_at: createdAt(-8, 20), updated_at: createdAt(-8, 20) },
  { user_id: userId, klasor: 'Deneme', baslik: 'Son TYT değerlendirmesi', icerik: 'Türkçe süre kontrolü iyi. Matematikte son 10 soruya 25 dakika ayır.', created_at: createdAt(-4, 18), updated_at: createdAt(-4, 18) },
]), 'not ekleme');

const [streak, statistics, progress, plan] = await Promise.all([
  demoClient.rpc('get_live_streak'),
  demoClient.rpc('get_my_study_time_statistics', { p_start_date: null }),
  demoClient.rpc('get_my_progress'),
  demoClient.rpc('current_plan_details'),
]);
const verifiedStreak = requireData(streak, 'seri doğrulama');
const verifiedStatistics = requireData(statistics, 'istatistik doğrulama');
const verifiedProgress = requireData(progress, 'seviye doğrulama');
const verifiedPlan = requireData(plan, 'plan doğrulama');
if (Number(verifiedStreak?.streak || 0) < 36 || Number(verifiedStatistics?.studyDays || 0) < 36) {
  throw new Error('Demo hesabı 36 günlük doğrulanmış çalışma geçmişine ulaşmadı.');
}
if (Number(verifiedProgress?.level || 0) < 6) throw new Error('Demo hesabının seviyesi çalışma geçmişiyle uyumlu değil.');
await demoClient.auth.signOut();

console.log(JSON.stringify({
  ok: true,
  email,
  fullName,
  accountType,
  managedBy,
  userId,
  tasks: taskRows.length,
  sessions: sessionRows.length,
  pomodoros: pomodoroRows.length,
  exams: examOffsets.length,
  topics: trackedTopics.length,
  streak: verifiedStreak.streak,
  studyDays: verifiedStatistics.studyDays,
  studyMinutes: verifiedStatistics.studyMinutes,
  totalXp: verifiedProgress.totalXp,
  level: verifiedProgress.level,
  levelTitle: verifiedProgress.title,
  planCode: verifiedPlan.code,
  planStatus: verifiedPlan.status,
  trialEndsAt: trial?.trialEndsAt || trial?.current_period_end || null,
}));
