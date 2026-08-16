-- Fix "permission denied for table profiles" during profile completion.
-- Root cause: column-level GRANT restricts UPDATE to a specific column list,
-- but the upsert path sends `id` in the SET clause on conflict, which is not
-- in the granted set. Solution: a SECURITY DEFINER helper that only the owner
-- can call and that guarantees the id matches auth.uid().

create or replace function public.upsert_own_profile(
  p_full_name text,
  p_alan_secimi text,
  p_yks_year integer default 2027
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  safe_name text;
  safe_field text;
  safe_year integer;
  result_row public.profiles;
begin
  if viewer is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;

  safe_name := left(trim(coalesce(nullif(trim(p_full_name), ''), 'Öğrenci')), 120);
  safe_field := case
    when p_alan_secimi in ('sayisal', 'esit_agirlik', 'sozel', 'dil') then p_alan_secimi
    else 'sayisal'
  end;
  safe_year := case when p_yks_year in (2027, 2028) then p_yks_year else 2027 end;

  insert into public.profiles (id, full_name, alan_secimi, yks_year)
  values (viewer, safe_name, safe_field, safe_year)
  on conflict (id) do update set
    full_name = excluded.full_name,
    alan_secimi = excluded.alan_secimi,
    yks_year = excluded.yks_year,
    updated_at = now()
  returning * into result_row;

  return result_row;
end;
$$;

revoke all on function public.upsert_own_profile(text, text, integer) from public, anon;
grant execute on function public.upsert_own_profile(text, text, integer) to authenticated;
