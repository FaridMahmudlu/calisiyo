-- Classroom v3: private low-latency rooms, owner moderation, live streaks,
-- global moderation, and YouTube learning resources.

alter table public.profiles
  add column if not exists suspended_until timestamptz,
  add column if not exists muted_until timestamptz,
  add column if not exists mute_reason text;

alter table public.social_profiles
  add column if not exists avatar_model text not null default 'navy';

alter table public.study_groups
  add column if not exists description text not null default 'Birlikte düzenli çalışmak için kurulan özel sınıf.',
  add column if not exists exam_track text not null default 'tyt_ayt',
  add column if not exists study_style text not null default 'balanced',
  add column if not exists members_can_start_focus boolean not null default true,
  add column if not exists members_can_chat boolean not null default true,
  add column if not exists members_can_react boolean not null default true;

alter table public.study_group_members
  add column if not exists muted_until timestamptz,
  add column if not exists mute_reason text;

alter table public.study_presence drop constraint if exists study_presence_facing_valid;
update public.study_presence set facing = case facing when 'left' then 'west' else 'east' end
where facing in ('left', 'right');
alter table public.study_presence alter column facing set default 'east';
alter table public.study_presence add constraint study_presence_facing_valid
  check (facing in ('south','south_west','west','north_west','north','north_east','east','south_east'));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'social_profiles_avatar_model_valid') then
    alter table public.social_profiles add constraint social_profiles_avatar_model_valid
      check (avatar_model in ('navy','sage','rust'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_groups_description_valid') then
    alter table public.study_groups add constraint study_groups_description_valid
      check (char_length(trim(description)) between 8 and 180);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_groups_exam_track_valid') then
    alter table public.study_groups add constraint study_groups_exam_track_valid
      check (exam_track in ('tyt','ayt','tyt_ayt','ydt'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_groups_study_style_valid') then
    alter table public.study_groups add constraint study_groups_study_style_valid
      check (study_style in ('quiet','balanced','social'));
  end if;
end;
$$;

create table if not exists public.study_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 400),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists study_group_messages_group_created_idx
  on public.study_group_messages (group_id, created_at desc);
alter table public.study_group_messages enable row level security;
revoke all on table public.study_group_messages from anon;
revoke insert, update, delete on table public.study_group_messages from authenticated;
grant select on table public.study_group_messages to authenticated;
drop policy if exists "Members read classroom messages" on public.study_group_messages;
create policy "Members read classroom messages" on public.study_group_messages
for select to authenticated using (public.is_study_group_member(group_id));

alter table public.kaynaklarim
  add column if not exists resource_kind text not null default 'book',
  add column if not exists source_url text,
  add column if not exists external_id text,
  add column if not exists duration_minutes integer,
  add column if not exists item_count integer,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kaynaklarim_resource_kind_valid') then
    alter table public.kaynaklarim add constraint kaynaklarim_resource_kind_valid
      check (resource_kind in ('book','youtube_video','youtube_playlist'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'kaynaklarim_duration_valid') then
    alter table public.kaynaklarim add constraint kaynaklarim_duration_valid
      check (duration_minutes is null or duration_minutes between 1 and 100000);
  end if;
end;
$$;

create table if not exists public.youtube_resource_items (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.kaynaklarim(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check (char_length(trim(title)) between 1 and 200),
  channel_title text,
  thumbnail_url text,
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  position integer not null check (position >= 0),
  scheduled_date date,
  task_id uuid references public.gunluk_gorevler(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (resource_id, video_id)
);
create unique index if not exists youtube_resource_items_user_id_id_unique
  on public.youtube_resource_items (user_id, id);
create index if not exists youtube_resource_items_resource_position_idx
  on public.youtube_resource_items (resource_id, position);
alter table public.youtube_resource_items enable row level security;
revoke all on table public.youtube_resource_items from anon;
grant select, insert, update, delete on table public.youtube_resource_items to authenticated;
drop policy if exists "Users own youtube resource items" on public.youtube_resource_items;
create policy "Users own youtube resource items" on public.youtube_resource_items
for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

alter table public.gunluk_gorevler
  add column if not exists youtube_item_id uuid,
  add column if not exists source_url text;
create index if not exists gunluk_gorevler_youtube_item_idx on public.gunluk_gorevler (youtube_item_id);
alter table public.gunluk_gorevler drop constraint if exists gunluk_gorevler_owned_youtube_item_fkey;
alter table public.gunluk_gorevler add constraint gunluk_gorevler_owned_youtube_item_fkey
  foreign key (user_id,youtube_item_id) references public.youtube_resource_items(user_id,id)
  on delete set null (youtube_item_id);

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and coalesce((
    select profile.account_status = 'active'
      or (profile.account_status = 'suspended' and profile.suspended_until is not null and profile.suspended_until <= clock_timestamp())
    from public.profiles as profile where profile.id = (select auth.uid())
  ), false);
$$;

create or replace function public.is_current_user_muted()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select profile.muted_until > clock_timestamp()
    from public.profiles as profile where profile.id = (select auth.uid())), false);
$$;
revoke all on function public.is_current_user_muted() from public, anon, authenticated;
grant execute on function public.is_current_user_muted() to authenticated;

create or replace function public.can_use_group_feature(p_group_id uuid, p_feature text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_study_group_member(p_group_id)
    and not public.is_current_user_muted()
    and exists (
      select 1 from public.study_group_members as member
      join public.study_groups as room on room.id = member.group_id
      where member.group_id = p_group_id and member.user_id = (select auth.uid())
        and (member.muted_until is null or member.muted_until <= clock_timestamp())
        and (
          member.member_role = 'owner'
          or (p_feature = 'chat' and room.members_can_chat)
          or (p_feature = 'reaction' and room.members_can_react)
          or (p_feature = 'focus' and room.members_can_start_focus)
          or p_feature = 'movement'
        )
    );
$$;
revoke all on function public.can_use_group_feature(uuid, text) from public, anon, authenticated;
grant execute on function public.can_use_group_feature(uuid, text) to authenticated;

create or replace function public.update_classroom_character(p_model text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid := (select auth.uid()); updated public.social_profiles%rowtype;
begin
  if viewer is null or not public.is_active_user() then raise exception using errcode='42501', message='Aktif bir oturum gerekli.'; end if;
  if p_model not in ('navy','sage','rust') then raise exception using errcode='22023', message='Geçersiz karakter modeli.'; end if;
  update public.social_profiles set avatar_model=p_model, updated_at=now() where user_id=viewer returning * into updated;
  return jsonb_build_object('model',updated.avatar_model);
end;
$$;

create or replace function public.move_in_classroom(p_group_id uuid, p_x numeric, p_y numeric, p_facing text default 'east')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid := (select auth.uid()); current_row public.study_presence%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id,'movement') then raise exception using errcode='42501', message='Bu sınıfta hareket etme yetkin yok.'; end if;
  if p_x is null or p_y is null or p_x::text in ('NaN','Infinity','-Infinity') or p_y::text in ('NaN','Infinity','-Infinity') or p_x not between 4 and 96 or p_y not between 8 and 92 then raise exception using errcode='22023', message='Sınıf konumu geçersiz.'; end if;
  if p_facing not in ('south','south_west','west','north_west','north','north_east','east','south_east') then raise exception using errcode='22023', message='Hareket yönü geçersiz.'; end if;
  select * into current_row from public.study_presence where group_id=p_group_id and user_id=viewer;
  if current_row.last_move_at > clock_timestamp() - interval '180 milliseconds' then
    return jsonb_build_object('x',current_row.position_x,'y',current_row.position_y,'facing',current_row.facing,'throttled',true);
  end if;
  insert into public.study_presence(group_id,user_id,status,position_x,position_y,facing,last_move_at,updated_at)
  values(p_group_id,viewer,'online',round(p_x,2),round(p_y,2),p_facing,clock_timestamp(),now())
  on conflict(group_id,user_id) do update set position_x=excluded.position_x,position_y=excluded.position_y,facing=excluded.facing,last_move_at=excluded.last_move_at,updated_at=now()
  returning * into current_row;
  return jsonb_build_object('x',current_row.position_x,'y',current_row.position_y,'facing',current_row.facing,'throttled',false);
end;
$$;

create or replace function public.send_classroom_reaction(p_group_id uuid, p_reaction text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid := (select auth.uid()); created public.study_group_reactions%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id,'reaction') then raise exception using errcode='42501', message='Şu anda sınıfa tepki gönderemezsin.'; end if;
  if p_reaction is null or not p_reaction=any(array['hello','focus','coffee','clap','goal','wave']) then raise exception using errcode='22023', message='Geçersiz sınıf tepkisi.'; end if;
  if exists(select 1 from public.study_group_reactions where group_id=p_group_id and user_id=viewer and created_at>clock_timestamp()-interval '2 seconds') then raise exception using errcode='P0001', message='Yeni bir tepki göndermeden önce biraz bekle.'; end if;
  insert into public.study_group_reactions(group_id,user_id,reaction) values(p_group_id,viewer,p_reaction) returning * into created;
  return jsonb_build_object('id',created.id,'userId',created.user_id,'reaction',created.reaction,'createdAt',created.created_at);
end;
$$;

create or replace function public.send_classroom_message(p_group_id uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid := (select auth.uid()); clean_body text := trim(coalesce(p_body,'')); created public.study_group_messages%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id,'chat') then raise exception using errcode='42501', message='Şu anda sınıf sohbetine mesaj gönderemezsin.'; end if;
  if char_length(clean_body) not between 1 and 400 then raise exception using errcode='22023', message='Mesaj 1-400 karakter olmalı.'; end if;
  if exists(select 1 from public.study_group_messages where group_id=p_group_id and user_id=viewer and created_at>clock_timestamp()-interval '1 second') then raise exception using errcode='P0001', message='Yeni bir mesaj göndermeden önce biraz bekle.'; end if;
  insert into public.study_group_messages(group_id,user_id,body) values(p_group_id,viewer,clean_body) returning * into created;
  return jsonb_build_object('id',created.id,'userId',created.user_id,'body',created.body,'createdAt',created.created_at);
end;
$$;

create or replace function public.delete_classroom_message(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare viewer uuid := (select auth.uid()); target public.study_group_messages%rowtype;
begin
  select * into target from public.study_group_messages where id=p_message_id;
  if not found or not public.is_study_group_member(target.group_id) then raise exception using errcode='42501', message='Bu mesajı silemezsin.'; end if;
  if target.user_id<>viewer and not exists(select 1 from public.study_groups where id=target.group_id and owner_id=viewer) then raise exception using errcode='42501', message='Bu mesajı yalnızca yazan kişi veya sınıf sahibi silebilir.'; end if;
  update public.study_group_messages set deleted_at=now(),deleted_by=viewer,body='Silinen mesaj' where id=p_message_id;
  return true;
end;
$$;

create or replace function public.start_group_focus(p_group_id uuid, p_duration_minutes integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid := (select auth.uid()); created public.study_group_focus_sessions%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id,'focus') then raise exception using errcode='42501', message='Ortak odak başlatma yetkin yok.'; end if;
  if p_duration_minutes is null or p_duration_minutes not in (15,25,40,50) then raise exception using errcode='22023', message='Geçersiz odak süresi.'; end if;
  update public.study_group_focus_sessions set status='completed',finished_at=ends_at where group_id=p_group_id and status='active' and ends_at<=clock_timestamp();
  if exists(select 1 from public.study_group_focus_sessions where group_id=p_group_id and status='active' and ends_at>clock_timestamp()) then raise exception using errcode='55000', message='Bu sınıfta zaten aktif bir odak turu var.'; end if;
  insert into public.study_group_focus_sessions(group_id,started_by,duration_minutes,started_at,ends_at)
  values(p_group_id,viewer,p_duration_minutes,clock_timestamp(),clock_timestamp()+make_interval(mins=>p_duration_minutes)) returning * into created;
  return jsonb_build_object('id',created.id,'startedBy',created.started_by,'durationMinutes',created.duration_minutes,'startedAt',created.started_at,'endsAt',created.ends_at,'status',created.status);
end;
$$;

create or replace function public.moderate_study_group_member(p_group_id uuid, p_user_id uuid, p_action text, p_duration_minutes integer default null, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid := (select auth.uid()); clean_reason text:=nullif(trim(coalesce(p_reason,'')),''); until_at timestamptz;
begin
  if not exists(select 1 from public.study_groups where id=p_group_id and owner_id=viewer) then raise exception using errcode='42501', message='Üyeleri yalnızca sınıf sahibi yönetebilir.'; end if;
  if p_user_id=viewer then raise exception using errcode='42501', message='Kendi üyeliğini bu araçla değiştiremezsin.'; end if;
  if not exists(select 1 from public.study_group_members where group_id=p_group_id and user_id=p_user_id and member_role<>'owner') then raise exception using errcode='P0002', message='Sınıf üyesi bulunamadı.'; end if;
  if p_action='mute' then
    if p_duration_minutes not between 5 and 10080 or clean_reason is null then raise exception using errcode='22023', message='Geçerli süre ve susdurma nedeni gerekli.'; end if;
    until_at:=clock_timestamp()+make_interval(mins=>p_duration_minutes);
    update public.study_group_members set muted_until=until_at,mute_reason=clean_reason where group_id=p_group_id and user_id=p_user_id;
  elsif p_action='unmute' then
    update public.study_group_members set muted_until=null,mute_reason=null where group_id=p_group_id and user_id=p_user_id;
  elsif p_action='remove' then
    delete from public.study_group_members where group_id=p_group_id and user_id=p_user_id;
  else raise exception using errcode='22023', message='Geçersiz üye işlemi.';
  end if;
  return jsonb_build_object('userId',p_user_id,'action',p_action,'mutedUntil',until_at);
end;
$$;

create or replace function public.create_study_group_v3(p_name text,p_description text,p_weekly_goal_minutes integer,p_max_members integer,p_exam_track text,p_study_style text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid:=(select auth.uid()); created public.study_groups%rowtype;
begin
  if viewer is null or not public.is_active_user() then raise exception using errcode='42501', message='Aktif bir oturum gerekli.'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 40 then raise exception using errcode='22023', message='Sınıf adı 2-40 karakter olmalı.'; end if;
  if char_length(trim(coalesce(p_description,''))) not between 8 and 180 then raise exception using errcode='22023', message='Açıklama 8-180 karakter olmalı.'; end if;
  if p_weekly_goal_minutes not between 30 and 50000 or p_max_members not between 2 and 12 or p_exam_track not in ('tyt','ayt','tyt_ayt','ydt') or p_study_style not in ('quiet','balanced','social') then raise exception using errcode='22023', message='Sınıf ayarlarından biri geçersiz.'; end if;
  if (select count(*) from public.study_group_members where user_id=viewer)>=5 then raise exception using errcode='54000', message='En fazla 5 çalışma sınıfına katılabilirsin.'; end if;
  insert into public.study_groups(owner_id,name,description,weekly_goal_minutes,max_members,exam_track,study_style,members_can_chat,members_can_react)
  values(viewer,trim(p_name),trim(p_description),p_weekly_goal_minutes,p_max_members,p_exam_track,p_study_style,p_study_style<>'quiet',p_study_style<>'quiet') returning * into created;
  insert into public.study_group_members(group_id,user_id,member_role) values(created.id,viewer,'owner');
  return jsonb_build_object('id',created.id,'name',created.name,'inviteCode',created.invite_code);
end;
$$;

create or replace function public.update_study_group_room_v3(p_group_id uuid,p_theme text,p_motto text,p_description text,p_weekly_goal_minutes integer,p_members_can_start_focus boolean,p_members_can_chat boolean,p_members_can_react boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid:=(select auth.uid()); updated public.study_groups%rowtype;
begin
  if not exists(select 1 from public.study_groups where id=p_group_id and owner_id=viewer) then raise exception using errcode='42501', message='Sınıf ayarlarını yalnızca sınıf sahibi değiştirebilir.'; end if;
  if p_theme not in ('sunny','library','evening') or char_length(trim(coalesce(p_motto,''))) not between 2 and 80 or char_length(trim(coalesce(p_description,''))) not between 8 and 180 or p_weekly_goal_minutes not between 30 and 50000 then raise exception using errcode='22023', message='Sınıf ayarlarından biri geçersiz.'; end if;
  update public.study_groups set room_theme=p_theme,room_motto=trim(p_motto),description=trim(p_description),weekly_goal_minutes=p_weekly_goal_minutes,members_can_start_focus=coalesce(p_members_can_start_focus,true),members_can_chat=coalesce(p_members_can_chat,true),members_can_react=coalesce(p_members_can_react,true),updated_at=now()
  where id=p_group_id and owner_id=viewer returning * into updated;
  return jsonb_build_object('id',updated.id,'theme',updated.room_theme,'motto',updated.room_motto,'description',updated.description,'weeklyGoalMinutes',updated.weekly_goal_minutes,'membersCanStartFocus',updated.members_can_start_focus,'membersCanChat',updated.members_can_chat,'membersCanReact',updated.members_can_react);
end;
$$;

create or replace function public.get_live_streak()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare viewer uuid:=(select auth.uid()); today_date date:=(now() at time zone 'Europe/Istanbul')::date; today_minutes integer; result integer;
begin
  if viewer is null or not public.is_active_user() then raise exception using errcode='42501', message='Aktif bir oturum gerekli.'; end if;
  select coalesce(sum(sure_dakika),0)::integer into today_minutes from public.calisma_suresi where user_id=viewer and tarih=today_date;
  result:=public.study_streak_for_user(viewer);
  return jsonb_build_object('streak',result,'todayMinutes',today_minutes,'qualified',today_minutes>=30,'remainingMinutes',greatest(0,30-today_minutes),'serverTime',clock_timestamp());
end;
$$;

create or replace function public.admin_moderate_user(p_user_id uuid,p_action text,p_duration_minutes integer default null,p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid:=(select auth.uid()); actor_role text; target_role text; clean_reason text:=nullif(trim(coalesce(p_reason,'')),''); until_at timestamptz;
begin
  actor_role:=public.assert_admin('admin');
  if p_user_id=actor then raise exception using errcode='42501', message='Kendi hesabına moderasiya işlemi uygulayamazsın.'; end if;
  select role into target_role from public.user_roles where user_id=p_user_id;
  if target_role is not null and actor_role<>'super_admin' then raise exception using errcode='42501', message='Yönetici hesaplarını yalnızca süper yönetici değiştirebilir.'; end if;
  if p_action in ('suspend','mute') and (p_duration_minutes not between 5 and 525600 or clean_reason is null) then raise exception using errcode='22023', message='Geçerli süre ve neden gerekli.'; end if;
  if p_action='suspend' then
    until_at:=clock_timestamp()+make_interval(mins=>p_duration_minutes);
    update public.profiles set account_status='suspended',suspended_until=until_at,status_reason=clean_reason,status_updated_at=now(),status_updated_by=actor where id=p_user_id;
  elsif p_action='activate' then
    update public.profiles set account_status='active',suspended_until=null,status_reason=null,status_updated_at=now(),status_updated_by=actor where id=p_user_id;
  elsif p_action='mute' then
    until_at:=clock_timestamp()+make_interval(mins=>p_duration_minutes);
    update public.profiles set muted_until=until_at,mute_reason=clean_reason,status_updated_at=now(),status_updated_by=actor where id=p_user_id;
  elsif p_action='unmute' then
    update public.profiles set muted_until=null,mute_reason=null,status_updated_at=now(),status_updated_by=actor where id=p_user_id;
  else raise exception using errcode='22023', message='Geçersiz moderasiya işlemi.';
  end if;
  if not found then raise exception using errcode='P0002', message='Kullanıcı bulunamadı.'; end if;
  insert into public.admin_audit_log(actor_id,action,target_user_id,details) values(actor,'user_moderation_changed',p_user_id,jsonb_build_object('action',p_action,'durationMinutes',p_duration_minutes,'reason',clean_reason,'until',until_at));
  insert into public.admin_live_events(event_type,user_id,payload) values('admin_user_status',p_user_id,jsonb_build_object('action',p_action,'until',until_at));
  return jsonb_build_object('userId',p_user_id,'action',p_action,'until',until_at);
end;
$$;

create or replace function public.import_youtube_learning_plan(p_resource jsonb,p_items jsonb,p_start_date date,p_cadence text,p_daily_minutes integer,p_ders_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid:=(select auth.uid()); resource_id uuid; item jsonb; item_id uuid; item_date date; v_task_id uuid; start_time time; end_time time; duration_minutes integer; created_tasks integer:=0;
begin
  if viewer is null or not public.is_active_user() then raise exception using errcode='42501', message='Aktif bir oturum gerekli.'; end if;
  if p_start_date<(now() at time zone 'Europe/Istanbul')::date-interval '1 day' or p_start_date>(now() at time zone 'Europe/Istanbul')::date+interval '365 days' or p_cadence not in ('daily','weekly') or p_daily_minutes not between 15 and 360 or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 200 then raise exception using errcode='22023', message='Planlama ayarları geçersiz.'; end if;
  if p_ders_id is not null and not exists(select 1 from public.dersler where id=p_ders_id) then raise exception using errcode='22023', message='Ders bulunamadı.'; end if;
  if coalesce(p_resource->>'kind','') not in ('youtube_video','youtube_playlist') or coalesce(p_resource->>'url','') !~ '^https://(www\.)?(youtube\.com|youtu\.be)/' then raise exception using errcode='22023', message='Geçerli bir YouTube kaynağı gerekli.'; end if;
  insert into public.kaynaklarim(user_id,custom_ad,custom_yayin,custom_kitap_turu,custom_ders_id,resource_kind,source_url,external_id,duration_minutes,item_count,source_metadata)
  values(viewer,left(trim(p_resource->>'title'),160),coalesce(nullif(trim(p_resource->>'channelTitle'),''),'YouTube'),'video',p_ders_id,p_resource->>'kind',p_resource->>'url',p_resource->>'externalId',nullif(p_resource->>'durationMinutes','')::integer,jsonb_array_length(p_items),p_resource)
  returning id into resource_id;
  for item in select value from jsonb_array_elements(p_items) loop
    if coalesce(item->>'videoId','') !~ '^[A-Za-z0-9_-]{11}$' or char_length(trim(coalesce(item->>'title',''))) not between 1 and 200 or coalesce((item->>'durationSeconds')::integer,0) not between 1 and 86400 then raise exception using errcode='22023', message='Video bilgileri doğrulanamadı.'; end if;
    item_date:=coalesce(nullif(item->>'scheduledDate','')::date,p_start_date);
    if item_date<p_start_date or item_date>p_start_date+365 then raise exception using errcode='22023', message='Video plan tarihi geçersiz.'; end if;
    duration_minutes:=greatest(1,ceil((item->>'durationSeconds')::numeric/60)::integer);
    insert into public.youtube_resource_items(resource_id,user_id,video_id,title,channel_title,thumbnail_url,duration_seconds,position,scheduled_date)
    values(resource_id,viewer,item->>'videoId',trim(item->>'title'),item->>'channelTitle',item->>'thumbnailUrl',(item->>'durationSeconds')::integer,(item->>'position')::integer,item_date) returning id into item_id;
    start_time:='17:00';
    loop
      select coalesce(max(bitis_saat),start_time) into start_time from public.gunluk_gorevler where user_id=viewer and tarih=item_date and bitis_saat>start_time;
      end_time:=start_time+make_interval(mins=>least(duration_minutes,360));
      exit when end_time<'23:55';
      item_date:=item_date+1; start_time:='09:00';
    end loop;
    insert into public.gunluk_gorevler(user_id,tarih,baslangic_saat,bitis_saat,ders_id,kaynak_id,konu,soru_sayisi,tamamlandi,youtube_item_id,source_url)
    values(viewer,item_date,start_time,end_time,p_ders_id,resource_id,left(trim(item->>'title'),200),0,false,item_id,'https://www.youtube.com/watch?v='||(item->>'videoId')) returning id into v_task_id;
    update public.youtube_resource_items set task_id=v_task_id,scheduled_date=item_date where id=item_id;
    created_tasks:=created_tasks+1;
  end loop;
  return jsonb_build_object('resourceId',resource_id,'tasksCreated',created_tasks,'itemsCreated',jsonb_array_length(p_items));
end;
$$;

-- Enrich the room payload without exposing private data outside the room.
create or replace function public.get_group_room_v3(p_group_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare viewer uuid:=(select auth.uid()); base jsonb; messages jsonb; moderation jsonb; enriched_members jsonb; member_moderation jsonb;
begin
  base:=public.get_group_room(p_group_id);
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'name',p.full_name,'body',m.body,'deletedAt',m.deleted_at,'createdAt',m.created_at) order by m.created_at),'[]'::jsonb) into messages
  from (select * from public.study_group_messages where group_id=p_group_id order by created_at desc limit 60) m join public.profiles p on p.id=m.user_id;
  select jsonb_build_object('description',g.description,'examTrack',g.exam_track,'studyStyle',g.study_style,'membersCanStartFocus',g.members_can_start_focus,'membersCanChat',g.members_can_chat,'membersCanReact',g.members_can_react,'viewerMutedUntil',gm.muted_until,'viewerMuteReason',gm.mute_reason,'globalMutedUntil',pr.muted_until,'globalMuteReason',pr.mute_reason) into moderation
  from public.study_groups g join public.study_group_members gm on gm.group_id=g.id and gm.user_id=viewer join public.profiles pr on pr.id=viewer where g.id=p_group_id;
  select coalesce(jsonb_agg(member.value||jsonb_build_object('avatarModel',social.avatar_model) order by member.ordinality),'[]'::jsonb) into enriched_members
  from jsonb_array_elements(base->'members') with ordinality as member(value,ordinality)
  join public.social_profiles social on social.user_id=(member.value->>'userId')::uuid;
  if (base->'room'->>'ownerId')::uuid=viewer then
    select coalesce(jsonb_agg(jsonb_build_object('userId',gm.user_id,'mutedUntil',gm.muted_until,'muteReason',gm.mute_reason)),'[]'::jsonb) into member_moderation
    from public.study_group_members gm where gm.group_id=p_group_id and gm.user_id<>viewer;
  else member_moderation:='[]'::jsonb; end if;
  return jsonb_set(jsonb_set(jsonb_set(jsonb_set(base,'{room}',coalesce(base->'room','{}'::jsonb)||coalesce(moderation,'{}'::jsonb)),'{messages}',messages),'{members}',enriched_members),'{memberModeration}',member_moderation);
end;
$$;

create or replace function public.admin_get_user_moderation(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare payload jsonb;
begin
  perform public.assert_admin('moderator');
  select jsonb_build_object('status',account_status,'statusReason',status_reason,'suspendedUntil',suspended_until,'mutedUntil',muted_until,'muteReason',mute_reason) into payload
  from public.profiles where id=p_user_id;
  if payload is null then raise exception using errcode='P0002', message='Kullanıcı bulunamadı.'; end if;
  return payload;
end;
$$;

revoke all on function public.update_classroom_character(text) from public,anon,authenticated;
revoke all on function public.can_use_group_feature(uuid,text) from public,anon,authenticated;
revoke all on function public.send_classroom_message(uuid,text) from public,anon,authenticated;
revoke all on function public.delete_classroom_message(uuid) from public,anon,authenticated;
revoke all on function public.moderate_study_group_member(uuid,uuid,text,integer,text) from public,anon,authenticated;
revoke all on function public.create_study_group_v3(text,text,integer,integer,text,text) from public,anon,authenticated;
revoke all on function public.update_study_group_room_v3(uuid,text,text,text,integer,boolean,boolean,boolean) from public,anon,authenticated;
revoke all on function public.get_live_streak() from public,anon,authenticated;
revoke all on function public.admin_moderate_user(uuid,text,integer,text) from public,anon,authenticated;
revoke all on function public.admin_get_user_moderation(uuid) from public,anon,authenticated;
revoke all on function public.import_youtube_learning_plan(jsonb,jsonb,date,text,integer,uuid) from public,anon,authenticated;
revoke all on function public.get_group_room_v3(uuid) from public,anon,authenticated;
grant execute on function public.update_classroom_character(text) to authenticated;
grant execute on function public.can_use_group_feature(uuid,text) to authenticated;
grant execute on function public.send_classroom_message(uuid,text) to authenticated;
grant execute on function public.delete_classroom_message(uuid) to authenticated;
grant execute on function public.moderate_study_group_member(uuid,uuid,text,integer,text) to authenticated;
grant execute on function public.create_study_group_v3(text,text,integer,integer,text,text) to authenticated;
grant execute on function public.update_study_group_room_v3(uuid,text,text,text,integer,boolean,boolean,boolean) to authenticated;
grant execute on function public.get_live_streak() to authenticated;
grant execute on function public.admin_moderate_user(uuid,text,integer,text) to authenticated;
grant execute on function public.admin_get_user_moderation(uuid) to authenticated;
grant execute on function public.import_youtube_learning_plan(jsonb,jsonb,date,text,integer,uuid) to authenticated;
grant execute on function public.get_group_room_v3(uuid) to authenticated;

drop policy if exists "Classroom members receive private realtime" on realtime.messages;
create policy "Classroom members receive private realtime" on realtime.messages for select to authenticated
using (extension in ('broadcast','presence') and (select realtime.topic()) like 'classroom:%' and exists(select 1 from public.study_group_members member where member.user_id=(select auth.uid()) and member.group_id::text=split_part((select realtime.topic()),':',2)));
drop policy if exists "Classroom members send private realtime" on realtime.messages;
create policy "Classroom members send private realtime" on realtime.messages for insert to authenticated
with check (extension in ('broadcast','presence') and (select realtime.topic()) like 'classroom:%' and exists(select 1 from public.study_group_members member where member.user_id=(select auth.uid()) and member.group_id::text=split_part((select realtime.topic()),':',2)));

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='study_group_messages') then alter publication supabase_realtime add table public.study_group_messages; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='youtube_resource_items') then alter publication supabase_realtime add table public.youtube_resource_items; end if;
end $$;

insert into public.user_roles(user_id,role,created_by)
select id,'admin',null from auth.users
where lower(email)=lower('dtkeremaslan@gmail.com') and email_confirmed_at is not null
on conflict(user_id) do update set role=case when public.user_roles.role='super_admin' then 'super_admin' else 'admin' end;
