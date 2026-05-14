import type { Product } from '@/features/products';

export interface CartItem {
  product: Product;
  qty: number;
  remoteItemId?: string;
}
