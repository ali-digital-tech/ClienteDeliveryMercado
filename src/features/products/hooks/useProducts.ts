import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProductsByMarketId, PRODUCTS_PAGE_SIZE, type ProductListFilters } from '../services/productsService';
import type { Product } from '../types/product';

interface UseProductsOptions extends ProductListFilters {
  enabled?: boolean;
}

function dedupeProducts(items: Product[]) {
  const byId = new Map<string, Product>();

  items.forEach((product) => {
    byId.set(product.id || product.catalogProductId, product);
  });

  return Array.from(byId.values());
}

export function useProducts(marketId: string, options: UseProductsOptions = {}) {
  const {
    categoryId = null,
    search = '',
    perPage = PRODUCTS_PAGE_SIZE,
    enabled = true,
  } = options;
  const normalizedSearch = search.trim();
  const requestKey = useMemo(
    () => JSON.stringify({ marketId, categoryId, search: normalizedSearch, perPage }),
    [categoryId, marketId, normalizedSearch, perPage],
  );
  const latestRequestKeyRef = useRef(requestKey);
  const loadingMoreRef = useRef(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    latestRequestKeyRef.current = requestKey;
    loadingMoreRef.current = false;
    setProducts([]);
    setPage(1);
    setHasNextPage(false);
    setTotal(0);
    setError(null);

    if (!marketId || !enabled) {
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    let ignore = false;
    setIsLoading(true);
    setIsLoadingMore(false);

    getProductsByMarketId(marketId, {
      categoryId,
      search: normalizedSearch,
      page: 1,
      perPage,
    })
      .then((result) => {
        if (ignore || latestRequestKeyRef.current !== requestKey) return;
        setProducts(dedupeProducts(result.products));
        setPage(result.page);
        setHasNextPage(result.hasNextPage);
        setTotal(result.total);
      })
      .catch((error) => {
        if (ignore || latestRequestKeyRef.current !== requestKey) return;
        setError(error);
        setProducts([]);
      })
      .finally(() => {
        if (!ignore && latestRequestKeyRef.current === requestKey) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [categoryId, enabled, marketId, normalizedSearch, perPage, requestKey]);

  const loadMore = useCallback(async () => {
    if (!marketId || !enabled || isLoading || loadingMoreRef.current || !hasNextPage) return;

    const keyAtStart = latestRequestKeyRef.current;
    const nextPage = page + 1;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const result = await getProductsByMarketId(marketId, {
        categoryId,
        search: normalizedSearch,
        page: nextPage,
        perPage,
      });

      if (latestRequestKeyRef.current !== keyAtStart) return;

      setProducts((current) => dedupeProducts([...current, ...result.products]));
      setPage(result.page);
      setHasNextPage(result.hasNextPage);
      setTotal(result.total);
    } catch (error) {
      if (latestRequestKeyRef.current === keyAtStart) {
        setError(error as Error);
      }
    } finally {
      if (latestRequestKeyRef.current === keyAtStart) {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [categoryId, enabled, hasNextPage, isLoading, marketId, normalizedSearch, page, perPage]);

  return {
    products,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    loadMore,
    page,
    total,
  };
}
