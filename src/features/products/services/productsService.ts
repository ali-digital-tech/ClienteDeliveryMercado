import { apiRequest, unwrapList } from '@/shared/lib/api';
import type { Product } from '../types/product';

export const PRODUCTS_PAGE_SIZE = 30;

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

export interface ProductListFilters {
  categoryId?: string | null;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
}

function toNumber(value: string | number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapStoreProduct(product: ApiStoreProduct): Product {
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

export async function getProductsByMarketId(
  marketId: string,
  filters: ProductListFilters = {},
): Promise<ProductListResult> {
  if (!marketId) {
    return { products: [], total: 0, page: 1, perPage: filters.perPage ?? PRODUCTS_PAGE_SIZE, totalPages: 0, hasNextPage: false };
  }

  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.max(1, filters.perPage ?? PRODUCTS_PAGE_SIZE);
  const response: any = await apiRequest(`/lojas/${marketId}/produtos`, {
    params: {
      ativo: true,
      categoria_id: filters.categoryId || undefined,
      busca: filters.search?.trim() || undefined,
      page,
      per_page: perPage,
    },
  });

  const data = response?.data;
  const total = Array.isArray(data) ? data.length : Number(data?.total ?? 0);
  const responsePage = Array.isArray(data) ? page : Number(data?.page ?? page);
  const responsePerPage = Array.isArray(data) ? perPage : Number(data?.per_page ?? perPage);
  const totalPages = Array.isArray(data) ? 1 : Number(data?.total_pages ?? 0);
  const products = unwrapList<ApiStoreProduct>(response)
    .filter(product => product.ativo_na_loja !== false && product.produto_ativo !== false)
    .map(mapStoreProduct);

  return {
    products,
    total,
    page: responsePage,
    perPage: responsePerPage,
    totalPages,
    hasNextPage: responsePage < totalPages,
  };
}

export async function getProductById(marketId: string, productId: string): Promise<Product | null> {
  if (!marketId || !productId) return null;

  const response: any = await apiRequest(`/lojas/${marketId}/produtos/${productId}`);
  const product = response?.data;

  if (!product || product.ativo_na_loja === false || product.produto_ativo === false) return null;

  return mapStoreProduct(product);
}
