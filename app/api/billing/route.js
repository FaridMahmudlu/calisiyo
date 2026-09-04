import { createClient } from '@/lib/supabase/server';
import { getBillingReadiness } from '@/lib/billing/config';
import { PUBLIC_PLANS } from '@/lib/billing/plans';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const readiness = getBillingReadiness();
  let currentPlan = null;
  let orders = [];
  let creatorDiscount = null;

  if (user) {
    const admin = createAdminClient();
    const [{ data: plan }, { data: orderRows, error: orderError }, { data: creatorContext, error: creatorError }] = await Promise.all([
      supabase.rpc('current_plan_details'),
      supabase
        .from('billing_orders')
        .select('id,order_number,plan_code,billing_period,amount,list_amount,paid_amount,verified_discount_amount,currency,status,payment_provider,provider_checkout_url,provider_status,payment_claimed_at,verified_at,created_at,decision_note,pricing_source,expected_paid_amount,expected_discount_amount')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      admin.rpc('service_content_producer_checkout_context', { p_user_id: user.id }),
    ]);
    currentPlan = plan || null;
    if (!orderError) {
      orders = (orderRows || []).map(({ provider_checkout_url: paymentUrl, ...order }) => ({ ...order, paymentUrl }));
    }
    if (!creatorError && creatorContext?.attributed) {
      creatorDiscount = {
        eligible: Boolean(creatorContext.eligible && readiness.creatorDiscountCheckoutReady),
        percent: 20,
        code: creatorContext.code,
        reason: creatorContext.eligible ? (readiness.creatorDiscountCheckoutReady ? null : 'checkout_not_ready') : creatorContext.reason,
        plans: Object.fromEntries(PUBLIC_PLANS[1].variants.map((variant) => {
          const discountAmount = Math.round(variant.price * 20) / 100;
          return [variant.code, { listPrice: variant.price, discountAmount, finalPrice: variant.price - discountAmount }];
        })),
      };
    }
  }

  const checkoutEnabled = creatorDiscount
    ? creatorDiscount.eligible
    : readiness.standardCheckoutReady;

  return Response.json({
    ok: true,
    authenticated: Boolean(user),
    checkoutEnabled,
    checkoutMessage: checkoutEnabled
      ? 'Shopier üzerinden güvenli ödeme hazır.'
      : creatorDiscount
        ? 'İçerik üretici indirimin şu anda hazırlanıyor.'
        : 'Ücretli paket satışı kısa süre içinde açılacak.',
    environment: readiness.environment,
    plans: PUBLIC_PLANS,
    currentPlan,
    orders,
    creatorDiscount,
  });
}
