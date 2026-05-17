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
  consumo_imediato?: boolean | null;
  quantidade_vendida?: string | number | null;
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
  const salesCount = toNumber(product.quantidade_vendida);

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
    salesCount,
    isPromo: hasPromo,
    isFeatured: Boolean(product.destaque),
    isBestseller: salesCount > 0,
    isImmediateConsumption: Boolean(product.consumo_imediato) && hasPromo,
  };
}

export async function getProductsByMarketId(marketId: string): Promise<Product[]> {
  if (!marketId) return [];

  const firstResponse: any = await apiRequest(`/lojas/${marketId}/produtos`, {
    params: {
      ativo: true,
      page: 1,
      per_page: 100,
    },
  });

  const firstData = firstResponse?.data;
  const totalPages = Array.isArray(firstData) ? 1 : firstData?.total_pages || 1;
  const firstPage = unwrapList<ApiStoreProduct>(firstResponse);

  const remainingPages = totalPages > 1
    ? await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        apiRequest(`/lojas/${marketId}/produtos`, {
          params: {
            ativo: true,
            page: index + 2,
            per_page: 100,
          },
        }),
      ),
    )
    : [];

  return [
    ...firstPage,
    ...remainingPages.flatMap((response) => unwrapList<ApiStoreProduct>(response)),
  ]
    .filter(product => product.ativo_na_loja !== false && product.produto_ativo !== false)
    .map(mapStoreProduct);
}

export async function getProductById(marketId: string, productId: string): Promise<Product | null> {
  const products = await getProductsByMarketId(marketId);
  return products.find(product => product.id === productId) ?? null;
}
