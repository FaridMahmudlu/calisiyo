-- Privacy-minimized, signup-only content producer attribution and automatic
-- creator-product billing. The raw claim token never reaches the database.

create table if not exists public.content_producer_signup_claims (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  producer_id uuid not null references public.content_producer_profiles(user_id) on delete restrict,
  code_id uuid not null references public.content_producer_codes(id) on delete restrict,
  code_snapshot text not null check (code_snapshot ~ '^[A-Z0-9]{4,24}$'),
  discount_bps_snapshot integer not null check (discount_bps_snapshot = 2000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint content_producer_signup_claim_period check (
    expires_at > created_at and expires_at <= created_at + interval '7 days 1 minute'
  )
);

alter table public.content_producer_signup_claims
  drop constraint if exists content_producer_signup_claim_period;
alter table public.content_producer_signup_claims
  add constraint content_producer_signup_claim_period check (
    expires_at > created_at and expires_at <= created_at + interval '7 days 1 minute'
  );

create table if not exists public.content_producer_signup_attributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  producer_id uuid not null references public.content_producer_profiles(user_id) on delete restrict,
  code_id uuid not null references public.content_producer_codes(id) on delete restrict,
  code_snapshot text not null check (code_snapshot ~ '^[A-Z0-9]{4,24}$'),
  discount_bps_snapshot integer not null check (discount_bps_snapshot = 2000),
  claim_id uuid unique references public.content_producer_signup_claims(id) on delete set null,
  attributed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint content_producer_signup_attribution_not_self check (producer_id <> user_id)
);

alter table public.content_producer_signup_attributions
  drop constraint if exists content_producer_signup_attributions_claim_id_fkey;
alter table public.content_producer_signup_attributions
  add constraint content_producer_signup_attributions_claim_id_fkey
  foreign key (claim_id)
  references public.content_producer_signup_claims(id)
  on delete set null;

create index if not exists content_producer_signup_attributions_producer_date_idx
  on public.content_producer_signup_attributions (producer_id, attributed_at desc);
create index if not exists content_producer_signup_attributions_code_idx
  on public.content_producer_signup_attributions (code_id);
create index if not exists content_producer_signup_claims_expiry_idx
  on public.content_producer_signup_claims (expires_at)
  where consumed_at is null;
create index if not exists content_producer_signup_claims_created_idx
  on public.content_producer_signup_claims (created_at desc)
  where consumed_at is null;
create index if not exists content_producer_signup_claims_consumed_idx
  on public.content_producer_signup_claims (consumed_at)
  where consumed_at is not null;

alter table public.content_producer_signup_claims enable row level security;
alter table public.content_producer_signup_attributions enable row level security;
revoke all on table public.content_producer_signup_claims from public, anon, authenticated;
revoke all on table public.content_producer_signup_attributions from public, anon, authenticated;
grant all on table public.content_producer_signup_claims to service_role;
grant all on table public.content_producer_signup_attributions to service_role;

alter table public.billing_orders
  add column if not exists creator_signup_attribution_id uuid references public.content_producer_signup_attributions(id) on delete restrict,
  add column if not exists pricing_source text not null default 'standard',
  add column if not exists expected_paid_amount numeric(10,2),
  add column if not exists expected_discount_amount numeric(10,2);

alter table public.billing_orders drop constraint if exists billing_orders_pricing_source_valid;
alter table public.billing_orders add constraint billing_orders_pricing_source_valid
  check (pricing_source in ('standard', 'shopier_discount_code', 'signup_creator_code'));
alter table public.billing_orders drop constraint if exists billing_orders_expected_creator_price_valid;
alter table public.billing_orders add constraint billing_orders_expected_creator_price_valid check (
  (pricing_source <> 'signup_creator_code' and creator_signup_attribution_id is null)
  or (
    creator_signup_attribution_id is not null
    and expected_paid_amount is not null and expected_paid_amount > 0
    and expected_discount_amount is not null and expected_discount_amount > 0
    and list_amount is not null
    and expected_paid_amount + expected_discount_amount = list_amount
  )
);
create index if not exists billing_orders_creator_attribution_idx
  on public.billing_orders (creator_signup_attribution_id)
  where creator_signup_attribution_id is not null;

alter table public.content_producer_rewards
  alter column provider_discount_id drop not null,
  add column if not exists reward_source text not null default 'shopier_discount_code',
  add column if not exists signup_attribution_id uuid references public.content_producer_signup_attributions(id) on delete restrict;

alter table public.content_producer_rewards drop constraint if exists content_producer_rewards_source_valid;
alter table public.content_producer_rewards add constraint content_producer_rewards_source_valid check (
  (reward_source = 'shopier_discount_code' and provider_discount_id is not null and signup_attribution_id is null)
  or (reward_source = 'signup_creator_code' and provider_discount_id is null and signup_attribution_id is not null)
);
create index if not exists content_producer_rewards_signup_attribution_idx
  on public.content_producer_rewards (signup_attribution_id)
  where signup_attribution_id is not null;

create or replace function public.service_validate_content_producer_signup_code(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_code text := public.normalize_content_producer_code(p_code);
  code_row public.content_producer_codes%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu yetkisi gerekli.';
  end if;
  if char_length(normalized_code) not between 4 and 24 then
    raise exception using errcode = 'P0002', message = 'Kod kullanılamıyor.';
  end if;

  select c.* into code_row
  from public.content_producer_codes c
  join public.content_producer_profiles p on p.user_id = c.producer_id and p.status = 'active'
  where upper(c.code) = upper(normalized_code)
    and c.status = 'active'
    and c.discount_bps = 2000
    and exists (
      select 1 from public.content_producer_code_bindings b
      where b.code_id = c.id
        and b.provider = 'shopier'
        and b.status = 'active'
        and b.valid_from <= now()
        and (b.valid_to is null or now() < b.valid_to)
        and b.configuration ->> 'productScopeConfirmed' = 'true'
    )
  limit 1;
  if code_row.id is null then
    raise exception using errcode = 'P0002', message = 'Kod kullanılamıyor.';
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', code_row.code,
    'discountPercent', code_row.discount_bps / 100
  );
end;
$$;
revoke all on function public.service_validate_content_producer_signup_code(text)
  from public, anon, authenticated;
grant execute on function public.service_validate_content_producer_signup_code(text)
  to service_role;

create or replace function public.service_create_content_producer_signup_claim(
  p_code text,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := public.normalize_content_producer_code(p_code);
  code_row public.content_producer_codes%rowtype;
  claim_row public.content_producer_signup_claims%rowtype;
  recent_claims bigint;
  outstanding_claims bigint;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu yetkisi gerekli.';
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or char_length(normalized_code) not between 4 and 24 then
    raise exception using errcode = '22023', message = 'Kod kullanılamıyor.';
  end if;

  select c.* into code_row
  from public.content_producer_codes c
  join public.content_producer_profiles p on p.user_id = c.producer_id and p.status = 'active'
  where upper(c.code) = upper(normalized_code)
    and c.status = 'active'
    and c.discount_bps = 2000
    and exists (
      select 1 from public.content_producer_code_bindings b
      where b.code_id = c.id
        and b.provider = 'shopier'
        and b.status = 'active'
        and b.valid_from <= now()
        and (b.valid_to is null or now() < b.valid_to)
        and b.configuration ->> 'productScopeConfirmed' = 'true'
    )
  limit 1;
  if code_row.id is null then
    raise exception using errcode = 'P0002', message = 'Kod kullanılamıyor.';
  end if;

  -- Database safety fuse. The primary request limiter belongs at the edge;
  -- this global cap avoids a small per-code quota that could block one creator.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:creator-signup-claims', 0)
  );
  with stale as (
    select c.id
    from public.content_producer_signup_claims c
    where (c.consumed_at is not null and c.consumed_at < now() - interval '14 days')
       or (c.consumed_at is null and c.expires_at < now() - interval '14 days')
    order by coalesce(c.consumed_at, c.expires_at)
    limit 100
    for update skip locked
  )
  delete from public.content_producer_signup_claims c
  using stale
  where c.id = stale.id;

  select count(*) into recent_claims
  from public.content_producer_signup_claims c
  where c.consumed_at is null
    and c.created_at >= now() - interval '1 minute';
  select count(*) into outstanding_claims
  from public.content_producer_signup_claims c
  where c.consumed_at is null and c.expires_at > now();

  if recent_claims >= 600 or outstanding_claims >= 50000 then
    raise exception using errcode = 'P4290', message = 'Kod doğrulama geçici olarak yoğun.';
  end if;

  insert into public.content_producer_signup_claims(
    token_hash, producer_id, code_id, code_snapshot, discount_bps_snapshot, expires_at
  ) values (
    p_token_hash, code_row.producer_id, code_row.id, code_row.code, code_row.discount_bps,
    now() + interval '7 days'
  ) returning * into claim_row;

  return jsonb_build_object(
    'valid', true,
    'code', claim_row.code_snapshot,
    'discountPercent', claim_row.discount_bps_snapshot / 100,
    'expiresAt', claim_row.expires_at
  );
end;
$$;
revoke all on function public.service_create_content_producer_signup_claim(text,text)
  from public, anon, authenticated;
grant execute on function public.service_create_content_producer_signup_claim(text,text)
  to service_role;

create or replace function public.service_purge_expired_content_producer_signup_claims()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_count integer;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu yetkisi gerekli.';
  end if;
  with stale as (
    select c.id
    from public.content_producer_signup_claims c
    where (c.consumed_at is not null and c.consumed_at < now() - interval '14 days')
       or (c.consumed_at is null and c.expires_at < now() - interval '14 days')
    order by coalesce(c.consumed_at, c.expires_at)
    limit 500
    for update skip locked
  )
  delete from public.content_producer_signup_claims c
  using stale
  where c.id = stale.id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.service_purge_expired_content_producer_signup_claims()
  from public, anon, authenticated;
grant execute on function public.service_purge_expired_content_producer_signup_claims()
  to service_role;

create or replace function public.service_claim_content_producer_signup_attribution(
  p_user_id uuid,
  p_claim_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_row public.content_producer_signup_claims%rowtype;
  existing_row public.content_producer_signup_attributions%rowtype;
  user_created_at timestamptz;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu yetkisi gerekli.';
  end if;
  if p_user_id is null or p_claim_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Atıf talebi geçersiz.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:creator-signup:' || p_user_id::text, 0)
  );
  select * into claim_row
  from public.content_producer_signup_claims c
  where c.token_hash = p_claim_token_hash
  for update;
  if claim_row.id is null then
    raise exception using errcode = 'P0002', message = 'Atıf talebi bulunamadı.';
  end if;

  select * into existing_row
  from public.content_producer_signup_attributions a
  where a.user_id = p_user_id;
  if existing_row.id is not null then
    if existing_row.claim_id = claim_row.id and claim_row.consumed_at is not null then
      return jsonb_build_object('attributed', true, 'alreadyProcessed', true);
    end if;
    raise exception using errcode = '23505', message = 'Hesap daha önce ilişkilendirilmiş.';
  end if;
  if claim_row.consumed_at is not null or now() > claim_row.expires_at then
    raise exception using errcode = '22023', message = 'Atıf talebi kullanılamıyor.';
  end if;

  select u.created_at into user_created_at from auth.users u where u.id = p_user_id;
  if user_created_at is null
     or user_created_at < claim_row.created_at - interval '5 seconds'
     or user_created_at > claim_row.expires_at then
    raise exception using errcode = '42501', message = 'Yalnızca yeni hesaplar ilişkilendirilebilir.';
  end if;
  if claim_row.producer_id = p_user_id then
    raise exception using errcode = '42501', message = 'Kendi hesabın ilişkilendirilemez.';
  end if;
  if not exists (
    select 1
    from public.content_producer_codes c
    join public.content_producer_profiles p on p.user_id = c.producer_id
    where c.id = claim_row.code_id
      and c.producer_id = claim_row.producer_id
      and p.status = 'active'
      and c.discount_bps = claim_row.discount_bps_snapshot
  ) then
    raise exception using errcode = '22023', message = 'İçerik üretici ilişkisi kullanılamıyor.';
  end if;

  insert into public.content_producer_signup_attributions(
    user_id, producer_id, code_id, code_snapshot, discount_bps_snapshot, claim_id
  ) values (
    p_user_id, claim_row.producer_id, claim_row.code_id, claim_row.code_snapshot,
    claim_row.discount_bps_snapshot, claim_row.id
  );
  update public.content_producer_signup_claims
  set consumed_at = now()
  where id = claim_row.id;

  return jsonb_build_object('attributed', true, 'alreadyProcessed', false);
end;
$$;
revoke all on function public.service_claim_content_producer_signup_attribution(uuid,text)
  from public, anon, authenticated;
grant execute on function public.service_claim_content_producer_signup_attribution(uuid,text)
  to service_role;

create or replace function public.service_content_producer_checkout_context(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu yetkisi gerekli.';
  end if;
  select jsonb_build_object(
    'attributed', true,
    'eligible', a.discount_bps_snapshot = 2000,
    'reason', null,
    'attributionId', a.id,
    'producerId', a.producer_id,
    'code', a.code_snapshot,
    'discountBps', a.discount_bps_snapshot
  ) into result
  from public.content_producer_signup_attributions a
  where a.user_id = p_user_id;
  return coalesce(result, jsonb_build_object('attributed', false, 'eligible', false));
end;
$$;
revoke all on function public.service_content_producer_checkout_context(uuid)
  from public, anon, authenticated;
grant execute on function public.service_content_producer_checkout_context(uuid)
  to service_role;

create or replace function public.content_producer_growth_summary_for(
  p_producer_id uuid,
  p_range text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  range_key text := lower(btrim(coalesce(p_range, '30d')));
  cutoff timestamptz;
  registrations_count bigint;
  activated_count bigint;
  trials_count bigint;
  paid_count bigint;
  sales_count bigint;
begin
  if range_key not in ('7d', '30d', 'all') then
    raise exception using errcode = '22023', message = 'Geçersiz tarih aralığı.';
  end if;
  cutoff := case range_key when '7d' then now() - interval '7 days'
    when '30d' then now() - interval '30 days' else null end;

  with cohort as materialized (
    select a.id, a.user_id, a.attributed_at
    from public.content_producer_signup_attributions a
    where a.producer_id = p_producer_id
      and (cutoff is null or a.attributed_at >= cutoff)
  )
  select
    count(*),
    count(*) filter (where exists (
      select 1 from public.xp_events x
      where x.user_id = cohort.user_id
        and x.created_at >= cohort.attributed_at
        and x.created_at < cohort.attributed_at + interval '7 days'
      group by x.user_id
      having bool_or(x.event_type = 'daily_focus') or count(*) >= 2
    )),
    count(*) filter (where exists (
      select 1 from public.billing_events e
      where e.user_id = cohort.user_id and e.event_type = 'trial_started'
        and e.created_at >= cohort.attributed_at
    )),
    count(*) filter (where exists (
      select 1 from public.billing_orders o
      where o.user_id = cohort.user_id and o.status = 'approved'
        and coalesce(o.provider_refund_status, '') not in ('refund_full_succeeded', 'refund_partial_succeeded')
        and o.verified_at >= cohort.attributed_at
    ))
  into registrations_count, activated_count, trials_count, paid_count
  from cohort;

  select count(*) into sales_count
  from public.content_producer_rewards r
  join public.billing_orders o on o.id = r.order_id
  join public.content_producer_signup_attributions a
    on a.user_id = o.user_id and a.producer_id = r.producer_id
  where r.producer_id = p_producer_id
    and r.status in ('pending', 'available', 'reserved', 'paid')
    and r.sale_paid_at >= a.attributed_at
    and (cutoff is null or a.attributed_at >= cutoff);

  return jsonb_build_object(
    'range', range_key,
    'registrations', coalesce(registrations_count, 0),
    'activated', coalesce(activated_count, 0),
    'trials', coalesce(trials_count, 0),
    'paidConversions', coalesce(paid_count, 0),
    'verifiedSales', coalesce(sales_count, 0),
    'activationRate', case when registrations_count > 0 then round(activated_count * 100.0 / registrations_count, 1) else 0 end,
    'trialRate', case when registrations_count > 0 then round(trials_count * 100.0 / registrations_count, 1) else 0 end,
    'paidRate', case when registrations_count > 0 then round(paid_count * 100.0 / registrations_count, 1) else 0 end
  );
end;
$$;
revoke all on function public.content_producer_growth_summary_for(uuid,text)
  from public, anon, authenticated;

create or replace function public.current_content_producer_growth_summary(p_range text default '30d')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare viewer uuid := (select auth.uid());
begin
  if viewer is null then raise exception using errcode = '42501', message = 'Oturum gerekli.'; end if;
  if not exists (select 1 from public.content_producer_profiles p where p.user_id = viewer) then
    raise exception using errcode = '42501', message = 'İçerik üreticisi hesabı gerekli.';
  end if;
  return public.content_producer_growth_summary_for(viewer, p_range);
end;
$$;
revoke all on function public.current_content_producer_growth_summary(text) from public, anon;
grant execute on function public.current_content_producer_growth_summary(text) to authenticated;

create or replace function public.admin_content_producer_growth_overview(p_range text default '30d')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if coalesce(public.current_admin_role(), '') not in ('admin', 'super_admin') then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;
  if lower(btrim(coalesce(p_range, '30d'))) not in ('7d', '30d', 'all') then
    raise exception using errcode = '22023', message = 'Geçersiz tarih aralığı.';
  end if;
  select coalesce(jsonb_agg(
    public.content_producer_growth_summary_for(p.user_id, p_range)
      || jsonb_build_object('userId', p.user_id)
    order by p.activated_at desc
  ), '[]'::jsonb) into result
  from public.content_producer_profiles p;
  return result;
end;
$$;
revoke all on function public.admin_content_producer_growth_overview(text) from public, anon;
grant execute on function public.admin_content_producer_growth_overview(text) to authenticated;

create or replace function public.create_shopier_billing_order_v2(
  p_user_id uuid, p_order_number text, p_plan_code text, p_billing_period text,
  p_expected_product_id text, p_checkout_url text, p_legal_versions jsonb,
  p_legal_snapshot_hash text, p_immediate_service_consent boolean,
  p_adult_or_guardian_confirmed boolean, p_pricing_source text,
  p_creator_signup_attribution_id uuid, p_expected_paid_amount numeric,
  p_expected_discount_amount numeric
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
  attribution_row public.content_producer_signup_attributions%rowtype;
  normalized_email text;
  legal_key text; legal_version text; fixed_end timestamptz;
  expected_paid numeric(10,2); expected_discount numeric(10,2);
begin
  if coalesce((select auth.jwt()->>'role'),'') <> 'service_role' then raise exception using errcode='42501',message='Sunucu ödeme işlemi gerekli.'; end if;
  if p_user_id is null or not exists(select 1 from public.profiles p where p.id=p_user_id and (p.account_status='active' or(p.account_status='suspended' and p.suspended_until<=clock_timestamp()))) then raise exception using errcode='42501',message='Aktif kullanıcı gerekli.'; end if;
  if p_order_number !~ '^CAL-[0-9]{8}-[A-F0-9]{8}$' or p_expected_product_id !~ '^[A-Za-z0-9_-]{1,128}$' or p_checkout_url !~ '^https://www\.shopier\.com/[0-9]+/?$' then raise exception using errcode='22023',message='Shopier sipariş yapılandırması geçersiz.'; end if;
  if not ((p_plan_code='plus_2027' and p_billing_period='yks_2027') or(p_plan_code='plus_2028' and p_billing_period='yks_2028')) then raise exception using errcode='22023',message='Geçersiz paket veya dönem.'; end if;
  if not coalesce(p_immediate_service_consent,false) or not coalesce(p_adult_or_guardian_confirmed,false) then raise exception using errcode='22023',message='Zorunlu onaylar tamamlanmalıdır.'; end if;
  if jsonb_typeof(p_legal_versions)<>'object' or not(p_legal_versions ?& array['on_bilgilendirme','mesafeli_satis','iptal_iade','kvkk']) or length(coalesce(p_legal_snapshot_hash,'')) not between 32 and 128 then raise exception using errcode='22023',message='Yasal belge kaydı geçersiz.'; end if;
  if p_pricing_source not in ('standard','signup_creator_code') then raise exception using errcode='22023',message='Fiyat kaynağı geçersiz.'; end if;
  select lower(btrim(u.email)) into normalized_email from auth.users u where u.id=p_user_id;
  if normalized_email is null or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception using errcode='22023',message='Hesap e-postası ödeme için uygun değil.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:plan:' || p_user_id::text,0));
  select * into selected_plan from public.billing_plans where code=p_plan_code and is_active limit 1;
  if selected_plan.code is null or selected_plan.currency<>'TRY' then raise exception using errcode='P0002',message='Plan satışa açık değil.'; end if;

  if p_pricing_source = 'signup_creator_code' then
    select a.* into attribution_row
    from public.content_producer_signup_attributions a
    where a.id=p_creator_signup_attribution_id and a.user_id=p_user_id and a.discount_bps_snapshot=2000
    for update of a;
    if attribution_row.id is null then raise exception using errcode='42501',message='İçerik üretici indirimi kullanılamıyor.'; end if;
    expected_discount := round(selected_plan.annual_price * attribution_row.discount_bps_snapshot / 10000.0, 2);
    expected_paid := selected_plan.annual_price - expected_discount;
  else
    if p_creator_signup_attribution_id is not null then raise exception using errcode='22023',message='Beklenmeyen içerik üretici ilişkisi.'; end if;
    expected_discount := 0; expected_paid := selected_plan.annual_price;
  end if;
  if p_expected_paid_amount is distinct from expected_paid or p_expected_discount_amount is distinct from expected_discount then raise exception using errcode='22023',message='Sipariş tutarı sunucu fiyatıyla eşleşmedi.'; end if;

  fixed_end := case p_plan_code when 'plus_2027' then timestamptz '2027-08-19 23:59:59+03' else timestamptz '2028-06-25 23:59:59+03' end;
  if exists(select 1 from public.user_subscriptions s where s.user_id=p_user_id and s.plan_code=p_plan_code and s.status='active' and s.current_period_end>=fixed_end)
    or exists(select 1 from public.content_producer_access_grants g join public.content_producer_profiles cp on cp.user_id=g.producer_id and cp.status='active' where g.user_id=p_user_id and g.plan_code=p_plan_code and g.status='active' and g.ends_at>=fixed_end) then raise exception using errcode='23514',message='Bu YKS dönemi için erişimin zaten aktif.'; end if;
  select * into existing_order from public.billing_orders where user_id=p_user_id and payment_provider='shopier' and plan_code=p_plan_code and expected_provider_product_id=p_expected_product_id and customer_email_snapshot=normalized_email and pricing_source=p_pricing_source and status in ('payment_link_ready','awaiting_review') and created_at>now()-interval '1 hour' order by created_at desc limit 1 for update;
  if existing_order.id is not null then return jsonb_build_object('id',existing_order.id,'orderNumber',existing_order.order_number,'planCode',existing_order.plan_code,'planName',selected_plan.name,'billingPeriod',existing_order.billing_period,'amount',existing_order.amount,'listAmount',existing_order.list_amount,'discountAmount',existing_order.expected_discount_amount,'currency',existing_order.currency,'pricingSource',existing_order.pricing_source,'status',existing_order.status,'paymentUrl',existing_order.provider_checkout_url,'reused',true); end if;
  if (select count(*) from public.billing_orders where user_id=p_user_id and created_at>now()-interval '1 hour' and status in ('created','payment_link_ready','awaiting_review'))>=3 then raise exception using errcode='42901',message='Çok fazla açık sipariş var. Lütfen daha sonra tekrar deneyin.'; end if;
  insert into public.billing_orders(order_number,user_id,plan_code,billing_period,amount,list_amount,currency,iyzico_conversation_id,legal_versions,legal_snapshot_hash,immediate_service_consent,adult_or_guardian_confirmed,payment_provider,customer_email_snapshot,expected_provider_product_id,provider_checkout_url,provider_status,status,creator_signup_attribution_id,pricing_source,expected_paid_amount,expected_discount_amount)
  values(p_order_number,p_user_id,selected_plan.code,p_billing_period,expected_paid,selected_plan.annual_price,selected_plan.currency,p_order_number,p_legal_versions,p_legal_snapshot_hash,true,true,'shopier',normalized_email,p_expected_product_id,p_checkout_url,'checkout_ready','payment_link_ready',attribution_row.id,p_pricing_source,expected_paid,expected_discount) returning * into created_order;
  for legal_key,legal_version in select key,value from jsonb_each_text(p_legal_versions) loop insert into public.billing_legal_acceptances(order_id,user_id,document_key,document_version,snapshot_hash) values(created_order.id,p_user_id,legal_key,legal_version,p_legal_snapshot_hash); end loop;
  insert into public.billing_events(order_id,user_id,event_type,payload) values(created_order.id,p_user_id,'order_created',jsonb_build_object('provider','shopier','plan',selected_plan.code,'period',p_billing_period,'catalogListAmount',selected_plan.annual_price,'expectedPaidAmount',expected_paid,'expectedDiscountAmount',expected_discount,'pricingSource',p_pricing_source,'currency',created_order.currency,'productId',p_expected_product_id));
  return jsonb_build_object('id',created_order.id,'orderNumber',created_order.order_number,'planCode',created_order.plan_code,'planName',selected_plan.name,'billingPeriod',created_order.billing_period,'amount',created_order.amount,'listAmount',created_order.list_amount,'discountAmount',created_order.expected_discount_amount,'currency',created_order.currency,'pricingSource',created_order.pricing_source,'status',created_order.status,'paymentUrl',created_order.provider_checkout_url,'reused',false);
end;
$$;
revoke all on function public.create_shopier_billing_order_v2(uuid,text,text,text,text,text,jsonb,text,boolean,boolean,text,uuid,numeric,numeric) from public,anon,authenticated;
grant execute on function public.create_shopier_billing_order_v2(uuid,text,text,text,text,text,jsonb,text,boolean,boolean,text,uuid,numeric,numeric) to service_role;

create or replace function public.provider_confirm_billing_order(p_order_id uuid,p_payment_reference text,p_provider_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.billing_orders%rowtype; attribution_row public.content_producer_signup_attributions%rowtype;
  period_start timestamptz; period_end timestamptz;
  verified_provider_order_id text:=btrim(coalesce(p_provider_payload->>'providerOrderId',''));
  product_id text:=btrim(coalesce(p_provider_payload->>'productId',''));
  customer_email text:=lower(btrim(coalesce(p_provider_payload->>'customerEmail','')));
  currency_code text:=upper(btrim(coalesce(p_provider_payload->>'currency','')));
  payment_status text:=lower(btrim(coalesce(p_provider_payload->>'paymentStatus','')));
  provider_discount text:=nullif(btrim(coalesce(p_provider_payload->>'providerDiscountId','')),'');
  discount_method text:=nullif(btrim(coalesce(p_provider_payload->>'discountMethod','')),'');
  provider_subtotal numeric(10,2); paid_total numeric(10,2); provider_discount_total numeric(10,2); internal_discount_total numeric(10,2); quantity_value integer;
  paid_at timestamptz; producer_id uuid; sequence_value integer; reward_minor bigint; producer_active boolean := false; reward_source_value text; reward_signup_id uuid;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception using errcode='42501',message='Sunucu doğrulaması gerekli.'; end if;
  if jsonb_typeof(coalesce(p_provider_payload,'{}'::jsonb))<>'object' or p_provider_payload->>'provider'<>'shopier' or length(btrim(coalesce(p_payment_reference,'')))<8 then raise exception using errcode='22023',message='Ödeme doğrulama kaydı geçersiz.'; end if;
  begin provider_subtotal:=(p_provider_payload->>'listAmount')::numeric(10,2); paid_total:=(p_provider_payload->>'amount')::numeric(10,2); provider_discount_total:=(p_provider_payload->>'discountAmount')::numeric(10,2); quantity_value:=(p_provider_payload->>'quantity')::integer; paid_at:=(p_provider_payload->>'paidAt')::timestamptz; exception when others then raise exception using errcode='22023',message='Provider finansal kanıtı geçersiz.'; end;
  select * into order_row from public.billing_orders where id=p_order_id and payment_provider='shopier' and status in ('payment_link_ready','awaiting_review') for update;
  if order_row.id is null then select * into order_row from public.billing_orders where id=p_order_id and payment_provider='shopier' and status='approved' and public.billing_orders.provider_order_id=verified_provider_order_id; if order_row.id is not null then return jsonb_build_object('id',order_row.id,'status','approved','alreadyProcessed',true,'planCode',order_row.plan_code); end if; raise exception using errcode='P0002',message='Doğrulanabilir sipariş bulunamadı.'; end if;
  if verified_provider_order_id !~ '^[A-Za-z0-9_-]{1,160}$' or product_id<>order_row.expected_provider_product_id or customer_email<>order_row.customer_email_snapshot or currency_code<>order_row.currency or payment_status<>'paid' or quantity_value<>1 or paid_total<=0 or provider_discount_total<0 or paid_total+provider_discount_total<>provider_subtotal then raise exception using errcode='22023',message='Shopier ödeme kanıtı siparişle eşleşmedi.'; end if;

  if order_row.pricing_source = 'signup_creator_code' then
    if provider_subtotal<>order_row.expected_paid_amount or paid_total<>order_row.expected_paid_amount or provider_discount_total<>0 or provider_discount is not null or discount_method is not null then raise exception using errcode='22023',message='İçerik üretici ürünü için beklenmeyen ek indirim.'; end if;
    select a.* into attribution_row from public.content_producer_signup_attributions a where a.id=order_row.creator_signup_attribution_id and a.user_id=order_row.user_id for update;
    if attribution_row.id is null or attribution_row.discount_bps_snapshot<>2000 then raise exception using errcode='22023',message='İçerik üretici atfı doğrulanamadı.'; end if;
    producer_id:=attribution_row.producer_id; reward_source_value:='signup_creator_code'; reward_signup_id:=attribution_row.id; internal_discount_total:=order_row.expected_discount_amount;
  else
    if provider_subtotal<>coalesce(order_row.list_amount,order_row.amount) then raise exception using errcode='22023',message='Shopier ödeme tutarı siparişle eşleşmedi.'; end if;
    internal_discount_total:=provider_discount_total; reward_source_value:='shopier_discount_code';
    if provider_discount_total=0 then if provider_discount is not null then raise exception using errcode='22023',message='Beklenmeyen indirim kimliği.'; end if;
    else
      if provider_discount_total<>round(provider_subtotal*0.20,2) or discount_method<>'discountCode' or provider_discount !~ '^[A-Za-z0-9_-]{1,160}$' then raise exception using errcode='22023',message='Shopier indirimi doğrulanamadı.'; end if;
      select c.producer_id into producer_id from public.content_producer_code_bindings b join public.content_producer_codes c on c.id=b.code_id where b.provider='shopier' and b.provider_discount_id=provider_discount and b.valid_from<=paid_at and (b.valid_to is null or paid_at<b.valid_to) and b.configuration->>'productScopeConfirmed'='true' and c.discount_bps=2000 limit 1;
      if producer_id is null then raise exception using errcode='22023',message='Shopier indirim bağı bulunamadı.'; end if;
    end if;
  end if;
  if producer_id is not null then
    select p.status='active' into producer_active
    from public.content_producer_profiles p
    where p.user_id=producer_id;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:billing:' || order_row.user_id::text,0));
  if exists(select 1 from public.billing_orders x where x.payment_provider='shopier' and x.provider_order_id=verified_provider_order_id and x.id<>order_row.id) or exists(select 1 from public.billing_orders x where x.payment_reference=btrim(p_payment_reference) and x.status in ('approved','refunded') and x.id<>order_row.id) then raise exception using errcode='23505',message='Bu ödeme daha önce kullanılmış.'; end if;
  select a.period_start,a.period_end into period_start,period_end from public.calculate_purchased_access_period(order_row.user_id,order_row.plan_code,paid_at)a;
  insert into public.user_subscriptions(user_id,plan_code,status,current_period_start,current_period_end,source_order_id,cancel_at_period_end,trial_started_at,trial_ends_at) values(order_row.user_id,order_row.plan_code,'active',period_start,period_end,order_row.id,true,null,null) on conflict(user_id) do update set plan_code=excluded.plan_code,status='active',current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,source_order_id=excluded.source_order_id,cancel_at_period_end=true,trial_started_at=null,trial_ends_at=null,updated_at=now();
  update public.billing_orders set status='approved',payment_reference=btrim(p_payment_reference),provider_order_id=verified_provider_order_id,provider_status=payment_status,provider_verified_at=now(),verified_at=now(),paid_amount=paid_total,verified_discount_amount=internal_discount_total,provider_discount_id=provider_discount,content_producer_id=producer_id,decision_note='Shopier API ile otomatik doğrulandı.',updated_at=now() where id=order_row.id;
  if producer_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:producer-reward:' || producer_id::text,0));
    if not exists(select 1 from public.content_producer_rewards r where r.order_id=order_row.id) then
      if producer_id=order_row.user_id or not producer_active then
        insert into public.content_producer_rewards(producer_id,order_id,provider_order_id,provider_discount_id,reward_source,signup_attribution_id,lifetime_sequence,list_amount_minor,paid_amount_minor,discount_amount_minor,reward_amount_minor,status,exclusion_reason,sale_paid_at,available_at) values(producer_id,order_row.id,verified_provider_order_id,provider_discount,reward_source_value,reward_signup_id,null,(coalesce(order_row.list_amount,provider_subtotal)*100)::bigint,(paid_total*100)::bigint,(internal_discount_total*100)::bigint,0,'cancelled',case when producer_id=order_row.user_id then 'self_purchase' else 'producer_suspended' end,paid_at,paid_at+interval '14 days');
      else
        select lifetime_qualified_sale_count+1 into sequence_value from public.content_producer_profiles where user_id=producer_id for update;
        if sequence_value is null then raise exception using errcode='P0002',message='İçerik üreticisi bulunamadı.'; end if;
        reward_minor:=case when sequence_value<=3 then 100000 else 50000 end;
        if reward_minor>(paid_total*100)::bigint then raise exception using errcode='22023',message='Kazanç tahsilat tutarını aşamaz.'; end if;
        update public.content_producer_profiles set lifetime_qualified_sale_count=sequence_value,updated_at=now() where user_id=producer_id;
        insert into public.content_producer_rewards(producer_id,order_id,provider_order_id,provider_discount_id,reward_source,signup_attribution_id,lifetime_sequence,list_amount_minor,paid_amount_minor,discount_amount_minor,reward_amount_minor,status,sale_paid_at,available_at) values(producer_id,order_row.id,verified_provider_order_id,provider_discount,reward_source_value,reward_signup_id,sequence_value,(coalesce(order_row.list_amount,provider_subtotal)*100)::bigint,(paid_total*100)::bigint,(internal_discount_total*100)::bigint,reward_minor,'pending',paid_at,paid_at+interval '14 days');
        insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key) values(producer_id,'success','Yeni kazanç oluştu','İçerik Üretici Programı üzerinden doğrulanmış yeni bir satış kazancı oluştu.','/dashboard/icerik-ureticisi','producer-reward-' || order_row.id::text) on conflict(user_id,dedupe_key) do nothing;
      end if;
    end if;
  end if;
  insert into public.billing_events(order_id,user_id,event_type,payload) values(order_row.id,order_row.user_id,'provider_confirmed',jsonb_build_object('provider','shopier','providerOrderId',verified_provider_order_id,'productId',product_id,'providerSubtotal',provider_subtotal,'catalogListAmount',coalesce(order_row.list_amount,provider_subtotal),'amount',paid_total,'providerDiscountAmount',provider_discount_total,'creatorBenefitAmount',internal_discount_total,'pricingSource',order_row.pricing_source,'providerDiscountId',provider_discount,'currency',currency_code,'quantity',quantity_value,'periodStart',period_start,'periodEnd',period_end));
  insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key) values(order_row.user_id,'success','calisiyo plus etkinleştirildi','Plus erişimin '||to_char(period_end at time zone 'Europe/Istanbul','DD.MM.YYYY')||' tarihine kadar açık.','/dashboard/abonelik','billing-approved-'||order_row.id::text) on conflict(user_id,dedupe_key) do nothing;
  return jsonb_build_object('id',order_row.id,'status','approved','alreadyProcessed',false,'planCode',order_row.plan_code,'periodStart',period_start,'periodEnd',period_end);
end;
$$;
revoke all on function public.provider_confirm_billing_order(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.provider_confirm_billing_order(uuid,text,jsonb) to service_role;
