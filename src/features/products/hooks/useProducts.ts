import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProductsByMarketId, PRODUCTS_PAGE_SIZE } from '../services/productsService';
import type { Product } from '../types/product';

const PRODUCTS_STALE_TIME_MS = 5 * 60 * 1000;
const PRODUCTS_CACHE_TIME_MS = 30 * 60 * 1000;

interface UseProductsOptions {
  departmentId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  search?: string;
  perPage?: number;
  enabled?: boolean;
  allowGlobal?: boolean;
  useOffsetPagination?: boolean;
}

interface ProductsCacheEntry {
  products: Product[];
  page: number;
  total: number;
  hasNextPage: boolean;
  loadedPages: Set<number>;
  updatedAt: number;
}

const productsCache = new Map<string, ProductsCacheEntry>();

function dedupeProducts(items: Product[]) {
  const byId = new Map<string, Product>();

  items.forEach((product) => {
    byId.set(product.id || product.catalogProductId, product);
  });

  return Array.from(byId.values());
}

function getFreshCacheEntry(key: string) {
  const entry = productsCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.updatedAt;
  if (age > PRODUCTS_CACHE_TIME_MS) {
    productsCache.delete(key);
    return null;
  }

  return age <= PRODUCTS_STALE_TIME_MS ? entry : null;
}

function saveCacheEntry(key: string, entry: ProductsCacheEntry) {
  productsCache.set(key, {
    ...entry,
    products: dedupeProducts(entry.products),
    updatedAt: Date.now(),
  });
}

export function useProducts(marketId: string, options: UseProductsOptions = {}) {
  const {
    departmentId = null,
    categoryId = null,
    subcategoryId = null,
    search = '',
    perPage = PRODUCTS_PAGE_SIZE,
    enabled = true,
    allowGlobal = false,
    useOffsetPagination = false,
  } = options;
  const normalizedSearch = search.trim();
  const requestCategoryId = subcategoryId || categoryId || null;
  const requestKey = useMemo(
    () => JSON.stringify({
      scope: 'market-products',
      marketId,
      departmentId,
      categoryId,
      subcategoryId: subcategoryId || 'all',
      search: normalizedSearch,
      limit: perPage,
      mode: useOffsetPagination ? 'offset-lookahead' : 'page',
    }),
    [categoryId, departmentId, marketId, normalizedSearch, perPage, subcategoryId, useOffsetPagination],
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

    if (!marketId || !enabled || (!requestCategoryId && !allowGlobal)) {
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    const cached = getFreshCacheEntry(requestKey);
    if (cached) {
      setProducts(cached.products);
      setPage(cached.page);
      setHasNextPage(cached.hasNextPage);
      setTotal(cached.total);
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    let ignore = false;
    setIsLoading(true);
    setIsLoadingMore(false);

    getProductsByMarketId(marketId, {
      categoryId: requestCategoryId,
      search: normalizedSearch,
      page: 1,
      perPage,
      offset: 0,
      useOffsetPagination,
    })
      .then((result) => {
        if (ignore || latestRequestKeyRef.current !== requestKey) return;
        setProducts(dedupeProducts(result.products));
        setPage(result.page);
        setHasNextPage(result.hasNextPage);
        setTotal(result.total);
        saveCacheEntry(requestKey, {
          products: result.products,
          page: result.page,
          total: result.total,
          hasNextPage: result.hasNextPage,
          loadedPages: new Set([result.page]),
          updatedAt: Date.now(),
        });
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
  }, [allowGlobal, enabled, marketId, normalizedSearch, perPage, requestCategoryId, requestKey, useOffsetPagination]);

  const loadMore = useCallback(async () => {
    if (!marketId || !enabled || (!requestCategoryId && !allowGlobal) || isLoading || loadingMoreRef.current || !hasNextPage) return;

    const keyAtStart = latestRequestKeyRef.current;
    const nextPage = page + 1;
    const nextOffset = page * perPage;
    const cached = productsCache.get(keyAtStart);
    if (cached?.loadedPages.has(nextPage)) {
      setProducts(cached.products);
      setPage(cached.page);
      setHasNextPage(cached.hasNextPage);
      setTotal(cached.total);
      return;
    }

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const result = await getProductsByMarketId(marketId, {
        categoryId: requestCategoryId,
        search: normalizedSearch,
        page: nextPage,
        perPage,
        offset: nextOffset,
        useOffsetPagination,
      });

      if (latestRequestKeyRef.current !== keyAtStart) return;

      const previousEntry = productsCache.get(keyAtStart);
      if (previousEntry?.loadedPages.has(result.page)) {
        setHasNextPage(false);
        saveCacheEntry(keyAtStart, {
          ...previousEntry,
          hasNextPage: false,
        });
        return;
      }

      setProducts((current) => dedupeProducts([...current, ...result.products]));
      setPage(result.page);
      setHasNextPage(result.hasNextPage);
      setTotal(result.total);
      saveCacheEntry(keyAtStart, {
        products: [...(previousEntry?.products ?? products), ...result.products],
        page: result.page,
        total: result.total,
        hasNextPage: result.hasNextPage,
        loadedPages: new Set([...(previousEntry?.loadedPages ?? []), result.page]),
        updatedAt: Date.now(),
      });
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
  }, [allowGlobal, enabled, hasNextPage, isLoading, marketId, normalizedSearch, page, perPage, products, requestCategoryId, useOffsetPagination]);

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
