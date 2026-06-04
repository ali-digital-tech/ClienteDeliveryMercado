import type { Product } from '@/features/products';

export type BannerDisplayType = 'inline' | 'modal' | 'full_width' | 'fixed';
export type BannerPageKey = 'home' | 'products' | 'categories' | 'cart' | 'checkout' | 'payment' | 'order_confirmed' | 'profile' | 'notifications' | 'support';
export type BannerPlacementKey = 'home_top' | 'below_categories' | 'below_promos' | 'below_bestsellers' | 'below_buy_again' | 'below_featured' | 'products_top' | 'categories_top' | 'cart_top' | 'checkout_top';

export interface Banner {
  id: string;
  loja_id: string;
  titulo: string;
  subtitulo?: string | null;
  cta_text?: string | null;
  imagem_url: string;
  display_type: BannerDisplayType;
  page_key: BannerPageKey;
  page_keys?: BannerPageKey[];
  placement_key: BannerPlacementKey;
  placement_keys?: BannerPlacementKey[];
  action_type: 'product_collection';
  background_color: string;
  ativo: boolean;
  prioridade: number;
  produto_loja_ids: string[];
}

export interface BannerProductsResult {
  banner: Banner;
  products: Product[];
}
