-- Fix notify_study_change trigger function to safely nest table-specific column checks.
-- Prevents "record 'new' has no field 'tamamlandi'" error when inserting into denemeler table.

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

  if tg_table_name = 'gunluk_gorevler' then
    if tg_op = 'UPDATE' and new.tamamlandi and not coalesce(old.tamamlandi, false) then
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
    end if;
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
