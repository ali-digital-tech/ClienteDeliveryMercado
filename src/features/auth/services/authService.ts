import { apiRequest } from '@/shared/lib/api';
import type { AuthUser, LoginCredentials, LoginResponse, RegisterCustomerPayload } from '../types/auth';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeStoreId(storeId: string | undefined) {
  if (!storeId || !UUID_REGEX.test(storeId)) return undefined;
  return storeId;
}

function requireStoreId(storeId: string | undefined) {
  const lojaId = normalizeStoreId(storeId);
  if (!lojaId) {
    throw new Error('Não foi possível identificar a loja atual. Recarregue a página do mercado e tente novamente.');
  }

  return lojaId;
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const lojaId = requireStoreId(credentials.loja_id);

    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
        userType: 'cliente',
        loja_id: lojaId,
      } as any,
    });
  },

  async registerCustomer(payload: RegisterCustomerPayload) {
    const lojaId = requireStoreId(payload.loja_id);

    return apiRequest('/clientes', {
      method: 'POST',
      body: {
        ...payload,
        loja_id: lojaId,
      } as any,
    });
  },

  persistSession(session: LoginResponse) {
    localStorage.setItem(AUTH_TOKEN_KEY, session.access_token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
    return session.user;
  },

  getStoredUser(): AuthUser | null {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },
};
