import { apiRequest, getAuthToken, unwrapList } from '@/shared/lib/api';
import { getProductById, mapStoreProduct } from '@/features/products';
import type { Product } from '@/features/products';
import { resolvePixExpiration } from '@/features/payments';
import type { Order } from '../types/order';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';

const ORDER_ITEMS_CACHE_KEY = 'cliente_delivery_order_items_by_order_v3';
const ORDER_ITEMS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ORDERS_PAGE_SIZE = 100;

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
    application_fee?: string | number | null;
    gateway_pagamento_id?: string | null;
    qr_code?: string | null;
    qr_code_base64?: string | null;
    link_pagamento?: string | null;
    data_expiracao?: string | null;
    pago_em?: string | null;
    criado_em?: string | null;
    sem_troco?: boolean | null;
    troco_para?: string | number | null;
    troco_valor?: string | number | null;
  } | null;
  reembolsos?: Array<{
    id: string;
    pagamento_id?: string | null;
    valor?: string | number | null;
    motivo?: string | null;
    status?: string | null;
    estornado_em?: string | null;
    criado_em?: string | null;
    metadata?: {
      tipo?: string | null;
      itens_faltantes?: Array<{
        item_pedido_id?: string | null;
        produto_id?: string | null;
        nome_produto?: string | null;
        quantidade_comprada?: string | number | null;
        quantidade_faltante?: string | number | null;
        preco_unitario?: string | number | null;
        valor_reembolso?: string | number | null;
      }> | null;
    } | null;
  }> | null;
  solicitacao_cancelamento?: {
    status?: 'pendente' | 'aprovada' | 'recusada' | null;
    valor_reembolsado?: string | number | null;
    observacao?: string | null;
    solicitado_em?: string | null;
    resolvido_em?: string | null;
  } | null;
}

interface ApiCartItem {
  id?: string;
  carrinho_id?: string;
  produto_id?: string;
  quantidade?: string | number | null;
  produto?: any;
  produto_loja?: any;
  produto_loja_id?: string;
  client_line_id?: string;
  nome_produto?: string;
  nome_variacao?: string | null;
  variacao_produto_loja_id?: string | null;
  unidade_medida?: string | null;
  tipo_venda?: 'unidade' | 'peso' | null;
  preco_unitario?: string | number | null;
  observacoes?: string | null;
  selecoes?: Array<{
    grupo_id: string;
    opcao_id: string;
    quantidade: string | number;
    fracao?: string | number | null;
    nome_grupo: string;
    nome_opcao: string;
    preco_unitario?: string | number;
    preco_contribuicao?: string | number;
  }>;
}

interface ApiOrdersPage {
  data?: ApiOrder[];
  total?: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
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

async function fetchOrderItemsPayload(order: Order) {
  const attempts = [
    ...(order.rawId ? [() => apiRequest(`/pedidos/${order.rawId}/itens`)] : []),
    ...(order.cartId ? [
      () => apiRequest(`/carrinhos/${order.cartId}/itens`),
      () => apiRequest('/itens_carrinho', { params: { carrinho_id: order.cartId, per_page: 100 } }),
    ] : []),
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

async function fetchCurrentProductForRepeat(item: ApiCartItem, marketId: string): Promise<Product | null> {
  const identifiers = [item.produto_loja_id, item.produto_id]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index);

  for (const identifier of identifiers) {
    try {
      const product = await getProductById(marketId, identifier);
      if (isSellableStoreProduct(product, marketId)) return product;
    } catch {
      // Try the next identifier before considering the item unavailable.
    }
  }

  return null;
}

async function mapCartItemToOrderItem(item: ApiCartItem, marketId: string): Promise<Order['items'][number] | null> {
  const qty = toNumber(item.quantidade);
  if (qty <= 0) return null;

  const selections = (item.selecoes || []).map(selection => ({
    groupId: selection.grupo_id,
    optionId: selection.opcao_id,
    groupName: selection.nome_grupo,
    optionName: selection.nome_opcao,
    quantity: toNumber(selection.quantidade) || 1,
    fraction: selection.fracao == null ? undefined : toNumber(selection.fracao),
    unitPrice: toNumber(selection.preco_unitario),
    contribution: toNumber(selection.preco_contribuicao),
  }));
  const metadata = {
    lineId: item.client_line_id,
    productStoreVariationId: item.variacao_produto_loja_id || undefined,
    variationName: item.nome_variacao || undefined,
    selections,
    notes: item.observacoes || undefined,
  };
  const embeddedProduct = resolveProductFromCartItem(item, marketId);
  if (isSellableStoreProduct(embeddedProduct, marketId)) {
    return { product: embeddedProduct as Product, qty, ...metadata };
  }

  const product = await fetchCurrentProductForRepeat(item, marketId);
  return product ? { product, qty, ...metadata } : null;
}

async function getOrderItemsFromCart(order: Order): Promise<Order['items']> {
  if (!order.marketId || (!order.rawId && !order.cartId)) return [];

  const cartItems = await fetchOrderItemsPayload(order);
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
    confirmedAt: order.confirmado_em || getStatusTime(order, 'confirmado'),
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
      applicationFee: toNumber(order.pagamento.application_fee),
      gatewayPaymentId: order.pagamento.gateway_pagamento_id || null,
      qrCode: order.pagamento.qr_code || null,
      qrCodeBase64: order.pagamento.qr_code_base64 || null,
      paymentLink: order.pagamento.link_pagamento || null,
      expiresAt: order.pagamento.forma_pagamento === 'pix'
        ? resolvePixExpiration(order.pagamento.data_expiracao, order.pagamento.criado_em)
        : order.pagamento.data_expiracao || null,
      paidAt: order.pagamento.pago_em || null,
      createdAt: order.pagamento.criado_em || null,
      noChange: order.pagamento.sem_troco === true,
      changeFor: order.pagamento.troco_para == null ? null : toNumber(order.pagamento.troco_para),
      changeValue: order.pagamento.troco_valor == null ? null : toNumber(order.pagamento.troco_valor),
    } : null,
    refunds: Array.isArray(order.reembolsos)
      ? order.reembolsos.map((refund) => ({
          id: refund.id,
          paymentId: refund.pagamento_id || null,
          value: toNumber(refund.valor),
          reason: refund.motivo || null,
          status: refund.status || '',
          refundedAt: refund.estornado_em || null,
          createdAt: refund.criado_em || null,
          type: refund.metadata?.tipo || null,
          missingItems: Array.isArray(refund.metadata?.itens_faltantes)
            ? refund.metadata.itens_faltantes.map((item) => ({
                orderItemId: item.item_pedido_id || null,
                productId: item.produto_id || null,
                name: item.nome_produto || 'Produto',
                boughtQuantity: toNumber(item.quantidade_comprada),
                missingQuantity: toNumber(item.quantidade_faltante),
                unitPrice: toNumber(item.preco_unitario),
                refundValue: toNumber(item.valor_reembolso),
              }))
            : [],
        }))
      : [],
    cancellationRequest: order.solicitacao_cancelamento?.status ? {
      status: order.solicitacao_cancelamento.status,
      refundValue: order.solicitacao_cancelamento.valor_reembolsado === null
        || order.solicitacao_cancelamento.valor_reembolsado === undefined
        ? null
        : toNumber(order.solicitacao_cancelamento.valor_reembolsado),
      note: order.solicitacao_cancelamento.observacao || null,
      requestedAt: order.solicitacao_cancelamento.solicitado_em || null,
      resolvedAt: order.solicitacao_cancelamento.resolvido_em || null,
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

  const ordersById = new Map<string, ApiOrder>();
  let page = 1;
  let totalPages: number | null = null;

  while (totalPages === null || page <= totalPages) {
    const response = await apiRequest<{ data?: ApiOrdersPage | ApiOrder[] }>('/pedidos/me', {
      params: { page, per_page: ORDERS_PAGE_SIZE },
    });
    const pageOrders = unwrapList<ApiOrder>(response);
    const pageData = !Array.isArray(response.data) ? response.data : undefined;
    const previousSize = ordersById.size;

    pageOrders.forEach((order) => ordersById.set(order.id, order));

    if (typeof pageData?.total_pages === 'number') {
      totalPages = pageData.total_pages;
    }

    const hasNoNewOrders = ordersById.size === previousSize;
    if (!pageOrders.length || hasNoNewOrders || pageOrders.length < ORDERS_PAGE_SIZE) break;
    page += 1;
  }

  return Array.from(ordersById.values())
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

export async function requestOrderCancellation(orderId: string) {
  return apiRequest<{
    data: ApiOrder['solicitacao_cancelamento'];
    message?: string;
  }>(`/pedidos/${orderId}/solicitacao-cancelamento`, {
    method: 'POST',
  });
}
