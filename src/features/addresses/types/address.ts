export interface CustomerAddress {
  id: string;
  cliente_id: string;
  apelido?: string | null;
  nome_destinatario?: string | null;
  telefone_destinatario?: string | null;
  cep: string;
  rua: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  ponto_referencia?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  principal: boolean;
}

export interface CustomerAddressPayload {
  apelido?: string | null;
  nome_destinatario?: string | null;
  telefone_destinatario?: string | null;
  cep: string;
  rua: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  ponto_referencia?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  principal?: boolean;
}
