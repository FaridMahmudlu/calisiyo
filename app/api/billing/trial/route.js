import { getBillingVariant } from '@/lib/billing/plans';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Ücretsiz deneme için giriş yapmalısın.' }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch {}
  const plan = getBillingVariant(String(body.planCode || ''));
  if (!plan) return Response.json({ ok: false, message: 'Geçerli bir sınav yılı seçmelisin.' }, { status: 400 });
  const { data, error } = await supabase.rpc('start_plus_trial', { p_plan_code: plan.code });
  if (error) return Response.json({ ok: false, message: error.message }, { status: 400 });
  return Response.json({ ok: true, trial: data });
}
