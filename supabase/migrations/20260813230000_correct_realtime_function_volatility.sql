-- These routines depend on current time and, for room payloads, call routines
-- that PostgreSQL classifies as volatile. Mark them accurately so the planner
-- never reuses a result inside a live dashboard statement.

alter function public.get_group_room(uuid) volatile;
alter function public.get_group_room_v3(uuid) volatile;
alter function public.get_live_streak() volatile;
