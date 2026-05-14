import type { CustomerAddress } from '../types/address';

export function toCoordinate(value: CustomerAddress['latitude']) {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatAddressLine(address: CustomerAddress) {
  return [address.rua, address.numero].filter(Boolean).join(', ');
}

export function formatAddressLocation(address: CustomerAddress) {
  return [address.bairro, `${address.cidade} - ${address.estado}`].filter(Boolean).join(' · ');
}

export function formatFullAddress(address: CustomerAddress) {
  return [
    formatAddressLine(address),
    address.complemento,
    formatAddressLocation(address),
    address.cep,
  ].filter(Boolean).join(' · ');
}

export function getAddressCoordinates(address: CustomerAddress) {
  const latitude = toCoordinate(address.latitude);
  const longitude = toCoordinate(address.longitude);

  if (latitude === null || longitude === null) return null;

  return { latitude, longitude };
}

export function buildGoogleMapsSearchUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function buildGoogleMapsEmbedUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}&z=17&output=embed`;
}
