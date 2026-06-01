import { apiRequest, clearAuthTokens } from '@/shared/lib/api';
import type { AuthUser, ForgotPasswordResponse, LoginCredentials, LoginResponse, RegisterCustomerPayload } from '../types/auth';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeStoreId(storeId: string | undefined) {
  if (!storeId || !UUID_REGEX.test(storeId)) return undefined;
  return storeId;
}


function getPasswordResetRedirectBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_APP_BASE_URL?.trim();
  const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const isLocalUrl = (url: string | undefined) => /localhost|127\.0\.0\.1/i.test(url ?? '');

  if (runtimeOrigin && !isLocalUrl(runtimeOrigin)) {
    return runtimeOrigin;
  }

  if (configuredBaseUrl && !isLocalUrl(configuredBaseUrl)) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  if (runtimeOrigin) {
    return runtimeOrigin;
  }

  return undefined;
}

function requireStoreId(storeId: string | undefined) {
  const lojaId = normalizeStoreId(storeId);
  if (!lojaId) {
    throw new Error('Não foi possível identificar a loja atual. Recarregue a página do mercado e tente novamente.');
  }

  return lojaId;
}

function persistUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  return user;
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

  async forgotPassword(email: string, storeId: string | undefined) {
    const lojaId = requireStoreId(storeId);

    return apiRequest<ForgotPasswordResponse>('/auth/forgot-password', {
      method: 'POST',
      body: {
        email,
        userType: 'cliente',
        loja_id: lojaId,
        redirectUrl: (() => {
          const baseUrl = getPasswordResetRedirectBaseUrl();
          return baseUrl ? `${baseUrl}/mercado/${lojaId}/reset-password` : undefined;
        })(),
      } as any,
    });
  },

  async resetPassword(accessToken: string, refreshToken: string | undefined, password: string) {
    return apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: {
        access_token: accessToken,
        refresh_token: refreshToken,
        password,
      } as any,
    });
  },

  async changePassword(password: string) {
    return apiRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: { password } as any,
    });
  },

  async deleteOwnAccount(payload: { password: string; confirmation: string; reason?: string }) {
    return apiRequest<{ message: string; data?: unknown }>('/clientes/me', {
      method: 'DELETE',
      body: payload as any,
    });
  },

  async getCurrentCustomer() {
    const response = await apiRequest<{ data: AuthUser }>('/clientes/me');
    return response.data;
  },

  async updateCurrentCustomer(payload: Partial<Pick<AuthUser, 'cpf' | 'cpf_na_nota_padrao'>>) {
    const response = await apiRequest<{ data: AuthUser }>('/clientes/me', {
      method: 'PUT',
      body: payload,
    });

    return persistUser(response.data);
  },

  persistSession(session: LoginResponse) {
    localStorage.setItem(AUTH_TOKEN_KEY, session.access_token);
    if (session.refresh_token) {
      localStorage.setItem('refresh_token', session.refresh_token);
    } else {
      localStorage.removeItem('refresh_token');
    }
    return persistUser(session.user);
  },

  persistUser(user: AuthUser) {
    return persistUser(user);
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
    clearAuthTokens();
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(AUTH_USER_KEY);
  },
};
