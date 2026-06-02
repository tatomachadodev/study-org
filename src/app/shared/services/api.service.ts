import { API_BASE_URL } from '../../core/config/api.config';

type ApiErrorPayload = {
  status: number;
  data: unknown;
};

type RequestOptions = RequestInit & {
  token?: string | null;
};

const API_BASE = (globalThis as { __env?: { API_URL?: string } }).__env?.API_URL ?? API_BASE_URL;

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = API_BASE.endsWith('/') || path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const headers = new Headers(options.headers);

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (!headers.has('Content-Type') && options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const rawBody = await response.text();
  let data: unknown = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody) as unknown;
    } catch {
      data = rawBody;
    }
  }

  if (!response.ok) {
    throw {
      status: response.status,
      data,
    } satisfies ApiErrorPayload;
  }

  return data as T;
}

function getApiErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return 'Nao foi possivel comunicar com a API.';
  }

  const payload = error as ApiErrorPayload & { data?: { message?: string } | string | null };
  if (typeof payload.data === 'string' && payload.data.trim()) {
    return payload.data;
  }

  if (payload.data && typeof payload.data === 'object' && 'message' in payload.data) {
    const message = payload.data.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Nao foi possivel comunicar com a API.';
}

export { API_BASE, apiFetch, getApiErrorMessage };
