import { apiRequest } from '@/shared/lib/api';
import type { CartItem } from '../types/cart';
import { toCartQuantityNumber } from '../utils/formatCartQuantity';

interface ApiCart {
  id: string;
  cliente_id: string;
  loja_id: string;
  status: string;
}

interface ApiCartItem {
  id: string;
  carrinho_id: string;
  produto_id: string;
  quantidade: number | string;
}

function isNotFound(error: unknown) {
  return error instanceof Error && (error as Error & { status?: number }).status === 404;
}

async function getActiveCart(marketId: string) {
  const response = await apiRequest<{ data: ApiCart }>(`/carrinhos/me/active/${marketId}`);
  return response.data;
}

async function createActiveCart(marketId: string) {
  const response = await apiRequest<{ data: ApiCart }>('/carrinhos', {
    method: 'POST',
    body: {
      loja_id: marketId,
      status: 'ativo',
    },
  });

  return response.data;
}

export async function getOrCreateActiveCart(marketId: string) {
  try {
    return await getActiveCart(marketId);
  } catch (error) {
    if (isNotFound(error)) {
      return createActiveCart(marketId);
    }

    throw error;
  }
}

export async function syncCartItemsBatch(marketId: string, items: CartItem[]) {
  const cart = await getOrCreateActiveCart(marketId);

  const response = await apiRequest<{
    data: {
      carrinho_id?: string;
      itens: ApiCartItem[];
    };
  }>('/itens_carrinho/bulk', {
    method: 'POST',
    body: {
      carrinho_id: cart.id,
      itens: items
        .filter(item => toCartQuantityNumber(item.qty) > 0)
        .map(item => ({
          produto_id: item.product.catalogProductId,
          quantidade: toCartQuantityNumber(item.qty),
        })),
    },
  });

  return {
    carrinho_id: response.data.carrinho_id || cart.id,
    itens: response.data.itens.map(item => ({
      ...item,
      quantidade: toCartQuantityNumber(item.quantidade),
    })),
  };
}
