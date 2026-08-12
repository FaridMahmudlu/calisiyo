import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function updateSession(request) {
  // Never refresh an access token while the logout response is clearing it.
  // A concurrent refresh can otherwise re-issue the cookie after sign-out.
  if (request.nextUrl.pathname === '/api/auth/logout') {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Define route categories
  const isAuthPage =
    pathname.startsWith('/giris') ||
    pathname.startsWith('/kayit');
  const isAdminPage = pathname.startsWith('/admin');
  const isSuspendedPage = pathname.startsWith('/hesap-askida');
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    isAdminPage ||
    pathname.startsWith('/profilini-tamamla') ||
    pathname.startsWith('/sifre-yenile');

  // Redirect unauthenticated users from protected routes
  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/giris';
    return NextResponse.redirect(url);
  }

  let accountStatus = null;
  if (user && (isProtectedPage || isAuthPage || isSuspendedPage)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_status')
      .eq('id', user.id)
      .maybeSingle();
    accountStatus = profile?.account_status || 'active';
  }

  if (user && accountStatus === 'suspended' && !isSuspendedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/hesap-askida';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user && accountStatus !== 'suspended' && isSuspendedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (user && isAdminPage) {
    const { data: isAdmin } = await supabase.rpc('is_current_user_admin');
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
