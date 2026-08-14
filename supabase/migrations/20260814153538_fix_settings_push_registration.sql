-- YKS year is a user-editable profile preference. The security migration
-- intentionally uses column-level grants, so new safe columns must be added
-- explicitly instead of restoring table-wide UPDATE access.
grant update (yks_year) on table public.profiles to authenticated;
