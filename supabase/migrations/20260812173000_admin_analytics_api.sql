-- Server-authoritative admin analytics and management RPCs.
-- Every entry point re-checks the caller's role; no service-role key is exposed to the browser.

create or replace function public.assert_admin(p_minimum_role text default 'moderator')
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_role text := public.current_admin_role();
  actor_rank integer;
  required_rank integer;
begin
  actor_rank := case actor_role
    when 'super_admin' then 3
    when 'admin' then 2
    when 'moderator' then 1
    else 0
  end;
  required_rank := case p_minimum_role
    when 'super_admin' then 3
    when 'admin' then 2
    else 1
  end;

  if (select auth.uid()) is null or actor_rank < required_rank then
    raise exception using errcode = '42501', message = 'Bu işlem için yönetici yetkisi gerekli.';
  end if;
  return actor_role;
end;
$$;

revoke all on function public.assert_admin(text) from public, anon, authenticated;

create or replace function public.admin_get_overview(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bounded_days integer := least(greatest(coalesce(p_days, 30), 7), 90);
  today_date date := (now() at time zone 'Europe/Istanbul')::date;
  period_start date;
  total_users integer;
  active_users integer;
  active_today integer;
  suspended_users integer;
  new_users integer;
  total_minutes bigint;
  total_questions bigint;
  total_exams integer;
  completed_tasks integer;
  all_tasks integer;
  retention_rate numeric;
  daily_series jsonb;
  module_usage jsonb;
begin
  perform public.assert_admin('moderator');
  period_start := today_date - (bounded_days - 1);

  select count(*)::integer,
    count(*) filter (where account_status = 'suspended')::integer,
    count(*) filter (where (created_at at time zone 'Europe/Istanbul')::date >= period_start)::integer
  into total_users, suspended_users, new_users
  from public.profiles;

  with activity as (
    select log.user_id, log.tarih as activity_date from public.calisma_suresi as log
    where log.tarih between period_start and today_date
    union
    select task.user_id, task.tarih from public.gunluk_gorevler as task
    where task.tamamlandi and task.tarih between period_start and today_date
    union
    select exam.user_id, exam.tarih from public.denemeler as exam
    where exam.tarih between period_start and today_date
    union
    select tracking.user_id, (tracking.updated_at at time zone 'Europe/Istanbul')::date
    from public.konu_takibi as tracking
    where tracking.durum = 'tamamlandi'
      and (tracking.updated_at at time zone 'Europe/Istanbul')::date between period_start and today_date
  ), per_user as (
    select user_id, count(distinct activity_date) as active_days
    from activity group by user_id
  )
  select count(*)::integer,
    count(*) filter (where active_days >= 2)::numeric
      / nullif(count(*), 0) * 100
  into active_users, retention_rate
  from per_user;

  with today_activity as (
    select user_id from public.calisma_suresi where tarih = today_date
    union select user_id from public.gunluk_gorevler where tarih = today_date and tamamlandi
    union select user_id from public.denemeler where tarih = today_date
  )
  select count(*)::integer into active_today from today_activity;

  select coalesce(sum(sure_dakika), 0)::bigint,
    coalesce(sum(soru_sayisi), 0)::bigint
  into total_minutes, total_questions
  from public.calisma_suresi
  where tarih between period_start and today_date;

  select count(*)::integer into total_exams
  from public.denemeler where tarih between period_start and today_date;

  select count(*) filter (where tamamlandi)::integer, count(*)::integer
  into completed_tasks, all_tasks
  from public.gunluk_gorevler
  where tarih between period_start and today_date;

  with days as (
    select generate_series(period_start, today_date, interval '1 day')::date as day
  ), study as (
    select tarih as day,
      count(distinct user_id)::integer as users,
      sum(sure_dakika)::bigint as minutes,
      sum(soru_sayisi)::bigint as questions
    from public.calisma_suresi
    where tarih between period_start and today_date
    group by tarih
  ), registrations as (
    select (created_at at time zone 'Europe/Istanbul')::date as day, count(*)::integer as users
    from public.profiles
    where (created_at at time zone 'Europe/Istanbul')::date between period_start and today_date
    group by 1
  ), exams as (
    select tarih as day, count(*)::integer as total
    from public.denemeler
    where tarih between period_start and today_date
    group by tarih
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', days.day,
    'activeUsers', coalesce(study.users, 0),
    'newUsers', coalesce(registrations.users, 0),
    'minutes', coalesce(study.minutes, 0),
    'questions', coalesce(study.questions, 0),
    'exams', coalesce(exams.total, 0)
  ) order by days.day), '[]'::jsonb)
  into daily_series
  from days
  left join study on study.day = days.day
  left join registrations on registrations.day = days.day
  left join exams on exams.day = days.day;

  select jsonb_build_object(
    'studySessions', (select count(*) from public.calisma_suresi where tarih between period_start and today_date),
    'tasksCompleted', completed_tasks,
    'examsAdded', total_exams,
    'reviewsCompleted', (
      select count(*) from public.tekrarlar
      where tamamlandi and tekrar_tarihi between period_start and today_date
    ),
    'topicsCompleted', (
      select count(*) from public.konu_takibi
      where durum = 'tamamlandi'
        and (updated_at at time zone 'Europe/Istanbul')::date between period_start and today_date
    ),
    'notesCreated', (
      select count(*) from public.notlar
      where (created_at at time zone 'Europe/Istanbul')::date between period_start and today_date
    ),
    'friendConnections', (
      select count(*) from public.friendships
      where status = 'accepted'
        and (responded_at at time zone 'Europe/Istanbul')::date between period_start and today_date
    ),
    'studyGroups', (
      select count(*) from public.study_groups
      where (created_at at time zone 'Europe/Istanbul')::date between period_start and today_date
    )
  ) into module_usage;

  return jsonb_build_object(
    'rangeDays', bounded_days,
    'generatedAt', now(),
    'totals', jsonb_build_object(
      'users', total_users,
      'activeUsers', coalesce(active_users, 0),
      'activeToday', coalesce(active_today, 0),
      'newUsers', new_users,
      'suspendedUsers', suspended_users,
      'studyMinutes', total_minutes,
      'questions', total_questions,
      'exams', total_exams,
      'taskCompletionRate', case when all_tasks = 0 then 0 else round(completed_tasks::numeric / all_tasks * 100, 1) end,
      'returningStudentRate', coalesce(round(retention_rate, 1), 0)
    ),
    'dailySeries', daily_series,
    'moduleUsage', module_usage
  );
end;
$$;

create or replace function public.admin_list_users(
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_page integer := greatest(coalesce(p_page, 1), 1);
  page_size integer := least(greatest(coalesce(p_page_size, 20), 5), 50);
  search_term text := nullif(trim(coalesce(p_search, '')), '');
  total_count integer;
  result_items jsonb;
begin
  perform public.assert_admin('moderator');

  select count(*)::integer into total_count
  from auth.users as auth_user
  left join public.profiles as profile on profile.id = auth_user.id
  where search_term is null
    or lower(coalesce(profile.full_name, '')) like '%' || lower(search_term) || '%'
    or lower(coalesce(auth_user.email, '')) like '%' || lower(search_term) || '%';

  with matching as (
    select auth_user.id,
      auth_user.email,
      auth_user.created_at,
      auth_user.last_sign_in_at,
      auth_user.email_confirmed_at,
      profile.full_name,
      profile.avatar_url,
      profile.alan_secimi,
      coalesce(profile.account_status, 'active') as account_status,
      profile.status_reason,
      profile.status_updated_at,
      role.role,
      coalesce(study.minutes, 0)::bigint as minutes,
      coalesce(study.questions, 0)::bigint as questions,
      coalesce(study.study_days, 0)::integer as study_days,
      coalesce(exams.total, 0)::integer as exams,
      coalesce(progress.xp, 0)::bigint as xp,
      coalesce(friends.total, 0)::integer as friends,
      coalesce(groups.total, 0)::integer as groups,
      coalesce(notes.total, 0)::integer as admin_notes
    from auth.users as auth_user
    left join public.profiles as profile on profile.id = auth_user.id
    left join public.user_roles as role on role.user_id = auth_user.id
    left join lateral (
      select sum(log.sure_dakika) as minutes,
        sum(log.soru_sayisi) as questions,
        count(distinct log.tarih) filter (where daily.day_minutes >= 30) as study_days
      from public.calisma_suresi as log
      left join lateral (
        select sum(day_log.sure_dakika) as day_minutes
        from public.calisma_suresi as day_log
        where day_log.user_id = auth_user.id and day_log.tarih = log.tarih
      ) as daily on true
      where log.user_id = auth_user.id
    ) as study on true
    left join lateral (select count(*) as total from public.denemeler where user_id = auth_user.id) as exams on true
    left join lateral (select sum(xp_amount) as xp from public.xp_events where user_id = auth_user.id) as progress on true
    left join lateral (
      select count(*) as total from public.friendships
      where status = 'accepted' and auth_user.id in (requester_id, addressee_id)
    ) as friends on true
    left join lateral (select count(*) as total from public.study_group_members where user_id = auth_user.id) as groups on true
    left join lateral (select count(*) as total from public.admin_user_notes where user_id = auth_user.id) as notes on true
    where search_term is null
      or lower(coalesce(profile.full_name, '')) like '%' || lower(search_term) || '%'
      or lower(coalesce(auth_user.email, '')) like '%' || lower(search_term) || '%'
    order by auth_user.created_at desc
    limit page_size offset (current_page - 1) * page_size
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', user_row.id,
    'email', user_row.email,
    'name', coalesce(user_row.full_name, split_part(coalesce(user_row.email, ''), '@', 1)),
    'avatarUrl', user_row.avatar_url,
    'field', user_row.alan_secimi,
    'status', user_row.account_status,
    'statusReason', user_row.status_reason,
    'statusUpdatedAt', user_row.status_updated_at,
    'role', user_row.role,
    'createdAt', user_row.created_at,
    'lastSignInAt', user_row.last_sign_in_at,
    'emailConfirmed', user_row.email_confirmed_at is not null,
    'studyMinutes', user_row.minutes,
    'questions', user_row.questions,
    'studyDays', user_row.study_days,
    'streak', public.study_streak_for_user(user_row.id),
    'exams', user_row.exams,
    'xp', user_row.xp,
    'level', public.xp_level_from_total(user_row.xp),
    'friends', user_row.friends,
    'groups', user_row.groups,
    'adminNotes', user_row.admin_notes
  ) order by user_row.created_at desc), '[]'::jsonb)
  into result_items
  from matching as user_row;

  return jsonb_build_object(
    'page', current_page,
    'pageSize', page_size,
    'total', total_count,
    'items', result_items
  );
end;
$$;

create or replace function public.admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  core jsonb;
  notes jsonb;
  recent_activity jsonb;
begin
  perform public.assert_admin('moderator');

  select jsonb_build_object(
    'id', auth_user.id,
    'email', auth_user.email,
    'name', profile.full_name,
    'field', profile.alan_secimi,
    'status', profile.account_status,
    'statusReason', profile.status_reason,
    'createdAt', auth_user.created_at,
    'lastSignInAt', auth_user.last_sign_in_at,
    'role', role.role,
    'progress', public.student_social_metrics(auth_user.id)
  ) into core
  from auth.users as auth_user
  join public.profiles as profile on profile.id = auth_user.id
  left join public.user_roles as role on role.user_id = auth_user.id
  where auth_user.id = p_user_id;

  if core is null then
    raise exception using errcode = 'P0002', message = 'Kullanıcı bulunamadı.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', note.id,
    'note', note.note,
    'authorName', author.full_name,
    'createdAt', note.created_at,
    'updatedAt', note.updated_at
  ) order by note.created_at desc), '[]'::jsonb)
  into notes
  from public.admin_user_notes as note
  left join public.profiles as author on author.id = note.author_id
  where note.user_id = p_user_id;

  with activity as (
    select 'study'::text as type, log.created_at,
      jsonb_build_object('minutes', log.sure_dakika, 'questions', log.soru_sayisi, 'date', log.tarih) as details
    from public.calisma_suresi as log where log.user_id = p_user_id
    union all
    select 'exam', exam.created_at,
      jsonb_build_object('examType', exam.sinav_turu, 'publisher', exam.yayin, 'date', exam.tarih)
    from public.denemeler as exam where exam.user_id = p_user_id
    union all
    select 'task', task.created_at,
      jsonb_build_object('completed', task.tamamlandi, 'topic', task.konu, 'date', task.tarih)
    from public.gunluk_gorevler as task where task.user_id = p_user_id
  )
  select coalesce(jsonb_agg(to_jsonb(recent) order by recent.created_at desc), '[]'::jsonb)
  into recent_activity
  from (
    select * from activity order by created_at desc limit 20
  ) as recent;

  return jsonb_build_object('user', core, 'notes', notes, 'recentActivity', recent_activity);
end;
$$;

create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
  target_role text;
  clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  actor_role := public.assert_admin('admin');
  if p_status not in ('active', 'suspended') then
    raise exception using errcode = '22023', message = 'Geçersiz hesap durumu.';
  end if;
  if p_user_id = actor and p_status = 'suspended' then
    raise exception using errcode = '42501', message = 'Kendi hesabını askıya alamazsın.';
  end if;
  if p_status = 'suspended' and clean_reason is null then
    raise exception using errcode = '22023', message = 'Askıya alma nedeni gerekli.';
  end if;
  if clean_reason is not null and char_length(clean_reason) > 240 then
    raise exception using errcode = '22023', message = 'Neden en fazla 240 karakter olabilir.';
  end if;

  select role into target_role from public.user_roles where user_id = p_user_id;
  if target_role is not null and actor_role <> 'super_admin' then
    raise exception using errcode = '42501', message = 'Yönetici hesaplarını yalnızca süper yönetici değiştirebilir.';
  end if;

  update public.profiles
  set account_status = p_status,
      status_reason = case when p_status = 'active' then null else clean_reason end,
      status_updated_at = now(),
      status_updated_by = actor
  where id = p_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Kullanıcı bulunamadı.';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_user_id, details)
  values (actor, 'user_status_changed', p_user_id, jsonb_build_object('status', p_status, 'reason', clean_reason));

  insert into public.admin_live_events (event_type, user_id, payload)
  values ('admin_user_status', p_user_id, jsonb_build_object('status', p_status));

  if p_status = 'active' then
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
    values (
      p_user_id,
      'info',
      'Hesabın yeniden etkin',
      'calisiyo hesabına erişimin yeniden açıldı.',
      '/dashboard',
      'account-reactivated-' || extract(epoch from now())::bigint::text
    );
  end if;

  return jsonb_build_object('userId', p_user_id, 'status', p_status, 'updatedAt', now());
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  perform public.assert_admin('super_admin');
  if p_user_id = actor then
    raise exception using errcode = '42501', message = 'Kendi yönetici rolünü değiştiremezsin.';
  end if;
  if p_role not in ('student', 'moderator', 'admin') then
    raise exception using errcode = '22023', message = 'Geçersiz yönetici rolü.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'Kullanıcı bulunamadı.';
  end if;

  if p_role = 'student' then
    delete from public.user_roles where user_id = p_user_id;
  else
    insert into public.user_roles (user_id, role, created_by)
    values (p_user_id, p_role, actor)
    on conflict (user_id) do update set role = excluded.role, created_by = actor, created_at = now();
  end if;

  insert into public.admin_audit_log (actor_id, action, target_user_id, details)
  values (actor, 'user_role_changed', p_user_id, jsonb_build_object('role', p_role));

  return jsonb_build_object('userId', p_user_id, 'role', p_role);
end;
$$;

create or replace function public.admin_add_user_note(p_user_id uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  clean_note text := trim(coalesce(p_note, ''));
  created public.admin_user_notes%rowtype;
begin
  perform public.assert_admin('admin');
  if char_length(clean_note) not between 2 and 1000 then
    raise exception using errcode = '22023', message = 'Not 2-1000 karakter olmalı.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'Kullanıcı bulunamadı.';
  end if;

  insert into public.admin_user_notes (user_id, author_id, note)
  values (p_user_id, actor, clean_note)
  returning * into created;

  insert into public.admin_audit_log (actor_id, action, target_user_id, details)
  values (actor, 'user_note_added', p_user_id, jsonb_build_object('noteId', created.id));

  return jsonb_build_object('id', created.id, 'createdAt', created.created_at);
end;
$$;

create or replace function public.admin_broadcast(
  p_title text,
  p_body text,
  p_action_url text default '/dashboard',
  p_audience text default 'all'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  announcement_id uuid;
  recipient_count integer;
begin
  perform public.assert_admin('admin');
  if char_length(trim(coalesce(p_title, ''))) not between 2 and 90 then
    raise exception using errcode = '22023', message = 'Başlık 2-90 karakter olmalı.';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 2 and 240 then
    raise exception using errcode = '22023', message = 'Mesaj 2-240 karakter olmalı.';
  end if;
  if p_action_url is not null and p_action_url not like '/%' then
    raise exception using errcode = '22023', message = 'Bağlantı uygulama içi bir yol olmalı.';
  end if;
  if p_audience not in ('all', 'active_students') then
    raise exception using errcode = '22023', message = 'Geçersiz hedef kitle.';
  end if;

  insert into public.admin_announcements (author_id, title, body, action_url, audience)
  values (actor, trim(p_title), trim(p_body), p_action_url, p_audience)
  returning id into announcement_id;

  insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
  select profile.id, 'info', trim(p_title), trim(p_body), p_action_url,
    'announcement-' || announcement_id::text
  from public.profiles as profile
  where profile.account_status = 'active'
    and profile.notifications_enabled
    and (p_audience = 'all' or not exists (
      select 1 from public.user_roles where user_id = profile.id
    ));
  get diagnostics recipient_count = row_count;

  insert into public.admin_audit_log (actor_id, action, details)
  values (actor, 'announcement_sent', jsonb_build_object(
    'announcementId', announcement_id,
    'audience', p_audience,
    'recipients', recipient_count
  ));

  return jsonb_build_object('id', announcement_id, 'recipients', recipient_count);
end;
$$;

create or replace function public.admin_get_live_events(p_limit integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.assert_admin('moderator');
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', event.id,
    'type', event.event_type,
    'userId', event.user_id,
    'userName', profile.full_name,
    'payload', event.payload,
    'createdAt', event.created_at
  ) order by event.created_at desc), '[]'::jsonb)
  into result
  from (
    select * from public.admin_live_events
    order by created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) as event
  left join public.profiles as profile on profile.id = event.user_id;
  return result;
end;
$$;

create or replace function public.admin_get_audit_log(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.assert_admin('admin');
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', audit.id,
    'action', audit.action,
    'actorName', actor.full_name,
    'targetName', target.full_name,
    'details', audit.details,
    'createdAt', audit.created_at
  ) order by audit.created_at desc), '[]'::jsonb)
  into result
  from (
    select * from public.admin_audit_log
    order by created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
  ) as audit
  left join public.profiles as actor on actor.id = audit.actor_id
  left join public.profiles as target on target.id = audit.target_user_id;
  return result;
end;
$$;

create or replace function public.capture_social_admin_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'friendships' then
    if tg_op = 'INSERT' then
      begin insert into public.admin_live_events (event_type, user_id, payload)
      values ('friend_request', new.requester_id, '{}'::jsonb); exception when others then null; end;
    elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
      begin insert into public.admin_live_events (event_type, user_id, payload)
      values ('friend_connected', new.requester_id, '{}'::jsonb); exception when others then null; end;
    end if;
  elsif tg_table_name = 'study_groups' and tg_op = 'INSERT' then
    begin insert into public.admin_live_events (event_type, user_id, payload)
    values ('study_group_created', new.owner_id, '{}'::jsonb); exception when others then null; end;
  end if;
  return new;
end;
$$;

revoke all on function public.admin_get_overview(integer) from public, anon, authenticated;
revoke all on function public.admin_list_users(text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_get_user_detail(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_user_status(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_add_user_note(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_broadcast(text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_get_live_events(integer) from public, anon, authenticated;
revoke all on function public.admin_get_audit_log(integer) from public, anon, authenticated;
revoke all on function public.capture_social_admin_activity() from public, anon, authenticated;

grant execute on function public.admin_get_overview(integer) to authenticated;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_add_user_note(uuid, text) to authenticated;
grant execute on function public.admin_broadcast(text, text, text, text) to authenticated;
grant execute on function public.admin_get_live_events(integer) to authenticated;
grant execute on function public.admin_get_audit_log(integer) to authenticated;

drop trigger if exists capture_friend_admin_activity on public.friendships;
create trigger capture_friend_admin_activity
after insert or update of status on public.friendships
for each row execute function public.capture_social_admin_activity();

drop trigger if exists capture_group_admin_activity on public.study_groups;
create trigger capture_group_admin_activity
after insert on public.study_groups
for each row execute function public.capture_social_admin_activity();
