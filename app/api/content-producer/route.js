import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 });
  const { data, error } = await supabase.rpc('current_content_producer_summary');
  if (error) {
    console.error('Content producer summary failed', { code: error.code });
    return Response.json({ ok: false, message: 'Üretici bilgilerin şu anda yüklenemedi.' }, { status: 502 });
  }
  return Response.json({ ok: true, producer: data });
}
