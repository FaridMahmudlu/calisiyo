-- Secure prepaid SaaS billing foundation for iyzico Link.
-- Paid access is never activated from a browser redirect. Every activation is
-- an audited admin decision after the payment has been verified in iyzico.

create table if not exists public.billing_plans (
  code text primary key,
  name text not null,
  tagline text not null,
  description text not null,
  monthly_price numeric(10,2) not null check (monthly_price >= 0),
  annual_price numeric(10,2) not null check (annual_price >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  entitlements jsonb not null default '{}'::jsonb check (jsonb_typeof(entitlements) = 'object'),
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_plans_code_valid check (code in ('baslangic', 'odak', 'zirve'))
);

insert into public.billing_plans (
  code, name, tagline, description, monthly_price, annual_price, currency, entitlements, sort_order
) values
  (
    'baslangic', 'Başlangıç', 'Düzenini kur',
    'Planlama, Pomodoro ve gerçek verilerden oluşan temel ilerleme araçları.',
    0, 0, 'TRY',
    '{"future_schedule_days":60,"active_task_limit":200,"exam_monthly_limit":10,"note_limit":100,"youtube_import_monthly_limit":2,"classroom_create_limit":1,"classroom_join_limit":3,"classroom_member_limit":8,"avatar_customization":true,"stats_history_days":30,"progress_export":false,"premium_badge":false}'::jsonb,
    1
  ),
  (
    'odak', 'Odak', 'Ritmini büyüt',
    'Yoğun çalışan öğrenciler için geniş limitler, sınıf kurma ve ayrıntılı takip.',
    89.90, 899.00, 'TRY',
    '{"future_schedule_days":365,"active_task_limit":500,"exam_monthly_limit":40,"note_limit":500,"youtube_import_monthly_limit":5,"classroom_create_limit":3,"classroom_join_limit":8,"classroom_member_limit":20,"avatar_customization":true,"stats_history_days":3650,"progress_export":false,"premium_badge":true}'::jsonb,
    2
  ),
  (
    'zirve', 'Zirve', 'Tam kontrol sende',
    'En yüksek limitler, gelişim raporu ve çoklu çalışma sınıfı yönetimi.',
    149.90, 1499.00, 'TRY',
    '{"future_schedule_days":730,"active_task_limit":2000,"exam_monthly_limit":120,"note_limit":2000,"youtube_import_monthly_limit":30,"classroom_create_limit":10,"classroom_join_limit":30,"classroom_member_limit":50,"avatar_customization":true,"stats_history_days":3650,"progress_export":true,"premium_badge":true}'::jsonb,
    3
  )
on conflict (code) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  currency = excluded.currency,
  entitlements = excluded.entitlements,
  sort_order = excluded.sort_order,
  updated_at = now();

create table if not exists public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.billing_plans(code),
  billing_period text not null check (billing_period in ('monthly', 'annual')),
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  status text not null default 'created' check (
    status in ('created', 'payment_link_ready', 'awaiting_review', 'approved', 'rejected', 'cancelled', 'refunded', 'expired')
  ),
  iyzico_conversation_id text not null unique,
  iyzico_link_token text,
  iyzico_link_url text,
  iyzico_link_status text,
  legal_versions jsonb not null check (jsonb_typeof(legal_versions) = 'object'),
  legal_snapshot_hash text not null check (length(legal_snapshot_hash) between 32 and 128),
  immediate_service_consent boolean not null,
  adult_or_guardian_confirmed boolean not null,
  payment_claimed_at timestamptz,
  payment_reference text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_orders_link_url_valid check (
    iyzico_link_url is null
    or iyzico_link_url ~ '^https://([a-z0-9-]+\.)?iyzi\.link/'
  )
);

create table if not exists public.billing_legal_acceptances (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.billing_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_key text not null,
  document_version text not null,
  snapshot_hash text not null check (length(snapshot_hash) between 32 and 128),
  accepted_at timestamptz not null default now(),
  unique (order_id, document_key)
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_code text not null references public.billing_plans(code),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled', 'refunded')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  source_order_id uuid unique references public.billing_orders(id) on delete set null,
  cancel_at_period_end boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subscriptions_period_valid check (current_period_end > current_period_start)
);

create table if not exists public.billing_events (
  id bigint generated always as identity primary key,
  order_id uuid references public.billing_orders(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists billing_orders_user_created_idx
  on public.billing_orders (user_id, created_at desc);
create index if not exists billing_orders_review_queue_idx
  on public.billing_orders (created_at asc)
  where status = 'awaiting_review';
create unique index if not exists billing_orders_payment_reference_unique_idx
  on public.billing_orders (payment_reference)
  where payment_reference is not null and status in ('approved', 'refunded');
create index if not exists billing_legal_acceptances_user_idx
  on public.billing_legal_acceptances (user_id, accepted_at desc);
create index if not exists billing_events_user_created_idx
  on public.billing_events (user_id, created_at desc);
create index if not exists user_subscriptions_active_idx
  on public.user_subscriptions (user_id, current_period_end)
  where status = 'active';

alter table public.billing_plans enable row level security;
alter table public.billing_orders enable row level security;
alter table public.billing_legal_acceptances enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.billing_events enable row level security;

revoke all on table public.billing_plans from anon, authenticated;
revoke all on table public.billing_orders from anon, authenticated;
revoke all on table public.billing_legal_acceptances from anon, authenticated;
revoke all on table public.user_subscriptions from anon, authenticated;
revoke all on table public.billing_events from anon, authenticated;

grant select on table public.billing_plans to anon, authenticated;
grant select on table public.billing_orders to authenticated;
grant select on table public.billing_legal_acceptances to authenticated;
grant select on table public.user_subscriptions to authenticated;
grant select on table public.billing_events to authenticated;

drop policy if exists "Public can read active billing plans" on public.billing_plans;
create policy "Public can read active billing plans"
on public.billing_plans for select
to anon, authenticated
using (is_active);

drop policy if exists "Users can read own billing orders" on public.billing_orders;
create policy "Users can read own billing orders"
on public.billing_orders for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own legal acceptances" on public.billing_legal_acceptances;
create policy "Users can read own legal acceptances"
on public.billing_legal_acceptances for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own subscription" on public.user_subscriptions;
create policy "Users can read own subscription"
on public.user_subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own billing events" on public.billing_events;
create policy "Users can read own billing events"
on public.billing_events for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.current_plan_details()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  selected_plan public.billing_plans%rowtype;
  subscription_row public.user_subscriptions%rowtype;
begin
  if viewer is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;

  select * into subscription_row
  from public.user_subscriptions
  where user_id = viewer
    and status = 'active'
    and current_period_end > now()
  limit 1;

  select * into selected_plan
  from public.billing_plans
  where code = coalesce(subscription_row.plan_code, 'baslangic')
    and is_active
  limit 1;

  if selected_plan.code is null then
    select * into selected_plan from public.billing_plans where code = 'baslangic' limit 1;
  end if;

  return jsonb_build_object(
    'code', selected_plan.code,
    'name', selected_plan.name,
    'entitlements', selected_plan.entitlements,
    'status', coalesce(subscription_row.status, 'free'),
    'periodStart', subscription_row.current_period_start,
    'periodEnd', subscription_row.current_period_end,
    'cancelAtPeriodEnd', coalesce(subscription_row.cancel_at_period_end, true)
  );
end;
$$;

create or replace function public.has_plan_entitlement(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.current_plan_details() -> 'entitlements' ->> p_key)::boolean, false);
$$;

create or replace function public.plan_entitlement_limit(p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0, coalesce((public.current_plan_details() -> 'entitlements' ->> p_key)::integer, 0));
$$;

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

create or replace function public.attach_billing_payment_link(
  p_order_id uuid,
  p_token text,
  p_url text,
  p_link_status text default 'ACTIVE'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_order public.billing_orders%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu doğrulaması gerekli.';
  end if;
  if coalesce(p_token, '') !~ '^[A-Za-z0-9_-]{2,128}$'
     or coalesce(p_url, '') !~ '^https://([a-z0-9-]+\.)?iyzi\.link/' then
    raise exception using errcode = '22023', message = 'Ödeme bağlantısı geçersiz.';
  end if;

  update public.billing_orders
  set iyzico_link_token = p_token,
      iyzico_link_url = p_url,
      iyzico_link_status = coalesce(nullif(p_link_status, ''), 'ACTIVE'),
      status = 'payment_link_ready',
      updated_at = now()
  where id = p_order_id and status = 'created'
  returning * into updated_order;

  if updated_order.id is null then
    raise exception using errcode = 'P0002', message = 'Sipariş güncellenemedi.';
  end if;

  insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
  values (updated_order.id, updated_order.user_id, 'payment_link_ready', jsonb_build_object('token', p_token), null);

  return jsonb_build_object('id', updated_order.id, 'status', updated_order.status, 'paymentUrl', updated_order.iyzico_link_url);
end;
$$;

create or replace function public.claim_billing_payment(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  updated_order public.billing_orders%rowtype;
begin
  update public.billing_orders
  set status = 'awaiting_review', payment_claimed_at = now(), updated_at = now()
  where id = p_order_id and user_id = viewer and status = 'payment_link_ready'
  returning * into updated_order;

  if updated_order.id is null then
    raise exception using errcode = 'P0002', message = 'İncelenecek sipariş bulunamadı.';
  end if;

  insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
  values (updated_order.id, viewer, 'payment_claimed', '{}'::jsonb, viewer);
  return jsonb_build_object('id', updated_order.id, 'status', updated_order.status);
end;
$$;

create or replace function public.cancel_billing_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  updated_order public.billing_orders%rowtype;
begin
  update public.billing_orders
  set status = 'cancelled', updated_at = now()
  where id = p_order_id and user_id = viewer and status in ('created', 'payment_link_ready')
  returning * into updated_order;
  if updated_order.id is null then
    raise exception using errcode = 'P0002', message = 'İptal edilebilir sipariş bulunamadı.';
  end if;
  insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
  values (updated_order.id, viewer, 'order_cancelled', '{}'::jsonb, viewer);
  return jsonb_build_object('id', updated_order.id, 'status', updated_order.status);
end;
$$;

create or replace function public.admin_list_billing_orders(
  p_status text default 'awaiting_review',
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.assert_admin('admin');
  if p_status is not null and p_status not in ('created', 'payment_link_ready', 'awaiting_review', 'approved', 'rejected', 'cancelled', 'refunded', 'expired') then
    raise exception using errcode = '22023', message = 'Geçersiz sipariş durumu.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', item.id,
    'orderNumber', item.order_number,
    'userId', item.user_id,
    'email', item.email,
    'fullName', item.full_name,
    'planCode', item.plan_code,
    'planName', item.plan_name,
    'billingPeriod', item.billing_period,
    'amount', item.amount,
    'currency', item.currency,
    'status', item.status,
    'paymentUrl', item.iyzico_link_url,
    'paymentReference', item.payment_reference,
    'claimedAt', item.payment_claimed_at,
    'createdAt', item.created_at,
    'verifiedAt', item.verified_at,
    'decisionNote', item.decision_note
  ) order by item.created_at desc), '[]'::jsonb)
  into result
  from (
    select orders.*, auth_user.email, profile.full_name, plan.name as plan_name
    from public.billing_orders as orders
    join auth.users as auth_user on auth_user.id = orders.user_id
    left join public.profiles as profile on profile.id = orders.user_id
    join public.billing_plans as plan on plan.code = orders.plan_code
    where p_status is null or orders.status = p_status
    order by orders.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
  ) as item;
  return result;
end;
$$;

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

revoke all on function public.current_plan_details() from public, anon, authenticated;
revoke all on function public.has_plan_entitlement(text) from public, anon, authenticated;
revoke all on function public.plan_entitlement_limit(text) from public, anon, authenticated;
revoke all on function public.create_billing_order(text, text, jsonb, text, boolean, boolean) from public, anon, authenticated;
revoke all on function public.attach_billing_payment_link(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.claim_billing_payment(uuid) from public, anon, authenticated;
revoke all on function public.cancel_billing_order(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_billing_orders(text, integer) from public, anon, authenticated;
revoke all on function public.admin_review_billing_order(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.current_plan_details() to authenticated;
grant execute on function public.has_plan_entitlement(text) to authenticated;
grant execute on function public.plan_entitlement_limit(text) to authenticated;
grant execute on function public.create_billing_order(text, text, jsonb, text, boolean, boolean) to authenticated;
grant execute on function public.attach_billing_payment_link(uuid, text, text, text) to service_role;
grant execute on function public.claim_billing_payment(uuid) to authenticated;
grant execute on function public.cancel_billing_order(uuid) to authenticated;
grant execute on function public.admin_list_billing_orders(text, integer) to authenticated;
grant execute on function public.admin_review_billing_order(uuid, text, text, text) to authenticated;

-- Only the server-side service role may turn an iyzico-confirmed unique sale
-- into access. Browser redirects and authenticated clients cannot execute this.
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

revoke all on function public.provider_confirm_billing_order(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.provider_confirm_billing_order(uuid, text, jsonb) to service_role;

create or replace function public.enforce_task_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  future_limit integer;
  task_limit integer;
  active_count integer;
begin
  if viewer is null or viewer <> new.user_id then
    raise exception using errcode = '42501', message = 'Görev hesabınla eşleşmiyor.';
  end if;
  future_limit := public.plan_entitlement_limit('future_schedule_days');
  task_limit := public.plan_entitlement_limit('active_task_limit');
  if new.tarih > (now() at time zone 'Europe/Istanbul')::date + future_limit then
    raise exception using errcode = '54000', message = 'Planının ileri tarih sınırını aştın.';
  end if;
  if tg_op = 'INSERT' or (coalesce(old.tamamlandi, false) and not coalesce(new.tamamlandi, false)) then
    select count(*) into active_count
    from public.gunluk_gorevler
    where user_id = new.user_id and not coalesce(tamamlandi, false);
    if active_count >= task_limit then
      raise exception using errcode = '54000', message = 'Planındaki aktif görev limitine ulaştın.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_task_plan_limits() from public, anon, authenticated;
drop trigger if exists enforce_task_plan_limits_trigger on public.gunluk_gorevler;
create trigger enforce_task_plan_limits_trigger
before insert or update on public.gunluk_gorevler
for each row execute function public.enforce_task_plan_limits();

-- A child row must never point at another account's private resource. The
-- existing UUID foreign keys protect existence; this trigger protects tenancy.
create or replace function public.enforce_owned_resource_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kaynak_id is not null and not exists (
    select 1 from public.kaynaklarim
    where id = new.kaynak_id and user_id = new.user_id
  ) then
    raise exception using errcode = '23503', message = 'Kaynak hesabınla eşleşmiyor.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_owned_resource_reference() from public, anon, authenticated;
drop trigger if exists enforce_owned_resource_on_tasks on public.gunluk_gorevler;
create trigger enforce_owned_resource_on_tasks
before insert or update of user_id, kaynak_id on public.gunluk_gorevler
for each row execute function public.enforce_owned_resource_reference();
drop trigger if exists enforce_owned_resource_on_questions on public.yapamadiklari;
create trigger enforce_owned_resource_on_questions
before insert or update of user_id, kaynak_id on public.yapamadiklari
for each row execute function public.enforce_owned_resource_reference();
drop trigger if exists enforce_owned_resource_on_sessions on public.calisma_suresi;
create trigger enforce_owned_resource_on_sessions
before insert or update of user_id, kaynak_id on public.calisma_suresi
for each row execute function public.enforce_owned_resource_reference();

-- Direct PostgREST writes are also bound to plan limits. SECURITY DEFINER
-- import functions below repeat the checks because they bypass RLS by design.
create or replace function public.can_insert_study_task(p_user_id uuid, p_date date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = p_user_id
    and p_date <= (now() at time zone 'Europe/Istanbul')::date
      + public.plan_entitlement_limit('future_schedule_days')
    and (
      select count(*) from public.gunluk_gorevler
      where user_id = p_user_id and not coalesce(tamamlandi, false)
    ) < public.plan_entitlement_limit('active_task_limit');
$$;

create or replace function public.can_update_study_task(p_user_id uuid, p_date date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = p_user_id
    and p_date <= (now() at time zone 'Europe/Istanbul')::date
      + public.plan_entitlement_limit('future_schedule_days')
    and (
      select count(*) from public.gunluk_gorevler
      where user_id = p_user_id and not coalesce(tamamlandi, false)
    ) <= public.plan_entitlement_limit('active_task_limit');
$$;

create or replace function public.can_insert_exam(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = p_user_id
    and (
      select count(*) from public.denemeler
      where user_id = p_user_id
        and created_at >= date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'
    ) < public.plan_entitlement_limit('exam_monthly_limit');
$$;

create or replace function public.can_insert_note(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = p_user_id
    and (select count(*) from public.notlar where user_id = p_user_id)
      < public.plan_entitlement_limit('note_limit');
$$;

revoke all on function public.can_insert_study_task(uuid, date) from public, anon;
revoke all on function public.can_update_study_task(uuid, date) from public, anon;
revoke all on function public.can_insert_exam(uuid) from public, anon;
revoke all on function public.can_insert_note(uuid) from public, anon;
grant execute on function public.can_insert_study_task(uuid, date) to authenticated;
grant execute on function public.can_update_study_task(uuid, date) to authenticated;
grant execute on function public.can_insert_exam(uuid) to authenticated;
grant execute on function public.can_insert_note(uuid) to authenticated;

drop policy if exists "Plan limits task inserts" on public.gunluk_gorevler;
create policy "Plan limits task inserts" on public.gunluk_gorevler
as restrictive for insert to authenticated
with check (public.can_insert_study_task(user_id, tarih));

drop policy if exists "Plan limits task updates" on public.gunluk_gorevler;
create policy "Plan limits task updates" on public.gunluk_gorevler
as restrictive for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Plan limits exam inserts" on public.denemeler;
create policy "Plan limits exam inserts" on public.denemeler
as restrictive for insert to authenticated
with check (public.can_insert_exam(user_id));

drop policy if exists "Plan limits note inserts" on public.notlar;
create policy "Plan limits note inserts" on public.notlar
as restrictive for insert to authenticated
with check (public.can_insert_note(user_id));

alter table public.study_groups drop constraint if exists study_groups_max_members_check;
alter table public.study_groups add constraint study_groups_max_members_check
  check (max_members between 2 and 50);

create or replace function public.create_study_group_v3(
  p_name text,
  p_description text,
  p_weekly_goal_minutes integer,
  p_max_members integer,
  p_exam_track text,
  p_study_style text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  created public.study_groups%rowtype;
  create_limit integer;
  join_limit integer;
  member_limit integer;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  create_limit := public.plan_entitlement_limit('classroom_create_limit');
  join_limit := public.plan_entitlement_limit('classroom_join_limit');
  member_limit := public.plan_entitlement_limit('classroom_member_limit');
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 40 then
    raise exception using errcode = '22023', message = 'Sınıf adı 2-40 karakter olmalı.';
  end if;
  if char_length(trim(coalesce(p_description, ''))) not between 8 and 180 then
    raise exception using errcode = '22023', message = 'Açıklama 8-180 karakter olmalı.';
  end if;
  if p_weekly_goal_minutes not between 30 and 50000
     or p_max_members not between 2 and least(member_limit, 50)
     or p_exam_track not in ('tyt', 'ayt', 'tyt_ayt', 'ydt')
     or p_study_style not in ('quiet', 'balanced', 'social') then
    raise exception using errcode = '22023', message = 'Sınıf ayarları plan limitinle uyumlu değil.';
  end if;
  if (
    select count(*) from public.study_groups
    where owner_id = viewer and not is_archived
  ) >= create_limit then
    raise exception using errcode = '54000', message = 'Planındaki sınıf kurma limitine ulaştın.';
  end if;
  if (
    select count(*) from public.study_group_members where user_id = viewer
  ) >= join_limit then
    raise exception using errcode = '54000', message = 'Planındaki sınıf katılım limitine ulaştın.';
  end if;

  insert into public.study_groups (
    owner_id, name, description, weekly_goal_minutes, max_members,
    exam_track, study_style, members_can_chat, members_can_react
  ) values (
    viewer, trim(p_name), trim(p_description), p_weekly_goal_minutes, p_max_members,
    p_exam_track, p_study_style, p_study_style <> 'quiet', p_study_style <> 'quiet'
  ) returning * into created;
  insert into public.study_group_members (group_id, user_id, member_role)
  values (created.id, viewer, 'owner');
  return jsonb_build_object('id', created.id, 'name', created.name, 'inviteCode', created.invite_code);
end;
$$;

create or replace function public.join_study_group(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  target_group public.study_groups%rowtype;
  member_count integer;
  join_limit integer;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  join_limit := public.plan_entitlement_limit('classroom_join_limit');
  if (select count(*) from public.study_group_members where user_id = viewer) >= join_limit then
    raise exception using errcode = '54000', message = 'Planındaki sınıf katılım limitine ulaştın.';
  end if;

  select * into target_group
  from public.study_groups
  where upper(trim(invite_code)) = upper(trim(p_invite_code))
    and not is_archived
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Bu davet koduyla açık bir sınıf bulunamadı.';
  end if;

  select count(*) into member_count
  from public.study_group_members
  where group_id = target_group.id;
  if member_count >= target_group.max_members then
    raise exception using errcode = '54000', message = 'Bu çalışma sınıfı dolu.';
  end if;

  insert into public.study_group_members (group_id, user_id)
  values (target_group.id, viewer)
  on conflict (group_id, user_id) do nothing;

  if coalesce((select notifications_enabled from public.profiles where id = target_group.owner_id), true)
      and target_group.owner_id <> viewer then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (
      target_group.owner_id, 'info', 'Sınıfına yeni bir öğrenci katıldı',
      (select full_name from public.profiles where id = viewer) || ' · ' || target_group.name,
      '/dashboard/arkadaslar/' || target_group.id::text,
      'group-join-' || target_group.id::text || '-' || viewer::text
    ) on conflict (user_id, dedupe_key) do nothing;
  end if;
  return jsonb_build_object('id', target_group.id, 'name', target_group.name);
end;
$$;

create or replace function public.import_youtube_learning_plan(
  p_resource jsonb,
  p_items jsonb,
  p_start_date date,
  p_cadence text,
  p_daily_minutes integer,
  p_ders_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  resource_id uuid;
  item jsonb;
  item_id uuid;
  item_date date;
  v_task_id uuid;
  start_time time;
  end_time time;
  duration_minutes integer;
  created_tasks integer := 0;
  future_limit integer;
  task_limit integer;
  import_limit integer;
  today_date date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  future_limit := public.plan_entitlement_limit('future_schedule_days');
  task_limit := public.plan_entitlement_limit('active_task_limit');
  import_limit := public.plan_entitlement_limit('youtube_import_monthly_limit');
  if p_start_date < today_date - 1
     or p_start_date > today_date + future_limit
     or p_cadence not in ('daily', 'weekly')
     or p_daily_minutes not between 15 and 360
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Planlama ayarları plan limitinle uyumlu değil.';
  end if;
  if (
    select count(*) from public.kaynaklarim
    where user_id = viewer
      and resource_kind in ('youtube_video', 'youtube_playlist')
      and created_at >= date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'
  ) >= import_limit then
    raise exception using errcode = '54000', message = 'Aylık YouTube planı limitine ulaştın.';
  end if;
  if (
    select count(*) from public.gunluk_gorevler
    where user_id = viewer and not coalesce(tamamlandi, false)
  ) + jsonb_array_length(p_items) > task_limit then
    raise exception using errcode = '54000', message = 'Aktif görev limitin bu plan için yeterli değil.';
  end if;
  if p_ders_id is not null and not exists (select 1 from public.dersler where id = p_ders_id) then
    raise exception using errcode = '22023', message = 'Ders bulunamadı.';
  end if;
  if coalesce(p_resource ->> 'kind', '') not in ('youtube_video', 'youtube_playlist')
     or coalesce(p_resource ->> 'url', '') !~ '^https://(www\.)?(youtube\.com|youtu\.be)/' then
    raise exception using errcode = '22023', message = 'Geçerli bir YouTube kaynağı gerekli.';
  end if;

  insert into public.kaynaklarim (
    user_id, custom_ad, custom_yayin, custom_kitap_turu, custom_ders_id,
    resource_kind, source_url, external_id, duration_minutes, item_count, source_metadata
  ) values (
    viewer, left(trim(p_resource ->> 'title'), 160),
    coalesce(nullif(trim(p_resource ->> 'channelTitle'), ''), 'YouTube'), 'video', p_ders_id,
    p_resource ->> 'kind', p_resource ->> 'url', p_resource ->> 'externalId',
    nullif(p_resource ->> 'durationMinutes', '')::integer, jsonb_array_length(p_items), p_resource
  ) returning id into resource_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(item ->> 'videoId', '') !~ '^[A-Za-z0-9_-]{11}$'
       or char_length(trim(coalesce(item ->> 'title', ''))) not between 1 and 200
       or coalesce((item ->> 'durationSeconds')::integer, 0) not between 1 and 86400 then
      raise exception using errcode = '22023', message = 'Video bilgileri doğrulanamadı.';
    end if;
    item_date := coalesce(nullif(item ->> 'scheduledDate', '')::date, p_start_date);
    if item_date < p_start_date or item_date > today_date + future_limit then
      raise exception using errcode = '22023', message = 'Video plan tarihi plan limitini aşıyor.';
    end if;
    duration_minutes := greatest(1, ceil((item ->> 'durationSeconds')::numeric / 60)::integer);
    insert into public.youtube_resource_items (
      resource_id, user_id, video_id, title, channel_title, thumbnail_url,
      duration_seconds, position, scheduled_date
    ) values (
      resource_id, viewer, item ->> 'videoId', trim(item ->> 'title'), item ->> 'channelTitle',
      item ->> 'thumbnailUrl', (item ->> 'durationSeconds')::integer,
      (item ->> 'position')::integer, item_date
    ) returning id into item_id;
    start_time := '17:00';
    loop
      select coalesce(max(bitis_saat), start_time) into start_time
      from public.gunluk_gorevler
      where user_id = viewer and tarih = item_date and bitis_saat > start_time;
      end_time := start_time + make_interval(mins => least(duration_minutes, 360));
      exit when end_time < '23:55';
      item_date := item_date + 1;
      if item_date > today_date + future_limit then
        raise exception using errcode = '54000', message = 'Plan, ileri tarih limitini aşıyor.';
      end if;
      start_time := '09:00';
    end loop;
    insert into public.gunluk_gorevler (
      user_id, tarih, baslangic_saat, bitis_saat, ders_id, kaynak_id,
      konu, soru_sayisi, tamamlandi, youtube_item_id, source_url
    ) values (
      viewer, item_date, start_time, end_time, p_ders_id, resource_id,
      left(trim(item ->> 'title'), 200), 0, false, item_id,
      'https://www.youtube.com/watch?v=' || (item ->> 'videoId')
    ) returning id into v_task_id;
    update public.youtube_resource_items
    set task_id = v_task_id, scheduled_date = item_date
    where id = item_id;
    created_tasks := created_tasks + 1;
  end loop;
  return jsonb_build_object(
    'resourceId', resource_id,
    'tasksCreated', created_tasks,
    'itemsCreated', jsonb_array_length(p_items)
  );
end;
$$;

revoke all on function public.create_study_group_v3(text, text, integer, integer, text, text) from public, anon, authenticated;
revoke all on function public.join_study_group(text) from public, anon, authenticated;
revoke all on function public.import_youtube_learning_plan(jsonb, jsonb, date, text, integer, uuid) from public, anon, authenticated;
grant execute on function public.create_study_group_v3(text, text, integer, integer, text, text) to authenticated;
grant execute on function public.join_study_group(text) to authenticated;
grant execute on function public.import_youtube_learning_plan(jsonb, jsonb, date, text, integer, uuid) to authenticated;
