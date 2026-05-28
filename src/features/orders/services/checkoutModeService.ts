export type CheckoutOrderType = 'delivery' | 'pickup';

const STORAGE_KEY = 'cliente_delivery_checkout_mode_by_market_v1';

function readStoredModes(): Record<string, CheckoutOrderType> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value === 'delivery' || value === 'pickup'),
    ) as Record<string, CheckoutOrderType>;
  } catch {
    return {};
  }
}

export function getStoredCheckoutMode(marketId: string): CheckoutOrderType {
  if (!marketId) return 'delivery';

  return readStoredModes()[marketId] || 'delivery';
}

export function setStoredCheckoutMode(marketId: string, mode: CheckoutOrderType) {
  if (!marketId) return;

  const modes = readStoredModes();
  modes[marketId] = mode;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
}
