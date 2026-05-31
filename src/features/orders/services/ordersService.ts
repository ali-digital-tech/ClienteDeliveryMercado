import { apiRequest, getAuthToken, unwrapList } from '@/shared/lib/api';
import { getProductById, mapStoreProduct } from '@/features/products';
import type { Product } from '@/features/products';
import type { Order } from '../types/order';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';

const ORDER_ITEMS_CACHE_KEY = 'cliente_delivery_order_items_by_cart_v1';
const ORDER_ITEMS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface ApiOrder {
  id: string;
  loja_id?: string;
  carrinho_id?: string | null;
  numero_pedido?: string | null;
  status?: string | null;
  tipo_pedido?: string | null;
  subtotal?: string | number | null;
  desconto?: string | number | null;
  taxa_entrega?: string | number | null;
  total?: string | number | null;
  carrinho_quantidade_produtos?: string | number | null;
  cpf_na_nota?: boolean | null;
  cpf_na_nota_cpf?: string | null;
  origem_checkout?: string | null;
  observacoes?: string | null;
  agendado_para?: string | null;
  realizado_em?: string | null;
  criado_em?: string | null;
  confirmado_em?: string | null;
  em_separacao_em?: string | null;
  separacao_em?: string | null;
  pronto_em?: string | null;
  saiu_para_entrega_em?: string | null;
  cancelado_em?: string | null;
  entregue_em?: string | null;
  chave_recebimento?: string | null;
  status_tempos?: Record<string, string | null> | null;
  status_times?: Record<string, string | null> | null;
  endereco_cliente?: {
    rua?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
  entrega?: {
    id?: string;
    status?: string | null;
    saiu_para_entrega_em?: string | null;
    entregue_em?: string | null;
    falhou_em?: string | null;
    observacoes?: string | null;
    entregador?: {
      id?: string;
      nome?: string | null;
      telefone?: string | null;
    } | null;
    automovel?: {
      id?: string;
      tipo?: string | null;
      marca?: string | null;
      modelo?: string | null;
      placa?: string | null;
      cor?: string | null;
      ano?: number | null;
    } | null;
  } | null;
  pagamento?: {
    id: string;
    forma_pagamento?: string | null;
    valor?: string | number | null;
    status?: string | null;
    gateway_pagamento_id?: string | null;
    qr_code?: string | null;
    qr_code_base64?: string | null;
    link_pagamento?: string | null;
    data_expiracao?: string | null;
    pago_em?: string | null;
    criado_em?: string | null;
  } | null;
}

interface ApiCartItem {
  id?: string;
  carrinho_id?: string;
  produto_id?: string;
  quantidade?: string | number | null;
  produto?: any;
  produto_loja?: any;
}

interface CachedOrderItems {
  items: Order['items'];
  updatedAt: number;
}

type OrderItemsCache = Record<string, CachedOrderItems>;

export interface CreateCheckoutOrderInput {
  marketId: string;
  cartId: string;
  addressId?: string | null;
  type: 'delivery' | 'pickup';
  deliveryFee: number;
  couponId?: string | null;
  discount?: number;
  notes?: string;
  cpfNaNota?: boolean;
  cpf?: string | null;
  saveCpfAsDefault?: boolean;
}

function toNumber(value: string | number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getOrderItemsCache(): OrderItemsCache {
  try {
    const stored = localStorage.getItem(ORDER_ITEMS_CACHE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function setOrderItemsCache(cache: OrderItemsCache) {
  localStorage.setItem(ORDER_ITEMS_CACHE_KEY, JSON.stringify(cache));
}

function getOrderItemsCacheKey(order: Order) {
  return `${order.rawId || order.id}:${order.cartId || ''}`;
}

function getCachedOrderItems(order: Order, cache: OrderItemsCache) {
  const cached = cache[getOrderItemsCacheKey(order)];
  if (!cached) return null;

  if (Date.now() - cached.updatedAt > ORDER_ITEMS_CACHE_TTL_MS) {
    return null;
  }

  return cached.items;
}

function saveCachedOrderItems(order: Order, items: Order['items'], cache: OrderItemsCache) {
  cache[getOrderItemsCacheKey(order)] = {
    items,
    updatedAt: Date.now(),
  };
  setOrderItemsCache(cache);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';

  return formatBrasiliaDate(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function mapStatus(status: string | null | undefined): Order['status'] {
  if (status === 'aguardando_pagamento') return 'pendente';
  if (status === 'pendente') return 'recebido';
  if (status === 'recebido') return 'recebido';
  if (status === 'confirmado') return 'confirmado';
  if (status === 'em_separacao' || status === 'preparando') return 'separacao';
  if (status === 'pronto') return 'pronto';
  if (status === 'saiu_para_entrega' || status === 'saiu_entrega' || status === 'em_entrega') return 'saiu';
  if (status === 'entregue') return 'entregue';
  if (status === 'nao_entregue' || status === 'falhou') return 'nao_entregue';
  if (status === 'cancelado' || status === 'cancelada') return 'cancelado';

  return 'recebido';
}

function getStatusTime(order: ApiOrder, ...statuses: string[]) {
  const statusTimes = order.status_tempos || order.status_times || {};

  for (const status of statuses) {
    const value = statusTimes[status];
    if (value) return value;
  }

  return null;
}

function formatAddress(address: ApiOrder['endereco_cliente']) {
  if (!address) return 'Endereço não informado';

  return [address.rua, address.numero, address.bairro, address.cidade, address.estado]
    .filter(Boolean)
    .join(', ');
}

function unwrapCartItems(payload: any): ApiCartItem[] {
  const directItems = unwrapList<ApiCartItem>(payload);
  if (directItems.length > 0) return directItems;

  const data = payload?.data;
  if (Array.isArray(data?.itens)) return data.itens;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(payload?.itens)) return payload.itens;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

async function fetchCartItemsPayload(cartId: string) {
  const attempts = [
    () => apiRequest(`/carrinhos/${cartId}/itens`),
    () => apiRequest('/itens_carrinho', { params: { carrinho_id: cartId, per_page: 100 } }),
  ];

  for (const attempt of attempts) {
    try {
      const response = await attempt();
      const items = unwrapCartItems(response);
      if (items.length > 0) return items;
    } catch (error: any) {
      if (![404, 405].includes(Number(error?.status))) {
        throw error;
      }
    }
  }

  return [];
}

function resolveProductFromCartItem(item: ApiCartItem, marketId: string): Product | null {
  const sourceProduct = item.produto_loja || item.produto;
  if (!sourceProduct || typeof sourceProduct !== 'object') return null;
  if (sourceProduct.loja_id && sourceProduct.loja_id !== marketId) return null;

  return mapStoreProduct({
    ...sourceProduct,
    loja_id: sourceProduct.loja_id || marketId,
    produto_id: sourceProduct.produto_id || item.produto_id || sourceProduct.id,
  });
}

function isSellableStoreProduct(product: Product | null, marketId: string) {
  return Boolean(product && product.marketId === marketId && product.price > 0);
}

async function mapCartItemToOrderItem(item: ApiCartItem, marketId: string): Promise<Order['items'][number] | null> {
  const qty = toNumber(item.quantidade);
  if (qty <= 0) return null;

  const embeddedProduct = resolveProductFromCartItem(item, marketId);
  if (isSellableStoreProduct(embeddedProduct, marketId)) return { product: embeddedProduct as Product, qty };

  if (!item.produto_id) return null;

  try {
    const product = await getProductById(marketId, item.produto_id);
    return isSellableStoreProduct(product, marketId) ? { product: product as Product, qty } : null;
  } catch {
    return null;
  }
}

async function getOrderItemsFromCart(order: Order): Promise<Order['items']> {
  if (!order.cartId || !order.marketId) return [];

  const cartItems = await fetchCartItemsPayload(order.cartId);
  const mappedItems = await Promise.all(
    cartItems.map(item => mapCartItemToOrderItem(item, order.marketId)),
  );

  return mappedItems.filter((item): item is Order['items'][number] => Boolean(item));
}

export async function loadOrderItems(order: Order, options: { forceRefresh?: boolean } = {}): Promise<Order['items']> {
  if (!options.forceRefresh && order.items.length > 0) return order.items;

  const cache = getOrderItemsCache();
  const cachedItems = getCachedOrderItems(order, cache);

  if (!options.forceRefresh && cachedItems) return cachedItems;

  const items = await getOrderItemsFromCart(order);
  saveCachedOrderItems(order, items, cache);

  return items;
}

function mapOrder(order: ApiOrder): Order {
  const subtotal = toNumber(order.subtotal);
  const discount = toNumber(order.desconto);
  const deliveryFee = toNumber(order.taxa_entrega);

  return {
    id: order.numero_pedido ? `#${order.numero_pedido}` : order.id,
    rawId: order.id,
    number: order.numero_pedido || undefined,
    marketId: order.loja_id || '',
    cartId: order.carrinho_id || undefined,
    date: formatDate(order.realizado_em || order.criado_em),
    createdAt: order.realizado_em || order.criado_em || null,
    scheduledFor: order.agendado_para || null,
    confirmedAt: order.confirmado_em || null,
    separationAt: order.em_separacao_em || order.separacao_em || getStatusTime(order, 'em_separacao', 'preparando'),
    readyAt: order.pronto_em || getStatusTime(order, 'pronto'),
    outForDeliveryAt: order.saiu_para_entrega_em || order.entrega?.saiu_para_entrega_em || getStatusTime(order, 'saiu_para_entrega', 'saiu_entrega', 'em_entrega'),
    canceledAt: order.cancelado_em || null,
    deliveredAt: order.entregue_em || order.entrega?.entregue_em || null,
    receiptKey: order.chave_recebimento || null,
    items: [],
    itemCount: toNumber(order.carrinho_quantidade_produtos),
    subtotal,
    discount,
    deliveryFee,
    total: toNumber(order.total),
    isPaid: Boolean(order.pagamento?.pago_em || order.pagamento?.status === 'aprovado'),
    payment: order.pagamento ? {
      id: order.pagamento.id,
      method: order.pagamento.forma_pagamento || '',
      status: order.pagamento.status || '',
      value: toNumber(order.pagamento.valor),
      gatewayPaymentId: order.pagamento.gateway_pagamento_id || null,
      qrCode: order.pagamento.qr_code || null,
      qrCodeBase64: order.pagamento.qr_code_base64 || null,
      paymentLink: order.pagamento.link_pagamento || null,
      expiresAt: order.pagamento.data_expiracao || null,
      paidAt: order.pagamento.pago_em || null,
      createdAt: order.pagamento.criado_em || null,
    } : null,
    status: mapStatus(order.status),
    backendStatus: order.status || undefined,
    address: formatAddress(order.endereco_cliente),
    type: order.tipo_pedido === 'retirada' ? 'pickup' : 'delivery',
    deliveryInfo: order.entrega?.entregador ? {
      status: order.entrega.status || null,
      outForDeliveryAt: order.entrega.saiu_para_entrega_em || null,
      deliveredAt: order.entrega.entregue_em || null,
      failedAt: order.entrega.falhou_em || null,
      failureReason: order.entrega.observacoes || null,
      driver: {
        id: order.entrega.entregador.id,
        name: order.entrega.entregador.nome || null,
        phone: order.entrega.entregador.telefone || null,
      },
      vehicle: order.entrega.automovel ? {
        id: order.entrega.automovel.id,
        type: order.entrega.automovel.tipo || null,
        brand: order.entrega.automovel.marca || null,
        model: order.entrega.automovel.modelo || null,
        plate: order.entrega.automovel.placa || null,
        color: order.entrega.automovel.cor || null,
        year: order.entrega.automovel.ano || null,
      } : null,
    } : null,
    cpfNaNota: Boolean(order.cpf_na_nota),
    cpfNaNotaCpf: order.cpf_na_nota_cpf || null,
    source: order.origem_checkout || null,
    notes: order.observacoes || null,
  };
}

export async function getOrdersByMarketId(marketId: string): Promise<Order[]> {
  if (!getAuthToken()) return [];

  const response = await apiRequest('/pedidos/me');

  return unwrapList<ApiOrder>(response)
    .filter(order => !marketId || order.loja_id === marketId)
    .map(mapOrder);
}

export async function createCheckoutOrder(input: CreateCheckoutOrderInput) {
  const response = await apiRequest<{ data: ApiOrder }>('/pedidos', {
    method: 'POST',
    body: {
      loja_id: input.marketId,
      endereco_cliente_id: input.addressId || null,
      carrinho_id: input.cartId,
      tipo_pedido: input.type === 'pickup' ? 'retirada' : 'entrega',
      taxa_entrega: input.deliveryFee,
      cupom_id: input.couponId || null,
      desconto: input.discount || 0,
      origem_checkout: 'app',
      observacoes: input.notes || null,
      cpfNaNota: input.cpfNaNota || false,
      cpf: input.cpf || null,
      saveCpfAsDefault: input.saveCpfAsDefault || false,
    },
  });

  return response.data;
}
