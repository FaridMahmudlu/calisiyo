const PROVIDER_IDS = ['google', 'apple'];

export async function GET() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Provider settings unavailable');
    const settings = await response.json();
    const providers = Object.fromEntries(
      PROVIDER_IDS.map((provider) => [provider, Boolean(settings.external?.[provider])])
    );
    return Response.json({ providers });
  } catch {
    return Response.json({ providers: { google: false, apple: false } });
  }
}
