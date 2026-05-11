import { useEffect, useState } from 'react';
import { getProductsByMarketId } from '../services/productsService';
import type { Product } from '../types/product';

export function useProducts(marketId: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    setError(null);
    getProductsByMarketId(marketId)
      .then(data => {
        if (!ignore) setProducts(data);
      })
      .catch(error => {
        if (!ignore) {
          setError(error);
          setProducts([]);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [marketId]);

  return { products, isLoading, error };
}
