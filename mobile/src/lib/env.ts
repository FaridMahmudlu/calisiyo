function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} tanımlı değil. mobile/.env.local veya EAS ortam değişkenlerini kontrol et.`);
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  apiUrl: (process.env.EXPO_PUBLIC_API_URL || 'https://calisiyo.com.tr').replace(/\/$/, ''),
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  supportEmail: 'calisiyo.destek@gmail.com',
};

export const webUrl = (path = '/') => `${env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
