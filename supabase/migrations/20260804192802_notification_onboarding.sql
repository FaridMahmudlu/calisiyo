create or replace function public.create_profile_welcome_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.notifications_enabled, true) then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (
      new.id,
      'info',
      'Bildirim merkezi hazır',
      'Plan, çalışma ve deneme gelişmelerini artık buradan takip edebilirsin.',
      '/dashboard/ayarlar',
      'notification-center-ready'
    )
    on conflict (user_id, dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.create_profile_welcome_notification() from public, anon, authenticated;

drop trigger if exists create_profile_welcome_notification on public.profiles;
create trigger create_profile_welcome_notification
after insert on public.profiles
for each row execute function public.create_profile_welcome_notification();
