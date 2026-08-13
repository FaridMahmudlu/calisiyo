-- Internal-only helper: SECURITY DEFINER callers execute this as the function
-- owner, so browser roles do not need a directly callable lock endpoint.
revoke all on function public.lock_current_user_mutation(text)
from public, anon, authenticated, service_role;
