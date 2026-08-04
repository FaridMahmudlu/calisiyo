-- Reliable profile creation for email and social-auth users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, alan_secimi)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Öğrenci'
    ),
    case
      when new.raw_user_meta_data ->> 'alan_secimi' in ('sayisal', 'esit_agirlik', 'sozel', 'dil')
        then new.raw_user_meta_data ->> 'alan_secimi'
      else 'sayisal'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

-- Repair any account created while the profile trigger was unavailable.
insert into public.profiles (id, full_name, alan_secimi)
select
  auth_user.id,
  coalesce(
    nullif(trim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(auth_user.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(auth_user.email, ''), '@', 1), ''),
    'Öğrenci'
  ),
  case
    when auth_user.raw_user_meta_data ->> 'alan_secimi' in ('sayisal', 'esit_agirlik', 'sozel', 'dil')
      then auth_user.raw_user_meta_data ->> 'alan_secimi'
    else 'sayisal'
  end
from auth.users as auth_user
left join public.profiles as profile on profile.id = auth_user.id
where profile.id is null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'info' check (kind in ('info', 'success', 'reminder', 'warning')),
  title text not null check (char_length(title) between 2 and 90),
  body text not null check (char_length(body) between 2 and 240),
  action_url text check (action_url is null or action_url like '/%'),
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

alter table public.notifications enable row level security;

revoke all on table public.notifications from anon;
grant select, insert, update, delete on table public.notifications to authenticated;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own notifications" on public.notifications;
create policy "Users can create own notifications"
on public.notifications for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
on public.notifications for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create or replace function public.notify_study_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_user uuid;
  notifications_are_enabled boolean;
  total_minutes integer;
begin
  target_user := new.user_id;

  select profile.notifications_enabled
    into notifications_are_enabled
  from public.profiles as profile
  where profile.id = target_user;

  if not coalesce(notifications_are_enabled, true) then
    return new;
  end if;

  if tg_table_name = 'gunluk_gorevler'
    and tg_op = 'UPDATE'
    and new.tamamlandi
    and not coalesce(old.tamamlandi, false)
  then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (
      target_user,
      'success',
      'Görev tamamlandı',
      coalesce(nullif(new.konu, ''), 'Günlük planındaki bir çalışma') || ' tamamlandı.',
      '/dashboard/gunluk-program',
      'task-completed-' || new.id::text
    )
    on conflict (user_id, dedupe_key) do nothing;
  elsif tg_table_name = 'denemeler' and tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (
      target_user,
      'info',
      'Deneme kaydın hazır',
      new.sinav_turu || ' denemen analiz ve istatistiklerine eklendi.',
      '/dashboard/deneme-analizi',
      'exam-created-' || new.id::text
    )
    on conflict (user_id, dedupe_key) do nothing;
  elsif tg_table_name = 'calisma_suresi' and tg_op = 'INSERT' then
    select coalesce(sum(session.sure_dakika), 0)::integer
      into total_minutes
    from public.calisma_suresi as session
    where session.user_id = target_user and session.tarih = new.tarih;

    if total_minutes >= 30 then
      insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
      values (
        target_user,
        'success',
        'Bugünün seri hedefi tamam',
        'En az 30 dakika çalıştın. Bugün seri koşulunu tamamladın.',
        '/dashboard/istatistikler',
        'daily-streak-' || new.tarih::text
      )
      on conflict (user_id, dedupe_key) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_completed_task on public.gunluk_gorevler;
create trigger notify_completed_task
after update of tamamlandi on public.gunluk_gorevler
for each row execute function public.notify_study_change();

drop trigger if exists notify_new_exam on public.denemeler;
create trigger notify_new_exam
after insert on public.denemeler
for each row execute function public.notify_study_change();

drop trigger if exists notify_daily_study_goal on public.calisma_suresi;
create trigger notify_daily_study_goal
after insert on public.calisma_suresi
for each row execute function public.notify_study_change();

insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
select
  profile.id,
  'info',
  'Bildirim merkezi hazır',
  'Plan, çalışma ve deneme gelişmelerini artık buradan takip edebilirsin.',
  '/dashboard/ayarlar',
  'notification-center-ready'
from public.profiles as profile
where profile.notifications_enabled
on conflict (user_id, dedupe_key) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
