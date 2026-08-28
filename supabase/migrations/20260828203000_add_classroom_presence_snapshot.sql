-- A narrow fallback for clients whose Realtime socket temporarily misses a
-- Postgres Changes event. The full room payload is intentionally not queried.
create or replace function public.get_group_presence_snapshot(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  result jsonb;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişim yetkiniz yok.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', member.user_id,
    'presence', case
      when presence.updated_at > clock_timestamp() - interval '2 minutes'
        then coalesce(presence.status, 'online')
      else 'offline'
    end,
    'focusSubject', case
      when presence.updated_at > clock_timestamp() - interval '2 minutes'
        then presence.focus_subject
      else null
    end,
    'positionX', coalesce(presence.position_x, 50),
    'positionY', coalesce(presence.position_y, 72),
    'facing', coalesce(presence.facing, 'east'),
    'presenceUpdatedAt', presence.updated_at
  )), '[]'::jsonb)
  into result
  from public.study_group_members as member
  left join public.study_presence as presence
    on presence.group_id = member.group_id
   and presence.user_id = member.user_id
  where member.group_id = p_group_id;

  return result;
end;
$$;

revoke all on function public.get_group_presence_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.get_group_presence_snapshot(uuid) to authenticated;
