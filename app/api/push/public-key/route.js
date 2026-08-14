export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();
  if (!publicKey) return Response.json({ ok: false, message: 'Cihaz bildirimleri henüz yapılandırılmadı.' }, { status: 503 });
  return Response.json({ ok: true, publicKey });
}
