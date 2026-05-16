import { apiRequest, unwrapList } from '@/shared/lib/api';
import type { Product } from '@/features/products';
import type { Banner, BannerPageKey, BannerProductsResult } from '../types/banner';

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
}

function toNumber(value: string | number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapStoreProduct(product: ApiStoreProduct): Product {
  const regularPrice = toNumber(product.preco);
  const promoPrice = product.preco_promocional === null ? 0 : toNumber(product.preco_promocional);
  const hasPromo = promoPrice > 0 && regularPrice > 0 && promoPrice < regularPrice;

  return {
    id: product.id,
    catalogProductId: product.produto_id || product.id,
    marketId: product.loja_id || '',
    name: product.nome || 'Produto',
    brand: product.marca || 'Mercado',
    price: hasPromo ? promoPrice : regularPrice,
    originalPrice: hasPromo ? regularPrice : undefined,
    image: product.imagem_url || '',
    category: product.categoria_final_id || product.categoria_id || product.categoria_nome || 'geral',
    categoryPath: product.categoria_caminho || product.categoria_nome || undefined,
    unit: product.unidade_medida || 'un',
    description: product.descricao || 'Produto disponível no mercado.',
    isPromo: hasPromo,
    isFeatured: Boolean(product.destaque),
    isBestseller: Boolean(product.destaque),
  };
}

export async function getBannersByMarket(marketId: string, page: BannerPageKey): Promise<Banner[]> {
  if (!marketId) return [];
  const response = await apiRequest(`/lojas/${marketId}/banners`, {
    params: { pagina: page },
  });
  return unwrapList<Banner>(response);
}

export async function getBannerProducts(marketId: string, bannerId: string): Promise<BannerProductsResult> {
  const response = await apiRequest<{ data: { banner: Banner; produtos: ApiStoreProduct[] } }>(
    `/lojas/${marketId}/banners/${bannerId}/produtos`,
  );

  return {
    banner: response.data.banner,
    products: (response.data.produtos || []).map(mapStoreProduct),
  };
}

export async function trackBannerEvent(marketId: string, bannerId: string, tipo: 'view' | 'click', page_key?: BannerPageKey) {
  try {
    await apiRequest(`/lojas/${marketId}/banners/${bannerId}/eventos`, {
      method: 'POST',
      body: { tipo, page_key },
    });
  } catch {
    // Metrics must not block shopping flows.
  }
}
