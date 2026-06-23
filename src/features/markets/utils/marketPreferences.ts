export const ALL_CITIES_VALUE = '__all_cities__';

const FAVORITE_MARKETS_STORAGE_KEY = 'cliente_delivery_favorite_markets';
const SELECTED_CITY_STORAGE_KEY = 'cliente_delivery_selected_market_city';

function getStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readFavoriteMarketIds(): string[] {
  try {
    const stored = getStorage()?.getItem(FAVORITE_MARKETS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.filter((marketId): marketId is string => typeof marketId === 'string' && marketId.trim() !== ''))];
  } catch {
    return [];
  }
}

export function saveFavoriteMarketIds(marketIds: string[]) {
  try {
    getStorage()?.setItem(FAVORITE_MARKETS_STORAGE_KEY, JSON.stringify([...new Set(marketIds)]));
  } catch {
    // Storage can be unavailable in private browsing or when the quota is full.
  }
}

export function readSelectedMarketCity(): string {
  try {
    const selectedCity = getStorage()?.getItem(SELECTED_CITY_STORAGE_KEY)?.trim();
    return selectedCity || ALL_CITIES_VALUE;
  } catch {
    return ALL_CITIES_VALUE;
  }
}

export function saveSelectedMarketCity(city: string) {
  try {
    getStorage()?.setItem(SELECTED_CITY_STORAGE_KEY, city || ALL_CITIES_VALUE);
  } catch {
    // Storage can be unavailable in private browsing or when the quota is full.
  }
}
