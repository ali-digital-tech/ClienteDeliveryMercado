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
  client_line_id?: string;
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
  }>(`/carrinhos/${cart.id}/itens/sync`, {
    method: 'PUT',
    body: {
      itens: items
        .filter(item => toCartQuantityNumber(item.qty) > 0)
        .map(item => ({
          client_line_id: item.lineId,
          produto_loja_id: item.product.storeProductId || item.product.id,
          variacao_produto_loja_id: item.productStoreVariationId || null,
          quantidade: toCartQuantityNumber(item.qty),
          observacoes: item.notes || null,
          selecoes: item.selections.map(selection => ({
            grupo_id: selection.groupId,
            opcao_id: selection.optionId,
            quantidade: selection.quantity,
          })),
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
