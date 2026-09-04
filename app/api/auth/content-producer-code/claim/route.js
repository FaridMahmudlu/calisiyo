import { claimContentProducerSignupAttribution } from '@/lib/auth/content-producer-signup';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 });

  let body = {};
  try {
    const raw = await request.text();
    if (raw.length > 2048) throw new Error('body_too_large');
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, message: 'İçerik üretici kodu ilişkilendirilemedi.' }, { status: 400 });
  }

  try {
    const attribution = await claimContentProducerSignupAttribution(user.id, body.claimToken);
    return Response.json({ ok: true, attribution }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Creator signup claim failed', {
      feature: 'creator_signup_attribution', stage: 'claim', errorCode: error?.code || 'unknown',
    });
    return Response.json({ ok: false, message: 'Hesabın oluşturuldu ancak içerik üretici kodu ilişkilendirilemedi.' }, { status: 409 });
  }
}
