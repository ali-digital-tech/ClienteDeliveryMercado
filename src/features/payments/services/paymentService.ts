import { apiRequest } from '@/shared/lib/api';

const PAYMENT_SELECTION_STORAGE_KEY = 'cliente_delivery_payment_selection';
const PAYER_STORAGE_KEY = 'cliente_delivery_payer_data';
const CARD_TOKEN_TTL_MS = 20 * 60 * 1000;

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
export type CardPaymentMethod = Exclude<PaymentMethod, 'pix' | 'dinheiro'>;

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
  sem_troco?: boolean;
  troco_para?: number | null;
  card_token?: string;
  card_token_created_at?: number;
  saved_card_id?: string;
  gateway_card_id?: string;
  gateway_customer_id?: string;
  payment_method_id?: string;
  issuer_id?: string | number | null;
  installments?: number;
  cardholder_name?: string;
  last_four_digits?: string;
}

export interface SavedPaymentCard {
  id: string;
  loja_id: string;
  forma_pagamento: CardPaymentMethod;
  payment_method_id: string;
  issuer_id?: string | number | null;
  bandeira?: string | null;
  ultimos_quatro: string;
  nome_impresso?: string | null;
  mes_expiracao?: number | null;
  ano_expiracao?: number | null;
  principal?: boolean;
  gateway_card_id: string;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface MercadoPagoCheckoutConfig {
  public_key: string;
  connected: boolean;
  onboarding_status?: string | null;
  status?: string | null;
  platform_split?: {
    regra_split_id?: string | null;
    tipo_valor?: 'percentual' | 'fixo' | 'restante' | string | null;
    valor?: number | string | null;
    percentual?: number | string | null;
  } | null;
}

export type PlatformSplitConfig = NonNullable<MercadoPagoCheckoutConfig['platform_split']>;

export interface MercadoPagoPaymentResult {
  payment: {
    id: string;
    pedido_id: string;
    status: string;
    forma_pagamento: string;
    valor: string | number;
    application_fee?: string | number | null;
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
  application_fee?: string | number | null;
  sem_troco?: boolean | null;
  troco_para?: string | number | null;
  troco_valor?: string | number | null;
}

function normalizeAmount(value: string | number | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function calculatePlatformServiceFee(
  totalAmount: number,
  platformSplit?: PlatformSplitConfig | null,
) {
  const amount = Math.max(0, normalizeAmount(totalAmount));
  if (amount <= 0 || !platformSplit) return 0;

  const value = normalizeAmount(platformSplit.valor);
  let fee = 0;

  if (platformSplit.tipo_valor === 'percentual') {
    const percent = normalizeAmount(platformSplit.percentual ?? platformSplit.valor);
    fee = (amount * percent) / 100;
  } else if (platformSplit.tipo_valor === 'fixo') {
    fee = value;
  }

  const normalizedFee = Number(fee.toFixed(2));
  return Math.max(0, Math.min(normalizedFee, amount));
}

export function resolvePixExpiration(
  expiresAt?: string | null,
  _createdAt?: string | null,
) {
  const providerExpiration = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  return Number.isFinite(providerExpiration)
    ? new Date(providerExpiration).toISOString()
    : null;
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

export function hasFreshCardToken(selection: StoredPaymentSelection) {
  if (!selection.card_token || !selection.card_token_created_at) return false;
  return Date.now() - selection.card_token_created_at < CARD_TOKEN_TTL_MS;
}

export function getStoredPayerData(): Partial<PayerData> {
  return readJson<Partial<PayerData>>(PAYER_STORAGE_KEY, {});
}

export function savePayerData(data: PayerData) {
  localStorage.setItem(PAYER_STORAGE_KEY, JSON.stringify(data));
}

export function selectionFromSavedCard(card: SavedPaymentCard): StoredPaymentSelection {
  return {
    method: card.forma_pagamento,
    saved_card_id: card.id,
    gateway_card_id: card.gateway_card_id,
    payment_method_id: card.payment_method_id,
    issuer_id: card.issuer_id ?? null,
    installments: card.forma_pagamento === 'cartao_debito' ? 1 : 1,
    cardholder_name: card.nome_impresso || undefined,
    last_four_digits: card.ultimos_quatro,
  };
}

export async function getMercadoPagoCheckoutConfig(marketId: string) {
  const response = await apiRequest<{ data: MercadoPagoCheckoutConfig }>(
    `/mercadopago/checkout-config/${marketId}`
  );

  return response.data;
}

export async function getSavedPaymentCards(marketId: string) {
  const response = await apiRequest<{ data: SavedPaymentCard[] }>(
    `/mercadopago/customer/cards?loja_id=${encodeURIComponent(marketId)}`
  );

  return response.data || [];
}

export async function saveCustomerPaymentCard(
  marketId: string,
  payer: PayerData,
  selection: StoredPaymentSelection,
  options?: { formas_pagamento?: CardPaymentMethod[] }
) {
  if (!selection.card_token || !selection.payment_method_id) {
    throw new Error('Confirme os dados do cartão antes de salvar.');
  }

  const response = await apiRequest<{ data: SavedPaymentCard }>('/mercadopago/customer/cards', {
    method: 'POST',
    body: {
      loja_id: marketId,
      card_token: selection.card_token,
      forma_pagamento: selection.method,
      formas_pagamento: options?.formas_pagamento,
      payment_method_id: selection.payment_method_id,
      issuer_id: selection.issuer_id ?? null,
      cardholder_name: selection.cardholder_name,
      last_four_digits: selection.last_four_digits,
      ...payer,
    },
  });

  return response.data;
}

export async function removeCustomerPaymentCard(cardId: string) {
  const response = await apiRequest<{ data: SavedPaymentCard }>(
    `/mercadopago/customer/cards/${cardId}`,
    { method: 'DELETE' }
  );

  return response.data;
}

export async function setPrincipalCustomerPaymentCard(cardId: string) {
  const response = await apiRequest<{ data: SavedPaymentCard }>(
    `/mercadopago/customer/cards/${cardId}/principal`,
    { method: 'PATCH' }
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

export async function createCashPayment(
  pedidoId: string,
  selection: StoredPaymentSelection
): Promise<MercadoPagoPaymentResult> {
  const response = await apiRequest<{ data: LocalPayment }>('/pagamentos/dinheiro', {
    method: 'POST',
    body: {
      pedido_id: pedidoId,
      sem_troco: selection.sem_troco !== false,
      troco_para: selection.sem_troco === false ? selection.troco_para ?? null : null,
    },
  });
  const payment = response.data;

  return {
    payment: {
      id: payment.id,
      pedido_id: payment.pedido_id,
      status: payment.status,
      forma_pagamento: payment.forma_pagamento,
      valor: payment.valor,
      application_fee: payment.application_fee || 0,
      gateway_pagamento_id: payment.gateway_pagamento_id || null,
    },
    mp_payment_id: payment.id,
    status: payment.status,
    status_detail: null,
    qr_code: null,
    qr_code_base64: null,
    ticket_url: null,
    date_of_expiration: null,
  };
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
  if (selection.saved_card_id) {
    if (!hasFreshCardToken(selection)) {
      throw new Error('Informe o CVV do cartão salvo antes de continuar.');
    }

    const response = await apiRequest<{ data: MercadoPagoPaymentResult }>(
      '/mercadopago/payment/saved-card',
      {
        method: 'POST',
        body: {
          pedido_id: pedidoId,
          saved_card_id: selection.saved_card_id,
          security_code_token: selection.card_token,
          installments: selection.installments || 1,
          ...payer,
        },
      }
    );

    return response.data;
  }

  if (!hasFreshCardToken(selection) || !selection.payment_method_id) {
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
