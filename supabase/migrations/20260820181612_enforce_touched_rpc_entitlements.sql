-- Security follow-up for the RPCs changed in the canonical activity pass.
-- SECURITY DEFINER functions bypass table RLS as their owner, so product
-- entitlements must be checked explicitly inside the trusted boundary.

create or replace function public.create_exam_with_details(
  p_exam_type text,
  p_publisher text,
  p_exam_date date,
  p_duration_minutes integer,
  p_details jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  viewer_year smallint;
  created_id uuid;
  item jsonb;
  course public.dersler%rowtype;
  correct_count integer;
  wrong_count integer;
  blank_count integer;
  seen_course_ids uuid[] := '{}'::uuid[];
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
  end if;
  if not public.can_insert_exam(viewer) then
    raise exception using errcode = '54000', message = 'Aylık deneme kayıt limitine ulaştın.';
  end if;
  if p_exam_type not in ('TYT', 'AYT', 'YDT') then
    raise exception using errcode = '22023', message = 'Geçersiz sınav türü.';
  end if;
  if length(trim(coalesce(p_publisher, ''))) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Yayın adı 2-120 karakter olmalıdır.';
  end if;
  if p_exam_date is null or p_exam_date > (now() at time zone 'Europe/Istanbul')::date then
    raise exception using errcode = '22023', message = 'Deneme tarihi bugün veya daha eski olmalıdır.';
  end if;
  if p_duration_minutes is not null and p_duration_minutes not between 1 and 600 then
    raise exception using errcode = '22023', message = 'Deneme süresi 1-600 dakika olmalıdır.';
  end if;
  if jsonb_typeof(p_details) <> 'array' or jsonb_array_length(p_details) = 0 then
    raise exception using errcode = '22023', message = 'En az bir ders sonucu girmelisin.';
  end if;

  select profile.yks_year into viewer_year
  from public.profiles as profile
  where profile.id = viewer;

  insert into public.denemeler (user_id, sinav_turu, yayin, tarih, sure_dakika)
  values (viewer, p_exam_type, trim(p_publisher), p_exam_date, p_duration_minutes)
  returning id into created_id;

  for item in select value from jsonb_array_elements(p_details) loop
    if coalesce(item->>'ders_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
      or coalesce(item->>'dogru', '') !~ '^\d+$'
      or coalesce(item->>'yanlis', '') !~ '^\d+$' then
      raise exception using errcode = '22023', message = 'Doğru ve yanlış sayıları negatif olmayan tam sayı olmalıdır.';
    end if;
    if (item->>'ders_id')::uuid = any(seen_course_ids) then
      raise exception using errcode = '22023', message = 'Aynı ders sonucu bir denemeye iki kez eklenemez.';
    end if;

    select * into course
    from public.dersler
    where id = (item->>'ders_id')::uuid
      and sinav_turu = p_exam_type
      and curriculum_year = coalesce(viewer_year, 2027);
    if course.id is null then
      raise exception using errcode = '22023', message = 'Ders seçimi bu sınav yılıyla eşleşmiyor.';
    end if;
    if course.question_count is null then
      raise exception using errcode = '22023', message = course.ad || ' için toplam soru sayısı henüz tanımlı değil.';
    end if;

    correct_count := (item->>'dogru')::integer;
    wrong_count := (item->>'yanlis')::integer;
    if correct_count + wrong_count > course.question_count then
      raise exception using errcode = '22023', message = course.ad || ' için doğru ve yanlış toplamı soru sayısını aşıyor.';
    end if;
    blank_count := course.question_count - correct_count - wrong_count;
    insert into public.deneme_detaylari (deneme_id, ders_id, dogru, yanlis, bos)
    values (created_id, course.id, correct_count, wrong_count, blank_count);
    seen_course_ids := array_append(seen_course_ids, course.id);
  end loop;
  return created_id;
end;
$$;

revoke all on function public.create_exam_with_details(text, text, date, integer, jsonb) from public, anon, authenticated;
grant execute on function public.create_exam_with_details(text, text, date, integer, jsonb) to authenticated;

create or replace function public.import_youtube_learning_plan_idempotent(
  p_request_id text,
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
  existing_resource uuid;
  imported jsonb;
  today_date date := (now() at time zone 'Europe/Istanbul')::date;
  future_limit integer;
  task_limit integer;
  import_limit integer;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
  end if;
  if coalesce(p_request_id, '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    raise exception using errcode = '22023', message = 'Plan istek anahtarı geçersiz.';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtextextended('youtube-import:' || viewer::text || ':' || p_request_id, 0));
  select resource.id into existing_resource
  from public.kaynaklarim as resource
  where resource.user_id = viewer
    and resource.source_metadata->>'requestId' = p_request_id;
  if existing_resource is not null then
    return jsonb_build_object(
      'resourceId', existing_resource,
      'tasksCreated', (select count(*) from public.gunluk_gorevler as task where task.user_id = viewer and task.kaynak_id = existing_resource),
      'itemsCreated', (select count(*) from public.youtube_resource_items as item where item.user_id = viewer and item.resource_id = existing_resource),
      'reused', true
    );
  end if;

  future_limit := public.plan_entitlement_limit('future_schedule_days');
  task_limit := public.plan_entitlement_limit('active_task_limit');
  import_limit := public.plan_entitlement_limit('youtube_import_monthly_limit');
  if p_start_date is null
    or p_start_date < today_date
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

  imported := public.import_youtube_learning_plan(
    p_resource || jsonb_build_object('requestId', p_request_id),
    p_items, p_start_date, p_cadence, p_daily_minutes, p_ders_id
  );
  update public.kaynaklarim as resource
  set source_metadata = resource.source_metadata || jsonb_build_object('requestId', p_request_id)
  where resource.id = (imported->>'resourceId')::uuid and resource.user_id = viewer;
  return imported || jsonb_build_object('reused', false);
end;
$$;

-- The original importer is now an internal implementation detail. Normal
-- users can call only the validating, idempotent wrapper above.
revoke all on function public.import_youtube_learning_plan(jsonb, jsonb, date, text, integer, uuid) from public, anon, authenticated;
revoke all on function public.import_youtube_learning_plan_idempotent(text, jsonb, jsonb, date, text, integer, uuid) from public, anon, authenticated;
grant execute on function public.import_youtube_learning_plan_idempotent(text, jsonb, jsonb, date, text, integer, uuid) to authenticated;
