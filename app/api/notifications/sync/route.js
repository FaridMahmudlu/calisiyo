import { createClient } from '@/lib/supabase/server';
import { todayStr } from '@/lib/utils/date';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return Response.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const date = DATE_PATTERN.test(String(body.date || '')) ? body.date : todayStr();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('notifications_enabled,study_preferences')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.notifications_enabled === false) {
    return Response.json({ ok: !profileError });
  }

  const preferences = profile.study_preferences || {};
  const [taskResult, repeatResult] = await Promise.all([
    preferences.dailyPlan === false
      ? Promise.resolve({ count: 0, error: null })
      : supabase.from('gunluk_gorevler').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('tarih', date).eq('tamamlandi', false),
    preferences.repeats === false
      ? Promise.resolve({ count: 0, error: null })
      : supabase.from('tekrarlar').select('id', { count: 'exact', head: true }).eq('user_id', user.id).lte('tekrar_tarihi', date).eq('tamamlandi', false),
  ]);

  if (taskResult.error || repeatResult.error) {
    return Response.json({ ok: false }, { status: 500 });
  }

  const rows = [];
  if (taskResult.count > 0) {
    rows.push({
      user_id: user.id,
      kind: 'reminder',
      title: 'Bugünün planı hazır',
      body: `Tamamlanmayı bekleyen ${taskResult.count} çalışma görevin var.`,
      action_url: '/dashboard/gunluk-program',
      dedupe_key: `daily-plan-${date}`,
    });
  }
  if (repeatResult.count > 0) {
    rows.push({
      user_id: user.id,
      kind: 'reminder',
      title: 'Tekrar zamanı',
      body: `${repeatResult.count} konu tekrarın bugün veya daha önce planlandı.`,
      action_url: '/dashboard/tekrarlarim',
      dedupe_key: `repeat-reminder-${date}`,
    });
  }

  if (rows.length) {
    const { error } = await supabase
      .from('notifications')
      .upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });
    if (error) return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true, created: rows.length });
}
