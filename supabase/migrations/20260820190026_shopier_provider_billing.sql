-- Provider-neutral Shopier billing upgrade. Historical iyzico columns and
-- migrations remain intact so already-deployed rows stay readable.

alter table public.billing_orders
  add column if not exists payment_provider text,
  add column if not exists customer_email_snapshot text,
  add column if not exists expected_provider_product_id text,
  add column if not exists provider_order_id text,
  add column if not exists provider_checkout_url text,
  add column if not exists provider_status text,
  add column if not exists provider_verified_at timestamptz,
  add column if not exists provider_refund_id text,
  add column if not exists provider_refund_status text,
  add column if not exists provider_refunded_at timestamptz;

update public.billing_orders
set payment_provider = 'iyzico',
    provider_checkout_url = coalesce(provider_checkout_url, iyzico_link_url)
where payment_provider is null
  and (iyzico_link_token is not null or iyzico_link_url is not null);

alter table public.billing_orders
  drop constraint if exists billing_orders_payment_provider_valid;
alter table public.billing_orders
  add constraint billing_orders_payment_provider_valid
  check (payment_provider is null or payment_provider in ('iyzico', 'shopier'));

alter table public.billing_orders
  drop constraint if exists billing_orders_customer_email_snapshot_valid;
alter table public.billing_orders
  add constraint billing_orders_customer_email_snapshot_valid
  check (
    customer_email_snapshot is null
    or (
      char_length(customer_email_snapshot) between 3 and 320
      and customer_email_snapshot = lower(btrim(customer_email_snapshot))
      and customer_email_snapshot ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );

alter table public.billing_orders
  drop constraint if exists billing_orders_provider_checkout_url_valid;
alter table public.billing_orders
  add constraint billing_orders_provider_checkout_url_valid
  check (
    provider_checkout_url is null
    or provider_checkout_url ~ '^https://www\.shopier\.com/[0-9]+/?$'
    or provider_checkout_url ~ '^https://([a-z0-9-]+\.)?iyzi\.link/'
  );

create unique index if not exists billing_orders_provider_order_unique_idx
  on public.billing_orders (payment_provider, provider_order_id)
  where payment_provider is not null and provider_order_id is not null;

create unique index if not exists billing_orders_provider_refund_unique_idx
  on public.billing_orders (payment_provider, provider_refund_id)
  where payment_provider is not null and provider_refund_id is not null;

create index if not exists billing_orders_shopier_match_idx
  on public.billing_orders (
    payment_provider, expected_provider_product_id, customer_email_snapshot, created_at desc
  )
  where payment_provider = 'shopier'
    and status in ('payment_link_ready', 'awaiting_review');

create table if not exists public.billing_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('shopier')),
  provider_event_id text not null,
  event_type text not null check (event_type in ('order.created', 'refund.updated')),
  provider_order_id text,
  provider_account_id text,
  provider_timestamp timestamptz,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'review_required', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  reason_code text,
  last_error_code text,
  processing_started_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_provider_events_review_idx
  on public.billing_provider_events (created_at desc)
  where status in ('review_required', 'failed');
create index if not exists billing_provider_events_order_idx
  on public.billing_provider_events (provider, provider_order_id, created_at desc)
  where provider_order_id is not null;

alter table public.billing_provider_events enable row level security;
revoke all on table public.billing_provider_events from public, anon, authenticated;
grant select, insert, update on table public.billing_provider_events to service_role;

-- A single source of truth for paid-access duration. Callers must serialize
-- the user subscription row before using this helper.
create or replace function public.calculate_purchased_access_period(
  p_user_id uuid,
  p_plan_code text,
  p_purchased_at timestamptz default now()
)
returns table(period_start timestamptz, period_end timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_row public.user_subscriptions%rowtype;
  purchased_at timestamptz := coalesce(p_purchased_at, now());
  configured_2027_end constant timestamptz := timestamptz '2027-08-19 23:59:59+03';
begin
  if p_user_id is null or p_plan_code not in ('plus_2027', 'plus_2028') then
    raise exception using errcode = '22023', message = 'Satın alınan paket bilgisi geçersiz.';
  end if;

  select * into current_row
  from public.user_subscriptions
  where user_id = p_user_id;

  if p_plan_code = 'plus_2027' then
    if configured_2027_end <= purchased_at then
      raise exception using errcode = '22023', message = '2027 YKS paketi satış süresini tamamladı.';
    end if;
    period_start := case
      when current_row.status = 'active' and current_row.current_period_end > purchased_at
        then current_row.current_period_start
      else purchased_at
    end;
    -- Never shorten valid paid access which may have been granted previously.
    period_end := greatest(
      configured_2027_end,
      case when current_row.status = 'active' then current_row.current_period_end else configured_2027_end end
    );
  else
    period_start := case
      when current_row.status = 'active' and current_row.current_period_end > purchased_at
        then current_row.current_period_start
      else purchased_at
    end;
    period_end := greatest(
      case when current_row.status = 'active' then current_row.current_period_end else purchased_at end,
      purchased_at
    ) + interval '6 months';
  end if;

  return next;
end;
$$;

revoke all on function public.calculate_purchased_access_period(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.calculate_purchased_access_period(uuid, text, timestamptz)
  to service_role;

-- Checkout initiation is server-only. The browser never supplies an account
-- id directly to this privileged function.
create or replace function public.create_shopier_billing_order(
  p_user_id uuid,
  p_order_number text,
  p_plan_code text,
  p_billing_period text,
  p_expected_product_id text,
  p_checkout_url text,
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
  selected_plan public.billing_plans%rowtype;
  created_order public.billing_orders%rowtype;
  existing_order public.billing_orders%rowtype;
  normalized_email text;
  legal_key text;
  legal_version text;
begin
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu ödeme işlemi gerekli.';
  end if;
  if p_user_id is null
     or not exists (
       select 1 from public.profiles as profile
       where profile.id = p_user_id
         and (
           profile.account_status = 'active'
           or (
             profile.account_status = 'suspended'
             and profile.suspended_until is not null
             and profile.suspended_until <= clock_timestamp()
           )
         )
     ) then
    raise exception using errcode = '42501', message = 'Aktif kullanıcı gerekli.';
  end if;
  if p_order_number !~ '^CAL-[0-9]{8}-[A-F0-9]{8}$'
     or p_expected_product_id !~ '^[A-Za-z0-9_-]{1,128}$'
     or p_checkout_url !~ '^https://www\.shopier\.com/[0-9]+/?$' then
    raise exception using errcode = '22023', message = 'Shopier sipariş yapılandırması geçersiz.';
  end if;
  if not ((p_plan_code = 'plus_2027' and p_billing_period = 'yks_2027')
    or (p_plan_code = 'plus_2028' and p_billing_period = 'six_months')) then
    raise exception using errcode = '22023', message = 'Geçersiz paket veya dönem.';
  end if;
  if not coalesce(p_immediate_service_consent, false)
     or not coalesce(p_adult_or_guardian_confirmed, false) then
    raise exception using errcode = '22023', message = 'Zorunlu onaylar tamamlanmalıdır.';
  end if;
  if jsonb_typeof(p_legal_versions) <> 'object'
     or not (p_legal_versions ?& array['on_bilgilendirme', 'mesafeli_satis', 'iptal_iade', 'kvkk'])
     or length(coalesce(p_legal_snapshot_hash, '')) not between 32 and 128 then
    raise exception using errcode = '22023', message = 'Yasal belge kaydı geçersiz.';
  end if;

  select lower(btrim(users.email)) into normalized_email
  from auth.users as users where users.id = p_user_id;
  if normalized_email is null
     or char_length(normalized_email) not between 3 and 320
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Hesap e-postası ödeme için uygun değil.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:plan:' || p_user_id::text, 0)
  );

  select * into selected_plan
  from public.billing_plans
  where code = p_plan_code and is_active
  limit 1;
  if selected_plan.code is null or selected_plan.currency <> 'TRY' then
    raise exception using errcode = 'P0002', message = 'Plan satışa açık değil.';
  end if;

  -- Reuse an identical recent checkout so network retries cannot create
  -- multiple ambiguous pending orders for one eventual Shopier purchase.
  select * into existing_order
  from public.billing_orders
  where user_id = p_user_id
    and payment_provider = 'shopier'
    and plan_code = p_plan_code
    and expected_provider_product_id = p_expected_product_id
    and customer_email_snapshot = normalized_email
    and status in ('payment_link_ready', 'awaiting_review')
    and created_at > now() - interval '1 hour'
  order by created_at desc
  limit 1
  for update;

  if existing_order.id is not null then
    return jsonb_build_object(
      'id', existing_order.id,
      'orderNumber', existing_order.order_number,
      'planCode', existing_order.plan_code,
      'planName', selected_plan.name,
      'billingPeriod', existing_order.billing_period,
      'amount', existing_order.amount,
      'currency', existing_order.currency,
      'status', existing_order.status,
      'paymentUrl', existing_order.provider_checkout_url,
      'reused', true
    );
  end if;

  if (
    select count(*) from public.billing_orders
    where user_id = p_user_id
      and created_at > now() - interval '1 hour'
      and status in ('created', 'payment_link_ready', 'awaiting_review')
  ) >= 3 then
    raise exception using errcode = '42901', message = 'Çok fazla açık sipariş var. Lütfen daha sonra tekrar deneyin.';
  end if;

  insert into public.billing_orders (
    order_number, user_id, plan_code, billing_period, amount, currency,
    iyzico_conversation_id, legal_versions, legal_snapshot_hash,
    immediate_service_consent, adult_or_guardian_confirmed,
    payment_provider, customer_email_snapshot, expected_provider_product_id,
    provider_checkout_url, provider_status, status
  ) values (
    p_order_number, p_user_id, selected_plan.code, p_billing_period,
    case when p_billing_period = 'yks_2027' then selected_plan.annual_price else selected_plan.monthly_price end,
    selected_plan.currency, p_order_number, p_legal_versions, p_legal_snapshot_hash,
    true, true, 'shopier', normalized_email, p_expected_product_id,
    p_checkout_url, 'checkout_ready', 'payment_link_ready'
  ) returning * into created_order;

  for legal_key, legal_version in select key, value from jsonb_each_text(p_legal_versions)
  loop
    insert into public.billing_legal_acceptances (
      order_id, user_id, document_key, document_version, snapshot_hash
    ) values (
      created_order.id, p_user_id, legal_key, legal_version, p_legal_snapshot_hash
    );
  end loop;

  insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
  values (
    created_order.id, p_user_id, 'order_created',
    jsonb_build_object(
      'provider', 'shopier', 'plan', selected_plan.code,
      'period', p_billing_period, 'amount', created_order.amount,
      'currency', created_order.currency, 'productId', p_expected_product_id
    ), null
  );

  return jsonb_build_object(
    'id', created_order.id,
    'orderNumber', created_order.order_number,
    'planCode', created_order.plan_code,
    'planName', selected_plan.name,
    'billingPeriod', created_order.billing_period,
    'amount', created_order.amount,
    'currency', created_order.currency,
    'status', created_order.status,
    'paymentUrl', created_order.provider_checkout_url,
    'reused', false
  );
end;
$$;

revoke all on function public.create_shopier_billing_order(
  uuid, text, text, text, text, text, jsonb, text, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.create_shopier_billing_order(
  uuid, text, text, text, text, text, jsonb, text, boolean, boolean
) to service_role;

create or replace function public.claim_shopier_webhook_event(
  p_event_id text,
  p_event_type text,
  p_provider_order_id text,
  p_account_id text,
  p_provider_timestamp timestamptz,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.billing_provider_events%rowtype;
begin
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu webhook işlemi gerekli.';
  end if;
  if p_event_id !~ '^[A-Za-z0-9_-]{1,160}$'
     or p_event_type not in ('order.created', 'refund.updated')
     or p_provider_order_id !~ '^[A-Za-z0-9_-]{1,160}$'
     or jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'Webhook kaydı geçersiz.';
  end if;

  insert into public.billing_provider_events (
    provider, provider_event_id, event_type, provider_order_id,
    provider_account_id, provider_timestamp, payload
  ) values (
    'shopier', p_event_id, p_event_type, p_provider_order_id,
    nullif(left(coalesce(p_account_id, ''), 160), ''), p_provider_timestamp,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (provider, provider_event_id) do nothing;

  select * into event_row
  from public.billing_provider_events
  where provider = 'shopier' and provider_event_id = p_event_id
  for update;

  if event_row.event_type <> p_event_type
     or event_row.provider_order_id <> p_provider_order_id then
    raise exception using errcode = '22023', message = 'Webhook kimliği çakışıyor.';
  end if;

  if event_row.status in ('processed', 'review_required') then
    return jsonb_build_object('claimed', false, 'status', event_row.status, 'id', event_row.id);
  end if;
  if event_row.status = 'processing'
     and event_row.processing_started_at > now() - interval '45 seconds' then
    return jsonb_build_object('claimed', false, 'status', 'processing', 'id', event_row.id);
  end if;

  update public.billing_provider_events
  set status = 'processing', attempts = attempts + 1,
      processing_started_at = now(), last_error_code = null, updated_at = now()
  where id = event_row.id;

  return jsonb_build_object('claimed', true, 'status', 'processing', 'id', event_row.id);
end;
$$;

revoke all on function public.claim_shopier_webhook_event(text, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.claim_shopier_webhook_event(text, text, text, text, timestamptz, jsonb)
  to service_role;

create or replace function public.finish_shopier_webhook_event(
  p_event_id text,
  p_status text,
  p_reason_code text default null,
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed public.billing_provider_events%rowtype;
begin
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu webhook işlemi gerekli.';
  end if;
  if p_status not in ('processed', 'review_required', 'failed') then
    raise exception using errcode = '22023', message = 'Webhook sonuç durumu geçersiz.';
  end if;

  update public.billing_provider_events
  set status = p_status,
      reason_code = nullif(left(coalesce(p_reason_code, ''), 120), ''),
      last_error_code = nullif(left(coalesce(p_error_code, ''), 120), ''),
      processed_at = case when p_status in ('processed', 'review_required') then now() else null end,
      updated_at = now()
  where provider = 'shopier' and provider_event_id = p_event_id
  returning * into changed;

  if changed.id is null then
    raise exception using errcode = 'P0002', message = 'Webhook kaydı bulunamadı.';
  end if;
  return jsonb_build_object('id', changed.id, 'status', changed.status);
end;
$$;

revoke all on function public.finish_shopier_webhook_event(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.finish_shopier_webhook_event(text, text, text, text)
  to service_role;

create or replace function public.mark_billing_order_for_provider_review(
  p_order_id uuid,
  p_provider_order_id text,
  p_provider_status text,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed public.billing_orders%rowtype;
begin
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu ödeme işlemi gerekli.';
  end if;
  update public.billing_orders
  set status = case when status in ('created', 'payment_link_ready') then 'awaiting_review' else status end,
      provider_order_id = coalesce(provider_order_id, nullif(p_provider_order_id, '')),
      provider_status = nullif(left(coalesce(p_provider_status, ''), 120), ''),
      decision_note = 'Shopier otomatik doğrulaması durdu: ' || left(coalesce(p_reason_code, 'unknown'), 120),
      updated_at = now()
  where id = p_order_id and payment_provider = 'shopier'
  returning * into changed;
  if changed.id is null then
    raise exception using errcode = 'P0002', message = 'Sipariş bulunamadı.';
  end if;
  insert into public.billing_events(order_id, user_id, event_type, payload)
  values (
    changed.id, changed.user_id, 'provider_review_required',
    jsonb_build_object(
      'provider', 'shopier', 'providerOrderId', nullif(p_provider_order_id, ''),
      'providerStatus', nullif(p_provider_status, ''), 'reason', left(coalesce(p_reason_code, 'unknown'), 120)
    )
  );
  return jsonb_build_object('id', changed.id, 'status', changed.status);
end;
$$;

revoke all on function public.mark_billing_order_for_provider_review(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.mark_billing_order_for_provider_review(uuid, text, text, text)
  to service_role;

-- Replace the legacy monthly/annual provider confirmation implementation.
-- Provider evidence is checked again against the immutable internal order.
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
  period_start timestamptz;
  period_end timestamptz;
  verified_provider_order_id text := btrim(coalesce(p_provider_payload->>'providerOrderId', ''));
  verified_product_id text := btrim(coalesce(p_provider_payload->>'productId', ''));
  verified_email text := lower(btrim(coalesce(p_provider_payload->>'customerEmail', '')));
  verified_currency text := upper(btrim(coalesce(p_provider_payload->>'currency', '')));
  verified_status text := lower(btrim(coalesce(p_provider_payload->>'paymentStatus', '')));
  verified_amount numeric(10,2);
  verified_quantity integer;
begin
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu doğrulaması gerekli.';
  end if;
  if jsonb_typeof(coalesce(p_provider_payload, '{}'::jsonb)) <> 'object'
     or p_provider_payload->>'provider' <> 'shopier'
     or length(btrim(coalesce(p_payment_reference, ''))) < 8 then
    raise exception using errcode = '22023', message = 'Ödeme doğrulama kaydı geçersiz.';
  end if;
  begin
    verified_amount := (p_provider_payload->>'amount')::numeric(10,2);
    verified_quantity := (p_provider_payload->>'quantity')::integer;
  exception when others then
    raise exception using errcode = '22023', message = 'Provider tutarı veya adedi geçersiz.';
  end;

  select * into order_row
  from public.billing_orders
  where id = p_order_id
    and payment_provider = 'shopier'
    and status in ('payment_link_ready', 'awaiting_review')
  for update;
  if order_row.id is null then
    -- A duplicate delivery for an already approved identical order is safe.
    select * into order_row
    from public.billing_orders
    where id = p_order_id
      and payment_provider = 'shopier'
      and status = 'approved'
      and public.billing_orders.provider_order_id = verified_provider_order_id;
    if order_row.id is not null then
      return jsonb_build_object(
        'id', order_row.id, 'status', 'approved', 'alreadyProcessed', true,
        'planCode', order_row.plan_code
      );
    end if;
    raise exception using errcode = 'P0002', message = 'Doğrulanabilir sipariş bulunamadı.';
  end if;

  if verified_provider_order_id !~ '^[A-Za-z0-9_-]{1,160}$'
     or verified_product_id <> order_row.expected_provider_product_id
     or verified_email <> order_row.customer_email_snapshot
     or verified_currency <> order_row.currency
     or verified_status <> 'paid'
     or verified_quantity <> 1
     or verified_amount <> order_row.amount then
    raise exception using errcode = '22023', message = 'Shopier ödeme kanıtı siparişle eşleşmedi.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:billing:' || order_row.user_id::text, 0)
  );

  if exists (
    select 1 from public.billing_orders as used
    where used.payment_provider = 'shopier'
      and used.provider_order_id = verified_provider_order_id
      and used.id <> order_row.id
  ) or exists (
    select 1 from public.billing_orders as used
    where used.payment_reference = btrim(p_payment_reference)
      and used.status in ('approved', 'refunded')
      and used.id <> order_row.id
  ) then
    raise exception using errcode = '23505', message = 'Bu ödeme daha önce kullanılmış.';
  end if;

  select access.period_start, access.period_end
  into period_start, period_end
  from public.calculate_purchased_access_period(order_row.user_id, order_row.plan_code, now()) as access;

  insert into public.user_subscriptions (
    user_id, plan_code, status, current_period_start, current_period_end,
    source_order_id, cancel_at_period_end, trial_started_at, trial_ends_at
  ) values (
    order_row.user_id, order_row.plan_code, 'active', period_start, period_end,
    order_row.id, true, null, null
  )
  on conflict (user_id) do update set
    plan_code = excluded.plan_code,
    status = 'active',
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    source_order_id = excluded.source_order_id,
    cancel_at_period_end = true,
    trial_started_at = null,
    trial_ends_at = null,
    updated_at = now();

  update public.billing_orders
  set status = 'approved',
      payment_reference = btrim(p_payment_reference),
      provider_order_id = verified_provider_order_id,
      provider_status = verified_status,
      provider_verified_at = now(),
      verified_at = now(),
      decision_note = 'Shopier API ile otomatik doğrulandı.',
      updated_at = now()
  where id = order_row.id;

  insert into public.billing_events (order_id, user_id, event_type, payload)
  values (
    order_row.id, order_row.user_id, 'provider_confirmed',
    jsonb_build_object(
      'provider', 'shopier', 'providerOrderId', verified_provider_order_id,
      'productId', verified_product_id, 'amount', verified_amount,
      'currency', verified_currency, 'quantity', verified_quantity,
      'paymentReference', btrim(p_payment_reference),
      'periodStart', period_start, 'periodEnd', period_end
    )
  );

  insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
  values (
    order_row.user_id, 'success', 'calisiyo plus etkinleştirildi',
    'Plus erişimin ' || to_char(period_end at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ' tarihine kadar açık.',
    '/dashboard/abonelik', 'billing-approved-' || order_row.id::text
  ) on conflict (user_id, dedupe_key) do nothing;

  return jsonb_build_object(
    'id', order_row.id, 'status', 'approved', 'alreadyProcessed', false,
    'planCode', order_row.plan_code, 'periodStart', period_start, 'periodEnd', period_end
  );
end;
$$;

revoke all on function public.provider_confirm_billing_order(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.provider_confirm_billing_order(uuid, text, jsonb)
  to service_role;

-- Keep manual review as the fail-closed fallback, but make it provider-neutral
-- and use the same duration helper as automatic confirmation.
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
  period_start timestamptz;
  period_end timestamptz;
begin
  perform public.assert_admin('admin');
  if p_decision not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'Geçersiz inceleme kararı.';
  end if;
  if p_decision = 'approve' and length(btrim(coalesce(p_payment_reference, ''))) < 4 then
    raise exception using errcode = '22023', message = 'Benzersiz ödeme referansı zorunludur.';
  end if;

  select * into order_row from public.billing_orders
  where id = p_order_id and status = 'awaiting_review' for update;
  if order_row.id is null then
    raise exception using errcode = 'P0002', message = 'İncelenecek sipariş bulunamadı.';
  end if;

  if p_decision = 'reject' then
    update public.billing_orders
    set status = 'rejected', verified_by = actor, verified_at = now(),
        decision_note = nullif(btrim(coalesce(p_note, '')), ''), updated_at = now()
    where id = order_row.id;
    insert into public.billing_events(order_id, user_id, event_type, payload, actor_id)
    values (
      order_row.id, order_row.user_id, 'order_rejected',
      jsonb_build_object('note', nullif(btrim(coalesce(p_note, '')), '')), actor
    );
    return jsonb_build_object('id', order_row.id, 'status', 'rejected');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:billing:' || order_row.user_id::text, 0)
  );
  if exists (
    select 1 from public.billing_orders
    where payment_reference = btrim(p_payment_reference)
      and status in ('approved', 'refunded') and id <> order_row.id
  ) then
    raise exception using errcode = '23505', message = 'Bu ödeme referansı daha önce kullanılmış.';
  end if;

  select access.period_start, access.period_end
  into period_start, period_end
  from public.calculate_purchased_access_period(order_row.user_id, order_row.plan_code, now()) as access;

  insert into public.user_subscriptions (
    user_id, plan_code, status, current_period_start, current_period_end,
    source_order_id, cancel_at_period_end, trial_started_at, trial_ends_at
  ) values (
    order_row.user_id, order_row.plan_code, 'active', period_start, period_end,
    order_row.id, true, null, null
  ) on conflict (user_id) do update set
    plan_code = excluded.plan_code, status = 'active',
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    source_order_id = excluded.source_order_id,
    cancel_at_period_end = true, trial_started_at = null, trial_ends_at = null,
    updated_at = now();

  update public.billing_orders
  set status = 'approved', payment_reference = btrim(p_payment_reference),
      verified_by = actor, verified_at = now(), provider_verified_at = coalesce(provider_verified_at, now()),
      decision_note = nullif(btrim(coalesce(p_note, '')), ''), updated_at = now()
  where id = order_row.id;

  insert into public.billing_events(order_id, user_id, event_type, payload, actor_id)
  values (
    order_row.id, order_row.user_id, 'order_approved',
    jsonb_build_object(
      'provider', coalesce(order_row.payment_provider, 'manual'),
      'paymentReference', btrim(p_payment_reference),
      'periodStart', period_start, 'periodEnd', period_end
    ), actor
  );
  insert into public.notifications(user_id, kind, title, body, action_url, dedupe_key)
  values (
    order_row.user_id, 'success', 'calisiyo plus etkinleştirildi',
    'Plus erişimin ' || to_char(period_end at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ' tarihine kadar açık.',
    '/dashboard/abonelik', 'billing-approved-' || order_row.id::text
  ) on conflict (user_id, dedupe_key) do nothing;

  return jsonb_build_object(
    'id', order_row.id, 'status', 'approved',
    'periodStart', period_start, 'periodEnd', period_end
  );
end;
$$;

revoke all on function public.admin_review_billing_order(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_review_billing_order(uuid, text, text, text)
  to authenticated;

create or replace function public.reconcile_shopier_refund(
  p_order_id uuid,
  p_refund_id text,
  p_refund_type text,
  p_refund_status text,
  p_refund_total numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.billing_orders%rowtype;
  next_order_status text;
  next_provider_status text;
begin
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu iade işlemi gerekli.';
  end if;
  if p_refund_id !~ '^[A-Za-z0-9_-]{1,160}$'
     or p_refund_type not in ('full', 'partial')
     or p_refund_status not in ('pending', 'failed', 'succeeded')
     or p_refund_total < 0
     or upper(coalesce(p_currency, '')) <> 'TRY' then
    raise exception using errcode = '22023', message = 'İade bilgisi geçersiz.';
  end if;

  select * into order_row from public.billing_orders
  where id = p_order_id and payment_provider = 'shopier' for update;
  if order_row.id is null or order_row.provider_order_id is null then
    raise exception using errcode = 'P0002', message = 'İadeye bağlı sipariş bulunamadı.';
  end if;
  if order_row.provider_refund_id = p_refund_id
     and order_row.provider_refund_status = 'refund_' || p_refund_type || '_' || p_refund_status then
    return jsonb_build_object(
      'id', order_row.id, 'status', order_row.status,
      'refundStatus', order_row.provider_refund_status,
      'requiresReview', p_refund_status = 'succeeded', 'alreadyProcessed', true
    );
  end if;
  if order_row.provider_refund_id is not null
     and order_row.provider_refund_id <> p_refund_id then
    insert into public.billing_events(order_id, user_id, event_type, payload)
    values (
      order_row.id, order_row.user_id, 'refund_review_required',
      jsonb_build_object(
        'provider', 'shopier', 'refundId', p_refund_id,
        'refundType', p_refund_type, 'refundStatus', p_refund_status,
        'reason', 'multiple_refunds_for_order'
      )
    );
    return jsonb_build_object(
      'id', order_row.id, 'status', order_row.status,
      'refundStatus', order_row.provider_refund_status,
      'requiresReview', true, 'reason', 'multiple_refunds_for_order'
    );
  end if;

  next_order_status := case
    when p_refund_status = 'succeeded' and p_refund_type = 'full'
      and p_refund_total = order_row.amount then 'refunded'
    else order_row.status
  end;
  next_provider_status := 'refund_' || p_refund_type || '_' || p_refund_status;

  update public.billing_orders
  set status = next_order_status,
      provider_refund_id = p_refund_id,
      provider_refund_status = next_provider_status,
      provider_refunded_at = case when p_refund_status = 'succeeded' then now() else provider_refunded_at end,
      provider_status = next_provider_status,
      decision_note = case
        when p_refund_status = 'succeeded' and p_refund_type = 'full' and p_refund_total = amount
          then 'Tam iade doğrulandı; erişim değişikliği insan incelemesi gerektirir.'
        when p_refund_status = 'succeeded'
          then 'Kısmi veya tutarı farklı iade insan incelemesi gerektirir.'
        else decision_note
      end,
      updated_at = now()
  where id = order_row.id;

  insert into public.billing_events(order_id, user_id, event_type, payload)
  values (
    order_row.id, order_row.user_id, 'refund_' || p_refund_status,
    jsonb_build_object(
      'provider', 'shopier', 'refundId', p_refund_id,
      'refundType', p_refund_type, 'refundStatus', p_refund_status,
      'total', p_refund_total, 'currency', upper(p_currency),
      'requiresEntitlementReview', p_refund_status = 'succeeded'
    )
  );

  if p_refund_status = 'succeeded' then
    insert into public.notifications(user_id, kind, title, body, action_url, dedupe_key)
    values (
      order_row.user_id, 'info', 'İade durumu güncellendi',
      'Shopier iade işlemin doğrulandı. Erişim durumun destek ekibi tarafından güvenle incelenecek.',
      '/dashboard/abonelik', 'billing-refund-' || p_refund_id
    ) on conflict (user_id, dedupe_key) do nothing;
  end if;

  return jsonb_build_object(
    'id', order_row.id, 'status', next_order_status,
    'refundStatus', next_provider_status,
    'requiresReview', p_refund_status = 'succeeded'
  );
end;
$$;

revoke all on function public.reconcile_shopier_refund(uuid, text, text, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.reconcile_shopier_refund(uuid, text, text, text, numeric, text)
  to service_role;

-- Curated admin payload: raw provider/customer payload remains service-role only.
create or replace function public.admin_list_provider_events(
  p_status text default 'review_required',
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin('admin');
  if p_status is not null and p_status not in ('received', 'processing', 'processed', 'review_required', 'failed') then
    raise exception using errcode = '22023', message = 'Geçersiz provider olay filtresi.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', event.id,
      'eventId', event.provider_event_id,
      'eventType', event.event_type,
      'providerOrderId', event.provider_order_id,
      'providerAccountId', event.provider_account_id,
      'status', event.status,
      'reasonCode', event.reason_code,
      'lastErrorCode', event.last_error_code,
      'attempts', event.attempts,
      'createdAt', event.created_at,
      'updatedAt', event.updated_at
    ) order by event.created_at desc)
    from (
      select * from public.billing_provider_events as provider_event
      where p_status is null or provider_event.status = p_status
      order by provider_event.created_at desc
      limit least(greatest(coalesce(p_limit, 100), 1), 200)
    ) as event
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_list_provider_events(text, integer)
  from public, anon, authenticated;
grant execute on function public.admin_list_provider_events(text, integer)
  to authenticated;

-- Normalize the existing admin queue response without exposing provider payloads.
create or replace function public.admin_list_billing_orders(
  p_status text default 'awaiting_review',
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin('admin');
  if p_status is not null and p_status not in (
    'created', 'payment_link_ready', 'awaiting_review', 'approved',
    'rejected', 'cancelled', 'refunded', 'expired'
  ) then
    raise exception using errcode = '22023', message = 'Geçersiz sipariş filtresi.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', item.id,
      'orderNumber', item.order_number,
      'userId', item.user_id,
      'email', item.customer_email_snapshot,
      'fullName', profile.full_name,
      'planCode', item.plan_code,
      'planName', plan.name,
      'billingPeriod', item.billing_period,
      'amount', item.amount,
      'currency', item.currency,
      'status', item.status,
      'provider', item.payment_provider,
      'providerOrderId', item.provider_order_id,
      'providerProductId', item.expected_provider_product_id,
      'providerStatus', item.provider_status,
      'paymentUrl', coalesce(item.provider_checkout_url, item.iyzico_link_url),
      'paymentReference', item.payment_reference,
      'decisionNote', item.decision_note,
      'claimedAt', item.payment_claimed_at,
      'verifiedAt', item.verified_at,
      'createdAt', item.created_at
    ) order by item.created_at desc)
    from (
      select * from public.billing_orders as billing_order
      where p_status is null or billing_order.status = p_status
      order by billing_order.created_at desc
      limit least(greatest(coalesce(p_limit, 100), 1), 200)
    ) as item
    left join public.profiles as profile on profile.id = item.user_id
    left join public.billing_plans as plan on plan.code = item.plan_code
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_list_billing_orders(text, integer)
  from public, anon, authenticated;
grant execute on function public.admin_list_billing_orders(text, integer)
  to authenticated;
