export interface CustomerAddress {
  id: string;
  cliente_id: string;
  apelido?: string | null;
  nome_destinatario?: string | null;
  telefone_destinatario?: string | null;
  cep?: string | null;
  rua: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  ponto_referencia?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  geocoding_provider?: string | null;
  geocoding_source?: 'manual_address' | 'gps' | string | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
  location_type?: string | null;
  coordinates_confirmed?: boolean | null;
  principal: boolean;
}

export interface CustomerAddressPayload {
  apelido?: string | null;
  nome_destinatario?: string | null;
  telefone_destinatario?: string | null;
  cep?: string | null;
  rua: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  ponto_referencia?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocoding_provider?: string | null;
  geocoding_source?: 'manual_address' | 'gps' | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
  location_type?: string | null;
  coordinates_confirmed?: boolean;
  principal?: boolean;
}

export interface GeocodeAddressPayload {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode?: string | null;
  complement?: string | null;
  tenantId?: string | null;
  userId?: string | null;
  customerId?: string | null;
}

export interface GeocodeAddressResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId?: string | null;
  locationType?: string | null;
  geocodingProvider: 'google';
  geocodingSource: 'manual_address';
  coordinatesConfirmed: false;
}
