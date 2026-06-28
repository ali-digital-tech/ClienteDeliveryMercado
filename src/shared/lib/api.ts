import { getFriendlyMessage } from './userMessages';

const DEFAULT_API_BASE_URL = 'https://mercado-backend-gtke7r7veq-rj.a.run.app/api';
const SESSION_EXPIRED_EVENT = 'auth-session-expired';
const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente para continuar.';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL;

type QueryParams = Record<string, string | number | boolean | null | undefined>;

interface ApiRequestOptions extends RequestInit {
  params?: QueryParams;
}

type SessionResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: unknown;
};

let refreshRequest: Promise<boolean> | null = null;

function buildUrl(path: string, params?: QueryParams) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return localStorage.getItem('token') ?? localStorage.getItem('authToken');
}

export function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

export function hasStoredSession() {
  return Boolean(getAuthToken() || getRefreshToken());
}

export function clearAuthTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('refresh_token');
}

export function isSessionExpiredError(status: number, message: string) {
  return status === 401 || /invalid or expired token|jwt expired|token expired|invalid token/i.test(message);
}

export function dispatchSessionExpired() {
  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { message: SESSION_EXPIRED_MESSAGE },
    }),
  );
}

export function onSessionExpired(handler: (message: string) => void) {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ message?: string }>).detail;
    handler(detail?.message || SESSION_EXPIRED_MESSAGE);
  };

  window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
}

function shouldRefresh(path: string) {
  return !['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email', '/auth/resend-email-confirmation']
    .some((authPath) => path.includes(authPath));
}

export async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshRequest) {
    refreshRequest = fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).then(async (response) => {
      if (!response.ok) return false;

      const session = await response.json() as SessionResponse;
      if (!session.access_token) return false;

      localStorage.setItem('token', session.access_token);
      localStorage.removeItem('authToken');
      if (session.refresh_token) {
        localStorage.setItem('refresh_token', session.refresh_token);
      }
      if (session.user) {
        localStorage.setItem('user', JSON.stringify(session.user));
      }

      return true;
    }).catch(() => false).finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

export async function ensureAuthenticatedSession() {
  if (getAuthToken()) return true;
  return refreshSession();
}

async function sendRequest(path: string, options: ApiRequestOptions, token: string | null) {
  const { params, headers, body, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('ngrok-skip-browser-warning', 'true');

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, params), {
    ...requestOptions,
    headers: requestHeaders,
    body: body && typeof body !== 'string' ? JSON.stringify(body) : body,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  return { response, payload };
}

async function sendFriendlyRequest(path: string, options: ApiRequestOptions, token: string | null) {
  try {
    return await sendRequest(path, options, token);
  } catch (error) {
    throw new Error(getFriendlyMessage(error));
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = getAuthToken();
  let { response, payload } = await sendFriendlyRequest(path, options, token);

  if (!response.ok) {
    const initialMessage = payload?.message || payload?.error?.message || payload?.error || '';
    const canRefresh = hasStoredSession() && shouldRefresh(path) && isSessionExpiredError(response.status, String(initialMessage));

    if (canRefresh) {
      const refreshed = await refreshSession();
      if (refreshed) {
        ({ response, payload } = await sendFriendlyRequest(path, options, getAuthToken()));
      }

      const finalMessage = payload?.message || payload?.error?.message || payload?.error || '';
      if (!refreshed || (!response.ok && isSessionExpiredError(response.status, String(finalMessage)))) {
        clearAuthTokens();
        dispatchSessionExpired();
      }
    }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || payload?.error || 'Erro ao buscar dados da API.';
    const error = new Error(getFriendlyMessage(message)) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = payload;

    throw error;
  }

  return payload as T;
}

export function unwrapList<T>(payload: any): T[] {
  const data = payload?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(payload)) return payload;

  return [];
}
