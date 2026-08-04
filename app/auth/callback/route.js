import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      let destination = next;

      if (user) {
        const metadata = user.user_metadata || {};
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from('profiles').upsert({
            id: user.id,
            full_name: String(metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Öğrenci').trim(),
            alan_secimi: ['sayisal', 'esit_agirlik', 'sozel', 'dil'].includes(metadata.alan_secimi)
              ? metadata.alan_secimi
              : 'sayisal',
          }, { onConflict: 'id' });
        }

        if (!metadata.alan_secimi) destination = '/profilini-tamamla';
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
      const origin = forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : url.origin;
      return NextResponse.redirect(new URL(destination, origin));
    }
  }

  return NextResponse.redirect(new URL('/auth/hata', url.origin));
}
