-- Keep statutory payment and contract evidence after an account is deleted.
-- The auth identifier is detached so the former user can no longer be resolved
-- through application reads; RLS continues to deny rows with a null owner.

alter table public.billing_legal_acceptances
  drop constraint if exists billing_legal_acceptances_user_id_fkey;
alter table public.billing_legal_acceptances
  alter column user_id drop not null;
alter table public.billing_legal_acceptances
  add constraint billing_legal_acceptances_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.billing_events
  drop constraint if exists billing_events_user_id_fkey;
alter table public.billing_events
  alter column user_id drop not null;
alter table public.billing_events
  add constraint billing_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.billing_orders
  drop constraint if exists billing_orders_user_id_fkey;
alter table public.billing_orders
  alter column user_id drop not null;
alter table public.billing_orders
  add constraint billing_orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
