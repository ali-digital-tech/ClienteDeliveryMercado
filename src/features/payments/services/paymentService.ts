import { apiRequest } from '@/shared/lib/api';

const PAYMENT_SELECTION_STORAGE_KEY = 'cliente_delivery_payment_selection';
const PAYER_STORAGE_KEY = 'cliente_delivery_payer_data';
const CARD_TOKEN_TTL_MS = 20 * 60 * 1000;
const MERCADO_PAGO_SECURITY_SCRIPT_URL = 'https://www.mercadopago.com/v2/security.js';
const MERCADO_PAGO_DEVICE_ID_TIMEOUT_MS = 3000;
const MERCADO_PAGO_DEVICE_ID_POLL_MS = 100;

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
  gateway?: 'mercadopago' | 'pagarme';
  pagamento_entrega_tipo?: 'dinheiro' | 'cartao';
  sem_troco?: boolean;
  troco_para?: number | null;
  card_token?: string;
  card_token_created_at?: number;
  saved_card_id?: string;
  gateway_card_id?: string;
  gateway_customer_id?: string;
  payment_method_id?: string;
  card_bin?: string;
  issuer_id?: string | number | null;
  installments?: number;
  idempotency_key?: string;
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
  gateway: 'mercadopago' | 'pagarme';
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
  capabilities?: {
    pix: boolean;
    credit_card: boolean;
    debit_card: boolean;
    saved_cards: boolean;
    platform_split: boolean;
  };
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
    pago_em?: string | null;
    sem_troco?: boolean | null;
    troco_para?: string | number | null;
    troco_valor?: string | number | null;
    pagamento_entrega_tipo?: 'dinheiro' | 'cartao' | string | null;
  };
  mp_payment_id: string | number;
  provider_payment_id?: string | number;
  provider_order_id?: string | number;
  status: string;
  status_detail?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  ticket_url?: string | null;
  date_of_expiration?: string | null;
  three_ds_info?: {
    external_resource_url: string;
    creq: string;
  } | null;
  requires_3ds_challenge?: boolean | null;
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
  pagamento_entrega_tipo?: 'dinheiro' | 'cartao' | string | null;
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

export function createPaymentAttemptKey(prefix = 'card', pedidoId?: string) {
  const randomId = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return pedidoId ? `${prefix}-${pedidoId}-${randomId}` : `${prefix}-${randomId}`;
}

export function loadMercadoPagoSecurityScript() {
  if (typeof document === 'undefined') return Promise.resolve();

  const currentDeviceId = getMercadoPagoDeviceId();
  if (currentDeviceId) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${MERCADO_PAGO_SECURITY_SCRIPT_URL}"]`
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Não foi possível carregar a validação de segurança do Mercado Pago.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MERCADO_PAGO_SECURITY_SCRIPT_URL;
    script.async = true;
    script.setAttribute('view', 'checkout');
    script.setAttribute('output', 'MP_DEVICE_SESSION_ID');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível carregar a validação de segurança do Mercado Pago.'));
    document.head.appendChild(script);
  });
}

export function getMercadoPagoDeviceId() {
  if (typeof window === 'undefined') return undefined;
  const globalWindow = window as Window & {
    MP_DEVICE_SESSION_ID?: string;
    deviceId?: string;
  };
  const hiddenInput = typeof document !== 'undefined'
    ? document.getElementById('deviceId') as HTMLInputElement | null
    : null;
  const deviceId = String(globalWindow.MP_DEVICE_SESSION_ID || globalWindow.deviceId || hiddenInput?.value || '').trim();
  return deviceId || undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function waitForMercadoPagoDeviceId(timeoutMs = MERCADO_PAGO_DEVICE_ID_TIMEOUT_MS) {
  if (typeof window === 'undefined') return undefined;

  await loadMercadoPagoSecurityScript();

  const startedAt = Date.now();
  let deviceId = getMercadoPagoDeviceId();

  while (!deviceId && Date.now() - startedAt < timeoutMs) {
    await sleep(MERCADO_PAGO_DEVICE_ID_POLL_MS);
    deviceId = getMercadoPagoDeviceId();
  }

  return deviceId;
}

export async function requireMercadoPagoDeviceId() {
  const deviceId = await waitForMercadoPagoDeviceId();

  if (!deviceId) {
    throw new Error('Não foi possível validar a segurança do dispositivo. Recarregue a página e tente novamente.');
  }

  return deviceId;
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

export function stripPaymentAttemptData(selection: StoredPaymentSelection): StoredPaymentSelection {
  const {
    card_token,
    card_token_created_at,
    idempotency_key,
    ...stableSelection
  } = selection;

  return stableSelection;
}

export function hasFreshCardToken(selection: StoredPaymentSelection) {
  if (!selection.card_token || !selection.card_token_created_at) return false;
  return Date.now() - selection.card_token_created_at < CARD_TOKEN_TTL_MS;
}

function isPaymentAttemptTerminal(result: MercadoPagoPaymentResult) {
  const status = String(result.payment?.status || result.status || '').trim().toLowerCase();
  return [
    'aprovado',
    'approved',
    'paid',
    'authorized',
    'rejeitado',
    'rejected',
    'refused',
    'denied',
    'failed',
    'cancelado',
    'cancelled',
    'canceled',
    'expirado',
    'expired',
    'estornado',
    'refunded',
    'charged_back',
  ].includes(status);
}

export function getCardPaymentStatusMessage(status?: string | null, statusDetail?: string | null) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedDetail = String(statusDetail || '').trim().toLowerCase();

  if (['aprovado', 'approved', 'paid', 'authorized'].includes(normalizedStatus)) {
    return 'Pagamento aprovado.';
  }

  if (['rejeitado', 'rejected', 'cancelado', 'cancelled', 'failed'].includes(normalizedStatus)) {
    if (normalizedDetail.includes('cc_rejected_bad_filled_security_code')) {
      return 'Pagamento recusado: o codigo de seguranca do cartao esta incorreto. Confira o CVV e tente novamente.';
    }
    if (normalizedDetail.includes('cc_rejected_bad_filled_date')) {
      return 'Pagamento recusado: confira a validade do cartao.';
    }
    if (normalizedDetail.includes('cc_rejected_bad_filled_card_number')) {
      return 'Pagamento recusado: confira o numero do cartao.';
    }
    if (normalizedDetail.includes('cc_rejected_high_risk')) {
      return 'Pagamento recusado na validacao de seguranca. Confira o CVV e os dados do cartao; se estiverem corretos, aguarde alguns minutos ou use PIX/outro cartao.';
    }
    if (normalizedDetail.includes('cc_rejected_insufficient_amount')) {
      return 'Pagamento recusado: limite ou saldo insuficiente no cartão.';
    }
    if (normalizedDetail.includes('cc_rejected_bad_filled')) {
      return 'Pagamento recusado: confira os dados do cartão.';
    }
    if (normalizedDetail.includes('cc_rejected_call_for_authorize')) {
      return 'Pagamento recusado: autorize a compra com o banco emissor do cartão.';
    }
    return 'Pagamento recusado. Escolha outro cartão ou tente novamente mais tarde.';
  }

  if (['pendente', 'pending', 'em_processamento', 'in_process', 'processing'].includes(normalizedStatus)) {
    return 'Pagamento em análise. A confirmação final será atualizada automaticamente.';
  }

  return 'Pagamento ainda não aprovado. Confira a forma de pagamento e tente novamente.';
}

export function isCardPaymentCorrectionRequired(status?: string | null, statusDetail?: string | null) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedDetail = String(statusDetail || '').trim().toLowerCase();

  if (!['rejeitado', 'rejected', 'cancelado', 'cancelled', 'failed'].includes(normalizedStatus)) {
    return false;
  }

  return [
    'cc_rejected_bad_filled_security_code',
    'cc_rejected_bad_filled_card_number',
    'cc_rejected_bad_filled_date',
    'cc_rejected_bad_filled_other',
  ].some((detail) => normalizedDetail.includes(detail));
}

export function getCardPaymentCorrectionMessage(statusDetail?: string | null) {
  const normalizedDetail = String(statusDetail || '').trim().toLowerCase();

  if (normalizedDetail.includes('cc_rejected_bad_filled_security_code')) {
    return 'CVV inválido. Informe novamente o código de segurança do cartão.';
  }

  if (normalizedDetail.includes('cc_rejected_bad_filled_card_number')) {
    return 'Dados do cartão inválidos. Informe o CVV novamente; se continuar, cadastre o cartão de novo.';
  }

  if (normalizedDetail.includes('cc_rejected_bad_filled_date')) {
    return 'Validade do cartão inválida. Confira o cartão antes de tentar novamente.';
  }

  return 'Confira os dados do cartão antes de tentar novamente.';
}

export function isRecoverableCardRejection(
  method?: string | null,
  status?: string | null,
  statusDetail?: string | null
) {
  const normalizedMethod = String(method || '').trim().toLowerCase();
  const normalizedStatus = String(status || '').trim().toLowerCase();

  return ['cartao_credito', 'cartao_debito'].includes(normalizedMethod)
    && ['rejeitado', 'rejected', 'cancelado', 'cancelled', 'failed'].includes(normalizedStatus)
    && !isCardPaymentCorrectionRequired(normalizedStatus, statusDetail);
}

export function isThreeDsChallengeRequired(result?: MercadoPagoPaymentResult | null) {
  return Boolean(
    result?.requires_3ds_challenge ||
    (
      result?.status === 'pending' &&
      result?.status_detail === 'pending_challenge' &&
      result?.three_ds_info?.external_resource_url &&
      result?.three_ds_info?.creq
    )
  );
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
    `/payment-gateways/checkout-config/${marketId}`
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
    '/payment-gateways/payment/pix',
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

export async function createPaymentOnDelivery(
  pedidoId: string,
  selection: Pick<StoredPaymentSelection, 'sem_troco' | 'troco_para' | 'pagamento_entrega_tipo'>
): Promise<MercadoPagoPaymentResult> {
  const response = await apiRequest<{ data: LocalPayment }>('/pagamentos/entrega', {
    method: 'POST',
    body: {
      pedido_id: pedidoId,
      pagamento_entrega_tipo: selection.pagamento_entrega_tipo || 'dinheiro',
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
      pago_em: payment.pago_em || null,
      sem_troco: payment.sem_troco ?? null,
      troco_para: payment.troco_para ?? null,
      troco_valor: payment.troco_valor ?? null,
      pagamento_entrega_tipo: payment.pagamento_entrega_tipo ?? null,
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
  await apiRequest(`/payment-gateways/payment/${paymentId}/status`);
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
  const idempotencyKey = selection.idempotency_key || createPaymentAttemptKey(
    selection.saved_card_id ? 'saved-card' : 'card',
    pedidoId
  );
  const attemptSelection = { ...selection, idempotency_key: idempotencyKey };
  savePaymentSelection(attemptSelection);

  const deviceId = selection.gateway === 'pagarme'
    ? undefined
    : await requireMercadoPagoDeviceId();

  if (selection.saved_card_id) {
    if (!hasFreshCardToken(selection)) {
      throw new Error('Informe o CVV do cartão salvo antes de continuar.');
    }

    const response = await apiRequest<{ data: MercadoPagoPaymentResult }>(
      '/payment-gateways/payment/saved-card',
      {
        method: 'POST',
        body: {
          pedido_id: pedidoId,
          saved_card_id: selection.saved_card_id,
          security_code_token: selection.card_token,
          installments: selection.installments || 1,
          idempotency_key: idempotencyKey,
          device_id: deviceId,
          authentication_type: 'WEB',
          ...payer,
        },
      }
    );

    if (isPaymentAttemptTerminal(response.data)) {
      savePaymentSelection(stripPaymentAttemptData(attemptSelection));
    }

    return response.data;
  }

  if (!hasFreshCardToken(selection) || !selection.payment_method_id) {
    throw new Error('Confirme os dados do cartão antes de continuar.');
  }

  const response = await apiRequest<{ data: MercadoPagoPaymentResult }>(
    '/payment-gateways/payment/card',
    {
      method: 'POST',
      body: {
        pedido_id: pedidoId,
        forma_pagamento: selection.method,
        card_token: selection.card_token,
        payment_method_id: selection.payment_method_id,
        card_bin: selection.card_bin,
        issuer_id: selection.issuer_id ?? null,
        installments: selection.installments || 1,
        idempotency_key: idempotencyKey,
        device_id: deviceId,
        authentication_type: 'WEB',
        ...payer,
      },
    }
  );

  if (isPaymentAttemptTerminal(response.data)) {
    savePaymentSelection(stripPaymentAttemptData(attemptSelection));
  }

  return response.data;
}

export interface PagarmeCardData {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
}

export async function tokenizePagarmeCard(publicKey: string, card: PagarmeCardData) {
  if (!publicKey) throw new Error('Chave pública Pagar.me não configurada.');
  const baseUrl = publicKey.startsWith('pk_test_')
    ? 'https://sdx-api.pagar.me/core/v5'
    : 'https://api.pagar.me/core/v5';
  const response = await fetch(`${baseUrl}/tokens?appId=${encodeURIComponent(publicKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'card', card }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.message || payload?.errors?.[0]?.message || 'Não foi possível validar o cartão no Pagar.me.');
  }
  return {
    id: String(payload.id),
    last_four_digits: payload.card?.last_four_digits || card.number.replace(/\D/g, '').slice(-4),
    payment_method_id: String(payload.card?.brand || 'card').toLowerCase(),
  };
}
