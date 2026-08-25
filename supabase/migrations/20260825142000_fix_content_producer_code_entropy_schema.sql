create or replace function public.generate_content_producer_code(p_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  base text := public.content_producer_code_base(p_name);
  candidate text;
  attempt integer := 0;
begin
  if char_length(base) < 3 or base in ('CALISIYO','ADMIN','DESTEK','SUPPORT','PLUS','UCRETSIZ','FREE','SHOPIER') then
    base := 'CAL' || coalesce(nullif(base, ''), 'URETICI');
  end if;
  loop
    candidate := left(base, 16) || case when attempt = 0 then '' else upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6)) end;
    exit when not exists (select 1 from public.content_producer_codes c where upper(c.code) = upper(candidate));
    attempt := attempt + 1;
    if attempt > 20 then raise exception using errcode = 'P0001', message = 'Benzersiz indirim kodu üretilemedi.'; end if;
  end loop;
  return candidate;
end;
$$;
revoke all on function public.generate_content_producer_code(text) from public, anon, authenticated;
