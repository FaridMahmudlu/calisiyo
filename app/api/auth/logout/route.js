import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return Response.json(
      { ok: false, message: 'Çıkış yapılamadı. Lütfen tekrar deneyin.' },
      { status: 400 }
    );
  }
  return Response.json({ ok: true });
}
