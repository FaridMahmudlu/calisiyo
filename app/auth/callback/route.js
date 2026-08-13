import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_DESTINATIONS = new Set([
  '/dashboard',
  '/dashboard/abonelik',
  '/profilini-tamamla',
  '/sifre-yenile',
]);

function safeNextPath(value, origin) {
  if (!value || /[\\\u0000-\u001f\u007f]/.test(value)) return '/dashboard';

  try {
    const resolved = new URL(value, origin);
    if (resolved.origin !== origin || !ALLOWED_DESTINATIONS.has(resolved.pathname)) {
      return '/dashboard';
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return '/dashboard';
  }
}

function canonicalOrigin(requestUrl) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || requestUrl.origin;
  return new URL(configuredUrl).origin;
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const origin = canonicalOrigin(url);
  const next = safeNextPath(url.searchParams.get('next'), origin);

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

      return NextResponse.redirect(new URL(destination, origin));
    }
  }

  return NextResponse.redirect(new URL('/auth/hata', origin));
}
