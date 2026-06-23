import { useEffect, useState } from 'react';
import { getActivePlatformBanners } from '../services/platformBannersService';
import type { PlatformBanner } from '../types/platformBanner';

export function usePlatformBanners() {
  const [banners, setBanners] = useState<PlatformBanner[]>([]);

  useEffect(() => {
    let cancelled = false;
    getActivePlatformBanners().then((data) => { if (!cancelled) setBanners(data); }).catch(() => { if (!cancelled) setBanners([]); });
    return () => { cancelled = true; };
  }, []);

  return { banners };
}
