export interface Product {
  id: string;
  catalogProductId: string;
  marketId: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  unit: string;
  description: string;
  isPromo?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
}
