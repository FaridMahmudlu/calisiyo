-- Data fields required by the v2 product document.
alter table public.kaynaklarim
  add column if not exists kapak_url text;

alter table public.yapamadiklari
  add column if not exists foto_url text,
  add column if not exists kaynak text;

alter table public.calisma_suresi
  add column if not exists kaynak_id uuid references public.kaynaklarim(id) on delete set null;

alter table public.tekrarlar
  add column if not exists otomatik boolean not null default false,
  add column if not exists konu_id uuid references public.konular(id) on delete cascade;

create unique index if not exists tekrarlar_otomatik_unique
  on public.tekrarlar (user_id, konu_id, tekrar_tarihi)
  where otomatik = true;

-- A completed topic automatically creates spaced repetition reminders.
create or replace function public.create_topic_repeats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  topic_name text;
  course_id uuid;
  exam_type text;
  repeat_offset integer;
begin
  if new.durum <> 'tamamlandi' or (tg_op = 'UPDATE' and old.durum = 'tamamlandi') then
    return new;
  end if;

  select k.ad, k.ders_id, d.sinav_turu
    into topic_name, course_id, exam_type
  from public.konular k
  join public.dersler d on d.id = k.ders_id
  where k.id = new.konu_id;

  foreach repeat_offset in array array[1, 7, 30]
  loop
    insert into public.tekrarlar (
      user_id, ders_id, sinav_turu, konu, konu_id,
      tekrar_tarihi, tamamlandi, otomatik
    ) values (
      new.user_id, course_id, exam_type, topic_name, new.konu_id,
      current_date + repeat_offset, false, true
    )
    on conflict (user_id, konu_id, tekrar_tarihi) where otomatik = true do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists konu_takibi_create_repeats on public.konu_takibi;
create trigger konu_takibi_create_repeats
after insert or update of durum on public.konu_takibi
for each row execute function public.create_topic_repeats();

-- Private image storage. Every object path must start with the authenticated user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-assets', 'study-assets', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "study assets select own" on storage.objects;
create policy "study assets select own" on storage.objects
for select to authenticated
using (bucket_id = 'study-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "study assets insert own" on storage.objects;
create policy "study assets insert own" on storage.objects
for insert to authenticated
with check (bucket_id = 'study-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "study assets update own" on storage.objects;
create policy "study assets update own" on storage.objects
for update to authenticated
using (bucket_id = 'study-assets' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'study-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "study assets delete own" on storage.objects;
create policy "study assets delete own" on storage.objects
for delete to authenticated
using (bucket_id = 'study-assets' and (storage.foldername(name))[1] = auth.uid()::text);

-- Enable the user-owned tables used by the client refresh hooks.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'gunluk_gorevler', 'kaynaklarim', 'yapamadiklari',
    'tekrarlar', 'denemeler', 'calisma_suresi', 'notlar', 'konu_takibi'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
