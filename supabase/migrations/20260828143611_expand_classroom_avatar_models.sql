begin;

alter table public.social_profiles
  drop constraint if exists social_profiles_avatar_model_valid;

alter table public.social_profiles
  add constraint social_profiles_avatar_model_valid
  check (avatar_model in ('navy', 'sage', 'rust', 'ece', 'selin', 'arda'))
  not valid;

alter table public.social_profiles
  validate constraint social_profiles_avatar_model_valid;

create or replace function public.update_classroom_character(p_model text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  updated public.social_profiles%rowtype;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  if p_model not in ('navy', 'sage', 'rust', 'ece', 'selin', 'arda') then
    raise exception using errcode = '22023', message = 'Geçersiz karakter modeli.';
  end if;
  update public.social_profiles
  set avatar_model = p_model,
      updated_at = now()
  where user_id = viewer
  returning * into updated;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sosyal profil bulunamadı.';
  end if;
  return jsonb_build_object('model', updated.avatar_model);
end;
$$;

revoke all on function public.update_classroom_character(text) from public, anon, authenticated;
grant execute on function public.update_classroom_character(text) to authenticated;

commit;
