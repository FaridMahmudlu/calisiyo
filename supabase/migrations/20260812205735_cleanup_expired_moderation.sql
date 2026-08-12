-- Keep administrative account-state labels in sync with automatically expired
-- restrictions. Authorization already treats elapsed restrictions as inactive;
-- this maintenance RPC makes the persisted state and admin UI agree as well.
create or replace function public.admin_cleanup_expired_moderation()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reactivated integer := 0;
  unmutes integer := 0;
begin
  perform public.assert_admin('moderator');

  with changed as (
    update public.profiles
    set account_status = 'active',
        status_reason = null,
        suspended_until = null,
        status_updated_at = now(),
        updated_at = now()
    where account_status = 'suspended'
      and suspended_until is not null
      and suspended_until <= now()
    returning id
  )
  select count(*) into reactivated from changed;

  with changed as (
    update public.profiles
    set muted_until = null,
        mute_reason = null,
        updated_at = now()
    where muted_until is not null
      and muted_until <= now()
    returning id
  )
  select count(*) into unmutes from changed;

  update public.study_group_members
  set muted_until = null,
      mute_reason = null
  where muted_until is not null
    and muted_until <= now();

  return jsonb_build_object('reactivated', reactivated, 'unmuted', unmutes);
end;
$$;

revoke all on function public.admin_cleanup_expired_moderation() from public, anon, authenticated;
grant execute on function public.admin_cleanup_expired_moderation() to authenticated;

-- Remove a library entry without breaking historical study records. Pending
-- tasks generated from a YouTube plan are removed; completed history is kept
-- and detached from the source before the resource row is deleted.
create or replace function public.remove_learning_resource(p_resource_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  resource_kind text;
  removed_tasks integer := 0;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;

  select item.resource_kind into resource_kind
  from public.kaynaklarim item
  where item.id = p_resource_id and item.user_id = viewer
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Kaynak bulunamadı.';
  end if;

  if resource_kind in ('youtube_video', 'youtube_playlist') then
    with removed as (
      delete from public.gunluk_gorevler
      where user_id = viewer
        and kaynak_id = p_resource_id
        and tamamlandi = false
      returning id
    )
    select count(*) into removed_tasks from removed;
  end if;

  update public.gunluk_gorevler
  set kaynak_id = null, youtube_item_id = null
  where user_id = viewer and kaynak_id = p_resource_id;

  update public.yapamadiklari
  set kaynak_id = null
  where user_id = viewer and kaynak_id = p_resource_id;

  update public.calisma_suresi
  set kaynak_id = null
  where user_id = viewer and kaynak_id = p_resource_id;

  delete from public.youtube_resource_items
  where user_id = viewer and resource_id = p_resource_id;

  delete from public.kaynaklarim
  where id = p_resource_id and user_id = viewer;

  return jsonb_build_object('resourceId', p_resource_id, 'removedPendingTasks', removed_tasks);
end;
$$;

revoke all on function public.remove_learning_resource(uuid) from public, anon, authenticated;
grant execute on function public.remove_learning_resource(uuid) to authenticated;
