import { useEffect, useState } from 'react';
import { getBannersByMarket } from '../services/bannersService';
import type { Banner, BannerPageKey } from '../types/banner';

export function useBanners(marketId: string, page: BannerPageKey) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);

    getBannersByMarket(marketId, page)
      .then((data) => {
        if (!ignore) setBanners(data);
      })
      .catch(() => {
        if (!ignore) setBanners([]);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [marketId, page]);

  return { banners, isLoading };
}
