import Storage from 'expo-sqlite/kv-store';
import { api, ApiError } from '@/lib/api';

const PENDING_KEY = 'calisiyo-pending-creator-claim';

export type CreatorCodeState = 'idle' | 'checking' | 'valid' | 'invalid' | 'limited';

type CodeResponse = { ok: boolean; valid: boolean; code?: string; claimToken?: string; message?: string; retryable?: boolean };

async function post(path: string, code: string): Promise<CodeResponse> {
  try {
    return await api<CodeResponse>(path, { method: 'POST', body: { code }, auth: false });
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) return { ok: false, valid: false, retryable: true, message: error.message };
    return { ok: false, valid: false };
  }
}

export const validateCreatorCode = (code: string) => post('/api/auth/content-producer-code', code);
export const issueCreatorClaim = (code: string) => post('/api/auth/content-producer-code/issue', code);

export function rememberPendingClaim(token: string | null) {
  if (token) Storage.setItemSync(PENDING_KEY, token);
  else Storage.removeItemSync(PENDING_KEY);
}

// Binds a validated creator code to the signed-in account (after OAuth or
// email confirmation). Returns false when the server refused the claim.
export async function claimPendingCreatorCode(token?: string | null) {
  const claimToken = token || Storage.getItemSync(PENDING_KEY);
  if (!claimToken) return true;
  try {
    await api('/api/auth/content-producer-code/claim', { method: 'POST', body: { claimToken } });
    rememberPendingClaim(null);
    return true;
  } catch {
    rememberPendingClaim(null);
    return false;
  }
}
