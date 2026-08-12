-- Integrity guarantees exercised by the production QA suite.

alter table public.konu_takibi alter column user_id set not null, alter column konu_id set not null;
alter table public.kaynaklarim alter column user_id set not null;
alter table public.gunluk_gorevler alter column user_id set not null;
alter table public.denemeler alter column user_id set not null;
alter table public.deneme_detaylari alter column deneme_id set not null, alter column ders_id set not null;
alter table public.yapamadiklari alter column user_id set not null;
alter table public.tekrarlar alter column user_id set not null;
alter table public.calisma_suresi alter column user_id set not null;
alter table public.notlar alter column user_id set not null;
alter table public.pomodoro_kayitlari alter column user_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gunluk_gorevler_valid_time') then
    alter table public.gunluk_gorevler
      add constraint gunluk_gorevler_valid_time check (bitis_saat > baslangic_saat);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'gunluk_gorevler_nonnegative_questions') then
    alter table public.gunluk_gorevler
      add constraint gunluk_gorevler_nonnegative_questions check (soru_sayisi is null or soru_sayisi >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'calisma_suresi_valid_minutes') then
    alter table public.calisma_suresi
      add constraint calisma_suresi_valid_minutes check (sure_dakika between 1 and 1440);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'calisma_suresi_nonnegative_questions') then
    alter table public.calisma_suresi
      add constraint calisma_suresi_nonnegative_questions check (soru_sayisi >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pomodoro_kayitlari_valid_minutes') then
    alter table public.pomodoro_kayitlari
      add constraint pomodoro_kayitlari_valid_minutes check (calisma_suresi between 1 and 180 and mola_suresi between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'denemeler_valid_duration') then
    alter table public.denemeler
      add constraint denemeler_valid_duration check (sure_dakika is null or sure_dakika between 1 and 600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'deneme_detaylari_nonnegative_answers') then
    alter table public.deneme_detaylari
      add constraint deneme_detaylari_nonnegative_answers check (dogru >= 0 and yanlis >= 0 and bos >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'deneme_detaylari_exam_course_unique') then
    alter table public.deneme_detaylari
      add constraint deneme_detaylari_exam_course_unique unique (deneme_id, ders_id);
  end if;
end;
$$;

-- Serialize writes for one user's day before checking for schedule collisions.
create or replace function public.prevent_study_task_overlap()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || new.tarih::text, 0));
  if exists (
    select 1
    from public.gunluk_gorevler as task
    where task.user_id = new.user_id
      and task.tarih = new.tarih
      and task.id <> new.id
      and new.baslangic_saat < task.bitis_saat
      and task.baslangic_saat < new.bitis_saat
  ) then
    raise exception using
      errcode = '23P01',
      message = 'Bu saat aralığında başka bir görev var.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_study_task_overlap() from public, anon, authenticated;
drop trigger if exists prevent_study_task_overlap on public.gunluk_gorevler;
create trigger prevent_study_task_overlap
before insert or update of user_id, tarih, baslangic_saat, bitis_saat on public.gunluk_gorevler
for each row execute function public.prevent_study_task_overlap();

-- Downgrading a completed topic cancels only unfinished automatic reminders.
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
  study_date date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if tg_op = 'UPDATE' and old.durum = 'tamamlandi' and new.durum <> 'tamamlandi' then
    delete from public.tekrarlar
    where user_id = new.user_id
      and konu_id = new.konu_id
      and otomatik
      and not tamamlandi;
    return new;
  end if;

  if new.durum <> 'tamamlandi' or (tg_op = 'UPDATE' and old.durum = 'tamamlandi') then
    return new;
  end if;

  select topic.ad, topic.ders_id, course.sinav_turu
    into topic_name, course_id, exam_type
  from public.konular as topic
  join public.dersler as course on course.id = topic.ders_id
  where topic.id = new.konu_id;

  foreach repeat_offset in array array[1, 7, 30]
  loop
    insert into public.tekrarlar (
      user_id, ders_id, sinav_turu, konu, konu_id,
      tekrar_tarihi, tamamlandi, otomatik
    ) values (
      new.user_id, course_id, exam_type, topic_name, new.konu_id,
      study_date + repeat_offset, false, true
    )
    on conflict (user_id, konu_id, tekrar_tarihi) where otomatik = true do nothing;
  end loop;

  return new;
end;
$$;

revoke all on function public.create_topic_repeats() from public, anon, authenticated;

alter table public.calisma_suresi add column if not exists session_key text;
alter table public.pomodoro_kayitlari add column if not exists session_key text;
create unique index if not exists calisma_suresi_user_session_unique
  on public.calisma_suresi (user_id, session_key) where session_key is not null;
create unique index if not exists pomodoro_user_session_unique
  on public.pomodoro_kayitlari (user_id, session_key) where session_key is not null;

create or replace function public.complete_pomodoro_session(
  p_session_key text,
  p_work_minutes integer,
  p_break_minutes integer,
  p_ders_id uuid default null,
  p_kaynak_id uuid default null,
  p_study_date date default ((now() at time zone 'Europe/Istanbul')::date)
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  study_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;
  if p_session_key is null or char_length(p_session_key) < 8 or char_length(p_session_key) > 120 then
    raise exception using errcode = '22023', message = 'Geçersiz oturum anahtarı.';
  end if;
  if p_work_minutes not between 1 and 180 or p_break_minutes not between 1 and 60 then
    raise exception using errcode = '22023', message = 'Geçersiz Pomodoro süresi.';
  end if;
  if p_kaynak_id is not null and not exists (
    select 1 from public.kaynaklarim
    where id = p_kaynak_id and user_id = current_user_id
  ) then
    raise exception using errcode = '42501', message = 'Kaynak bu hesaba ait değil.';
  end if;

  select id into study_id
  from public.calisma_suresi
  where user_id = current_user_id and session_key = p_session_key;

  if study_id is not null then
    return study_id;
  end if;

  insert into public.calisma_suresi (
    user_id, ders_id, kaynak_id, tarih, sure_dakika, soru_sayisi, session_key
  ) values (
    current_user_id, p_ders_id, p_kaynak_id, p_study_date,
    p_work_minutes, 0, p_session_key
  )
  returning id into study_id;

  insert into public.pomodoro_kayitlari (
    user_id, calisma_suresi, mola_suresi, ders_id, tarih, session_key
  ) values (
    current_user_id, p_work_minutes, p_break_minutes, p_ders_id, now(), p_session_key
  )
  on conflict do nothing;

  return study_id;
end;
$$;

revoke all on function public.complete_pomodoro_session(text, integer, integer, uuid, uuid, date) from public, anon;
grant execute on function public.complete_pomodoro_session(text, integer, integer, uuid, uuid, date) to authenticated;

create index if not exists gunluk_gorevler_user_date_idx on public.gunluk_gorevler (user_id, tarih, baslangic_saat);
create index if not exists calisma_suresi_user_date_idx on public.calisma_suresi (user_id, tarih);
create index if not exists denemeler_user_date_idx on public.denemeler (user_id, tarih desc);
create index if not exists konu_takibi_user_status_idx on public.konu_takibi (user_id, durum);
create index if not exists tekrarlar_user_date_idx on public.tekrarlar (user_id, tekrar_tarihi, tamamlandi);

-- A child row may only reference a resource owned by the same user.
create unique index if not exists kaynaklarim_user_id_id_unique
  on public.kaynaklarim (user_id, id);

alter table public.gunluk_gorevler drop constraint if exists gunluk_gorevler_kaynak_id_fkey;
alter table public.gunluk_gorevler
  add constraint gunluk_gorevler_owned_resource_fkey
  foreign key (user_id, kaynak_id) references public.kaynaklarim (user_id, id)
  on delete set null (kaynak_id);

alter table public.yapamadiklari drop constraint if exists yapamadiklari_kaynak_id_fkey;
alter table public.yapamadiklari
  add constraint yapamadiklari_owned_resource_fkey
  foreign key (user_id, kaynak_id) references public.kaynaklarim (user_id, id)
  on delete set null (kaynak_id);

alter table public.calisma_suresi drop constraint if exists calisma_suresi_kaynak_id_fkey;
alter table public.calisma_suresi
  add constraint calisma_suresi_owned_resource_fkey
  foreign key (user_id, kaynak_id) references public.kaynaklarim (user_id, id)
  on delete set null (kaynak_id);
