import { createServerClient } from '@supabase/ssr';
import { createClient as createTokenClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

const BEARER_PATTERN = /^Bearer\s+([A-Za-z0-9._-]{20,4096})$/;

// Native mobile clients authenticate API routes with their Supabase access
// token instead of cookies. Browsers never attach this header implicitly, so
// it does not widen the CSRF surface of cookie-authenticated web requests.
function createBearerClient(accessToken) {
  const client = createTokenClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    }
  );
  const getUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (jwt) => getUser(jwt ?? accessToken);
  return client;
}

export async function createClient() {
  const headerStore = await headers();
  const bearer = BEARER_PATTERN.exec(headerStore.get('authorization') || '');
  if (bearer) return createBearerClient(bearer[1]);

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
