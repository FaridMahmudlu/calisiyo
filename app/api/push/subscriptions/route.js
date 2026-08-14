import { createClient } from '@/lib/supabase/server';

function validSubscription(value) {
  if (!value || typeof value !== 'object') return false;
  try {
    const url = new URL(value.endpoint);
    return url.protocol === 'https:' && typeof value.keys?.p256dh === 'string' && typeof value.keys?.auth === 'string';
  } catch { return false; }
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch {}
  if (!validSubscription(body.subscription)) return Response.json({ ok: false, message: 'Geçersiz cihaz bildirimi kaydı.' }, { status: 400 });
  const item = body.subscription;
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id, endpoint: item.endpoint, p256dh: item.keys.p256dh,
    auth: item.keys.auth, user_agent: String(body.userAgent || '').slice(0, 500), updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  if (error) return Response.json({ ok: false, message: 'Cihaz bildirimi kaydedilemedi.' }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch {}
  let query = supabase.from('push_subscriptions').delete().eq('user_id', user.id);
  if (body.endpoint) query = query.eq('endpoint', String(body.endpoint));
  const { error } = await query;
  if (error) return Response.json({ ok: false, message: 'Cihaz bildirimi kapatılamadı.' }, { status: 500 });
  return Response.json({ ok: true });
}
