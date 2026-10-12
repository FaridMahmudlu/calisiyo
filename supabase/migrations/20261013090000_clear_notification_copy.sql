-- Clearer, more concrete notification copy. Confirmations of the user's own
-- actions (task done, mock exam saved) are stored as already read: they stay
-- in the activity history but no longer raise the unread badge or a push.

create or replace function public.notify_study_change()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
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

  if tg_table_name = 'gunluk_gorevler' then
    if tg_op = 'UPDATE' and new.tamamlandi and not coalesce(old.tamamlandi, false) then
      insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key, read_at)
      values (
        target_user,
        'success',
        'Görev tamamlandı',
        coalesce('“' || nullif(btrim(new.konu), '') || '” görevini bitirdin.', 'Planındaki bir görevi bitirdin.'),
        '/dashboard/gunluk-program',
        'task-completed-' || new.id::text,
        now()
      )
      on conflict (user_id, dedupe_key) do nothing;
    end if;
  elsif tg_table_name = 'denemeler' and tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key, read_at)
    values (
      target_user,
      'info',
      new.sinav_turu || ' denemen kaydedildi',
      'Netlerin ve ders bazlı analizin hazır.',
      '/dashboard/deneme-analizi',
      'exam-created-' || new.id::text,
      now()
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
        'Bugünkü seri hedefi tamam',
        total_minutes || ' dakika çalıştın ve serini korudun. Yarın da en az 30 dakika çalış.',
        '/dashboard/istatistikler',
        'daily-streak-' || new.tarih::text
      )
      on conflict (user_id, dedupe_key) do nothing;
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.notify_xp_level_up()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
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
        'Seviye ' || after_level || ': ' || public.xp_level_title(after_level),
        'Çalışmalarınla yeni bir seviyeye ulaştın. Gelişimini görmek için dokun.',
        '/dashboard/gelisim',
        'xp-level-' || after_level::text
      )
      on conflict (user_id, dedupe_key) do nothing;
    exception when others then null;
    end;
  end if;

  return new;
end;
$function$;

create or replace function public.create_profile_welcome_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if coalesce(new.notifications_enabled, true) then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (
      new.id,
      'info',
      'Planliyo’ya hoş geldin',
      'Plan hatırlatmaların, seri ve deneme gelişmelerin burada görünür. Bildirim tercihlerini Ayarlar’dan değiştirebilirsin.',
      '/dashboard/ayarlar',
      'notification-center-ready'
    )
    on conflict (user_id, dedupe_key) do nothing;
  end if;
  return new;
end;
$function$;
