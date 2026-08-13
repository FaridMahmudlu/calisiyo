import { createClient } from '@/lib/supabase/server';
import { getBillingReadiness } from '@/lib/billing/config';
import { PUBLIC_PLANS } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const readiness = getBillingReadiness();
  let currentPlan = null;
  let orders = [];

  if (user) {
    const [{ data: plan }, { data: orderRows, error: orderError }] = await Promise.all([
      supabase.rpc('current_plan_details'),
      supabase
        .from('billing_orders')
        .select('id,order_number,plan_code,billing_period,amount,currency,status,iyzico_link_url,payment_claimed_at,verified_at,created_at,decision_note')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    currentPlan = plan || null;
    if (!orderError) orders = orderRows || [];
  }

  return Response.json({
    ok: true,
    authenticated: Boolean(user),
    checkoutEnabled: readiness.ready,
    checkoutMessage: readiness.ready
      ? 'Güvenli ödeme bağlantısı hazır.'
      : 'Ücretli paket satışı kısa süre içinde açılacak.',
    environment: readiness.environment,
    plans: PUBLIC_PLANS,
    currentPlan,
    orders,
  });
}
