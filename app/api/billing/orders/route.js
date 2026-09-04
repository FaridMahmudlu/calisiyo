import { randomBytes } from 'node:crypto';
import { createLegalSnapshot } from '@/lib/billing/legal';
import { getBillingReadiness } from '@/lib/billing/config';
import { shopierProductForPlan } from '@/lib/billing/providers/shopier';
import { BILLING_PERIODS, getBillingVariant, LEGAL_DOCUMENT_VERSIONS } from '@/lib/billing/plans';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { producerDiscountMinor } from '@/lib/billing/content-producer.mjs';

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

  const admin = createAdminClient();
  const { data: creatorContext, error: creatorContextError } = await admin
    .rpc('service_content_producer_checkout_context', { p_user_id: user.id });
  if (creatorContextError) {
    console.error('Creator checkout context failed', { feature: 'billing', stage: 'creator_context', errorCode: creatorContextError.code || 'unknown' });
    return Response.json({ ok: false, message: 'Ödeme bilgilerin şu anda güvenle doğrulanamadı. Kartından ödeme alınmadı.' }, { status: 502 });
  }
  const pricingSource = creatorContext?.attributed ? 'signup_creator_code' : 'standard';
  const readiness = getBillingReadiness();
  if (creatorContext?.attributed && (!creatorContext?.eligible || !readiness.creatorDiscountCheckoutReady)) {
    return Response.json({
      ok: false,
      code: 'creator_discount_not_ready',
      message: 'İçerik üretici indirimin şu anda hazırlanıyor. Kartından ödeme alınmadı; biraz sonra tekrar deneyebilirsin.',
    }, { status: 503 });
  }
  if (!creatorContext?.attributed && !readiness.standardCheckoutReady) {
    return Response.json({
      ok: false,
      code: 'checkout_not_ready',
      message: 'Ücretli paket satışı kısa süre içinde açılacak. Ücretsiz planı kullanmaya devam edebilirsin.',
    }, { status: 503 });
  }

  const product = shopierProductForPlan(plan.code, pricingSource);
  if (!product) {
    return Response.json({ ok: false, code: 'checkout_not_ready', message: 'Bu paket henüz satışa hazır değil.' }, { status: 503 });
  }
  const listAmountMinor = Math.round(plan.price * 100);
  const discountAmountMinor = pricingSource === 'signup_creator_code'
    ? producerDiscountMinor(listAmountMinor)
    : 0;
  const discountAmount = discountAmountMinor / 100;
  const payableAmount = (listAmountMinor - discountAmountMinor) / 100;
  const number = orderNumber();
  const { hash } = createLegalSnapshot({
    planCode: plan.code,
    planName: `calisiyo plus · ${plan.label}`,
    billingPeriod,
    amount: payableAmount,
    orderNumber: number,
    pricing: {
      listAmount: plan.price,
      discountPercent: pricingSource === 'signup_creator_code' ? 20 : 0,
      discountAmount,
      payableAmount,
      source: pricingSource,
      ...(pricingSource === 'signup_creator_code' ? { code: creatorContext.code } : {}),
    },
  });

  try {
    const { data: order, error } = await admin.rpc('create_shopier_billing_order_v2', {
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
      p_pricing_source: pricingSource,
      p_creator_signup_attribution_id: pricingSource === 'signup_creator_code' ? creatorContext.attributionId : null,
      p_expected_paid_amount: payableAmount,
      p_expected_discount_amount: discountAmount,
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
