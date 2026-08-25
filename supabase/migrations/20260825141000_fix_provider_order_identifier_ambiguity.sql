create or replace function public.provider_confirm_billing_order(p_order_id uuid,p_payment_reference text,p_provider_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.billing_orders%rowtype;
  period_start timestamptz; period_end timestamptz;
  verified_provider_order_id text:=btrim(coalesce(p_provider_payload->>'providerOrderId',''));
  product_id text:=btrim(coalesce(p_provider_payload->>'productId',''));
  customer_email text:=lower(btrim(coalesce(p_provider_payload->>'customerEmail','')));
  currency_code text:=upper(btrim(coalesce(p_provider_payload->>'currency','')));
  payment_status text:=lower(btrim(coalesce(p_provider_payload->>'paymentStatus','')));
  provider_discount text:=nullif(btrim(coalesce(p_provider_payload->>'providerDiscountId','')),'');
  discount_method text:=nullif(btrim(coalesce(p_provider_payload->>'discountMethod','')),'');
  list_total numeric(10,2); paid_total numeric(10,2); discount_total numeric(10,2); quantity_value integer;
  paid_at timestamptz; producer_id uuid; sequence_value integer; reward_minor bigint;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception using errcode='42501',message='Sunucu doğrulaması gerekli.'; end if;
  if jsonb_typeof(coalesce(p_provider_payload,'{}'::jsonb))<>'object' or p_provider_payload->>'provider'<>'shopier' or length(btrim(coalesce(p_payment_reference,'')))<8 then
    raise exception using errcode='22023',message='Ödeme doğrulama kaydı geçersiz.';
  end if;
  begin
    list_total:=(p_provider_payload->>'listAmount')::numeric(10,2);
    paid_total:=(p_provider_payload->>'amount')::numeric(10,2);
    discount_total:=(p_provider_payload->>'discountAmount')::numeric(10,2);
    quantity_value:=(p_provider_payload->>'quantity')::integer;
    paid_at:=(p_provider_payload->>'paidAt')::timestamptz;
  exception when others then raise exception using errcode='22023',message='Provider finansal kanıtı geçersiz.'; end;
  select * into order_row from public.billing_orders where id=p_order_id and payment_provider='shopier' and status in ('payment_link_ready','awaiting_review') for update;
  if order_row.id is null then
    select * into order_row from public.billing_orders where id=p_order_id and payment_provider='shopier' and status='approved' and public.billing_orders.provider_order_id=verified_provider_order_id;
    if order_row.id is not null then return jsonb_build_object('id',order_row.id,'status','approved','alreadyProcessed',true,'planCode',order_row.plan_code); end if;
    raise exception using errcode='P0002',message='Doğrulanabilir sipariş bulunamadı.';
  end if;
  if verified_provider_order_id !~ '^[A-Za-z0-9_-]{1,160}$' or product_id<>order_row.expected_provider_product_id or customer_email<>order_row.customer_email_snapshot
    or currency_code<>order_row.currency or payment_status<>'paid' or quantity_value<>1 or list_total<>coalesce(order_row.list_amount,order_row.amount)
    or paid_total<=0 or discount_total<0 or paid_total+discount_total<>list_total then
    raise exception using errcode='22023',message='Shopier ödeme kanıtı siparişle eşleşmedi.';
  end if;
  if discount_total=0 then
    if provider_discount is not null then raise exception using errcode='22023',message='Beklenmeyen indirim kimliği.'; end if;
  else
    if discount_total<>round(list_total*0.20,2) or discount_method<>'discountCode' or provider_discount !~ '^[A-Za-z0-9_-]{1,160}$' then
      raise exception using errcode='22023',message='Shopier indirimi doğrulanamadı.';
    end if;
    select c.producer_id into producer_id from public.content_producer_code_bindings b
    join public.content_producer_codes c on c.id=b.code_id
    where b.provider='shopier' and b.provider_discount_id=provider_discount and b.valid_from<=paid_at and (b.valid_to is null or paid_at<b.valid_to)
      and b.configuration->>'productScopeConfirmed'='true' and c.discount_bps=2000 limit 1;
    if producer_id is null then raise exception using errcode='22023',message='Shopier indirim bağı bulunamadı.'; end if;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:billing:' || order_row.user_id::text,0));
  if exists(select 1 from public.billing_orders x where x.payment_provider='shopier' and x.provider_order_id=verified_provider_order_id and x.id<>order_row.id)
    or exists(select 1 from public.billing_orders x where x.payment_reference=btrim(p_payment_reference) and x.status in ('approved','refunded') and x.id<>order_row.id) then
    raise exception using errcode='23505',message='Bu ödeme daha önce kullanılmış.';
  end if;
  select a.period_start,a.period_end into period_start,period_end from public.calculate_purchased_access_period(order_row.user_id,order_row.plan_code,paid_at)a;
  insert into public.user_subscriptions(user_id,plan_code,status,current_period_start,current_period_end,source_order_id,cancel_at_period_end,trial_started_at,trial_ends_at)
  values(order_row.user_id,order_row.plan_code,'active',period_start,period_end,order_row.id,true,null,null)
  on conflict(user_id) do update set plan_code=excluded.plan_code,status='active',current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
    source_order_id=excluded.source_order_id,cancel_at_period_end=true,trial_started_at=null,trial_ends_at=null,updated_at=now();
  update public.billing_orders set status='approved',payment_reference=btrim(p_payment_reference),provider_order_id=verified_provider_order_id,provider_status=payment_status,
    provider_verified_at=now(),verified_at=now(),list_amount=list_total,paid_amount=paid_total,verified_discount_amount=discount_total,
    provider_discount_id=provider_discount,content_producer_id=producer_id,decision_note='Shopier API ile otomatik doğrulandı.',updated_at=now() where id=order_row.id;
  if producer_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:producer-reward:' || producer_id::text,0));
    if not exists(select 1 from public.content_producer_rewards r where r.order_id=order_row.id) then
      if producer_id=order_row.user_id then
        insert into public.content_producer_rewards(producer_id,order_id,provider_order_id,provider_discount_id,lifetime_sequence,list_amount_minor,paid_amount_minor,discount_amount_minor,reward_amount_minor,status,exclusion_reason,sale_paid_at,available_at)
        values(producer_id,order_row.id,verified_provider_order_id,provider_discount,null,(list_total*100)::bigint,(paid_total*100)::bigint,(discount_total*100)::bigint,0,'cancelled','self_purchase',paid_at,paid_at+interval '14 days');
      else
        select lifetime_qualified_sale_count+1 into sequence_value from public.content_producer_profiles where user_id=producer_id for update;
        if sequence_value is null then raise exception using errcode='P0002',message='İçerik üreticisi bulunamadı.'; end if;
        reward_minor:=case when sequence_value<=3 then 100000 else 50000 end;
        if reward_minor>(paid_total*100)::bigint then raise exception using errcode='22023',message='Kazanç tahsilat tutarını aşamaz.'; end if;
        update public.content_producer_profiles set lifetime_qualified_sale_count=sequence_value,updated_at=now() where user_id=producer_id;
        insert into public.content_producer_rewards(producer_id,order_id,provider_order_id,provider_discount_id,lifetime_sequence,list_amount_minor,paid_amount_minor,discount_amount_minor,reward_amount_minor,status,sale_paid_at,available_at)
        values(producer_id,order_row.id,verified_provider_order_id,provider_discount,sequence_value,(list_total*100)::bigint,(paid_total*100)::bigint,(discount_total*100)::bigint,reward_minor,'pending',paid_at,paid_at+interval '14 days');
        insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key)
        values(producer_id,'success','Yeni kazanç oluştu','İçerik Üretici Programı üzerinden doğrulanmış yeni bir satış kazancı oluştu.',
          '/dashboard/icerik-ureticisi','producer-reward-' || order_row.id::text) on conflict(user_id,dedupe_key) do nothing;
      end if;
    end if;
  end if;
  insert into public.billing_events(order_id,user_id,event_type,payload) values(order_row.id,order_row.user_id,'provider_confirmed',jsonb_build_object(
    'provider','shopier','providerOrderId',verified_provider_order_id,'productId',product_id,'listAmount',list_total,'amount',paid_total,'discountAmount',discount_total,
    'providerDiscountId',provider_discount,'currency',currency_code,'quantity',quantity_value,'periodStart',period_start,'periodEnd',period_end));
  insert into public.notifications(user_id,kind,title,body,action_url,dedupe_key) values(order_row.user_id,'success','calisiyo plus etkinleştirildi',
    'Plus erişimin '||to_char(period_end at time zone 'Europe/Istanbul','DD.MM.YYYY')||' tarihine kadar açık.','/dashboard/abonelik','billing-approved-'||order_row.id::text)
    on conflict(user_id,dedupe_key) do nothing;
  return jsonb_build_object('id',order_row.id,'status','approved','alreadyProcessed',false,'planCode',order_row.plan_code,'periodStart',period_start,'periodEnd',period_end);
end;
$$;
revoke all on function public.provider_confirm_billing_order(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.provider_confirm_billing_order(uuid,text,jsonb) to service_role;
