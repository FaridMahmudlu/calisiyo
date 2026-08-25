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
  if char_length(base) < 3 or base in (
    'CALISIYO','ADMIN','DESTEK','SUPPORT','PLUS','UCRETSIZ','FREE','SHOPIER','RESMI','OFFICIAL'
  ) then
    base := 'CAL' || coalesce(nullif(base, ''), 'URETICI');
  end if;
  loop
    candidate := left(base, 16) || case
      when attempt = 0 then ''
      else upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6))
    end;
    exit when not exists (
      select 1 from public.content_producer_codes c where upper(c.code) = upper(candidate)
    );
    attempt := attempt + 1;
    if attempt > 20 then
      raise exception using errcode = 'P0001', message = 'Benzersiz indirim kodu üretilemedi.';
    end if;
  end loop;
  return candidate;
end;
$$;

revoke all on function public.generate_content_producer_code(text) from public, anon, authenticated;

create or replace function public.admin_record_content_producer_promo_disable(
  p_user_id uuid,
  p_provider_discount_id text,
  p_action text,
  p_success boolean,
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  safe_error_code text := nullif(btrim(coalesce(p_error_code, '')), '');
begin
  if viewer is null or not exists (
    select 1 from public.user_roles r
    where r.user_id = viewer and r.role in ('admin', 'super_admin')
  ) then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;
  if not exists (
    select 1 from public.content_producer_profiles p where p.user_id = p_user_id
  ) then
    raise exception using errcode = 'P0002', message = 'İçerik üreticisi bulunamadı.';
  end if;
  if p_provider_discount_id !~ '^[A-Za-z0-9_-]{1,160}$'
     or p_action not in ('suspend', 'rotate')
     or p_success is null
     or (not coalesce(p_success, false) and safe_error_code !~ '^[a-z0-9_:-]{2,80}$') then
    raise exception using errcode = '22023', message = 'Promo kapatma audit bilgileri geçersiz.';
  end if;

  insert into public.admin_audit_log(actor_id, action, target_user_id, details)
  values(
    viewer,
    case when p_success
      then 'content_producer_promo_disabled'
      else 'content_producer_promo_disable_failed'
    end,
    p_user_id,
    jsonb_strip_nulls(jsonb_build_object(
      'providerDiscountId', p_provider_discount_id,
      'lifecycleAction', p_action,
      'errorCode', safe_error_code
    ))
  );

  return jsonb_build_object(
    'userId', p_user_id,
    'providerDiscountId', p_provider_discount_id,
    'action', p_action,
    'success', p_success
  );
end;
$$;

revoke all on function public.admin_record_content_producer_promo_disable(uuid,text,text,boolean,text)
from public, anon;
grant execute on function public.admin_record_content_producer_promo_disable(uuid,text,text,boolean,text)
to authenticated;
