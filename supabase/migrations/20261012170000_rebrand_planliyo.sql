-- Rebrand calisiyo -> planliyo for user-facing database text.
-- Internal identifiers (advisory-lock keys such as 'calisiyo:billing:', avatar
-- seeds, storage keys) stay unchanged. The old name stays reserved next to the
-- new one so nobody can register it as a username or creator code.

update public.billing_plans
set name = replace(name, 'calisiyo', 'planliyo'),
    description = replace(description, 'calisiyo', 'planliyo'),
    updated_at = now()
where name like '%calisiyo%' or description like '%calisiyo%';

do $$
declare
  fn record;
  def text;
begin
  for fn in
    select p.oid, p.proname
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'admin_get_user_plan', 'admin_review_billing_order', 'admin_set_user_plan',
        'admin_set_user_status', 'provider_confirm_billing_order',
        'generate_content_producer_code', 'self_rotate_content_producer_code', 'set_my_username'
      )
  loop
    def := pg_get_functiondef(fn.oid);
    def := replace(def, 'calisiyo ücretsiz', 'planliyo ücretsiz');
    def := replace(def, 'calisiyo plus', 'planliyo plus');
    def := replace(def, 'calisiyo hesabına', 'planliyo hesabına');
    if position('''PLANLIYO''' in def) = 0 then
      def := replace(def, '''CALISIYO'',', '''CALISIYO'',''PLANLIYO'',');
    end if;
    if position('''planliyo''' in def) = 0 then
      def := replace(def, '''calisiyo'',', '''calisiyo'', ''planliyo'',');
    end if;
    execute def;
  end loop;
end;
$$;
