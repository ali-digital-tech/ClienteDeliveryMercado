import type { Product } from '@/features/products';

export interface CartItemSelection {
  groupId: string;
  optionId: string;
  groupName: string;
  optionName: string;
  quantity: number;
  fraction?: number;
  unitPrice: number;
  contribution: number;
}

export interface CartItem {
  lineId: string;
  product: Product;
  qty: number;
  productStoreVariationId?: string;
  variationName?: string;
  selections: CartItemSelection[];
  notes?: string;
  configurationSignature?: string;
  configurationVersion?: number;
  basePrice?: number;
  optionsPrice?: number;
}
