-- Native mobile apps receive notifications through Expo push tokens. Web Push
-- subscriptions stay in push_subscriptions; both are fed by the same
-- notifications queue in /api/cron/push-notifications.
create table if not exists public.mobile_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$'),
  platform text not null check (platform in ('android', 'ios')),
  device_name text check (char_length(device_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mobile_push_tokens_user_idx on public.mobile_push_tokens (user_id);
alter table public.mobile_push_tokens enable row level security;
revoke all on table public.mobile_push_tokens from public, anon, authenticated;
grant select, delete on table public.mobile_push_tokens to authenticated;
drop policy if exists "Users read own mobile push tokens" on public.mobile_push_tokens;
create policy "Users read own mobile push tokens" on public.mobile_push_tokens
for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "Users delete own mobile push tokens" on public.mobile_push_tokens;
create policy "Users delete own mobile push tokens" on public.mobile_push_tokens
for delete to authenticated
using ((select auth.uid()) = user_id);

-- A physical device keeps its token across sign-outs, so registration moves
-- the token to the account that is currently signed in on that device.
create or replace function public.register_mobile_push_token(
  p_token text,
  p_platform text,
  p_device_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then
    raise exception 'Oturum gerekli.' using errcode = '28000';
  end if;
  insert into public.mobile_push_tokens (user_id, token, platform, device_name)
  values (actor, p_token, p_platform, nullif(left(trim(coalesce(p_device_name, '')), 120), ''))
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        device_name = excluded.device_name,
        updated_at = now();
end;
$$;

create or replace function public.unregister_mobile_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.mobile_push_tokens
  where token = p_token and user_id = (select auth.uid());
$$;

revoke all on function public.register_mobile_push_token(text, text, text) from public, anon;
revoke all on function public.unregister_mobile_push_token(text) from public, anon;
grant execute on function public.register_mobile_push_token(text, text, text) to authenticated;
grant execute on function public.unregister_mobile_push_token(text) to authenticated;
