import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 });
  const [producerResult, applicationResult] = await Promise.all([
    supabase.rpc('current_content_producer_summary'),
    supabase.rpc('current_content_producer_application'),
  ]);
  if (producerResult.error || applicationResult.error) {
    console.error('Content producer summary failed', {
      producerCode: producerResult.error?.code,
      applicationCode: applicationResult.error?.code,
    });
    return Response.json({ ok: false, message: 'Üretici bilgilerin şu anda yüklenemedi.' }, { status: 502 });
  }
  return Response.json({
    ok: true,
    producer: producerResult.data,
    application: applicationResult.data,
  });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch {}
  const action = String(body.action || 'submit');

  try {
    if (action === 'withdraw') {
      const { data, error } = await supabase.rpc('withdraw_content_producer_application');
      if (error) throw error;
      return Response.json({ ok: true, application: data, message: 'Başvurun geri çekildi.' });
    }
    if (action !== 'submit') {
      return Response.json({ ok: false, message: 'Geçersiz işlem.' }, { status: 400 });
    }

    const audienceSize = Number(body.audienceSize);
    if (!Number.isSafeInteger(audienceSize)) {
      return Response.json({ ok: false, message: 'Geçerli bir takipçi/abone sayısı girmelisin.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('submit_content_producer_application', {
      p_platform: String(body.platform || ''),
      p_profile_url: String(body.profileUrl || ''),
      p_audience_size: audienceSize,
      p_content_focus: String(body.contentFocus || ''),
      p_motivation: String(body.motivation || ''),
      p_preferred_plan_code: String(body.preferredPlanCode || ''),
    });
    if (error) throw error;
    return Response.json({
      ok: true,
      application: data,
      message: 'Başvurun alındı. İnceleme sonucunu bu sayfadan ve bildirimlerinden takip edebilirsin.',
    });
  } catch (error) {
    console.error('Content producer application action failed', { action, code: error?.code || 'unknown' });
    const messages = {
      '42501': 'Başvuru için aktif bir hesapla giriş yapmalısın.',
      '22023': error?.message?.includes('zaten')
        ? 'Hesabın zaten İçerik Üretici Programı kapsamında.'
        : 'Başvuru bilgilerini kontrol edip tekrar dene.',
      'P0002': 'Bekleyen bir başvuru bulunamadı.',
    };
    return Response.json({ ok: false, message: messages[error?.code] || 'Başvuru işlemi şu anda tamamlanamadı.' }, { status: 400 });
  }
}
