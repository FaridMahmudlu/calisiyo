import { createClient } from '@/lib/supabase/server';

const DEFAULT_PREFERENCES = {
  theme: 'light',
  dailyPlan: true,
  repeats: true,
  pomodoro: true,
};

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

  const [{ data: profile, error: profileError }, { data: tasks, error: taskError }, { data: sessions, error: sessionError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('gunluk_gorevler').select('tarih,tamamlandi,soru_sayisi').eq('user_id', user.id),
    supabase.from('calisma_suresi').select('tarih,sure_dakika,soru_sayisi').eq('user_id', user.id),
  ]);

  if (profileError || taskError || sessionError) {
    return Response.json(
      { ok: false, message: 'Çalışma bilgilerin yüklenemedi. Lütfen sayfayı yenileyin.' },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    user: { id: user.id, email: user.email, user_metadata: user.user_metadata },
    profile,
    tasks: tasks || [],
    sessions: sessions || [],
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
    if (fullName.length < 2) return invalid('Ad soyad en az 2 karakter olmalıdır.');
    if (!['sayisal', 'esit_agirlik', 'sozel', 'dil'].includes(field)) {
      return invalid('Geçerli bir alan seçmelisin.');
    }

    const preferences = { ...DEFAULT_PREFERENCES, ...(body.preferences || {}) };
    if (!['light', 'dark', 'system'].includes(preferences.theme)) {
      preferences.theme = 'light';
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        alan_secimi: field,
        study_preferences: preferences,
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
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
    if (password.length < 8) return invalid('Yeni şifre en az 8 karakter olmalıdır.');
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
