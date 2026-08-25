-- Fixed-term pricing and the Calisiyo Content Producer Program.
-- Financial mutations remain server/admin-only; producers receive read-only,
-- owner-scoped views through RLS and narrow RPCs.

update public.billing_plans
set monthly_price = case code when 'plus_2027' then 2500 when 'plus_2028' then 1500 else monthly_price end,
    annual_price = case code when 'plus_2027' then 2500 when 'plus_2028' then 1500 else annual_price end,
    tagline = case code
      when 'plus_2027' then '2027 YKS’ye kadar'
      when 'plus_2028' then '2028 YKS’ye kadar'
      else tagline
    end,
    description = case code
      when 'plus_2027' then '19 Ağustos 2027 tarihine kadar geçerli, otomatik yenilenmeyen calisiyo plus erişimi.'
      when 'plus_2028' then '25 Haziran 2028 tarihine kadar geçerli, otomatik yenilenmeyen calisiyo plus erişimi.'
      else description
    end,
    updated_at = now()
where code in ('plus_2027', 'plus_2028');

alter table public.billing_orders drop constraint if exists billing_orders_billing_period_check;
alter table public.billing_orders add constraint billing_orders_billing_period_check
  check (billing_period in ('monthly', 'annual', 'yks_2027', 'six_months', 'yks_2028'));

alter table public.billing_orders
  add column if not exists list_amount numeric(10,2),
  add column if not exists paid_amount numeric(10,2),
  add column if not exists verified_discount_amount numeric(10,2),
  add column if not exists provider_discount_id text,
  add column if not exists content_producer_id uuid;

update public.billing_orders
set list_amount = coalesce(list_amount, amount),
    paid_amount = case
      when status in ('approved', 'refunded') then coalesce(paid_amount, amount)
      else paid_amount
    end,
    verified_discount_amount = coalesce(verified_discount_amount, 0)
where list_amount is null
   or verified_discount_amount is null
   or (paid_amount is null and status in ('approved', 'refunded'));

alter table public.billing_orders
  alter column list_amount set default null,
  add constraint billing_orders_list_amount_valid check (list_amount is null or list_amount > 0),
  add constraint billing_orders_paid_amount_valid check (paid_amount is null or paid_amount > 0),
  add constraint billing_orders_discount_amount_valid check (verified_discount_amount is null or verified_discount_amount >= 0),
  add constraint billing_orders_provider_discount_id_valid check (
    provider_discount_id is null or provider_discount_id ~ '^[A-Za-z0-9_-]{1,160}$'
  ),
  add constraint billing_orders_verified_totals_valid check (
    paid_amount is null
    or list_amount is null
    or verified_discount_amount is null
    or paid_amount + verified_discount_amount = list_amount
  );

create table if not exists public.content_producer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  lifetime_qualified_sale_count integer not null default 0 check (lifetime_qualified_sale_count >= 0),
  payout_currency text not null default 'TRY' check (payout_currency = 'TRY'),
  activated_by uuid not null references auth.users(id) on delete restrict,
  activated_at timestamptz not null default now(),
  suspended_by uuid references auth.users(id) on delete set null,
  suspended_at timestamptz,
  suspension_reason text check (suspension_reason is null or char_length(suspension_reason) between 3 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_producer_access_grants (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.content_producer_profiles(user_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.billing_plans(code),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked', 'expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_producer_access_grants_period_valid check (ends_at > starts_at),
  constraint content_producer_access_grants_owner_valid check (producer_id = user_id)
);

create unique index if not exists content_producer_one_live_grant_idx
  on public.content_producer_access_grants (producer_id)
  where status in ('active', 'suspended');

create table if not exists public.content_producer_codes (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.content_producer_profiles(user_id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{4,24}$'),
  status text not null default 'manual_required'
    check (status in ('pending', 'manual_required', 'active', 'suspended', 'retired', 'review_required')),
  discount_bps integer not null default 2000 check (discount_bps = 2000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_producer_codes_case_unique_idx
  on public.content_producer_codes (upper(code));
create unique index if not exists content_producer_one_current_code_idx
  on public.content_producer_codes (producer_id)
  where status in ('pending', 'manual_required', 'active', 'suspended', 'review_required');

create table if not exists public.content_producer_code_bindings (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.content_producer_codes(id) on delete cascade,
  provider text not null default 'shopier' check (provider = 'shopier'),
  provider_discount_id text not null check (provider_discount_id ~ '^[A-Za-z0-9_-]{1,160}$'),
  status text not null default 'active'
    check (status in ('pending', 'manual_required', 'active', 'suspended', 'retired', 'review_required')),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  last_error_code text,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_producer_code_bindings_period_valid check (valid_to is null or valid_to > valid_from),
  unique (provider, provider_discount_id)
);

create unique index if not exists content_producer_one_active_binding_idx
  on public.content_producer_code_bindings (code_id)
  where status = 'active' and valid_to is null;

create table if not exists public.content_producer_rewards (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.content_producer_profiles(user_id) on delete restrict,
  order_id uuid not null unique references public.billing_orders(id) on delete restrict,
  provider_order_id text not null unique check (provider_order_id ~ '^[A-Za-z0-9_-]{1,160}$'),
  provider_discount_id text not null check (provider_discount_id ~ '^[A-Za-z0-9_-]{1,160}$'),
  lifetime_sequence integer,
  list_amount_minor bigint not null check (list_amount_minor > 0),
  paid_amount_minor bigint not null check (paid_amount_minor > 0),
  discount_amount_minor bigint not null check (discount_amount_minor >= 0),
  reward_amount_minor bigint not null check (reward_amount_minor >= 0),
  discount_bps_snapshot integer not null default 2000 check (discount_bps_snapshot = 2000),
  reward_rule_snapshot jsonb not null default '{"firstSalesCount":3,"firstSalesRewardMinor":100000,"laterSalesRewardMinor":50000,"holdDays":14}'::jsonb
    check (jsonb_typeof(reward_rule_snapshot) = 'object'),
  currency text not null default 'TRY' check (currency = 'TRY'),
  status text not null default 'pending'
    check (status in ('pending', 'available', 'reserved', 'paid', 'cancelled', 'reversed', 'review_required')),
  exclusion_reason text,
  sale_paid_at timestamptz not null,
  available_at timestamptz not null,
  refund_hold boolean not null default false,
  payout_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_producer_reward_sequence_valid check (
    (lifetime_sequence is null and reward_amount_minor = 0)
    or (lifetime_sequence is not null and lifetime_sequence > 0 and reward_amount_minor > 0)
  ),
  constraint content_producer_reward_cap check (reward_amount_minor <= paid_amount_minor)
);

create unique index if not exists content_producer_reward_sequence_unique_idx
  on public.content_producer_rewards (producer_id, lifetime_sequence)
  where lifetime_sequence is not null;
create index if not exists content_producer_rewards_available_idx
  on public.content_producer_rewards (producer_id, available_at)
  where status in ('pending', 'available') and not refund_hold;

create table if not exists public.content_producer_adjustments (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.content_producer_profiles(user_id) on delete restrict,
  reward_id uuid references public.content_producer_rewards(id) on delete restrict,
  order_id uuid references public.billing_orders(id) on delete restrict,
  kind text not null check (kind in ('refund_after_payout', 'manual_credit', 'manual_debit')),
  amount_minor bigint not null check (amount_minor <> 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  status text not null default 'available'
    check (status in ('pending', 'available', 'reserved', 'paid', 'cancelled', 'review_required')),
  reason text not null check (char_length(reason) between 3 and 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_producer_refund_adjustment_unique_idx
  on public.content_producer_adjustments (reward_id, kind)
  where kind = 'refund_after_payout';

create table if not exists public.content_producer_payouts (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.content_producer_profiles(user_id) on delete restrict,
  status text not null default 'reserved' check (status in ('reserved', 'paid', 'cancelled', 'review_required')),
  total_amount_minor bigint not null check (total_amount_minor > 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  created_by uuid not null references auth.users(id) on delete restrict,
  paid_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  payment_reference text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_producer_payout_paid_valid check (
    status <> 'paid' or (paid_by is not null and paid_at is not null and char_length(payment_reference) >= 4)
  )
);

create table if not exists public.content_producer_payout_items (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.content_producer_payouts(id) on delete restrict,
  reward_id uuid references public.content_producer_rewards(id) on delete restrict,
  adjustment_id uuid references public.content_producer_adjustments(id) on delete restrict,
  amount_minor bigint not null check (amount_minor <> 0),
  created_at timestamptz not null default now(),
  constraint content_producer_payout_item_source_valid check (
    (reward_id is not null)::integer + (adjustment_id is not null)::integer = 1
  ),
  unique (reward_id),
  unique (adjustment_id)
);

alter table public.billing_orders
  add constraint billing_orders_content_producer_fkey
  foreign key (content_producer_id) references public.content_producer_profiles(user_id) on delete set null;
alter table public.content_producer_rewards
  add constraint content_producer_rewards_payout_fkey
  foreign key (payout_id) references public.content_producer_payouts(id) on delete set null;

create index if not exists content_producer_bindings_lookup_idx
  on public.content_producer_code_bindings (provider, provider_discount_id, valid_from, valid_to);
create index if not exists content_producer_payouts_owner_idx
  on public.content_producer_payouts (producer_id, created_at desc);

alter table public.content_producer_profiles enable row level security;
alter table public.content_producer_access_grants enable row level security;
alter table public.content_producer_codes enable row level security;
alter table public.content_producer_code_bindings enable row level security;
alter table public.content_producer_rewards enable row level security;
alter table public.content_producer_adjustments enable row level security;
alter table public.content_producer_payouts enable row level security;
alter table public.content_producer_payout_items enable row level security;

revoke all on table public.content_producer_profiles from public, anon, authenticated;
revoke all on table public.content_producer_access_grants from public, anon, authenticated;
revoke all on table public.content_producer_codes from public, anon, authenticated;
revoke all on table public.content_producer_code_bindings from public, anon, authenticated;
revoke all on table public.content_producer_rewards from public, anon, authenticated;
revoke all on table public.content_producer_adjustments from public, anon, authenticated;
revoke all on table public.content_producer_payouts from public, anon, authenticated;
revoke all on table public.content_producer_payout_items from public, anon, authenticated;

grant select on table public.content_producer_profiles to authenticated;
grant select on table public.content_producer_access_grants to authenticated;
grant select on table public.content_producer_codes to authenticated;
grant select on table public.content_producer_rewards to authenticated;
grant select on table public.content_producer_adjustments to authenticated;
grant select on table public.content_producer_payouts to authenticated;
grant select on table public.content_producer_payout_items to authenticated;
grant select, insert, update, delete on table
  public.content_producer_profiles,
  public.content_producer_access_grants,
  public.content_producer_codes,
  public.content_producer_code_bindings,
  public.content_producer_rewards,
  public.content_producer_adjustments,
  public.content_producer_payouts,
  public.content_producer_payout_items
to service_role;

create policy "Producers read own profile" on public.content_producer_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Producers read own grant" on public.content_producer_access_grants
  for select to authenticated using ((select auth.uid()) = producer_id);
create policy "Producers read own code" on public.content_producer_codes
  for select to authenticated using ((select auth.uid()) = producer_id);
create policy "Producers read own rewards" on public.content_producer_rewards
  for select to authenticated using ((select auth.uid()) = producer_id);
create policy "Producers read own adjustments" on public.content_producer_adjustments
  for select to authenticated using ((select auth.uid()) = producer_id);
create policy "Producers read own payouts" on public.content_producer_payouts
  for select to authenticated using ((select auth.uid()) = producer_id);
create policy "Producers read own payout items" on public.content_producer_payout_items
  for select to authenticated using (
    exists (
      select 1 from public.content_producer_payouts payout
      where payout.id = payout_id and payout.producer_id = (select auth.uid())
    )
  );

-- One canonical fixed-term access calculator. The old six_months period is
-- retained only for historical rows and is never offered for new purchases.
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
  configured_end timestamptz;
begin
  if p_user_id is null or p_plan_code not in ('plus_2027', 'plus_2028') then
    raise exception using errcode = '22023', message = 'Satın alınan paket bilgisi geçersiz.';
  end if;
  configured_end := case p_plan_code
    when 'plus_2027' then timestamptz '2027-08-19 23:59:59+03'
    else timestamptz '2028-06-25 23:59:59+03'
  end;
  if configured_end <= purchased_at then
    raise exception using errcode = '22023', message = 'Seçilen YKS paketi satış süresini tamamladı.';
  end if;
  select * into current_row from public.user_subscriptions where user_id = p_user_id;
  period_start := case
    when current_row.status = 'active' and current_row.current_period_end > purchased_at
      then current_row.current_period_start
    else purchased_at
  end;
  period_end := greatest(
    configured_end,
    case when current_row.status = 'active' then current_row.current_period_end else configured_end end
  );
  return next;
end;
$$;
revoke all on function public.calculate_purchased_access_period(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.calculate_purchased_access_period(uuid, text, timestamptz)
  to service_role;

-- Preserve historical plus_2028 access while guaranteeing the new fixed end.
update public.user_subscriptions
set current_period_end = greatest(current_period_end, timestamptz '2028-06-25 23:59:59+03'),
    updated_at = now()
where plan_code = 'plus_2028'
  and status = 'active'
  and current_period_end < timestamptz '2028-06-25 23:59:59+03';

create or replace function public.content_producer_code_base(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    regexp_replace(
      translate(upper(coalesce(p_name, '')), 'ÇĞİÖŞÜÂÎÛ', 'CGIOSUAIU'),
      '[^A-Z0-9]+', '', 'g'
    ), 16
  );
$$;
revoke all on function public.content_producer_code_base(text) from public, anon, authenticated;

create or replace function public.generate_content_producer_code(p_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  base text := public.content_producer_code_base(p_name);
  candidate text;
  attempt integer := 0;
begin
  if char_length(base) < 3 or base in ('CALISIYO','ADMIN','DESTEK','SUPPORT','PLUS','UCRETSIZ','FREE','SHOPIER') then
    base := 'CAL' || coalesce(nullif(base, ''), 'URETICI');
  end if;
  loop
    candidate := left(base, 16) || case when attempt = 0 then '' else upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)) end;
    exit when not exists (select 1 from public.content_producer_codes c where upper(c.code) = upper(candidate));
    attempt := attempt + 1;
    if attempt > 20 then raise exception using errcode = 'P0001', message = 'Benzersiz indirim kodu üretilemedi.'; end if;
  end loop;
  return candidate;
end;
$$;
revoke all on function public.generate_content_producer_code(text) from public, anon, authenticated;

create or replace function public.admin_activate_content_producer(
  p_user_id uuid,
  p_plan_code text default 'plus_2027'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  profile_name text;
  code_row public.content_producer_codes%rowtype;
  grant_end timestamptz;
  previous_status text;
  previous_plan_code text;
begin
  if viewer is null or not exists (
    select 1 from public.user_roles r where r.user_id = viewer and r.role in ('admin','super_admin')
  ) then raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.'; end if;
  if p_plan_code not in ('plus_2027','plus_2028') then
    raise exception using errcode = '22023', message = 'Geçersiz üretici erişim planı.';
  end if;
  select p.full_name into profile_name from public.profiles p
  where p.id = p_user_id and p.account_status = 'active';
  if profile_name is null then raise exception using errcode = 'P0002', message = 'Aktif kullanıcı bulunamadı.'; end if;
  grant_end := case p_plan_code when 'plus_2027' then timestamptz '2027-08-19 23:59:59+03' else timestamptz '2028-06-25 23:59:59+03' end;
  if grant_end <= now() then raise exception using errcode='22023', message='Seçilen üretici erişim dönemi sona ermiş.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:producer:' || p_user_id::text, 0));
  select p.status into previous_status from public.content_producer_profiles p where p.user_id = p_user_id for update;
  select g.plan_code into previous_plan_code from public.content_producer_access_grants g
    where g.producer_id = p_user_id and g.status in ('active','suspended')
    order by g.created_at desc limit 1 for update;
  insert into public.content_producer_profiles(user_id,status,activated_by,activated_at,suspended_by,suspended_at,suspension_reason)
  values(p_user_id,'active',viewer,now(),null,null,null)
  on conflict(user_id) do update set status='active', suspended_by=null, suspended_at=null,
    suspension_reason=null, updated_at=now();
  update public.content_producer_access_grants set status='revoked', revoked_by=viewer,
    revoked_at=now(), revoke_reason='Yeni üretici grant’i ile değiştirildi.', updated_at=now()
  where producer_id=p_user_id and status in ('active','suspended');
  insert into public.content_producer_access_grants(producer_id,user_id,plan_code,status,starts_at,ends_at,created_by)
  values(p_user_id,p_user_id,p_plan_code,'active',now(),grant_end,viewer);
  select * into code_row from public.content_producer_codes
  where producer_id=p_user_id and status in ('pending','manual_required','active','suspended','review_required')
  order by created_at desc limit 1 for update;
  if code_row.id is null then
    insert into public.content_producer_codes(producer_id,code,status,created_by)
    values(p_user_id,public.generate_content_producer_code(profile_name),'manual_required',viewer)
    returning * into code_row;
  elsif code_row.status <> 'active' then
    update public.content_producer_codes set status='manual_required',updated_at=now()
    where id=code_row.id returning * into code_row;
  end if;
  insert into public.admin_audit_log(actor_id,action,target_user_id,details)
  values(viewer,case
      when previous_status = 'suspended' then 'content_producer_reactivated'
      when previous_status = 'active' and previous_plan_code is distinct from p_plan_code then 'content_producer_grant_target_changed'
      else 'content_producer_activated'
    end,p_user_id,jsonb_build_object(
    'planCode',p_plan_code,'grantEnd',grant_end,'codeId',code_row.id,'promoStatus',code_row.status
  ));
  insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key)
  values(p_user_id,'success','İçerik Üretici Programı etkin','Üretici panelin açıldı. İndirim kodun Shopier kapsam doğrulaması tamamlandığında kullanılabilir olacak.',
    '/dashboard/icerik-ureticisi','producer-activated-' || p_user_id::text)
  on conflict(user_id,dedupe_key) do nothing;
  return jsonb_build_object('userId',p_user_id,'status','active','planCode',p_plan_code,'grantEnd',grant_end,
    'code',code_row.code,'promoStatus',code_row.status,'manualRequired',code_row.status='manual_required');
end;
$$;
revoke all on function public.admin_activate_content_producer(uuid,text) from public,anon;
grant execute on function public.admin_activate_content_producer(uuid,text) to authenticated;

create or replace function public.admin_confirm_content_producer_code(
  p_user_id uuid,
  p_provider_discount_id text,
  p_scope_confirmed boolean,
  p_sync_action text default 'confirmed'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  code_row public.content_producer_codes%rowtype;
  bound_code_id uuid;
begin
  if viewer is null or not exists(select 1 from public.user_roles r where r.user_id=viewer and r.role in ('admin','super_admin')) then
    raise exception using errcode='42501', message='Yönetici yetkisi gerekli.';
  end if;
  if not coalesce(p_scope_confirmed,false) or p_provider_discount_id !~ '^[A-Za-z0-9_-]{1,160}$' then
    raise exception using errcode='22023', message='Shopier ürün kapsamı ve indirim kimliği doğrulanmalıdır.';
  end if;
  if p_sync_action not in ('confirmed','created','retry') then
    raise exception using errcode='22023', message='Promo senkronizasyon işlemi geçersiz.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:producer:' || p_user_id::text,0));
  select * into code_row from public.content_producer_codes where producer_id=p_user_id
    and status in ('manual_required','pending','review_required','active') order by created_at desc limit 1 for update;
  if code_row.id is null then raise exception using errcode='P0002', message='Üretici indirim kodu bulunamadı.'; end if;
  select b.code_id into bound_code_id
  from public.content_producer_code_bindings b
  where b.provider = 'shopier' and b.provider_discount_id = p_provider_discount_id
  for update;
  if bound_code_id is not null and bound_code_id <> code_row.id then
    raise exception using errcode='23505', message='Shopier indirim kimliği başka bir üreticiye bağlı.';
  end if;
  update public.content_producer_code_bindings set status='retired',valid_to=coalesce(valid_to,now()),updated_at=now()
  where code_id=code_row.id and status='active' and valid_to is null;
  insert into public.content_producer_code_bindings(code_id,provider_discount_id,status,valid_from,configuration,verified_by,verified_at)
  values(code_row.id,p_provider_discount_id,'active',now(),jsonb_build_object(
    'discountBps',2000,'currency','TRY','productScopeConfirmed',true,'productCodes',jsonb_build_array('plus_2027','plus_2028')
  ),viewer,now())
  on conflict(provider,provider_discount_id) do update set code_id=excluded.code_id,status='active',valid_from=excluded.valid_from,
    valid_to=null,configuration=excluded.configuration,verified_by=viewer,verified_at=now(),updated_at=now();
  update public.content_producer_codes set status='active',updated_at=now() where id=code_row.id;
  insert into public.admin_audit_log(actor_id,action,target_user_id,details)
  values(viewer,case p_sync_action
      when 'created' then 'content_producer_promo_created'
      when 'retry' then 'content_producer_promo_sync_retry'
      else 'content_producer_code_confirmed'
    end,p_user_id,jsonb_build_object('code',code_row.code,'providerDiscountId',p_provider_discount_id));
  return jsonb_build_object('userId',p_user_id,'code',code_row.code,'status','active','providerDiscountId',p_provider_discount_id);
end;
$$;
revoke all on function public.admin_confirm_content_producer_code(uuid,text,boolean,text) from public,anon;
grant execute on function public.admin_confirm_content_producer_code(uuid,text,boolean,text) to authenticated;

create or replace function public.admin_record_content_producer_promo_failure(
  p_user_id uuid,
  p_code text,
  p_error_code text,
  p_review_required boolean default false,
  p_retry boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare viewer uuid := (select auth.uid()); code_row public.content_producer_codes%rowtype;
begin
  if viewer is null or not exists (
    select 1 from public.user_roles r
    where r.user_id = viewer and r.role in ('admin', 'super_admin')
  ) then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;
  if p_error_code !~ '^[a-z0-9_:-]{2,80}$' then
    raise exception using errcode = '22023', message = 'Güvenli hata kodu gerekli.';
  end if;
  select * into code_row
  from public.content_producer_codes
  where producer_id = p_user_id and code = upper(btrim(p_code))
    and status in ('pending','manual_required','review_required')
  order by created_at desc limit 1 for update;
  if code_row.id is null then
    raise exception using errcode = 'P0002', message = 'Üretici indirim kodu bulunamadı.';
  end if;
  update public.content_producer_codes
  set status = case when p_review_required then 'review_required' else 'manual_required' end,
      updated_at = now()
  where id = code_row.id;
  insert into public.admin_audit_log(actor_id, action, target_user_id, details)
  values(viewer,
    case when p_retry then 'content_producer_promo_sync_retry_failed' else 'content_producer_promo_sync_failed' end,
    p_user_id,
    jsonb_build_object('codeId', code_row.id, 'errorCode', p_error_code, 'reviewRequired', p_review_required)
  );
  return jsonb_build_object(
    'userId', p_user_id,
    'code', code_row.code,
    'status', case when p_review_required then 'review_required' else 'manual_required' end
  );
end;
$$;
revoke all on function public.admin_record_content_producer_promo_failure(uuid,text,text,boolean,boolean) from public, anon;
grant execute on function public.admin_record_content_producer_promo_failure(uuid,text,text,boolean,boolean) to authenticated;

create or replace function public.admin_rotate_content_producer_code(
  p_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  profile_name text;
  old_code public.content_producer_codes%rowtype;
  new_code public.content_producer_codes%rowtype;
  old_provider_discount_id text;
begin
  if viewer is null or not exists (
    select 1 from public.user_roles r
    where r.user_id = viewer and r.role in ('admin', 'super_admin')
  ) then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
    raise exception using errcode = '22023', message = 'Kod değişikliği için geçerli bir neden gerekli.';
  end if;
  select pr.full_name into profile_name
  from public.content_producer_profiles cp
  join public.profiles pr on pr.id = cp.user_id
  where cp.user_id = p_user_id;
  if profile_name is null then
    raise exception using errcode = 'P0002', message = 'İçerik üreticisi bulunamadı.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:producer:' || p_user_id::text, 0)
  );
  select * into old_code
  from public.content_producer_codes
  where producer_id = p_user_id
    and status in ('pending', 'manual_required', 'active', 'suspended', 'review_required')
  order by created_at desc
  limit 1
  for update;
  if old_code.id is not null then
    select b.provider_discount_id into old_provider_discount_id
    from public.content_producer_code_bindings b
    where b.code_id = old_code.id and b.status = 'active' and b.valid_to is null
    order by b.created_at desc limit 1;
    update public.content_producer_code_bindings
    set status = 'retired', valid_to = coalesce(valid_to, now()), updated_at = now()
    where code_id = old_code.id and status in ('active', 'pending', 'manual_required', 'review_required');
    update public.content_producer_codes
    set status = 'retired', updated_at = now()
    where id = old_code.id;
  end if;
  insert into public.content_producer_codes(producer_id, code, status, created_by)
  values(p_user_id, public.generate_content_producer_code(profile_name), 'manual_required', viewer)
  returning * into new_code;
  insert into public.admin_audit_log(actor_id, action, target_user_id, details)
  values(viewer, 'content_producer_code_rotated', p_user_id, jsonb_build_object(
    'oldCodeId', old_code.id,
    'oldProviderDiscountId', old_provider_discount_id,
    'newCodeId', new_code.id,
    'newCode', new_code.code,
    'reason', btrim(p_reason),
    'externalDisableRequired', old_provider_discount_id is not null
  ));
  return jsonb_build_object(
    'userId', p_user_id,
    'code', new_code.code,
    'status', new_code.status,
    'oldProviderDiscountId', old_provider_discount_id,
    'externalDisableRequired', old_provider_discount_id is not null
  );
end;
$$;
revoke all on function public.admin_rotate_content_producer_code(uuid,text) from public, anon;
grant execute on function public.admin_rotate_content_producer_code(uuid,text) to authenticated;

create or replace function public.admin_suspend_content_producer(p_user_id uuid,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare viewer uuid := (select auth.uid()); provider_id text;
begin
  if viewer is null or not exists(select 1 from public.user_roles r where r.user_id=viewer and r.role in ('admin','super_admin')) then
    raise exception using errcode='42501', message='Yönetici yetkisi gerekli.';
  end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 3 and 500 then raise exception using errcode='22023', message='Geçerli askıya alma nedeni gerekli.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:producer:' || p_user_id::text,0));
  if not exists(select 1 from public.content_producer_profiles p where p.user_id=p_user_id for update) then
    raise exception using errcode='P0002', message='İçerik üreticisi bulunamadı.';
  end if;
  select b.provider_discount_id into provider_id from public.content_producer_code_bindings b
  join public.content_producer_codes c on c.id=b.code_id
  where c.producer_id=p_user_id and b.status='active' and b.valid_to is null limit 1;
  update public.content_producer_profiles set status='suspended',suspended_by=viewer,suspended_at=now(),
    suspension_reason=btrim(p_reason),updated_at=now() where user_id=p_user_id;
  update public.content_producer_access_grants set status='suspended',updated_at=now()
    where producer_id=p_user_id and status='active';
  update public.content_producer_codes set status='suspended',updated_at=now()
    where producer_id=p_user_id and status in ('active','manual_required','pending','review_required');
  update public.content_producer_code_bindings b set status='suspended',valid_to=now(),updated_at=now()
    from public.content_producer_codes c where b.code_id=c.id and c.producer_id=p_user_id and b.status='active' and b.valid_to is null;
  insert into public.admin_audit_log(actor_id,action,target_user_id,details)
  values(viewer,'content_producer_suspended',p_user_id,jsonb_build_object('reason',btrim(p_reason),'providerDiscountId',provider_id));
  insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key)
  values(p_user_id,'warning','İçerik Üretici Programı askıya alındı','Üretici erişimin ve kod ilişkilendirmen askıya alındı. Ücretli plan erişimin varsa etkilenmez.',
    '/dashboard/icerik-ureticisi','producer-suspended-' || extract(epoch from now())::bigint::text)
  on conflict(user_id,dedupe_key) do nothing;
  return jsonb_build_object('userId',p_user_id,'status','suspended','providerDiscountId',provider_id,'externalDisableRequired',provider_id is not null);
end;
$$;
revoke all on function public.admin_suspend_content_producer(uuid,text) from public,anon;
grant execute on function public.admin_suspend_content_producer(uuid,text) to authenticated;

create or replace function public.current_content_producer_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare viewer uuid := (select auth.uid()); result jsonb;
begin
  if viewer is null then raise exception using errcode='42501',message='Oturum gerekli.'; end if;
  select jsonb_build_object(
    'active',p.status='active','status',p.status,'activatedAt',p.activated_at,
    'code',case when c.status='active' then c.code else null end,
    'codePreview',c.code,'promoStatus',coalesce(c.status,'missing'),'discountPercent',20,
    'lifetimeQualifiedSales',p.lifetime_qualified_sale_count,
    'grantPlanCode',g.plan_code,'grantStartsAt',g.starts_at,'grantEndsAt',g.ends_at,
    'pendingMinor',coalesce(sum(r.reward_amount_minor) filter(where r.status='pending' and r.available_at>now()),0),
    'availableMinor',coalesce(sum(r.reward_amount_minor) filter(where r.status='available' or (r.status='pending' and r.available_at<=now() and not r.refund_hold)),0)
      + coalesce((select sum(a.amount_minor) from public.content_producer_adjustments a where a.producer_id=viewer and a.status='available'),0),
    'reservedMinor',coalesce(sum(r.reward_amount_minor) filter(where r.status='reserved'),0),
    'paidMinor',coalesce(sum(r.reward_amount_minor) filter(where r.status='paid'),0),
    'reversedMinor',coalesce(sum(r.reward_amount_minor) filter(where r.status in ('reversed','cancelled')),0),
    'recentRewards',coalesce((select jsonb_agg(item order by item->>'createdAt' desc) from (
      select jsonb_build_object('id',rw.id,'sequence',rw.lifetime_sequence,'amountMinor',rw.reward_amount_minor,
        'status',rw.status,'availableAt',rw.available_at,'createdAt',rw.created_at,'excludedReason',rw.exclusion_reason) item
      from public.content_producer_rewards rw where rw.producer_id=viewer order by rw.created_at desc limit 25
    ) q),'[]'::jsonb),
    'payouts',coalesce((select jsonb_agg(item order by item->>'createdAt' desc) from (
      select jsonb_build_object('id',po.id,'amountMinor',po.total_amount_minor,'status',po.status,
        'paidAt',po.paid_at,'createdAt',po.created_at) item
      from public.content_producer_payouts po where po.producer_id=viewer order by po.created_at desc limit 20
    ) q),'[]'::jsonb)
  ) into result
  from public.content_producer_profiles p
  left join lateral (select * from public.content_producer_codes x where x.producer_id=p.user_id order by x.created_at desc limit 1) c on true
  left join lateral (select x.plan_code,x.starts_at,x.ends_at from public.content_producer_access_grants x
    where x.producer_id=p.user_id and x.status in ('active','suspended') order by x.created_at desc limit 1) g on true
  left join public.content_producer_rewards r on r.producer_id=p.user_id
  where p.user_id=viewer group by p.user_id,p.status,p.activated_at,p.lifetime_qualified_sale_count,c.code,c.status,g.plan_code,g.starts_at,g.ends_at;
  return coalesce(result,jsonb_build_object('active',false,'status','not_enrolled'));
end;
$$;
revoke all on function public.current_content_producer_summary() from public,anon;
grant execute on function public.current_content_producer_summary() to authenticated;

create or replace function public.admin_list_content_producers()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare viewer uuid := (select auth.uid()); result jsonb;
begin
  if viewer is null or not exists(select 1 from public.user_roles r where r.user_id=viewer and r.role in ('admin','super_admin')) then
    raise exception using errcode='42501',message='Yönetici yetkisi gerekli.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId',p.user_id,'name',pr.full_name,'email',u.email,'status',p.status,'activatedAt',p.activated_at,
    'lifetimeSales',p.lifetime_qualified_sale_count,'code',c.code,'promoStatus',c.status,
    'providerDiscountId',b.provider_discount_id,
    'pendingMinor',coalesce(s.pending_minor,0),'availableMinor',coalesce(s.available_minor,0),'paidMinor',coalesce(s.paid_minor,0),
    'grantPlanCode',g.plan_code,'grantEndsAt',g.ends_at,
    'reservedPayout',case when po.id is null then null else jsonb_build_object(
      'id',po.id,'amountMinor',po.total_amount_minor,'createdAt',po.created_at
    ) end
  ) order by p.created_at desc),'[]'::jsonb) into result
  from public.content_producer_profiles p
  join public.profiles pr on pr.id=p.user_id
  join auth.users u on u.id=p.user_id
  left join lateral(select * from public.content_producer_codes x where x.producer_id=p.user_id order by x.created_at desc limit 1)c on true
  left join lateral(select * from public.content_producer_code_bindings x where x.code_id=c.id order by x.created_at desc limit 1)b on true
  left join lateral(select
    sum(reward_amount_minor) filter(where status='pending' and available_at>now()) pending_minor,
    sum(reward_amount_minor) filter(where status='available' or(status='pending' and available_at<=now() and not refund_hold)) available_minor,
    sum(reward_amount_minor) filter(where status='paid') paid_minor
    from public.content_producer_rewards x where x.producer_id=p.user_id)s on true
  left join lateral(select x.plan_code,x.ends_at from public.content_producer_access_grants x
    where x.producer_id=p.user_id and x.status in ('active','suspended') order by x.created_at desc limit 1)g on true
  left join lateral(select x.id,x.total_amount_minor,x.created_at from public.content_producer_payouts x
    where x.producer_id=p.user_id and x.status='reserved' order by x.created_at desc limit 1)po on true;
  return result;
end;
$$;
revoke all on function public.admin_list_content_producers() from public,anon;
grant execute on function public.admin_list_content_producers() to authenticated;

create or replace function public.admin_content_producer_ledger(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare viewer uuid := (select auth.uid()); result jsonb;
begin
  if viewer is null or not exists (
    select 1 from public.user_roles r
    where r.user_id = viewer and r.role in ('admin', 'super_admin')
  ) then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;
  if not exists(select 1 from public.content_producer_profiles p where p.user_id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'İçerik üreticisi bulunamadı.';
  end if;
  select jsonb_build_object(
    'rewards', coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'orderNumber',o.order_number,'sequence',r.lifetime_sequence,
      'listAmountMinor',r.list_amount_minor,'paidAmountMinor',r.paid_amount_minor,
      'discountAmountMinor',r.discount_amount_minor,'rewardAmountMinor',r.reward_amount_minor,
      'status',r.status,'availableAt',r.available_at,'createdAt',r.created_at,
      'excludedReason',r.exclusion_reason,'refundHold',r.refund_hold
    ) order by r.created_at desc)
      from public.content_producer_rewards r
      join public.billing_orders o on o.id = r.order_id
      where r.producer_id = p_user_id), '[]'::jsonb),
    'adjustments', coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'kind',a.kind,'amountMinor',a.amount_minor,'status',a.status,
      'reason',a.reason,'createdAt',a.created_at
    ) order by a.created_at desc)
      from public.content_producer_adjustments a
      where a.producer_id = p_user_id), '[]'::jsonb),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'amountMinor',p.total_amount_minor,'status',p.status,
      'paymentReference',p.payment_reference,'paidAt',p.paid_at,'createdAt',p.created_at
    ) order by p.created_at desc)
      from public.content_producer_payouts p
      where p.producer_id = p_user_id), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_content_producer_ledger(uuid) from public, anon;
grant execute on function public.admin_content_producer_ledger(uuid) to authenticated;

create or replace function public.admin_create_content_producer_payout(p_user_id uuid,p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare viewer uuid := (select auth.uid()); payout_row public.content_producer_payouts%rowtype; total_minor bigint;
begin
  if viewer is null or not exists(select 1 from public.user_roles r where r.user_id=viewer and r.role in ('admin','super_admin')) then
    raise exception using errcode='42501',message='Yönetici yetkisi gerekli.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:producer-payout:' || p_user_id::text,0));
  if not exists(select 1 from public.content_producer_profiles p where p.user_id=p_user_id) then raise exception using errcode='P0002',message='İçerik üreticisi bulunamadı.'; end if;
  select coalesce(sum(v),0) into total_minor from (
    select reward_amount_minor v from public.content_producer_rewards r where r.producer_id=p_user_id
      and not r.refund_hold and ((r.status='pending' and r.available_at<=now()) or r.status='available')
      and not exists(select 1 from public.content_producer_payout_items i where i.reward_id=r.id)
    union all
    select amount_minor from public.content_producer_adjustments a where a.producer_id=p_user_id and a.status='available'
      and not exists(select 1 from public.content_producer_payout_items i where i.adjustment_id=a.id)
  ) amounts;
  if total_minor <= 0 then raise exception using errcode='22023',message='Ödemeye uygun pozitif kazanç bulunmuyor.'; end if;
  insert into public.content_producer_payouts(producer_id,status,total_amount_minor,created_by,note)
  values(p_user_id,'reserved',total_minor,viewer,nullif(btrim(coalesce(p_note,'')),'')) returning * into payout_row;
  insert into public.content_producer_payout_items(payout_id,reward_id,amount_minor)
  select payout_row.id,r.id,r.reward_amount_minor from public.content_producer_rewards r where r.producer_id=p_user_id
    and not r.refund_hold and ((r.status='pending' and r.available_at<=now()) or r.status='available')
    and not exists(select 1 from public.content_producer_payout_items i where i.reward_id=r.id);
  update public.content_producer_rewards r set status='reserved',payout_id=payout_row.id,updated_at=now()
    where exists(select 1 from public.content_producer_payout_items i where i.payout_id=payout_row.id and i.reward_id=r.id);
  insert into public.content_producer_payout_items(payout_id,adjustment_id,amount_minor)
  select payout_row.id,a.id,a.amount_minor from public.content_producer_adjustments a where a.producer_id=p_user_id and a.status='available'
    and not exists(select 1 from public.content_producer_payout_items i where i.adjustment_id=a.id);
  update public.content_producer_adjustments a set status='reserved',updated_at=now()
    where exists(select 1 from public.content_producer_payout_items i where i.payout_id=payout_row.id and i.adjustment_id=a.id);
  insert into public.admin_audit_log(actor_id,action,target_user_id,details)
  values(viewer,'content_producer_payout_reserved',p_user_id,jsonb_build_object('payoutId',payout_row.id,'amountMinor',total_minor));
  return jsonb_build_object('id',payout_row.id,'status','reserved','amountMinor',total_minor,'currency','TRY');
end;
$$;
revoke all on function public.admin_create_content_producer_payout(uuid,text) from public,anon;
grant execute on function public.admin_create_content_producer_payout(uuid,text) to authenticated;

create or replace function public.admin_mark_content_producer_payout_paid(p_payout_id uuid,p_reference text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare viewer uuid := (select auth.uid()); payout_row public.content_producer_payouts%rowtype;
begin
  if viewer is null or not exists(select 1 from public.user_roles r where r.user_id=viewer and r.role in ('admin','super_admin')) then
    raise exception using errcode='42501',message='Yönetici yetkisi gerekli.';
  end if;
  if char_length(btrim(coalesce(p_reference,''))) < 4 then raise exception using errcode='22023',message='Banka ödeme referansı gerekli.'; end if;
  select * into payout_row from public.content_producer_payouts where id=p_payout_id for update;
  if payout_row.id is null or payout_row.status <> 'reserved' then raise exception using errcode='22023',message='Ödeme kaydı işlenebilir durumda değil.'; end if;
  update public.content_producer_payouts set status='paid',payment_reference=btrim(p_reference),paid_by=viewer,paid_at=now(),updated_at=now() where id=p_payout_id;
  update public.content_producer_rewards r set status='paid',updated_at=now()
    where exists(select 1 from public.content_producer_payout_items i where i.payout_id=p_payout_id and i.reward_id=r.id);
  update public.content_producer_adjustments a set status='paid',updated_at=now()
    where exists(select 1 from public.content_producer_payout_items i where i.payout_id=p_payout_id and i.adjustment_id=a.id);
  insert into public.admin_audit_log(actor_id,action,target_user_id,details)
  values(viewer,'content_producer_payout_paid',payout_row.producer_id,jsonb_build_object('payoutId',payout_row.id,'amountMinor',payout_row.total_amount_minor,'reference',btrim(p_reference)));
  insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key)
  values(payout_row.producer_id,'success','Kazanç ödemen gönderildi','İçerik Üretici Programı kazanç ödemen banka transferiyle gönderildi.',
    '/dashboard/icerik-ureticisi','producer-payout-paid-' || payout_row.id::text)
  on conflict(user_id,dedupe_key) do nothing;
  return jsonb_build_object('id',payout_row.id,'status','paid','amountMinor',payout_row.total_amount_minor,'paidAt',now());
end;
$$;
revoke all on function public.admin_mark_content_producer_payout_paid(uuid,text) from public,anon;
grant execute on function public.admin_mark_content_producer_payout_paid(uuid,text) to authenticated;

create or replace function public.admin_create_content_producer_adjustment(
  p_user_id uuid,
  p_amount_minor bigint,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare viewer uuid := (select auth.uid()); adjustment_row public.content_producer_adjustments%rowtype;
begin
  if viewer is null or not exists (
    select 1 from public.user_roles r
    where r.user_id = viewer and r.role in ('admin', 'super_admin')
  ) then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;
  if p_amount_minor is null or p_amount_minor = 0 or abs(p_amount_minor) > 100000000 then
    raise exception using errcode = '22023', message = 'Düzeltme tutarı geçersiz.';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
    raise exception using errcode = '22023', message = 'Düzeltme nedeni gerekli.';
  end if;
  if not exists(select 1 from public.content_producer_profiles p where p.user_id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'İçerik üreticisi bulunamadı.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:producer-payout:' || p_user_id::text, 0)
  );
  insert into public.content_producer_adjustments(
    producer_id, kind, amount_minor, status, reason, created_by
  ) values(
    p_user_id,
    case when p_amount_minor > 0 then 'manual_credit' else 'manual_debit' end,
    p_amount_minor,
    'available',
    btrim(p_reason),
    viewer
  ) returning * into adjustment_row;
  insert into public.admin_audit_log(actor_id, action, target_user_id, details)
  values(viewer, 'content_producer_manual_adjustment', p_user_id, jsonb_build_object(
    'adjustmentId', adjustment_row.id,
    'amountMinor', adjustment_row.amount_minor,
    'reason', adjustment_row.reason
  ));
  return jsonb_build_object(
    'id', adjustment_row.id,
    'status', adjustment_row.status,
    'amountMinor', adjustment_row.amount_minor,
    'currency', adjustment_row.currency
  );
end;
$$;
revoke all on function public.admin_create_content_producer_adjustment(uuid,bigint,text) from public, anon;
grant execute on function public.admin_create_content_producer_adjustment(uuid,bigint,text) to authenticated;

-- Resolve paid/trial access and the additive producer grant without ever
-- overwriting a paid subscription.
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
  grant_row public.content_producer_access_grants%rowtype;
  source_name text := 'free';
begin
  if viewer is null then raise exception using errcode='42501',message='Oturum gerekli.'; end if;
  select * into subscription_row from public.user_subscriptions
  where user_id=viewer and status in ('active','trialing') and current_period_end>now() limit 1;
  if subscription_row.id is not null then
    select * into selected_plan from public.billing_plans where code=subscription_row.plan_code and is_active limit 1;
    source_name := case when subscription_row.status='trialing' then 'trial' else 'paid' end;
  else
    select g.* into grant_row from public.content_producer_access_grants g
    join public.content_producer_profiles p on p.user_id=g.producer_id and p.status='active'
    where g.user_id=viewer and g.status='active' and g.starts_at<=now() and g.ends_at>now()
    order by g.ends_at desc limit 1;
    if grant_row.id is not null then
      select * into selected_plan from public.billing_plans where code=grant_row.plan_code and is_active limit 1;
      source_name := 'content_producer';
    end if;
  end if;
  if selected_plan.code is null then select * into selected_plan from public.billing_plans where code='baslangic' limit 1; end if;
  return jsonb_build_object(
    'code',selected_plan.code,'name',selected_plan.name,'entitlements',selected_plan.entitlements,
    'status',case when source_name='free' then 'free' when source_name='content_producer' then 'granted' else subscription_row.status end,
    'source',source_name,
    'periodStart',case when source_name='content_producer' then grant_row.starts_at else subscription_row.current_period_start end,
    'periodEnd',case when source_name='content_producer' then grant_row.ends_at else subscription_row.current_period_end end,
    'cancelAtPeriodEnd',case when source_name='paid' then coalesce(subscription_row.cancel_at_period_end,true) else true end,
    'trialStartedAt',subscription_row.trial_started_at,'trialEndsAt',subscription_row.trial_ends_at
  );
end;
$$;
revoke all on function public.current_plan_details() from public,anon;
grant execute on function public.current_plan_details() to authenticated;

create or replace function public.create_shopier_billing_order(
  p_user_id uuid,p_order_number text,p_plan_code text,p_billing_period text,
  p_expected_product_id text,p_checkout_url text,p_legal_versions jsonb,
  p_legal_snapshot_hash text,p_immediate_service_consent boolean,p_adult_or_guardian_confirmed boolean
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
  fixed_end timestamptz;
begin
  if coalesce((select auth.jwt()->>'role'),'') <> 'service_role' then raise exception using errcode='42501',message='Sunucu ödeme işlemi gerekli.'; end if;
  if p_user_id is null or not exists(select 1 from public.profiles p where p.id=p_user_id and (p.account_status='active' or(p.account_status='suspended' and p.suspended_until<=clock_timestamp()))) then
    raise exception using errcode='42501',message='Aktif kullanıcı gerekli.';
  end if;
  if p_order_number !~ '^CAL-[0-9]{8}-[A-F0-9]{8}$' or p_expected_product_id !~ '^[A-Za-z0-9_-]{1,128}$' or p_checkout_url !~ '^https://www\.shopier\.com/[0-9]+/?$' then
    raise exception using errcode='22023',message='Shopier sipariş yapılandırması geçersiz.';
  end if;
  if not ((p_plan_code='plus_2027' and p_billing_period='yks_2027') or(p_plan_code='plus_2028' and p_billing_period='yks_2028')) then
    raise exception using errcode='22023',message='Geçersiz paket veya dönem.';
  end if;
  if not coalesce(p_immediate_service_consent,false) or not coalesce(p_adult_or_guardian_confirmed,false) then raise exception using errcode='22023',message='Zorunlu onaylar tamamlanmalıdır.'; end if;
  if jsonb_typeof(p_legal_versions)<>'object' or not(p_legal_versions ?& array['on_bilgilendirme','mesafeli_satis','iptal_iade','kvkk']) or length(coalesce(p_legal_snapshot_hash,'')) not between 32 and 128 then
    raise exception using errcode='22023',message='Yasal belge kaydı geçersiz.';
  end if;
  select lower(btrim(u.email)) into normalized_email from auth.users u where u.id=p_user_id;
  if normalized_email is null or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception using errcode='22023',message='Hesap e-postası ödeme için uygun değil.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:plan:' || p_user_id::text,0));
  select * into selected_plan from public.billing_plans where code=p_plan_code and is_active limit 1;
  if selected_plan.code is null or selected_plan.currency<>'TRY' then raise exception using errcode='P0002',message='Plan satışa açık değil.'; end if;
  fixed_end := case p_plan_code when 'plus_2027' then timestamptz '2027-08-19 23:59:59+03' else timestamptz '2028-06-25 23:59:59+03' end;
  if exists(select 1 from public.user_subscriptions s where s.user_id=p_user_id and s.plan_code=p_plan_code and s.status='active' and s.current_period_end>=fixed_end)
    or exists(select 1 from public.content_producer_access_grants g join public.content_producer_profiles cp on cp.user_id=g.producer_id and cp.status='active'
      where g.user_id=p_user_id and g.plan_code=p_plan_code and g.status='active' and g.ends_at>=fixed_end) then
    raise exception using errcode='23514',message='Bu YKS dönemi için erişimin zaten aktif.';
  end if;
  select * into existing_order from public.billing_orders where user_id=p_user_id and payment_provider='shopier' and plan_code=p_plan_code
    and expected_provider_product_id=p_expected_product_id and customer_email_snapshot=normalized_email
    and status in ('payment_link_ready','awaiting_review') and created_at>now()-interval '1 hour'
    order by created_at desc limit 1 for update;
  if existing_order.id is not null then return jsonb_build_object('id',existing_order.id,'orderNumber',existing_order.order_number,'planCode',existing_order.plan_code,
    'planName',selected_plan.name,'billingPeriod',existing_order.billing_period,'amount',existing_order.amount,'currency',existing_order.currency,
    'status',existing_order.status,'paymentUrl',existing_order.provider_checkout_url,'reused',true); end if;
  if (select count(*) from public.billing_orders where user_id=p_user_id and created_at>now()-interval '1 hour' and status in ('created','payment_link_ready','awaiting_review'))>=3 then
    raise exception using errcode='42901',message='Çok fazla açık sipariş var. Lütfen daha sonra tekrar deneyin.';
  end if;
  insert into public.billing_orders(order_number,user_id,plan_code,billing_period,amount,list_amount,currency,iyzico_conversation_id,legal_versions,legal_snapshot_hash,
    immediate_service_consent,adult_or_guardian_confirmed,payment_provider,customer_email_snapshot,expected_provider_product_id,provider_checkout_url,provider_status,status)
  values(p_order_number,p_user_id,selected_plan.code,p_billing_period,selected_plan.annual_price,selected_plan.annual_price,selected_plan.currency,p_order_number,p_legal_versions,
    p_legal_snapshot_hash,true,true,'shopier',normalized_email,p_expected_product_id,p_checkout_url,'checkout_ready','payment_link_ready') returning * into created_order;
  for legal_key,legal_version in select key,value from jsonb_each_text(p_legal_versions) loop
    insert into public.billing_legal_acceptances(order_id,user_id,document_key,document_version,snapshot_hash)
    values(created_order.id,p_user_id,legal_key,legal_version,p_legal_snapshot_hash);
  end loop;
  insert into public.billing_events(order_id,user_id,event_type,payload) values(created_order.id,p_user_id,'order_created',
    jsonb_build_object('provider','shopier','plan',selected_plan.code,'period',p_billing_period,'listAmount',created_order.amount,'currency',created_order.currency,'productId',p_expected_product_id));
  return jsonb_build_object('id',created_order.id,'orderNumber',created_order.order_number,'planCode',created_order.plan_code,'planName',selected_plan.name,
    'billingPeriod',created_order.billing_period,'amount',created_order.amount,'currency',created_order.currency,'status',created_order.status,'paymentUrl',created_order.provider_checkout_url,'reused',false);
end;
$$;
revoke all on function public.create_shopier_billing_order(uuid,text,text,text,text,text,jsonb,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.create_shopier_billing_order(uuid,text,text,text,text,text,jsonb,text,boolean,boolean) to service_role;

create or replace function public.provider_confirm_billing_order(p_order_id uuid,p_payment_reference text,p_provider_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.billing_orders%rowtype;
  period_start timestamptz; period_end timestamptz;
  provider_order_id text:=btrim(coalesce(p_provider_payload->>'providerOrderId',''));
  product_id text:=btrim(coalesce(p_provider_payload->>'productId',''));
  customer_email text:=lower(btrim(coalesce(p_provider_payload->>'customerEmail','')));
  currency_code text:=upper(btrim(coalesce(p_provider_payload->>'currency','')));
  payment_status text:=lower(btrim(coalesce(p_provider_payload->>'paymentStatus','')));
  provider_discount text:=nullif(btrim(coalesce(p_provider_payload->>'providerDiscountId','')),'');
  discount_method text:=nullif(btrim(coalesce(p_provider_payload->>'discountMethod','')),'');
  list_total numeric(10,2); paid_total numeric(10,2); discount_total numeric(10,2); quantity_value integer;
  paid_at timestamptz; producer_id uuid; sequence_value integer; reward_minor bigint;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception using errcode='42501',message='Sunucu doğrulaması gerekli.'; end if;
  if jsonb_typeof(coalesce(p_provider_payload,'{}'::jsonb))<>'object' or p_provider_payload->>'provider'<>'shopier' or length(btrim(coalesce(p_payment_reference,'')))<8 then
    raise exception using errcode='22023',message='Ödeme doğrulama kaydı geçersiz.';
  end if;
  begin
    list_total:=(p_provider_payload->>'listAmount')::numeric(10,2);
    paid_total:=(p_provider_payload->>'amount')::numeric(10,2);
    discount_total:=(p_provider_payload->>'discountAmount')::numeric(10,2);
    quantity_value:=(p_provider_payload->>'quantity')::integer;
    paid_at:=(p_provider_payload->>'paidAt')::timestamptz;
  exception when others then raise exception using errcode='22023',message='Provider finansal kanıtı geçersiz.'; end;
  select * into order_row from public.billing_orders where id=p_order_id and payment_provider='shopier' and status in ('payment_link_ready','awaiting_review') for update;
  if order_row.id is null then
    select * into order_row from public.billing_orders where id=p_order_id and payment_provider='shopier' and status='approved' and public.billing_orders.provider_order_id=provider_order_id;
    if order_row.id is not null then return jsonb_build_object('id',order_row.id,'status','approved','alreadyProcessed',true,'planCode',order_row.plan_code); end if;
    raise exception using errcode='P0002',message='Doğrulanabilir sipariş bulunamadı.';
  end if;
  if provider_order_id !~ '^[A-Za-z0-9_-]{1,160}$' or product_id<>order_row.expected_provider_product_id or customer_email<>order_row.customer_email_snapshot
    or currency_code<>order_row.currency or payment_status<>'paid' or quantity_value<>1 or list_total<>coalesce(order_row.list_amount,order_row.amount)
    or paid_total<=0 or discount_total<0 or paid_total+discount_total<>list_total then
    raise exception using errcode='22023',message='Shopier ödeme kanıtı siparişle eşleşmedi.';
  end if;
  if discount_total=0 then
    if provider_discount is not null then raise exception using errcode='22023',message='Beklenmeyen indirim kimliği.'; end if;
  else
    if discount_total<>round(list_total*0.20,2) or discount_method<>'discountCode' or provider_discount !~ '^[A-Za-z0-9_-]{1,160}$' then
      raise exception using errcode='22023',message='Shopier indirimi doğrulanamadı.';
    end if;
    select c.producer_id into producer_id from public.content_producer_code_bindings b
    join public.content_producer_codes c on c.id=b.code_id
    where b.provider='shopier' and b.provider_discount_id=provider_discount and b.valid_from<=paid_at and (b.valid_to is null or paid_at<b.valid_to)
      and b.configuration->>'productScopeConfirmed'='true' and c.discount_bps=2000 limit 1;
    if producer_id is null then raise exception using errcode='22023',message='Shopier indirim bağı bulunamadı.'; end if;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:billing:' || order_row.user_id::text,0));
  if exists(select 1 from public.billing_orders x where x.payment_provider='shopier' and x.provider_order_id=provider_order_id and x.id<>order_row.id)
    or exists(select 1 from public.billing_orders x where x.payment_reference=btrim(p_payment_reference) and x.status in ('approved','refunded') and x.id<>order_row.id) then
    raise exception using errcode='23505',message='Bu ödeme daha önce kullanılmış.';
  end if;
  select a.period_start,a.period_end into period_start,period_end from public.calculate_purchased_access_period(order_row.user_id,order_row.plan_code,paid_at)a;
  insert into public.user_subscriptions(user_id,plan_code,status,current_period_start,current_period_end,source_order_id,cancel_at_period_end,trial_started_at,trial_ends_at)
  values(order_row.user_id,order_row.plan_code,'active',period_start,period_end,order_row.id,true,null,null)
  on conflict(user_id) do update set plan_code=excluded.plan_code,status='active',current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
    source_order_id=excluded.source_order_id,cancel_at_period_end=true,trial_started_at=null,trial_ends_at=null,updated_at=now();
  update public.billing_orders set status='approved',payment_reference=btrim(p_payment_reference),provider_order_id=provider_order_id,provider_status=payment_status,
    provider_verified_at=now(),verified_at=now(),list_amount=list_total,paid_amount=paid_total,verified_discount_amount=discount_total,
    provider_discount_id=provider_discount,content_producer_id=producer_id,decision_note='Shopier API ile otomatik doğrulandı.',updated_at=now() where id=order_row.id;
  if producer_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:producer-reward:' || producer_id::text,0));
    if not exists(select 1 from public.content_producer_rewards r where r.order_id=order_row.id) then
      if producer_id=order_row.user_id then
        insert into public.content_producer_rewards(producer_id,order_id,provider_order_id,provider_discount_id,lifetime_sequence,list_amount_minor,paid_amount_minor,discount_amount_minor,reward_amount_minor,status,exclusion_reason,sale_paid_at,available_at)
        values(producer_id,order_row.id,provider_order_id,provider_discount,null,(list_total*100)::bigint,(paid_total*100)::bigint,(discount_total*100)::bigint,0,'cancelled','self_purchase',paid_at,paid_at+interval '14 days');
      else
        select lifetime_qualified_sale_count+1 into sequence_value from public.content_producer_profiles where user_id=producer_id for update;
        if sequence_value is null then raise exception using errcode='P0002',message='İçerik üreticisi bulunamadı.'; end if;
        reward_minor:=case when sequence_value<=3 then 100000 else 50000 end;
        if reward_minor>(paid_total*100)::bigint then raise exception using errcode='22023',message='Kazanç tahsilat tutarını aşamaz.'; end if;
        update public.content_producer_profiles set lifetime_qualified_sale_count=sequence_value,updated_at=now() where user_id=producer_id;
        insert into public.content_producer_rewards(producer_id,order_id,provider_order_id,provider_discount_id,lifetime_sequence,list_amount_minor,paid_amount_minor,discount_amount_minor,reward_amount_minor,status,sale_paid_at,available_at)
        values(producer_id,order_row.id,provider_order_id,provider_discount,sequence_value,(list_total*100)::bigint,(paid_total*100)::bigint,(discount_total*100)::bigint,reward_minor,'pending',paid_at,paid_at+interval '14 days');
        insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key)
        values(producer_id,'success','Yeni kazanç oluştu','İçerik Üretici Programı üzerinden doğrulanmış yeni bir satış kazancı oluştu.',
          '/dashboard/icerik-ureticisi','producer-reward-' || order_row.id::text) on conflict(user_id,dedupe_key) do nothing;
      end if;
    end if;
  end if;
  insert into public.billing_events(order_id,user_id,event_type,payload) values(order_row.id,order_row.user_id,'provider_confirmed',jsonb_build_object(
    'provider','shopier','providerOrderId',provider_order_id,'productId',product_id,'listAmount',list_total,'amount',paid_total,'discountAmount',discount_total,
    'providerDiscountId',provider_discount,'currency',currency_code,'quantity',quantity_value,'periodStart',period_start,'periodEnd',period_end));
  insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key) values(order_row.user_id,'success','calisiyo plus etkinleştirildi',
    'Plus erişimin '||to_char(period_end at time zone 'Europe/Istanbul','DD.MM.YYYY')||' tarihine kadar açık.','/dashboard/abonelik','billing-approved-'||order_row.id::text)
    on conflict(user_id,dedupe_key) do nothing;
  return jsonb_build_object('id',order_row.id,'status','approved','alreadyProcessed',false,'planCode',order_row.plan_code,'periodStart',period_start,'periodEnd',period_end);
end;
$$;
revoke all on function public.provider_confirm_billing_order(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.provider_confirm_billing_order(uuid,text,jsonb) to service_role;

create or replace function public.reconcile_shopier_refund(p_order_id uuid,p_refund_id text,p_refund_type text,p_refund_status text,p_refund_total numeric,p_currency text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare order_row public.billing_orders%rowtype; reward_row public.content_producer_rewards%rowtype; expected_total numeric(10,2); next_order_status text; next_provider_status text;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception using errcode='42501',message='Sunucu iade işlemi gerekli.'; end if;
  if p_refund_id !~ '^[A-Za-z0-9_-]{1,160}$' or p_refund_type not in('full','partial') or p_refund_status not in('pending','failed','succeeded')
    or p_refund_total is null or p_refund_total<=0 or upper(coalesce(p_currency,''))<>'TRY' then raise exception using errcode='22023',message='İade bilgisi geçersiz.'; end if;
  select * into order_row from public.billing_orders where id=p_order_id and payment_provider='shopier' for update;
  if order_row.id is null or order_row.provider_order_id is null then raise exception using errcode='P0002',message='İadeye bağlı sipariş bulunamadı.'; end if;
  expected_total:=coalesce(order_row.paid_amount,order_row.amount);
  if p_refund_total>expected_total or(p_refund_type='full' and p_refund_total<>expected_total) then raise exception using errcode='22023',message='İade tutarı siparişle eşleşmedi.'; end if;
  if order_row.provider_refund_id=p_refund_id and order_row.provider_refund_status='refund_'||p_refund_type||'_'||p_refund_status then
    return jsonb_build_object('id',order_row.id,'status',order_row.status,'refundStatus',order_row.provider_refund_status,'requiresReview',p_refund_status='succeeded','alreadyProcessed',true);
  end if;
  if order_row.provider_refund_id is not null and order_row.provider_refund_id<>p_refund_id then
    insert into public.billing_events(order_id,user_id,event_type,payload) values(order_row.id,order_row.user_id,'refund_review_required',jsonb_build_object('provider','shopier','refundId',p_refund_id,'reason','multiple_refunds_for_order'));
    return jsonb_build_object('id',order_row.id,'status',order_row.status,'refundStatus',order_row.provider_refund_status,'requiresReview',true,'reason','multiple_refunds_for_order');
  end if;
  next_order_status:=case when p_refund_status='succeeded' and p_refund_type='full' then 'refunded' else order_row.status end;
  next_provider_status:='refund_'||p_refund_type||'_'||p_refund_status;
  update public.billing_orders set status=next_order_status,provider_refund_id=p_refund_id,provider_refund_status=next_provider_status,
    provider_refunded_at=case when p_refund_status='succeeded' then now() else provider_refunded_at end,provider_status=next_provider_status,
    decision_note=case when p_refund_status='succeeded' and p_refund_type='full' then 'Tam iade doğrulandı; erişim değişikliği insan incelemesi gerektirir.'
      when p_refund_status='succeeded' then 'Kısmi iade insan incelemesi gerektirir.' else decision_note end,updated_at=now() where id=order_row.id;
  select * into reward_row from public.content_producer_rewards where order_id=order_row.id for update;
  if reward_row.id is not null then
    if p_refund_status='pending' then
      update public.content_producer_rewards set refund_hold=true,status=case when status in('pending','available') then 'review_required' else status end,updated_at=now() where id=reward_row.id;
    elsif p_refund_status='failed' then
      update public.content_producer_rewards set refund_hold=false,status=case when status='review_required' then case when available_at<=now() then 'available' else 'pending' end else status end,updated_at=now() where id=reward_row.id;
    elsif p_refund_type='partial' then
      update public.content_producer_rewards set refund_hold=true,status='review_required',updated_at=now() where id=reward_row.id;
    elsif reward_row.status='paid' then
      insert into public.content_producer_adjustments(producer_id,reward_id,order_id,kind,amount_minor,status,reason)
      values(reward_row.producer_id,reward_row.id,order_row.id,'refund_after_payout',-reward_row.reward_amount_minor,'available','Ödenmiş satış kazancının tam iadesi.')
      on conflict(reward_id,kind) where kind='refund_after_payout' do nothing;
      update public.content_producer_rewards set refund_hold=true,status='reversed',updated_at=now() where id=reward_row.id;
    else
      update public.content_producer_rewards set refund_hold=true,status='reversed',updated_at=now() where id=reward_row.id;
      update public.content_producer_payouts p set status='review_required',updated_at=now()
      where p.id=reward_row.payout_id and p.status='reserved';
    end if;
  end if;
  insert into public.billing_events(order_id,user_id,event_type,payload) values(order_row.id,order_row.user_id,'refund_'||p_refund_status,jsonb_build_object(
    'provider','shopier','refundId',p_refund_id,'refundType',p_refund_type,'refundStatus',p_refund_status,'total',p_refund_total,'currency','TRY','requiresReview',p_refund_status='succeeded'));
  if p_refund_status='succeeded' then insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key)
    values(order_row.user_id,'info','İade durumu güncellendi','Shopier iade işlemin doğrulandı. Erişim durumun destek ekibi tarafından güvenle incelenecek.',
      '/dashboard/abonelik','billing-refund-'||p_refund_id) on conflict(user_id,dedupe_key) do nothing; end if;
  return jsonb_build_object('id',order_row.id,'status',next_order_status,'refundStatus',next_provider_status,'requiresReview',p_refund_status='succeeded');
end;
$$;
revoke all on function public.reconcile_shopier_refund(uuid,text,text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.reconcile_shopier_refund(uuid,text,text,text,numeric,text) to service_role;
