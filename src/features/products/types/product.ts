export type ProductPurchaseMode = 'simples' | 'configuravel';
export type ProductStockMode = 'quantidade' | 'disponibilidade';
export type ProductOptionGroupType = 'unica' | 'multipla' | 'fracionada';
export type ProductOptionItemType = 'adicional' | 'produto' | 'produto_e_adicional';

export interface ProductVariation {
  id: string;
  productVariationId: string;
  name: string;
  price: number;
  promotionalPrice?: number;
  promotionEndsAt?: string;
  active: boolean;
  displayOrder: number;
}

export interface ProductVariationRule {
  productStoreVariationId: string;
  minimumSelections: number;
  maximumSelections: number;
}

export interface ProductOptionVariationPrice {
  productStoreVariationId: string;
  available: boolean;
  additionalPrice?: number;
  promotionalPrice?: number;
  promotionEndsAt?: string;
}

export interface ProductOption {
  id: string;
  name: string;
  description?: string;
  itemType?: ProductOptionItemType;
  image?: string;
  productCategoryId?: string;
  productCategoryName?: string;
  additionalPrice: number;
  promotionalPrice?: number;
  promotionEndsAt?: string;
  maximumQuantity: number;
  active: boolean;
  displayOrder: number;
  variationPrices: ProductOptionVariationPrice[];
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  description?: string;
  selectionType: ProductOptionGroupType;
  minimumSelections: number;
  maximumSelections: number;
  allowsQuantity: boolean;
  replacesBasePrice: boolean;
  active: boolean;
  displayOrder: number;
  variationRules: ProductVariationRule[];
  options: ProductOption[];
}

export interface ProductConfiguration {
  version: number;
  variations: ProductVariation[];
  groups: ProductOptionGroup[];
}

export interface Product {
  id: string;
  storeProductId?: string;
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
  purchaseMode?: ProductPurchaseMode;
  stockMode?: ProductStockMode;
  hasVariations?: boolean;
  startingPrice?: number;
  configuration?: ProductConfiguration;
  defaultVariationId?: string;
  defaultSelections?: Array<{ groupId: string; optionId: string; quantity: number }>;
  isVirtualOptionProduct?: boolean;
  isAssemblyShortcut?: boolean;
  optionProductId?: string;
}
