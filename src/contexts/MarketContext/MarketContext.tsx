import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMarketById, type Market } from '@/features/markets';

interface MarketContextValue {
  marketId: string;
  currentMarket: Market | null;
  isLoading: boolean;
  reloadMarket: () => Promise<void>;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children, marketId }: { children: React.ReactNode; marketId: string }) {
  const [currentMarket, setCurrentMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reloadMarket = useCallback(async () => {
    setIsLoading(true);
    try {
      const market = await getMarketById(marketId);
      setCurrentMarket(market);
    } catch (error) {
      console.error('Erro ao carregar mercado', error);
      setCurrentMarket(null);
    } finally {
      setIsLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    reloadMarket();
  }, [reloadMarket]);

  return (
    <MarketContext.Provider value={{ marketId, currentMarket, isLoading, reloadMarket }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarketContext() {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarketContext must be used within MarketProvider');
  return context;
}
