import { env } from './env';
import { getAccessToken } from './supabase';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown; auth?: boolean };

// Calls the shared Next.js API (calisiyo.com.tr/api/*) with the Supabase access
// token, so mobile and web go through exactly the same server rules.
export async function api<T = any>(path: string, { body, auth = true, headers, ...init }: ApiOptions = {}): Promise<T> {
  const token = auth ? await getAccessToken() : null;
  if (auth && !token) throw new ApiError('Oturumunun süresi doldu. Lütfen yeniden giriş yap.', 401);
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.', 0);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new ApiError(payload?.message || 'İşlem tamamlanamadı. Lütfen tekrar dene.', response.status, payload?.code);
  }
  return payload as T;
}
