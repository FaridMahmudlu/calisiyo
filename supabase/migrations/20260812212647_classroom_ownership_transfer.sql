-- Complete the owner lifecycle: a room with other members can be handed over
-- before the original owner leaves. Both membership roles change atomically.
create or replace function public.moderate_study_group_member(
  p_group_id uuid,
  p_user_id uuid,
  p_action text,
  p_duration_minutes integer default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
  until_at timestamptz;
begin
  if not exists (
    select 1 from public.study_groups
    where id = p_group_id and owner_id = viewer
    for update
  ) then
    raise exception using errcode = '42501', message = 'Üyeleri yalnızca sınıf sahibi yönetebilir.';
  end if;
  if p_user_id = viewer then
    raise exception using errcode = '42501', message = 'Kendi üyeliğini bu araçla değiştiremezsin.';
  end if;
  if not exists (
    select 1 from public.study_group_members
    where group_id = p_group_id and user_id = p_user_id and member_role <> 'owner'
    for update
  ) then
    raise exception using errcode = 'P0002', message = 'Sınıf üyesi bulunamadı.';
  end if;

  if p_action = 'mute' then
    if p_duration_minutes not between 5 and 10080 or clean_reason is null then
      raise exception using errcode = '22023', message = 'Geçerli süre ve susturma nedeni gerekli.';
    end if;
    until_at := clock_timestamp() + make_interval(mins => p_duration_minutes);
    update public.study_group_members
    set muted_until = until_at, mute_reason = clean_reason
    where group_id = p_group_id and user_id = p_user_id;
  elsif p_action = 'unmute' then
    update public.study_group_members
    set muted_until = null, mute_reason = null
    where group_id = p_group_id and user_id = p_user_id;
  elsif p_action = 'remove' then
    delete from public.study_group_members
    where group_id = p_group_id and user_id = p_user_id;
  elsif p_action = 'transfer_owner' then
    update public.study_group_members
    set member_role = 'member'
    where group_id = p_group_id and user_id = viewer;
    update public.study_group_members
    set member_role = 'owner', muted_until = null, mute_reason = null
    where group_id = p_group_id and user_id = p_user_id;
    update public.study_groups
    set owner_id = p_user_id, updated_at = now()
    where id = p_group_id and owner_id = viewer;
  else
    raise exception using errcode = '22023', message = 'Geçersiz üye işlemi.';
  end if;

  return jsonb_build_object(
    'userId', p_user_id,
    'action', p_action,
    'mutedUntil', until_at,
    'ownerId', case when p_action = 'transfer_owner' then p_user_id else viewer end
  );
end;
$$;

revoke all on function public.moderate_study_group_member(uuid, uuid, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.moderate_study_group_member(uuid, uuid, text, integer, text)
  to authenticated;
