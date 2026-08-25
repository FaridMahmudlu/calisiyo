-- Transactional producer-program regression. Every mutation rolls back.
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
  admin_id uuid := (select auth.uid());
  producer_user_id uuid;
  admin_email text;
  producer_email text;
  activation jsonb;
  rotation jsonb;
  order_row jsonb;
  self_order jsonb;
  confirmation jsonb;
  duplicate_confirmation jsonb;
  payout jsonb;
  code_value text;
  new_code_value text;
  reward_row_id uuid;
  payout_rejected boolean := false;
begin
  if admin_id is null then raise exception 'Dedicated QA account was not found'; end if;
  select id into producer_user_id
  from auth.users
  where id <> admin_id
    and exists(select 1 from public.profiles p where p.id = auth.users.id and p.account_status = 'active')
    and not exists(select 1 from public.user_roles r where r.user_id = auth.users.id)
  order by created_at asc limit 1;
  if producer_user_id is null then raise exception 'A second active QA-compatible user is required'; end if;
  select lower(btrim(email)) into admin_email from auth.users where id = admin_id;
  select lower(btrim(email)) into producer_email from auth.users where id = producer_user_id;

  insert into public.user_roles(user_id, role, created_by)
  values(admin_id, 'admin', admin_id)
  on conflict(user_id) do update set role = 'admin';

  delete from public.user_subscriptions where user_id in (admin_id, producer_user_id);
  delete from public.content_producer_profiles where user_id = producer_user_id;

  activation := public.admin_activate_content_producer(producer_user_id, 'plus_2028');
  code_value := activation->>'code';
  if activation->>'status' <> 'active'
     or activation->>'planCode' <> 'plus_2028'
     or activation->>'promoStatus' <> 'manual_required'
     or (activation->>'grantEnd')::timestamptz <> timestamptz '2028-06-25 23:59:59+03' then
    raise exception 'Producer activation did not create the fixed additive grant';
  end if;
  if exists(select 1 from public.user_roles where user_id = producer_user_id) then
    raise exception 'Producer activation granted an administrative role';
  end if;

  perform public.admin_confirm_content_producer_code(
    producer_user_id, 'qa_discount_original', true, 'created'
  );

  order_row := public.create_shopier_billing_order(
    admin_id,
    'CAL-19990201-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    'plus_2028', 'yks_2028', 'qa_product_2028',
    'https://www.shopier.com/50041981',
    '{"on_bilgilendirme":"qa","mesafeli_satis":"qa","iptal_iade":"qa","kvkk":"qa"}'::jsonb,
    repeat('c', 64), true, true
  );
  confirmation := public.provider_confirm_billing_order(
    (order_row->>'id')::uuid,
    'shopier:qa_producer_order_1',
    jsonb_build_object(
      'provider','shopier','providerOrderId','qa_producer_order_1',
      'productId','qa_product_2028','customerEmail',admin_email,
      'currency','TRY','paymentStatus','paid','listAmount','1500.00',
      'amount','1200.00','discountAmount','300.00','quantity',1,
      'providerDiscountId','qa_discount_original','discountMethod','discountCode',
      'paidAt',now()
    )
  );
  if confirmation->>'status' <> 'approved' then raise exception 'Discounted producer order was not approved'; end if;
  select id into reward_row_id from public.content_producer_rewards where order_id = (order_row->>'id')::uuid;
  if not exists(
    select 1 from public.content_producer_rewards
    where id = reward_row_id and producer_id = producer_user_id and lifetime_sequence = 1
      and list_amount_minor = 150000 and paid_amount_minor = 120000
      and discount_amount_minor = 30000 and reward_amount_minor = 100000
      and provider_discount_id = 'qa_discount_original' and status = 'pending'
  ) then raise exception 'First producer reward is incorrect'; end if;

  duplicate_confirmation := public.provider_confirm_billing_order(
    (order_row->>'id')::uuid,
    'shopier:qa_producer_order_1',
    jsonb_build_object(
      'provider','shopier','providerOrderId','qa_producer_order_1',
      'productId','qa_product_2028','customerEmail',admin_email,
      'currency','TRY','paymentStatus','paid','listAmount','1500.00',
      'amount','1200.00','discountAmount','300.00','quantity',1,
      'providerDiscountId','qa_discount_original','discountMethod','discountCode',
      'paidAt',now()
    )
  );
  if not coalesce((duplicate_confirmation->>'alreadyProcessed')::boolean, false)
     or (select count(*) from public.content_producer_rewards where order_id = (order_row->>'id')::uuid) <> 1 then
    raise exception 'Duplicate provider event created a duplicate reward';
  end if;

  rotation := public.admin_rotate_content_producer_code(producer_user_id, 'QA güvenli kod rotasyonu');
  new_code_value := rotation->>'code';
  if new_code_value is null or new_code_value = code_value
     or not exists(select 1 from public.content_producer_codes where code = code_value and status = 'retired')
     or not exists(select 1 from public.content_producer_code_bindings where provider_discount_id = 'qa_discount_original' and status = 'retired') then
    raise exception 'Promo rotation did not preserve historical binding';
  end if;
  perform public.admin_confirm_content_producer_code(
    producer_user_id, 'qa_discount_rotated', true, 'retry'
  );

  self_order := public.create_shopier_billing_order(
    producer_user_id,
    'CAL-19990202-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    'plus_2027', 'yks_2027', 'qa_product_2027',
    'https://www.shopier.com/50041880',
    '{"on_bilgilendirme":"qa","mesafeli_satis":"qa","iptal_iade":"qa","kvkk":"qa"}'::jsonb,
    repeat('d', 64), true, true
  );
  perform public.provider_confirm_billing_order(
    (self_order->>'id')::uuid,
    'shopier:qa_producer_self_order',
    jsonb_build_object(
      'provider','shopier','providerOrderId','qa_producer_self_order',
      'productId','qa_product_2027','customerEmail',producer_email,
      'currency','TRY','paymentStatus','paid','listAmount','2500.00',
      'amount','2000.00','discountAmount','500.00','quantity',1,
      'providerDiscountId','qa_discount_rotated','discountMethod','discountCode',
      'paidAt',now()
    )
  );
  if not exists(
    select 1 from public.content_producer_rewards
    where order_id = (self_order->>'id')::uuid and producer_id = producer_user_id
      and lifetime_sequence is null and reward_amount_minor = 0
      and status = 'cancelled' and exclusion_reason = 'self_purchase'
  ) or (select lifetime_qualified_sale_count from public.content_producer_profiles where user_id = producer_user_id) <> 1 then
    raise exception 'Self purchase consumed reward sequence or created earnings';
  end if;

  update public.content_producer_rewards set available_at = now() - interval '1 minute' where id = reward_row_id;
  payout := public.admin_create_content_producer_payout(producer_user_id, 'QA payout reservation');
  if payout->>'status' <> 'reserved'
     or (payout->>'amountMinor')::bigint <> 100000
     or not exists(select 1 from public.content_producer_rewards where id = reward_row_id and status = 'reserved') then
    raise exception 'Payout did not reserve eligible reward atomically';
  end if;
  begin
    perform public.admin_create_content_producer_payout(producer_user_id, 'QA duplicate payout');
  exception when invalid_parameter_value then payout_rejected := true;
  end;
  if not payout_rejected then raise exception 'Duplicate payout reservation was accepted'; end if;
  perform public.admin_mark_content_producer_payout_paid(
    (payout->>'id')::uuid, 'QA-BANK-REFERENCE'
  );

  perform public.reconcile_shopier_refund(
    (order_row->>'id')::uuid, 'qa_producer_refund_1', 'full', 'succeeded', 1200, 'TRY'
  );
  if not exists(
    select 1 from public.content_producer_adjustments
    where reward_id = reward_row_id and kind = 'refund_after_payout'
      and amount_minor = -100000 and status = 'available'
  ) or not exists(select 1 from public.content_producer_rewards where id = reward_row_id and status = 'reversed') then
    raise exception 'Refund after payout did not create the negative ledger adjustment';
  end if;

  perform public.admin_suspend_content_producer(producer_user_id, 'QA program suspension');
  if not exists(select 1 from public.content_producer_profiles where user_id = producer_user_id and status = 'suspended')
     or not exists(select 1 from public.content_producer_access_grants where producer_id = producer_user_id and status = 'suspended')
     or not exists(select 1 from public.content_producer_codes where producer_id = producer_user_id and status = 'suspended') then
    raise exception 'Producer suspension did not disable live grant and code';
  end if;
end;
$$;

rollback;
