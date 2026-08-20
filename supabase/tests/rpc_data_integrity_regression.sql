-- Transactional production-safe regression coverage for RPCs touched in the
-- reliability pass. The dedicated QA account is used and every write rolls back.
begin;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users where email = 'claude.test@calisiyo.app' limit 1),
  true
);

do $$
declare
  viewer uuid := (select auth.uid());
  viewer_year smallint;
  viewer_field text;
  course_one uuid;
  course_two uuid;
  exam_id uuid;
  rejected boolean;
  question_id uuid;
  image_count integer;
  created jsonb;
  before_count integer;
  request_id text := gen_random_uuid()::text;
  first_import jsonb;
  retry_import jsonb;
  today_date date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if viewer is null then raise exception 'Dedicated QA account was not found'; end if;
  select profile.yks_year, profile.alan_secimi
  into viewer_year, viewer_field
  from public.profiles as profile where profile.id = viewer;

  select min(course.id::text)::uuid, max(course.id::text)::uuid
  into course_one, course_two
  from public.dersler as course
  where course.curriculum_year = coalesce(viewer_year, 2027)
    and course.sinav_turu = 'TYT'
    and course.question_count = 40
    and viewer_field = any(course.alan);
  if course_one is null or course_two is null or course_one = course_two then
    raise exception 'Two 40-question TYT courses are required for exam regression';
  end if;

  rejected := false;
  begin
    perform public.create_exam_with_details(
      'TYT', 'Rollback invalid totals', today_date, 120,
      jsonb_build_array(jsonb_build_object('ders_id', course_one, 'dogru', 39, 'yanlis', 2))
    );
  exception when sqlstate '22023' then rejected := true;
  end;
  if not rejected then raise exception '39 + 2 was accepted for a 40-question course'; end if;

  rejected := false;
  begin
    perform public.create_exam_with_details(
      'TYT', 'Rollback negative input', today_date, 120,
      jsonb_build_array(jsonb_build_object('ders_id', course_one, 'dogru', -1, 'yanlis', 0))
    );
  exception when sqlstate '22023' then rejected := true;
  end;
  if not rejected then raise exception 'Negative exam input was accepted'; end if;

  rejected := false;
  begin
    perform public.create_exam_with_details('TYT', 'Rollback empty input', today_date, 120, '[]'::jsonb);
  exception when sqlstate '22023' then rejected := true;
  end;
  if not rejected then raise exception 'Empty exam detail list was accepted'; end if;

  exam_id := public.create_exam_with_details(
    'TYT', 'Rollback valid exam', today_date, 120,
    jsonb_build_array(
      jsonb_build_object('ders_id', course_one, 'dogru', 34, 'yanlis', 3),
      jsonb_build_object('ders_id', course_two, 'dogru', 40, 'yanlis', 0)
    )
  );
  if (select bos from public.deneme_detaylari where deneme_id = exam_id and ders_id = course_one) <> 3
    or (select bos from public.deneme_detaylari where deneme_id = exam_id and ders_id = course_two) <> 0 then
    raise exception 'Server-derived blank counts are incorrect';
  end if;

  question_id := public.save_wrong_question_with_images(
    null, 'TYT', course_one, 'Rollback konu', 'Rollback kaynak', null, null,
    jsonb_build_array(
      viewer::text || '/wrong-questions/' || gen_random_uuid()::text || '.png',
      viewer::text || '/wrong-questions/' || gen_random_uuid()::text || '.png'
    )
  );
  select count(*) into image_count from public.yapamadiklari_gorseller where soru_id = question_id;
  if image_count <> 2 then raise exception 'Single-question multi-image save is incomplete'; end if;

  -- Editing replaces the relation atomically and removing images remains valid.
  perform public.save_wrong_question_with_images(
    question_id, 'TYT', course_one, 'Rollback konu güncel', 'Rollback kaynak', null, null,
    jsonb_build_array(viewer::text || '/wrong-questions/' || gen_random_uuid()::text || '.png')
  );
  select count(*) into image_count from public.yapamadiklari_gorseller where soru_id = question_id;
  if image_count <> 1 then raise exception 'Question image edit did not replace relations atomically'; end if;

  question_id := public.save_wrong_question_with_images(
    null, 'TYT', course_one, 'Rollback görselsiz', null, null, null, '[]'::jsonb
  );
  select count(*) into image_count from public.yapamadiklari_gorseller where soru_id = question_id;
  if image_count <> 0 then raise exception 'Image-free question unexpectedly created an image'; end if;

  select count(*) into before_count from public.yapamadiklari where user_id = viewer;
  created := public.create_wrong_questions_from_images(
    'TYT', course_one, 'Rollback toplu', 'Rollback kaynak',
    jsonb_build_array(
      viewer::text || '/wrong-questions/' || gen_random_uuid()::text || '.png',
      viewer::text || '/wrong-questions/' || gen_random_uuid()::text || '.png',
      viewer::text || '/wrong-questions/' || gen_random_uuid()::text || '.png'
    )
  );
  if (created->>'created')::integer <> 3
    or (select count(*) from public.yapamadiklari where user_id = viewer) <> before_count + 3 then
    raise exception 'Bulk image creation is incomplete';
  end if;

  rejected := false;
  before_count := (select count(*) from public.yapamadiklari where user_id = viewer);
  begin
    perform public.save_wrong_question_with_images(
      null, 'TYT', course_one, null, null, null, null,
      jsonb_build_array(gen_random_uuid()::text || '/wrong-questions/not-owned.png')
    );
  exception when sqlstate '22023' then rejected := true;
  end;
  if not rejected or (select count(*) from public.yapamadiklari where user_id = viewer) <> before_count then
    raise exception 'Invalid storage ownership was not rejected atomically';
  end if;

  first_import := public.import_youtube_learning_plan_idempotent(
    request_id,
    jsonb_build_object(
      'kind', 'youtube_video',
      'url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'externalId', 'dQw4w9WgXcQ',
      'title', 'Rollback 80 dakika QA',
      'channelTitle', 'Rollback QA',
      'durationMinutes', 80
    ),
    jsonb_build_array(jsonb_build_object(
      'videoId', 'dQw4w9WgXcQ',
      'title', 'Rollback 80 dakika QA',
      'channelTitle', 'Rollback QA',
      'durationSeconds', 4800,
      'startOffsetSeconds', 0,
      'position', 25,
      'scheduledDate', today_date
    )),
    today_date, 'daily', 80, course_one
  );
  retry_import := public.import_youtube_learning_plan_idempotent(
    request_id,
    jsonb_build_object(
      'kind', 'youtube_video',
      'url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'externalId', 'dQw4w9WgXcQ',
      'title', 'Rollback 80 dakika QA',
      'channelTitle', 'Rollback QA',
      'durationMinutes', 80
    ),
    jsonb_build_array(jsonb_build_object(
      'videoId', 'dQw4w9WgXcQ',
      'title', 'Rollback 80 dakika QA',
      'channelTitle', 'Rollback QA',
      'durationSeconds', 4800,
      'startOffsetSeconds', 0,
      'position', 25,
      'scheduledDate', today_date
    )),
    today_date, 'daily', 80, course_one
  );
  if first_import->>'resourceId' <> retry_import->>'resourceId'
    or coalesce((first_import->>'reused')::boolean, true)
    or not coalesce((retry_import->>'reused')::boolean, false)
    or (retry_import->>'tasksCreated')::integer <> 1 then
    raise exception 'YouTube retry created duplicate resources or tasks';
  end if;
end;
$$;

rollback;
