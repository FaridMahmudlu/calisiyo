-- Keep refund reconciliation fail-closed even when called outside the normal
-- provider client path. Existing refund rows and entitlements remain intact.
create or replace function public.reconcile_shopier_refund(
  p_order_id uuid,
  p_refund_id text,
  p_refund_type text,
  p_refund_status text,
  p_refund_total numeric,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.billing_orders%rowtype;
  next_order_status text;
  next_provider_status text;
begin
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Sunucu iade işlemi gerekli.';
  end if;
  if p_refund_id !~ '^[A-Za-z0-9_-]{1,160}$'
     or p_refund_type not in ('full', 'partial')
     or p_refund_status not in ('pending', 'failed', 'succeeded')
     or p_refund_total is null
     or p_refund_total <= 0
     or upper(coalesce(p_currency, '')) <> 'TRY' then
    raise exception using errcode = '22023', message = 'İade bilgisi geçersiz.';
  end if;

  select * into order_row from public.billing_orders
  where id = p_order_id and payment_provider = 'shopier' for update;
  if order_row.id is null or order_row.provider_order_id is null then
    raise exception using errcode = 'P0002', message = 'İadeye bağlı sipariş bulunamadı.';
  end if;
  if p_refund_total > order_row.amount
     or (p_refund_type = 'full' and p_refund_total <> order_row.amount) then
    raise exception using errcode = '22023', message = 'İade tutarı siparişle eşleşmedi.';
  end if;
  if order_row.provider_refund_id = p_refund_id
     and order_row.provider_refund_status = 'refund_' || p_refund_type || '_' || p_refund_status then
    return jsonb_build_object(
      'id', order_row.id, 'status', order_row.status,
      'refundStatus', order_row.provider_refund_status,
      'requiresReview', p_refund_status = 'succeeded', 'alreadyProcessed', true
    );
  end if;
  if order_row.provider_refund_id is not null
     and order_row.provider_refund_id <> p_refund_id then
    insert into public.billing_events(order_id, user_id, event_type, payload)
    values (
      order_row.id, order_row.user_id, 'refund_review_required',
      jsonb_build_object(
        'provider', 'shopier', 'refundId', p_refund_id,
        'refundType', p_refund_type, 'refundStatus', p_refund_status,
        'reason', 'multiple_refunds_for_order'
      )
    );
    return jsonb_build_object(
      'id', order_row.id, 'status', order_row.status,
      'refundStatus', order_row.provider_refund_status,
      'requiresReview', true, 'reason', 'multiple_refunds_for_order'
    );
  end if;

  next_order_status := case
    when p_refund_status = 'succeeded' and p_refund_type = 'full' then 'refunded'
    else order_row.status
  end;
  next_provider_status := 'refund_' || p_refund_type || '_' || p_refund_status;

  update public.billing_orders
  set status = next_order_status,
      provider_refund_id = p_refund_id,
      provider_refund_status = next_provider_status,
      provider_refunded_at = case when p_refund_status = 'succeeded' then now() else provider_refunded_at end,
      provider_status = next_provider_status,
      decision_note = case
        when p_refund_status = 'succeeded' and p_refund_type = 'full'
          then 'Tam iade doğrulandı; erişim değişikliği insan incelemesi gerektirir.'
        when p_refund_status = 'succeeded'
          then 'Kısmi iade insan incelemesi gerektirir.'
        else decision_note
      end,
      updated_at = now()
  where id = order_row.id;

  insert into public.billing_events(order_id, user_id, event_type, payload)
  values (
    order_row.id, order_row.user_id, 'refund_' || p_refund_status,
    jsonb_build_object(
      'provider', 'shopier', 'refundId', p_refund_id,
      'refundType', p_refund_type, 'refundStatus', p_refund_status,
      'total', p_refund_total, 'currency', upper(p_currency),
      'requiresEntitlementReview', p_refund_status = 'succeeded'
    )
  );

  if p_refund_status = 'succeeded' then
    insert into public.notifications(user_id, kind, title, body, action_url, dedupe_key)
    values (
      order_row.user_id, 'info', 'İade durumu güncellendi',
      'Shopier iade işlemin doğrulandı. Erişim durumun destek ekibi tarafından güvenle incelenecek.',
      '/dashboard/abonelik', 'billing-refund-' || p_refund_id
    ) on conflict (user_id, dedupe_key) do nothing;
  end if;

  return jsonb_build_object(
    'id', order_row.id, 'status', next_order_status,
    'refundStatus', next_provider_status,
    'requiresReview', p_refund_status = 'succeeded'
  );
end;
$$;

revoke all on function public.reconcile_shopier_refund(uuid, text, text, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.reconcile_shopier_refund(uuid, text, text, text, numeric, text)
  to service_role;
