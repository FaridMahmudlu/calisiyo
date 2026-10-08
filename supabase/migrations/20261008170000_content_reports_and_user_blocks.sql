-- User-generated content safety (Google Play / App Store UGC policy):
-- every student can report a classroom message, a classroom or a user, and
-- block another user. Admins review reports; blocks stop new friendship
-- requests and remove existing friendships in both directions.

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
revoke all on table public.user_blocks from public, anon, authenticated;
grant select on table public.user_blocks to authenticated;
drop policy if exists "Users read own blocks" on public.user_blocks;
create policy "Users read own blocks" on public.user_blocks
for select to authenticated
using ((select auth.uid()) = blocker_id);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('message', 'user', 'group')),
  target_user_id uuid references auth.users(id) on delete set null,
  group_id uuid references public.study_groups(id) on delete set null,
  message_id uuid references public.study_group_messages(id) on delete set null,
  target_key uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'violence', 'self_harm', 'impersonation', 'other')),
  details text check (char_length(details) <= 500),
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution_note text check (char_length(resolution_note) <= 500),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists content_reports_one_open_per_target
  on public.content_reports (reporter_id, target_type, target_key) where status = 'open';
create index if not exists content_reports_status_created_idx on public.content_reports (status, created_at desc);
create index if not exists content_reports_reporter_idx on public.content_reports (reporter_id);
create index if not exists content_reports_target_user_idx on public.content_reports (target_user_id);
create index if not exists content_reports_group_idx on public.content_reports (group_id);
create index if not exists content_reports_message_idx on public.content_reports (message_id);
create index if not exists content_reports_resolved_by_idx on public.content_reports (resolved_by);
alter table public.content_reports enable row level security;
revoke all on table public.content_reports from public, anon, authenticated;

create or replace function public.has_block_between(p_left uuid, p_right uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_left and blocked_id = p_right)
       or (blocker_id = p_right and blocked_id = p_left)
  );
$$;
revoke all on function public.has_block_between(uuid, uuid) from public, anon, authenticated;

-- Friend requests between blocked users are rejected no matter which RPC
-- creates them.
create or replace function public.reject_blocked_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.has_block_between(new.requester_id, new.addressee_id) then
    raise exception using errcode = '42501', message = 'Bu öğrenciyle arkadaşlık bağlantısı kurulamıyor.';
  end if;
  return new;
end;
$$;
revoke all on function public.reject_blocked_friendship() from public, anon, authenticated;
drop trigger if exists friendships_reject_blocked on public.friendships;
create trigger friendships_reject_blocked
before insert on public.friendships
for each row execute function public.reject_blocked_friendship();

create or replace function public.block_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  if p_user_id is null or p_user_id = actor or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = '22023', message = 'Bu kullanıcı engellenemez.';
  end if;
  insert into public.user_blocks (blocker_id, blocked_id) values (actor, p_user_id)
  on conflict do nothing;
  delete from public.friendships
  where (requester_id = actor and addressee_id = p_user_id)
     or (requester_id = p_user_id and addressee_id = actor);
  return jsonb_build_object('userId', p_user_id, 'blocked', true);
end;
$$;

create or replace function public.unblock_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;
  delete from public.user_blocks where blocker_id = actor and blocked_id = p_user_id;
  return jsonb_build_object('userId', p_user_id, 'blocked', false);
end;
$$;

create or replace function public.list_my_blocked_users()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', block.blocked_id,
    'name', coalesce(profile.full_name, 'Öğrenci'),
    'username', social.username,
    'blockedAt', block.created_at
  ) order by block.created_at desc), '[]'::jsonb)
  from public.user_blocks as block
  left join public.profiles as profile on profile.id = block.blocked_id
  left join public.social_profiles as social on social.user_id = block.blocked_id
  where block.blocker_id = (select auth.uid());
$$;

create or replace function public.report_content(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  clean_details text := nullif(left(trim(coalesce(p_details, '')), 500), '');
  target_user uuid;
  target_group uuid;
  target_message uuid;
  snapshot jsonb := '{}'::jsonb;
  created public.content_reports%rowtype;
  admin_row record;
begin
  if actor is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif bir oturum gerekli.';
  end if;
  if p_reason not in ('spam', 'harassment', 'hate', 'sexual', 'violence', 'self_harm', 'impersonation', 'other') then
    raise exception using errcode = '22023', message = 'Geçerli bir şikayet nedeni seç.';
  end if;
  if p_reason = 'other' and clean_details is null then
    raise exception using errcode = '22023', message = 'Lütfen şikayetini kısaca açıkla.';
  end if;
  if (select count(*) from public.content_reports where reporter_id = actor and created_at > now() - interval '1 day') >= 20 then
    raise exception using errcode = '54000', message = 'Bugün çok sayıda şikayet gönderdin. Lütfen daha sonra tekrar dene.';
  end if;

  if p_target_type = 'message' then
    select message.user_id, message.group_id, message.id,
      jsonb_build_object(
        'body', case when message.deleted_at is null then left(message.body, 1000) end,
        'messageType', message.message_type,
        'attachmentName', message.attachment_name,
        'sentAt', message.created_at,
        'senderName', profile.full_name,
        'groupName', grp.name
      )
    into target_user, target_group, target_message, snapshot
    from public.study_group_messages as message
    join public.study_groups as grp on grp.id = message.group_id
    left join public.profiles as profile on profile.id = message.user_id
    where message.id = p_target_id;
    if target_message is null or not public.is_study_group_member(target_group) then
      raise exception using errcode = 'P0002', message = 'Mesaj bulunamadı.';
    end if;
  elsif p_target_type = 'group' then
    select grp.owner_id, grp.id,
      jsonb_build_object('groupName', grp.name, 'description', grp.description, 'motto', grp.room_motto, 'ownerName', profile.full_name)
    into target_user, target_group, snapshot
    from public.study_groups as grp
    left join public.profiles as profile on profile.id = grp.owner_id
    where grp.id = p_target_id;
    if target_group is null or not public.is_study_group_member(target_group) then
      raise exception using errcode = 'P0002', message = 'Sınıf bulunamadı.';
    end if;
  elsif p_target_type = 'user' then
    select profile.id, jsonb_build_object('name', profile.full_name, 'username', social.username)
    into target_user, snapshot
    from public.profiles as profile
    left join public.social_profiles as social on social.user_id = profile.id
    where profile.id = p_target_id;
    if target_user is null then
      raise exception using errcode = 'P0002', message = 'Kullanıcı bulunamadı.';
    end if;
  else
    raise exception using errcode = '22023', message = 'Geçersiz şikayet türü.';
  end if;

  if target_user = actor then
    raise exception using errcode = '22023', message = 'Kendi içeriğini şikayet edemezsin.';
  end if;

  insert into public.content_reports (reporter_id, target_type, target_user_id, group_id, message_id, target_key, reason, details, evidence)
  values (actor, p_target_type, target_user, target_group, target_message, p_target_id, p_reason, clean_details, snapshot)
  returning * into created;

  insert into public.admin_live_events (event_type, user_id, payload)
  values ('content_reported', actor, jsonb_build_object('reportId', created.id, 'targetType', p_target_type, 'reason', p_reason));

  for admin_row in select user_id from public.user_roles loop
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (admin_row.user_id, 'warning', 'Yeni içerik şikayeti', 'İncelenmeyi bekleyen yeni bir şikayet var.', '/admin/sikayetler', 'content-report-' || created.id::text)
    on conflict (user_id, dedupe_key) do nothing;
  end loop;

  return jsonb_build_object('reportId', created.id, 'status', created.status);
exception when unique_violation then
  raise exception using errcode = '23505', message = 'Bu içerik için açık bir şikayetin zaten var; inceleniyor.';
end;
$$;

create or replace function public.admin_list_content_reports(p_status text default 'open', p_limit integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin('moderator');
  return coalesce((
    select jsonb_agg(item order by (item->>'createdAt') desc)
    from (
      select jsonb_build_object(
        'id', report.id,
        'targetType', report.target_type,
        'reason', report.reason,
        'details', report.details,
        'evidence', report.evidence,
        'status', report.status,
        'resolutionNote', report.resolution_note,
        'resolvedAt', report.resolved_at,
        'createdAt', report.created_at,
        'messageId', report.message_id,
        'messageDeleted', message.deleted_at is not null,
        'groupId', report.group_id,
        'targetUserId', report.target_user_id,
        'targetName', target.full_name,
        'reporterName', reporter.full_name,
        'resolverName', resolver.full_name,
        'openReportsAgainstTarget', (
          select count(*) from public.content_reports as other
          where other.status = 'open' and other.target_user_id = report.target_user_id
        )
      ) as item
      from public.content_reports as report
      left join public.study_group_messages as message on message.id = report.message_id
      left join public.profiles as target on target.id = report.target_user_id
      left join public.profiles as reporter on reporter.id = report.reporter_id
      left join public.profiles as resolver on resolver.id = report.resolved_by
      where p_status is null or report.status = p_status
      order by report.created_at desc
      limit least(greatest(coalesce(p_limit, 100), 1), 200)
    ) as rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_resolve_content_report(
  p_report_id uuid,
  p_decision text,
  p_note text default null,
  p_remove_message boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  clean_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
  target public.content_reports%rowtype;
  removed boolean := false;
begin
  perform public.assert_admin('admin');
  if p_decision not in ('resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'Geçersiz karar.';
  end if;
  select * into target from public.content_reports where id = p_report_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Şikayet bulunamadı.';
  end if;
  if target.status <> 'open' then
    raise exception using errcode = '22023', message = 'Bu şikayet zaten sonuçlandırıldı.';
  end if;

  if p_remove_message and p_decision = 'resolved' and target.message_id is not null then
    update public.study_group_messages
    set deleted_at = clock_timestamp(), deleted_by = actor, body = 'Moderasyon nedeniyle kaldırıldı',
        attachment_path = null, attachment_name = null, attachment_mime = null,
        attachment_size = null, metadata = '{}'::jsonb, edited_at = null
    where id = target.message_id and deleted_at is null;
    removed := found;
  end if;

  update public.content_reports
  set status = p_decision, resolution_note = clean_note, resolved_by = actor, resolved_at = now()
  where id = p_report_id;

  insert into public.admin_audit_log (actor_id, action, target_user_id, details)
  values (actor, 'content_report_resolved', target.target_user_id,
    jsonb_build_object('reportId', p_report_id, 'decision', p_decision, 'messageRemoved', removed, 'note', clean_note));

  if target.reporter_id is not null then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (target.reporter_id, 'info', 'Şikayetin incelendi',
      case when p_decision = 'resolved' then 'Bildirdiğin içerik incelendi ve gerekli işlem yapıldı. Teşekkürler.'
           else 'Bildirdiğin içerik incelendi; kurallarımızın ihlali tespit edilmedi.' end,
      '/dashboard', 'content-report-result-' || p_report_id::text)
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  return jsonb_build_object('reportId', p_report_id, 'status', p_decision, 'messageRemoved', removed);
end;
$$;

revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.list_my_blocked_users() from public, anon;
revoke all on function public.report_content(text, uuid, text, text) from public, anon;
revoke all on function public.admin_list_content_reports(text, integer) from public, anon;
revoke all on function public.admin_resolve_content_report(uuid, text, text, boolean) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.list_my_blocked_users() to authenticated;
grant execute on function public.report_content(text, uuid, text, text) to authenticated;
grant execute on function public.admin_list_content_reports(text, integer) to authenticated;
grant execute on function public.admin_resolve_content_report(uuid, text, text, boolean) to authenticated;
