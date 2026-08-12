-- Privacy-first friends, comparison metrics, private study groups, and live classroom presence.

create table if not exists public.social_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  friend_code text not null unique default (
    'CAL-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10))
  ),
  allow_friend_requests boolean not null default true,
  share_study_days boolean not null default true,
  share_question_count boolean not null default true,
  share_streak boolean not null default true,
  share_xp boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair_idx
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_requester_status_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_status_idx on public.friendships (addressee_id, status);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 40),
  invite_code text not null unique default (
    'ROOM-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8))
  ),
  weekly_goal_minutes integer not null default 1200 check (weekly_goal_minutes between 30 and 50000),
  max_members integer not null default 8 check (max_members between 2 and 12),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.study_presence (
  group_id uuid not null,
  user_id uuid not null,
  status text not null default 'online' check (status in ('online', 'studying', 'break')),
  focus_subject text check (focus_subject is null or char_length(focus_subject) <= 60),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id),
  foreign key (group_id, user_id)
    references public.study_group_members(group_id, user_id) on delete cascade
);

create index if not exists study_group_members_user_idx on public.study_group_members (user_id, joined_at desc);
create index if not exists study_presence_group_updated_idx on public.study_presence (group_id, updated_at desc);

alter table public.social_profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.study_presence enable row level security;

revoke all on table public.social_profiles from anon;
revoke insert, delete on table public.social_profiles from authenticated;
revoke update on table public.social_profiles from authenticated;
grant select on table public.social_profiles to authenticated;
grant update (
  allow_friend_requests,
  share_study_days,
  share_question_count,
  share_streak,
  share_xp,
  updated_at
) on table public.social_profiles to authenticated;

revoke all on table public.friendships from anon;
revoke insert, update, delete on table public.friendships from authenticated;
grant select on table public.friendships to authenticated;

revoke all on table public.study_groups from anon;
revoke insert, update, delete on table public.study_groups from authenticated;
grant select on table public.study_groups to authenticated;

revoke all on table public.study_group_members from anon;
revoke insert, update, delete on table public.study_group_members from authenticated;
grant select on table public.study_group_members to authenticated;

revoke all on table public.study_presence from anon;
revoke insert, update, delete on table public.study_presence from authenticated;
grant select on table public.study_presence to authenticated;

drop policy if exists "Users read own social settings" on public.social_profiles;
create policy "Users read own social settings"
on public.social_profiles for select to authenticated
using ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users update own social settings" on public.social_profiles;
create policy "Users update own social settings"
on public.social_profiles for update to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Participants read friendships" on public.friendships;
create policy "Participants read friendships"
on public.friendships for select to authenticated
using (
  public.is_active_user()
  and (select auth.uid()) in (requester_id, addressee_id)
);

create or replace function public.is_study_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user()
    and exists (
      select 1
      from public.study_group_members as member
      where member.group_id = p_group_id
        and member.user_id = (select auth.uid())
    );
$$;

revoke all on function public.is_study_group_member(uuid) from public, anon, authenticated;
grant execute on function public.is_study_group_member(uuid) to authenticated;

drop policy if exists "Members read study groups" on public.study_groups;
create policy "Members read study groups"
on public.study_groups for select to authenticated
using (public.is_study_group_member(id));

drop policy if exists "Members read group members" on public.study_group_members;
create policy "Members read group members"
on public.study_group_members for select to authenticated
using (public.is_study_group_member(group_id));

drop policy if exists "Members read classroom presence" on public.study_presence;
create policy "Members read classroom presence"
on public.study_presence for select to authenticated
using (public.is_study_group_member(group_id));

create or replace function public.ensure_social_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.social_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.ensure_social_profile() from public, anon, authenticated;
drop trigger if exists create_social_profile on public.profiles;
create trigger create_social_profile
after insert on public.profiles
for each row execute function public.ensure_social_profile();

insert into public.social_profiles (user_id)
select profile.id from public.profiles as profile
on conflict (user_id) do nothing;

create or replace function public.study_streak_for_user(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cursor_date date := (now() at time zone 'Europe/Istanbul')::date;
  result integer := 0;
  qualifies boolean;
begin
  select coalesce(sum(log.sure_dakika), 0) >= 30
  into qualifies
  from public.calisma_suresi as log
  where log.user_id = p_user_id and log.tarih = cursor_date;

  if not qualifies then cursor_date := cursor_date - 1; end if;

  loop
    select coalesce(sum(log.sure_dakika), 0) >= 30
    into qualifies
    from public.calisma_suresi as log
    where log.user_id = p_user_id and log.tarih = cursor_date;

    exit when not qualifies;
    result := result + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return result;
end;
$$;

create or replace function public.student_social_metrics(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with daily as (
    select log.tarih, sum(log.sure_dakika)::integer as minutes
    from public.calisma_suresi as log
    where log.user_id = p_user_id
    group by log.tarih
  ), totals as (
    select
      coalesce(sum(log.sure_dakika), 0)::bigint as minutes,
      coalesce(sum(log.soru_sayisi), 0)::bigint as questions
    from public.calisma_suresi as log
    where log.user_id = p_user_id
  ), progress as (
    select coalesce(sum(event.xp_amount), 0)::bigint as xp
    from public.xp_events as event
    where event.user_id = p_user_id
  )
  select jsonb_build_object(
    'studyDays', (select count(*) from daily where minutes >= 30),
    'minutes', totals.minutes,
    'questions', totals.questions,
    'streak', public.study_streak_for_user(p_user_id),
    'xp', progress.xp,
    'level', public.xp_level_from_total(progress.xp)
  )
  from totals cross join progress;
$$;

revoke all on function public.study_streak_for_user(uuid) from public, anon, authenticated;
revoke all on function public.student_social_metrics(uuid) from public, anon, authenticated;

create or replace function public.find_student_by_code(p_code text)
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

  select jsonb_build_object(
    'userId', profile.id,
    'name', profile.full_name,
    'avatarUrl', profile.avatar_url,
    'code', social.friend_code,
    'relationship', coalesce(friend.status, 'none')
  )
  into result
  from public.social_profiles as social
  join public.profiles as profile on profile.id = social.user_id
  left join public.friendships as friend
    on least(friend.requester_id, friend.addressee_id) = least(viewer, profile.id)
   and greatest(friend.requester_id, friend.addressee_id) = greatest(viewer, profile.id)
  where upper(trim(social.friend_code)) = upper(trim(p_code))
    and profile.account_status = 'active'
    and social.allow_friend_requests
    and profile.id <> viewer
  limit 1;

  return result;
end;
$$;

create or replace function public.send_friend_request(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  target uuid;
  existing public.friendships%rowtype;
  friendship_id uuid;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;

  select social.user_id
  into target
  from public.social_profiles as social
  join public.profiles as profile on profile.id = social.user_id
  where upper(trim(social.friend_code)) = upper(trim(p_code))
    and social.allow_friend_requests
    and profile.account_status = 'active';

  if target is null then
    raise exception using errcode = 'P0002', message = 'Bu kodla istek kabul eden bir öğrenci bulunamadı.';
  end if;
  if target = viewer then
    raise exception using errcode = '22023', message = 'Kendine arkadaşlık isteği gönderemezsin.';
  end if;

  select * into existing
  from public.friendships as friend
  where least(friend.requester_id, friend.addressee_id) = least(viewer, target)
    and greatest(friend.requester_id, friend.addressee_id) = greatest(viewer, target)
  for update;

  if found and existing.status in ('pending', 'accepted') then
    return jsonb_build_object('id', existing.id, 'status', existing.status);
  elsif found then
    update public.friendships
    set requester_id = viewer,
        addressee_id = target,
        status = 'pending',
        responded_at = null,
        updated_at = now()
    where id = existing.id
    returning id into friendship_id;
  else
    insert into public.friendships (requester_id, addressee_id)
    values (viewer, target)
    returning id into friendship_id;
  end if;

  if coalesce((select notifications_enabled from public.profiles where id = target), true) then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (
      target,
      'info',
      'Yeni arkadaşlık isteği',
      (select full_name from public.profiles where id = viewer) || ' seninle çalışmak istiyor.',
      '/dashboard/arkadaslar',
      'friend-request-' || friendship_id::text
    )
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  return jsonb_build_object('id', friendship_id, 'status', 'pending');
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Bu öğrenciyle zaten bir bağlantın var.';
end;
$$;

create or replace function public.respond_friend_request(p_friendship_id uuid, p_response text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  request public.friendships%rowtype;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  if p_response not in ('accepted', 'declined') then
    raise exception using errcode = '22023', message = 'Geçersiz yanıt.';
  end if;

  select * into request
  from public.friendships
  where id = p_friendship_id
  for update;

  if not found or request.addressee_id <> viewer or request.status <> 'pending' then
    raise exception using errcode = '42501', message = 'Bu isteği yanıtlama yetkin yok.';
  end if;

  update public.friendships
  set status = p_response, responded_at = now(), updated_at = now()
  where id = p_friendship_id;

  if p_response = 'accepted'
      and coalesce((select notifications_enabled from public.profiles where id = request.requester_id), true) then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (
      request.requester_id,
      'success',
      'Arkadaşlık isteğin kabul edildi',
      (select full_name from public.profiles where id = viewer) || ' artık çalışma arkadaşın.',
      '/dashboard/arkadaslar',
      'friend-accepted-' || request.id::text
    )
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  return jsonb_build_object('id', request.id, 'status', p_response);
end;
$$;

create or replace function public.remove_friend(p_friendship_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  removed integer;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;

  delete from public.friendships
  where id = p_friendship_id
    and viewer in (requester_id, addressee_id);
  get diagnostics removed = row_count;
  return removed = 1;
end;
$$;

create or replace function public.update_social_preferences(
  p_allow_requests boolean,
  p_share_study_days boolean,
  p_share_questions boolean,
  p_share_streak boolean,
  p_share_xp boolean
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

  update public.social_profiles
  set allow_friend_requests = coalesce(p_allow_requests, allow_friend_requests),
      share_study_days = coalesce(p_share_study_days, share_study_days),
      share_question_count = coalesce(p_share_questions, share_question_count),
      share_streak = coalesce(p_share_streak, share_streak),
      share_xp = coalesce(p_share_xp, share_xp),
      updated_at = now()
  where user_id = viewer
  returning * into updated;

  return to_jsonb(updated);
end;
$$;

create or replace function public.create_study_group(
  p_name text,
  p_weekly_goal_minutes integer default 1200
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  created_group public.study_groups%rowtype;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 40 then
    raise exception using errcode = '22023', message = 'Sınıf adı 2-40 karakter olmalı.';
  end if;
  if p_weekly_goal_minutes not between 30 and 50000 then
    raise exception using errcode = '22023', message = 'Haftalık hedef 30-50000 dakika arasında olmalı.';
  end if;
  if (select count(*) from public.study_group_members where user_id = viewer) >= 5 then
    raise exception using errcode = '54000', message = 'En fazla 5 çalışma sınıfına katılabilirsin.';
  end if;

  insert into public.study_groups (owner_id, name, weekly_goal_minutes)
  values (viewer, trim(p_name), p_weekly_goal_minutes)
  returning * into created_group;

  insert into public.study_group_members (group_id, user_id, member_role)
  values (created_group.id, viewer, 'owner');

  return jsonb_build_object(
    'id', created_group.id,
    'name', created_group.name,
    'inviteCode', created_group.invite_code
  );
end;
$$;

create or replace function public.join_study_group(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  target_group public.study_groups%rowtype;
  member_count integer;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  if (select count(*) from public.study_group_members where user_id = viewer) >= 5 then
    raise exception using errcode = '54000', message = 'En fazla 5 çalışma sınıfına katılabilirsin.';
  end if;

  select * into target_group
  from public.study_groups
  where upper(trim(invite_code)) = upper(trim(p_invite_code))
    and not is_archived
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Bu davet koduyla açık bir sınıf bulunamadı.';
  end if;

  select count(*) into member_count
  from public.study_group_members
  where group_id = target_group.id;

  if member_count >= target_group.max_members then
    raise exception using errcode = '54000', message = 'Bu çalışma sınıfı dolu.';
  end if;

  insert into public.study_group_members (group_id, user_id)
  values (target_group.id, viewer)
  on conflict (group_id, user_id) do nothing;

  if coalesce((select notifications_enabled from public.profiles where id = target_group.owner_id), true)
      and target_group.owner_id <> viewer then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (
      target_group.owner_id,
      'info',
      'Sınıfına yeni bir öğrenci katıldı',
      (select full_name from public.profiles where id = viewer) || ' · ' || target_group.name,
      '/dashboard/arkadaslar/' || target_group.id::text,
      'group-join-' || target_group.id::text || '-' || viewer::text
    )
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  return jsonb_build_object('id', target_group.id, 'name', target_group.name);
end;
$$;

create or replace function public.leave_study_group(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  viewer_role text;
  member_count integer;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;

  select member_role into viewer_role
  from public.study_group_members
  where group_id = p_group_id and user_id = viewer
  for update;

  if viewer_role is null then return false; end if;

  select count(*) into member_count from public.study_group_members where group_id = p_group_id;
  if viewer_role = 'owner' and member_count > 1 then
    raise exception using errcode = '55000', message = 'Önce sınıf sahipliğini devretmelisin.';
  elsif viewer_role = 'owner' then
    delete from public.study_groups where id = p_group_id and owner_id = viewer;
  else
    delete from public.study_group_members where group_id = p_group_id and user_id = viewer;
  end if;
  return true;
end;
$$;

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

  insert into public.study_presence (group_id, user_id, status, focus_subject, updated_at)
  values (p_group_id, viewer, p_status, nullif(trim(p_focus_subject), ''), now())
  on conflict (group_id, user_id)
  do update set status = excluded.status, focus_subject = excluded.focus_subject, updated_at = now();

  return jsonb_build_object('status', p_status, 'updatedAt', now());
end;
$$;

create or replace function public.get_social_hub()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  self_profile jsonb;
  self_metrics jsonb;
  friend_cards jsonb;
  incoming_requests jsonb;
  outgoing_requests jsonb;
  group_cards jsonb;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;

  select jsonb_build_object(
    'friendCode', social.friend_code,
    'allowFriendRequests', social.allow_friend_requests,
    'shareStudyDays', social.share_study_days,
    'shareQuestionCount', social.share_question_count,
    'shareStreak', social.share_streak,
    'shareXp', social.share_xp
  ) into self_profile
  from public.social_profiles as social
  where social.user_id = viewer;

  self_metrics := public.student_social_metrics(viewer);

  with connections as (
    select friend.id,
      case when friend.requester_id = viewer then friend.addressee_id else friend.requester_id end as other_id,
      friend.responded_at
    from public.friendships as friend
    where friend.status = 'accepted'
      and viewer in (friend.requester_id, friend.addressee_id)
  ), cards as (
    select connection.id,
      connection.other_id,
      connection.responded_at,
      profile.full_name,
      profile.avatar_url,
      social.share_study_days,
      social.share_question_count,
      social.share_streak,
      social.share_xp,
      public.student_social_metrics(connection.other_id) as metrics
    from connections as connection
    join public.profiles as profile on profile.id = connection.other_id and profile.account_status = 'active'
    join public.social_profiles as social on social.user_id = connection.other_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'friendshipId', card.id,
    'userId', card.other_id,
    'name', card.full_name,
    'avatarUrl', card.avatar_url,
    'friendsSince', card.responded_at,
    'studyDays', case when card.share_study_days then card.metrics -> 'studyDays' else 'null'::jsonb end,
    'questions', case when card.share_question_count then card.metrics -> 'questions' else 'null'::jsonb end,
    'streak', case when card.share_streak then card.metrics -> 'streak' else 'null'::jsonb end,
    'xp', case when card.share_xp then card.metrics -> 'xp' else 'null'::jsonb end,
    'level', case when card.share_xp then card.metrics -> 'level' else 'null'::jsonb end
  ) order by
    case when card.share_streak then (card.metrics ->> 'streak')::integer else -1 end desc,
    card.full_name), '[]'::jsonb)
  into friend_cards
  from cards as card;

  select coalesce(jsonb_agg(jsonb_build_object(
    'friendshipId', friend.id,
    'userId', profile.id,
    'name', profile.full_name,
    'avatarUrl', profile.avatar_url,
    'createdAt', friend.created_at
  ) order by friend.created_at desc), '[]'::jsonb)
  into incoming_requests
  from public.friendships as friend
  join public.profiles as profile on profile.id = friend.requester_id
  where friend.addressee_id = viewer and friend.status = 'pending';

  select coalesce(jsonb_agg(jsonb_build_object(
    'friendshipId', friend.id,
    'userId', profile.id,
    'name', profile.full_name,
    'avatarUrl', profile.avatar_url,
    'createdAt', friend.created_at
  ) order by friend.created_at desc), '[]'::jsonb)
  into outgoing_requests
  from public.friendships as friend
  join public.profiles as profile on profile.id = friend.addressee_id
  where friend.requester_id = viewer and friend.status = 'pending';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', room.id,
    'name', room.name,
    'inviteCode', case when member.member_role = 'owner' then room.invite_code else null end,
    'memberRole', member.member_role,
    'memberCount', (select count(*) from public.study_group_members where group_id = room.id),
    'onlineCount', (select count(*) from public.study_presence where group_id = room.id and updated_at > now() - interval '2 minutes'),
    'weeklyGoalMinutes', room.weekly_goal_minutes,
    'createdAt', room.created_at
  ) order by room.created_at desc), '[]'::jsonb)
  into group_cards
  from public.study_group_members as member
  join public.study_groups as room on room.id = member.group_id and not room.is_archived
  where member.user_id = viewer;

  return jsonb_build_object(
    'profile', self_profile,
    'metrics', self_metrics,
    'friends', friend_cards,
    'incomingRequests', incoming_requests,
    'outgoingRequests', outgoing_requests,
    'groups', group_cards
  );
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
    'createdAt', room.created_at,
    'weekStart', week_start,
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
      public.student_social_metrics(member.user_id) as metrics,
      coalesce((
        select sum(log.sure_dakika)
        from public.calisma_suresi as log
        where log.user_id = member.user_id and log.tarih >= week_start
      ), 0) as weekly_minutes,
      presence.status,
      presence.focus_subject,
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
    'presenceUpdatedAt', member.presence_updated_at
  ) order by member.weekly_minutes desc, member.full_name), '[]'::jsonb)
  into member_payload
  from members as member;

  return jsonb_build_object('room', room_payload, 'members', member_payload);
end;
$$;

revoke all on function public.find_student_by_code(text) from public, anon, authenticated;
revoke all on function public.send_friend_request(text) from public, anon, authenticated;
revoke all on function public.respond_friend_request(uuid, text) from public, anon, authenticated;
revoke all on function public.remove_friend(uuid) from public, anon, authenticated;
revoke all on function public.update_social_preferences(boolean, boolean, boolean, boolean, boolean) from public, anon, authenticated;
revoke all on function public.create_study_group(text, integer) from public, anon, authenticated;
revoke all on function public.join_study_group(text) from public, anon, authenticated;
revoke all on function public.leave_study_group(uuid) from public, anon, authenticated;
revoke all on function public.set_classroom_presence(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_social_hub() from public, anon, authenticated;
revoke all on function public.get_group_room(uuid) from public, anon, authenticated;

grant execute on function public.find_student_by_code(text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.update_social_preferences(boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.create_study_group(text, integer) to authenticated;
grant execute on function public.join_study_group(text) to authenticated;
grant execute on function public.leave_study_group(uuid) to authenticated;
grant execute on function public.set_classroom_presence(uuid, text, text) to authenticated;
grant execute on function public.get_social_hub() to authenticated;
grant execute on function public.get_group_room(uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['friendships', 'study_group_members', 'study_presence']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
