import { validateContentProducerSignupCode } from '@/lib/auth/content-producer-signup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const invalid = () => Response.json({
  ok: true,
  valid: false,
  message: 'Bu kod geçerli değil veya şu anda kullanılamıyor.',
}, { headers: { 'Cache-Control': 'no-store' } });

export async function POST(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 2048) return invalid();

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return invalid();
    body = JSON.parse(raw);
  } catch {
    return invalid();
  }
  const code = typeof body?.code === 'string' ? body.code : '';
  if (code.length > 64 || code.trim().length < 4) return invalid();

  try {
    const result = await validateContentProducerSignupCode(code);
    return Response.json({
      ok: true,
      valid: true,
      code: result.code,
      discountPercent: result.discountPercent,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (!['P0002', '22023'].includes(String(error?.code || ''))) {
      console.error('Creator signup code validation failed', {
        feature: 'creator_signup_attribution', stage: 'validate', errorCode: error?.code || 'unknown',
      });
    }
    return invalid();
  }
}
