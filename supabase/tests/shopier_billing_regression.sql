-- Transactional Shopier billing regression. Every mutation rolls back.
begin;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users where email = 'claude.test@calisiyo.app' limit 1),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select id::text from auth.users where email = 'claude.test@calisiyo.app' limit 1),
    'role', 'service_role'
  )::text,
  true
);

do $$
declare
  viewer uuid := (select auth.uid());
  viewer_email text;
  order_number text := 'CAL-19990101-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  second_order_number text := 'CAL-19990102-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  created jsonb;
  second_created jsonb;
  confirmed jsonb;
  duplicate_confirm jsonb;
  first_claim jsonb;
  second_claim jsonb;
  failed_refund jsonb;
  successful_refund jsonb;
  duplicate_refund jsonb;
  start_at timestamptz;
  end_at timestamptz;
  subscription_end timestamptz;
  rejected boolean := false;
begin
  if viewer is null then raise exception 'Dedicated QA account was not found'; end if;
  select lower(btrim(email)) into viewer_email from auth.users where id = viewer;

  delete from public.user_subscriptions where user_id = viewer;

  select period_start, period_end into start_at, end_at
  from public.calculate_purchased_access_period(viewer, 'plus_2027', timestamptz '2026-08-20 12:00:00+03');
  if end_at <> timestamptz '2027-08-19 23:59:59+03' then
    raise exception 'plus_2027 no longer uses the configured YKS cutoff';
  end if;

  select period_start, period_end into start_at, end_at
  from public.calculate_purchased_access_period(viewer, 'plus_2028', timestamptz '2026-08-20 12:00:00+03');
  if end_at <> timestamptz '2027-02-20 12:00:00+03' then
    raise exception 'plus_2028 is not exactly six calendar months';
  end if;

  insert into public.user_subscriptions(
    user_id, plan_code, status, current_period_start, current_period_end,
    cancel_at_period_end, trial_started_at, trial_ends_at
  ) values (
    viewer, 'plus_2027', 'trialing', now(), now() + interval '7 days',
    true, now(), now() + interval '7 days'
  );

  created := public.create_shopier_billing_order(
    viewer, order_number, 'plus_2027', 'yks_2027', 'qa_product_2027',
    'https://www.shopier.com/50041880',
    '{"on_bilgilendirme":"qa","mesafeli_satis":"qa","iptal_iade":"qa","kvkk":"qa"}'::jsonb,
    repeat('a', 64), true, true
  );
  if created->>'status' <> 'payment_link_ready' then raise exception 'Shopier order was not created pending'; end if;

  confirmed := public.provider_confirm_billing_order(
    (created->>'id')::uuid,
    'shopier:qa_order_2027',
    jsonb_build_object(
      'provider', 'shopier', 'providerOrderId', 'qa_order_2027',
      'productId', 'qa_product_2027', 'customerEmail', viewer_email,
      'currency', 'TRY', 'paymentStatus', 'paid', 'amount', '2000.00', 'quantity', 1
    )
  );
  if confirmed->>'status' <> 'approved' then raise exception 'Valid Shopier payment was not approved'; end if;
  if exists (
    select 1 from public.user_subscriptions
    where user_id = viewer and (status <> 'active' or trial_started_at is not null or trial_ends_at is not null)
  ) then raise exception 'Trial was not replaced cleanly by paid access'; end if;
  select current_period_end into subscription_end from public.user_subscriptions where user_id = viewer;

  duplicate_confirm := public.provider_confirm_billing_order(
    (created->>'id')::uuid,
    'shopier:qa_order_2027',
    jsonb_build_object(
      'provider', 'shopier', 'providerOrderId', 'qa_order_2027',
      'productId', 'qa_product_2027', 'customerEmail', viewer_email,
      'currency', 'TRY', 'paymentStatus', 'paid', 'amount', '2000.00', 'quantity', 1
    )
  );
  if not coalesce((duplicate_confirm->>'alreadyProcessed')::boolean, false)
     or (select current_period_end from public.user_subscriptions where user_id = viewer) <> subscription_end then
    raise exception 'Duplicate provider confirmation extended access';
  end if;

  second_created := public.create_shopier_billing_order(
    viewer, second_order_number, 'plus_2027', 'yks_2027', 'qa_product_2027',
    'https://www.shopier.com/50041880',
    '{"on_bilgilendirme":"qa","mesafeli_satis":"qa","iptal_iade":"qa","kvkk":"qa"}'::jsonb,
    repeat('b', 64), true, true
  );
  begin
    perform public.provider_confirm_billing_order(
      (second_created->>'id')::uuid,
      'shopier:qa_order_2027',
      jsonb_build_object(
        'provider', 'shopier', 'providerOrderId', 'qa_order_2027',
        'productId', 'qa_product_2027', 'customerEmail', viewer_email,
        'currency', 'TRY', 'paymentStatus', 'paid', 'amount', '2000.00', 'quantity', 1
      )
    );
  exception when unique_violation then rejected := true;
  end;
  if not rejected then raise exception 'One Shopier order activated two internal orders'; end if;

  first_claim := public.claim_shopier_webhook_event(
    'qa_event_' || replace(gen_random_uuid()::text, '-', ''), 'order.created',
    'qa_order_event', 'qa_account', now(), '{"resourceId":"qa_order_event"}'::jsonb
  );
  second_claim := public.claim_shopier_webhook_event(
    (select provider_event_id from public.billing_provider_events where id = (first_claim->>'id')::uuid),
    'order.created', 'qa_order_event', 'qa_account', now(), '{"resourceId":"qa_order_event"}'::jsonb
  );
  if not coalesce((first_claim->>'claimed')::boolean, false)
     or coalesce((second_claim->>'claimed')::boolean, true) then
    raise exception 'Duplicate webhook event was claimed twice';
  end if;

  rejected := false;
  begin
    perform public.reconcile_shopier_refund(
      (created->>'id')::uuid, 'qa_refund_oversized', 'partial', 'succeeded', 2000.01, 'TRY'
    );
  exception when invalid_parameter_value then rejected := true;
  end;
  if not rejected then raise exception 'Oversized partial refund was accepted'; end if;

  failed_refund := public.reconcile_shopier_refund(
    (created->>'id')::uuid, 'qa_refund_1', 'full', 'failed', 2000, 'TRY'
  );
  if failed_refund->>'status' <> 'approved'
     or (select current_period_end from public.user_subscriptions where user_id = viewer) <> subscription_end then
    raise exception 'Failed refund changed paid access';
  end if;

  successful_refund := public.reconcile_shopier_refund(
    (created->>'id')::uuid, 'qa_refund_1', 'full', 'succeeded', 2000, 'TRY'
  );
  duplicate_refund := public.reconcile_shopier_refund(
    (created->>'id')::uuid, 'qa_refund_1', 'full', 'succeeded', 2000, 'TRY'
  );
  if successful_refund->>'status' <> 'refunded'
     or not coalesce((successful_refund->>'requiresReview')::boolean, false)
     or not coalesce((duplicate_refund->>'alreadyProcessed')::boolean, false)
     or (select current_period_end from public.user_subscriptions where user_id = viewer) <> subscription_end then
    raise exception 'Full refund reconciliation was destructive or not idempotent';
  end if;
end;
$$;

rollback;
