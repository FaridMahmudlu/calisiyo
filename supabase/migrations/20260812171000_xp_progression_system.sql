-- A mature, server-authoritative XP system. Events are derived from real study records;
-- clients can read progress but can never grant XP to themselves.

create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (
    event_type in ('task_completed', 'review_completed', 'exam_added', 'topic_completed', 'daily_focus')
  ),
  source_key text not null check (char_length(source_key) between 1 and 100),
  xp_amount integer not null check (xp_amount between 1 and 500),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, source_key)
);

create index if not exists xp_events_user_created_idx
  on public.xp_events (user_id, created_at desc);

alter table public.xp_events enable row level security;
revoke all on table public.xp_events from anon;
revoke insert, update, delete on table public.xp_events from authenticated;
grant select on table public.xp_events to authenticated;

drop policy if exists "Users read own XP" on public.xp_events;
create policy "Users read own XP"
on public.xp_events for select
to authenticated
using ((select auth.uid()) = user_id and public.is_active_user());

create or replace function public.set_xp_event(
  p_user_id uuid,
  p_event_type text,
  p_source_key text,
  p_amount integer,
  p_metadata jsonb,
  p_should_exist boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_should_exist then
    insert into public.xp_events (user_id, event_type, source_key, xp_amount, metadata)
    values (p_user_id, p_event_type, p_source_key, p_amount, coalesce(p_metadata, '{}'::jsonb))
    on conflict (user_id, event_type, source_key)
    do update set
      xp_amount = excluded.xp_amount,
      metadata = excluded.metadata;
  else
    delete from public.xp_events
    where user_id = p_user_id
      and event_type = p_event_type
      and source_key = p_source_key;
  end if;
end;
$$;

create or replace function public.sync_record_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
  target_key text;
  should_award boolean;
  event_name text;
  amount integer;
  details jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then
    target_user := old.user_id;
    target_key := old.id::text;
    should_award := false;
  else
    target_user := new.user_id;
    target_key := new.id::text;
  end if;

  if tg_table_name = 'gunluk_gorevler' then
    event_name := 'task_completed';
    amount := 50;
    if tg_op <> 'DELETE' then
      should_award := new.tamamlandi;
      details := jsonb_build_object('date', new.tarih, 'topic', coalesce(new.konu, ''));
    end if;
  elsif tg_table_name = 'tekrarlar' then
    event_name := 'review_completed';
    amount := 20;
    if tg_op <> 'DELETE' then
      should_award := new.tamamlandi;
      details := jsonb_build_object('date', new.tekrar_tarihi, 'topic', new.konu);
    end if;
  elsif tg_table_name = 'denemeler' then
    event_name := 'exam_added';
    amount := 100;
    if tg_op <> 'DELETE' then
      should_award := true;
      details := jsonb_build_object('date', new.tarih, 'examType', new.sinav_turu);
    end if;
  elsif tg_table_name = 'konu_takibi' then
    event_name := 'topic_completed';
    amount := 35;
    if tg_op <> 'DELETE' then
      should_award := new.durum = 'tamamlandi';
      details := jsonb_build_object('topicId', new.konu_id);
    end if;
  else
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  begin
    perform public.set_xp_event(
      target_user,
      event_name,
      target_key,
      amount,
      details,
      coalesce(should_award, false)
    );
  exception
    when others then
      -- Progress tracking is secondary; a study record must remain writable.
      null;
  end;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create or replace function public.refresh_daily_focus_xp(p_user_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_minutes integer;
begin
  if p_user_id is null or p_date is null then return; end if;

  select coalesce(sum(log.sure_dakika), 0)::integer
  into total_minutes
  from public.calisma_suresi as log
  where log.user_id = p_user_id and log.tarih = p_date;

  perform public.set_xp_event(
    p_user_id,
    'daily_focus',
    p_date::text,
    30,
    jsonb_build_object('date', p_date, 'minutes', total_minutes),
    total_minutes >= 30
  );
end;
$$;

create or replace function public.sync_daily_focus_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    begin perform public.refresh_daily_focus_xp(old.user_id, old.tarih); exception when others then null; end;
    return old;
  end if;

  if tg_op = 'UPDATE' and (old.user_id, old.tarih) is distinct from (new.user_id, new.tarih) then
    begin perform public.refresh_daily_focus_xp(old.user_id, old.tarih); exception when others then null; end;
  end if;

  begin perform public.refresh_daily_focus_xp(new.user_id, new.tarih); exception when others then null; end;
  return new;
end;
$$;

revoke all on function public.set_xp_event(uuid, text, text, integer, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.sync_record_xp() from public, anon, authenticated;
revoke all on function public.refresh_daily_focus_xp(uuid, date) from public, anon, authenticated;
revoke all on function public.sync_daily_focus_xp() from public, anon, authenticated;

drop trigger if exists sync_task_xp on public.gunluk_gorevler;
create trigger sync_task_xp
after insert or update of tamamlandi or delete on public.gunluk_gorevler
for each row execute function public.sync_record_xp();

drop trigger if exists sync_review_xp on public.tekrarlar;
create trigger sync_review_xp
after insert or update of tamamlandi or delete on public.tekrarlar
for each row execute function public.sync_record_xp();

drop trigger if exists sync_exam_xp on public.denemeler;
create trigger sync_exam_xp
after insert or update or delete on public.denemeler
for each row execute function public.sync_record_xp();

drop trigger if exists sync_topic_xp on public.konu_takibi;
create trigger sync_topic_xp
after insert or update of durum or delete on public.konu_takibi
for each row execute function public.sync_record_xp();

drop trigger if exists sync_focus_xp on public.calisma_suresi;
create trigger sync_focus_xp
after insert or update of user_id, tarih, sure_dakika or delete on public.calisma_suresi
for each row execute function public.sync_daily_focus_xp();

-- Backfill real historical actions without fabricating achievements.
insert into public.xp_events (user_id, event_type, source_key, xp_amount, metadata, created_at)
select task.user_id, 'task_completed', task.id::text, 50,
  jsonb_build_object('date', task.tarih, 'topic', coalesce(task.konu, '')), task.created_at
from public.gunluk_gorevler as task
where task.tamamlandi
on conflict (user_id, event_type, source_key) do nothing;

insert into public.xp_events (user_id, event_type, source_key, xp_amount, metadata, created_at)
select review.user_id, 'review_completed', review.id::text, 20,
  jsonb_build_object('date', review.tekrar_tarihi, 'topic', review.konu), review.created_at
from public.tekrarlar as review
where review.tamamlandi
on conflict (user_id, event_type, source_key) do nothing;

insert into public.xp_events (user_id, event_type, source_key, xp_amount, metadata, created_at)
select exam.user_id, 'exam_added', exam.id::text, 100,
  jsonb_build_object('date', exam.tarih, 'examType', exam.sinav_turu), exam.created_at
from public.denemeler as exam
on conflict (user_id, event_type, source_key) do nothing;

insert into public.xp_events (user_id, event_type, source_key, xp_amount, metadata, created_at)
select tracking.user_id, 'topic_completed', tracking.id::text, 35,
  jsonb_build_object('topicId', tracking.konu_id), tracking.updated_at
from public.konu_takibi as tracking
where tracking.durum = 'tamamlandi'
on conflict (user_id, event_type, source_key) do nothing;

insert into public.xp_events (user_id, event_type, source_key, xp_amount, metadata, created_at)
select daily.user_id, 'daily_focus', daily.tarih::text, 30,
  jsonb_build_object('date', daily.tarih, 'minutes', daily.minutes), daily.first_recorded_at
from (
  select user_id, tarih, sum(sure_dakika)::integer as minutes, min(created_at) as first_recorded_at
  from public.calisma_suresi
  group by user_id, tarih
  having sum(sure_dakika) >= 30
) as daily
on conflict (user_id, event_type, source_key) do nothing;

create or replace function public.xp_threshold_for_level(p_level integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select 25::bigint
    * (greatest(coalesce(p_level, 1), 1) - 1)::bigint
    * (greatest(coalesce(p_level, 1), 1) + 8)::bigint;
$$;

create or replace function public.xp_level_from_total(p_total bigint)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  result integer := 1;
  safe_total bigint := greatest(coalesce(p_total, 0), 0);
begin
  while result < 100 and public.xp_threshold_for_level(result + 1) <= safe_total loop
    result := result + 1;
  end loop;
  return result;
end;
$$;

create or replace function public.xp_level_title(p_level integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_level >= 30 then 'Ustalık Yolunda'
    when p_level >= 20 then 'Sınava Hazır'
    when p_level >= 15 then 'İstikrarlı Öğrenci'
    when p_level >= 10 then 'Düzenli Öğrenci'
    when p_level >= 6 then 'Odaklı Öğrenci'
    when p_level >= 3 then 'Rutin Kurucu'
    else 'Yeni Başlangıç'
  end;
$$;

revoke all on function public.xp_threshold_for_level(integer) from public, anon, authenticated;
revoke all on function public.xp_level_from_total(bigint) from public, anon, authenticated;
revoke all on function public.xp_level_title(integer) from public, anon, authenticated;
grant execute on function public.xp_threshold_for_level(integer) to authenticated;
grant execute on function public.xp_level_from_total(bigint) to authenticated;
grant execute on function public.xp_level_title(integer) to authenticated;

create or replace function public.get_my_progress()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  total_xp bigint;
  current_level integer;
  current_threshold bigint;
  next_threshold bigint;
  recent_events jsonb;
  breakdown jsonb;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Bu işlem için aktif bir oturum gerekli.';
  end if;

  select coalesce(sum(event.xp_amount), 0)::bigint
  into total_xp
  from public.xp_events as event
  where event.user_id = viewer;

  current_level := public.xp_level_from_total(total_xp);
  current_threshold := public.xp_threshold_for_level(current_level);
  next_threshold := public.xp_threshold_for_level(current_level + 1);

  select coalesce(jsonb_agg(to_jsonb(recent) order by recent.created_at desc), '[]'::jsonb)
  into recent_events
  from (
    select event.id, event.event_type, event.xp_amount, event.metadata, event.created_at
    from public.xp_events as event
    where event.user_id = viewer
    order by event.created_at desc
    limit 12
  ) as recent;

  select coalesce(jsonb_object_agg(grouped.event_type, grouped.total), '{}'::jsonb)
  into breakdown
  from (
    select event.event_type, sum(event.xp_amount)::integer as total
    from public.xp_events as event
    where event.user_id = viewer
    group by event.event_type
  ) as grouped;

  return jsonb_build_object(
    'totalXp', total_xp,
    'level', current_level,
    'title', public.xp_level_title(current_level),
    'currentLevelXp', total_xp - current_threshold,
    'currentLevelSize', next_threshold - current_threshold,
    'xpToNext', greatest(next_threshold - total_xp, 0),
    'progressPercent', case
      when next_threshold = current_threshold then 100
      else round(((total_xp - current_threshold)::numeric / (next_threshold - current_threshold)) * 100, 1)
    end,
    'breakdown', breakdown,
    'recentEvents', recent_events,
    'rules', jsonb_build_array(
      jsonb_build_object('type', 'task_completed', 'xp', 50, 'label', 'Günlük program görevini tamamla'),
      jsonb_build_object('type', 'review_completed', 'xp', 20, 'label', 'Planlı tekrarını tamamla'),
      jsonb_build_object('type', 'exam_added', 'xp', 100, 'label', 'Deneme sonucunu kaydet'),
      jsonb_build_object('type', 'topic_completed', 'xp', 35, 'label', 'Bir konuyu tamamla'),
      jsonb_build_object('type', 'daily_focus', 'xp', 30, 'label', 'Bir günde en az 30 dakika çalış')
    )
  );
end;
$$;

revoke all on function public.get_my_progress() from public, anon, authenticated;
grant execute on function public.get_my_progress() to authenticated;

create or replace function public.notify_xp_level_up()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_total bigint;
  after_total bigint;
  before_level integer;
  after_level integer;
  notifications_are_enabled boolean;
begin
  select coalesce(sum(event.xp_amount), 0)::bigint
  into after_total
  from public.xp_events as event
  where event.user_id = new.user_id;

  before_total := greatest(after_total - new.xp_amount, 0);
  before_level := public.xp_level_from_total(before_total);
  after_level := public.xp_level_from_total(after_total);

  if after_level <= before_level then return new; end if;

  select profile.notifications_enabled
  into notifications_are_enabled
  from public.profiles as profile
  where profile.id = new.user_id;

  if coalesce(notifications_are_enabled, true) then
    begin
      insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
      values (
        new.user_id,
        'success',
        'Seviye ' || after_level || ' — ' || public.xp_level_title(after_level),
        'Gerçek çalışma kayıtlarınla yeni bir seviyeye ulaştın.',
        '/dashboard/gelisim',
        'xp-level-' || after_level::text
      )
      on conflict (user_id, dedupe_key) do nothing;
    exception when others then null;
    end;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_xp_level_up() from public, anon, authenticated;
drop trigger if exists notify_xp_level_up on public.xp_events;
create trigger notify_xp_level_up
after insert on public.xp_events
for each row execute function public.notify_xp_level_up();

-- Existing historical rows were backfilled before the notification trigger was attached.
-- Create at most one truthful current-level notification per user after setup.
insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
select progress.user_id,
  'success',
  'Seviye ' || progress.level || ' — ' || public.xp_level_title(progress.level),
  'Gerçek çalışma kayıtların yeni gelişim sistemine aktarıldı.',
  '/dashboard/gelisim',
  'xp-level-' || progress.level::text
from (
  select event.user_id,
    public.xp_level_from_total(sum(event.xp_amount)::bigint) as level
  from public.xp_events as event
  group by event.user_id
) as progress
join public.profiles as profile on profile.id = progress.user_id
where progress.level > 1 and profile.notifications_enabled
on conflict (user_id, dedupe_key) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'xp_events'
  ) then
    alter publication supabase_realtime add table public.xp_events;
  end if;
end;
$$;
