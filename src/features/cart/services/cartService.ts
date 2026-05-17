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

async function getOrCreateActiveCart(marketId: string) {
  const response = await apiRequest<{ data: ApiCart }>(`/carrinhos/me/active/${marketId}`, {
    method: 'POST',
  });

  return response.data;
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
