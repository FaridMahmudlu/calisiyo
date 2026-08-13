-- Serialize quota-sensitive writes per account. Count-then-insert checks are
-- otherwise raceable because concurrent transactions can observe the same
-- pre-insert count. Transaction-scoped advisory locks automatically release
-- on commit/rollback and do not serialize unrelated users.
create or replace function public.lock_current_user_mutation(p_scope text default 'plan')
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
begin
  if viewer is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:' || coalesce(p_scope, 'plan') || ':' || viewer::text, 0)
  );
  return viewer;
end;
$$;

create or replace function public.provider_confirm_billing_order(
  p_order_id uuid,
  p_payment_reference text,
  p_provider_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.billing_orders%rowtype;
  existing_subscription public.user_subscriptions%rowtype;
  period_start timestamptz;
  period_end timestamptz;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu doğrulaması gerekli.';
  end if;
  if length(trim(coalesce(p_payment_reference, ''))) < 8
     or jsonb_typeof(coalesce(p_provider_payload, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'Ödeme doğrulama kaydı geçersiz.';
  end if;

  select * into order_row
  from public.billing_orders
  where id = p_order_id
    and status in ('payment_link_ready', 'awaiting_review')
  for update;
  if order_row.id is null then
    raise exception using errcode = 'P0002', message = 'Doğrulanabilir sipariş bulunamadı.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:billing:' || order_row.user_id::text, 0)
  );

  if exists (
    select 1 from public.billing_orders
    where payment_reference = trim(p_payment_reference)
      and status in ('approved', 'refunded')
      and id <> order_row.id
  ) then
    raise exception using errcode = '23505', message = 'Bu ödeme daha önce kullanılmış.';
  end if;

  select * into existing_subscription
  from public.user_subscriptions
  where user_id = order_row.user_id
  for update;

  if existing_subscription.id is not null
     and existing_subscription.status = 'active'
     and existing_subscription.current_period_end > now() then
    period_start := existing_subscription.current_period_start;
    period_end := existing_subscription.current_period_end
      + case when order_row.billing_period = 'annual' then interval '365 days' else interval '30 days' end;
  else
    period_start := now();
    period_end := period_start
      + case when order_row.billing_period = 'annual' then interval '365 days' else interval '30 days' end;
  end if;

  insert into public.user_subscriptions (
    user_id, plan_code, status, current_period_start, current_period_end, source_order_id, cancel_at_period_end
  ) values (
    order_row.user_id, order_row.plan_code, 'active', period_start, period_end, order_row.id, true
  )
  on conflict (user_id) do update set
    plan_code = excluded.plan_code,
    status = 'active',
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    source_order_id = excluded.source_order_id,
    cancel_at_period_end = true,
    updated_at = now();

  update public.billing_orders
  set status = 'approved', payment_reference = trim(p_payment_reference),
      verified_at = now(), decision_note = 'İyzico Link API ile otomatik doğrulandı.', updated_at = now()
  where id = order_row.id;

  insert into public.billing_events (order_id, user_id, event_type, payload)
  values (
    order_row.id, order_row.user_id, 'provider_confirmed',
    coalesce(p_provider_payload, '{}'::jsonb)
      || jsonb_build_object('paymentReference', trim(p_payment_reference), 'periodStart', period_start, 'periodEnd', period_end)
  );

  insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
  select order_row.user_id, 'success', 'Planın etkinleştirildi',
    plan.name || ' planın ' || to_char(period_end at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ' tarihine kadar kullanıma açıldı.',
    '/dashboard/abonelik', 'billing-approved-' || order_row.id::text
  from public.billing_plans as plan where plan.code = order_row.plan_code
  on conflict (user_id, dedupe_key) do nothing;

  return jsonb_build_object(
    'id', order_row.id,
    'status', 'approved',
    'planCode', order_row.plan_code,
    'periodStart', period_start,
    'periodEnd', period_end
  );
end;
$$;

revoke all on function public.admin_review_billing_order(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.provider_confirm_billing_order(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_review_billing_order(uuid, text, text, text) to authenticated;
grant execute on function public.provider_confirm_billing_order(uuid, text, jsonb) to service_role;

revoke all on function public.lock_current_user_mutation(text) from public, anon, authenticated;
grant execute on function public.lock_current_user_mutation(text) to authenticated, service_role;

-- Direct PostgREST inserts reach these RLS helpers without is_active_user().
-- Acquire the same account lock before evaluating each count.
create or replace function public.plan_entitlement_limit(p_key text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.lock_current_user_mutation('plan');
  return greatest(
    0,
    coalesce((public.current_plan_details() -> 'entitlements' ->> p_key)::integer, 0)
  );
end;
$$;

revoke all on function public.plan_entitlement_limit(text) from public, anon, authenticated;
grant execute on function public.plan_entitlement_limit(text) to authenticated;

create or replace function public.create_billing_order(
  p_plan_code text,
  p_billing_period text,
  p_legal_versions jsonb,
  p_legal_snapshot_hash text,
  p_immediate_service_consent boolean,
  p_adult_or_guardian_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  selected_plan public.billing_plans%rowtype;
  created_order public.billing_orders%rowtype;
  chosen_amount numeric(10,2);
  generated_order_number text;
  legal_key text;
  legal_version text;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
  end if;
  perform public.lock_current_user_mutation('plan');
  if p_plan_code not in ('odak', 'zirve') or p_billing_period not in ('monthly', 'annual') then
    raise exception using errcode = '22023', message = 'Geçersiz plan veya dönem.';
  end if;
  if not coalesce(p_immediate_service_consent, false) or not coalesce(p_adult_or_guardian_confirmed, false) then
    raise exception using errcode = '22023', message = 'Zorunlu onaylar tamamlanmalıdır.';
  end if;
  if jsonb_typeof(p_legal_versions) <> 'object'
     or not (p_legal_versions ?& array['on_bilgilendirme', 'mesafeli_satis', 'iptal_iade', 'kvkk'])
     or length(coalesce(p_legal_snapshot_hash, '')) not between 32 and 128 then
    raise exception using errcode = '22023', message = 'Yasal belge kaydı geçersiz.';
  end if;
  if (
    select count(*) from public.billing_orders
    where user_id = viewer
      and created_at > now() - interval '1 hour'
      and status in ('created', 'payment_link_ready', 'awaiting_review')
  ) >= 3 then
    raise exception using errcode = '42901', message = 'Çok fazla açık sipariş var. Lütfen daha sonra tekrar deneyin.';
  end if;

  select * into selected_plan
  from public.billing_plans
  where code = p_plan_code and is_active
  limit 1;
  if selected_plan.code is null then
    raise exception using errcode = 'P0002', message = 'Plan satışa açık değil.';
  end if;

  chosen_amount := case when p_billing_period = 'annual' then selected_plan.annual_price else selected_plan.monthly_price end;
  generated_order_number := 'CAL-' || to_char(now() at time zone 'Europe/Istanbul', 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.billing_orders (
    order_number, user_id, plan_code, billing_period, amount, currency,
    iyzico_conversation_id, legal_versions, legal_snapshot_hash,
    immediate_service_consent, adult_or_guardian_confirmed
  ) values (
    generated_order_number, viewer, selected_plan.code, p_billing_period, chosen_amount, selected_plan.currency,
    generated_order_number, p_legal_versions, p_legal_snapshot_hash,
    true, true
  ) returning * into created_order;

  for legal_key, legal_version in select key, value from jsonb_each_text(p_legal_versions)
  loop
    insert into public.billing_legal_acceptances (
      order_id, user_id, document_key, document_version, snapshot_hash
    ) values (
      created_order.id, viewer, legal_key, legal_version, p_legal_snapshot_hash
    );
  end loop;

  insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
  values (
    created_order.id, viewer, 'order_created',
    jsonb_build_object('plan', selected_plan.code, 'period', p_billing_period, 'amount', chosen_amount, 'currency', selected_plan.currency),
    viewer
  );

  return jsonb_build_object(
    'id', created_order.id,
    'orderNumber', created_order.order_number,
    'conversationId', created_order.iyzico_conversation_id,
    'planCode', created_order.plan_code,
    'planName', selected_plan.name,
    'billingPeriod', created_order.billing_period,
    'amount', created_order.amount,
    'currency', created_order.currency,
    'status', created_order.status
  );
end;
$$;

revoke all on function public.create_billing_order(text, text, jsonb, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.create_billing_order(text, text, jsonb, text, boolean, boolean) to authenticated;

-- Billing approvals lock by purchased account before reading/upserting the
-- subscription. This is necessary even when no subscription row exists yet.
create or replace function public.admin_review_billing_order(
  p_order_id uuid,
  p_decision text,
  p_payment_reference text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  order_row public.billing_orders%rowtype;
  existing_subscription public.user_subscriptions%rowtype;
  period_start timestamptz;
  period_end timestamptz;
begin
  perform public.assert_admin('admin');
  if p_decision not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'Geçersiz inceleme kararı.';
  end if;
  if p_decision = 'approve' and length(trim(coalesce(p_payment_reference, ''))) < 4 then
    raise exception using errcode = '22023', message = 'İyzico ödeme referansı zorunludur.';
  end if;

  select * into order_row
  from public.billing_orders
  where id = p_order_id and status = 'awaiting_review'
  for update;
  if order_row.id is null then
    raise exception using errcode = 'P0002', message = 'İncelenecek sipariş bulunamadı.';
  end if;

  if p_decision = 'reject' then
    update public.billing_orders
    set status = 'rejected', verified_by = actor, verified_at = now(),
        decision_note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now()
    where id = order_row.id;
    insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
    values (order_row.id, order_row.user_id, 'order_rejected', jsonb_build_object('note', nullif(trim(coalesce(p_note, '')), '')), actor);
    return jsonb_build_object('id', order_row.id, 'status', 'rejected');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:billing:' || order_row.user_id::text, 0)
  );

  if exists (
    select 1 from public.billing_orders
    where payment_reference = trim(p_payment_reference)
      and status in ('approved', 'refunded')
      and id <> order_row.id
  ) then
    raise exception using errcode = '23505', message = 'Bu ödeme referansı daha önce kullanılmış.';
  end if;

  select * into existing_subscription
  from public.user_subscriptions
  where user_id = order_row.user_id
  for update;

  if existing_subscription.id is not null
     and existing_subscription.status = 'active'
     and existing_subscription.current_period_end > now() then
    period_start := existing_subscription.current_period_start;
    period_end := existing_subscription.current_period_end
      + case when order_row.billing_period = 'annual' then interval '365 days' else interval '30 days' end;
  else
    period_start := now();
    period_end := period_start
      + case when order_row.billing_period = 'annual' then interval '365 days' else interval '30 days' end;
  end if;

  insert into public.user_subscriptions (
    user_id, plan_code, status, current_period_start, current_period_end, source_order_id, cancel_at_period_end
  ) values (
    order_row.user_id, order_row.plan_code, 'active', period_start, period_end, order_row.id, true
  )
  on conflict (user_id) do update set
    plan_code = excluded.plan_code,
    status = 'active',
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    source_order_id = excluded.source_order_id,
    cancel_at_period_end = true,
    updated_at = now();

  update public.billing_orders
  set status = 'approved', payment_reference = trim(p_payment_reference), verified_by = actor,
      verified_at = now(), decision_note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now()
  where id = order_row.id;

  insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
  values (
    order_row.id, order_row.user_id, 'order_approved',
    jsonb_build_object('paymentReference', trim(p_payment_reference), 'periodStart', period_start, 'periodEnd', period_end), actor
  );

  insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
  select order_row.user_id, 'success', 'Planın etkinleştirildi',
    plan.name || ' planın ' || to_char(period_end at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ' tarihine kadar kullanıma açıldı.',
    '/dashboard/abonelik', 'billing-approved-' || order_row.id::text
  from public.billing_plans as plan where plan.code = order_row.plan_code
  on conflict (user_id, dedupe_key) do nothing;

  return jsonb_build_object('id', order_row.id, 'status', 'approved', 'periodStart', period_start, 'periodEnd', period_end);
end;
$$;
