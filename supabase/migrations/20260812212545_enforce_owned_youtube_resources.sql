-- Ensure a YouTube item can only reference a resource owned by the same user.
-- This closes the direct PostgREST cross-tenant association path in addition
-- to the RLS read boundary.
create unique index if not exists kaynaklarim_user_id_id_unique
  on public.kaynaklarim (user_id, id);

delete from public.youtube_resource_items item
where not exists (
  select 1 from public.kaynaklarim resource
  where resource.user_id = item.user_id
    and resource.id = item.resource_id
);

alter table public.youtube_resource_items
  drop constraint if exists youtube_resource_items_owned_resource_fkey;

alter table public.youtube_resource_items
  add constraint youtube_resource_items_owned_resource_fkey
  foreign key (user_id, resource_id)
  references public.kaynaklarim (user_id, id)
  on delete cascade;
