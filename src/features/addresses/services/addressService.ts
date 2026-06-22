import { apiRequest, unwrapList } from '@/shared/lib/api';
import type {
  CustomerAddress,
  CustomerAddressPayload,
  GeocodeAddressPayload,
  GeocodeAddressResult,
} from '../types/address';

export interface DeliveryArea {
  id: string;
  bairro: string | null;
  nome: string;
  taxa_entrega: string | number;
  tempo_estimado_minutos: number;
}

const SELECTED_ADDRESS_STORAGE_KEY = 'cliente_delivery_selected_address_by_market';

function readSelectedAddressMap(): Record<string, string> {
  try {
    const stored = localStorage.getItem(SELECTED_ADDRESS_STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );
  } catch {
    return {};
  }
}

function writeSelectedAddressMap(selectedByMarket: Record<string, string>) {
  localStorage.setItem(SELECTED_ADDRESS_STORAGE_KEY, JSON.stringify(selectedByMarket));
}

export function getSelectedAddressId(marketId: string) {
  return readSelectedAddressMap()[marketId] || null;
}

export function setSelectedAddressId(marketId: string, addressId: string) {
  writeSelectedAddressMap({
    ...readSelectedAddressMap(),
    [marketId]: addressId,
  });
}

export function resolveSelectedAddress(marketId: string, addresses: CustomerAddress[]) {
  const selectedId = getSelectedAddressId(marketId);
  return (
    addresses.find(address => address.id === selectedId) ||
    addresses.find(address => address.principal) ||
    addresses[0] ||
    null
  );
}

export async function getMyAddresses() {
  const response = await apiRequest('/enderecos_cliente/me');
  return unwrapList<CustomerAddress>(response);
}

export async function getDeliveryAreas(marketId: string) {
  const response = await apiRequest(`/lojas/${marketId}/areas-entrega`);
  return unwrapList<DeliveryArea>(response)
    .map((area) => ({ ...area, bairro: (area.bairro || area.nome || '').trim() }))
    .filter((area) => Boolean(area.bairro));
}

export async function createAddress(payload: CustomerAddressPayload) {
  const response = await apiRequest<{ data: CustomerAddress }>('/enderecos_cliente', {
    method: 'POST',
    body: payload as any,
  });

  return response.data;
}

export async function geocodeAddress(payload: GeocodeAddressPayload) {
  const response = await apiRequest<{ data: GeocodeAddressResult }>('/geocode-address', {
    method: 'POST',
    body: payload as any,
  });

  return response.data;
}

export async function setAddressAsPrimary(addressId: string) {
  const response = await apiRequest<{ data: CustomerAddress }>(`/enderecos_cliente/${addressId}/principal`, {
    method: 'PATCH',
    body: { principal: true },
  });

  return response.data;
}

export async function deleteAddress(addressId: string) {
  await apiRequest(`/enderecos_cliente/${addressId}`, {
    method: 'DELETE',
  });
}

export async function lookupCep(cep: string) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) return null;

  const payload = await response.json();
  if (payload?.erro) return null;

  return {
    cep: payload.cep as string,
    rua: (payload.logradouro || '') as string,
    bairro: (payload.bairro || '') as string,
    cidade: (payload.localidade || '') as string,
    estado: (payload.uf || '') as string,
  };
}

export async function reverseGeocode(lat: number, lon: number) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload?.address) return null;

    const address = payload.address;
    
    // Attempt to extract UF from ISO3166-2-lvl4 (e.g. "BR-SP" -> "SP")
    let uf = '';
    if (address['ISO3166-2-lvl4']) {
      uf = address['ISO3166-2-lvl4'].split('-')[1] || '';
    }

    return {
      cep: (address.postcode || '').replace(/\D/g, ''),
      rua: (address.road || address.pedestrian || ''),
      bairro: (address.suburb || address.neighbourhood || ''),
      cidade: (address.city || address.town || address.village || address.municipality || ''),
      estado: uf || address.state || '',
    };
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}
