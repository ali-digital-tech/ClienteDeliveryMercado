import type { Product } from '../types/product';
import { normalizeSearchText } from '@/shared/utils/searchText';

export function filterProducts(products: Product[], query: string): Product[] {
  if (!query) return products;

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return products;

  return products.filter(product => (
    normalizeSearchText(product.name).includes(normalizedQuery) ||
    normalizeSearchText(product.brand).includes(normalizedQuery) ||
    normalizeSearchText(product.category).includes(normalizedQuery) ||
    normalizeSearchText(product.categoryPath).includes(normalizedQuery) ||
    normalizeSearchText(product.description).includes(normalizedQuery)
  ));
}
