import { apiRequest, getAuthToken, unwrapList } from '@/shared/lib/api';
import type { Order } from '../types/order';

interface ApiOrder {
  id: string;
  loja_id?: string;
  numero_pedido?: string | null;
  status?: string | null;
  tipo_pedido?: string | null;
  total?: string | number | null;
  realizado_em?: string | null;
  criado_em?: string | null;
  endereco_cliente?: {
    rua?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
}

function toNumber(value: string | number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  if (status === 'confirmado') return 'confirmado';
  if (status === 'em_separacao' || status === 'preparando') return 'separacao';
  if (status === 'saiu_entrega' || status === 'em_entrega') return 'saiu';
  if (status === 'entregue') return 'entregue';

  return 'recebido';
}

function formatAddress(address: ApiOrder['endereco_cliente']) {
  if (!address) return 'Endereco nao informado';

  return [address.rua, address.numero, address.bairro, address.cidade, address.estado]
    .filter(Boolean)
    .join(', ');
}

function mapOrder(order: ApiOrder): Order {
  return {
    id: order.numero_pedido ? `#${order.numero_pedido}` : order.id,
    marketId: order.loja_id || '',
    date: formatDate(order.realizado_em || order.criado_em),
    items: [],
    total: toNumber(order.total),
    status: mapStatus(order.status),
    address: formatAddress(order.endereco_cliente),
    type: order.tipo_pedido === 'retirada' ? 'pickup' : 'delivery',
  };
}

export async function getOrdersByMarketId(marketId: string): Promise<Order[]> {
  if (!getAuthToken()) return [];

  const response = await apiRequest('/pedidos/me');

  return unwrapList<ApiOrder>(response)
    .filter(order => !marketId || order.loja_id === marketId)
    .map(mapOrder);
}
