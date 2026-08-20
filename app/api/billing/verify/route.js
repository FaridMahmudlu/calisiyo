import { getBillingReadiness } from '@/lib/billing/config';
import { reconcileShopierOrder } from '@/lib/billing/shopier-service';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 });
  if (!getBillingReadiness().ready) {
    return Response.json({ ok: false, message: 'Ödeme doğrulaması henüz kullanıma açık değil.' }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const orderId = String(body.orderId || '');
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return Response.json({ ok: false, message: 'Geçersiz sipariş.' }, { status: 400 });
  }

  const { data: order, error } = await supabase
    .from('billing_orders')
    .select('id,status,payment_provider')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !order) return Response.json({ ok: false, message: 'Sipariş bulunamadı.' }, { status: 404 });
  if (order.payment_provider !== 'shopier') {
    return Response.json({ ok: false, message: 'Bu eski sipariş otomatik doğrulamaya uygun değil.' }, { status: 409 });
  }
  if (order.status === 'approved') {
    return Response.json({ ok: true, status: 'approved', message: 'Ödemen daha önce doğrulandı.' });
  }
  if (!['payment_link_ready', 'awaiting_review'].includes(order.status)) {
    return Response.json({ ok: false, message: 'Bu sipariş doğrulama için uygun değil.' }, { status: 409 });
  }

  try {
    const result = await reconcileShopierOrder(orderId);
    if (result.outcome === 'approved') {
      return Response.json({ ok: true, status: 'approved', message: 'Ödemen doğrulandı ve Plus erişimin etkinleştirildi.' });
    }
    if (result.outcome === 'review_required') {
      return Response.json({ ok: true, status: 'review', message: 'Ödemen güvenli inceleme sırasına alındı.' });
    }
    return Response.json({
      ok: true,
      status: 'pending',
      message: 'Shopier ödemeyi henüz eşleştirmedi. Birkaç dakika sonra yeniden kontrol edebilirsin.',
    });
  } catch (verificationError) {
    console.error('Shopier reconciliation failed', { code: verificationError?.code || 'provider_unavailable' });
    return Response.json({
      ok: false,
      message: 'Ödeme şu anda doğrulanamadı. Siparişin korunuyor; lütfen biraz sonra tekrar dene.',
    }, { status: 502 });
  }
}
