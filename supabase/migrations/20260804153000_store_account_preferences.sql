alter table public.profiles
  add column if not exists study_preferences jsonb not null default '{"theme":"light","dailyPlan":true,"repeats":true,"pomodoro":true}'::jsonb,
  add column if not exists study_goals jsonb not null default '{"nets":{"TYT":0,"AYT":0,"YDT":0},"weeklyQuestions":0,"weeklyMinutes":0,"topics":{"TYT":0,"AYT":0,"YDT":0},"university":"","program":""}'::jsonb,
  add column if not exists study_goals_updated_at timestamptz;

update public.profiles as profile
set
  study_preferences = coalesce(auth_user.raw_user_meta_data -> 'study_preferences', profile.study_preferences),
  study_goals = coalesce(auth_user.raw_user_meta_data -> 'study_goals', profile.study_goals),
  study_goals_updated_at = coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'study_goals_updated_at', '')::timestamptz,
    profile.study_goals_updated_at
  )
from auth.users as auth_user
where auth_user.id = profile.id;
