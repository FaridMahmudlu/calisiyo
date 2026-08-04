import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_EMAIL || 'mert.kaya.demo@calisiyo.app';
const password = process.env.DEMO_PASSWORD;

if (!url || !serviceKey || !password) throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ve DEMO_PASSWORD gerekli.');

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const dateKey = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const createdAt = (offset, hour) => `${dateKey(offset)}T${String(hour).padStart(2, '0')}:15:00+03:00`;
const requireData = (result, context) => {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
};

const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (list.error) throw list.error;
let user = list.data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Mert Kaya', alan_secimi: 'sayisal', account_type: 'demo' },
  });
  if (created.error) throw created.error;
  user = created.data.user;
} else {
  const updated = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { ...user.user_metadata, full_name: 'Mert Kaya', alan_secimi: 'sayisal', account_type: 'demo' } });
  if (updated.error) throw updated.error;
}

const userId = user.id;
const ownerTables = ['pomodoro_kayitlari', 'notlar', 'tekrarlar', 'yapamadiklari', 'calisma_suresi', 'denemeler', 'gunluk_gorevler', 'kaynaklarim', 'konu_takibi'];
for (const table of ownerTables) requireData(await supabase.from(table).delete().eq('user_id', userId), `${table} temizleme`);

requireData(await supabase.from('profiles').upsert({
  id: userId,
  full_name: 'Mert Kaya',
  alan_secimi: 'sayisal',
  theme: 'light',
  notifications_enabled: true,
  study_preferences: { theme: 'light', dailyPlan: true, repeats: true, pomodoro: true },
  study_goals: { nets: { TYT: 92, AYT: 62, YDT: 0 }, weeklyQuestions: 720, weeklyMinutes: 1500, topics: { TYT: 78, AYT: 55, YDT: 0 }, university: 'Orta Doğu Teknik Üniversitesi', program: 'Bilgisayar Mühendisliği' },
  study_goals_updated_at: new Date().toISOString(),
}), 'profil güncelleme');

const courses = requireData(await supabase.from('dersler').select('id,ad,sinav_turu,renk').contains('alan', ['sayisal']).order('sira'), 'dersler');
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
const resources = requireData(await supabase.from('kaynaklarim').insert(resourceRows).select('id,custom_ad,custom_ders_id'), 'kaynak ekleme');

const topicsByCourse = requireData(await supabase.from('konular').select('id,ad,ders_id').in('ders_id', selectedCourses.map((course) => course.id)).order('sira'), 'konular');
const trackedTopics = topicsByCourse.slice(0, 38).map((topic, index) => ({
  user_id: userId,
  konu_id: topic.id,
  durum: index < 21 ? 'tamamlandi' : index < 31 ? 'devam_ediyor' : 'baslanmadi',
  updated_at: createdAt(-Math.max(1, 32 - index), 19),
}));
requireData(await supabase.from('konu_takibi').insert(trackedTopics), 'konu takibi');

const taskTopics = ['Paragrafta anlam', 'Problemler', 'Hareket ve kuvvet', 'Kimyasal türler', 'Fonksiyonlar', 'Elektrik alan', 'Organik kimya', 'Kalıtım'];
const taskRows = [];
const sessionRows = [];
for (let offset = -34; offset <= 3; offset += 1) {
  if ([0, 6].includes(new Date(`${dateKey(offset)}T12:00:00`).getDay()) && offset < 0) continue;
  const dayCourses = [selectedCourses[Math.abs(offset) % selectedCourses.length], selectedCourses[(Math.abs(offset) + 3) % selectedCourses.length], selectedCourses[(Math.abs(offset) + 5) % selectedCourses.length]];
  dayCourses.forEach((course, index) => {
    const completed = offset < 0 || (offset === 0 && index < 2);
    const startHour = 9 + index * 3;
    const duration = [50, 60, 45][index];
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
requireData(await supabase.from('gunluk_gorevler').insert(taskRows), 'program ekleme');
requireData(await supabase.from('calisma_suresi').insert(sessionRows), 'çalışma kaydı ekleme');

const examOffsets = [-32, -25, -18, -11, -4];
for (let examIndex = 0; examIndex < examOffsets.length; examIndex += 1) {
  const offset = examOffsets[examIndex];
  const insertedExam = requireData(await supabase.from('denemeler').insert({ user_id: userId, sinav_turu: 'TYT', yayin: ['Bilgi Sarmal', '3D', 'Özdebir', 'Türkiye Geneli', 'Orijinal'][examIndex], tarih: dateKey(offset), sure_dakika: 165, created_at: createdAt(offset, 13) }).select('id').single(), 'deneme ekleme');
  const examCourses = selectedCourses.filter((course) => course.sinav_turu === 'TYT').slice(0, 4);
  const baseCorrect = [28, 23, 8, 7];
  const details = examCourses.map((course, index) => {
    const dogru = Math.min(index < 2 ? 38 : 13, baseCorrect[index] + examIndex * (index < 2 ? 2 : 1));
    const yanlis = Math.max(1, 7 - examIndex - index);
    const total = index < 2 ? 40 : 20;
    return { deneme_id: insertedExam.id, ders_id: course.id, dogru, yanlis, bos: Math.max(0, total - dogru - yanlis) };
  });
  requireData(await supabase.from('deneme_detaylari').insert(details), 'deneme detayı');
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
requireData(await supabase.from('yapamadiklari').insert(wrongQuestionRows), 'zor soru ekleme');

requireData(await supabase.from('tekrarlar').insert([
  { user_id: userId, ders_id: findCourse('TYT', 'Matematik')?.id, sinav_turu: 'TYT', konu: 'Problemler', kaynak: '345 Yayınları', tekrar_tarihi: dateKey(0), tekrar_saati: '20:00', tamamlandi: false },
  { user_id: userId, ders_id: findCourse('AYT', 'Matematik')?.id, sinav_turu: 'AYT', konu: 'Fonksiyonlar', kaynak: 'Orijinal Yayınları', tekrar_tarihi: dateKey(1), tekrar_saati: '18:30', tamamlandi: false },
  { user_id: userId, ders_id: findCourse('TYT', 'Fizik')?.id, sinav_turu: 'TYT', konu: 'Hareket ve kuvvet', tekrar_tarihi: dateKey(-1), tekrar_saati: '19:00', tamamlandi: true },
]), 'tekrar ekleme');

requireData(await supabase.from('notlar').insert([
  { user_id: userId, klasor: 'Matematik', baslik: 'Problem çözme kontrol listesi', icerik: 'Önce verilenleri yaz. Birimleri eşitle. Sonuç için yaklaşık değer kontrolü yap.', created_at: createdAt(-12, 21), updated_at: createdAt(-2, 21) },
  { user_id: userId, klasor: 'Fen', baslik: 'Elektrik alan kısa notları', icerik: 'Vektörel yönü belirlemeden büyüklük hesabına geçme.', created_at: createdAt(-8, 20), updated_at: createdAt(-8, 20) },
  { user_id: userId, klasor: 'Deneme', baslik: 'Son TYT değerlendirmesi', icerik: 'Türkçe süre kontrolü iyi. Matematikte son 10 soruya 25 dakika ayır.', created_at: createdAt(-4, 18), updated_at: createdAt(-4, 18) },
]), 'not ekleme');

console.log(JSON.stringify({ ok: true, email, userId, tasks: taskRows.length, sessions: sessionRows.length, exams: examOffsets.length, topics: trackedTopics.length }));
