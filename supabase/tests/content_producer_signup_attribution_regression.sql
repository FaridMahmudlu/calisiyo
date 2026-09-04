-- Transactional signup-attribution and creator-price billing regression.
-- Creates isolated local fixtures and rolls every mutation back.
begin;

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated',
    'creator-signup-target.test@calisiyo.invalid', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Signup Target","alan_secimi":"sayisal"}'::jsonb,
    now() - interval '10 minutes', now()
  ),
  (
    '00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated',
    'creator-signup-producer.test@calisiyo.invalid', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Signup Producer","alan_secimi":"sayisal"}'::jsonb,
    now() - interval '10 minutes', now()
  );

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000a1',
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-0000000000a1',
    'role', 'service_role'
  )::text,
  true
);

do $$
declare
  target_user_id uuid := '00000000-0000-4000-8000-0000000000a1';
  producer_user_id uuid := '00000000-0000-4000-8000-0000000000b2';
  target_email text;
  created_code_id uuid;
  code_value text := 'QA' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) || '20';
  first_hash text := encode(digest('qa-signup-claim-1-' || gen_random_uuid()::text, 'sha256'), 'hex');
  second_hash text := encode(digest('qa-signup-claim-2-' || gen_random_uuid()::text, 'sha256'), 'hex');
  self_hash text := encode(digest('qa-signup-self-' || gen_random_uuid()::text, 'sha256'), 'hex');
  expired_hash text := encode(digest('qa-signup-expired-' || gen_random_uuid()::text, 'sha256'), 'hex');
  first_claim jsonb;
  second_claim jsonb;
  self_claim jsonb;
  expired_claim jsonb;
  attribution jsonb;
  duplicate_claim jsonb;
  attribution_id uuid;
  order_row jsonb;
  confirmation jsonb;
  duplicate_confirmation jsonb;
  suspended_order jsonb;
  suspended_confirmation jsonb;
  suspended_checkout_context jsonb;
  growth jsonb;
  purged_claims integer;
  old_account_rejected boolean := false;
  validation_result jsonb;
  second_attribution_rejected boolean := false;
  self_rejected boolean := false;
  expired_rejected boolean := false;
begin
  select lower(btrim(email)) into target_email from auth.users where id = target_user_id;

  insert into public.content_producer_profiles(user_id, status, activated_by)
  values(producer_user_id, 'active', target_user_id);
  insert into public.content_producer_codes(producer_id, code, status, created_by)
  values(producer_user_id, code_value, 'active', target_user_id)
  returning id into created_code_id;
  insert into public.content_producer_code_bindings(
    code_id, provider_discount_id, status, configuration, verified_by, verified_at
  ) values(
    created_code_id, 'qa_signup_' || replace(gen_random_uuid()::text, '-', ''), 'active',
    '{"discountBps":2000,"currency":"TRY","productScopeConfirmed":true}'::jsonb,
    target_user_id, now()
  );

  validation_result := public.service_validate_content_producer_signup_code(code_value);
  if validation_result->>'valid' <> 'true'
     or exists(select 1 from public.content_producer_signup_claims c where c.code_id = created_code_id) then
    raise exception 'Lightweight validation created durable claim state';
  end if;

  first_claim := public.service_create_content_producer_signup_claim(code_value, first_hash);
  if first_claim->>'valid' <> 'true'
     or first_claim->>'code' <> code_value then
    raise exception 'Signup claim was not created safely';
  end if;

  begin
    perform public.service_claim_content_producer_signup_attribution(target_user_id, first_hash);
  exception when insufficient_privilege then old_account_rejected := true;
  end;
  if not old_account_rejected then raise exception 'An existing account accepted signup attribution'; end if;

  second_claim := public.service_create_content_producer_signup_claim(code_value, second_hash);
  update auth.users
  set created_at = (
    select c.created_at - interval '2 seconds'
    from public.content_producer_signup_claims c where c.token_hash = second_hash
  )
  where id = target_user_id;
  attribution := public.service_claim_content_producer_signup_attribution(target_user_id, second_hash);
  duplicate_claim := public.service_claim_content_producer_signup_attribution(target_user_id, second_hash);
  if attribution->>'attributed' <> 'true'
     or coalesce((attribution->>'alreadyProcessed')::boolean, true)
     or not coalesce((duplicate_claim->>'alreadyProcessed')::boolean, false) then
    raise exception 'Signup attribution was not one-time and idempotent';
  end if;
  select id into attribution_id
  from public.content_producer_signup_attributions
  where user_id = target_user_id and producer_id = producer_user_id and code_snapshot = code_value;
  if attribution_id is null then raise exception 'Immutable attribution row was not persisted'; end if;

  begin
    perform public.service_claim_content_producer_signup_attribution(target_user_id, first_hash);
  exception when unique_violation then second_attribution_rejected := true;
  end;
  if not second_attribution_rejected then raise exception 'A second attribution replaced the first'; end if;

  self_claim := public.service_create_content_producer_signup_claim(code_value, self_hash);
  update auth.users set created_at = now() + interval '1 second' where id = producer_user_id;
  begin
    perform public.service_claim_content_producer_signup_attribution(producer_user_id, self_hash);
  exception when insufficient_privilege then self_rejected := true;
  end;
  if not self_rejected then raise exception 'Self-attribution was accepted'; end if;

  expired_claim := public.service_create_content_producer_signup_claim(code_value, expired_hash);
  update public.content_producer_signup_claims
  set created_at = now() - interval '2 days', expires_at = now() - interval '1 day'
  where token_hash = expired_hash;
  begin
    perform public.service_claim_content_producer_signup_attribution(producer_user_id, expired_hash);
  exception when invalid_parameter_value then expired_rejected := true;
  end;
  if not expired_rejected then raise exception 'Expired attribution claim was accepted'; end if;

  insert into public.xp_events(user_id, event_type, source_key, xp_amount, created_at)
  values
    (target_user_id, 'task_completed', 'qa-signup-activation-1', 50, now() + interval '2 seconds'),
    (target_user_id, 'exam_added', 'qa-signup-activation-2', 100, now() + interval '3 seconds');
  insert into public.billing_events(user_id, event_type, payload, created_at)
  values(target_user_id, 'trial_started', '{"source":"qa"}'::jsonb, now() + interval '2 seconds');
  delete from public.user_subscriptions where user_id = target_user_id;

  order_row := public.create_shopier_billing_order_v2(
    target_user_id,
    'CAL-19990301-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    'plus_2027', 'yks_2027', 'qa_creator_product_2027',
    'https://www.shopier.com/50041880',
    '{"on_bilgilendirme":"qa","mesafeli_satis":"qa","iptal_iade":"qa","kvkk":"qa"}'::jsonb,
    repeat('e', 64), true, true, 'signup_creator_code', attribution_id, 2000, 500
  );
  if order_row->>'pricingSource' <> 'signup_creator_code'
     or (order_row->>'amount')::numeric <> 2000
     or (order_row->>'discountAmount')::numeric <> 500 then
    raise exception 'Creator-price order did not use server-calculated 20 percent benefit';
  end if;

  confirmation := public.provider_confirm_billing_order(
    (order_row->>'id')::uuid,
    'shopier:qa_signup_creator_order',
    jsonb_build_object(
      'provider', 'shopier', 'providerOrderId', 'qa_signup_creator_order',
      'productId', 'qa_creator_product_2027', 'customerEmail', target_email,
      'currency', 'TRY', 'paymentStatus', 'paid', 'listAmount', '2000.00',
      'amount', '2000.00', 'discountAmount', '0.00', 'quantity', 1,
      'paidAt', now() + interval '4 seconds'
    )
  );
  duplicate_confirmation := public.provider_confirm_billing_order(
    (order_row->>'id')::uuid,
    'shopier:qa_signup_creator_order',
    jsonb_build_object(
      'provider', 'shopier', 'providerOrderId', 'qa_signup_creator_order',
      'productId', 'qa_creator_product_2027', 'customerEmail', target_email,
      'currency', 'TRY', 'paymentStatus', 'paid', 'listAmount', '2000.00',
      'amount', '2000.00', 'discountAmount', '0.00', 'quantity', 1,
      'paidAt', now() + interval '4 seconds'
    )
  );
  if confirmation->>'status' <> 'approved'
     or not coalesce((duplicate_confirmation->>'alreadyProcessed')::boolean, false)
     or (select count(*) from public.content_producer_rewards where order_id = (order_row->>'id')::uuid) <> 1
     or not exists(
       select 1 from public.content_producer_rewards
       where order_id = (order_row->>'id')::uuid
         and reward_source = 'signup_creator_code'
         and signup_attribution_id = attribution_id
         and provider_discount_id is null
         and paid_amount_minor = 200000
         and discount_amount_minor = 50000
         and reward_amount_minor = 100000
     ) then
    raise exception 'Creator-price confirmation or reward was not exact and idempotent';
  end if;

  update public.content_producer_profiles
  set status = 'suspended'
  where user_id = producer_user_id;
  suspended_checkout_context := public.service_content_producer_checkout_context(target_user_id);
  if suspended_checkout_context->>'attributed' <> 'true'
     or suspended_checkout_context->>'eligible' <> 'true' then
    raise exception 'Creator suspension incorrectly removed the student discount';
  end if;

  suspended_order := public.create_shopier_billing_order_v2(
    target_user_id,
    'CAL-19990302-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    'plus_2028', 'yks_2028', 'qa_creator_product_2028',
    'https://www.shopier.com/50041881',
    '{"on_bilgilendirme":"qa","mesafeli_satis":"qa","iptal_iade":"qa","kvkk":"qa"}'::jsonb,
    repeat('f', 64), true, true, 'signup_creator_code', attribution_id, 3600, 900
  );
  suspended_confirmation := public.provider_confirm_billing_order(
    (suspended_order->>'id')::uuid,
    'shopier:qa_suspended_creator_order',
    jsonb_build_object(
      'provider', 'shopier', 'providerOrderId', 'qa_suspended_creator_order',
      'productId', 'qa_creator_product_2028', 'customerEmail', target_email,
      'currency', 'TRY', 'paymentStatus', 'paid', 'listAmount', '3600.00',
      'amount', '3600.00', 'discountAmount', '0.00', 'quantity', 1,
      'paidAt', now() + interval '5 seconds'
    )
  );
  if suspended_confirmation->>'status' <> 'approved'
     or not exists(
       select 1 from public.content_producer_rewards
       where order_id = (suspended_order->>'id')::uuid
         and status = 'cancelled'
         and exclusion_reason = 'producer_suspended'
         and reward_amount_minor = 0
     ) then
    raise exception 'Suspended creator received a new reward or student checkout failed';
  end if;

  growth := public.content_producer_growth_summary_for(producer_user_id, '7d');
  if (growth->>'registrations')::integer <> 1
     or (growth->>'activated')::integer <> 1
     or (growth->>'trials')::integer <> 1
     or (growth->>'paidConversions')::integer <> 1
     or (growth->>'verifiedSales')::integer <> 1 then
    raise exception 'Aggregate creator funnel disagrees with durable activity and billing records';
  end if;

  update public.content_producer_signup_claims
  set consumed_at = now() - interval '15 days'
  where token_hash = second_hash;
  purged_claims := public.service_purge_expired_content_producer_signup_claims();
  if purged_claims < 1
     or exists(select 1 from public.content_producer_signup_claims where token_hash = second_hash)
     or not exists(
       select 1 from public.content_producer_signup_attributions
       where id = attribution_id and user_id = target_user_id and claim_id is null
     ) then
    raise exception 'Temporary claim cleanup damaged or retained the durable attribution';
  end if;
end;
$$;

rollback;
