-- Rich, privacy-safe classroom avatars, movement, reactions, and shared focus sessions.

alter table public.social_profiles
  add column if not exists avatar_seed text not null default (
    'calisiyo-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)
  ),
  add column if not exists avatar_hair text not null default 'short01',
  add column if not exists avatar_skin text not null default 'f2d3b1',
  add column if not exists avatar_hair_color text not null default '0e0e0e',
  add column if not exists avatar_background text not null default 'e8f7f1',
  add column if not exists avatar_glasses text not null default 'none',
  add column if not exists avatar_expression text not null default 'variant01';

alter table public.study_groups
  add column if not exists room_theme text not null default 'sunny',
  add column if not exists room_motto text not null default 'Birlikte odaklan, kendi ritminde ilerle.';

alter table public.study_presence
  add column if not exists position_x numeric(5,2) not null default 50,
  add column if not exists position_y numeric(5,2) not null default 72,
  add column if not exists facing text not null default 'right',
  add column if not exists last_move_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'social_profiles_avatar_seed_valid') then
    alter table public.social_profiles add constraint social_profiles_avatar_seed_valid
      check (char_length(avatar_seed) between 3 and 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'social_profiles_avatar_hair_valid') then
    alter table public.social_profiles add constraint social_profiles_avatar_hair_valid
      check (avatar_hair = any (array[
        'short01','short02','short03','short04','short05','short06',
        'short07','short08','short09','short10','long01','long02',
        'long03','long04','long05','long06'
      ]));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'social_profiles_avatar_skin_valid') then
    alter table public.social_profiles add constraint social_profiles_avatar_skin_valid
      check (avatar_skin = any (array['f2d3b1','ecad80','9e5622','763900']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'social_profiles_avatar_hair_color_valid') then
    alter table public.social_profiles add constraint social_profiles_avatar_hair_color_valid
      check (avatar_hair_color = any (array[
        '0e0e0e','e5d7a3','b9a05f','796a45','6a4e35','562306',
        'afafaf','85c2c6','dba3be','592454','ac6511','cb6820'
      ]));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'social_profiles_avatar_background_valid') then
    alter table public.social_profiles add constraint social_profiles_avatar_background_valid
      check (avatar_background = any (array['e8f7f1','eaf2ff','fff1df','f0ebff','ffe9ef','e8f4f8']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'social_profiles_avatar_glasses_valid') then
    alter table public.social_profiles add constraint social_profiles_avatar_glasses_valid
      check (avatar_glasses = any (array['none','variant01','variant02','variant03','variant04','variant05']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'social_profiles_avatar_expression_valid') then
    alter table public.social_profiles add constraint social_profiles_avatar_expression_valid
      check (avatar_expression = any (array['variant01','variant05','variant10','variant14','variant18','variant22']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_groups_room_theme_valid') then
    alter table public.study_groups add constraint study_groups_room_theme_valid
      check (room_theme = any (array['sunny','library','evening']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_groups_room_motto_valid') then
    alter table public.study_groups add constraint study_groups_room_motto_valid
      check (char_length(trim(room_motto)) between 2 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_presence_position_x_valid') then
    alter table public.study_presence add constraint study_presence_position_x_valid
      check (position_x between 4 and 96);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_presence_position_y_valid') then
    alter table public.study_presence add constraint study_presence_position_y_valid
      check (position_y between 8 and 92);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_presence_facing_valid') then
    alter table public.study_presence add constraint study_presence_facing_valid
      check (facing in ('left', 'right'));
  end if;
end;
$$;

create table if not exists public.study_group_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  started_by uuid not null references public.profiles(id) on delete cascade,
  duration_minutes integer not null check (duration_minutes in (15, 25, 40, 50)),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > started_at)
);

create unique index if not exists study_group_one_active_focus_idx
on public.study_group_focus_sessions (group_id)
where status = 'active';

create index if not exists study_group_focus_group_started_idx
on public.study_group_focus_sessions (group_id, started_at desc);

create table if not exists public.study_group_reactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('hello','focus','coffee','clap','goal','wave')),
  created_at timestamptz not null default now()
);

create index if not exists study_group_reactions_group_created_idx
on public.study_group_reactions (group_id, created_at desc);

alter table public.study_group_focus_sessions enable row level security;
alter table public.study_group_reactions enable row level security;

revoke all on table public.study_group_focus_sessions from anon;
revoke insert, update, delete on table public.study_group_focus_sessions from authenticated;
grant select on table public.study_group_focus_sessions to authenticated;

revoke all on table public.study_group_reactions from anon;
revoke insert, update, delete on table public.study_group_reactions from authenticated;
grant select on table public.study_group_reactions to authenticated;

drop policy if exists "Members read group focus sessions" on public.study_group_focus_sessions;
create policy "Members read group focus sessions"
on public.study_group_focus_sessions for select to authenticated
using (public.is_study_group_member(group_id));

drop policy if exists "Members read group reactions" on public.study_group_reactions;
create policy "Members read group reactions"
on public.study_group_reactions for select to authenticated
using (public.is_study_group_member(group_id));

create or replace function public.update_classroom_avatar(
  p_hair text,
  p_skin text,
  p_hair_color text,
  p_background text,
  p_glasses text,
  p_expression text,
  p_shuffle boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  updated public.social_profiles%rowtype;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  if p_hair is null or not p_hair = any (array[
    'short01','short02','short03','short04','short05','short06',
    'short07','short08','short09','short10','long01','long02',
    'long03','long04','long05','long06'
  ]) then
    raise exception using errcode = '22023', message = 'Geçersiz saç seçimi.';
  end if;
  if p_skin is null or not p_skin = any (array['f2d3b1','ecad80','9e5622','763900']) then
    raise exception using errcode = '22023', message = 'Geçersiz ten rengi.';
  end if;
  if p_hair_color is null or not p_hair_color = any (array[
    '0e0e0e','e5d7a3','b9a05f','796a45','6a4e35','562306',
    'afafaf','85c2c6','dba3be','592454','ac6511','cb6820'
  ]) then
    raise exception using errcode = '22023', message = 'Geçersiz saç rengi.';
  end if;
  if p_background is null or not p_background = any (array['e8f7f1','eaf2ff','fff1df','f0ebff','ffe9ef','e8f4f8']) then
    raise exception using errcode = '22023', message = 'Geçersiz arka plan rengi.';
  end if;
  if p_glasses is null or not p_glasses = any (array['none','variant01','variant02','variant03','variant04','variant05']) then
    raise exception using errcode = '22023', message = 'Geçersiz gözlük seçimi.';
  end if;
  if p_expression is null or not p_expression = any (array['variant01','variant05','variant10','variant14','variant18','variant22']) then
    raise exception using errcode = '22023', message = 'Geçersiz ifade seçimi.';
  end if;

  update public.social_profiles
  set avatar_seed = case when coalesce(p_shuffle, false)
      then 'calisiyo-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)
      else avatar_seed end,
    avatar_hair = p_hair,
    avatar_skin = p_skin,
    avatar_hair_color = p_hair_color,
    avatar_background = p_background,
    avatar_glasses = p_glasses,
    avatar_expression = p_expression,
    updated_at = now()
  where user_id = viewer
  returning * into updated;

  if updated.user_id is null then
    raise exception using errcode = 'P0002', message = 'Sosyal profil bulunamadı.';
  end if;

  return jsonb_build_object(
    'seed', updated.avatar_seed,
    'hair', updated.avatar_hair,
    'skin', updated.avatar_skin,
    'hairColor', updated.avatar_hair_color,
    'background', updated.avatar_background,
    'glasses', updated.avatar_glasses,
    'expression', updated.avatar_expression
  );
end;
$$;

create or replace function public.move_in_classroom(
  p_group_id uuid,
  p_x numeric,
  p_y numeric,
  p_facing text default 'right'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  current_row public.study_presence%rowtype;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişimin yok.';
  end if;
  if p_x is null or p_y is null
    or p_x::text in ('NaN', 'Infinity', '-Infinity')
    or p_y::text in ('NaN', 'Infinity', '-Infinity')
    or p_x not between 4 and 96 or p_y not between 8 and 92 then
    raise exception using errcode = '22023', message = 'Sınıf konumu geçersiz.';
  end if;
  if p_facing not in ('left', 'right') then
    raise exception using errcode = '22023', message = 'Hareket yönü geçersiz.';
  end if;

  select presence.* into current_row
  from public.study_presence as presence
  where presence.group_id = p_group_id and presence.user_id = viewer;

  if current_row.last_move_at > clock_timestamp() - interval '80 milliseconds' then
    return jsonb_build_object(
      'x', current_row.position_x,
      'y', current_row.position_y,
      'facing', current_row.facing,
      'throttled', true
    );
  end if;

  insert into public.study_presence (
    group_id, user_id, status, position_x, position_y, facing, last_move_at, updated_at
  ) values (
    p_group_id, viewer, 'online', round(p_x, 2), round(p_y, 2), p_facing, clock_timestamp(), now()
  )
  on conflict (group_id, user_id) do update
  set position_x = excluded.position_x,
    position_y = excluded.position_y,
    facing = excluded.facing,
    last_move_at = excluded.last_move_at,
    updated_at = now()
  returning * into current_row;

  return jsonb_build_object(
    'x', current_row.position_x,
    'y', current_row.position_y,
    'facing', current_row.facing,
    'throttled', false
  );
end;
$$;

create or replace function public.send_classroom_reaction(
  p_group_id uuid,
  p_reaction text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  created public.study_group_reactions%rowtype;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişimin yok.';
  end if;
  if p_reaction is null or not p_reaction = any (array['hello','focus','coffee','clap','goal','wave']) then
    raise exception using errcode = '22023', message = 'Geçersiz sınıf tepkisi.';
  end if;
  if exists (
    select 1 from public.study_group_reactions
    where group_id = p_group_id and user_id = viewer
      and created_at > clock_timestamp() - interval '2 seconds'
  ) then
    raise exception using errcode = 'P0001', message = 'Yeni bir tepki göndermeden önce biraz bekle.';
  end if;

  delete from public.study_group_reactions
  where created_at < clock_timestamp() - interval '1 day';

  insert into public.study_group_reactions (group_id, user_id, reaction)
  values (p_group_id, viewer, p_reaction)
  returning * into created;

  return jsonb_build_object(
    'id', created.id,
    'userId', created.user_id,
    'reaction', created.reaction,
    'createdAt', created.created_at
  );
end;
$$;

create or replace function public.start_group_focus(
  p_group_id uuid,
  p_duration_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  created public.study_group_focus_sessions%rowtype;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişimin yok.';
  end if;
  if p_duration_minutes is null or p_duration_minutes not in (15, 25, 40, 50) then
    raise exception using errcode = '22023', message = 'Geçersiz odak süresi.';
  end if;

  update public.study_group_focus_sessions
  set status = 'completed', finished_at = ends_at
  where group_id = p_group_id and status = 'active' and ends_at <= clock_timestamp();

  if exists (
    select 1 from public.study_group_focus_sessions
    where group_id = p_group_id and status = 'active' and ends_at > clock_timestamp()
  ) then
    raise exception using errcode = '55000', message = 'Bu sınıfta zaten aktif bir odak turu var.';
  end if;

  insert into public.study_group_focus_sessions (
    group_id, started_by, duration_minutes, started_at, ends_at
  ) values (
    p_group_id, viewer, p_duration_minutes, clock_timestamp(),
    clock_timestamp() + make_interval(mins => p_duration_minutes)
  ) returning * into created;

  return jsonb_build_object(
    'id', created.id,
    'startedBy', created.started_by,
    'durationMinutes', created.duration_minutes,
    'startedAt', created.started_at,
    'endsAt', created.ends_at,
    'status', created.status
  );
end;
$$;

create or replace function public.stop_group_focus(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  owner_id uuid;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişimin yok.';
  end if;
  select room.owner_id into owner_id from public.study_groups as room where room.id = p_group_id;

  update public.study_group_focus_sessions
  set status = 'cancelled', finished_at = clock_timestamp()
  where group_id = p_group_id and status = 'active'
    and (started_by = viewer or owner_id = viewer);

  if not found then
    raise exception using errcode = '42501', message = 'Bu odak turunu yalnızca başlatan kişi veya sınıf sahibi durdurabilir.';
  end if;
  return true;
end;
$$;

create or replace function public.update_study_group_room(
  p_group_id uuid,
  p_theme text,
  p_motto text,
  p_weekly_goal_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  updated public.study_groups%rowtype;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  if not exists (select 1 from public.study_groups where id = p_group_id and owner_id = viewer) then
    raise exception using errcode = '42501', message = 'Sınıf ayarlarını yalnızca sınıf sahibi değiştirebilir.';
  end if;
  if p_theme is null or not p_theme = any (array['sunny','library','evening']) then
    raise exception using errcode = '22023', message = 'Geçersiz sınıf teması.';
  end if;
  if char_length(trim(coalesce(p_motto, ''))) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'Sınıf mesajı 2-80 karakter arasında olmalı.';
  end if;
  if p_weekly_goal_minutes is null or p_weekly_goal_minutes not between 30 and 50000 then
    raise exception using errcode = '22023', message = 'Haftalık hedef 30-50000 dakika arasında olmalı.';
  end if;

  update public.study_groups
  set room_theme = p_theme,
    room_motto = trim(p_motto),
    weekly_goal_minutes = p_weekly_goal_minutes,
    updated_at = now()
  where id = p_group_id and owner_id = viewer
  returning * into updated;

  return jsonb_build_object(
    'id', updated.id,
    'theme', updated.room_theme,
    'motto', updated.room_motto,
    'weeklyGoalMinutes', updated.weekly_goal_minutes
  );
end;
$$;

-- Status writes also serve as the initial spawn/heartbeat without resetting movement.
create or replace function public.set_classroom_presence(
  p_group_id uuid,
  p_status text,
  p_focus_subject text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  member_index integer;
  spawn_x numeric;
  spawn_y numeric;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişimin yok.';
  end if;
  if p_status not in ('online', 'studying', 'break') then
    raise exception using errcode = '22023', message = 'Geçersiz çalışma durumu.';
  end if;
  if char_length(coalesce(p_focus_subject, '')) > 60 then
    raise exception using errcode = '22023', message = 'Ders açıklaması en fazla 60 karakter olabilir.';
  end if;

  select count(*)::integer into member_index
  from public.study_group_members as other_member
  join public.study_group_members as viewer_member
    on viewer_member.group_id = other_member.group_id and viewer_member.user_id = viewer
  where other_member.group_id = p_group_id
    and (other_member.joined_at, other_member.user_id) <= (viewer_member.joined_at, viewer_member.user_id);

  spawn_x := 16 + (greatest(member_index, 1) - 1) % 4 * 22;
  spawn_y := 58 + ((greatest(member_index, 1) - 1) / 4) * 14;

  insert into public.study_presence (
    group_id, user_id, status, focus_subject, position_x, position_y, updated_at
  ) values (
    p_group_id, viewer, p_status, nullif(trim(p_focus_subject), ''), spawn_x, spawn_y, now()
  )
  on conflict (group_id, user_id) do update
  set status = excluded.status,
    focus_subject = excluded.focus_subject,
    updated_at = now();

  return jsonb_build_object('status', p_status, 'updatedAt', now());
end;
$$;

create or replace function public.get_group_room(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  room_payload jsonb;
  member_payload jsonb;
  focus_payload jsonb;
  reaction_payload jsonb;
  week_start date := date_trunc('week', now() at time zone 'Europe/Istanbul')::date;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişimin yok.';
  end if;

  select jsonb_build_object(
    'id', room.id,
    'name', room.name,
    'ownerId', room.owner_id,
    'inviteCode', case when room.owner_id = viewer then room.invite_code else null end,
    'weeklyGoalMinutes', room.weekly_goal_minutes,
    'maxMembers', room.max_members,
    'theme', room.room_theme,
    'motto', room.room_motto,
    'createdAt', room.created_at,
    'weekStart', week_start,
    'serverTime', clock_timestamp(),
    'weeklyMinutes', coalesce((
      select sum(log.sure_dakika)
      from public.calisma_suresi as log
      join public.study_group_members as group_member on group_member.user_id = log.user_id
      where group_member.group_id = room.id and log.tarih >= week_start
    ), 0)
  ) into room_payload
  from public.study_groups as room
  where room.id = p_group_id and not room.is_archived;

  if room_payload is null then
    raise exception using errcode = 'P0002', message = 'Çalışma sınıfı bulunamadı.';
  end if;

  with members as (
    select member.user_id,
      member.member_role,
      member.joined_at,
      profile.full_name,
      profile.avatar_url,
      social.share_study_days,
      social.share_question_count,
      social.share_streak,
      social.share_xp,
      social.avatar_seed,
      social.avatar_hair,
      social.avatar_skin,
      social.avatar_hair_color,
      social.avatar_background,
      social.avatar_glasses,
      social.avatar_expression,
      public.student_social_metrics(member.user_id) as metrics,
      coalesce((
        select sum(log.sure_dakika)
        from public.calisma_suresi as log
        where log.user_id = member.user_id and log.tarih >= week_start
      ), 0) as weekly_minutes,
      presence.status,
      presence.focus_subject,
      presence.position_x,
      presence.position_y,
      presence.facing,
      presence.updated_at as presence_updated_at
    from public.study_group_members as member
    join public.profiles as profile on profile.id = member.user_id and profile.account_status = 'active'
    join public.social_profiles as social on social.user_id = member.user_id
    left join public.study_presence as presence
      on presence.group_id = member.group_id and presence.user_id = member.user_id
    where member.group_id = p_group_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', member.user_id,
    'name', member.full_name,
    'avatarUrl', member.avatar_url,
    'avatar', jsonb_build_object(
      'seed', member.avatar_seed,
      'hair', member.avatar_hair,
      'skin', member.avatar_skin,
      'hairColor', member.avatar_hair_color,
      'background', member.avatar_background,
      'glasses', member.avatar_glasses,
      'expression', member.avatar_expression
    ),
    'role', member.member_role,
    'joinedAt', member.joined_at,
    'weeklyMinutes', member.weekly_minutes,
    'studyDays', case when member.user_id = viewer or member.share_study_days then member.metrics -> 'studyDays' else 'null'::jsonb end,
    'questions', case when member.user_id = viewer or member.share_question_count then member.metrics -> 'questions' else 'null'::jsonb end,
    'streak', case when member.user_id = viewer or member.share_streak then member.metrics -> 'streak' else 'null'::jsonb end,
    'xp', case when member.user_id = viewer or member.share_xp then member.metrics -> 'xp' else 'null'::jsonb end,
    'level', case when member.user_id = viewer or member.share_xp then member.metrics -> 'level' else 'null'::jsonb end,
    'presence', case
      when member.presence_updated_at > now() - interval '2 minutes' then coalesce(member.status, 'online')
      else 'offline'
    end,
    'focusSubject', case
      when member.presence_updated_at > now() - interval '2 minutes' then member.focus_subject
      else null
    end,
    'positionX', coalesce(member.position_x, 50),
    'positionY', coalesce(member.position_y, 72),
    'facing', coalesce(member.facing, 'right'),
    'presenceUpdatedAt', member.presence_updated_at
  ) order by member.weekly_minutes desc, member.full_name), '[]'::jsonb)
  into member_payload
  from members as member;

  select jsonb_build_object(
    'id', focus.id,
    'startedBy', focus.started_by,
    'starterName', profile.full_name,
    'durationMinutes', focus.duration_minutes,
    'startedAt', focus.started_at,
    'endsAt', focus.ends_at,
    'status', focus.status
  ) into focus_payload
  from public.study_group_focus_sessions as focus
  join public.profiles as profile on profile.id = focus.started_by
  where focus.group_id = p_group_id
    and focus.status = 'active'
    and focus.ends_at > clock_timestamp()
  order by focus.started_at desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', reaction.id,
    'userId', reaction.user_id,
    'reaction', reaction.reaction,
    'createdAt', reaction.created_at
  ) order by reaction.created_at desc), '[]'::jsonb)
  into reaction_payload
  from (
    select item.* from public.study_group_reactions as item
    where item.group_id = p_group_id
      and item.created_at > clock_timestamp() - interval '12 seconds'
    order by item.created_at desc
    limit 12
  ) as reaction;

  return jsonb_build_object(
    'room', room_payload,
    'members', member_payload,
    'focusSession', focus_payload,
    'reactions', reaction_payload
  );
end;
$$;

revoke all on function public.update_classroom_avatar(text, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.move_in_classroom(uuid, numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.send_classroom_reaction(uuid, text) from public, anon, authenticated;
revoke all on function public.start_group_focus(uuid, integer) from public, anon, authenticated;
revoke all on function public.stop_group_focus(uuid) from public, anon, authenticated;
revoke all on function public.update_study_group_room(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.set_classroom_presence(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_group_room(uuid) from public, anon, authenticated;

grant execute on function public.update_classroom_avatar(text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.move_in_classroom(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.send_classroom_reaction(uuid, text) to authenticated;
grant execute on function public.start_group_focus(uuid, integer) to authenticated;
grant execute on function public.stop_group_focus(uuid) to authenticated;
grant execute on function public.update_study_group_room(uuid, text, text, integer) to authenticated;
grant execute on function public.set_classroom_presence(uuid, text, text) to authenticated;
grant execute on function public.get_group_room(uuid) to authenticated;

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array['study_group_focus_sessions', 'study_group_reactions']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', realtime_table);
    end if;
  end loop;
end;
$$;
