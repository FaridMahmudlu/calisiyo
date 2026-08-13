import { timingSafeEqual } from 'node:crypto';
import { getBillingReadiness } from '@/lib/billing/config';
import { getPaymentLinkDetails } from '@/lib/billing/iyzico';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function sameText(left, right) {
  const a = Buffer.from(String(left ?? ''), 'utf8');
  const b = Buffer.from(String(right ?? ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

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

  const { data: order, error: orderError } = await supabase
    .from('billing_orders')
    .select('id,user_id,status,amount,currency,iyzico_conversation_id,iyzico_link_token')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (orderError || !order) return Response.json({ ok: false, message: 'Sipariş bulunamadı.' }, { status: 404 });
  if (order.status === 'approved') return Response.json({ ok: true, status: 'approved' });
  if (!['payment_link_ready', 'awaiting_review'].includes(order.status) || !order.iyzico_link_token) {
    return Response.json({ ok: false, message: 'Bu sipariş doğrulama için uygun değil.' }, { status: 409 });
  }

  try {
    const details = await getPaymentLinkDetails(order.iyzico_link_token, order.iyzico_conversation_id);
    const sold = Number(details?.soldCount || 0);
    const providerPrice = Number(details?.price || 0);
    const matches = sameText(details?.conversationId, order.iyzico_conversation_id)
      && sameText(details?.currencyCode, order.currency)
      && Math.abs(providerPrice - Number(order.amount)) < 0.001
      && sameText(details?.token, order.iyzico_link_token);

    if (!matches) {
      console.error('iyzico Link verification mismatch', { orderId });
      return Response.json({ ok: false, message: 'Ödeme bilgileri siparişle eşleşmedi. Destek ekibi inceleyecek.' }, { status: 409 });
    }
    if (sold < 1) {
      if (order.status === 'payment_link_ready') await supabase.rpc('claim_billing_payment', { p_order_id: order.id });
      return Response.json({
        ok: true,
        status: 'pending',
        message: 'Ödeme henüz İyzico tarafından kesinleşmedi. Birkaç dakika sonra yeniden kontrol et.',
      });
    }

    const admin = createAdminClient();
    const reference = `iyzilink:${order.iyzico_link_token}:${sold}`;
    const { data, error } = await admin.rpc('provider_confirm_billing_order', {
      p_order_id: order.id,
      p_payment_reference: reference,
      p_provider_payload: {
        provider: 'iyzico_link',
        token: order.iyzico_link_token,
        soldCount: sold,
        productStatus: details?.productStatus || null,
        systemTime: details?.systemTime || null,
      },
    });
    if (error) throw error;
    return Response.json({ ok: true, status: 'approved', subscription: data });
  } catch (error) {
    console.error('iyzico Link verification failed', { code: error?.code, name: error?.name });
    return Response.json({
      ok: false,
      message: 'Ödeme şu anda doğrulanamadı. Siparişin korunuyor; lütfen biraz sonra tekrar dene.',
    }, { status: 502 });
  }
}
