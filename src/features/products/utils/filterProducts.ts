import type { Product } from '../types/product';

export function filterProducts(products: Product[], query: string): Product[] {
  if (!query) return products;

  const normalizedQuery = query.toLowerCase();

  return products.filter(product => (
    product.name.toLowerCase().includes(normalizedQuery) ||
    product.brand.toLowerCase().includes(normalizedQuery) ||
    product.category.toLowerCase().includes(normalizedQuery)
  ));
}
