-- Restore truthful historical streak/statistics calculations and add the
-- requested goal, wrong-question and social-classroom capabilities. Existing
-- study rows are never rewritten or deleted by this migration.

-- ---------------------------------------------------------------------------
-- 1. Historical streaks and correctly separated study/focus statistics
-- ---------------------------------------------------------------------------
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
    select coalesce(sum(log.sure_dakika), 0)::integer as minutes
    from public.calisma_suresi as log
    where log.user_id = p_user_id and log.tarih = p_date
  ), completed_plan as (
    select coalesce(sum(
      greatest(
        0,
        extract(epoch from (
          task.bitis_saat - task.baslangic_saat
        )) / 60
        + case when task.bitis_saat < task.baslangic_saat then 1440 else 0 end
      )
    ), 0)::integer as minutes
    from public.gunluk_gorevler as task
    where task.user_id = p_user_id
      and task.tarih = p_date
      and task.tamamlandi
  )
  select greatest(logged.minutes, completed_plan.minutes)
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
  -- Use the latest qualifying historical day so a valid old streak remains
  -- visible until the learner starts a new run. Future plans are excluded.
  select max(day_value)
  into cursor_date
  from (
    select log.tarih as day_value
    from public.calisma_suresi as log
    where log.user_id = p_user_id and log.tarih <= today_date
    union
    select task.tarih
    from public.gunluk_gorevler as task
    where task.user_id = p_user_id
      and task.tamamlandi
      and task.tarih <= today_date
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

create or replace function public.get_live_streak()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  today_date date := (now() at time zone 'Europe/Istanbul')::date;
  today_minutes integer;
  result integer;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  today_minutes := public.verified_study_minutes_for_user_day(viewer, today_date);
  result := public.study_streak_for_user(viewer);
  return jsonb_build_object(
    'streak', result,
    'todayMinutes', today_minutes,
    'qualified', today_minutes >= 30,
    'remainingMinutes', greatest(0, 30 - today_minutes),
    'serverTime', clock_timestamp()
  );
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

  with study_daily as (
    select log.tarih,
      sum(greatest(coalesce(log.sure_dakika, 0), 0))::integer as study_minutes,
      sum(greatest(coalesce(log.soru_sayisi, 0), 0))::integer as questions
    from public.calisma_suresi as log
    where log.user_id = viewer
      and (p_start_date is null or log.tarih >= p_start_date)
    group by log.tarih
  ), focus_daily as (
    select (session.tarih at time zone 'Europe/Istanbul')::date as tarih,
      sum(greatest(coalesce(session.calisma_suresi, 0), 0))::integer as focus_minutes
    from public.pomodoro_kayitlari as session
    where session.user_id = viewer
      and (p_start_date is null or (session.tarih at time zone 'Europe/Istanbul')::date >= p_start_date)
    group by (session.tarih at time zone 'Europe/Istanbul')::date
  ), combined as (
    select coalesce(study.tarih, focus.tarih) as day,
      coalesce(study.study_minutes, 0) as study_minutes,
      least(coalesce(focus.focus_minutes, 0), coalesce(study.study_minutes, focus.focus_minutes, 0)) as focus_minutes,
      coalesce(study.questions, 0) as questions
    from study_daily as study
    full join focus_daily as focus on focus.tarih = study.tarih
  )
  select jsonb_build_object(
    'studyMinutes', coalesce(sum(combined.study_minutes), 0),
    'focusMinutes', coalesce(sum(combined.focus_minutes), 0),
    'nonFocusMinutes', greatest(coalesce(sum(combined.study_minutes - combined.focus_minutes), 0), 0),
    'questions', coalesce(sum(combined.questions), 0),
    'studyDays', count(*) filter (where combined.study_minutes > 0),
    'daily', coalesce(jsonb_agg(jsonb_build_object(
      'date', combined.day,
      'studyMinutes', combined.study_minutes,
      'focusMinutes', combined.focus_minutes,
      'questions', combined.questions
    ) order by combined.day), '[]'::jsonb)
  )
  into payload
  from combined;

  return coalesce(payload, jsonb_build_object(
    'studyMinutes', 0, 'focusMinutes', 0, 'nonFocusMinutes', 0,
    'questions', 0, 'studyDays', 0, 'daily', '[]'::jsonb
  ));
end;
$$;

revoke all on function public.verified_study_minutes_for_user_day(uuid, date) from public, anon, authenticated;
revoke all on function public.study_streak_for_user(uuid) from public, anon, authenticated;
revoke all on function public.get_live_streak() from public, anon, authenticated;
revoke all on function public.get_my_study_time_statistics(date) from public, anon, authenticated;
grant execute on function public.study_streak_for_user(uuid) to authenticated;
grant execute on function public.get_live_streak() to authenticated;
grant execute on function public.get_my_study_time_statistics(date) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Multiple images per wrong question (legacy foto_url remains compatible)
-- ---------------------------------------------------------------------------
create unique index if not exists yapamadiklari_user_id_id_unique
  on public.yapamadiklari(user_id, id);

create table if not exists public.yapamadiklari_gorseller (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  soru_id uuid not null,
  storage_path text not null check (char_length(trim(storage_path)) between 3 and 500),
  sort_order smallint not null default 0 check (sort_order between 0 and 20),
  created_at timestamptz not null default now(),
  foreign key (user_id, soru_id)
    references public.yapamadiklari(user_id, id) on delete cascade,
  unique (soru_id, storage_path)
);

create index if not exists yapamadiklari_gorseller_owner_question_idx
  on public.yapamadiklari_gorseller(user_id, soru_id, sort_order);

alter table public.yapamadiklari_gorseller enable row level security;
revoke all on table public.yapamadiklari_gorseller from anon;
grant select, insert, update, delete on table public.yapamadiklari_gorseller to authenticated;
drop policy if exists "Users own wrong question images" on public.yapamadiklari_gorseller;
create policy "Users own wrong question images"
on public.yapamadiklari_gorseller for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

insert into public.yapamadiklari_gorseller(user_id, soru_id, storage_path, sort_order)
select question.user_id, question.id, question.foto_url, 0
from public.yapamadiklari as question
where question.user_id is not null
  and nullif(trim(question.foto_url), '') is not null
on conflict (soru_id, storage_path) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Current 2027 TYT/AYT Mathematics geometry curriculum
-- ---------------------------------------------------------------------------
with geometry_topics(exam_type, topic_name, position) as (
  values
    ('TYT', 'Geometri · Doğruda ve Üçgende Açılar', 1),
    ('TYT', 'Geometri · Üçgenler', 2),
    ('TYT', 'Geometri · Dörtgenler ve Çokgenler', 3),
    ('TYT', 'Geometri · Çember ve Daire', 4),
    ('TYT', 'Geometri · Katı Cisimler', 5),
    ('TYT', 'Geometri · Analitik Geometri', 6),
    ('AYT', 'Geometri · Üçgenler', 1),
    ('AYT', 'Geometri · Dörtgenler ve Çokgenler', 2),
    ('AYT', 'Geometri · Çember ve Daire', 3),
    ('AYT', 'Geometri · Analitik Geometri', 4),
    ('AYT', 'Geometri · Dönüşüm Geometrisi', 5)
), base as (
  select course.id as course_id, course.sinav_turu,
    coalesce((select max(topic.sira) from public.konular as topic where topic.ders_id = course.id), 0) as last_position
  from public.dersler as course
  where course.curriculum_year = 2027
    and course.ad = 'Matematik'
    and course.sinav_turu in ('TYT', 'AYT')
)
insert into public.konular(ders_id, ad, sira)
select base.course_id, geometry.topic_name, base.last_position + geometry.position
from base
join geometry_topics as geometry on geometry.exam_type = base.sinav_turu
where not exists (
  select 1 from public.konular as existing
  where existing.ders_id = base.course_id and existing.ad = geometry.topic_name
);

-- ---------------------------------------------------------------------------
-- 4. Usernames and public/open or password-protected study classes
-- ---------------------------------------------------------------------------
alter table public.social_profiles add column if not exists username text;

update public.social_profiles
set username = 'ogrenci_' || substring(replace(user_id::text, '-', '') from 1 for 12)
where username is null or trim(username) = '';

alter table public.social_profiles alter column username set not null;
alter table public.social_profiles alter column username set default (
  'ogrenci_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)
);
alter table public.social_profiles drop constraint if exists social_profiles_username_format;
alter table public.social_profiles add constraint social_profiles_username_format
  check (username ~ '^[a-z][a-z0-9_]{2,23}$');
create unique index if not exists social_profiles_username_lower_unique
  on public.social_profiles(lower(username));

alter table public.study_groups
  add column if not exists access_type text not null default 'open',
  add column if not exists password_hash text;
alter table public.study_groups drop constraint if exists study_groups_access_type_check;
alter table public.study_groups add constraint study_groups_access_type_check
  check (access_type in ('open', 'password'));
alter table public.study_groups drop constraint if exists study_groups_password_consistency;
alter table public.study_groups add constraint study_groups_password_consistency
  check (
    (access_type = 'open' and password_hash is null)
    or (access_type = 'password' and password_hash is not null)
  );

create index if not exists study_groups_public_directory_idx
  on public.study_groups(is_archived, created_at desc);

create or replace function public.set_my_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  clean_username text := lower(trim(coalesce(p_username, '')));
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  if clean_username !~ '^[a-z][a-z0-9_]{2,23}$' then
    raise exception using errcode = '22023', message = 'Kullanıcı adı 3-24 karakter olmalı; harf ile başlayıp yalnızca küçük harf, rakam ve alt çizgi içermeli.';
  end if;
  if clean_username in ('admin', 'administrator', 'calisiyo', 'destek', 'support', 'system') then
    raise exception using errcode = '22023', message = 'Bu kullanıcı adı kullanılamaz.';
  end if;
  update public.social_profiles
  set username = clean_username, updated_at = now()
  where user_id = viewer;
  return jsonb_build_object('username', clean_username);
exception when unique_violation then
  raise exception using errcode = '23505', message = 'Bu kullanıcı adı daha önce alınmış.';
end;
$$;

create or replace function public.get_my_social_identity()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'username', social.username,
    'friendCode', social.friend_code
  )
  from public.social_profiles as social
  where social.user_id = (select auth.uid())
    and public.is_active_user();
$$;

create or replace function public.find_student_by_username(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  target uuid;
  result jsonb;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  select social.user_id into target
  from public.social_profiles as social
  join public.profiles as profile on profile.id = social.user_id
  where lower(social.username) = lower(trim(coalesce(p_username, '')))
    and social.allow_friend_requests
    and profile.account_status = 'active';
  if target is null or target = viewer then
    raise exception using errcode = 'P0002', message = 'Bu kullanıcı adıyla eklenebilir bir öğrenci bulunamadı.';
  end if;
  select jsonb_build_object(
    'userId', profile.id,
    'name', profile.full_name,
    'username', social.username,
    'avatarUrl', profile.avatar_url,
    'friendshipStatus', friendship.status
  ) into result
  from public.profiles as profile
  join public.social_profiles as social on social.user_id = profile.id
  left join public.friendships as friendship
    on least(friendship.requester_id, friendship.addressee_id) = least(viewer, target)
   and greatest(friendship.requester_id, friendship.addressee_id) = greatest(viewer, target)
  where profile.id = target;
  return result;
end;
$$;

create or replace function public.send_friend_request_by_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  target uuid;
  created public.friendships%rowtype;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  select social.user_id into target
  from public.social_profiles as social
  join public.profiles as profile on profile.id = social.user_id
  where lower(social.username) = lower(trim(coalesce(p_username, '')))
    and social.allow_friend_requests
    and profile.account_status = 'active';
  if target is null or target = viewer then
    raise exception using errcode = 'P0002', message = 'Bu kullanıcı adıyla eklenebilir bir öğrenci bulunamadı.';
  end if;
  insert into public.friendships(requester_id, addressee_id)
  values (viewer, target)
  returning * into created;
  if coalesce((select notifications_enabled from public.profiles where id = target), true) then
    insert into public.notifications(user_id, kind, title, body, action_url, dedupe_key)
    values (
      target, 'info', 'Yeni çalışma arkadaşı isteği',
      (select full_name from public.profiles where id = viewer) || ' seninle çalışmak istiyor.',
      '/dashboard/arkadaslar', 'friend-request-' || created.id::text
    ) on conflict (user_id, dedupe_key) do nothing;
  end if;
  return jsonb_build_object('friendshipId', created.id, 'status', created.status);
exception when unique_violation then
  raise exception using errcode = '23505', message = 'Bu öğrenciyle zaten bir arkadaşlık isteğin var.';
end;
$$;

create or replace function public.create_study_group_v4(
  p_name text,
  p_description text,
  p_weekly_goal_minutes integer,
  p_max_members integer,
  p_exam_track text,
  p_study_style text,
  p_access_type text,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_access text := lower(trim(coalesce(p_access_type, 'open')));
  clean_password text := coalesce(p_password, '');
  created jsonb;
  group_id uuid;
begin
  if clean_access not in ('open', 'password') then
    raise exception using errcode = '22023', message = 'Geçerli bir sınıf erişim türü seçmelisin.';
  end if;
  if clean_access = 'password' and char_length(clean_password) not between 4 and 32 then
    raise exception using errcode = '22023', message = 'Sınıf şifresi 4-32 karakter olmalı.';
  end if;

  created := public.create_study_group_v3(
    p_name, p_description, p_weekly_goal_minutes, p_max_members,
    p_exam_track, p_study_style
  );
  group_id := (created ->> 'id')::uuid;
  update public.study_groups
  set access_type = clean_access,
      password_hash = case when clean_access = 'password'
        then extensions.crypt(clean_password, extensions.gen_salt('bf'))
        else null end,
      updated_at = now()
  where id = group_id;
  return created || jsonb_build_object('accessType', clean_access);
end;
$$;

create or replace function public.list_public_study_groups()
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
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', room.id,
    'name', room.name,
    'description', room.description,
    'accessType', room.access_type,
    'examTrack', room.exam_track,
    'studyStyle', room.study_style,
    'weeklyGoalMinutes', room.weekly_goal_minutes,
    'memberCount', (select count(*) from public.study_group_members where group_id = room.id),
    'maxMembers', room.max_members,
    'ownerName', owner_profile.full_name,
    'ownerUsername', owner_social.username,
    'isMember', exists (
      select 1 from public.study_group_members as mine
      where mine.group_id = room.id and mine.user_id = viewer
    ),
    'createdAt', room.created_at
  ) order by room.created_at desc), '[]'::jsonb)
  into result
  from public.study_groups as room
  join public.profiles as owner_profile on owner_profile.id = room.owner_id
  join public.social_profiles as owner_social on owner_social.user_id = room.owner_id
  where not room.is_archived and owner_profile.account_status = 'active';
  return result;
end;
$$;

create or replace function public.join_public_study_group(
  p_group_id uuid,
  p_password text default null
)
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
  if exists (select 1 from public.study_group_members where group_id = p_group_id and user_id = viewer) then
    return jsonb_build_object('id', p_group_id, 'alreadyMember', true);
  end if;
  join_limit := public.plan_entitlement_limit('classroom_join_limit');
  if (select count(*) from public.study_group_members where user_id = viewer) >= join_limit then
    raise exception using errcode = '54000', message = 'Planındaki sınıf katılım limitine ulaştın.';
  end if;
  select * into target_group
  from public.study_groups
  where id = p_group_id and not is_archived
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Çalışma sınıfı bulunamadı.';
  end if;
  if target_group.access_type = 'password'
    and (p_password is null or extensions.crypt(p_password, target_group.password_hash) <> target_group.password_hash) then
    raise exception using errcode = '28P01', message = 'Sınıf şifresi hatalı.';
  end if;
  select count(*) into member_count from public.study_group_members where group_id = target_group.id;
  if member_count >= target_group.max_members then
    raise exception using errcode = '54000', message = 'Bu çalışma sınıfı dolu.';
  end if;
  insert into public.study_group_members(group_id, user_id)
  values (target_group.id, viewer);
  if coalesce((select notifications_enabled from public.profiles where id = target_group.owner_id), true)
    and target_group.owner_id <> viewer then
    insert into public.notifications(user_id, kind, title, body, action_url, dedupe_key)
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

-- Invite codes cannot bypass the password requirement of a protected class.
create or replace function public.join_study_group(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  target_access text;
begin
  select room.id, room.access_type into target_id, target_access
  from public.study_groups as room
  where upper(trim(room.invite_code)) = upper(trim(p_invite_code))
    and not room.is_archived;
  if target_id is null then
    raise exception using errcode = 'P0002', message = 'Bu davet koduyla açık bir sınıf bulunamadı.';
  end if;
  if target_access = 'password' then
    raise exception using errcode = '42501', message = 'Bu sınıf şifreli. Sınıflar listesinden şifresiyle katılmalısın.';
  end if;
  return public.join_public_study_group(target_id, null);
end;
$$;

revoke all on function public.set_my_username(text) from public, anon, authenticated;
revoke all on function public.get_my_social_identity() from public, anon, authenticated;
revoke all on function public.find_student_by_username(text) from public, anon, authenticated;
revoke all on function public.send_friend_request_by_username(text) from public, anon, authenticated;
revoke all on function public.create_study_group_v4(text,text,integer,integer,text,text,text,text) from public, anon, authenticated;
revoke all on function public.list_public_study_groups() from public, anon, authenticated;
revoke all on function public.join_public_study_group(uuid,text) from public, anon, authenticated;
revoke all on function public.join_study_group(text) from public, anon, authenticated;
grant execute on function public.set_my_username(text) to authenticated;
grant execute on function public.get_my_social_identity() to authenticated;
grant execute on function public.find_student_by_username(text) to authenticated;
grant execute on function public.send_friend_request_by_username(text) to authenticated;
grant execute on function public.create_study_group_v4(text,text,integer,integer,text,text,text,text) to authenticated;
grant execute on function public.list_public_study_groups() to authenticated;
grant execute on function public.join_public_study_group(uuid,text) to authenticated;
grant execute on function public.join_study_group(text) to authenticated;
