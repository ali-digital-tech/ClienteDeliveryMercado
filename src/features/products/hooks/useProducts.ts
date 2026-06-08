import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProductsByMarketId, PRODUCTS_PAGE_SIZE } from '../services/productsService';
import type { Product } from '../types/product';

const PRODUCTS_STALE_TIME_MS = 5 * 60 * 1000;
const PRODUCTS_CACHE_TIME_MS = 30 * 60 * 1000;

interface UseProductsOptions {
  departmentId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  categoryIds?: string[];
  search?: string;
  promotionActive?: boolean;
  featured?: boolean;
  immediateConsumption?: boolean;
  bestsellers?: boolean;
  perPage?: number;
  enabled?: boolean;
  allowGlobal?: boolean;
  useOffsetPagination?: boolean;
  paginationMode?: 'append' | 'paged';
}

interface ProductsCacheEntry {
  products: Product[];
  page: number;
  total: number;
  hasNextPage: boolean;
  loadedPages: Set<number>;
  pages?: Map<number, Product[]>;
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
    categoryIds = [],
    search = '',
    promotionActive,
    featured,
    immediateConsumption,
    bestsellers,
    perPage = PRODUCTS_PAGE_SIZE,
    enabled = true,
    allowGlobal = false,
    useOffsetPagination = false,
    paginationMode = 'append',
  } = options;
  const normalizedSearch = search.trim();
  const requestCategoryIds = useMemo(
    () => Array.from(new Set(categoryIds.filter(Boolean))),
    [categoryIds],
  );
  const requestCategoryId = requestCategoryIds[0] || subcategoryId || categoryId || departmentId || null;
  const requestKey = useMemo(
    () => JSON.stringify({
      scope: 'market-products',
      marketId,
      departmentId,
      categoryId,
      categoryIds: requestCategoryIds,
      subcategoryId: subcategoryId || 'all',
      search: normalizedSearch,
      promotionActive: promotionActive ?? null,
      featured: featured ?? null,
      immediateConsumption: immediateConsumption ?? null,
      bestsellers: bestsellers ?? null,
      limit: perPage,
      mode: useOffsetPagination ? 'offset-lookahead' : 'page',
      paginationMode,
    }),
    [bestsellers, categoryId, departmentId, featured, immediateConsumption, marketId, normalizedSearch, paginationMode, perPage, promotionActive, requestCategoryIds, subcategoryId, useOffsetPagination],
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
      setProducts(paginationMode === 'paged' ? (cached.pages?.get(cached.page) ?? cached.products) : cached.products);
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
      categoryIds: requestCategoryIds,
      search: normalizedSearch,
      promotionActive,
      featured,
      immediateConsumption,
      bestsellers,
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
          products: dedupeProducts(result.products),
          page: result.page,
          total: result.total,
          hasNextPage: result.hasNextPage,
          loadedPages: new Set([result.page]),
          pages: new Map([[result.page, dedupeProducts(result.products)]]),
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
  }, [allowGlobal, bestsellers, enabled, featured, immediateConsumption, marketId, normalizedSearch, paginationMode, perPage, promotionActive, requestCategoryId, requestKey, useOffsetPagination]);

  const loadMore = useCallback(async () => {
    if (
      paginationMode !== 'append'
      || !marketId
      || !enabled
      || (!requestCategoryId && !allowGlobal)
      || isLoading
      || loadingMoreRef.current
      || !hasNextPage
    ) return;

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
        categoryIds: requestCategoryIds,
        search: normalizedSearch,
        promotionActive,
        featured,
        immediateConsumption,
        bestsellers,
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
        pages: new Map([
          ...(previousEntry?.pages?.entries() ?? []),
          [result.page, dedupeProducts(result.products)],
        ]),
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
  }, [allowGlobal, bestsellers, enabled, featured, hasNextPage, immediateConsumption, isLoading, marketId, normalizedSearch, page, paginationMode, perPage, products, promotionActive, requestCategoryId, requestCategoryIds, useOffsetPagination]);

  const loadPage = useCallback(async (targetPage: number) => {
    const safePage = Math.max(1, targetPage);

    if (
      paginationMode !== 'paged'
      || !marketId
      || !enabled
      || (!requestCategoryId && !allowGlobal)
      || isLoading
      || loadingMoreRef.current
    ) return;

    const keyAtStart = latestRequestKeyRef.current;
    const cached = productsCache.get(keyAtStart);
    const cachedPage = cached?.pages?.get(safePage);

    if (cachedPage) {
      const totalPages = Math.max(1, Math.ceil((cached.total || 0) / perPage));
      setProducts(cachedPage);
      setPage(safePage);
      setHasNextPage(safePage < totalPages);
      setTotal(cached.total);
      saveCacheEntry(keyAtStart, {
        ...cached,
        page: safePage,
        hasNextPage: safePage < totalPages,
      });
      return;
    }

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const result = await getProductsByMarketId(marketId, {
        categoryId: requestCategoryId,
        categoryIds: requestCategoryIds,
        search: normalizedSearch,
        promotionActive,
        featured,
        immediateConsumption,
        bestsellers,
        page: safePage,
        perPage,
        offset: (safePage - 1) * perPage,
        useOffsetPagination,
      });

      if (latestRequestKeyRef.current !== keyAtStart) return;

      const previousEntry = productsCache.get(keyAtStart);
      const pageProducts = dedupeProducts(result.products);

      setProducts(pageProducts);
      setPage(result.page);
      setHasNextPage(result.hasNextPage);
      setTotal(result.total);
      saveCacheEntry(keyAtStart, {
        products: pageProducts,
        page: result.page,
        total: result.total,
        hasNextPage: result.hasNextPage,
        loadedPages: new Set([...(previousEntry?.loadedPages ?? []), result.page]),
        pages: new Map([
          ...(previousEntry?.pages?.entries() ?? []),
          [result.page, pageProducts],
        ]),
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
  }, [allowGlobal, bestsellers, enabled, featured, immediateConsumption, isLoading, marketId, normalizedSearch, paginationMode, perPage, promotionActive, requestCategoryId, requestCategoryIds, useOffsetPagination]);

  return {
    products,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    loadMore,
    loadPage,
    page,
    total,
  };
}
