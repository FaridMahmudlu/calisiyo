update public.billing_plans
set monthly_price = 4500,
    annual_price = 4500,
    updated_at = now()
where code = 'plus_2028'
  and (monthly_price is distinct from 4500 or annual_price is distinct from 4500);

alter table public.content_producer_profiles
  add column if not exists self_code_change_used boolean not null default false,
  add column if not exists self_code_changed_at timestamptz;

create or replace function public.normalize_content_producer_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(upper(btrim(coalesce(p_code, ''))), 'ÇĞİÖŞÜÂÎÛ', 'CGIOSUAIU'),
    '[^A-Z0-9]+', '', 'g'
  );
$$;
revoke all on function public.normalize_content_producer_code(text) from public, anon, authenticated;

create or replace function public.generate_content_producer_code(p_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  base text := public.normalize_content_producer_code(
    pg_catalog.split_part(btrim(coalesce(p_name, '')), ' ', 1)
  );
  root text;
  candidate text;
  attempt integer := 0;
begin
  if char_length(base) < 2 or base in (
    'CALISIYO','ADMIN','DESTEK','SUPPORT','PLUS','UCRETSIZ','FREE','SHOPIER','RESMI','OFFICIAL'
  ) then
    base := 'URETICI';
  end if;
  root := left(base, 14) || '20';
  loop
    candidate := case
      when attempt = 0 then root
      else left(root, 20 - char_length(attempt::text)) || attempt::text
    end;
    exit when not exists (
      select 1 from public.content_producer_codes c where upper(c.code) = upper(candidate)
    );
    attempt := attempt + 1;
    if attempt > 999 then
      raise exception using errcode = 'P0001', message = 'Benzersiz indirim kodu üretilemedi.';
    end if;
  end loop;
  return candidate;
end;
$$;
revoke all on function public.generate_content_producer_code(text) from public, anon, authenticated;

create or replace function public.self_rotate_content_producer_code(p_requested_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  requested_code text := public.normalize_content_producer_code(p_requested_code);
  producer public.content_producer_profiles%rowtype;
  old_code public.content_producer_codes%rowtype;
  new_code public.content_producer_codes%rowtype;
  old_provider_discount_id text;
begin
  if viewer is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;
  if char_length(requested_code) not between 4 and 20
     or requested_code !~ '^[A-Z0-9]+$'
     or requested_code !~ '[A-Z]'
     or requested_code in ('CALISIYO','ADMIN','DESTEK','SUPPORT','PLUS','UCRETSIZ','FREE','SHOPIER','RESMI','OFFICIAL') then
    raise exception using errcode = '22023', message = 'Kod 4-20 karakter, harf ve rakamlardan oluşmalıdır.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:producer:' || viewer::text, 0)
  );
  select * into producer
  from public.content_producer_profiles p
  where p.user_id = viewer
  for update;
  if producer.user_id is null or producer.status <> 'active' then
    raise exception using errcode = '42501', message = 'Aktif içerik üreticisi hesabı gerekli.';
  end if;
  if producer.self_code_change_used then
    raise exception using errcode = 'P0001', message = 'İndirim kodunu yalnızca bir kez değiştirebilirsin.';
  end if;
  if exists (
    select 1 from public.content_producer_codes c where upper(c.code) = upper(requested_code)
  ) then
    raise exception using errcode = '23505', message = 'Bu kod zaten kullanılıyor.';
  end if;

  select * into old_code
  from public.content_producer_codes c
  where c.producer_id = viewer
    and c.status in ('pending', 'manual_required', 'active', 'suspended', 'review_required')
  order by c.created_at desc
  limit 1
  for update;
  if old_code.id is null then
    raise exception using errcode = 'P0002', message = 'Değiştirilecek indirim kodu bulunamadı.';
  end if;
  if upper(old_code.code) = upper(requested_code) then
    raise exception using errcode = '22023', message = 'Yeni kod mevcut koddan farklı olmalıdır.';
  end if;

  select b.provider_discount_id into old_provider_discount_id
  from public.content_producer_code_bindings b
  where b.code_id = old_code.id and b.status = 'active' and b.valid_to is null
  order by b.created_at desc
  limit 1;

  update public.content_producer_code_bindings
  set status = 'retired', valid_to = coalesce(valid_to, now()), updated_at = now()
  where code_id = old_code.id
    and status in ('active', 'pending', 'manual_required', 'review_required');
  update public.content_producer_codes
  set status = 'retired', updated_at = now()
  where id = old_code.id;
  insert into public.content_producer_codes(producer_id, code, status, created_by)
  values(viewer, requested_code, 'manual_required', viewer)
  returning * into new_code;
  update public.content_producer_profiles
  set self_code_change_used = true, self_code_changed_at = now(), updated_at = now()
  where user_id = viewer;

  insert into public.admin_audit_log(actor_id, action, target_user_id, details)
  values(viewer, 'content_producer_code_self_changed', viewer, jsonb_build_object(
    'oldCodeId', old_code.id,
    'oldProviderDiscountId', old_provider_discount_id,
    'newCodeId', new_code.id,
    'newCode', new_code.code,
    'externalDisableRequired', old_provider_discount_id is not null
  ));
  return jsonb_build_object(
    'userId', viewer,
    'code', new_code.code,
    'promoStatus', new_code.status,
    'oldProviderDiscountId', old_provider_discount_id,
    'externalDisableRequired', old_provider_discount_id is not null,
    'selfCodeChangeUsed', true
  );
end;
$$;
revoke all on function public.self_rotate_content_producer_code(text) from public, anon;
grant execute on function public.self_rotate_content_producer_code(text) to authenticated;

create or replace function public.service_confirm_self_content_producer_code(
  p_user_id uuid,
  p_provider_discount_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  code_row public.content_producer_codes%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu yetkisi gerekli.';
  end if;
  if p_user_id is null or btrim(coalesce(p_provider_discount_id, '')) !~ '^[A-Za-z0-9_-]{1,160}$' then
    raise exception using errcode = '22023', message = 'Geçersiz kod eşleştirmesi.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:producer:' || p_user_id::text, 0)
  );
  select * into code_row
  from public.content_producer_codes c
  where c.producer_id = p_user_id and c.status = 'manual_required'
  order by c.created_at desc
  limit 1
  for update;
  if code_row.id is null then
    raise exception using errcode = 'P0002', message = 'Onaylanacak üretici kodu bulunamadı.';
  end if;
  update public.content_producer_code_bindings
  set status = 'retired', valid_to = coalesce(valid_to, now()), updated_at = now()
  where code_id = code_row.id and status <> 'retired';
  insert into public.content_producer_code_bindings(
    code_id, provider, provider_discount_id, status, valid_from, configuration, verified_at
  ) values(
    code_row.id, 'shopier', btrim(p_provider_discount_id), 'active', now(),
    jsonb_build_object('discountBps', 2000, 'currency', 'TRY', 'productScopeConfirmed', true), now()
  );
  update public.content_producer_codes
  set status = 'active', updated_at = now()
  where id = code_row.id;
  return jsonb_build_object('userId', p_user_id, 'code', code_row.code, 'promoStatus', 'active');
end;
$$;
revoke all on function public.service_confirm_self_content_producer_code(uuid,text)
  from public, anon, authenticated;
grant execute on function public.service_confirm_self_content_producer_code(uuid,text)
  to service_role;

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
    'selfCodeChangeUsed',p.self_code_change_used,'selfCodeChangedAt',p.self_code_changed_at,
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
  where p.user_id=viewer group by p.user_id,p.status,p.activated_at,p.self_code_change_used,p.self_code_changed_at,
    p.lifetime_qualified_sale_count,c.code,c.status,g.plan_code,g.starts_at,g.ends_at;
  return coalesce(result,jsonb_build_object('active',false,'status','not_enrolled'));
end;
$$;
revoke all on function public.current_content_producer_summary() from public,anon;
grant execute on function public.current_content_producer_summary() to authenticated;
