import { apiRequest, unwrapList } from '@/shared/lib/api';
import type {
  Product,
  ProductConfiguration,
  ProductOption,
  ProductOptionGroup,
  ProductVariation,
} from '../types/product';

export const PRODUCTS_PAGE_SIZE = 30;

interface ApiStoreProduct {
  id: string;
  produto_loja_id_origem?: string | null;
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
  modo_compra?: 'simples' | 'configuravel' | null;
  modo_estoque?: 'quantidade' | 'disponibilidade' | null;
  tem_variacoes?: boolean | null;
  preco_a_partir_de?: string | number | null;
  configuracao?: ApiProductConfiguration | null;
  produto_virtual_opcao?: boolean | null;
  card_montagem_destaque?: boolean | null;
  opcao_grupo_produto_id?: string | null;
  variacao_produto_loja_id_padrao?: string | null;
  selecoes_padrao?: Array<{ grupo_id: string; opcao_id: string; quantidade?: number }> | null;
}

interface ApiProductVariation {
  id: string;
  variacao_produto_id: string;
  nome: string;
  preco: string | number;
  preco_promocional?: string | number | null;
  promocao_ate?: string | null;
  ativa?: boolean;
  ordem_exibicao?: number;
}

interface ApiVariationRule {
  variacao_produto_loja_id: string;
  minimo_selecoes: number;
  maximo_selecoes: number;
}

interface ApiOptionVariationPrice {
  variacao_produto_loja_id: string;
  disponivel?: boolean;
  preco_adicional?: string | number | null;
  preco_promocional?: string | number | null;
  promocao_ate?: string | null;
}

interface ApiProductOption {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo_item?: 'adicional' | 'produto' | 'produto_e_adicional';
  imagem_url?: string | null;
  produto_categoria_id?: string | null;
  produto_categoria_nome?: string | null;
  preco_adicional?: string | number | null;
  preco_promocional?: string | number | null;
  promocao_ate?: string | null;
  quantidade_maxima?: number;
  ativa?: boolean;
  ordem_exibicao?: number;
  precos_variacao?: ApiOptionVariationPrice[];
}

interface ApiProductOptionGroup {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo_selecao: 'unica' | 'multipla' | 'fracionada';
  minimo_selecoes: number;
  maximo_selecoes: number;
  permite_quantidade?: boolean;
  substitui_preco_base?: boolean;
  ativo?: boolean;
  ordem_exibicao?: number;
  regras_variacao?: ApiVariationRule[];
  opcoes?: ApiProductOption[];
}

interface ApiProductConfiguration {
  versao: number;
  variacoes?: ApiProductVariation[];
  grupos?: ApiProductOptionGroup[];
}

export interface ProductListFilters {
  categoryId?: string | null;
  search?: string;
  priceContext?: 'app' | 'salao';
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

function toNumber(value: string | number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapVariation(variation: ApiProductVariation): ProductVariation {
  return {
    id: variation.id,
    productVariationId: variation.variacao_produto_id,
    name: variation.nome,
    price: toNumber(variation.preco),
    promotionalPrice: variation.preco_promocional == null ? undefined : toNumber(variation.preco_promocional),
    promotionEndsAt: variation.promocao_ate || undefined,
    active: variation.ativa !== false,
    displayOrder: variation.ordem_exibicao || 0,
  };
}

function mapOption(option: ApiProductOption): ProductOption {
  return {
    id: option.id,
    name: option.nome,
    description: option.descricao || undefined,
    itemType: option.tipo_item || 'adicional',
    image: option.imagem_url || undefined,
    productCategoryId: option.produto_categoria_id || undefined,
    productCategoryName: option.produto_categoria_nome || undefined,
    additionalPrice: toNumber(option.preco_adicional),
    promotionalPrice: option.preco_promocional == null ? undefined : toNumber(option.preco_promocional),
    promotionEndsAt: option.promocao_ate || undefined,
    maximumQuantity: option.quantidade_maxima || 1,
    active: option.ativa !== false,
    displayOrder: option.ordem_exibicao || 0,
    variationPrices: (option.precos_variacao || []).map((price) => ({
      productStoreVariationId: price.variacao_produto_loja_id,
      available: price.disponivel !== false,
      additionalPrice: price.preco_adicional == null ? undefined : toNumber(price.preco_adicional),
      promotionalPrice: price.preco_promocional == null ? undefined : toNumber(price.preco_promocional),
      promotionEndsAt: price.promocao_ate || undefined,
    })),
  };
}

function mapGroup(group: ApiProductOptionGroup): ProductOptionGroup {
  return {
    id: group.id,
    name: group.nome,
    description: group.descricao || undefined,
    selectionType: group.tipo_selecao,
    minimumSelections: group.minimo_selecoes,
    maximumSelections: group.maximo_selecoes,
    allowsQuantity: Boolean(group.permite_quantidade),
    replacesBasePrice: Boolean(group.substitui_preco_base),
    active: group.ativo !== false,
    displayOrder: group.ordem_exibicao || 0,
    variationRules: (group.regras_variacao || []).map((rule) => ({
      productStoreVariationId: rule.variacao_produto_loja_id,
      minimumSelections: rule.minimo_selecoes,
      maximumSelections: rule.maximo_selecoes,
    })),
    options: (group.opcoes || []).map(mapOption),
  };
}

function mapConfiguration(configuration?: ApiProductConfiguration | null): ProductConfiguration | undefined {
  if (!configuration) return undefined;
  return {
    version: configuration.versao,
    variations: (configuration.variacoes || []).map(mapVariation),
    groups: (configuration.grupos || []).map(mapGroup),
  };
}

export function mapStoreProduct(product: ApiStoreProduct): Product {
  const regularPrice = toNumber(product.preco);
  const promoPrice = product.preco_promocional === null ? 0 : toNumber(product.preco_promocional);
  const hasPromo = promoPrice > 0 && regularPrice > 0 && promoPrice < regularPrice;
  const hasAnyPromo = hasPromo || promoPrice > 0;
  const category = product.categoria_final_id || product.categoria_id || product.categoria_nome || 'geral';
  const salesCount = toNumber(product.quantidade_vendida);
  const saleType = product.tipo_venda || (product.vendavel_por_peso ? 'peso' : 'unidade');
  const isWeight = saleType === 'peso';

  const startingPrice = product.preco_a_partir_de == null
    ? (hasPromo ? promoPrice : regularPrice)
    : toNumber(product.preco_a_partir_de);

  return {
    id: product.id,
    storeProductId: product.produto_loja_id_origem || product.id,
    catalogProductId: product.produto_id || product.id,
    marketId: product.loja_id || '',
    name: product.nome || 'Produto',
    brand: product.marca || 'Produto',
    price: startingPrice,
    originalPrice: hasPromo ? regularPrice : undefined,
    saleType,
    minQty: toNumber(product.quantidade_minima_compra, isWeight ? 0.1 : 1),
    stepQty: toNumber(product.incremento_quantidade, isWeight ? 0.1 : 1),
    priceUnit: isWeight ? 'kg' : product.unidade_medida || 'un',
    image: product.imagem_url || '',
    category,
    categoryPath: product.categoria_caminho || product.categoria_nome || undefined,
    unit: product.unidade_medida || 'un',
    description: product.descricao || 'Produto disponível para delivery.',
    salesCount,
    isPromo: hasAnyPromo,
    isFeatured: Boolean(product.destaque),
    isBestseller: salesCount > 0,
    isImmediateConsumption: Boolean(product.consumo_imediato) && hasPromo,
    purchaseMode: product.modo_compra || 'simples',
    stockMode: product.modo_estoque || 'quantidade',
    hasVariations: Boolean(product.tem_variacoes),
    startingPrice: product.modo_compra === 'configuravel' ? startingPrice : undefined,
    configuration: mapConfiguration(product.configuracao),
    defaultVariationId: product.variacao_produto_loja_id_padrao || undefined,
    defaultSelections: (product.selecoes_padrao || []).map(selection => ({
      groupId: selection.grupo_id,
      optionId: selection.opcao_id,
      quantity: selection.quantidade || 1,
    })),
    isVirtualOptionProduct: Boolean(product.produto_virtual_opcao),
    isAssemblyShortcut: Boolean(product.card_montagem_destaque),
    optionProductId: product.opcao_grupo_produto_id || undefined,
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
  const offset = Math.max(0, filters.offset ?? (page - 1) * perPage);
  const requestedLimit = filters.useOffsetPagination ? perPage + 1 : perPage;
  const response: any = await apiRequest(`/lojas/${marketId}/produtos`, {
    params: {
      ativo: true,
      categoria_id: filters.categoryId || undefined,
      busca: filters.search?.trim() || undefined,
      promocao_ativa: filters.promotionActive,
      destaque: filters.featured,
      consumo_imediato: filters.immediateConsumption,
      mais_vendidos: filters.bestsellers,
      contexto_preco: filters.priceContext,
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

export async function getProductById(
  marketId: string,
  productId: string,
  options: { priceContext?: 'app' | 'salao' } = {},
): Promise<Product | null> {
  if (!marketId || !productId) return null;

  const response: any = await apiRequest(`/lojas/${marketId}/produtos/${productId}`, {
    params: {
      contexto_preco: options.priceContext,
    },
  });
  const product = response?.data;

  if (!product || product.ativo_na_loja === false || product.produto_ativo === false) return null;

  return mapStoreProduct(product);
}
