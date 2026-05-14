import { useEffect, useState } from 'react';
import { getProductsByMarketId } from '../services/productsService';
import type { Product } from '../types/product';

const PRODUCTS_CACHE_KEY = 'cliente_delivery_products_by_market';

function readProductsCache(): Record<string, Product[]> {
  try {
    const stored = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return parsed;
  } catch {
    return {};
  }
}

function saveProductsCache(marketId: string, products: Product[]) {
  const cache = readProductsCache();
  localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({
    ...cache,
    [marketId]: products,
  }));
}

export function useProducts(marketId: string) {
  const [products, setProducts] = useState<Product[]>(() => readProductsCache()[marketId] || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ignore = false;
    const cachedProducts = readProductsCache()[marketId] || [];

    setIsLoading(true);
    setError(null);
    setProducts(cachedProducts);

    getProductsByMarketId(marketId)
      .then(data => {
        if (!ignore) {
          setProducts(data);
          saveProductsCache(marketId, data);
        }
      })
      .catch(error => {
        if (!ignore) {
          setError(error);
          setProducts(cachedProducts);
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
