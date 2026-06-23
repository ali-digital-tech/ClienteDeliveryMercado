import { apiRequest, unwrapList } from '@/shared/lib/api';
import type { PlatformBanner } from '../types/platformBanner';

export async function getActivePlatformBanners(): Promise<PlatformBanner[]> {
  return unwrapList<PlatformBanner>(await apiRequest('/platform-banners/public'));
}
