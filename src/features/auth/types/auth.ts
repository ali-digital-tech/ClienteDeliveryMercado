export interface AuthUser {
  id: string;
  nome?: string;
  email: string;
  telefone?: string | null;
  perfil?: string;
  status?: string;
  loja_id?: string | null;
  cliente_id?: string | null;
  permissions?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCustomerPayload {
  nome: string;
  email: string;
  telefone?: string;
  senha: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
