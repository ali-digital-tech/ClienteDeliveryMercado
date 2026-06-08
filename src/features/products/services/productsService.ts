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
  tipo_venda?: 'unidade' | 'peso' | null;
  quantidade_minima_compra?: string | number | null;
  incremento_quantidade?: string | number | null;
  vendavel_por_peso?: boolean | null;
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
  categoryIds?: string[];
  search?: string;
  promotionActive?: boolean;
  featured?: boolean;
  immediateConsumption?: boolean;
  bestsellers?: boolean;
  page?: number;
  perPage?: number;
  offset?: number;
  useOffsetPagination?: boolean;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
}

function dedupeProducts(products: Product[]) {
  const byId = new Map<string, Product>();

  products.forEach((product) => {
    byId.set(product.id || product.catalogProductId, product);
  });

  return Array.from(byId.values());
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
  const saleType = product.tipo_venda || (product.vendavel_por_peso ? 'peso' : 'unidade');
  const isWeight = saleType === 'peso';

  return {
    id: product.id,
    catalogProductId: product.produto_id || product.id,
    marketId: product.loja_id || '',
    name: product.nome || 'Produto',
    brand: product.marca || 'Mercado',
    price: hasPromo ? promoPrice : regularPrice,
    originalPrice: hasPromo ? regularPrice : undefined,
    saleType,
    minQty: toNumber(product.quantidade_minima_compra, isWeight ? 0.1 : 1),
    stepQty: toNumber(product.incremento_quantidade, isWeight ? 0.1 : 1),
    priceUnit: isWeight ? 'kg' : product.unidade_medida || 'un',
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

  const categoryIds = Array.from(new Set((filters.categoryIds || []).filter(Boolean)));
  if (categoryIds.length > 1) {
    const perCategoryLimit = Math.max(perPage, 100);
    const results = await Promise.all(
      categoryIds.map((categoryId) => getProductsByMarketId(marketId, {
        ...filters,
        categoryId,
        categoryIds: undefined,
        page: 1,
        perPage: perCategoryLimit,
        offset: 0,
        useOffsetPagination: false,
      })),
    );
    const products = dedupeProducts(results.flatMap((result) => result.products));

    return {
      products,
      total: products.length,
      page: 1,
      perPage: products.length || perPage,
      totalPages: 1,
      hasNextPage: false,
    };
  }

  const offset = Math.max(0, filters.offset ?? (page - 1) * perPage);
  const requestedLimit = filters.useOffsetPagination ? perPage + 1 : perPage;
  const response: any = await apiRequest(`/lojas/${marketId}/produtos`, {
    params: {
      ativo: true,
      categoria_id: filters.categoryId || categoryIds[0] || undefined,
      busca: filters.search?.trim() || undefined,
      promocao_ativa: filters.promotionActive,
      destaque: filters.featured,
      consumo_imediato: filters.immediateConsumption,
      mais_vendidos: filters.bestsellers,
      page: filters.useOffsetPagination ? undefined : page,
      per_page: requestedLimit,
      limit: filters.useOffsetPagination ? requestedLimit : undefined,
      offset: filters.useOffsetPagination ? offset : undefined,
    },
  });

  const data = response?.data;
  const total = Array.isArray(data) ? data.length : Number(data?.total ?? 0);
  const responsePage = filters.useOffsetPagination
    ? page
    : Array.isArray(data) ? page : Number(data?.page ?? page);
  const responsePerPage = filters.useOffsetPagination
    ? perPage
    : Array.isArray(data) ? requestedLimit : Number(data?.per_page ?? requestedLimit);
  const totalPages = filters.useOffsetPagination
    ? 0
    : Array.isArray(data) ? 1 : Number(data?.total_pages ?? 0);
  const rawProducts = unwrapList<ApiStoreProduct>(response)
    .filter(product => product.ativo_na_loja !== false && product.produto_ativo !== false)
    .map(mapStoreProduct);
  const products = filters.useOffsetPagination ? rawProducts.slice(0, perPage) : rawProducts;
  const hasLookaheadProduct = filters.useOffsetPagination && rawProducts.length > perPage;

  return {
    products,
    total,
    page: responsePage,
    perPage: responsePerPage,
    totalPages,
    hasNextPage: filters.useOffsetPagination
      ? hasLookaheadProduct
      : responsePage < totalPages,
  };
}

export async function getProductById(marketId: string, productId: string): Promise<Product | null> {
  if (!marketId || !productId) return null;

  const response: any = await apiRequest(`/lojas/${marketId}/produtos/${productId}`);
  const product = response?.data;

  if (!product || product.ativo_na_loja === false || product.produto_ativo === false) return null;

  return mapStoreProduct(product);
}
