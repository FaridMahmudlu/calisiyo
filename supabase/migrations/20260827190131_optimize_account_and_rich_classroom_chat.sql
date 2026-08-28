-- A single authenticated round-trip for the dashboard shell.  The individual
-- functions remain the source of truth; this only removes duplicated network
-- requests and the old full-history downloads from /api/account.
create or replace function public.get_account_bootstrap()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;

  return jsonb_build_object(
    'progress', public.get_my_progress(),
    'adminRole', public.current_admin_role(),
    'liveStreak', public.get_live_streak(),
    'currentPlan', public.current_plan_details(),
    'contentProducer', public.current_content_producer_summary()
  );
end;
$$;

revoke all on function public.get_account_bootstrap() from public, anon, authenticated;
grant execute on function public.get_account_bootstrap() to authenticated;

-- Rich classroom messages keep historical text rows intact.  Attachments live
-- in a private Storage bucket and only a signed-in member of the same room can
-- read them.
alter table public.study_group_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists edited_at timestamptz,
  add column if not exists reply_to_id uuid references public.study_group_messages(id) on delete set null;

alter table public.study_group_messages
  drop constraint if exists study_group_messages_body_check;
alter table public.study_group_messages
  drop constraint if exists study_group_messages_type_check;
alter table public.study_group_messages
  add constraint study_group_messages_type_check check (
    message_type in ('text', 'image', 'file', 'audio', 'resource', 'profile_card')
  );
alter table public.study_group_messages
  drop constraint if exists study_group_messages_content_check;
alter table public.study_group_messages
  add constraint study_group_messages_content_check check (
    char_length(body) <= 1000
    and (message_type <> 'text' or char_length(trim(body)) between 1 and 1000)
    and (
      deleted_at is not null
      or (message_type in ('image', 'file', 'audio') and attachment_path is not null)
      or (message_type not in ('image', 'file', 'audio') and attachment_path is null)
    )
    and jsonb_typeof(metadata) = 'object'
    and (attachment_size is null or attachment_size between 1 and 20971520)
  );

create index if not exists study_group_messages_reply_idx
  on public.study_group_messages (reply_to_id)
  where reply_to_id is not null;

create table if not exists public.study_group_message_reads (
  message_id uuid not null references public.study_group_messages(id) on delete cascade,
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists study_group_message_reads_group_idx
  on public.study_group_message_reads (group_id, read_at desc);
create index if not exists study_group_message_reads_user_idx
  on public.study_group_message_reads (user_id, read_at desc);

alter table public.study_group_message_reads enable row level security;
revoke all on table public.study_group_message_reads from anon;
revoke insert, update, delete on table public.study_group_message_reads from authenticated;
grant select on table public.study_group_message_reads to authenticated;

drop policy if exists "Members read classroom message receipts" on public.study_group_message_reads;
create policy "Members read classroom message receipts"
on public.study_group_message_reads
for select to authenticated
using (public.is_study_group_member(group_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'classroom-attachments',
  'classroom-attachments',
  false,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/wav',
    'application/pdf', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.classroom_attachment_group_id(p_name text)
returns uuid
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(p_name))[1])::uuid
    else null
  end;
$$;

revoke all on function public.classroom_attachment_group_id(text) from public, anon, authenticated;
grant execute on function public.classroom_attachment_group_id(text) to authenticated;

drop policy if exists "Classroom members read attachments" on storage.objects;
create policy "Classroom members read attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'classroom-attachments'
  and public.is_study_group_member(public.classroom_attachment_group_id(name))
);

drop policy if exists "Classroom members upload own attachments" on storage.objects;
create policy "Classroom members upload own attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'classroom-attachments'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and public.is_study_group_member(public.classroom_attachment_group_id(name))
);

drop policy if exists "Classroom members delete own attachments" on storage.objects;
create policy "Classroom members delete own attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'classroom-attachments'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and public.is_study_group_member(public.classroom_attachment_group_id(name))
);

create or replace function public.send_classroom_message_v2(
  p_group_id uuid,
  p_body text default '',
  p_message_type text default 'text',
  p_attachment_path text default null,
  p_attachment_name text default null,
  p_attachment_mime text default null,
  p_attachment_size bigint default null,
  p_reply_to_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  clean_body text := trim(coalesce(p_body, ''));
  clean_type text := lower(trim(coalesce(p_message_type, 'text')));
  clean_path text := nullif(trim(coalesce(p_attachment_path, '')), '');
  clean_name text := nullif(trim(coalesce(p_attachment_name, '')), '');
  clean_mime text := lower(nullif(trim(coalesce(p_attachment_mime, '')), ''));
  uploaded storage.objects%rowtype;
  created public.study_group_messages%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id, 'chat') then
    raise exception using errcode = '42501', message = 'Şu anda sınıf sohbetine mesaj gönderemezsin.';
  end if;
  if clean_type not in ('text', 'image', 'file', 'audio') then
    raise exception using errcode = '22023', message = 'Bu mesaj türü desteklenmiyor.';
  end if;
  if char_length(clean_body) > 1000 or (clean_type = 'text' and char_length(clean_body) < 1) then
    raise exception using errcode = '22023', message = 'Mesaj 1-1000 karakter olmalı.';
  end if;
  if p_reply_to_id is not null and not exists (
    select 1 from public.study_group_messages
    where id = p_reply_to_id and group_id = p_group_id and deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'Yanıtlanan mesaj artık kullanılamıyor.';
  end if;
  if exists (
    select 1 from public.study_group_messages
    where group_id = p_group_id and user_id = viewer
      and created_at > clock_timestamp() - interval '700 milliseconds'
  ) then
    raise exception using errcode = 'P0001', message = 'Yeni bir mesaj göndermeden önce biraz bekle.';
  end if;

  if clean_type in ('image', 'file', 'audio') then
    if clean_path is null or p_attachment_size is null or p_attachment_size not between 1 and 20971520 then
      raise exception using errcode = '22023', message = 'Dosya bilgileri geçerli değil.';
    end if;
    if public.classroom_attachment_group_id(clean_path) is distinct from p_group_id
       or (storage.foldername(clean_path))[2] is distinct from viewer::text then
      raise exception using errcode = '42501', message = 'Bu dosya bu sınıfa veya hesaba ait değil.';
    end if;
    select * into uploaded
    from storage.objects
    where bucket_id = 'classroom-attachments' and name = clean_path;
    if not found then
      raise exception using errcode = 'P0002', message = 'Yüklenen dosya bulunamadı.';
    end if;
    if coalesce((uploaded.metadata ->> 'size')::bigint, p_attachment_size) <> p_attachment_size
       or lower(coalesce(uploaded.metadata ->> 'mimetype', clean_mime, '')) <> coalesce(clean_mime, '') then
      raise exception using errcode = '22023', message = 'Dosya doğrulaması tamamlanamadı.';
    end if;
    if clean_type = 'image' and clean_mime not like 'image/%' then
      raise exception using errcode = '22023', message = 'Görsel dosyası seçmelisin.';
    end if;
    if clean_type = 'audio' and clean_mime not like 'audio/%' then
      raise exception using errcode = '22023', message = 'Ses dosyası seçmelisin.';
    end if;
  elsif clean_path is not null then
    raise exception using errcode = '22023', message = 'Metin mesajına dosya eklenemez.';
  end if;

  insert into public.study_group_messages (
    group_id, user_id, body, message_type, attachment_path,
    attachment_name, attachment_mime, attachment_size, reply_to_id
  ) values (
    p_group_id, viewer, clean_body, clean_type, clean_path,
    left(clean_name, 180), clean_mime, p_attachment_size, p_reply_to_id
  ) returning * into created;

  return jsonb_build_object(
    'id', created.id, 'groupId', created.group_id, 'userId', created.user_id,
    'body', created.body, 'messageType', created.message_type,
    'attachmentPath', created.attachment_path, 'attachmentName', created.attachment_name,
    'attachmentMime', created.attachment_mime, 'attachmentSize', created.attachment_size,
    'replyToId', created.reply_to_id, 'createdAt', created.created_at
  );
end;
$$;

create or replace function public.edit_classroom_message(p_message_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  clean_body text := trim(coalesce(p_body, ''));
  target public.study_group_messages%rowtype;
begin
  select * into target from public.study_group_messages where id = p_message_id for update;
  if not found or target.user_id <> viewer or target.deleted_at is not null
     or not public.is_study_group_member(target.group_id) then
    raise exception using errcode = '42501', message = 'Bu mesajı düzenleyemezsin.';
  end if;
  if char_length(clean_body) > 1000 or (target.message_type = 'text' and char_length(clean_body) < 1) then
    raise exception using errcode = '22023', message = 'Mesaj 1-1000 karakter olmalı.';
  end if;
  update public.study_group_messages
  set body = clean_body, edited_at = clock_timestamp()
  where id = p_message_id
  returning * into target;
  return jsonb_build_object('id', target.id, 'body', target.body, 'editedAt', target.edited_at);
end;
$$;

create or replace function public.delete_classroom_message(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  target public.study_group_messages%rowtype;
begin
  select * into target from public.study_group_messages where id = p_message_id for update;
  if not found or not public.is_study_group_member(target.group_id) then
    raise exception using errcode = '42501', message = 'Bu mesajı silemezsin.';
  end if;
  if target.user_id <> viewer and not exists (
    select 1 from public.study_groups where id = target.group_id and owner_id = viewer
  ) then
    raise exception using errcode = '42501', message = 'Bu mesajı yalnızca yazan kişi veya sınıf sahibi silebilir.';
  end if;
  update public.study_group_messages
  set deleted_at = clock_timestamp(), deleted_by = viewer, body = 'Silinen mesaj',
      attachment_path = null, attachment_name = null, attachment_mime = null,
      attachment_size = null, metadata = '{}'::jsonb, edited_at = null
  where id = p_message_id;
  return true;
end;
$$;

create or replace function public.mark_classroom_messages_read(p_group_id uuid, p_message_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  affected integer;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişimin yok.';
  end if;
  if coalesce(cardinality(p_message_ids), 0) > 100 then
    raise exception using errcode = '22023', message = 'Aynı anda en fazla 100 mesaj işaretlenebilir.';
  end if;
  insert into public.study_group_message_reads (message_id, group_id, user_id, read_at)
  select message.id, message.group_id, viewer, clock_timestamp()
  from public.study_group_messages as message
  where message.group_id = p_group_id
    and message.id = any(coalesce(p_message_ids, '{}'::uuid[]))
    and message.user_id <> viewer
  on conflict (message_id, user_id) do update set read_at = excluded.read_at;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.share_classroom_profile_card(
  p_group_id uuid,
  p_share_weekly_minutes boolean default true,
  p_share_questions boolean default true,
  p_share_streak boolean default true,
  p_share_level boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  week_start date := date_trunc('week', now() at time zone 'Europe/Istanbul')::date;
  profile_row public.profiles%rowtype;
  activity jsonb;
  progress jsonb;
  streak jsonb;
  card jsonb;
  created public.study_group_messages%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id, 'chat') then
    raise exception using errcode = '42501', message = 'Şu anda sınıfta paylaşım yapamazsın.';
  end if;
  if not (p_share_weekly_minutes or p_share_questions or p_share_streak or p_share_level) then
    raise exception using errcode = '22023', message = 'Paylaşmak için en az bir bilgi seçmelisin.';
  end if;
  select * into profile_row from public.profiles where id = viewer;
  activity := public.get_my_study_time_statistics(week_start);
  progress := public.get_my_progress();
  streak := public.get_live_streak();
  card := jsonb_strip_nulls(jsonb_build_object(
    'displayName', profile_row.full_name,
    'field', profile_row.alan_secimi,
    'weeklyMinutes', case when p_share_weekly_minutes then activity -> 'studyMinutes' else null end,
    'weeklyQuestions', case when p_share_questions then activity -> 'questions' else null end,
    'streak', case when p_share_streak then streak -> 'streak' else null end,
    'level', case when p_share_level then progress -> 'level' else null end,
    'levelTitle', case when p_share_level then progress -> 'title' else null end,
    'sharedAt', clock_timestamp()
  ));
  insert into public.study_group_messages (group_id, user_id, body, message_type, metadata)
  values (p_group_id, viewer, 'Çalışma kartını paylaştı', 'profile_card', card)
  returning * into created;
  return jsonb_build_object('id', created.id, 'createdAt', created.created_at);
end;
$$;

create or replace function public.get_classroom_shareable_resources(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  result jsonb;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişimin yok.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', own.id,
    'title', coalesce(system.ad, own.custom_ad, 'İsimsiz kaynak'),
    'publisher', coalesce(system.yayin, own.custom_yayin, 'Kişisel kaynak'),
    'examType', coalesce(system.sinav_turu, own.custom_sinav_turu),
    'resourceKind', coalesce(own.resource_kind, system.kitap_turu, own.custom_kitap_turu),
    'sourceUrl', own.source_url,
    'durationMinutes', own.duration_minutes,
    'itemCount', own.item_count
  ) order by own.created_at desc), '[]'::jsonb)
  into result
  from (
    select * from public.kaynaklarim
    where user_id = viewer
    order by created_at desc
    limit 30
  ) as own
  left join public.kaynaklar_sistem as system on system.id = own.kaynak_sistem_id;
  return result;
end;
$$;

create or replace function public.share_classroom_resource(p_group_id uuid, p_resource_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  card jsonb;
  created public.study_group_messages%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id, 'chat') then
    raise exception using errcode = '42501', message = 'Şu anda sınıfta paylaşım yapamazsın.';
  end if;
  select jsonb_strip_nulls(jsonb_build_object(
    'resourceId', own.id,
    'title', coalesce(system.ad, own.custom_ad, 'İsimsiz kaynak'),
    'publisher', coalesce(system.yayin, own.custom_yayin, 'Kişisel kaynak'),
    'examType', coalesce(system.sinav_turu, own.custom_sinav_turu),
    'resourceKind', coalesce(own.resource_kind, system.kitap_turu, own.custom_kitap_turu),
    'sourceUrl', own.source_url,
    'durationMinutes', own.duration_minutes,
    'itemCount', own.item_count
  )) into card
  from public.kaynaklarim as own
  left join public.kaynaklar_sistem as system on system.id = own.kaynak_sistem_id
  where own.id = p_resource_id and own.user_id = viewer;
  if card is null then
    raise exception using errcode = '42501', message = 'Bu kaynak hesabına ait değil.';
  end if;
  insert into public.study_group_messages (group_id, user_id, body, message_type, metadata)
  values (p_group_id, viewer, 'Bir çalışma kaynağı paylaştı', 'resource', card)
  returning * into created;
  return jsonb_build_object('id', created.id, 'createdAt', created.created_at);
end;
$$;

create or replace function public.get_group_messages_v2(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  result jsonb;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişimin yok.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', message.id,
    'groupId', message.group_id,
    'userId', message.user_id,
    'name', profile.full_name,
    'body', message.body,
    'messageType', message.message_type,
    'attachmentPath', case when message.deleted_at is null then message.attachment_path else null end,
    'attachmentName', case when message.deleted_at is null then message.attachment_name else null end,
    'attachmentMime', case when message.deleted_at is null then message.attachment_mime else null end,
    'attachmentSize', case when message.deleted_at is null then message.attachment_size else null end,
    'metadata', case when message.deleted_at is null then message.metadata else '{}'::jsonb end,
    'replyToId', message.reply_to_id,
    'editedAt', message.edited_at,
    'deletedAt', message.deleted_at,
    'createdAt', message.created_at,
    'readBy', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', receipt.user_id, 'name', reader.full_name, 'readAt', receipt.read_at
      ) order by receipt.read_at)
      from public.study_group_message_reads as receipt
      join public.profiles as reader on reader.id = receipt.user_id
      where receipt.message_id = message.id
    ), '[]'::jsonb)
  ) order by message.created_at), '[]'::jsonb)
  into result
  from (
    select * from public.study_group_messages
    where group_id = p_group_id
    order by created_at desc
    limit 100
  ) as message
  join public.profiles as profile on profile.id = message.user_id;
  return result;
end;
$$;

create or replace function public.get_group_room_v4(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  base jsonb;
begin
  base := public.get_group_room_v3(p_group_id);
  return jsonb_set(base, '{messages}', public.get_group_messages_v2(p_group_id));
end;
$$;

revoke all on function public.send_classroom_message_v2(uuid,text,text,text,text,text,bigint,uuid) from public, anon, authenticated;
revoke all on function public.edit_classroom_message(uuid,text) from public, anon, authenticated;
revoke all on function public.delete_classroom_message(uuid) from public, anon, authenticated;
revoke all on function public.mark_classroom_messages_read(uuid,uuid[]) from public, anon, authenticated;
revoke all on function public.share_classroom_profile_card(uuid,boolean,boolean,boolean,boolean) from public, anon, authenticated;
revoke all on function public.get_classroom_shareable_resources(uuid) from public, anon, authenticated;
revoke all on function public.share_classroom_resource(uuid,uuid) from public, anon, authenticated;
revoke all on function public.get_group_messages_v2(uuid) from public, anon, authenticated;
revoke all on function public.get_group_room_v4(uuid) from public, anon, authenticated;

grant execute on function public.send_classroom_message_v2(uuid,text,text,text,text,text,bigint,uuid) to authenticated;
grant execute on function public.edit_classroom_message(uuid,text) to authenticated;
grant execute on function public.delete_classroom_message(uuid) to authenticated;
grant execute on function public.mark_classroom_messages_read(uuid,uuid[]) to authenticated;
grant execute on function public.share_classroom_profile_card(uuid,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.get_classroom_shareable_resources(uuid) to authenticated;
grant execute on function public.share_classroom_resource(uuid,uuid) to authenticated;
grant execute on function public.get_group_messages_v2(uuid) to authenticated;
grant execute on function public.get_group_room_v4(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_group_message_reads'
  ) then
    alter publication supabase_realtime add table public.study_group_message_reads;
  end if;
end;
$$;
