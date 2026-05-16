import { apiRequest, unwrapList } from '@/shared/lib/api';
import type { Product } from '../types/product';

interface ApiStoreProduct {
  id: string;
  loja_id?: string;
  produto_id?: string;
  nome?: string;
  marca?: string | null;
  preco?: string | number | null;
  preco_promocional?: string | number | null;
  imagem_url?: string | null;
  categoria_id?: string | null;
  categoria_final_id?: string | null;
  categoria_caminho?: string | null;
  categoria_nome?: string | null;
  slug?: string | null;
  unidade_medida?: string | null;
  descricao?: string | null;
  destaque?: boolean | null;
  ativo_na_loja?: boolean | null;
  produto_ativo?: boolean | null;
}

function toNumber(value: string | number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapStoreProduct(product: ApiStoreProduct): Product {
  const regularPrice = toNumber(product.preco);
  const promoPrice = product.preco_promocional === null ? 0 : toNumber(product.preco_promocional);
  const hasPromo = promoPrice > 0 && regularPrice > 0 && promoPrice < regularPrice;
  const category = product.categoria_final_id || product.categoria_id || product.categoria_nome || 'geral';

  return {
    id: product.id,
    catalogProductId: product.produto_id || product.id,
    marketId: product.loja_id || '',
    name: product.nome || 'Produto',
    brand: product.marca || 'Mercado',
    price: hasPromo ? promoPrice : regularPrice,
    originalPrice: hasPromo ? regularPrice : undefined,
    image: product.imagem_url || '',
    category,
    categoryPath: product.categoria_caminho || product.categoria_nome || undefined,
    unit: product.unidade_medida || 'un',
    description: product.descricao || 'Produto disponível no mercado.',
    isPromo: hasPromo,
    isFeatured: Boolean(product.destaque),
    isBestseller: Boolean(product.destaque),
  };
}

export async function getProductsByMarketId(marketId: string): Promise<Product[]> {
  if (!marketId) return [];

  const response = await apiRequest(`/lojas/${marketId}/produtos`, {
    params: {
      ativo: true,
      per_page: 100,
    },
  });

  return unwrapList<ApiStoreProduct>(response)
    .filter(product => product.ativo_na_loja !== false && product.produto_ativo !== false)
    .map(mapStoreProduct);
}

export async function getProductById(marketId: string, productId: string): Promise<Product | null> {
  const products = await getProductsByMarketId(marketId);
  return products.find(product => product.id === productId) ?? null;
}
