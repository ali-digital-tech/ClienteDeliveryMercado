import { apiRequest, getAuthToken, unwrapList } from '@/shared/lib/api';
import { getProductById, mapStoreProduct } from '@/features/products';
import type { Product } from '@/features/products';
import type { Order } from '../types/order';

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
  cpf_na_nota?: boolean | null;
  cpf_na_nota_cpf?: string | null;
  origem_checkout?: string | null;
  observacoes?: string | null;
  realizado_em?: string | null;
  criado_em?: string | null;
  confirmado_em?: string | null;
  cancelado_em?: string | null;
  entregue_em?: string | null;
  endereco_cliente?: {
    rua?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
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
  addressId: string;
  type: 'delivery' | 'pickup';
  deliveryFee: number;
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

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function mapStatus(status: string | null | undefined): Order['status'] {
  if (status === 'pendente' || status === 'aguardando_pagamento') return 'pendente';
  if (status === 'recebido') return 'recebido';
  if (status === 'confirmado') return 'confirmado';
  if (status === 'em_separacao' || status === 'preparando') return 'separacao';
  if (status === 'saiu_entrega' || status === 'em_entrega') return 'saiu';
  if (status === 'entregue') return 'entregue';
  if (status === 'cancelado' || status === 'cancelada') return 'cancelado';

  return 'recebido';
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
    () => apiRequest(`/itens_carrinho/carrinho/${cartId}`),
    () => apiRequest('/itens_carrinho', { params: { carrinho_id: cartId } }),
    () => apiRequest(`/carrinhos/${cartId}/itens`),
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

  return mapStoreProduct({
    ...sourceProduct,
    loja_id: sourceProduct.loja_id || marketId,
    produto_id: sourceProduct.produto_id || item.produto_id || sourceProduct.id,
  });
}

async function mapCartItemToOrderItem(item: ApiCartItem, marketId: string): Promise<Order['items'][number] | null> {
  const qty = toNumber(item.quantidade);
  if (qty <= 0) return null;

  const embeddedProduct = resolveProductFromCartItem(item, marketId);
  if (embeddedProduct) return { product: embeddedProduct, qty };

  if (!item.produto_id) return null;

  try {
    const product = await getProductById(marketId, item.produto_id);
    return product ? { product, qty } : null;
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

async function hydrateOrderItems(orders: Order[]) {
  const cache = getOrderItemsCache();

  return Promise.all(
    orders.map(async (order) => {
      if (!order.cartId) return order;

      const cachedItems = getCachedOrderItems(order, cache);
      if (cachedItems) return { ...order, items: cachedItems };

      try {
        const items = await getOrderItemsFromCart(order);
        saveCachedOrderItems(order, items, cache);
        return { ...order, items };
      } catch (error) {
        console.error('Erro ao carregar itens do carrinho do pedido', error);
        return order;
      }
    }),
  );
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
    confirmedAt: order.confirmado_em || null,
    canceledAt: order.cancelado_em || null,
    deliveredAt: order.entregue_em || null,
    items: [],
    subtotal,
    discount,
    deliveryFee,
    total: toNumber(order.total),
    status: mapStatus(order.status),
    backendStatus: order.status || undefined,
    address: formatAddress(order.endereco_cliente),
    type: order.tipo_pedido === 'retirada' ? 'pickup' : 'delivery',
    cpfNaNota: Boolean(order.cpf_na_nota),
    cpfNaNotaCpf: order.cpf_na_nota_cpf || null,
    source: order.origem_checkout || null,
    notes: order.observacoes || null,
  };
}

export async function getOrdersByMarketId(marketId: string): Promise<Order[]> {
  if (!getAuthToken()) return [];

  const response = await apiRequest('/pedidos/me');

  const orders = unwrapList<ApiOrder>(response)
    .filter(order => !marketId || order.loja_id === marketId)
    .map(mapOrder);

  return hydrateOrderItems(orders);
}

export async function createCheckoutOrder(input: CreateCheckoutOrderInput) {
  const response = await apiRequest<{ data: ApiOrder }>('/pedidos', {
    method: 'POST',
    body: {
      loja_id: input.marketId,
      endereco_cliente_id: input.addressId,
      carrinho_id: input.cartId,
      tipo_pedido: input.type === 'pickup' ? 'retirada' : 'entrega',
      taxa_entrega: input.deliveryFee,
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
