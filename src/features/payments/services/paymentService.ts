import { apiRequest } from '@/shared/lib/api';

const PAYMENT_SELECTION_STORAGE_KEY = 'cliente_delivery_payment_selection';
const PAYER_STORAGE_KEY = 'cliente_delivery_payer_data';
export const PIX_PAYMENT_WINDOW_MS = 5 * 60 * 1000;

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito';

export interface PayerData {
  payer_email: string;
  payer_first_name: string;
  payer_last_name: string;
  doc_type: 'CPF' | 'CNPJ';
  doc_number: string;
}

export type PayerValidationErrors = Partial<Record<keyof PayerData | 'full_name', string>>;

export interface StoredPaymentSelection {
  method: PaymentMethod;
  card_token?: string;
  payment_method_id?: string;
  issuer_id?: string | number | null;
  installments?: number;
  cardholder_name?: string;
  last_four_digits?: string;
}

export interface MercadoPagoCheckoutConfig {
  public_key: string;
  connected: boolean;
  onboarding_status?: string | null;
  status?: string | null;
}

export interface MercadoPagoPaymentResult {
  payment: {
    id: string;
    pedido_id: string;
    status: string;
    forma_pagamento: string;
    valor: string | number;
    gateway_pagamento_id?: string | null;
  };
  mp_payment_id: string | number;
  status: string;
  status_detail?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  ticket_url?: string | null;
  date_of_expiration?: string | null;
}

export interface LocalPayment {
  id: string;
  pedido_id: string;
  status: string;
  forma_pagamento: string;
  valor: string | number;
  gateway?: string | null;
  gateway_pagamento_id?: string | null;
  pago_em?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  link_pagamento?: string | null;
  data_expiracao?: string | null;
  criado_em?: string | null;
  status_detalhado?: string | null;
  status_gateway_raw?: string | null;
}

export function resolvePixExpiration(
  expiresAt?: string | null,
  createdAt?: string | null,
  fallbackIssuedAt = Date.now(),
) {
  const providerExpiration = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  const parsedCreatedAt = createdAt ? new Date(createdAt).getTime() : Number.NaN;
  const issuedAt = Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : fallbackIssuedAt;
  const appExpiration = issuedAt + PIX_PAYMENT_WINDOW_MS;
  const expiration = Number.isFinite(providerExpiration)
    ? Math.min(providerExpiration, appExpiration)
    : appExpiration;

  return new Date(expiration).toISOString();
}

export function onlyDigits(value: string | number | null | undefined) {
  return String(value || '').replace(/\D/g, '');
}

export function splitPayerFullName(name?: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

export function getPayerFullName(payer: Partial<PayerData>) {
  return [payer.payer_first_name, payer.payer_last_name].filter(Boolean).join(' ').trim();
}

export function normalizePayerData(payer: Partial<PayerData>): PayerData {
  return {
    payer_email: String(payer.payer_email || '').trim(),
    payer_first_name: String(payer.payer_first_name || '').trim(),
    payer_last_name: String(payer.payer_last_name || '').trim(),
    doc_type: payer.doc_type === 'CNPJ' ? 'CNPJ' : 'CPF',
    doc_number: onlyDigits(payer.doc_number),
  };
}

export function validatePayerData(payer: Partial<PayerData>) {
  const data = normalizePayerData(payer);
  const errors: PayerValidationErrors = {};
  const fullName = getPayerFullName(data);
  const expectedDocumentLength = data.doc_type === 'CPF' ? 11 : 14;

  if (!data.payer_first_name || !data.payer_last_name) {
    errors.full_name = 'Informe nome e sobrenome.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.payer_email)) {
    errors.payer_email = 'Informe um e-mail válido.';
  }

  if (data.doc_number.length !== expectedDocumentLength) {
    errors.doc_number = `Informe um ${data.doc_type} com ${expectedDocumentLength} dígitos.`;
  }

  return {
    data,
    errors,
    fullName,
    isValid: Object.keys(errors).length === 0,
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function getStoredPaymentSelection(): StoredPaymentSelection {
  return readJson<StoredPaymentSelection>(PAYMENT_SELECTION_STORAGE_KEY, { method: 'pix' });
}

export function savePaymentSelection(selection: StoredPaymentSelection) {
  localStorage.setItem(PAYMENT_SELECTION_STORAGE_KEY, JSON.stringify(selection));
}

export function getStoredPayerData(): Partial<PayerData> {
  return readJson<Partial<PayerData>>(PAYER_STORAGE_KEY, {});
}

export function savePayerData(data: PayerData) {
  localStorage.setItem(PAYER_STORAGE_KEY, JSON.stringify(data));
}

export async function getMercadoPagoCheckoutConfig(marketId: string) {
  const response = await apiRequest<{ data: MercadoPagoCheckoutConfig }>(
    `/mercadopago/checkout-config/${marketId}`
  );

  return response.data;
}

export async function createPixPayment(pedidoId: string, payer: PayerData) {
  const response = await apiRequest<{ data: MercadoPagoPaymentResult }>(
    '/mercadopago/payment/pix',
    {
      method: 'POST',
      body: {
        pedido_id: pedidoId,
        ...payer,
      },
    }
  );

  return response.data;
}

export async function getPaymentById(paymentId: string) {
  const response = await apiRequest<{ data: LocalPayment }>(`/pagamentos/${paymentId}`);

  return response.data;
}

export async function refreshPaymentById(paymentId: string) {
  await apiRequest(`/mercadopago/payment/${paymentId}/status`);
  return getPaymentById(paymentId);
}

export async function cancelPayment(paymentId: string) {
  const response = await apiRequest<{ data: LocalPayment }>(`/pagamentos/${paymentId}/cancelar`, {
    method: 'PATCH',
  });

  return response.data;
}

export async function createCardPayment(
  pedidoId: string,
  payer: PayerData,
  selection: StoredPaymentSelection
) {
  if (!selection.card_token || !selection.payment_method_id) {
    throw new Error('Confirme os dados do cartão antes de continuar.');
  }

  const response = await apiRequest<{ data: MercadoPagoPaymentResult }>(
    '/mercadopago/payment/card',
    {
      method: 'POST',
      body: {
        pedido_id: pedidoId,
        forma_pagamento: selection.method,
        card_token: selection.card_token,
        payment_method_id: selection.payment_method_id,
        issuer_id: selection.issuer_id ?? null,
        installments: selection.installments || 1,
        ...payer,
      },
    }
  );

  return response.data;
}
