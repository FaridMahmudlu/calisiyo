-- Shared classroom board and safe physical interactions.

begin;

alter table public.study_presence
  add column if not exists pose text not null default 'standing',
  add column if not exists seat_id text;

alter table public.study_presence drop constraint if exists study_presence_pose_valid;
alter table public.study_presence add constraint study_presence_pose_valid
  check (pose in ('standing', 'sitting'));
alter table public.study_presence drop constraint if exists study_presence_seat_valid;
alter table public.study_presence add constraint study_presence_seat_valid
  check (seat_id is null or seat_id in ('desk_1', 'desk_2', 'desk_3', 'desk_4'));

create unique index if not exists study_presence_one_user_per_seat_idx
  on public.study_presence (group_id, seat_id)
  where seat_id is not null;

alter table public.study_group_reactions drop constraint if exists study_group_reactions_reaction_check;
alter table public.study_group_reactions add constraint study_group_reactions_reaction_check
  check (reaction in ('hello','focus','coffee','clap','goal','wave','jump'));

create table if not exists public.study_group_boards (
  group_id uuid primary key references public.study_groups(id) on delete cascade,
  text_content text not null default '' check (char_length(text_content) <= 500),
  strokes jsonb not null default '[]'::jsonb check (jsonb_typeof(strokes) = 'array'),
  updated_by uuid references public.profiles(id) on delete set null,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.study_group_boards enable row level security;
revoke all on table public.study_group_boards from anon;
revoke insert, update, delete on table public.study_group_boards from authenticated;
grant select on table public.study_group_boards to authenticated;

drop policy if exists "Members read classroom board" on public.study_group_boards;
create policy "Members read classroom board"
on public.study_group_boards for select to authenticated
using (public.is_study_group_member(group_id));

create or replace function public.get_classroom_interaction_state(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  poses jsonb;
  board jsonb;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfa erişim yetkiniz yok.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', member.user_id,
    'pose', coalesce(presence.pose, 'standing'),
    'seatId', presence.seat_id
  )), '[]'::jsonb)
  into poses
  from public.study_group_members as member
  left join public.study_presence as presence
    on presence.group_id = member.group_id and presence.user_id = member.user_id
  where member.group_id = p_group_id;

  select jsonb_build_object(
    'text', item.text_content,
    'strokes', item.strokes,
    'version', item.version,
    'updatedAt', item.updated_at
  ) into board
  from public.study_group_boards as item
  where item.group_id = p_group_id;

  return jsonb_build_object(
    'poses', poses,
    'board', coalesce(board, jsonb_build_object('text', '', 'strokes', '[]'::jsonb, 'version', 0, 'updatedAt', null))
  );
end;
$$;

create or replace function public.set_classroom_pose(
  p_group_id uuid,
  p_pose text,
  p_seat_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  target_x numeric := 50;
  target_y numeric := 72;
  target_facing text := 'north';
  updated public.study_presence%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id, 'movement') then
    raise exception using errcode = '42501', message = 'Bu sınıfta hareket etme yetkin yok.';
  end if;
  if p_pose not in ('standing', 'sitting') then
    raise exception using errcode = '22023', message = 'Geçersiz karakter duruşu.';
  end if;
  if p_pose = 'sitting' and p_seat_id not in ('desk_1', 'desk_2', 'desk_3', 'desk_4') then
    raise exception using errcode = '22023', message = 'Geçersiz oturma alanı.';
  end if;

  if p_pose = 'sitting' then
    select seat.x, seat.y, seat.facing
    into target_x, target_y, target_facing
    from (values
      ('desk_1', 32::numeric, 52::numeric, 'north'::text),
      ('desk_2', 66::numeric, 53::numeric, 'north'::text),
      ('desk_3', 27::numeric, 83::numeric, 'north'::text),
      ('desk_4', 70::numeric, 81::numeric, 'north'::text)
    ) as seat(id, x, y, facing)
    where seat.id = p_seat_id;
  end if;

  insert into public.study_presence (
    group_id, user_id, status, position_x, position_y, facing, pose, seat_id, updated_at
  ) values (
    p_group_id, viewer, 'online', target_x, target_y, target_facing,
    p_pose, case when p_pose = 'sitting' then p_seat_id else null end, now()
  )
  on conflict (group_id, user_id) do update
  set position_x = case when p_pose = 'sitting' then excluded.position_x else public.study_presence.position_x end,
      position_y = case when p_pose = 'sitting' then excluded.position_y else public.study_presence.position_y end,
      facing = case when p_pose = 'sitting' then excluded.facing else public.study_presence.facing end,
      pose = p_pose,
      seat_id = case when p_pose = 'sitting' then p_seat_id else null end,
      updated_at = now()
  returning * into updated;

  return jsonb_build_object(
    'pose', updated.pose,
    'seatId', updated.seat_id,
    'x', updated.position_x,
    'y', updated.position_y,
    'facing', updated.facing
  );
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Bu sırada başka bir öğrenci oturuyor.';
end;
$$;

create or replace function public.move_in_classroom(
  p_group_id uuid,
  p_x numeric,
  p_y numeric,
  p_facing text default 'east'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  current_row public.study_presence%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id, 'movement') then
    raise exception using errcode = '42501', message = 'Bu sınıfta hareket etme yetkin yok.';
  end if;
  if p_x is null or p_y is null
    or p_x::text in ('NaN','Infinity','-Infinity') or p_y::text in ('NaN','Infinity','-Infinity')
    or p_x not between 4 and 96 or p_y not between 8 and 92 then
    raise exception using errcode = '22023', message = 'Sınıf konumu geçersiz.';
  end if;
  if p_facing not in ('south','south_west','west','north_west','north','north_east','east','south_east') then
    raise exception using errcode = '22023', message = 'Hareket yönü geçersiz.';
  end if;

  select * into current_row
  from public.study_presence
  where group_id = p_group_id and user_id = viewer;

  if current_row.last_move_at > clock_timestamp() - interval '180 milliseconds' then
    return jsonb_build_object('x', current_row.position_x, 'y', current_row.position_y, 'facing', current_row.facing, 'throttled', true);
  end if;

  insert into public.study_presence (
    group_id, user_id, status, position_x, position_y, facing, pose, seat_id, last_move_at, updated_at
  ) values (
    p_group_id, viewer, 'online', round(p_x, 2), round(p_y, 2), p_facing,
    'standing', null, clock_timestamp(), now()
  )
  on conflict (group_id, user_id) do update
  set position_x = excluded.position_x,
      position_y = excluded.position_y,
      facing = excluded.facing,
      pose = 'standing',
      seat_id = null,
      last_move_at = excluded.last_move_at,
      updated_at = now()
  returning * into current_row;

  return jsonb_build_object('x', current_row.position_x, 'y', current_row.position_y, 'facing', current_row.facing, 'throttled', false);
end;
$$;

create or replace function public.send_classroom_reaction(p_group_id uuid, p_reaction text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  created public.study_group_reactions%rowtype;
begin
  if viewer is null or not public.can_use_group_feature(p_group_id, 'reaction') then
    raise exception using errcode = '42501', message = 'Şu anda sınıfa tepki gönderemezsin.';
  end if;
  if p_reaction is null or not p_reaction = any(array['hello','focus','coffee','clap','goal','wave','jump']) then
    raise exception using errcode = '22023', message = 'Geçersiz sınıf tepkisi.';
  end if;
  if exists (
    select 1 from public.study_group_reactions
    where group_id = p_group_id and user_id = viewer
      and created_at > clock_timestamp() - interval '2 seconds'
  ) then
    raise exception using errcode = 'P0001', message = 'Yeni bir tepki göndermeden önce biraz bekle.';
  end if;
  insert into public.study_group_reactions (group_id, user_id, reaction)
  values (p_group_id, viewer, p_reaction)
  returning * into created;
  return jsonb_build_object('id', created.id, 'userId', created.user_id, 'reaction', created.reaction, 'createdAt', created.created_at);
end;
$$;

create or replace function public.save_classroom_board_text(p_group_id uuid, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  updated public.study_group_boards%rowtype;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfın tahtasını düzenleme yetkiniz yok.';
  end if;
  if char_length(coalesce(p_text, '')) > 500 then
    raise exception using errcode = '22023', message = 'Tahta metni en fazla 500 karakter olabilir.';
  end if;
  insert into public.study_group_boards (group_id, text_content, updated_by)
  values (p_group_id, trim(coalesce(p_text, '')), viewer)
  on conflict (group_id) do update
  set text_content = excluded.text_content,
      updated_by = viewer,
      version = public.study_group_boards.version + 1,
      updated_at = now()
  returning * into updated;
  return jsonb_build_object('text', updated.text_content, 'strokes', updated.strokes, 'version', updated.version, 'updatedAt', updated.updated_at);
end;
$$;

create or replace function public.append_classroom_board_stroke(p_group_id uuid, p_stroke jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  point jsonb;
  clean_stroke jsonb;
  updated public.study_group_boards%rowtype;
  color text := p_stroke ->> 'color';
  stroke_width integer;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfın tahtasına yazma yetkiniz yok.';
  end if;
  if jsonb_typeof(p_stroke) <> 'object'
    or jsonb_typeof(p_stroke -> 'points') <> 'array'
    or jsonb_array_length(p_stroke -> 'points') not between 2 and 180
    or color not in ('white', 'mint', 'yellow', 'coral')
    or jsonb_typeof(p_stroke -> 'width') <> 'number' then
    raise exception using errcode = '22023', message = 'Tahta çizgisi geçersiz.';
  end if;
  stroke_width := (p_stroke ->> 'width')::integer;
  if stroke_width not between 2 and 12 then
    raise exception using errcode = '22023', message = 'Tahta kalınlığı geçersiz.';
  end if;
  for point in select value from jsonb_array_elements(p_stroke -> 'points') loop
    if jsonb_typeof(point) <> 'object'
      or jsonb_typeof(point -> 'x') <> 'number'
      or jsonb_typeof(point -> 'y') <> 'number'
      or (point ->> 'x')::numeric not between 0 and 1000
      or (point ->> 'y')::numeric not between 0 and 560 then
      raise exception using errcode = '22023', message = 'Tahta çizim noktası geçersiz.';
    end if;
  end loop;

  clean_stroke := jsonb_build_object(
    'id', gen_random_uuid(), 'userId', viewer, 'color', color,
    'width', stroke_width, 'points', p_stroke -> 'points'
  );

  insert into public.study_group_boards (group_id, strokes, updated_by)
  values (p_group_id, jsonb_build_array(clean_stroke), viewer)
  on conflict (group_id) do update
  set strokes = (case
        when jsonb_array_length(public.study_group_boards.strokes) >= 120
          then public.study_group_boards.strokes - 0
        else public.study_group_boards.strokes
      end) || excluded.strokes,
      updated_by = viewer,
      version = public.study_group_boards.version + 1,
      updated_at = now()
  returning * into updated;
  return jsonb_build_object('text', updated.text_content, 'strokes', updated.strokes, 'version', updated.version, 'updatedAt', updated.updated_at);
end;
$$;

create or replace function public.undo_classroom_board_stroke(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  target_id text;
  updated public.study_group_boards%rowtype;
begin
  if viewer is null or not public.is_study_group_member(p_group_id) then
    raise exception using errcode = '42501', message = 'Bu sınıfın tahtasını düzenleme yetkiniz yok.';
  end if;
  select stroke.value ->> 'id' into target_id
  from public.study_group_boards as board,
       jsonb_array_elements(board.strokes) with ordinality as stroke(value, position)
  where board.group_id = p_group_id and stroke.value ->> 'userId' = viewer::text
  order by stroke.position desc limit 1;

  update public.study_group_boards as board
  set strokes = coalesce((
        select jsonb_agg(stroke.value order by stroke.position)
        from jsonb_array_elements(board.strokes) with ordinality as stroke(value, position)
        where stroke.value ->> 'id' <> target_id
      ), '[]'::jsonb),
      updated_by = viewer,
      version = board.version + 1,
      updated_at = now()
  where board.group_id = p_group_id and target_id is not null
  returning * into updated;

  return case when updated.group_id is null then null else jsonb_build_object('text', updated.text_content, 'strokes', updated.strokes, 'version', updated.version, 'updatedAt', updated.updated_at) end;
end;
$$;

create or replace function public.clear_classroom_board(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  updated public.study_group_boards%rowtype;
begin
  if viewer is null or not exists (
    select 1 from public.study_groups where id = p_group_id and owner_id = viewer and not is_archived
  ) then
    raise exception using errcode = '42501', message = 'Tahtanın tamamını yalnızca sınıf sahibi temizleyebilir.';
  end if;
  insert into public.study_group_boards (group_id, text_content, strokes, updated_by)
  values (p_group_id, '', '[]'::jsonb, viewer)
  on conflict (group_id) do update
  set text_content = '', strokes = '[]'::jsonb, updated_by = viewer,
      version = public.study_group_boards.version + 1, updated_at = now()
  returning * into updated;
  return jsonb_build_object('text', '', 'strokes', '[]'::jsonb, 'version', updated.version, 'updatedAt', updated.updated_at);
end;
$$;

revoke all on function public.get_classroom_interaction_state(uuid) from public, anon, authenticated;
revoke all on function public.set_classroom_pose(uuid, text, text) from public, anon, authenticated;
revoke all on function public.move_in_classroom(uuid, numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.send_classroom_reaction(uuid, text) from public, anon, authenticated;
revoke all on function public.save_classroom_board_text(uuid, text) from public, anon, authenticated;
revoke all on function public.append_classroom_board_stroke(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.undo_classroom_board_stroke(uuid) from public, anon, authenticated;
revoke all on function public.clear_classroom_board(uuid) from public, anon, authenticated;

grant execute on function public.get_classroom_interaction_state(uuid) to authenticated;
grant execute on function public.set_classroom_pose(uuid, text, text) to authenticated;
grant execute on function public.move_in_classroom(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.send_classroom_reaction(uuid, text) to authenticated;
grant execute on function public.save_classroom_board_text(uuid, text) to authenticated;
grant execute on function public.append_classroom_board_stroke(uuid, jsonb) to authenticated;
grant execute on function public.undo_classroom_board_stroke(uuid) to authenticated;
grant execute on function public.clear_classroom_board(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'study_group_boards'
  ) then
    alter publication supabase_realtime add table public.study_group_boards;
  end if;
end;
$$;

commit;
