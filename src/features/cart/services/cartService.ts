import { apiRequest, unwrapList } from '@/shared/lib/api';
import type { Product } from '@/features/products';
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

export async function addProductToRemoteCart(marketId: string, product: Product) {
  const cart = await getOrCreateActiveCart(marketId);

  const response = await apiRequest<{ data: ApiCartItem }>('/itens_carrinho', {
    method: 'POST',
    body: {
      carrinho_id: cart.id,
      produto_id: product.catalogProductId,
      quantidade: 1,
    },
  });

  return {
    ...response.data,
    quantidade: toCartQuantityNumber(response.data.quantidade),
  };
}

export async function updateRemoteCartItemQuantity(remoteItemId: string, quantity: number) {
  const response = await apiRequest<{ data: ApiCartItem }>(`/itens_carrinho/${remoteItemId}/quantidade`, {
    method: 'PATCH',
    body: {
      quantidade: quantity,
    },
  });

  return {
    ...response.data,
    quantidade: toCartQuantityNumber(response.data.quantidade),
  };
}

export async function removeRemoteCartItem(remoteItemId: string) {
  await apiRequest(`/itens_carrinho/${remoteItemId}`, {
    method: 'DELETE',
  });
}

export async function getRemoteCartItems(marketId: string, products: Product[]): Promise<CartItem[]> {
  let cart: ApiCart;

  try {
    cart = await getActiveCart(marketId);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }

  const response = await apiRequest('/itens_carrinho', {
    params: {
      carrinho_id: cart.id,
      per_page: 100,
    },
  });
  const items = unwrapList<ApiCartItem>(response);

  return items
    .map((item) => {
      const product = products.find(
        (candidate) => candidate.catalogProductId === item.produto_id || candidate.id === item.produto_id
      );

      if (!product) return null;

      return {
        product,
        qty: toCartQuantityNumber(item.quantidade),
        remoteItemId: item.id,
      };
    })
    .filter((item): item is CartItem => item !== null);
}
