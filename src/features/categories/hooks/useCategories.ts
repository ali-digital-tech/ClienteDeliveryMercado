import { useEffect, useState } from 'react';
import { getCategoriesByMarketId } from '../services/categoriesService';
import type { Category } from '../types/category';

export function useCategories(marketId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    setError(null);
    getCategoriesByMarketId(marketId)
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
  }, [marketId]);

  return { categories, isLoading, error };
}
