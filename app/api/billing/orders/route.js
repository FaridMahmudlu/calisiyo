import { createLegalSnapshot } from '@/lib/billing/legal';
import { getBillingReadiness } from '@/lib/billing/config';
import { BILLING_PERIODS, getBillingVariant, LEGAL_DOCUMENT_VERSIONS } from '@/lib/billing/plans';
import { createOrderPaymentLink, deletePaymentLink } from '@/lib/billing/iyzico';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function unauthorized() {
  return Response.json({ ok: false, message: 'Ödeme için önce giriş yapmalısın.' }, { status: 401 });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const readiness = getBillingReadiness();
  if (!readiness.ready) {
    return Response.json({
      ok: false,
      code: 'checkout_not_ready',
      message: 'Ücretli paket satışı henüz açılmadı. Ücretsiz planı kullanmaya devam edebilirsin.',
    }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const plan = getBillingVariant(String(body.planCode || ''));
  const billingPeriod = String(body.billingPeriod || '');
  if (!plan || plan.period !== billingPeriod || !BILLING_PERIODS[billingPeriod]) {
    return Response.json({ ok: false, message: 'Geçerli bir paket ve dönem seçmelisin.' }, { status: 400 });
  }
  if (body.acceptImmediateService !== true || body.confirmAdultOrGuardian !== true) {
    return Response.json({ ok: false, message: 'Zorunlu sözleşme onaylarını tamamlamalısın.' }, { status: 400 });
  }

  const amount = plan.price;
  const { hash } = createLegalSnapshot({
    planCode: plan.code,
    planName: `calisiyo plus · ${plan.label}`,
    billingPeriod,
    amount,
    orderNumber: null,
  });

  const { data: order, error: orderError } = await supabase.rpc('create_billing_order', {
    p_plan_code: plan.code,
    p_billing_period: billingPeriod,
    p_legal_versions: LEGAL_DOCUMENT_VERSIONS,
    p_legal_snapshot_hash: hash,
    p_immediate_service_consent: true,
    p_adult_or_guardian_confirmed: true,
  });
  if (orderError || !order?.id) {
    console.error('Billing order creation failed', { code: orderError?.code });
    return Response.json({ ok: false, message: orderError?.message || 'Sipariş oluşturulamadı.' }, { status: 400 });
  }

  let link = null;
  try {
    link = await createOrderPaymentLink({
      orderNumber: order.orderNumber,
      planName: order.planName,
      periodLabel: BILLING_PERIODS[billingPeriod].label,
      amount: order.amount,
    });
    const admin = createAdminClient();
    const { data: attached, error: attachError } = await admin.rpc('attach_billing_payment_link', {
      p_order_id: order.id,
      p_token: link.token,
      p_url: link.url,
      p_link_status: 'ACTIVE',
    });
    if (attachError || !attached?.paymentUrl) throw attachError || new Error('Ödeme bağlantısı kaydedilemedi.');
    return Response.json({
      ok: true,
      order: { ...order, status: attached.status, paymentUrl: attached.paymentUrl },
    }, { status: 201 });
  } catch (error) {
    console.error('iyzico Link creation failed', { code: error?.code, name: error?.name });
    if (link?.token) {
      await deletePaymentLink(link.token, order.orderNumber).catch(() => null);
    }
    await supabase.rpc('cancel_billing_order', { p_order_id: order.id });
    return Response.json({
      ok: false,
      message: 'Ödeme bağlantısı şu anda oluşturulamadı. Kartından ödeme alınmadı; lütfen tekrar dene.',
    }, { status: 502 });
  }
}

export async function DELETE(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();
  let body;
  try { body = await request.json(); } catch { body = {}; }
  if (!/^[0-9a-f-]{36}$/i.test(String(body.orderId || ''))) {
    return Response.json({ ok: false, message: 'Geçersiz sipariş.' }, { status: 400 });
  }
  const { data, error } = await supabase.rpc('cancel_billing_order', { p_order_id: body.orderId });
  if (error) return Response.json({ ok: false, message: error.message }, { status: 400 });
  return Response.json({ ok: true, order: data });
}
