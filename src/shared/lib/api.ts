import { getFriendlyMessage } from './userMessages';

const DEFAULT_API_BASE_URL = 'https://mercado-backend-gtke7r7veq-rj.a.run.app/api';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL;

type QueryParams = Record<string, string | number | boolean | null | undefined>;

interface ApiRequestOptions extends RequestInit {
  params?: QueryParams;
}

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

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { params, headers, body, ...requestOptions } = options;
  const token = getAuthToken();
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
