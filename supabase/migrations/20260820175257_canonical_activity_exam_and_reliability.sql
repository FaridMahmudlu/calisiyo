-- Unify every user-facing study duration behind one conservative daily
-- aggregation. Existing rows remain untouched. Where two sources can describe
-- the same activity (a completed plan plus its persisted log), the largest
-- source total wins instead of being added twice.

create or replace function public.verified_study_minutes_for_user_day(
  p_user_id uuid,
  p_date date
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with logged as (
    select coalesce(sum(greatest(coalesce(log.sure_dakika, 0), 0)), 0)::integer as minutes
    from public.calisma_suresi as log
    where log.user_id = p_user_id and log.tarih = p_date
  ), completed_plan as (
    select coalesce(sum(greatest(
      0,
      extract(epoch from (task.bitis_saat - task.baslangic_saat)) / 60
        + case when task.bitis_saat < task.baslangic_saat then 1440 else 0 end
    )), 0)::integer as minutes
    from public.gunluk_gorevler as task
    where task.user_id = p_user_id
      and task.tarih = p_date
      and task.tamamlandi
  ), timer as (
    select coalesce(sum(greatest(coalesce(session.calisma_suresi, 0), 0)), 0)::integer as minutes
    from public.pomodoro_kayitlari as session
    left join public.calisma_suresi as linked_log
      on linked_log.user_id = session.user_id
      and linked_log.session_key = session.session_key
      and session.session_key is not null
    where session.user_id = p_user_id
      and coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date) = p_date
  )
  select greatest(logged.minutes, completed_plan.minutes, timer.minutes)
  from logged cross join completed_plan cross join timer;
$$;

create or replace function public.verified_study_questions_for_user_day(
  p_user_id uuid,
  p_date date
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with logged as (
    select coalesce(sum(greatest(coalesce(log.soru_sayisi, 0), 0)), 0)::integer as questions
    from public.calisma_suresi as log
    where log.user_id = p_user_id and log.tarih = p_date
  ), completed_plan as (
    select coalesce(sum(greatest(coalesce(task.soru_sayisi, 0), 0)), 0)::integer as questions
    from public.gunluk_gorevler as task
    where task.user_id = p_user_id
      and task.tarih = p_date
      and task.tamamlandi
  )
  select greatest(logged.questions, completed_plan.questions)
  from logged cross join completed_plan;
$$;

create or replace function public.study_streak_for_user(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today_date date := (now() at time zone 'Europe/Istanbul')::date;
  cursor_date date;
  result integer := 0;
begin
  select max(candidate.day_value)
  into cursor_date
  from (
    select log.tarih as day_value
    from public.calisma_suresi as log
    where log.user_id = p_user_id and log.tarih <= today_date
    union
    select task.tarih
    from public.gunluk_gorevler as task
    where task.user_id = p_user_id and task.tamamlandi and task.tarih <= today_date
    union
    select coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date)
    from public.pomodoro_kayitlari as session
    left join public.calisma_suresi as linked_log
      on linked_log.user_id = session.user_id
      and linked_log.session_key = session.session_key
      and session.session_key is not null
    where session.user_id = p_user_id
      and coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date) <= today_date
  ) as candidate
  where public.verified_study_minutes_for_user_day(p_user_id, candidate.day_value) >= 30;

  if cursor_date is null then return 0; end if;
  loop
    exit when public.verified_study_minutes_for_user_day(p_user_id, cursor_date) < 30;
    result := result + 1;
    cursor_date := cursor_date - 1;
  end loop;
  return result;
end;
$$;

create or replace function public.get_my_study_time_statistics(p_start_date date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  payload jsonb;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;

  with candidate_days as (
    select log.tarih as day
    from public.calisma_suresi as log
    where log.user_id = viewer and (p_start_date is null or log.tarih >= p_start_date)
    union
    select task.tarih
    from public.gunluk_gorevler as task
    where task.user_id = viewer and task.tamamlandi
      and (p_start_date is null or task.tarih >= p_start_date)
    union
    select coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date)
    from public.pomodoro_kayitlari as session
    left join public.calisma_suresi as linked_log
      on linked_log.user_id = session.user_id
      and linked_log.session_key = session.session_key
      and session.session_key is not null
    where session.user_id = viewer
      and (p_start_date is null or coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date) >= p_start_date)
  ), daily as (
    select candidate.day,
      public.verified_study_minutes_for_user_day(viewer, candidate.day) as study_minutes,
      public.verified_study_questions_for_user_day(viewer, candidate.day) as questions,
      least(
        public.verified_study_minutes_for_user_day(viewer, candidate.day),
        coalesce((
          select sum(greatest(coalesce(session.calisma_suresi, 0), 0))::integer
          from public.pomodoro_kayitlari as session
          left join public.calisma_suresi as linked_log
            on linked_log.user_id = session.user_id
            and linked_log.session_key = session.session_key
            and session.session_key is not null
          where session.user_id = viewer
            and coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date) = candidate.day
        ), 0)
      ) as focus_minutes
    from candidate_days as candidate
  )
  select jsonb_build_object(
    'studyMinutes', coalesce(sum(daily.study_minutes), 0),
    'focusMinutes', coalesce(sum(daily.focus_minutes), 0),
    'nonFocusMinutes', greatest(coalesce(sum(daily.study_minutes - daily.focus_minutes), 0), 0),
    'questions', coalesce(sum(daily.questions), 0),
    'studyDays', count(*) filter (where daily.study_minutes > 0),
    'daily', coalesce(jsonb_agg(jsonb_build_object(
      'date', daily.day,
      'studyMinutes', daily.study_minutes,
      'focusMinutes', daily.focus_minutes,
      'questions', daily.questions
    ) order by daily.day), '[]'::jsonb)
  )
  into payload
  from daily;

  return coalesce(payload, jsonb_build_object(
    'studyMinutes', 0, 'focusMinutes', 0, 'nonFocusMinutes', 0,
    'questions', 0, 'studyDays', 0, 'daily', '[]'::jsonb
  ));
end;
$$;

revoke all on function public.verified_study_minutes_for_user_day(uuid, date) from public, anon, authenticated;
revoke all on function public.verified_study_questions_for_user_day(uuid, date) from public, anon, authenticated;
revoke all on function public.study_streak_for_user(uuid) from public, anon, authenticated;
revoke all on function public.get_my_study_time_statistics(date) from public, anon, authenticated;
grant execute on function public.get_my_study_time_statistics(date) to authenticated;
alter function public.get_live_streak() volatile;

-- Topic completion and revision planning are separate user actions. Historical
-- revision rows are intentionally preserved.
drop trigger if exists konu_takibi_create_repeats on public.konu_takibi;

-- The server derives blank answers from the versioned course catalogue. The
-- whole exam remains one transaction: any invalid detail rolls back the parent.
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
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
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

  select profile.yks_year into viewer_year from public.profiles as profile where profile.id = viewer;
  insert into public.denemeler (user_id, sinav_turu, yayin, tarih, sure_dakika)
  values (viewer, p_exam_type, trim(p_publisher), p_exam_date, p_duration_minutes)
  returning id into created_id;

  for item in select value from jsonb_array_elements(p_details) loop
    if coalesce(item->>'ders_id', '') !~ '^[0-9a-fA-F-]{36}$'
      or coalesce(item->>'dogru', '') !~ '^\d+$'
      or coalesce(item->>'yanlis', '') !~ '^\d+$' then
      raise exception using errcode = '22023', message = 'Doğru ve yanlış sayıları negatif olmayan tam sayı olmalıdır.';
    end if;
    select * into course from public.dersler
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
  end loop;
  return created_id;
end;
$$;

revoke all on function public.create_exam_with_details(text, text, date, integer, jsonb) from public, anon, authenticated;
grant execute on function public.create_exam_with_details(text, text, date, integer, jsonb) to authenticated;

-- Atomic database persistence for one wrong question and all its images. The
-- browser still uploads/removes private objects, but a DB error cannot leave a
-- partially updated question/image relation.
create or replace function public.save_wrong_question_with_images(
  p_question_id uuid,
  p_exam_type text,
  p_course_id uuid,
  p_topic text,
  p_source text,
  p_page integer,
  p_question_number text,
  p_image_paths jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  viewer_year smallint;
  viewer_field text;
  result_id uuid;
  path_value text;
  position integer := 0;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
  end if;
  if p_exam_type not in ('TYT', 'AYT', 'YDT') or p_course_id is null then
    raise exception using errcode = '22023', message = 'Geçerli bir ders seçmelisin.';
  end if;
  if p_page is not null and p_page < 1 then
    raise exception using errcode = '22023', message = 'Sayfa numarası pozitif olmalıdır.';
  end if;
  if jsonb_typeof(coalesce(p_image_paths, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_image_paths, '[]'::jsonb)) > 6 then
    raise exception using errcode = '22023', message = 'Bir soruya en fazla 6 görsel ekleyebilirsin.';
  end if;

  select profile.yks_year, profile.alan_secimi
  into viewer_year, viewer_field
  from public.profiles as profile where profile.id = viewer;
  if not exists (
    select 1 from public.dersler as course
    where course.id = p_course_id
      and course.sinav_turu = p_exam_type
      and course.curriculum_year = coalesce(viewer_year, 2027)
      and viewer_field = any(course.alan)
  ) then
    raise exception using errcode = '22023', message = 'Ders seçimi hesabınla eşleşmiyor.';
  end if;

  for path_value in select jsonb_array_elements_text(coalesce(p_image_paths, '[]'::jsonb)) loop
    if path_value !~ ('^' || viewer::text || '/wrong-questions/[A-Za-z0-9._-]{3,220}$') then
      raise exception using errcode = '22023', message = 'Görsel yolu doğrulanamadı.';
    end if;
  end loop;

  if p_question_id is null then
    insert into public.yapamadiklari (
      user_id, ders_id, sinav_turu, konu, kaynak, sayfa, soru_no, foto_url
    ) values (
      viewer, p_course_id, p_exam_type, nullif(trim(p_topic), ''),
      nullif(trim(p_source), ''), p_page, nullif(trim(p_question_number), ''),
      (p_image_paths->>0)
    ) returning id into result_id;
  else
    update public.yapamadiklari as question
    set ders_id = p_course_id,
        sinav_turu = p_exam_type,
        konu = nullif(trim(p_topic), ''),
        kaynak = nullif(trim(p_source), ''),
        sayfa = p_page,
        soru_no = nullif(trim(p_question_number), ''),
        foto_url = (p_image_paths->>0)
    where question.id = p_question_id and question.user_id = viewer
    returning question.id into result_id;
    if result_id is null then
      raise exception using errcode = '42501', message = 'Soru kaydı bu hesaba ait değil.';
    end if;
    delete from public.yapamadiklari_gorseller as image
    where image.user_id = viewer and image.soru_id = result_id;
  end if;

  for path_value in select jsonb_array_elements_text(coalesce(p_image_paths, '[]'::jsonb)) loop
    insert into public.yapamadiklari_gorseller(user_id, soru_id, storage_path, sort_order)
    values (viewer, result_id, path_value, position);
    position := position + 1;
  end loop;
  return result_id;
end;
$$;

create or replace function public.create_wrong_questions_from_images(
  p_exam_type text,
  p_course_id uuid,
  p_topic text,
  p_source text,
  p_image_paths jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  path_value text;
  created_id uuid;
  created_ids jsonb := '[]'::jsonb;
begin
  if viewer is null or jsonb_typeof(p_image_paths) <> 'array'
    or jsonb_array_length(p_image_paths) not between 1 and 50 then
    raise exception using errcode = '22023', message = '1-50 arası soru görseli seçmelisin.';
  end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended('wrong-question-bulk:' || viewer::text, 0));
  for path_value in select jsonb_array_elements_text(p_image_paths) loop
    created_id := public.save_wrong_question_with_images(
      null, p_exam_type, p_course_id, p_topic, p_source, null, null,
      jsonb_build_array(path_value)
    );
    created_ids := created_ids || jsonb_build_array(created_id);
  end loop;
  return jsonb_build_object('created', jsonb_array_length(created_ids), 'ids', created_ids);
end;
$$;

revoke all on function public.save_wrong_question_with_images(uuid, text, uuid, text, text, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.create_wrong_questions_from_images(text, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_wrong_question_with_images(uuid, text, uuid, text, text, integer, text, jsonb) to authenticated;
grant execute on function public.create_wrong_questions_from_images(text, uuid, text, text, jsonb) to authenticated;

-- YouTube imports receive a client-generated request id. Retrying the same
-- request is safe and returns the original result without creating new tasks.
create unique index if not exists kaynaklarim_youtube_import_request_unique
on public.kaynaklarim(user_id, ((source_metadata->>'requestId')))
where source_metadata ? 'requestId';

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
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
  end if;
  if coalesce(p_request_id, '') !~ '^[0-9a-fA-F-]{36}$' then
    raise exception using errcode = '22023', message = 'Plan istek anahtarı geçersiz.';
  end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended('youtube-import:' || viewer::text || ':' || p_request_id, 0));
  select resource.id into existing_resource
  from public.kaynaklarim as resource
  where resource.user_id = viewer and resource.source_metadata->>'requestId' = p_request_id;
  if existing_resource is not null then
    return jsonb_build_object(
      'resourceId', existing_resource,
      'tasksCreated', (select count(*) from public.gunluk_gorevler as task where task.user_id = viewer and task.kaynak_id = existing_resource),
      'itemsCreated', (select count(*) from public.youtube_resource_items as item where item.user_id = viewer and item.resource_id = existing_resource),
      'reused', true
    );
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

revoke all on function public.import_youtube_learning_plan_idempotent(text, jsonb, jsonb, date, text, integer, uuid) from public, anon, authenticated;
grant execute on function public.import_youtube_learning_plan_idempotent(text, jsonb, jsonb, date, text, integer, uuid) to authenticated;
