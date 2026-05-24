import { apiRequest } from '@/shared/lib/api';

const PAYMENT_SELECTION_STORAGE_KEY = 'cliente_delivery_payment_selection';
const PAYER_STORAGE_KEY = 'cliente_delivery_payer_data';

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito';

export interface PayerData {
  payer_email: string;
  payer_first_name: string;
  payer_last_name: string;
  doc_type: 'CPF' | 'CNPJ';
  doc_number: string;
}

export interface StoredPaymentSelection {
  method: PaymentMethod;
  card_token?: string;
  payment_method_id?: string;
  issuer_id?: string | number | null;
  installments?: number;
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
  status_detalhado?: string | null;
  status_gateway_raw?: string | null;
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
