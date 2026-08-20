-- Future-dated rows are plans, not verified study history. Keep the canonical
-- statistics surface aligned with streak by capping activity at Istanbul today.
create or replace function public.get_my_study_time_statistics(p_start_date date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  today_date date := (now() at time zone 'Europe/Istanbul')::date;
  payload jsonb;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;

  with candidate_days as (
    select log.tarih as day
    from public.calisma_suresi as log
    where log.user_id = viewer
      and log.tarih <= today_date
      and (p_start_date is null or log.tarih >= p_start_date)
    union
    select task.tarih
    from public.gunluk_gorevler as task
    where task.user_id = viewer
      and task.tamamlandi
      and task.tarih <= today_date
      and (p_start_date is null or task.tarih >= p_start_date)
    union
    select coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date)
    from public.pomodoro_kayitlari as session
    left join public.calisma_suresi as linked_log
      on linked_log.user_id = session.user_id
      and linked_log.session_key = session.session_key
      and session.session_key is not null
    where session.user_id = viewer
      and coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date) <= today_date
      and (p_start_date is null or coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date) >= p_start_date)
  ), daily as (
    select candidate.day,
      public.verified_study_minutes_for_user_day(viewer, candidate.day) as study_minutes,
      public.verified_study_questions_for_user_day(viewer, candidate.day) as questions,
      least(
        public.verified_study_minutes_for_user_day(viewer, candidate.day),
        coalesce((
          select sum(greatest(coalesce(session.calisma_suresi, 0), 0))::integer
          from public.pomodoro_kayitlari as session
          left join public.calisma_suresi as linked_log
            on linked_log.user_id = session.user_id
            and linked_log.session_key = session.session_key
            and session.session_key is not null
          where session.user_id = viewer
            and coalesce(linked_log.tarih, (session.tarih at time zone 'Europe/Istanbul')::date) = candidate.day
        ), 0)
      ) as focus_minutes
    from candidate_days as candidate
  )
  select jsonb_build_object(
    'studyMinutes', coalesce(sum(daily.study_minutes), 0),
    'focusMinutes', coalesce(sum(daily.focus_minutes), 0),
    'nonFocusMinutes', greatest(coalesce(sum(daily.study_minutes - daily.focus_minutes), 0), 0),
    'questions', coalesce(sum(daily.questions), 0),
    'studyDays', count(*) filter (where daily.study_minutes > 0),
    'daily', coalesce(jsonb_agg(jsonb_build_object(
      'date', daily.day,
      'studyMinutes', daily.study_minutes,
      'focusMinutes', daily.focus_minutes,
      'questions', daily.questions
    ) order by daily.day), '[]'::jsonb)
  )
  into payload
  from daily;

  return coalesce(payload, jsonb_build_object(
    'studyMinutes', 0, 'focusMinutes', 0, 'nonFocusMinutes', 0,
    'questions', 0, 'studyDays', 0, 'daily', '[]'::jsonb
  ));
end;
$$;

revoke all on function public.get_my_study_time_statistics(date) from public, anon, authenticated;
grant execute on function public.get_my_study_time_statistics(date) to authenticated;
