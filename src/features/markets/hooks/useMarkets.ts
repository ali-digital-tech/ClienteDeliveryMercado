import { useEffect, useState } from 'react';
import { getMarkets, type MarketListMode } from '../services/marketsService';
import type { Market } from '../types/market';

export function useMarkets(mode: MarketListMode = 'principal') {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    setError(null);
    getMarkets(mode)
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
  }, [mode]);

  return { markets, isLoading, error };
}
