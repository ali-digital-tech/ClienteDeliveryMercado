import type { Product } from '../types/product';

export function isConfigurableProduct(product: Pick<Product, 'purchaseMode' | 'configuration'>) {
  return product.purchaseMode === 'configuravel' || Boolean(product.configuration);
}
