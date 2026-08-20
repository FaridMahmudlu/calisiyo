import { createAdminClient } from '@/lib/supabase/admin';
import { verifyConfiguredShopierWebhook } from '@/lib/billing/providers/shopier';
import { processShopierEvent } from '@/lib/billing/shopier-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 256 * 1024;
const PROVIDER_ID = /^[A-Za-z0-9_-]{1,160}$/;
const ACCEPTED_EVENTS = new Set(['order.created', 'refund.updated']);

function response(status, code) {
  return Response.json({ ok: status < 400, code }, { status });
}

function minimalEventPayload(eventType, payload) {
  if (eventType === 'order.created') {
    return {
      resourceId: String(payload.id || ''),
      paymentStatus: String(payload.paymentStatus || ''),
      currency: String(payload.currency || ''),
      dateCreated: String(payload.dateCreated || ''),
    };
  }
  return {
    resourceId: String(payload.id || ''),
    orderId: String(payload.orderId || ''),
    status: String(payload.status || ''),
    type: String(payload.type || ''),
  };
}

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (!contentType.toLowerCase().startsWith('application/json')) return response(415, 'content_type_required');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return response(413, 'payload_too_large');

  const rawBody = Buffer.from(await request.arrayBuffer());
  if (!rawBody.length || rawBody.length > MAX_BODY_BYTES) return response(400, 'invalid_payload_size');

  const signature = request.headers.get('shopier-signature');
  if (!verifyConfiguredShopierWebhook(rawBody, signature)) return response(401, 'invalid_signature');

  const eventId = String(request.headers.get('shopier-webhook-id') || '').trim();
  const eventType = String(request.headers.get('shopier-event') || '').trim();
  const accountId = String(request.headers.get('shopier-account-id') || '').trim();
  const timestampText = String(request.headers.get('shopier-timestamp') || '').trim();
  const timestampSeconds = Number(timestampText);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!PROVIDER_ID.test(eventId) || !ACCEPTED_EVENTS.has(eventType)
      || !Number.isInteger(timestampSeconds)
      || timestampSeconds > nowSeconds + 300
      || timestampSeconds < nowSeconds - (4 * 24 * 60 * 60)) {
    return response(400, 'invalid_webhook_headers');
  }

  let payload;
  try { payload = JSON.parse(rawBody.toString('utf8')); } catch { return response(400, 'invalid_json'); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return response(400, 'invalid_payload');

  const resourceId = String(payload.id || '').trim();
  const providerOrderId = String(eventType === 'order.created' ? payload.id : payload.orderId || '').trim();
  if (!PROVIDER_ID.test(resourceId) || !PROVIDER_ID.test(providerOrderId)) {
    return response(400, 'invalid_resource_id');
  }

  const admin = createAdminClient();
  const { data: claim, error: claimError } = await admin.rpc('claim_shopier_webhook_event', {
    p_event_id: eventId,
    p_event_type: eventType,
    p_provider_order_id: providerOrderId,
    p_account_id: PROVIDER_ID.test(accountId) ? accountId : null,
    p_provider_timestamp: new Date(timestampSeconds * 1000).toISOString(),
    p_payload: minimalEventPayload(eventType, payload),
  });
  if (claimError) {
    console.error('Shopier webhook persistence failed', { code: claimError.code || 'unknown' });
    return response(503, 'persistence_unavailable');
  }
  if (!claim?.claimed) return response(200, 'duplicate_accepted');

  try {
    const result = await processShopierEvent({ eventType, providerResourceId: resourceId }, { admin });
    const review = result.outcome === 'review_required';
    const { error: finishError } = await admin.rpc('finish_shopier_webhook_event', {
      p_event_id: eventId,
      p_status: review ? 'review_required' : 'processed',
      p_reason_code: result.reason || null,
      p_error_code: null,
    });
    if (finishError) throw finishError;
    return response(200, review ? 'accepted_for_review' : 'processed');
  } catch (error) {
    const errorCode = String(error?.code || 'verification_failed').slice(0, 120);
    await admin.rpc('finish_shopier_webhook_event', {
      p_event_id: eventId,
      p_status: 'failed',
      p_reason_code: 'provider_verification_failed',
      p_error_code: errorCode,
    }).catch(() => null);
    console.error('Shopier webhook verification failed', { code: errorCode });
    return response(503, 'verification_retry_required');
  }
}
