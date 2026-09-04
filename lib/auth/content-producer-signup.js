import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function tokenHash(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function validateContentProducerSignupCode(code) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('service_validate_content_producer_signup_code', {
    p_code: String(code || ''),
  });
  if (error || !data?.valid) throw error || new Error('code_not_valid');
  return data;
}

export async function createContentProducerSignupClaim(code) {
  const token = randomBytes(32).toString('base64url');
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('service_create_content_producer_signup_claim', {
    p_code: String(code || ''),
    p_token_hash: tokenHash(token),
  });
  if (error || !data?.valid) throw error || new Error('claim_not_created');
  return { ...data, claimToken: token };
}

export async function claimContentProducerSignupAttribution(userId, token) {
  if (!userId || !CLAIM_TOKEN_PATTERN.test(String(token || ''))) {
    const error = new Error('claim_token_invalid');
    error.code = 'claim_token_invalid';
    throw error;
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('service_claim_content_producer_signup_attribution', {
    p_user_id: userId,
    p_claim_token_hash: tokenHash(token),
  });
  if (error) throw error;
  return data;
}
