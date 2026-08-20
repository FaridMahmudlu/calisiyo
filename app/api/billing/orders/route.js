import { randomBytes } from 'node:crypto';
import { createLegalSnapshot } from '@/lib/billing/legal';
import { getBillingReadiness } from '@/lib/billing/config';
import { shopierProductForPlan } from '@/lib/billing/providers/shopier';
import { BILLING_PERIODS, getBillingVariant, LEGAL_DOCUMENT_VERSIONS } from '@/lib/billing/plans';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function unauthorized() {
  return Response.json({ ok: false, message: 'Ödeme için önce giriş yapmalısın.' }, { status: 401 });
}

function orderNumber() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `CAL-${byType.year}${byType.month}${byType.day}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  if (!getBillingReadiness().ready) {
    return Response.json({
      ok: false,
      code: 'checkout_not_ready',
      message: 'Ücretli paket satışı kısa süre içinde açılacak. Ücretsiz planı kullanmaya devam edebilirsin.',
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

  const product = shopierProductForPlan(plan.code);
  if (!product) {
    return Response.json({ ok: false, code: 'checkout_not_ready', message: 'Bu paket henüz satışa hazır değil.' }, { status: 503 });
  }
  const number = orderNumber();
  const { hash } = createLegalSnapshot({
    planCode: plan.code,
    planName: `calisiyo plus · ${plan.label}`,
    billingPeriod,
    amount: plan.price,
    orderNumber: number,
  });

  try {
    const admin = createAdminClient();
    const { data: order, error } = await admin.rpc('create_shopier_billing_order', {
      p_user_id: user.id,
      p_order_number: number,
      p_plan_code: plan.code,
      p_billing_period: billingPeriod,
      p_expected_product_id: product.productId,
      p_checkout_url: product.checkoutUrl,
      p_legal_versions: LEGAL_DOCUMENT_VERSIONS,
      p_legal_snapshot_hash: hash,
      p_immediate_service_consent: true,
      p_adult_or_guardian_confirmed: true,
    });
    if (error || !order?.id || !order?.paymentUrl) throw error || new Error('order_not_created');
    return Response.json({ ok: true, order }, { status: order.reused ? 200 : 201 });
  } catch (error) {
    console.error('Shopier billing order creation failed', { code: error?.code || 'unknown' });
    return Response.json({
      ok: false,
      message: 'Sipariş şu anda oluşturulamadı. Kartından ödeme alınmadı; lütfen tekrar dene.',
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
  if (error) return Response.json({ ok: false, message: 'Sipariş iptal edilemedi.' }, { status: 400 });
  return Response.json({ ok: true, order: data });
}
