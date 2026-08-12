-- Administrative authorization, account-state enforcement, and audit primitives.
-- Roles live outside profiles so students can never promote themselves through profile updates.

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists status_reason text,
  add column if not exists status_updated_at timestamptz,
  add column if not exists status_updated_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_account_status_valid'
  ) then
    alter table public.profiles
      add constraint profiles_account_status_valid
      check (account_status in ('active', 'suspended'));
  end if;
end;
$$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin', 'super_admin')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon;
revoke insert, update, delete on table public.user_roles from authenticated;
grant select on table public.user_roles to authenticated;

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
on public.user_roles for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.user_roles
  where user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role in ('moderator', 'admin', 'super_admin')
    );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((
      select profile.account_status = 'active'
      from public.profiles as profile
      where profile.id = (select auth.uid())
    ), false);
$$;

revoke all on function public.current_admin_role() from public, anon, authenticated;
revoke all on function public.is_current_user_admin() from public, anon, authenticated;
revoke all on function public.is_active_user() from public, anon, authenticated;
grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.is_current_user_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;

-- Table-level UPDATE would also let a student set account_status back to active.
-- Grant only the profile fields that the product intentionally exposes.
revoke update on table public.profiles from authenticated;
grant update (
  full_name,
  alan_secimi,
  avatar_url,
  theme,
  notifications_enabled,
  updated_at,
  study_preferences,
  study_goals,
  study_goals_updated_at
) on table public.profiles to authenticated;

-- Suspended accounts can read their profile status but cannot mutate profile or study data.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id and public.is_active_user())
with check ((select auth.uid()) = id and public.is_active_user());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users own konu_takibi" on public.konu_takibi;
create policy "Users own konu_takibi" on public.konu_takibi for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users own kaynaklarim" on public.kaynaklarim;
create policy "Users own kaynaklarim" on public.kaynaklarim for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users own gunluk_gorevler" on public.gunluk_gorevler;
create policy "Users own gunluk_gorevler" on public.gunluk_gorevler for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users own denemeler" on public.denemeler;
create policy "Users own denemeler" on public.denemeler for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users own deneme_detaylari" on public.deneme_detaylari;
create policy "Users own deneme_detaylari" on public.deneme_detaylari for all to authenticated
using (
  public.is_active_user()
  and exists (
    select 1 from public.denemeler
    where denemeler.id = deneme_detaylari.deneme_id
      and denemeler.user_id = (select auth.uid())
  )
)
with check (
  public.is_active_user()
  and exists (
    select 1 from public.denemeler
    where denemeler.id = deneme_detaylari.deneme_id
      and denemeler.user_id = (select auth.uid())
  )
);

drop policy if exists "Users own yapamadiklari" on public.yapamadiklari;
create policy "Users own yapamadiklari" on public.yapamadiklari for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users own tekrarlar" on public.tekrarlar;
create policy "Users own tekrarlar" on public.tekrarlar for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users own calisma_suresi" on public.calisma_suresi;
create policy "Users own calisma_suresi" on public.calisma_suresi for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users own notlar" on public.notlar;
create policy "Users own notlar" on public.notlar for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users own pomodoro" on public.pomodoro_kayitlari;
create policy "Users own pomodoro" on public.pomodoro_kayitlari for all to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications for select to authenticated
using ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users can create own notifications" on public.notifications;
create policy "Users can create own notifications" on public.notifications for insert to authenticated
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications for update to authenticated
using ((select auth.uid()) = user_id and public.is_active_user())
with check ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications" on public.notifications for delete to authenticated
using ((select auth.uid()) = user_id and public.is_active_user());

drop policy if exists "study assets select own" on storage.objects;
create policy "study assets select own" on storage.objects for select to authenticated
using (
  bucket_id = 'study-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_active_user()
);

drop policy if exists "study assets insert own" on storage.objects;
create policy "study assets insert own" on storage.objects for insert to authenticated
with check (
  bucket_id = 'study-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_active_user()
);

drop policy if exists "study assets update own" on storage.objects;
create policy "study assets update own" on storage.objects for update to authenticated
using (
  bucket_id = 'study-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_active_user()
)
with check (
  bucket_id = 'study-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_active_user()
);

drop policy if exists "study assets delete own" on storage.objects;
create policy "study assets delete own" on storage.objects for delete to authenticated
using (
  bucket_id = 'study-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_active_user()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(action) between 3 and 80),
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  note text not null check (char_length(note) between 2 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 90),
  body text not null check (char_length(body) between 2 and 240),
  action_url text check (action_url is null or action_url like '/%'),
  audience text not null default 'all' check (audience in ('all', 'active_students')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_live_events (
  id bigint generated always as identity primary key,
  event_type text not null check (char_length(event_type) between 3 and 60),
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_target_idx on public.admin_audit_log (target_user_id, created_at desc);
create index if not exists admin_user_notes_user_idx on public.admin_user_notes (user_id, created_at desc);
create index if not exists admin_live_events_created_idx on public.admin_live_events (created_at desc);

alter table public.admin_audit_log enable row level security;
alter table public.admin_user_notes enable row level security;
alter table public.admin_announcements enable row level security;
alter table public.admin_live_events enable row level security;

revoke all on table public.admin_audit_log from anon, authenticated;
revoke all on table public.admin_user_notes from anon, authenticated;
revoke all on table public.admin_announcements from anon, authenticated;
revoke all on table public.admin_live_events from anon;
grant select on table public.admin_live_events to authenticated;

drop policy if exists "Admins read live events" on public.admin_live_events;
create policy "Admins read live events"
on public.admin_live_events for select
to authenticated
using (public.is_current_user_admin());

create or replace function public.capture_admin_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
  event_name text;
  safe_payload jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'profiles' and tg_op = 'INSERT' then
    target_user := new.id;
    event_name := 'user_registered';
  elsif tg_table_name = 'calisma_suresi' and tg_op = 'INSERT' then
    target_user := new.user_id;
    event_name := 'study_recorded';
    safe_payload := jsonb_build_object(
      'minutes', new.sure_dakika,
      'questions', coalesce(new.soru_sayisi, 0),
      'date', new.tarih
    );
  elsif tg_table_name = 'denemeler' and tg_op = 'INSERT' then
    target_user := new.user_id;
    event_name := 'exam_created';
    safe_payload := jsonb_build_object('examType', new.sinav_turu, 'date', new.tarih);
  elsif tg_table_name = 'gunluk_gorevler' and tg_op = 'UPDATE'
      and new.tamamlandi and not coalesce(old.tamamlandi, false) then
    target_user := new.user_id;
    event_name := 'task_completed';
    safe_payload := jsonb_build_object('date', new.tarih);
  else
    return new;
  end if;

  begin
    insert into public.admin_live_events (event_type, user_id, payload)
    values (event_name, target_user, safe_payload);
  exception
    when others then
      -- Observability must never make the student's core study write fail.
      null;
  end;

  return new;
end;
$$;

revoke all on function public.capture_admin_activity() from public, anon, authenticated;

drop trigger if exists capture_profile_admin_activity on public.profiles;
create trigger capture_profile_admin_activity
after insert on public.profiles
for each row execute function public.capture_admin_activity();

drop trigger if exists capture_study_admin_activity on public.calisma_suresi;
create trigger capture_study_admin_activity
after insert on public.calisma_suresi
for each row execute function public.capture_admin_activity();

drop trigger if exists capture_exam_admin_activity on public.denemeler;
create trigger capture_exam_admin_activity
after insert on public.denemeler
for each row execute function public.capture_admin_activity();

drop trigger if exists capture_task_admin_activity on public.gunluk_gorevler;
create trigger capture_task_admin_activity
after update of tamamlandi on public.gunluk_gorevler
for each row execute function public.capture_admin_activity();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_live_events'
  ) then
    alter publication supabase_realtime add table public.admin_live_events;
  end if;
end;
$$;
