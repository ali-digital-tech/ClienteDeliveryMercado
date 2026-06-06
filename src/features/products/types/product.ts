export interface Product {
  id: string;
  catalogProductId: string;
  marketId: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  saleType: 'unidade' | 'peso';
  minQty: number;
  stepQty: number;
  priceUnit: string;
  image: string;
  category: string;
  categoryPath?: string;
  unit: string;
  description: string;
  salesCount?: number;
  isPromo?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isImmediateConsumption?: boolean;
}
