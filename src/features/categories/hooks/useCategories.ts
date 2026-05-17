import { useEffect, useState } from 'react';
import { getCategoriesByMarketId, type CategoryListFilters } from '../services/categoriesService';
import type { Category } from '../types/category';

export function useCategories(marketId: string, filters: CategoryListFilters = { level: 1 }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const level = filters.level;
  const parentId = filters.parentId;

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    setError(null);
    getCategoriesByMarketId(marketId, { level, parentId })
      .then(data => {
        if (!ignore) setCategories(data);
      })
      .catch(error => {
        if (!ignore) {
          setError(error);
          setCategories([]);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [level, marketId, parentId]);

  return { categories, isLoading, error };
}
