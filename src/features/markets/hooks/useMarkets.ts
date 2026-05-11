import { useEffect, useState } from 'react';
import { getMarkets } from '../services/marketsService';
import type { Market } from '../types/market';

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    setError(null);
    getMarkets()
      .then(data => {
        if (!ignore) setMarkets(data);
      })
      .catch(error => {
        if (!ignore) {
          setError(error);
          setMarkets([]);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return { markets, isLoading, error };
}
