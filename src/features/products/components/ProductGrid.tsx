import { ProductCard } from './ProductCard';
import type { Product } from '../types/product';

interface ProductGridProps {
  products: Product[];
  compact?: boolean;
}

export function ProductGrid({ products, compact = false }: ProductGridProps) {
  return (
    <div className={compact ? 'flex gap-3 overflow-x-auto scrollbar-hide pb-1' : 'flex flex-col gap-3'}>
      {products.map(product => (
        <ProductCard key={product.id} product={product} compact={compact} />
      ))}
    </div>
  );
}
