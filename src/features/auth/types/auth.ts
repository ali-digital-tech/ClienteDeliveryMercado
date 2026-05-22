export interface AuthUser {
  id: string;
  nome?: string;
  email: string;
  telefone?: string | null;
  cpf?: string | null;
  cpf_na_nota_padrao?: boolean;
  perfil?: string;
  status?: string;
  loja_id?: string | null;
  cliente_id?: string | null;
  permissions?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  loja_id?: string;
}

export interface RegisterCustomerPayload {
  nome: string;
  email: string;
  telefone?: string;
  senha: string;
  loja_id?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user: AuthUser;
}

export interface ForgotPasswordResponse {
  message: string;
  reset_url?: string;
  reset_token?: string;
}
