create index if not exists content_producer_profiles_activated_by_idx
  on public.content_producer_profiles (activated_by);
create index if not exists content_producer_profiles_suspended_by_idx
  on public.content_producer_profiles (suspended_by);

create index if not exists content_producer_access_grants_producer_idx
  on public.content_producer_access_grants (producer_id);
create index if not exists content_producer_access_grants_user_idx
  on public.content_producer_access_grants (user_id);
create index if not exists content_producer_access_grants_created_by_idx
  on public.content_producer_access_grants (created_by);
create index if not exists content_producer_access_grants_revoked_by_idx
  on public.content_producer_access_grants (revoked_by);

create index if not exists content_producer_codes_producer_idx
  on public.content_producer_codes (producer_id);
create index if not exists content_producer_codes_created_by_idx
  on public.content_producer_codes (created_by);

create index if not exists content_producer_bindings_code_idx
  on public.content_producer_code_bindings (code_id);
create index if not exists content_producer_bindings_verified_by_idx
  on public.content_producer_code_bindings (verified_by);

create index if not exists content_producer_rewards_producer_idx
  on public.content_producer_rewards (producer_id);
create index if not exists content_producer_rewards_payout_idx
  on public.content_producer_rewards (payout_id);

create index if not exists content_producer_adjustments_producer_idx
  on public.content_producer_adjustments (producer_id);
create index if not exists content_producer_adjustments_reward_idx
  on public.content_producer_adjustments (reward_id);
create index if not exists content_producer_adjustments_order_idx
  on public.content_producer_adjustments (order_id);
create index if not exists content_producer_adjustments_created_by_idx
  on public.content_producer_adjustments (created_by);

create index if not exists content_producer_payouts_created_by_idx
  on public.content_producer_payouts (created_by);
create index if not exists content_producer_payouts_paid_by_idx
  on public.content_producer_payouts (paid_by);
create index if not exists content_producer_payout_items_payout_idx
  on public.content_producer_payout_items (payout_id);

create index if not exists billing_orders_content_producer_idx
  on public.billing_orders (content_producer_id);
