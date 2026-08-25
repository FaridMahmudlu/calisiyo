create table if not exists public.content_producer_applications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'instagram', 'tiktok', 'other')),
  profile_url text not null check (char_length(profile_url) between 8 and 500),
  audience_size integer not null default 0 check (audience_size between 0 and 1000000000),
  content_focus text not null check (char_length(content_focus) between 5 and 300),
  motivation text not null check (char_length(motivation) between 20 and 1000),
  preferred_plan_code text not null check (preferred_plan_code in ('plus_2027', 'plus_2028')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) between 3 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_producer_applications enable row level security;
revoke all on table public.content_producer_applications from public, anon, authenticated;

create unique index if not exists content_producer_applications_one_pending_idx
  on public.content_producer_applications (user_id)
  where status = 'pending';
create index if not exists content_producer_applications_status_created_idx
  on public.content_producer_applications (status, created_at desc);
create index if not exists content_producer_applications_reviewed_by_idx
  on public.content_producer_applications (reviewed_by);

create or replace function public.current_content_producer_application()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  result jsonb;
begin
  if viewer is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;

  select jsonb_build_object(
    'id', application.id,
    'platform', application.platform,
    'profileUrl', application.profile_url,
    'audienceSize', application.audience_size,
    'contentFocus', application.content_focus,
    'motivation', application.motivation,
    'preferredPlanCode', application.preferred_plan_code,
    'status', application.status,
    'reviewNote', application.review_note,
    'reviewedAt', application.reviewed_at,
    'createdAt', application.created_at,
    'updatedAt', application.updated_at
  )
  into result
  from public.content_producer_applications application
  where application.user_id = viewer
  order by application.created_at desc
  limit 1;

  return coalesce(result, jsonb_build_object('status', 'none'));
end;
$$;

revoke all on function public.current_content_producer_application() from public, anon;
grant execute on function public.current_content_producer_application() to authenticated;

create or replace function public.submit_content_producer_application(
  p_platform text,
  p_profile_url text,
  p_audience_size integer,
  p_content_focus text,
  p_motivation text,
  p_preferred_plan_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  safe_platform text := lower(btrim(coalesce(p_platform, '')));
  safe_url text := btrim(coalesce(p_profile_url, ''));
  safe_focus text := btrim(coalesce(p_content_focus, ''));
  safe_motivation text := btrim(coalesce(p_motivation, ''));
  application public.content_producer_applications%rowtype;
begin
  if viewer is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = viewer and profile.account_status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Aktif hesap gerekli.';
  end if;
  if exists (
    select 1 from public.content_producer_profiles producer where producer.user_id = viewer
  ) then
    raise exception using errcode = '22023', message = 'Hesap zaten İçerik Üretici Programı kapsamında.';
  end if;
  if safe_platform not in ('youtube', 'instagram', 'tiktok', 'other')
     or safe_url !~* '^https://[^[:space:]]+$'
     or char_length(safe_url) not between 8 and 500
     or coalesce(p_audience_size, -1) not between 0 and 1000000000
     or char_length(safe_focus) not between 5 and 300
     or char_length(safe_motivation) not between 20 and 1000
     or p_preferred_plan_code not in ('plus_2027', 'plus_2028') then
    raise exception using errcode = '22023', message = 'Başvuru bilgileri geçersiz.';
  end if;
  if safe_platform = 'youtube'
     and safe_url !~* '^https://([a-z0-9-]+\.)?(youtube\.com|youtu\.be)/' then
    raise exception using errcode = '22023', message = 'Geçerli bir YouTube profil bağlantısı gerekli.';
  elsif safe_platform = 'instagram'
     and safe_url !~* '^https://([a-z0-9-]+\.)?instagram\.com/' then
    raise exception using errcode = '22023', message = 'Geçerli bir Instagram profil bağlantısı gerekli.';
  elsif safe_platform = 'tiktok'
     and safe_url !~* '^https://([a-z0-9-]+\.)?tiktok\.com/' then
    raise exception using errcode = '22023', message = 'Geçerli bir TikTok profil bağlantısı gerekli.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calisiyo:producer-application:' || viewer::text, 0)
  );

  select *
  into application
  from public.content_producer_applications existing
  where existing.user_id = viewer and existing.status = 'pending'
  for update;

  if application.id is null then
    insert into public.content_producer_applications (
      user_id, platform, profile_url, audience_size, content_focus, motivation, preferred_plan_code
    )
    values (
      viewer, safe_platform, safe_url, p_audience_size, safe_focus, safe_motivation, p_preferred_plan_code
    )
    returning * into application;
  else
    update public.content_producer_applications
    set platform = safe_platform,
        profile_url = safe_url,
        audience_size = p_audience_size,
        content_focus = safe_focus,
        motivation = safe_motivation,
        preferred_plan_code = p_preferred_plan_code,
        updated_at = now()
    where id = application.id
    returning * into application;
  end if;

  insert into public.notifications(user_id, kind, title, body, action_url, dedupe_key)
  select role.user_id, 'info', 'Yeni içerik üreticisi başvurusu',
    'Yeni bir İçerik Üretici Programı başvurusu inceleme bekliyor.',
    '/admin/icerik-ureticileri', 'producer-application-' || application.id::text
  from public.user_roles role
  where role.role in ('admin', 'super_admin')
  on conflict(user_id, dedupe_key) do nothing;

  return jsonb_build_object(
    'id', application.id,
    'status', application.status,
    'platform', application.platform,
    'profileUrl', application.profile_url,
    'audienceSize', application.audience_size,
    'contentFocus', application.content_focus,
    'motivation', application.motivation,
    'preferredPlanCode', application.preferred_plan_code,
    'createdAt', application.created_at,
    'updatedAt', application.updated_at
  );
end;
$$;

revoke all on function public.submit_content_producer_application(text,text,integer,text,text,text)
from public, anon;
grant execute on function public.submit_content_producer_application(text,text,integer,text,text,text)
to authenticated;

create or replace function public.withdraw_content_producer_application()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  application_id uuid;
begin
  if viewer is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;

  update public.content_producer_applications
  set status = 'withdrawn', updated_at = now()
  where user_id = viewer and status = 'pending'
  returning id into application_id;

  if application_id is null then
    raise exception using errcode = 'P0002', message = 'Bekleyen başvuru bulunamadı.';
  end if;

  return jsonb_build_object('id', application_id, 'status', 'withdrawn');
end;
$$;

revoke all on function public.withdraw_content_producer_application() from public, anon;
grant execute on function public.withdraw_content_producer_application() to authenticated;

create or replace function public.admin_list_content_producer_applications()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  result jsonb;
begin
  if viewer is null or not exists (
    select 1 from public.user_roles role
    where role.user_id = viewer and role.role in ('admin', 'super_admin')
  ) then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;

  with recent_applications as (
    select application.*
    from public.content_producer_applications application
    where application.created_at >= now() - interval '180 days'
    order by
      case when application.status = 'pending' then 0 else 1 end,
      application.created_at desc
    limit 100
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', application.id,
    'userId', application.user_id,
    'name', profile.full_name,
    'email', auth_user.email,
    'yksYear', profile.yks_year,
    'platform', application.platform,
    'profileUrl', application.profile_url,
    'audienceSize', application.audience_size,
    'contentFocus', application.content_focus,
    'motivation', application.motivation,
    'preferredPlanCode', application.preferred_plan_code,
    'status', application.status,
    'reviewNote', application.review_note,
    'reviewedAt', application.reviewed_at,
    'createdAt', application.created_at
  ) order by
    case when application.status = 'pending' then 0 else 1 end,
    application.created_at desc), '[]'::jsonb)
  into result
  from recent_applications application
  join public.profiles profile on profile.id = application.user_id
  join auth.users auth_user on auth_user.id = application.user_id
  ;

  return result;
end;
$$;

revoke all on function public.admin_list_content_producer_applications() from public, anon;
grant execute on function public.admin_list_content_producer_applications() to authenticated;

create or replace function public.admin_activate_content_producer_with_application(
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
  activation jsonb;
  application_id uuid;
begin
  if viewer is null or not exists (
    select 1 from public.user_roles role
    where role.user_id = viewer and role.role in ('admin', 'super_admin')
  ) then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;

  activation := public.admin_activate_content_producer(p_user_id, p_plan_code);

  update public.content_producer_applications
  set status = 'approved',
      reviewed_by = viewer,
      reviewed_at = now(),
      review_note = 'Başvuru onaylandı.',
      updated_at = now()
  where user_id = p_user_id and status = 'pending'
  returning id into application_id;

  if application_id is not null then
    insert into public.admin_audit_log(actor_id, action, target_user_id, details)
    values(viewer, 'content_producer_application_approved', p_user_id, jsonb_build_object(
      'applicationId', application_id,
      'planCode', p_plan_code
    ));
  end if;

  return activation || jsonb_build_object('applicationId', application_id);
end;
$$;

revoke all on function public.admin_activate_content_producer_with_application(uuid,text)
from public, anon;
grant execute on function public.admin_activate_content_producer_with_application(uuid,text)
to authenticated;

create or replace function public.admin_approve_content_producer_application(
  p_application_id uuid,
  p_plan_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  application public.content_producer_applications%rowtype;
  activation jsonb;
begin
  if viewer is null or not exists (
    select 1 from public.user_roles role
    where role.user_id = viewer and role.role in ('admin', 'super_admin')
  ) then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;
  if p_plan_code not in ('plus_2027', 'plus_2028') then
    raise exception using errcode = '22023', message = 'Geçerli bir Plus dönemi seçmelisin.';
  end if;

  select *
  into application
  from public.content_producer_applications existing
  where existing.id = p_application_id and existing.status = 'pending'
  for update;

  if application.id is null then
    raise exception using errcode = 'P0002', message = 'Bekleyen başvuru bulunamadı.';
  end if;

  activation := public.admin_activate_content_producer_with_application(application.user_id, p_plan_code);
  return activation || jsonb_build_object(
    'applicationId', application.id,
    'userId', application.user_id
  );
end;
$$;

revoke all on function public.admin_approve_content_producer_application(uuid,text)
from public, anon;
grant execute on function public.admin_approve_content_producer_application(uuid,text)
to authenticated;

create or replace function public.admin_reject_content_producer_application(
  p_application_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  safe_note text := btrim(coalesce(p_note, ''));
  application public.content_producer_applications%rowtype;
begin
  if viewer is null or not exists (
    select 1 from public.user_roles role
    where role.user_id = viewer and role.role in ('admin', 'super_admin')
  ) then
    raise exception using errcode = '42501', message = 'Yönetici yetkisi gerekli.';
  end if;
  if char_length(safe_note) not between 5 and 500 then
    raise exception using errcode = '22023', message = 'Ret nedeni en az 5 karakter olmalıdır.';
  end if;

  select *
  into application
  from public.content_producer_applications existing
  where existing.id = p_application_id and existing.status = 'pending'
  for update;

  if application.id is null then
    raise exception using errcode = 'P0002', message = 'Bekleyen başvuru bulunamadı.';
  end if;

  update public.content_producer_applications
  set status = 'rejected',
      reviewed_by = viewer,
      reviewed_at = now(),
      review_note = safe_note,
      updated_at = now()
  where id = application.id;

  insert into public.admin_audit_log(actor_id, action, target_user_id, details)
  values(viewer, 'content_producer_application_rejected', application.user_id, jsonb_build_object(
    'applicationId', application.id,
    'note', safe_note
  ));
  insert into public.notifications(user_id, kind, title, body, action_url, dedupe_key)
  values(
    application.user_id, 'warning', 'İçerik üreticisi başvurun incelendi',
    'Başvurun şu anda onaylanmadı. Ayrıntıları program sayfasında görebilirsin.',
    '/dashboard/icerik-ureticisi', 'producer-application-rejected-' || application.id::text
  )
  on conflict(user_id, dedupe_key) do nothing;

  return jsonb_build_object('id', application.id, 'userId', application.user_id, 'status', 'rejected');
end;
$$;

revoke all on function public.admin_reject_content_producer_application(uuid,text)
from public, anon;
grant execute on function public.admin_reject_content_producer_application(uuid,text)
to authenticated;
