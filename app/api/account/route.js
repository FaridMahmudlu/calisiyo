import { createClient } from '@/lib/supabase/server';
import { passwordValidationMessage } from '@/lib/utils/password';

const DEFAULT_PREFERENCES = {
  theme: 'light',
  notifications: true,
  dailyPlan: true,
  repeats: true,
  pomodoro: true,
};

function profileDefaults(user) {
  const metadata = user.user_metadata || {};
  const field = ['sayisal', 'esit_agirlik', 'sozel', 'dil'].includes(metadata.alan_secimi)
    ? metadata.alan_secimi
    : 'sayisal';
  const emailName = String(user.email || '').split('@')[0];
  return {
    id: user.id,
    full_name: String(metadata.full_name || metadata.name || emailName || 'Öğrenci').trim(),
    alan_secimi: field,
    yks_year: [2027, 2028].includes(Number(metadata.yks_year)) ? Number(metadata.yks_year) : 2027,
  };
}

function unauthorized() {
  return Response.json(
    { ok: false, message: 'Oturumunun süresi doldu. Lütfen yeniden giriş yap.' },
    { status: 401 }
  );
}

function invalid(message) {
  return Response.json({ ok: false, message }, { status: 400 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return unauthorized();

  const { data: existingProfile, error: profileReadError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileReadError) {
    console.error('Account profile could not be read', { code: profileReadError.code });
    return Response.json(
      { ok: false, message: 'Profil bilgilerin şu anda okunamıyor. Lütfen tekrar dene.' },
      { status: 500 }
    );
  }

  let profile = existingProfile;
  if (!profile) {
    const { data: repairedProfile, error: repairError } = await supabase
      .from('profiles')
      .upsert(profileDefaults(user), { onConflict: 'id' })
      .select('*')
      .single();

    if (repairError || !repairedProfile) {
      console.error('Account profile could not be repaired', { code: repairError?.code });
      return Response.json(
        { ok: false, message: 'Profilin hazırlanamadı. Lütfen tekrar giriş yap.' },
        { status: 500 }
      );
    }
    profile = repairedProfile;
  }

  const suspensionActive = profile.account_status === 'suspended'
    && (!profile.suspended_until || Date.parse(profile.suspended_until) > Date.now());
  if (suspensionActive) {
    return Response.json({
      ok: false,
      code: 'account_suspended',
      message: profile.status_reason
        ? `Hesabın geçici olarak askıya alındı: ${profile.status_reason}`
        : 'Hesabın geçici olarak askıya alındı. Destek ekibiyle iletişime geçebilirsin.',
    }, { status: 403 });
  }

  const [
    { data: tasks, error: taskError },
    { data: sessions, error: sessionError },
    { data: progress, error: progressError },
    { data: adminRole, error: roleError },
    { data: liveStreak, error: streakError },
    { data: currentPlan, error: planError },
  ] = await Promise.all([
    supabase.from('gunluk_gorevler').select('tarih,tamamlandi,soru_sayisi').eq('user_id', user.id),
    supabase.from('calisma_suresi').select('tarih,sure_dakika,soru_sayisi').eq('user_id', user.id),
    supabase.rpc('get_my_progress'),
    supabase.rpc('current_admin_role'),
    supabase.rpc('get_live_streak'),
    supabase.rpc('current_plan_details'),
  ]);

  if (taskError || sessionError || progressError || roleError || streakError || planError) {
    console.error('Account summary loaded partially', {
      tasks: taskError?.code,
      sessions: sessionError?.code,
      progress: progressError?.code,
      role: roleError?.code,
      streak: streakError?.code,
      plan: planError?.code,
    });
  }

  return Response.json({
    ok: true,
    user: { id: user.id, email: user.email, user_metadata: user.user_metadata },
    profile,
    tasks: tasks || [],
    sessions: sessions || [],
    progress: progress || null,
    adminRole: adminRole || null,
    liveStreak: liveStreak || null,
    currentPlan: currentPlan || { code: 'baslangic', name: 'calisiyo ücretsiz', status: 'free', entitlements: {} },
    partial: Boolean(taskError || sessionError || progressError || roleError || streakError || planError),
  });
}

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return invalid('Gönderilen bilgiler okunamadı. Lütfen tekrar deneyin.');
  }

  if (body.action === 'settings') {
    const fullName = String(body.fullName || '').trim();
    const field = String(body.field || '');
    const yksYear = Number(body.yksYear || 2027);
    if (fullName.length < 2) return invalid('Ad soyad en az 2 karakter olmalıdır.');
    if (!['sayisal', 'esit_agirlik', 'sozel', 'dil'].includes(field)) {
      return invalid('Geçerli bir alan seçmelisin.');
    }
    if (![2027, 2028].includes(yksYear)) return invalid('Geçerli bir YKS yılı seçmelisin.');

    const notificationsEnabled = body.notificationsEnabled !== false;
    const preferences = { ...DEFAULT_PREFERENCES, ...(body.preferences || {}), notifications: notificationsEnabled };
    if (!['light', 'dark', 'system'].includes(preferences.theme)) {
      preferences.theme = 'light';
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        alan_secimi: field,
        yks_year: yksYear,
        notifications_enabled: notificationsEnabled,
        study_preferences: preferences,
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Account settings could not be saved', { code: error.code });
      return Response.json(
        { ok: false, message: 'Ayarların kaydedilemedi. Lütfen tekrar deneyin.' },
        { status: 500 }
      );
    }
    return Response.json({ ok: true, profile: data });
  }

  if (body.action === 'goals') {
    const goals = body.goals;
    if (!goals || typeof goals !== 'object') return invalid('Hedef bilgileri eksik.');
    const numericValues = [
      ...Object.values(goals.nets || {}),
      ...Object.values(goals.topics || {}),
      goals.weeklyQuestions,
      goals.weeklyMinutes,
    ].map(Number);
    if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
      return invalid('Hedefler sıfır veya pozitif bir sayı olmalıdır.');
    }
    if (Object.values(goals.topics || {}).some((value) => !Number.isInteger(Number(value)))
      || !Number.isInteger(Number(goals.weeklyQuestions))
      || !Number.isInteger(Number(goals.weeklyMinutes))) {
      return invalid('Konu, soru ve dakika hedefleri tam sayı olmalıdır.');
    }
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('profiles')
      .update({ study_goals: goals, study_goals_updated_at: updatedAt })
      .eq('id', user.id)
      .select('study_goals,study_goals_updated_at')
      .single();

    if (error) {
      return Response.json(
        { ok: false, message: 'Hedeflerin kaydedilemedi. Lütfen tekrar deneyin.' },
        { status: 500 }
      );
    }
    return Response.json({ ok: true, goals: data.study_goals, updatedAt: data.study_goals_updated_at });
  }

  if (body.action === 'password') {
    const password = String(body.password || '');
    const passwordError = passwordValidationMessage(password);
    if (passwordError) return invalid(passwordError);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return Response.json(
        { ok: false, message: 'Şifren değiştirilemedi. Yeniden giriş yapıp tekrar deneyin.' },
        { status: 400 }
      );
    }
    return Response.json({ ok: true });
  }

  return invalid('Bu işlem desteklenmiyor.');
}
