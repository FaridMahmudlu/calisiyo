-- Run with:
--   supabase db query --linked --file supabase/tests/canonical_activity_regression.sql
-- Every write is contained in this transaction and rolled back.
begin;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users where email = 'claude.test@calisiyo.app' limit 1),
  true
);

do $$
declare
  viewer uuid := (select auth.uid());
  before_stats jsonb;
  after_stats jsonb;
  today_date date := (now() at time zone 'Europe/Istanbul')::date;
  daily_value integer;
begin
  if viewer is null then raise exception 'Dedicated QA account was not found'; end if;
  before_stats := public.get_my_study_time_statistics(null);

  -- Manual-only activity: 45 minutes / 10 questions.
  insert into public.calisma_suresi(user_id, tarih, sure_dakika, soru_sayisi)
  values (viewer, date '1999-01-01', 45, 10);

  -- Completed-task-only activity: 60 minutes / 20 questions.
  insert into public.gunluk_gorevler(
    user_id, tarih, baslangic_saat, bitis_saat, konu, soru_sayisi, tamamlandi
  ) values (viewer, date '1999-01-02', time '10:00', time '11:00', 'Rollback task only', 20, true);

  -- Timer-only legacy activity: 30 minutes.
  insert into public.pomodoro_kayitlari(user_id, calisma_suresi, mola_suresi, tarih, session_key)
  values (viewer, 30, 5, timestamptz '1999-01-03 12:00:00+03', 'rollback-timer-only-19990103');

  -- The three records represent the same 60-minute work. It must remain 60,
  -- not 180, and questions must remain the larger source total.
  insert into public.calisma_suresi(user_id, tarih, sure_dakika, soru_sayisi)
  values (viewer, date '1999-01-04', 60, 5);
  insert into public.gunluk_gorevler(
    user_id, tarih, baslangic_saat, bitis_saat, konu, soru_sayisi, tamamlandi
  ) values (viewer, date '1999-01-04', time '10:00', time '11:00', 'Rollback duplicate work', 5, true);
  insert into public.pomodoro_kayitlari(user_id, calisma_suresi, mola_suresi, tarih, session_key)
  values (viewer, 60, 5, timestamptz '1999-01-04 12:00:00+03', 'rollback-duplicate-19990104');

  -- Future activity must never appear in verified history.
  insert into public.calisma_suresi(user_id, tarih, sure_dakika, soru_sayisi)
  values (viewer, date '2099-01-01', 300, 300);

  after_stats := public.get_my_study_time_statistics(null);
  if (after_stats->>'studyMinutes')::integer - (before_stats->>'studyMinutes')::integer <> 195 then
    raise exception 'Canonical all-time total does not match 45 + 60 + 30 + 60';
  end if;
  if (after_stats->>'questions')::integer - (before_stats->>'questions')::integer <> 35 then
    raise exception 'Canonical all-time questions were double counted';
  end if;

  select (item->>'studyMinutes')::integer into daily_value
  from jsonb_array_elements(after_stats->'daily') as item
  where item->>'date' = '1999-01-04';
  if daily_value <> 60 then raise exception 'Duplicate mixed-source day was double counted'; end if;
  if exists (
    select 1 from jsonb_array_elements(after_stats->'daily') as item
    where item->>'date' = '2099-01-01'
  ) then
    raise exception 'Future activity leaked into verified statistics';
  end if;

  -- Today + previous day must qualify as a streak without resetting history.
  insert into public.calisma_suresi(user_id, tarih, sure_dakika, soru_sayisi, session_key)
  values
    (viewer, today_date - 1, 30, 0, 'rollback-streak-previous-' || today_date::text),
    (viewer, today_date, 30, 0, 'rollback-streak-today-' || today_date::text);
  if public.study_streak_for_user(viewer) < 2 then
    raise exception 'Previous-day streak continuity failed';
  end if;
end;
$$;

rollback;
