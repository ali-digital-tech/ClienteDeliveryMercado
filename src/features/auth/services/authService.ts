import { apiRequest } from '@/shared/lib/api';
import type { AuthUser, LoginCredentials, LoginResponse, RegisterCustomerPayload } from '../types/auth';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';

export const authService = {
  async login(credentials: LoginCredentials) {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
        userType: 'cliente',
      } as any,
    });
  },

  async registerCustomer(payload: RegisterCustomerPayload) {
    return apiRequest('/clientes', {
      method: 'POST',
      body: payload as any,
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
